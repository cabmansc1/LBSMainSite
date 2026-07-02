<?php
// admin/manage_cards.php - CRUD for Neighborhood Cards
require_once '../config.php';
require_once 'campaign_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();

try {
    $db = getDB();
    $message = '';
    $messageType = '';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';

        if ($action === 'add') {
            $slug = generateSlug($_POST['neighborhood_name']);
            // Ensure unique slug
            $check = $db->prepare("SELECT id FROM " . getTable('cards') . " WHERE slug = ?");
            $check->execute([$slug]);
            if ($check->fetch()) {
                $slug .= '-' . time();
            }
            $stmt = $db->prepare("
                INSERT INTO " . getTable('cards') . " (neighborhood_name, slug, description, households, total_spots, max_coupons, print_deadline, ship_date, status, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitizeInput($_POST['neighborhood_name']),
                $slug,
                sanitizeInput($_POST['description'] ?? ''),
                (int)($_POST['households'] ?: 2500),
                (float)($_POST['total_spots'] ?: 16),
                (int)($_POST['max_coupons'] ?: 2),
                $_POST['print_deadline'],
                $_POST['ship_date'] ?: null,
                $_POST['status'] ?: 'open',
                (int)($_POST['display_order'] ?: 0)
            ]);
            $newCardId = (int)$db->lastInsertId();
            generateDefaultPositions($newCardId);
            syncCardPricing($newCardId, (int)($_POST['households'] ?: 2500));
            $message = 'Card created with default layout (16 singles) and tier-based pricing.';
            $messageType = 'success';
        }

        if ($action === 'update') {
            $stmt = $db->prepare("
                UPDATE " . getTable('cards') . "
                SET neighborhood_name = ?, description = ?, households = ?, total_spots = ?,
                    max_coupons = ?, print_deadline = ?, ship_date = ?, status = ?, display_order = ?
                WHERE id = ?
            ");
            $stmt->execute([
                sanitizeInput($_POST['neighborhood_name']),
                sanitizeInput($_POST['description'] ?? ''),
                (int)($_POST['households'] ?: 2500),
                (float)($_POST['total_spots'] ?: 16),
                (int)($_POST['max_coupons'] ?: 2),
                $_POST['print_deadline'],
                $_POST['ship_date'] ?: null,
                $_POST['status'] ?: 'open',
                (int)($_POST['display_order'] ?: 0),
                (int)$_POST['id']
            ]);
            // Re-sync pricing if households changed
            $resyncPricing = !empty($_POST['resync_pricing']);
            syncCardPricing((int)$_POST['id'], (int)($_POST['households'] ?: 2500), $resyncPricing);
            $message = 'Card updated successfully!';
            $messageType = 'success';
        }

        if ($action === 'delete') {
            // Check for existing orders first
            $orderCheck = $db->prepare("SELECT COUNT(*) FROM " . getTable('card_orders') . " WHERE card_id = ? AND status IN ('paid','pending')");
            $orderCheck->execute([(int)$_POST['id']]);
            if ((int)$orderCheck->fetchColumn() > 0) {
                $message = 'Cannot delete card with active orders.';
                $messageType = 'danger';
            } else {
                $stmt = $db->prepare("DELETE FROM " . getTable('cards') . " WHERE id = ?");
                $stmt->execute([(int)$_POST['id']]);
                $message = 'Card deleted.';
                $messageType = 'success';
            }
        }

        if ($action === 'mark_shipped') {
            $cardId = (int)$_POST['id'];
            $db->prepare("UPDATE " . getTable('cards') . " SET status = 'shipped', ship_date = CURDATE() WHERE id = ?")->execute([$cardId]);

            // Send shipped emails to all paid buyers
            $buyers = $db->prepare("
                SELECT o.id as order_id, o.user_id, u.email, u.first_name, c.neighborhood_name
                FROM " . getTable('card_orders') . " o
                JOIN " . getTable('users') . " u ON u.id = o.user_id
                JOIN " . getTable('cards') . " c ON c.id = o.card_id
                WHERE o.card_id = ? AND o.status = 'paid'
            ");
            $buyers->execute([$cardId]);
            $sent = 0;
            while ($buyer = $buyers->fetch(PDO::FETCH_ASSOC)) {
                $body = "Hi " . $buyer['first_name'] . ",\n\n";
                $body .= "Great news! Your Neighborhood Card for " . $buyer['neighborhood_name'] . " has been shipped!\n\n";
                $body .= "It will be delivered to mailboxes in the neighborhood soon.\n\n";
                $body .= "Thank you for advertising with " . SITE_NAME . "!\n";
                sendSecureEmail($buyer['email'], 'Your Neighborhood Card Has Shipped!', $body);

                // Track notification
                $db->prepare("INSERT INTO " . getTable('card_notifications') . " (order_id, card_id, user_id, notification_type) VALUES (?, ?, ?, 'card_shipped')")
                   ->execute([$buyer['order_id'], $cardId, $buyer['user_id']]);
                $sent++;
            }
            $message = "Card marked as shipped. Notified {$sent} buyer(s).";
            $messageType = 'success';
        }

        if ($action === 'update_status') {
            $db->prepare("UPDATE " . getTable('cards') . " SET status = ? WHERE id = ?")->execute([$_POST['status'], (int)$_POST['id']]);
            $message = 'Status updated.';
            $messageType = 'success';
        }

        if ($action === 'save_pricing') {
            $cardId = (int)$_POST['id'];
            $spotTypeIds = $_POST['spot_type_ids'] ?? [];
            $prices = $_POST['prices'] ?? [];
            $updated = 0;
            foreach ($spotTypeIds as $i => $stId) {
                $priceDollars = (float)($prices[$i] ?? 0);
                $priceCents = (int)round($priceDollars * 100);
                if ($priceCents > 0) {
                    $db->prepare("
                        INSERT INTO " . getTable('card_spot_prices') . " (card_id, spot_type_id, price_cents)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE price_cents = VALUES(price_cents)
                    ")->execute([$cardId, (int)$stId, $priceCents]);
                    $updated++;
                }
            }
            $message = "Pricing updated ({$updated} spot types).";
            $messageType = 'success';
        }

        if ($action === 'reset_pricing') {
            $cardId = (int)$_POST['id'];
            $stmt = $db->prepare("SELECT households FROM " . getTable('cards') . " WHERE id = ?");
            $stmt->execute([$cardId]);
            $households = (int)$stmt->fetchColumn();
            syncCardPricing($cardId, $households, true);
            $message = 'Pricing reset to tier defaults.';
            $messageType = 'success';
        }

    }

    // Fetch all cards with spot usage
    $cards = $db->query("
        SELECT c.*,
            COALESCE(SUM(CASE WHEN o.status IN ('pending','paid') THEN st.spots_used ELSE 0 END), 0) as spots_sold,
            COUNT(CASE WHEN o.status IN ('pending','paid') THEN 1 END) as order_count
        FROM " . getTable('cards') . " c
        LEFT JOIN " . getTable('card_orders') . " o ON o.card_id = c.id
        LEFT JOIN " . getTable('card_spot_types') . " st ON st.id = o.spot_type_id
        GROUP BY c.id
        ORDER BY c.display_order ASC, c.print_deadline ASC
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Fetch spot types for pricing modal
    $spotTypes = $db->query("SELECT * FROM " . getTable('card_spot_types') . " WHERE is_active = 1 ORDER BY display_order")->fetchAll(PDO::FETCH_ASSOC);

    // Fetch all per-card prices indexed by card_id => spot_type_id => price_cents
    $allCardPrices = [];
    $priceRows = $db->query("SELECT card_id, spot_type_id, price_cents FROM " . getTable('card_spot_prices'))->fetchAll(PDO::FETCH_ASSOC);
    foreach ($priceRows as $pr) {
        $allCardPrices[(int)$pr['card_id']][(int)$pr['spot_type_id']] = (int)$pr['price_cents'];
    }

} catch (Exception $e) {
    $error_message = "Database error: " . $e->getMessage();
    error_log("Manage cards error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Neighborhood Cards | <?= SITE_NAME ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; }
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem 20px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .page-title { font-size: 2rem; font-weight: 800; color: #1e293b; }
        .btn { padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s; border: none; cursor: pointer; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.5rem; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-success { background: #10b981; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-secondary { background: #64748b; color: white; }
        .btn-warning { background: #f59e0b; color: white; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
        .btn-sm { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
        .alert { padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
        .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; margin-bottom: 1.5rem; overflow: hidden; }
        .card-header { background: #f8fafc; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center; }
        .card-body { padding: 1.5rem; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f8fafc; font-weight: 600; color: #374151; font-size: 0.85rem; text-transform: uppercase; }
        tr:hover { background: #f9fafb; }
        .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
        .status-open { background: #dcfce7; color: #166534; }
        .status-full { background: #fef3c7; color: #92400e; }
        .status-printing { background: #dbeafe; color: #1e40af; }
        .status-shipped { background: #e5e7eb; color: #374151; }
        .spots-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; width: 100px; display: inline-block; vertical-align: middle; margin-left: 8px; }
        .spots-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
        .spots-fill.green { background: #22c55e; }
        .spots-fill.yellow { background: #f59e0b; }
        .spots-fill.red { background: #ef4444; }
        .action-btns { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151; font-size: 0.9rem; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.95rem; font-family: inherit; transition: border-color 0.3s; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #38b6ff; }
        .form-group textarea { min-height: 80px; resize: vertical; }
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.5); z-index: 1000; align-items: center; justify-content: center; }
        .modal-overlay.show { display: flex; }
        .modal { background: white; border-radius: 16px; max-width: 650px; width: 90%; max-height: 90vh; overflow-y: auto; }
        .modal-header { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h3 { font-size: 1.25rem; font-weight: 700; }
        .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
        .modal-body { padding: 1.5rem; }
        .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; display: flex; gap: 1rem; justify-content: flex-end; }
        @media (max-width: 768px) {
            .form-grid { grid-template-columns: 1fr; }
            th, td { padding: 0.75rem 0.5rem; font-size: 0.85rem; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'cards'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="page-header">
            <h1 class="page-title">Neighborhood Cards</h1>
            <div>
                <a href="card_categories.php" class="btn btn-secondary" style="margin-right: 8px;">Categories</a>
                <a href="card_orders.php" class="btn btn-secondary" style="margin-right: 8px;">Orders</a>
                <button class="btn btn-primary" onclick="openAddModal()">+ New Card</button>
            </div>
        </div>

        <?php if (!empty($message)): ?>
            <div class="alert alert-<?= $messageType ?>"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>
        <?php if (isset($error_message)): ?>
            <div class="alert alert-danger"><?= htmlspecialchars($error_message) ?></div>
        <?php endif; ?>

        <div class="card">
            <div class="card-header">
                <span>All Cards (<?= count($cards ?? []) ?>)</span>
                <a href="<?= SITE_URL ?>/neighborhood-cards/" target="_blank" style="color: #38b6ff; text-decoration: none; font-weight: 500;">View Public Page &rarr;</a>
            </div>
            <?php if (empty($cards)): ?>
                <div class="card-body" style="text-align: center; padding: 3rem;">
                    <p style="color: #64748b; margin-bottom: 1rem;">No community cards yet.</p>
                    <button class="btn btn-primary" onclick="openAddModal()">+ Create First Card</button>
                </div>
            <?php else: ?>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Neighborhood</th>
                                <th>Deadline</th>
                                <th>Fill Rate</th>
                                <th>Orders</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($cards as $card):
                                $sold = (float)$card['spots_sold'];
                                $total = (float)$card['total_spots'];
                                $remaining = $total - $sold;
                                $fillPct = $total > 0 ? ($sold / $total) * 100 : 0;
                                $barClass = $fillPct >= 90 ? 'red' : ($fillPct >= 60 ? 'yellow' : 'green');
                                $isPast = strtotime($card['print_deadline']) < time();
                            ?>
                            <tr>
                                <td><?= $card['display_order'] ?></td>
                                <td>
                                    <strong><?= htmlspecialchars($card['neighborhood_name']) ?></strong>
                                    <br><small style="color: #64748b;"><?= number_format($card['households']) ?> homes &middot; /neighborhood-card/<?= htmlspecialchars($card['slug']) ?></small>
                                </td>
                                <td>
                                    <?= date('M j, Y', strtotime($card['print_deadline'])) ?>
                                    <?php if ($isPast): ?><br><span style="color: #ef4444; font-size: 0.75rem;">PASSED</span><?php endif; ?>
                                    <?php if ($card['ship_date']): ?><br><small>Shipped: <?= date('M j', strtotime($card['ship_date'])) ?></small><?php endif; ?>
                                </td>
                                <td>
                                    <?= number_format($sold, 1) ?>/<?= number_format($total, 1) ?> spots
                                    <div class="spots-bar">
                                        <div class="spots-fill <?= $barClass ?>" style="width: <?= min(100, $fillPct) ?>%"></div>
                                    </div>
                                    <br><small style="color: #64748b;"><?= number_format($remaining, 1) ?> remaining</small>
                                </td>
                                <td><?= (int)$card['order_count'] ?></td>
                                <td><span class="status-badge status-<?= $card['status'] ?>"><?= ucfirst($card['status']) ?></span></td>
                                <td>
                                    <div class="action-btns">
                                        <button class="btn btn-secondary btn-sm" onclick='openEditModal(<?= json_encode($card) ?>)'>Edit</button>
                                        <button class="btn btn-warning btn-sm" onclick='openPricingModal(<?= (int)$card["id"] ?>, <?= json_encode($card["neighborhood_name"]) ?>, <?= (int)$card["households"] ?>)'>Pricing</button>
                                        <a href="card_layout.php?card_id=<?= $card['id'] ?>" class="btn btn-primary btn-sm">Layout</a>
                                        <a href="card_orders.php?card_id=<?= $card['id'] ?>" class="btn btn-secondary btn-sm">Orders</a>
                                        <?php if ($card['status'] === 'printing'): ?>
                                            <form method="POST" style="display:inline;" onsubmit="return confirm('Mark as shipped and notify all buyers?');">
                                                <input type="hidden" name="action" value="mark_shipped">
                                                <input type="hidden" name="id" value="<?= $card['id'] ?>">
                                                <button class="btn btn-success btn-sm" type="submit">Ship</button>
                                            </form>
                                        <?php endif; ?>
                                        <?php if ((int)$card['order_count'] === 0): ?>
                                            <form method="POST" style="display:inline;" onsubmit="return confirm('Delete this card?');">
                                                <input type="hidden" name="action" value="delete">
                                                <input type="hidden" name="id" value="<?= $card['id'] ?>">
                                                <button class="btn btn-danger btn-sm" type="submit">Del</button>
                                            </form>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </div>

    </div>

    <!-- Add/Edit Modal -->
    <div class="modal-overlay" id="cardModal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="modalTitle">New Neighborhood Card</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <form method="POST" id="cardForm">
                <div class="modal-body">
                    <input type="hidden" name="action" id="formAction" value="add">
                    <input type="hidden" name="id" id="formId">

                    <div class="form-group">
                        <label>Neighborhood Name *</label>
                        <input type="text" name="neighborhood_name" id="formName" required placeholder="e.g., Nexton, Summerville">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" id="formDesc" placeholder="Brief description of this card mailing..."></textarea>
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Print Deadline *</label>
                            <input type="date" name="print_deadline" id="formDeadline" required>
                        </div>
                        <div class="form-group">
                            <label>Ship Date</label>
                            <input type="date" name="ship_date" id="formShipDate">
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Households</label>
                            <input type="number" name="households" id="formHouseholds" value="2500" min="1" onchange="updateTierPreview()" oninput="updateTierPreview()">
                            <small id="tierPreview" style="color: #0ea5e9; font-weight: 500;"></small>
                        </div>
                        <div class="form-group">
                            <label>Total Spots</label>
                            <input type="number" name="total_spots" id="formTotalSpots" value="16" min="1" step="0.5">
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Max Coupons</label>
                            <input type="number" name="max_coupons" id="formMaxCoupons" value="2" min="0">
                        </div>
                        <div class="form-group">
                            <label>Display Order</label>
                            <input type="number" name="display_order" id="formOrder" value="0" min="0">
                        </div>
                    </div>
                    <div class="form-group" id="resyncGroup" style="display: none;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" name="resync_pricing" value="1" id="formResync" style="width: auto;">
                            Reset pricing to match new household tier
                        </label>
                        <small style="color: #94a3b8;">Check this to overwrite any custom pricing with tier defaults.</small>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select name="status" id="formStatus">
                            <option value="open">Open</option>
                            <option value="full">Full</option>
                            <option value="printing">Printing</option>
                            <option value="shipped">Shipped</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Card</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Pricing Modal -->
    <div class="modal-overlay" id="pricingModal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="pricingModalTitle">Spot Pricing</h3>
                <button class="modal-close" onclick="closePricingModal()">&times;</button>
            </div>
            <form method="POST" id="pricingForm">
                <div class="modal-body">
                    <input type="hidden" name="action" value="save_pricing">
                    <input type="hidden" name="id" id="pricingCardId">
                    <p style="margin-bottom: 12px; color: #64748b; font-size: 0.9rem;" id="pricingTierInfo"></p>
                    <table style="width: 100%;">
                        <thead>
                            <tr>
                                <th style="text-align: left;">Spot Type</th>
                                <th style="text-align: left;">Dimensions</th>
                                <th style="text-align: left;">Tier Default</th>
                                <th style="text-align: left;">Price ($)</th>
                            </tr>
                        </thead>
                        <tbody id="pricingTableBody">
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer" style="justify-content: space-between;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="resetPricing()" title="Reset all prices to tier defaults">Reset to Defaults</button>
                    <div style="display: flex; gap: 1rem;">
                        <button type="button" class="btn btn-secondary" onclick="closePricingModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Pricing</button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <form method="POST" id="resetPricingForm" style="display: none;">
        <input type="hidden" name="action" value="reset_pricing">
        <input type="hidden" name="id" id="resetPricingCardId">
    </form>

    <script>
    // Pricing tiers from PHP config
    var pricingTiers = <?= json_encode(CARD_PRICING_TIERS) ?>;
    // Spot types
    var spotTypes = <?= json_encode($spotTypes ?? []) ?>;
    // All per-card prices
    var allCardPrices = <?= json_encode($allCardPrices ?? (object)[]) ?>;

    function getTierForHouseholds(h) {
        for (var i = 0; i < pricingTiers.length; i++) {
            if (h >= pricingTiers[i].min && h <= pricingTiers[i].max) return pricingTiers[i];
        }
        if (h > 2500) return pricingTiers[pricingTiers.length - 1];
        if (h < 500) return pricingTiers[0];
        return null;
    }

    function openPricingModal(cardId, cardName, households) {
        document.getElementById('pricingModalTitle').textContent = 'Pricing — ' + cardName;
        document.getElementById('pricingCardId').value = cardId;
        document.getElementById('resetPricingCardId').value = cardId;

        var tier = getTierForHouseholds(households);
        document.getElementById('pricingTierInfo').textContent = tier
            ? 'Tier: ' + tier.label + ' (' + households.toLocaleString() + ' homes)'
            : 'No tier matched for ' + households + ' homes';

        var tbody = document.getElementById('pricingTableBody');
        tbody.innerHTML = '';
        var cardPrices = allCardPrices[cardId] || {};

        spotTypes.forEach(function(st) {
            var tierDefault = tier && tier.prices[st.name] ? tier.prices[st.name] : parseInt(st.price_cents);
            var currentPrice = cardPrices[st.id] || tierDefault;
            var isOverride = cardPrices[st.id] && cardPrices[st.id] !== tierDefault;

            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td>' + st.display_name + '</td>' +
                '<td style="color: #64748b; font-size: 0.85rem;">' + st.dimensions + '</td>' +
                '<td style="color: #64748b; font-size: 0.85rem;">$' + (tierDefault / 100).toFixed(0) + '</td>' +
                '<td>' +
                    '<input type="hidden" name="spot_type_ids[]" value="' + st.id + '">' +
                    '<input type="number" name="prices[]" value="' + (currentPrice / 100).toFixed(0) + '" min="1" step="1" ' +
                    'style="width: 90px; padding: 6px 8px; border: 2px solid ' + (isOverride ? '#f59e0b' : '#e5e7eb') + '; border-radius: 6px; font-size: 0.95rem;">' +
                    (isOverride ? ' <span style="color: #f59e0b; font-size: 0.75rem;">custom</span>' : '') +
                '</td>';
            tbody.appendChild(tr);
        });

        document.getElementById('pricingModal').classList.add('show');
    }

    function closePricingModal() {
        document.getElementById('pricingModal').classList.remove('show');
    }

    function resetPricing() {
        if (confirm('Reset all prices for this card to the tier defaults based on household count?')) {
            document.getElementById('resetPricingForm').submit();
        }
    }

    document.getElementById('pricingModal').addEventListener('click', function(e) { if (e.target === this) closePricingModal(); });

    function openAddModal() {
        document.getElementById('modalTitle').textContent = 'New Neighborhood Card';
        document.getElementById('formAction').value = 'add';
        document.getElementById('formId').value = '';
        document.getElementById('cardForm').reset();
        document.getElementById('formHouseholds').value = '2500';
        document.getElementById('formTotalSpots').value = '16';
        document.getElementById('formMaxCoupons').value = '2';
        document.getElementById('formOrder').value = '0';
        document.getElementById('resyncGroup').style.display = 'none';
        updateTierPreview();
        document.getElementById('cardModal').classList.add('show');
    }
    function openEditModal(card) {
        document.getElementById('modalTitle').textContent = 'Edit Card';
        document.getElementById('formAction').value = 'update';
        document.getElementById('formId').value = card.id;
        document.getElementById('resyncGroup').style.display = 'block';
        document.getElementById('formResync').checked = false;
        document.getElementById('formName').value = card.neighborhood_name;
        document.getElementById('formDesc').value = card.description || '';
        document.getElementById('formDeadline').value = card.print_deadline;
        document.getElementById('formShipDate').value = card.ship_date || '';
        document.getElementById('formHouseholds').value = card.households;
        document.getElementById('formTotalSpots').value = card.total_spots;
        document.getElementById('formMaxCoupons').value = card.max_coupons;
        document.getElementById('formOrder').value = card.display_order;
        document.getElementById('formStatus').value = card.status;
        updateTierPreview();
        document.getElementById('cardModal').classList.add('show');
    }
    function closeModal() {
        document.getElementById('cardModal').classList.remove('show');
    }
    document.getElementById('cardModal').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') { closeModal(); closePricingModal(); }
    });

    function updateTierPreview() {
        var h = parseInt(document.getElementById('formHouseholds').value) || 0;
        var tier = getTierForHouseholds(h);
        var el = document.getElementById('tierPreview');
        if (tier && h > 0) {
            el.textContent = 'Pricing tier: ' + tier.label;
        } else {
            el.textContent = '';
        }
    }
    updateTierPreview();
    </script>
</body>
</html>
