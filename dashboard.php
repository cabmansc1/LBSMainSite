<?php
// dashboard.php - Business owner dashboard
require_once 'config.php';
require_once 'User.php';
require_once 'Business.php';

requireLogin();

$user = getCurrentUser();
if (!$user) {
    header('Location: login.php');
    exit;
}

$userObj = new User();
$business = getUserBusiness($user['id']);
$subscription = $userObj->getUserSubscription($user['id']);

$planName = $subscription['plan_name'] ?? 'Basic';
$planBadgeClass = 'badge-basic';
if (strtolower($planName) === 'featured') {
    $planBadgeClass = 'badge-featured';
} elseif (strtolower($planName) === 'elite') {
    $planBadgeClass = 'badge-elite';
}

// Fetch community card stats & active orders
$cardOrders = [];
$cardStats = ['total_orders' => 0, 'active_orders' => 0, 'total_spent' => 0, 'homes_reached' => 0, 'content_needed' => 0, 'next_deadline' => null];
try {
    $db2 = getDB();

    // Active orders (for display)
    $cardOrderStmt = $db2->prepare("
        SELECT o.id, o.status, o.amount_cents, c.neighborhood_name, c.print_deadline, c.households, c.status as card_status,
               st.display_name as spot_name, ac.submitted_at, ac.admin_approved
        FROM " . getTable('card_orders') . " o
        JOIN " . getTable('cards') . " c ON c.id = o.card_id
        JOIN " . getTable('card_spot_types') . " st ON st.id = o.spot_type_id
        LEFT JOIN " . getTable('card_ad_content') . " ac ON ac.order_id = o.id
        WHERE o.user_id = ? AND o.status IN ('paid', 'pending')
        ORDER BY c.print_deadline ASC
        LIMIT 5
    ");
    $cardOrderStmt->execute([$user['id']]);
    $cardOrders = $cardOrderStmt->fetchAll(PDO::FETCH_ASSOC);

    // Aggregate stats across ALL orders
    $statsStmt = $db2->prepare("
        SELECT
            COUNT(*) as total_orders,
            SUM(CASE WHEN o.status IN ('paid','pending') AND c.status IN ('open','full','printing') THEN 1 ELSE 0 END) as active_orders,
            SUM(CASE WHEN o.status = 'paid' THEN o.amount_cents ELSE 0 END) as total_spent,
            SUM(CASE WHEN o.status = 'paid' AND c.status = 'shipped' THEN c.households ELSE 0 END) as homes_reached,
            SUM(CASE WHEN o.status = 'paid' AND ac.submitted_at IS NULL AND c.print_deadline >= CURDATE() THEN 1 ELSE 0 END) as content_needed,
            MIN(CASE WHEN o.status = 'paid' AND c.print_deadline >= CURDATE() AND c.status IN ('open','full') THEN c.print_deadline END) as next_deadline
        FROM " . getTable('card_orders') . " o
        JOIN " . getTable('cards') . " c ON c.id = o.card_id
        LEFT JOIN " . getTable('card_ad_content') . " ac ON ac.order_id = o.id
        WHERE o.user_id = ?
    ");
    $statsStmt->execute([$user['id']]);
    $row = $statsStmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $cardStats = [
            'total_orders' => (int)$row['total_orders'],
            'active_orders' => (int)$row['active_orders'],
            'total_spent' => (int)$row['total_spent'],
            'homes_reached' => (int)$row['homes_reached'],
            'content_needed' => (int)$row['content_needed'],
            'next_deadline' => $row['next_deadline'],
        ];
    }
} catch (Exception $e) {
    $cardOrders = [];
}

$hasCards = $cardStats['total_orders'] > 0;

// Fetch recent inquiries if business exists
$recentInquiries = [];
if ($business) {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            SELECT * FROM " . getTable('business_inquiries') . "
            WHERE business_id = ?
            ORDER BY created_at DESC
            LIMIT 5
        ");
        $stmt->execute([$business['id']]);
        $recentInquiries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $recentInquiries = [];
    }
}

$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
include __DIR__ . '/seo_head.php';
?>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; min-height: 100vh; color: #1e293b; }

        /* Header */
        .dashboard-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .header-brand { font-size: 1.1rem; font-weight: 800; color: #38b6ff; text-decoration: none; }
        .header-nav { display: flex; align-items: center; gap: 20px; }
        .header-nav a { color: #64748b; text-decoration: none; font-weight: 500; font-size: 14px; transition: color 0.2s; }
        .header-nav a:hover { color: #38b6ff; }
        .header-nav a.active { color: #38b6ff; border-bottom: 2px solid #38b6ff; padding-bottom: 2px; }
        .header-nav .btn-logout { color: #ef4444; }
        .header-nav .btn-logout:hover { color: #dc2626; }

        /* Main */
        .dashboard-main { max-width: 1100px; margin: 0 auto; padding: 24px; }

        /* Welcome */
        .welcome-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
        .welcome-bar h1 { font-size: 1.5rem; font-weight: 700; }
        .plan-badge { display: inline-block; padding: 5px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-basic { background: #f1f5f9; color: #64748b; }
        .badge-featured { background: #dbeafe; color: #2563eb; }
        .badge-elite { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; }

        /* Two column grid */
        .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .dash-grid.dash-grid-single { grid-template-columns: 1fr; max-width: 640px; }

        /* Cards */
        .card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; }
        .card-title { font-size: 0.88rem; font-weight: 700; margin-bottom: 16px; color: #334155; display: flex; justify-content: space-between; align-items: center; }
        .card-title a { font-size: 13px; color: #38b6ff; text-decoration: none; font-weight: 500; }
        .card-title a:hover { text-decoration: underline; }

        /* Business card */
        .business-name { font-size: 1.15rem; font-weight: 700; margin-bottom: 2px; }
        .category-label { color: #64748b; font-size: 13px; }
        .business-meta { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
        .status-active { background: #dcfce7; color: #166534; }
        .status-hidden { background: #fef3c7; color: #92400e; }
        .status-pending { background: #fff7ed; color: #c2410c; }

        .pending-banner { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 12px; }
        .pending-banner-icon { font-size: 1.3rem; line-height: 1; flex-shrink: 0; }
        .pending-banner h3 { font-size: 0.92rem; font-weight: 700; color: #9a3412; margin-bottom: 2px; }
        .pending-banner p { color: #c2410c; font-size: 0.85rem; line-height: 1.4; }

        /* Stats row */
        .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
        .stat-box { background: #f8fafc; border-radius: 10px; padding: 14px; text-align: center; }
        .stat-number { font-size: 1.5rem; font-weight: 800; color: #38b6ff; }
        .stat-label { font-size: 12px; color: #64748b; margin-top: 2px; font-weight: 500; }

        /* Buttons */
        .action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn { display: inline-block; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; transition: all 0.2s; border: none; cursor: pointer; font-family: 'Inter', sans-serif; }
        .btn-primary { background: #38b6ff; color: white; }
        .btn-primary:hover { background: #0ea5e9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(56,182,255,.3); }
        .btn-secondary { background: #f1f5f9; color: #334155; }
        .btn-secondary:hover { background: #e2e8f0; }

        /* Neighborhood card summary */
        .nc-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .nc-stat { background: #f8fafc; border-radius: 10px; padding: 12px; text-align: center; }
        .nc-stat-num { font-size: 1.3rem; font-weight: 800; color: #38b6ff; }
        .nc-stat-num.warn { color: #f59e0b; }
        .nc-stat-num.green { color: #10b981; }
        .nc-stat-label { font-size: 11px; color: #64748b; margin-top: 2px; font-weight: 500; }

        .nc-deadline { background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 0.85rem; color: #0369a1; display: flex; justify-content: space-between; align-items: center; }
        .nc-deadline strong { font-weight: 700; }

        .nc-order-list { margin-bottom: 14px; }
        .nc-order { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; gap: 8px; }
        .nc-order:last-child { border-bottom: none; }
        .nc-order-name { font-weight: 600; font-size: 0.92rem; }
        .nc-order-sub { font-size: 0.8rem; color: #64748b; margin-top: 1px; }
        .nc-order-right { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
        .nc-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.68rem; font-weight: 600; }
        .nc-badge-need { background: #fef3c7; color: #92400e; }
        .nc-badge-review { background: #dbeafe; color: #1e40af; }
        .nc-badge-ok { background: #dcfce7; color: #166534; }

        /* Upgrade */
        .upgrade-prompt { background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .upgrade-prompt h3 { font-size: 0.95rem; font-weight: 700; color: #1e40af; margin-bottom: 2px; }
        .upgrade-prompt p { color: #3b82f6; font-size: 13px; }
        .btn-upgrade { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; padding: 9px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; transition: all 0.2s; }
        .btn-upgrade:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(56,182,255,.4); }

        /* Inquiries */
        .inquiry-item { padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
        .inquiry-item:last-child { border-bottom: none; }
        .inquiry-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap: wrap; gap: 6px; }
        .inquiry-name { font-weight: 600; font-size: 0.92rem; }
        .inquiry-email { color: #64748b; font-size: 12px; }
        .inquiry-date { color: #94a3b8; font-size: 12px; white-space: nowrap; }
        .inquiry-message { color: #64748b; font-size: 13px; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .empty-state { text-align: center; padding: 30px 16px; color: #94a3b8; }
        .empty-state h3 { font-size: 1rem; font-weight: 600; margin-bottom: 6px; color: #64748b; }
        .empty-state p { margin-bottom: 16px; font-size: 0.9rem; }

        /* CTA card */
        .cta-card { text-align: center; padding: 40px 20px; }
        .cta-card h2 { font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; }
        .cta-card p { color: #64748b; margin-bottom: 20px; max-width: 360px; margin-left: auto; margin-right: auto; font-size: 0.92rem; }

        /* Full width section */
        .full-width { margin-bottom: 20px; }

        @media (max-width: 768px) {
            .dash-grid { grid-template-columns: 1fr; }
            .dashboard-main { padding: 16px; }
            .welcome-bar h1 { font-size: 1.25rem; }
            .header-nav { gap: 12px; }
            .header-nav a { font-size: 13px; }
            .nc-stats { grid-template-columns: 1fr 1fr; }
            .stats-row { grid-template-columns: 1fr 1fr; }
        }
    </style>
</head>
<body>

    <!-- Header -->
    <header class="dashboard-header">
        <a href="/directory" class="header-brand"><?= SITE_NAME ?></a>
        <nav class="header-nav">
            <a href="dashboard.php" class="active">Dashboard</a>
            <?php if ($hasCards): ?>
            <a href="my-cards.php">Neighborhood Cards</a>
            <?php endif; ?>
            <a href="logout.php" class="btn-logout">Logout</a>
        </nav>
    </header>

    <main class="dashboard-main">

        <!-- Welcome Bar -->
        <div class="welcome-bar">
            <?php $greetName = trim($user['first_name'] ?? '') ?: trim($_SESSION['user_name'] ?? ''); ?>
            <h1>Welcome<?= $greetName !== '' ? ', ' . htmlspecialchars($greetName) : ' back' ?>!</h1>
            <?php if ($business): ?>
                <span class="plan-badge <?= $planBadgeClass ?>"><?= htmlspecialchars($planName) ?> Plan</span>
            <?php endif; ?>
        </div>

        <?php if ($business): ?>
            <?php $isPending = empty($business['is_verified']); ?>
            <?php if ($isPending): ?>
                <div class="pending-banner">
                    <div class="pending-banner-icon">&#9203;</div>
                    <div>
                        <h3>Your listing is pending review</h3>
                        <p>Our team will review your listing shortly. This usually takes less than 24 hours.</p>
                    </div>
                </div>
            <?php endif; ?>
        <?php endif; ?>

        <!-- Two Column Layout (collapses to one when user has no neighborhood card orders) -->
        <div class="dash-grid<?= $hasCards ? '' : ' dash-grid-single' ?>">

            <!-- LEFT: Business Listing -->
            <div>
                <?php if ($business): ?>
                    <div class="card">
                        <div class="card-title">
                            <span>Business Listing</span>
                            <a href="create-listing.php">Edit &rarr;</a>
                        </div>
                        <div class="business-name"><?= htmlspecialchars($business['business_name']) ?></div>
                        <span class="category-label"><?= htmlspecialchars(ucwords(str_replace('-', ' ', $business['category'] ?? ''))) ?></span>
                        <div class="business-meta">
                            <?php if ($isPending ?? false): ?>
                                <span class="status-badge status-pending">Pending Review</span>
                            <?php elseif (!empty($business['is_hidden']) && $business['is_hidden']): ?>
                                <span class="status-badge status-hidden">Hidden</span>
                            <?php else: ?>
                                <span class="status-badge status-active">Active</span>
                            <?php endif; ?>
                        </div>

                        <div class="stats-row">
                            <div class="stat-box">
                                <div class="stat-number"><?= number_format((int)($business['views_count'] ?? 0)) ?></div>
                                <div class="stat-label">Views</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-number"><?= number_format((int)($business['inquiries_count'] ?? 0)) ?></div>
                                <div class="stat-label">Inquiries</div>
                            </div>
                        </div>

                        <div class="action-buttons">
                            <a href="/business/<?= htmlspecialchars($business['slug']) ?>" class="btn btn-primary">View Listing</a>
                            <a href="create-listing.php" class="btn btn-secondary">Edit Listing</a>
                        </div>
                    </div>

                    <?php if (strtolower($planName) === 'basic'): ?>
                        <div class="upgrade-prompt" style="margin-top: 20px;">
                            <div>
                                <h3>Upgrade Your Listing</h3>
                                <p>Unlock photos, hours, special offers &amp; more</p>
                            </div>
                            <a href="register.php?plan=featured" class="btn-upgrade">See Plans</a>
                        </div>
                    <?php endif; ?>
                <?php else: ?>
                    <div class="card cta-card">
                        <h2>Get Your Business Listed</h2>
                        <p>Create your free listing and start connecting with local customers.</p>
                        <a href="create-listing.php" class="btn btn-primary">Create Your Listing</a>
                    </div>
                <?php endif; ?>
            </div>

            <!-- RIGHT: Neighborhood Cards (only shown to users with existing orders) -->
            <?php if ($hasCards): ?>
            <div>
                <div class="card">
                    <div class="card-title">
                        <span>Neighborhood Cards</span>
                        <a href="my-cards.php">Manage &rarr;</a>
                    </div>

                        <!-- Stats grid -->
                        <div class="nc-stats">
                            <div class="nc-stat">
                                <div class="nc-stat-num"><?= $cardStats['total_orders'] ?></div>
                                <div class="nc-stat-label">Total Orders</div>
                            </div>
                            <div class="nc-stat">
                                <div class="nc-stat-num"><?= $cardStats['active_orders'] ?></div>
                                <div class="nc-stat-label">Active</div>
                            </div>
                            <div class="nc-stat">
                                <div class="nc-stat-num green"><?= number_format($cardStats['homes_reached']) ?></div>
                                <div class="nc-stat-label">Homes Reached</div>
                            </div>
                            <div class="nc-stat">
                                <div class="nc-stat-num">$<?= number_format($cardStats['total_spent'] / 100) ?></div>
                                <div class="nc-stat-label">Total Invested</div>
                            </div>
                        </div>

                        <?php if ($cardStats['next_deadline']): ?>
                            <?php
                                $nextDl = new DateTime($cardStats['next_deadline']);
                                $dlDays = max(0, (int)(new DateTime())->diff($nextDl)->format('%r%a'));
                            ?>
                            <div class="nc-deadline">
                                <span>Next deadline: <strong><?= $nextDl->format('M j, Y') ?></strong></span>
                                <span style="font-weight: 700; <?= $dlDays <= 5 ? 'color: #f59e0b;' : '' ?>"><?= $dlDays ?> day<?= $dlDays !== 1 ? 's' : '' ?></span>
                            </div>
                        <?php endif; ?>

                        <?php if ($cardStats['content_needed'] > 0): ?>
                            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 0.85rem; color: #92400e; font-weight: 600;">
                                <?= $cardStats['content_needed'] ?> order<?= $cardStats['content_needed'] > 1 ? 's' : '' ?> still need<?= $cardStats['content_needed'] === 1 ? 's' : '' ?> ad content
                            </div>
                        <?php endif; ?>

                        <!-- Active order list -->
                        <div class="nc-order-list">
                            <?php foreach ($cardOrders as $co):
                                $hasContent = !empty($co['submitted_at']);
                            ?>
                            <div class="nc-order">
                                <div>
                                    <div class="nc-order-name"><?= htmlspecialchars($co['neighborhood_name']) ?></div>
                                    <div class="nc-order-sub"><?= htmlspecialchars($co['spot_name']) ?> &middot; $<?= number_format($co['amount_cents'] / 100, 2) ?></div>
                                </div>
                                <div class="nc-order-right">
                                    <?php if ($hasContent && $co['admin_approved']): ?>
                                        <span class="nc-badge nc-badge-ok">Approved</span>
                                    <?php elseif ($hasContent): ?>
                                        <span class="nc-badge nc-badge-review">In Review</span>
                                    <?php else: ?>
                                        <span class="nc-badge nc-badge-need">Needs Content</span>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        </div>

                        <div class="action-buttons">
                            <a href="my-cards.php" class="btn btn-primary">Manage Cards</a>
                        </div>
                </div>
            </div>
            <?php endif; ?>

        </div>

        <!-- Recent Inquiries (full width below) -->
        <?php if ($business && !empty($recentInquiries)): ?>
            <div class="card full-width">
                <div class="card-title">
                    <span>Recent Inquiries</span>
                </div>
                <?php foreach ($recentInquiries as $inquiry): ?>
                    <div class="inquiry-item">
                        <div class="inquiry-top">
                            <div>
                                <span class="inquiry-name"><?= htmlspecialchars($inquiry['name'] ?? 'Unknown') ?></span>
                                <span class="inquiry-email">&mdash; <?= htmlspecialchars($inquiry['email'] ?? '') ?></span>
                            </div>
                            <span class="inquiry-date"><?= date('M j, Y', strtotime($inquiry['created_at'])) ?></span>
                        </div>
                        <div class="inquiry-message"><?= htmlspecialchars(mb_strimwidth($inquiry['message'] ?? '', 0, 120, '...')) ?></div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

    </main>
</body>
</html>
