<?php
/**
 * community-card.php - Single card detail page with spot selector and checkout
 */
require_once 'config.php';

// A2P 10DLC: checkout form collects phone, suppress competing chat widget opt-in
$hideChatWidget = true;

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

    // Get spot types
    $spotTypes = $db->query("SELECT * FROM " . getTable('card_spot_types') . " WHERE is_active = 1 ORDER BY display_order")->fetchAll(PDO::FETCH_ASSOC);

    // Calculate availability
    $spotsRemaining = getCardSpotsRemaining($card['id']);
    $couponCount = getCardCouponCount($card['id']);
    $maxCoupons = (int)$card['max_coupons'];

    $deadline = new DateTime($card['print_deadline']);
    $now = new DateTime();
    $daysLeft = max(0, (int)$now->diff($deadline)->format('%r%a'));
    $isClosed = $spotsRemaining <= 0 || $daysLeft <= 0;

    $cancelled = isset($_GET['cancelled']);

    // Get card categories and which ones are taken on this card
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

$pageTitle = $card['neighborhood_name'] . ' Community Card - ' . SITE_NAME;
$pageDesc = 'Buy an ad spot on the ' . $card['neighborhood_name'] . ' community mailer card, delivered to ' . number_format($card['households']) . ' homes.';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?></title>
    <meta name="robots" content="noindex,nofollow">
    <meta name="description" content="<?= htmlspecialchars($pageDesc) ?>">
    <meta property="og:title" content="<?= htmlspecialchars($pageTitle) ?>">
    <meta property="og:description" content="<?= htmlspecialchars($pageDesc) ?>">
    <meta property="og:url" content="<?= communityCardUrl($card['slug']) ?>">

    <!-- GA4 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-38313KT3XE"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-38313KT3XE');gtag('config','AW-18077746446');</script>

    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-5ZP4TT23');</script>

    <!-- Meta Pixel -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '629481023248934');
    fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=629481023248934&ev=PageView&noscript=1"
    /></noscript>

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

        .breadcrumb { max-width: 1000px; margin: 16px auto 0; padding: 0 20px; font-size: 0.88rem; color: #64748b; }
        .breadcrumb a { color: #38b6ff; text-decoration: none; }
        .breadcrumb a:hover { text-decoration: underline; }

        .container { max-width: 1000px; margin: 0 auto; padding: 32px 20px; }

        .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-weight: 500; font-size: 0.92rem; }
        .alert-warning { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        .layout { display: grid; grid-template-columns: 1fr 340px; gap: 32px; }

        /* Spot Selector */
        .spots-section h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; }

        .spot-card {
            background: white; border: 2px solid #e2e8f0; border-radius: 12px;
            padding: 20px; margin-bottom: 12px; cursor: pointer;
            transition: border-color 0.2s, box-shadow 0.2s;
            display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 12px;
        }
        .spot-card:hover { border-color: #38b6ff; }
        .spot-card.selected { border-color: #38b6ff; box-shadow: 0 0 0 3px rgba(56,182,255,.2); background: #f0f9ff; }
        .spot-card.unavailable { opacity: 0.5; cursor: not-allowed; border-color: #e2e8f0; }
        .spot-card.unavailable:hover { border-color: #e2e8f0; }

        .spot-name { font-weight: 700; font-size: 1.05rem; }
        .spot-details { font-size: 0.88rem; color: #64748b; margin-top: 2px; }
        .spot-price { font-size: 1.4rem; font-weight: 800; color: #38b6ff; text-align: right; }
        .spot-unavail { font-size: 0.8rem; color: #ef4444; font-weight: 600; }

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
        }
    </style>
</head>
<body>
    <!-- GTM noscript -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5ZP4TT23"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

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
        <a href="/neighborhood-cards/">Neighborhood Cards</a> &rsaquo; <?= htmlspecialchars($card['neighborhood_name']) ?>
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
            <!-- Spot Selector -->
            <div class="spots-section">
                <h2>Choose Your Spot Size</h2>

                <?php foreach ($spotTypes as $st):
                    $canFit = $spotsRemaining >= (float)$st['spots_used'];
                    $couponBlocked = $st['name'] === 'coupon' && $couponCount >= $maxCoupons;
                    $available = $canFit && !$couponBlocked && !$isClosed;
                ?>
                <div class="spot-card <?= $available ? '' : 'unavailable' ?>"
                     data-id="<?= $st['id'] ?>"
                     data-price="<?= $st['price_cents'] ?>"
                     data-name="<?= htmlspecialchars($st['display_name']) ?>"
                     data-dims="<?= htmlspecialchars($st['dimensions']) ?>"
                     data-available="<?= $available ? '1' : '0' ?>"
                     onclick="<?= $available ? 'selectSpot(this)' : '' ?>">
                    <div>
                        <div class="spot-name"><?= htmlspecialchars($st['display_name']) ?></div>
                        <div class="spot-details"><?= htmlspecialchars($st['dimensions']) ?> &middot; <?= $st['spots_used'] ?> spot<?= $st['spots_used'] != 1 ? 's' : '' ?></div>
                        <?php if ($couponBlocked): ?>
                            <div class="spot-unavail">Max coupons reached (<?= $maxCoupons ?>)</div>
                        <?php elseif (!$canFit): ?>
                            <div class="spot-unavail">Not enough spots remaining</div>
                        <?php endif; ?>
                    </div>
                    <div class="spot-price">$<?= number_format($st['price_cents'] / 100) ?></div>
                </div>
                <?php endforeach; ?>
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
                        <span class="order-label">Spot Size</span>
                        <span class="order-value" id="summarySpot">Select a spot</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-label">Dimensions</span>
                        <span class="order-value" id="summaryDims">—</span>
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
                            <div class="form-group">
                                <label>Phone</label>
                                <input type="tel" name="phone" placeholder="(843) 555-1234">
                            </div>
                            <?php include __DIR__ . '/includes/sms_consent.php'; ?>
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

    function selectSpot(el) {
        if (el.dataset.available !== '1') return;
        document.querySelectorAll('.spot-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');

        selectedPrice = parseInt(el.dataset.price);
        document.getElementById('summarySpot').textContent = el.dataset.name;
        document.getElementById('summaryDims').textContent = el.dataset.dims;
        document.getElementById('summaryTotal').textContent = '$' + (selectedPrice / 100).toFixed(0);
        document.getElementById('selectedSpotTypeId').value = el.dataset.id;

        checkReady();
    }

    function updateCategory() {
        checkReady();
    }

    function checkReady() {
        var hasSpot = document.getElementById('selectedSpotTypeId').value !== '';
        var hasCat = document.getElementById('categorySelect').value !== '';
        var btn = document.getElementById('btnCheckout');

        if (hasSpot && hasCat) {
            btn.disabled = false;
            btn.textContent = 'Proceed to Checkout — $' + (selectedPrice / 100).toFixed(0);
        } else if (hasSpot) {
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
