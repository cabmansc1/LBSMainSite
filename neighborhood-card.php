<?php
/**
 * neighborhood-card.php - Visual spot grid version
 * Buyers click directly on a card position to select their spot.
 */
require_once 'config.php';

$slug = $_GET['slug'] ?? '';
if (!$slug) {
    header('Location: /neighborhood-cards/');
    exit;
}

try {
    $db = getDB();

    // Release abandoned checkouts older than 5 minutes
    expireStalePendingOrders();

    // Get card
    $stmt = $db->prepare("SELECT * FROM " . getTable('cards') . " WHERE slug = ? AND status = 'open'");
    $stmt->execute([$slug]);
    $card = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$card) {
        header('HTTP/1.1 404 Not Found');
        include '404.php';
        exit;
    }

    // Get positions with status
    $positions = getCardPositions($card['id']);
    $positionsBySide = getPositionsBySize($positions);

    // Calculate availability
    $spotsRemaining = getCardSpotsRemaining($card['id']);
    $couponCount = getCardCouponCount($card['id']);
    $maxCoupons = (int)$card['max_coupons'];

    $deadline = new DateTime($card['print_deadline']);
    $now = new DateTime();
    $daysLeft = max(0, (int)$now->diff($deadline)->format('%r%a'));
    $isClosed = $spotsRemaining <= 0 || $daysLeft <= 0;

    $cancelled = isset($_GET['cancelled']);

    // Get card categories and which ones are taken
    $cardCategories = $db->query("SELECT * FROM " . getTable('card_categories') . " WHERE is_active = 1 ORDER BY display_order, name")->fetchAll(PDO::FETCH_ASSOC);

    $takenCategoryIds = [];
    $stmt = $db->prepare("
        SELECT DISTINCT card_category_id FROM " . getTable('card_orders') . "
        WHERE card_id = ? AND status IN ('pending','paid') AND card_category_id IS NOT NULL
    ");
    $stmt->execute([$card['id']]);
    $takenCategoryIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

} catch (Exception $e) {
    error_log("Community card error: " . $e->getMessage());
    header('HTTP/1.1 500 Internal Server Error');
    exit('An error occurred.');
}

$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
// Dynamic title/description from the card record (overrides seo-config defaults)
$seo['title'] = $card['neighborhood_name'] . ' Community Card - ' . SITE_NAME;
$seo['description'] = 'Buy an ad spot on the ' . $card['neighborhood_name'] . ' community mailer card, delivered to ' . number_format($card['households']) . ' homes.';
include __DIR__ . '/seo_head.php';
?>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; }

        .page-header {
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
            padding: 50px 20px;
            text-align: center;
            color: white;
        }
        .page-header h1 { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 800; margin-bottom: 8px; }
        .page-header p { font-size: 1.05rem; opacity: 0.9; }
        .hero-stats { display: flex; justify-content: center; gap: 32px; margin-top: 20px; flex-wrap: wrap; }
        .hero-stat { text-align: center; }
        .hero-stat-value { font-size: 1.5rem; font-weight: 800; color: white; }
        .hero-stat-label { font-size: 0.82rem; opacity: 0.8; }

        .breadcrumb { max-width: 1100px; margin: 16px auto 0; padding: 0 20px; font-size: 0.88rem; color: #64748b; }
        .breadcrumb a { color: #38b6ff; text-decoration: none; }
        .breadcrumb a:hover { text-decoration: underline; }

        .container { max-width: 1100px; margin: 0 auto; padding: 32px 20px; }

        .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-weight: 500; font-size: 0.92rem; }
        .alert-warning { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        .layout { display: grid; grid-template-columns: 1fr 340px; gap: 32px; }

        /* Visual Card Grid */
        .grid-section h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; }
        .grid-instruction { font-size: 0.9rem; color: #64748b; margin-bottom: 20px; }

        .card-visual { display: flex; flex-direction: column; gap: 24px; }

        .card-side {
            flex: 1; min-width: 280px; width: 100%;
        }
        .card-side h3 {
            font-size: 0.95rem; font-weight: 700; text-align: center;
            margin-bottom: 10px; color: #475569;
            text-transform: uppercase; letter-spacing: 0.05em;
        }
        .card-frame {
            background: white;
            border: 2px solid #cbd5e1;
            border-radius: 12px;
            padding: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,.08);
        }
        .card-grid {
            display: grid;
            grid-template-rows: repeat(2, minmax(85px, auto));
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            width: 100%;
        }

        /* Grid Spot Cells */
        .grid-spot {
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4px 3px;
            text-align: center;
            transition: all 0.2s;
            border: 2px solid transparent;
            position: relative;
            min-height: 0;
            min-width: 0;
        }

        .grid-spot.available {
            background: #f0fdf4;
            border-color: #86efac;
            cursor: pointer;
        }
        .grid-spot.available:hover {
            background: #dcfce7;
            border-color: #22c55e;
            transform: scale(1.02);
            box-shadow: 0 2px 8px rgba(34,197,94,.25);
        }
        .grid-spot.available.selected {
            background: #dbeafe;
            border-color: #38b6ff;
            box-shadow: 0 0 0 3px rgba(56,182,255,.3);
        }

        .grid-spot.pending {
            background: #fff7ed;
            border-color: #fdba74;
            cursor: not-allowed;
        }

        .grid-spot.filled {
            background: #f1f5f9;
            border-color: #cbd5e1;
            cursor: not-allowed;
        }

        .spot-label {
            font-size: clamp(0.5rem, 1.2vw, 0.7rem);
            font-weight: 800;
            color: #94a3b8;
            line-height: 1;
        }
        .spot-type-name {
            font-size: clamp(0.55rem, 1.4vw, 0.78rem);
            font-weight: 700;
            line-height: 1.1;
        }
        .spot-price-tag {
            font-size: clamp(0.6rem, 1.5vw, 0.85rem);
            font-weight: 800;
            line-height: 1.1;
        }
        .grid-spot.available .spot-type-name { color: #16a34a; }
        .grid-spot.available .spot-price-tag { color: #15803d; }
        .grid-spot.available.selected .spot-type-name { color: #0369a1; }
        .grid-spot.available.selected .spot-price-tag { color: #0284c7; }

        .spot-status-text {
            font-size: clamp(0.55rem, 1.3vw, 0.72rem);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            line-height: 1.1;
        }
        .grid-spot.pending .spot-status-text { color: #ea580c; }
        .grid-spot.filled .spot-status-text { color: #64748b; }

        .spot-category-name {
            font-size: clamp(0.45rem, 1.1vw, 0.65rem);
            color: #64748b;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
        }

        /* Legend */
        .grid-legend {
            display: flex; gap: 16px; margin-top: 16px; flex-wrap: wrap;
            justify-content: center;
        }
        .legend-item {
            display: flex; align-items: center; gap: 6px;
            font-size: 0.82rem; color: #64748b;
        }
        .legend-dot {
            width: 12px; height: 12px; border-radius: 4px; border: 2px solid;
        }
        .legend-dot.available { background: #f0fdf4; border-color: #86efac; }
        .legend-dot.pending { background: #fff7ed; border-color: #fdba74; }
        .legend-dot.filled { background: #f1f5f9; border-color: #cbd5e1; }

        /* Sidebar */
        .sidebar { position: sticky; top: 20px; }
        .order-box {
            background: white; border: 1px solid #e2e8f0; border-radius: 14px;
            padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,.06);
        }
        .order-box h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; }

        .order-detail { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.92rem; border-bottom: 1px solid #f1f5f9; }
        .order-detail:last-of-type { border: none; }
        .order-label { color: #64748b; }
        .order-value { font-weight: 600; }

        .order-total { display: flex; justify-content: space-between; padding: 16px 0 0; margin-top: 12px; border-top: 2px solid #e2e8f0; font-size: 1.15rem; font-weight: 800; }

        .checkout-form { margin-top: 20px; }
        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; font-weight: 600; font-size: 0.88rem; margin-bottom: 4px; color: #374151; }
        .form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.95rem; font-family: inherit; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #38b6ff; }
        .form-group select option:disabled { color: #c0c0c0; }
        .form-group small { display: block; margin-top: 4px; font-size: 0.82rem; color: #94a3b8; }

        .btn-checkout {
            display: block; width: 100%; padding: 14px; margin-top: 16px;
            background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white;
            border: none; border-radius: 10px; font-size: 1rem; font-weight: 700;
            cursor: pointer; transition: all 0.2s;
        }
        .btn-checkout:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(56,182,255,.35); }
        .btn-checkout:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }

        .secure-note { text-align: center; margin-top: 12px; font-size: 0.82rem; color: #94a3b8; }

        /* Description */
        .card-description { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-top: 24px; }
        .card-description h3 { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
        .card-description p { color: #64748b; line-height: 1.6; font-size: 0.92rem; }

        @media (max-width: 768px) {
            .layout { grid-template-columns: 1fr; }
            .sidebar { position: static; }
            .hero-stats { gap: 20px; }
            .card-visual { flex-direction: column; }
            .card-side { min-width: unset; }
        }
    </style>
</head>
<body>

    <?php include 'header.php'; ?>

    <div class="page-header">
        <h1><?= htmlspecialchars($card['neighborhood_name']) ?> Community Card</h1>
        <p>6.5" x 12" printed mailer delivered to <?= number_format($card['households']) ?> homes</p>
        <div class="hero-stats">
            <div class="hero-stat">
                <div class="hero-stat-value"><?= number_format($spotsRemaining, 1) ?></div>
                <div class="hero-stat-label">Spots Left</div>
            </div>
            <div class="hero-stat">
                <div class="hero-stat-value"><?= $daysLeft ?></div>
                <div class="hero-stat-label">Days Left</div>
            </div>
            <div class="hero-stat">
                <div class="hero-stat-value"><?= number_format($card['households']) ?></div>
                <div class="hero-stat-label">Homes Reached</div>
            </div>
        </div>
    </div>

    <div class="breadcrumb">
        <a href="/neighborhood-cards">Neighborhood Cards</a> &rsaquo; <?= htmlspecialchars($card['neighborhood_name']) ?>
    </div>

    <div class="container">
        <?php if ($cancelled): ?>
            <div class="alert alert-warning">Your checkout was cancelled. You can try again below.</div>
        <?php endif; ?>

        <?php if ($isClosed): ?>
            <div class="alert alert-danger">
                <?= $spotsRemaining <= 0 ? 'This card is sold out.' : 'The deadline for this card has passed.' ?>
            </div>
        <?php endif; ?>

        <div class="layout">
            <!-- Visual Spot Grid -->
            <div class="grid-section">
                <h2>Choose Your Spot</h2>
                <p class="grid-instruction">Click an available spot to select where your ad will appear on the printed card.</p>

                <div class="card-visual">
                    <?php foreach (['front' => 'Front', 'back' => 'Back'] as $sideKey => $sideLabel): ?>
                    <div class="card-side">
                        <h3><?= $sideLabel ?></h3>
                        <div class="card-frame">
                            <div class="card-grid">
                                <?php
                                $sidePositions = $positionsBySide[$sideKey] ?? [];
                                foreach ($sidePositions as $pos):
                                    $status = $pos['status'];
                                    $clickable = ($status === 'available' && !$isClosed);
                                ?>
                                <div class="grid-spot <?= $status ?>"
                                     style="grid-row: <?= $pos['grid_row'] ?> / span <?= $pos['row_span'] ?>; grid-column: <?= $pos['grid_col'] ?> / span <?= $pos['col_span'] ?>;"
                                     <?php if ($clickable): ?>
                                     onclick="selectPosition(this)"
                                     data-position-id="<?= $pos['position_id'] ?>"
                                     data-spot-type-id="<?= $pos['spot_type_id'] ?>"
                                     data-price="<?= $pos['price_cents'] ?>"
                                     data-spot-name="<?= htmlspecialchars($pos['spot_name']) ?>"
                                     data-dims="<?= htmlspecialchars($pos['dimensions']) ?>"
                                     data-label="<?= htmlspecialchars($pos['label']) ?>"
                                     data-side="<?= $sideLabel ?>"
                                     <?php endif; ?>
                                >
                                    <span class="spot-label"><?= htmlspecialchars($pos['label']) ?></span>

                                    <?php if ($status === 'available'): ?>
                                        <span class="spot-type-name"><?= htmlspecialchars($pos['spot_name']) ?></span>
                                        <span class="spot-price-tag">$<?= number_format($pos['price_cents'] / 100) ?></span>
                                    <?php elseif ($status === 'pending'): ?>
                                        <span class="spot-status-text">Held</span>
                                    <?php elseif ($status === 'filled'): ?>
                                        <span class="spot-status-text">Filled</span>
                                        <?php if ($pos['category_name']): ?>
                                            <span class="spot-category-name"><?= htmlspecialchars($pos['category_name']) ?></span>
                                        <?php endif; ?>
                                    <?php endif; ?>
                                </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>

                <div class="grid-legend">
                    <div class="legend-item"><span class="legend-dot available"></span> Available</div>
                    <div class="legend-item"><span class="legend-dot pending"></span> Held</div>
                    <div class="legend-item"><span class="legend-dot filled"></span> Filled</div>
                </div>
            </div>

            <!-- Order Summary / Checkout -->
            <div class="sidebar">
                <div class="order-box">
                    <h3>Order Summary</h3>

                    <div class="order-detail">
                        <span class="order-label">Card</span>
                        <span class="order-value"><?= htmlspecialchars($card['neighborhood_name']) ?></span>
                    </div>
                    <div class="order-detail">
                        <span class="order-label">Position</span>
                        <span class="order-value" id="summaryPosition">Select a spot</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-label">Spot Size</span>
                        <span class="order-value" id="summarySpot">&mdash;</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-label">Dimensions</span>
                        <span class="order-value" id="summaryDims">&mdash;</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-label">Deadline</span>
                        <span class="order-value"><?= $deadline->format('M j, Y') ?></span>
                    </div>

                    <div class="order-total">
                        <span>Total</span>
                        <span id="summaryTotal">$0</span>
                    </div>

                    <form action="/neighborhood-card-checkout.php" method="POST" class="checkout-form" id="checkoutForm">
                        <input type="hidden" name="card_id" value="<?= $card['id'] ?>">
                        <input type="hidden" name="spot_type_id" id="selectedSpotTypeId" value="">
                        <input type="hidden" name="position_id" id="selectedPositionId" value="">
                        <?php $csrf = generateCSRFToken(); ?>
                        <input type="hidden" name="csrf_token" value="<?= $csrf ?>">

                        <div class="form-group">
                            <label>Business Category *</label>
                            <select name="card_category_id" id="categorySelect" required onchange="updateCategory()">
                                <option value="">— Select your category —</option>
                                <?php foreach ($cardCategories as $cat):
                                    $taken = in_array($cat['id'], $takenCategoryIds);
                                ?>
                                <option value="<?= $cat['id'] ?>" <?= $taken ? 'disabled' : '' ?>>
                                    <?= htmlspecialchars($cat['name']) ?><?= $taken ? ' (taken)' : '' ?>
                                </option>
                                <?php endforeach; ?>
                            </select>
                            <small>Each category is exclusive — only one business per category per card.</small>
                        </div>

                        <?php if (!isLoggedIn()): ?>
                            <div class="form-group">
                                <label>Email *</label>
                                <input type="email" name="email" required placeholder="you@example.com">
                            </div>
                            <div class="form-group">
                                <label>First Name *</label>
                                <input type="text" name="first_name" required placeholder="Jane">
                            </div>
                            <div class="form-group">
                                <label>Last Name *</label>
                                <input type="text" name="last_name" required placeholder="Doe">
                            </div>
                            <!-- Phone field removed: SMS opt-in handled by chat widget only.
                            <div class="form-group">
                                <label>Phone</label>
                                <input type="tel" name="phone" placeholder="(843) 555-1234">
                            </div>
                            -->
                        <?php endif; ?>

                        <button type="submit" class="btn-checkout" id="btnCheckout" disabled>
                            Select a spot to continue
                        </button>
                        <div class="secure-note">Secure checkout powered by Stripe</div>
                    </form>
                </div>
            </div>
        </div>

        <?php if ($card['description']): ?>
        <div class="card-description">
            <h3>About This Card</h3>
            <p><?= nl2br(htmlspecialchars($card['description'])) ?></p>
        </div>
        <?php endif; ?>
    </div>

    <?php include 'footer.php'; ?>

    <script>
    var selectedPrice = 0;

    function selectPosition(el) {
        // Deselect all
        document.querySelectorAll('.grid-spot').forEach(function(s) { s.classList.remove('selected'); });

        // Select this one
        el.classList.add('selected');

        selectedPrice = parseInt(el.dataset.price);
        document.getElementById('selectedPositionId').value = el.dataset.positionId;
        document.getElementById('selectedSpotTypeId').value = el.dataset.spotTypeId;
        document.getElementById('summaryPosition').textContent = el.dataset.label + ' — ' + el.dataset.side;
        document.getElementById('summarySpot').textContent = el.dataset.spotName;
        document.getElementById('summaryDims').textContent = el.dataset.dims;
        document.getElementById('summaryTotal').textContent = '$' + (selectedPrice / 100).toFixed(0);

        checkReady();
    }

    function updateCategory() {
        checkReady();
    }

    function checkReady() {
        var hasPosition = document.getElementById('selectedPositionId').value !== '';
        var hasCat = document.getElementById('categorySelect').value !== '';
        var btn = document.getElementById('btnCheckout');

        if (hasPosition && hasCat) {
            btn.disabled = false;
            btn.textContent = 'Proceed to Checkout — $' + (selectedPrice / 100).toFixed(0);
        } else if (hasPosition) {
            btn.disabled = true;
            btn.textContent = 'Select your business category';
        } else {
            btn.disabled = true;
            btn.textContent = 'Select a spot to continue';
        }
    }
    </script>
</body>
</html>
