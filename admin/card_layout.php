<?php
// admin/card_layout.php - Visual grid layout editor for Neighborhood Cards
require_once '../config.php';
require_once 'campaign_functions.php';
requireCampaignAdminLogin();

$db = getDB();
$message = '';
$messageType = '';

$cardId = (int)($_GET['card_id'] ?? $_POST['card_id'] ?? 0);
if (!$cardId) {
    header('Location: manage_cards.php');
    exit;
}

// Get card info
$stmt = $db->prepare("SELECT * FROM " . getTable('cards') . " WHERE id = ?");
$stmt->execute([$cardId]);
$card = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$card) {
    header('Location: manage_cards.php');
    exit;
}

// Get all spot types with their grid spans
$spotTypes = $db->query("SELECT * FROM " . getTable('card_spot_types') . " WHERE is_active = 1 ORDER BY display_order")->fetchAll(PDO::FETCH_ASSOC);
$spotTypesById = [];
foreach ($spotTypes as $st) {
    $spotTypesById[$st['id']] = $st;
}

// Get per-card prices for this card
$cardPrices = [];
$priceStmt = $db->prepare("SELECT spot_type_id, price_cents FROM " . getTable('card_spot_prices') . " WHERE card_id = ?");
$priceStmt->execute([$cardId]);
foreach ($priceStmt->fetchAll(PDO::FETCH_ASSOC) as $pr) {
    $cardPrices[(int)$pr['spot_type_id']] = (int)$pr['price_cents'];
}

// Handle POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'reset_default') {
        // Check for paid orders on existing positions
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM " . getTable('card_orders') . " o
            JOIN " . getTable('card_positions') . " p ON p.id = o.position_id
            WHERE p.card_id = ? AND o.status IN ('pending','paid')
        ");
        $stmt->execute([$cardId]);
        if ((int)$stmt->fetchColumn() > 0) {
            $message = 'Cannot reset layout — there are active orders on this card. Cancel or refund orders first.';
            $messageType = 'danger';
        } else {
            $db->prepare("DELETE FROM " . getTable('card_positions') . " WHERE card_id = ?")->execute([$cardId]);
            generateDefaultPositions($cardId);
            $message = 'Layout reset to 16 default singles.';
            $messageType = 'success';
        }
    }

    if ($action === 'merge') {
        $positionIds = json_decode($_POST['position_ids'] ?? '[]', true);
        $targetType = (int)($_POST['target_type_id'] ?? 0);

        if (empty($positionIds) || !$targetType || !isset($spotTypesById[$targetType])) {
            $message = 'Invalid merge request.';
            $messageType = 'danger';
        } else {
            // Check none of the selected positions have active orders
            $placeholders = implode(',', array_fill(0, count($positionIds), '?'));
            $stmt = $db->prepare("
                SELECT COUNT(*) FROM " . getTable('card_orders') . "
                WHERE position_id IN ($placeholders) AND status IN ('pending','paid')
            ");
            $stmt->execute($positionIds);
            if ((int)$stmt->fetchColumn() > 0) {
                $message = 'Cannot merge — one or more selected spots have active orders.';
                $messageType = 'danger';
            } else {
                // Get the selected positions to determine the merged region
                $stmt = $db->prepare("
                    SELECT * FROM " . getTable('card_positions') . "
                    WHERE id IN ($placeholders) AND card_id = ?
                    ORDER BY grid_row, grid_col
                ");
                $stmt->execute(array_merge($positionIds, [$cardId]));
                $positions = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if (empty($positions)) {
                    $message = 'Positions not found.';
                    $messageType = 'danger';
                } else {
                    // All must be on the same side
                    $sides = array_unique(array_column($positions, 'side'));
                    if (count($sides) > 1) {
                        $message = 'Cannot merge positions from different sides.';
                        $messageType = 'danger';
                    } else {
                        $side = $sides[0];
                        $targetSt = $spotTypesById[$targetType];

                        // Calculate bounding box
                        $minRow = min(array_column($positions, 'grid_row'));
                        $minCol = min(array_column($positions, 'grid_col'));
                        $maxRow = max(array_column($positions, 'grid_row'));
                        $maxCol = max(array_column($positions, 'grid_col'));

                        $neededRows = (int)$targetSt['row_span'];
                        $neededCols = (int)$targetSt['col_span'];

                        // Verify the selection matches the target size
                        $selRows = $maxRow - $minRow + 1;
                        $selCols = $maxCol - $minCol + 1;

                        if ($selRows !== $neededRows || $selCols !== $neededCols) {
                            $message = "Selection doesn't match " . $targetSt['display_name'] . " size ({$neededCols} wide x {$neededRows} tall). You selected {$selCols} wide x {$selRows} tall.";
                            $messageType = 'danger';
                        } elseif (count($positionIds) !== ($neededRows * $neededCols)) {
                            $message = "Please select exactly " . ($neededRows * $neededCols) . " adjacent positions for a " . $targetSt['display_name'] . ".";
                            $messageType = 'danger';
                        } else {
                            // Delete selected positions
                            $db->prepare("DELETE FROM " . getTable('card_positions') . " WHERE id IN ($placeholders)")->execute($positionIds);

                            // Create the merged position
                            $label = $positions[0]['label']; // Use first position's label
                            $stmt = $db->prepare("
                                INSERT INTO " . getTable('card_positions') . " (card_id, label, side, spot_type_id, grid_row, grid_col, row_span, col_span, display_order)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ");
                            $stmt->execute([$cardId, $label, $side, $targetType, $minRow, $minCol, $neededRows, $neededCols, $positions[0]['display_order']]);

                            // Update card total_spots
                            $spotsRemoved = 0;
                            foreach ($positions as $p) {
                                $spotsRemoved += (float)$spotTypesById[$p['spot_type_id']]['spots_used'];
                            }
                            $spotsAdded = (float)$targetSt['spots_used'];
                            $spotsDiff = $spotsAdded - $spotsRemoved;
                            $db->prepare("UPDATE " . getTable('cards') . " SET total_spots = total_spots + ? WHERE id = ?")
                               ->execute([$spotsDiff, $cardId]);

                            // Refresh card data
                            $stmt = $db->prepare("SELECT * FROM " . getTable('cards') . " WHERE id = ?");
                            $stmt->execute([$cardId]);
                            $card = $stmt->fetch(PDO::FETCH_ASSOC);

                            $message = "Merged " . count($positionIds) . " positions into a " . $targetSt['display_name'] . ".";
                            $messageType = 'success';
                        }
                    }
                }
            }
        }
    }

    if ($action === 'split') {
        $positionId = (int)($_POST['position_id'] ?? 0);
        if (!$positionId) {
            $message = 'Invalid split request.';
            $messageType = 'danger';
        } else {
            // Check for active orders
            $stmt = $db->prepare("
                SELECT COUNT(*) FROM " . getTable('card_orders') . "
                WHERE position_id = ? AND status IN ('pending','paid')
            ");
            $stmt->execute([$positionId]);
            if ((int)$stmt->fetchColumn() > 0) {
                $message = 'Cannot split — this spot has an active order.';
                $messageType = 'danger';
            } else {
                $stmt = $db->prepare("SELECT * FROM " . getTable('card_positions') . " WHERE id = ? AND card_id = ?");
                $stmt->execute([$positionId, $cardId]);
                $pos = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$pos || ($pos['row_span'] == 1 && $pos['col_span'] == 1)) {
                    $message = 'Cannot split a single-cell position.';
                    $messageType = 'danger';
                } else {
                    $singleTypeId = null;
                    foreach ($spotTypes as $st) {
                        if ($st['name'] === 'single') { $singleTypeId = $st['id']; break; }
                    }
                    if (!$singleTypeId) {
                        $message = 'Single spot type not found.';
                        $messageType = 'danger';
                    } else {
                        $side = $pos['side'];
                        $prefix = ($side === 'front') ? 'A' : 'B';

                        // Delete the merged position
                        $db->prepare("DELETE FROM " . getTable('card_positions') . " WHERE id = ?")->execute([$positionId]);

                        // Recreate individual singles
                        $stmt = $db->prepare("
                            INSERT INTO " . getTable('card_positions') . " (card_id, label, side, spot_type_id, grid_row, grid_col, row_span, col_span, display_order)
                            VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)
                        ");
                        $count = 0;
                        for ($r = (int)$pos['grid_row']; $r < (int)$pos['grid_row'] + (int)$pos['row_span']; $r++) {
                            for ($c = (int)$pos['grid_col']; $c < (int)$pos['grid_col'] + (int)$pos['col_span']; $c++) {
                                $label = $prefix . (($r - 1) * 4 + $c);
                                $stmt->execute([$cardId, $label, $side, $singleTypeId, $r, $c, (int)$pos['display_order'] + $count]);
                                $count++;
                            }
                        }

                        // Update card total_spots
                        $oldSpots = (float)$spotTypesById[$pos['spot_type_id']]['spots_used'];
                        $newSpots = $count * 1.0; // singles = 1.0 each
                        $spotsDiff = $newSpots - $oldSpots;
                        $db->prepare("UPDATE " . getTable('cards') . " SET total_spots = total_spots + ? WHERE id = ?")
                           ->execute([$spotsDiff, $cardId]);

                        $stmt = $db->prepare("SELECT * FROM " . getTable('cards') . " WHERE id = ?");
                        $stmt->execute([$cardId]);
                        $card = $stmt->fetch(PDO::FETCH_ASSOC);

                        $message = "Split into {$count} singles.";
                        $messageType = 'success';
                    }
                }
            }
        }
    }
}

// Generate positions if none exist
$posCount = $db->prepare("SELECT COUNT(*) FROM " . getTable('card_positions') . " WHERE card_id = ?");
$posCount->execute([$cardId]);
if ((int)$posCount->fetchColumn() === 0) {
    generateDefaultPositions($cardId);
}

// Fetch current positions with order status
$positions = getCardPositions($cardId);
$positionsBySide = getPositionsBySize($positions);

// Calculate total spots from positions
$totalFromPositions = 0;
foreach ($positions as $p) {
    $totalFromPositions += (float)($spotTypesById[$p['spot_type_id']]['spots_used'] ?? 0);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Card Layout: <?= htmlspecialchars($card['neighborhood_name']) ?> | <?= SITE_NAME ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem 20px; }

        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .page-title { font-size: 1.75rem; font-weight: 800; color: #1e293b; }
        .page-sub { color: #64748b; font-size: 0.9rem; margin-top: 4px; }

        .btn { padding: 0.6rem 1.2rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.2s; border: none; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.12); }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-success { background: #10b981; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-secondary { background: #64748b; color: white; }
        .btn-warning { background: #f59e0b; color: white; }
        .btn-outline { background: white; color: #374151; border: 2px solid #e2e8f0; }
        .btn-outline:hover { border-color: #38b6ff; color: #0ea5e9; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        .alert { padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; font-size: 0.9rem; }
        .alert-success { background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
        .alert-info { background: #dbeafe; border: 1px solid #60a5fa; color: #1e40af; }

        .stats-row { display: flex; gap: 16px; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .stat-card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; flex: 1; min-width: 140px; }
        .stat-label { font-size: 0.78rem; color: #64748b; text-transform: uppercase; font-weight: 600; }
        .stat-value { font-size: 1.4rem; font-weight: 800; color: #1e293b; margin-top: 4px; }
        .stat-value.mismatch { color: #ef4444; }

        /* Grid Layout */
        .sides-container { display: flex; gap: 32px; flex-wrap: wrap; margin-bottom: 1.5rem; }
        .card-side-editor { flex: 1; min-width: 400px; }
        .card-side-editor h3 { font-size: 1rem; font-weight: 700; text-align: center; margin-bottom: 10px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }

        .card-frame {
            background: white; border: 2px solid #cbd5e1; border-radius: 12px;
            padding: 10px; box-shadow: 0 4px 16px rgba(0,0,0,.06);
        }
        .card-grid {
            display: grid;
            grid-template-rows: repeat(2, minmax(80px, auto));
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
        }

        .grid-cell {
            border-radius: 8px;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            padding: 10px 6px; text-align: center;
            border: 2px solid #e2e8f0;
            cursor: pointer;
            transition: all 0.15s;
            position: relative;
            user-select: none;
        }
        .grid-cell:hover { border-color: #38b6ff; }
        .grid-cell.selected { border-color: #38b6ff; background: #dbeafe; box-shadow: 0 0 0 3px rgba(56,182,255,.25); }
        .grid-cell.has-order { background: #fef2f2; border-color: #fca5a5; cursor: not-allowed; }
        .grid-cell.has-order:hover { border-color: #fca5a5; }
        .grid-cell.pending-order { background: #fff7ed; border-color: #fdba74; cursor: not-allowed; }

        .cell-label { font-size: 0.65rem; font-weight: 800; color: #94a3b8; position: absolute; top: 3px; left: 5px; }
        .cell-type { font-size: 0.82rem; font-weight: 700; color: #374151; }
        .cell-price { font-size: 0.9rem; font-weight: 800; color: #38b6ff; }
        .cell-dims { font-size: 0.68rem; color: #94a3b8; }
        .cell-status { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
        .cell-status.paid { color: #dc2626; }
        .cell-status.pending { color: #ea580c; }
        .cell-category { font-size: 0.65rem; color: #64748b; }

        /* Toolbar */
        .toolbar { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 1.5rem; }
        .toolbar h3 { font-size: 1rem; font-weight: 700; margin-bottom: 12px; }
        .toolbar-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .toolbar-divider { width: 1px; height: 32px; background: #e2e8f0; margin: 0 6px; }
        .merge-select { padding: 0.5rem 0.8rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.85rem; font-family: inherit; }
        .merge-select:focus { outline: none; border-color: #38b6ff; }

        .selection-info { font-size: 0.85rem; color: #64748b; padding: 8px 0; }
        .selection-info strong { color: #1e293b; }

        /* Legend */
        .legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 16px; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #64748b; }
        .legend-dot { width: 14px; height: 14px; border-radius: 4px; border: 2px solid; }
        .legend-dot.available { background: white; border-color: #e2e8f0; }
        .legend-dot.selected { background: #dbeafe; border-color: #38b6ff; }
        .legend-dot.paid { background: #fef2f2; border-color: #fca5a5; }
        .legend-dot.pending { background: #fff7ed; border-color: #fdba74; }

        @media (max-width: 768px) {
            .sides-container { flex-direction: column; }
            .card-side-editor { min-width: unset; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'cards'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="page-header">
            <div>
                <h1 class="page-title">Card Layout: <?= htmlspecialchars($card['neighborhood_name']) ?></h1>
                <p class="page-sub">Click spots to select them, then merge into larger sizes or split back to singles.</p>
            </div>
            <div style="display: flex; gap: 8px;">
                <a href="manage_cards.php" class="btn btn-outline">Back to Cards</a>
                <a href="/neighborhood-card-test.php?slug=<?= htmlspecialchars($card['slug']) ?>" target="_blank" class="btn btn-outline">Preview</a>
            </div>
        </div>

        <?php if ($message): ?>
            <div class="alert alert-<?= $messageType ?>"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <?php
        $mismatch = abs($totalFromPositions - (float)$card['total_spots']) > 0.01;
        ?>
        <?php if ($mismatch): ?>
            <div class="alert alert-danger">
                Position total (<?= number_format($totalFromPositions, 1) ?> spots) does not match card total (<?= number_format((float)$card['total_spots'], 1) ?> spots). Adjust the card settings or layout.
            </div>
        <?php endif; ?>

        <div class="stats-row">
            <div class="stat-card">
                <div class="stat-label">Card Total</div>
                <div class="stat-value <?= $mismatch ? 'mismatch' : '' ?>"><?= number_format((float)$card['total_spots'], 1) ?> spots</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">From Layout</div>
                <div class="stat-value <?= $mismatch ? 'mismatch' : '' ?>"><?= number_format($totalFromPositions, 1) ?> spots</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Positions</div>
                <div class="stat-value"><?= count($positions) ?></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Status</div>
                <div class="stat-value"><?= ucfirst($card['status']) ?></div>
            </div>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
            <h3>Actions</h3>
            <div class="toolbar-row">
                <form method="POST" style="display:inline;" id="mergeForm">
                    <input type="hidden" name="action" value="merge">
                    <input type="hidden" name="card_id" value="<?= $cardId ?>">
                    <input type="hidden" name="position_ids" id="mergePositionIds" value="[]">
                    <select name="target_type_id" id="mergeTargetType" class="merge-select">
                        <option value="">Merge to...</option>
                        <?php foreach ($spotTypes as $st):
                            $displayPrice = $cardPrices[(int)$st['id']] ?? (int)$st['price_cents'];
                        ?>
                            <?php if ($st['name'] !== 'single' && $st['name'] !== 'coupon'): ?>
                            <option value="<?= $st['id'] ?>" data-cols="<?= $st['col_span'] ?>" data-rows="<?= $st['row_span'] ?>">
                                <?= htmlspecialchars($st['display_name']) ?> (<?= $st['col_span'] ?>x<?= $st['row_span'] ?>) — $<?= number_format($displayPrice / 100) ?>
                            </option>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </select>
                    <button type="submit" class="btn btn-primary" id="mergeBtn" disabled>Merge Selected</button>
                </form>

                <div class="toolbar-divider"></div>

                <form method="POST" style="display:inline;" id="splitForm">
                    <input type="hidden" name="action" value="split">
                    <input type="hidden" name="card_id" value="<?= $cardId ?>">
                    <input type="hidden" name="position_id" id="splitPositionId" value="">
                    <button type="submit" class="btn btn-warning" id="splitBtn" disabled>Split to Singles</button>
                </form>

                <div class="toolbar-divider"></div>

                <form method="POST" style="display:inline;" onsubmit="return confirm('Reset all positions to 16 singles? This cannot be undone.');">
                    <input type="hidden" name="action" value="reset_default">
                    <input type="hidden" name="card_id" value="<?= $cardId ?>">
                    <button type="submit" class="btn btn-danger">Reset to Default</button>
                </form>

                <button type="button" class="btn btn-outline" onclick="clearSelection()">Clear Selection</button>
            </div>
            <div class="selection-info" id="selectionInfo">Click spots to select them for merging.</div>
        </div>

        <!-- Card Grid -->
        <div class="sides-container">
            <?php foreach (['front' => 'Front Side', 'back' => 'Back Side'] as $sideKey => $sideLabel): ?>
            <div class="card-side-editor">
                <h3><?= $sideLabel ?></h3>
                <div class="card-frame">
                    <div class="card-grid">
                        <?php
                        $sidePositions = $positionsBySide[$sideKey] ?? [];
                        foreach ($sidePositions as $pos):
                            $hasOrder = in_array($pos['status'], ['filled', 'pending']);
                            $isPaid = $pos['status'] === 'filled';
                            $isPending = $pos['status'] === 'pending';
                            $isMulti = ($pos['row_span'] > 1 || $pos['col_span'] > 1);
                            $cellClass = $isPaid ? 'has-order' : ($isPending ? 'pending-order' : '');
                        ?>
                        <div class="grid-cell <?= $cellClass ?>"
                             style="grid-row: <?= $pos['grid_row'] ?> / span <?= $pos['row_span'] ?>; grid-column: <?= $pos['grid_col'] ?> / span <?= $pos['col_span'] ?>;"
                             data-position-id="<?= $pos['position_id'] ?>"
                             data-side="<?= $sideKey ?>"
                             data-row="<?= $pos['grid_row'] ?>"
                             data-col="<?= $pos['grid_col'] ?>"
                             data-rowspan="<?= $pos['row_span'] ?>"
                             data-colspan="<?= $pos['col_span'] ?>"
                             data-type-name="<?= htmlspecialchars($pos['spot_name']) ?>"
                             data-has-order="<?= $hasOrder ? '1' : '0' ?>"
                             data-is-multi="<?= $isMulti ? '1' : '0' ?>"
                             <?php if (!$hasOrder): ?>onclick="toggleSelect(this)"<?php endif; ?>
                        >
                            <span class="cell-label"><?= htmlspecialchars($pos['label']) ?></span>
                            <?php if ($isPaid): ?>
                                <span class="cell-status paid">Sold</span>
                                <span class="cell-category"><?= htmlspecialchars($pos['category_name'] ?? '') ?></span>
                            <?php elseif ($isPending): ?>
                                <span class="cell-status pending">Held</span>
                            <?php else: ?>
                                <span class="cell-type"><?= htmlspecialchars($pos['spot_name']) ?></span>
                                <span class="cell-price">$<?= number_format($pos['price_cents'] / 100) ?></span>
                                <span class="cell-dims"><?= htmlspecialchars($pos['dimensions']) ?></span>
                            <?php endif; ?>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <div class="legend">
            <div class="legend-item"><span class="legend-dot available"></span> Available</div>
            <div class="legend-item"><span class="legend-dot selected"></span> Selected</div>
            <div class="legend-item"><span class="legend-dot paid"></span> Sold</div>
            <div class="legend-item"><span class="legend-dot pending"></span> Held</div>
        </div>
    </div>

    <script>
    var selected = [];

    function toggleSelect(el) {
        if (el.dataset.hasOrder === '1') return;

        var id = parseInt(el.dataset.positionId);
        var idx = selected.findIndex(function(s) { return s.id === id; });

        if (idx >= 0) {
            selected.splice(idx, 1);
            el.classList.remove('selected');
        } else {
            selected.push({
                id: id,
                side: el.dataset.side,
                row: parseInt(el.dataset.row),
                col: parseInt(el.dataset.col),
                rowspan: parseInt(el.dataset.rowspan),
                colspan: parseInt(el.dataset.colspan),
                isMulti: el.dataset.isMulti === '1',
                typeName: el.dataset.typeName
            });
            el.classList.add('selected');
        }

        updateToolbar();
    }

    function clearSelection() {
        selected = [];
        document.querySelectorAll('.grid-cell.selected').forEach(function(el) {
            el.classList.remove('selected');
        });
        updateToolbar();
    }

    function updateToolbar() {
        var mergeBtn = document.getElementById('mergeBtn');
        var splitBtn = document.getElementById('splitBtn');
        var info = document.getElementById('selectionInfo');
        var mergeIds = document.getElementById('mergePositionIds');
        var splitId = document.getElementById('splitPositionId');

        // Update merge form
        mergeIds.value = JSON.stringify(selected.map(function(s) { return s.id; }));

        if (selected.length === 0) {
            info.innerHTML = 'Click spots to select them for merging.';
            mergeBtn.disabled = true;
            splitBtn.disabled = true;
            splitId.value = '';
            return;
        }

        // Check if all on same side
        var sides = [...new Set(selected.map(function(s) { return s.side; }))];
        var sameSide = sides.length === 1;

        // Info text
        var labels = [];
        document.querySelectorAll('.grid-cell.selected .cell-label').forEach(function(el) {
            labels.push(el.textContent);
        });
        info.innerHTML = '<strong>' + selected.length + '</strong> selected: ' + labels.join(', ') +
            (sameSide ? ' (' + sides[0] + ')' : ' <span style="color:#ef4444">(mixed sides!)</span>');

        // Merge enabled if 2+ selected, same side, all single-cell
        var allSingle = selected.every(function(s) { return !s.isMulti; });
        mergeBtn.disabled = !(selected.length >= 2 && sameSide && allSingle);

        // Split enabled if exactly 1 multi-cell selected
        if (selected.length === 1 && selected[0].isMulti) {
            splitBtn.disabled = false;
            splitId.value = selected[0].id;
        } else {
            splitBtn.disabled = true;
            splitId.value = '';
        }
    }

    // Confirm merge
    document.getElementById('mergeForm').addEventListener('submit', function(e) {
        var sel = document.getElementById('mergeTargetType');
        if (!sel.value) {
            e.preventDefault();
            alert('Please select a target size to merge into.');
            return;
        }
        var opt = sel.options[sel.selectedIndex];
        var neededCols = parseInt(opt.dataset.cols);
        var neededRows = parseInt(opt.dataset.rows);
        var needed = neededCols * neededRows;

        if (selected.length !== needed) {
            e.preventDefault();
            alert('Select exactly ' + needed + ' adjacent spots for a ' + opt.textContent.trim().split('—')[0].trim() + '.');
            return;
        }

        if (!confirm('Merge ' + selected.length + ' positions into ' + opt.textContent.trim().split('—')[0].trim() + '?')) {
            e.preventDefault();
        }
    });

    // Confirm split
    document.getElementById('splitForm').addEventListener('submit', function(e) {
        if (!confirm('Split this position back into singles?')) {
            e.preventDefault();
        }
    });
    </script>
</body>
</html>
