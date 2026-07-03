<?php
/**
 * my-cards.php - Buyer dashboard for community card orders
 * Upload/edit ad content, view order status, request refunds.
 */
require_once 'config.php';

// A2P 10DLC: page has phone-shaped fields (ad content), suppress chat widget to avoid scanner false positives
$hideChatWidget = true;

requireLogin();
$user = getCurrentUser();
if (!$user) { header('Location: login.php'); exit; }

try {
    $db = getDB();
    $message = '';
    $messageType = '';

    // Handle ad content upload/edit
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!validateCSRFToken($_POST['csrf_token'] ?? '')) {
            die('Invalid request.');
        }

        $action = $_POST['action'] ?? '';
        $orderId = (int)($_POST['order_id'] ?? 0);

        // Verify order belongs to user
        $orderCheck = $db->prepare("
            SELECT o.*, c.print_deadline
            FROM " . getTable('card_orders') . " o
            JOIN " . getTable('cards') . " c ON c.id = o.card_id
            WHERE o.id = ? AND o.user_id = ? AND o.status = 'paid'
        ");
        $orderCheck->execute([$orderId, $user['id']]);
        $order = $orderCheck->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            $message = 'Order not found.';
            $messageType = 'danger';
        } elseif ($action === 'update_content') {
            if (!isCardEditable($order['print_deadline'])) {
                $message = 'Content editing is locked (deadline is within 2 days).';
                $messageType = 'danger';
            } else {
                $promoText = substr(sanitizeInput($_POST['promo_text'] ?? ''), 0, 100);
                $phone = sanitizePhone($_POST['ad_phone'] ?? '');
                $url = sanitizeURL($_POST['ad_url'] ?? '') ?: null;

                // Handle logo upload
                $logoFilename = null;
                $logoOriginal = null;
                if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
                    $uploaded = uploadImage($_FILES['logo'], 'card_ads');
                    $logoFilename = $uploaded['filename'];
                    $logoOriginal = sanitizeInput($_FILES['logo']['name']);
                }

                // Update or insert ad content
                if ($logoFilename) {
                    $db->prepare("
                        UPDATE " . getTable('card_ad_content') . "
                        SET promo_text = ?, phone = ?, url = ?, logo_filename = ?, logo_original_filename = ?, submitted_at = NOW(), admin_approved = 0
                        WHERE order_id = ?
                    ")->execute([$promoText, $phone, $url, $logoFilename, $logoOriginal, $orderId]);
                } else {
                    $db->prepare("
                        UPDATE " . getTable('card_ad_content') . "
                        SET promo_text = ?, phone = ?, url = ?, submitted_at = COALESCE(submitted_at, NOW()), admin_approved = 0
                        WHERE order_id = ?
                    ")->execute([$promoText, $phone, $url, $orderId]);
                }

                $message = 'Ad content saved successfully!';
                $messageType = 'success';
                logActivity('card_content_updated', ['order_id' => $orderId]);
            }
        } elseif ($action === 'request_refund') {
            if (!isRefundAllowed($order['print_deadline'])) {
                $message = 'Refund requests are closed (deadline is within 2 days).';
                $messageType = 'danger';
            } else {
                $db->prepare("UPDATE " . getTable('card_orders') . " SET status = 'refund_requested', refund_requested_at = NOW() WHERE id = ?")
                   ->execute([$orderId]);

                // Admin notification
                $cardName = $db->prepare("SELECT neighborhood_name FROM " . getTable('cards') . " WHERE id = ?");
                $cardName->execute([$order['card_id']]);
                $cardName = $cardName->fetchColumn();

                $db->prepare("INSERT INTO " . getTable('card_admin_notifications') . " (type, message, related_card_id, related_order_id) VALUES ('refund_request', ?, ?, ?)")
                   ->execute(["Refund requested for order #{$orderId} on {$cardName}", $order['card_id'], $orderId]);

                sendSecureEmail(ADMIN_EMAIL, 'Refund Requested - Order #' . $orderId, "Buyer: {$user['first_name']} {$user['last_name']} ({$user['email']})\nCard: {$cardName}\nAmount: \$" . number_format($order['amount_cents'] / 100, 2));

                $message = 'Refund request submitted. We\'ll process it within 2-3 business days.';
                $messageType = 'success';
            }
        }
    }

    // Filters
    $filterNeighborhood = $_GET['neighborhood'] ?? '';
    $filterStatus = $_GET['status'] ?? '';
    $filterTimeframe = $_GET['timeframe'] ?? 'active'; // active or past

    // Build query with filters
    $where = "o.user_id = ?";
    $params = [$user['id']];

    if ($filterNeighborhood) {
        $where .= " AND c.slug = ?";
        $params[] = $filterNeighborhood;
    }

    if ($filterStatus) {
        $where .= " AND o.status = ?";
        $params[] = $filterStatus;
    }

    if ($filterTimeframe === 'past') {
        $where .= " AND (c.status IN ('shipped') OR c.print_deadline < CURDATE() OR o.status IN ('refunded','cancelled'))";
    } else {
        // Active: card is open/full/printing AND order is paid/pending/refund_requested
        $where .= " AND c.status IN ('open','full','printing') AND c.print_deadline >= CURDATE() AND o.status IN ('paid','pending','refund_requested')";
    }

    $orders = $db->prepare("
        SELECT o.*, c.neighborhood_name, c.print_deadline, c.ship_date, c.status as card_status, c.slug as card_slug,
               st.display_name as spot_name, st.dimensions,
               ac.promo_text, ac.phone as ad_phone, ac.url as ad_url,
               ac.logo_filename, ac.logo_original_filename, ac.admin_approved, ac.admin_notes, ac.submitted_at
        FROM " . getTable('card_orders') . " o
        JOIN " . getTable('cards') . " c ON c.id = o.card_id
        JOIN " . getTable('card_spot_types') . " st ON st.id = o.spot_type_id
        LEFT JOIN " . getTable('card_ad_content') . " ac ON ac.order_id = o.id
        WHERE {$where}
        ORDER BY o.created_at DESC
    ");
    $orders->execute($params);
    $orders = $orders->fetchAll(PDO::FETCH_ASSOC);

    // Get distinct neighborhoods for filter dropdown
    $neighborhoods = $db->prepare("
        SELECT DISTINCT c.slug, c.neighborhood_name
        FROM " . getTable('card_orders') . " o
        JOIN " . getTable('cards') . " c ON c.id = o.card_id
        WHERE o.user_id = ?
        ORDER BY c.neighborhood_name
    ");
    $neighborhoods->execute([$user['id']]);
    $neighborhoods = $neighborhoods->fetchAll(PDO::FETCH_ASSOC);

    $csrf = generateCSRFToken();

} catch (Exception $e) {
    error_log("my-cards error: " . $e->getMessage());
    $orders = [];
}

$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
include __DIR__ . '/seo_head.php';
?>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #1e293b; min-height: 100vh; }

        .dashboard-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .header-brand { font-size: 1.1rem; font-weight: 800; color: #38b6ff; text-decoration: none; }
        .header-nav { display: flex; align-items: center; gap: 20px; }
        .header-nav a { color: #64748b; text-decoration: none; font-weight: 500; font-size: 14px; transition: color 0.2s; }
        .header-nav a:hover { color: #38b6ff; }
        .header-nav a.active { color: #38b6ff; border-bottom: 2px solid #38b6ff; padding-bottom: 2px; }
        .header-nav .btn-logout { color: #ef4444; }

        .container { max-width: 800px; margin: 0 auto; padding: 24px; }

        h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 24px; }

        .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-weight: 500; font-size: 0.92rem; }
        .alert-success { background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        /* Order list */
        .order-list { background: white; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }

        .order-row {
            display: flex; align-items: center; padding: 16px 20px; gap: 12px;
            border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s;
        }
        .order-row:last-child { border-bottom: none; }
        .order-row:hover { background: #f8fafc; }
        .order-row.expanded { background: #f0f9ff; }

        .order-row-main { flex: 1; min-width: 0; }
        .order-row-title { font-weight: 700; font-size: 1rem; color: #1e293b; }
        .order-row-sub { font-size: 0.82rem; color: #64748b; margin-top: 2px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .order-row-sub span { white-space: nowrap; }

        .order-row-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; }
        .status-paid { background: #dcfce7; color: #166534; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-refund_requested { background: #fee2e2; color: #991b1b; }
        .status-refunded { background: #e5e7eb; color: #374151; }
        .status-cancelled { background: #f1f5f9; color: #64748b; }

        .content-badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; }
        .content-submitted { background: #dcfce7; color: #166534; }
        .content-needed { background: #fef3c7; color: #92400e; }
        .content-approved { background: #dcfce7; color: #166534; }
        .content-review { background: #dbeafe; color: #1e40af; }

        .chevron { width: 20px; height: 20px; color: #94a3b8; transition: transform 0.2s; flex-shrink: 0; }
        .order-row.expanded .chevron { transform: rotate(180deg); }

        /* Expanded edit panel */
        .order-detail { display: none; padding: 0 20px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .order-detail.show { display: block; }

        .detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; padding: 16px 0; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
        .detail-item label { display: block; font-size: 0.75rem; color: #94a3b8; font-weight: 500; text-transform: uppercase; margin-bottom: 2px; }
        .detail-item span { font-weight: 600; font-size: 0.88rem; }

        .deadline-warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 0.88rem; color: #92400e; }
        .deadline-locked { background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 0.88rem; color: #991b1b; }

        .edit-form h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-group { margin-bottom: 14px; }
        .form-group label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; color: #374151; }
        .form-group input, .form-group textarea { width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.9rem; font-family: inherit; background: white; }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #38b6ff; }
        .form-group small { display: block; margin-top: 4px; color: #94a3b8; font-size: 0.82rem; }

        .char-count { float: right; font-size: 0.82rem; color: #94a3b8; }
        .char-count.warn { color: #f59e0b; }
        .char-count.over { color: #ef4444; }

        .current-logo { display: inline-flex; align-items: center; gap: 10px; margin: 4px 0 8px; }
        .current-logo img { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; }
        .current-logo small { color: #64748b; font-size: 0.82rem; }

        .btn { display: inline-block; padding: 10px 20px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; text-decoration: none; transition: all 0.2s; border: none; cursor: pointer; font-family: inherit; }
        .btn-primary { background: #38b6ff; color: white; }
        .btn-primary:hover { background: #0ea5e9; }
        .btn-danger { background: white; color: #ef4444; border: 1px solid #ef4444; }
        .btn-danger:hover { background: #fef2f2; }
        .btn-secondary { background: #f1f5f9; color: #334155; }

        .form-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 16px; }

        .approval-badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 600; }
        .approved { background: #dcfce7; color: #166534; }
        .pending-review { background: #dbeafe; color: #1e40af; }

        /* Timeframe tabs */
        .tab-bar { display: flex; gap: 0; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
        .tab-link {
            padding: 10px 20px; font-size: 0.92rem; font-weight: 600; color: #64748b;
            text-decoration: none; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s;
        }
        .tab-link:hover { color: #1e293b; }
        .tab-link.active { color: #38b6ff; border-bottom-color: #38b6ff; }
        .tab-count { background: #f1f5f9; color: #64748b; font-size: 0.75rem; padding: 2px 7px; border-radius: 10px; margin-left: 6px; font-weight: 600; }
        .tab-link.active .tab-count { background: #e0f2fe; color: #0284c7; }

        /* Filters */
        .filters { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
        .filters select {
            padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 8px;
            font-family: inherit; font-size: 0.88rem; color: #334155; background: white;
        }
        .filters select:focus { outline: none; border-color: #38b6ff; }
        .filter-count { font-size: 0.88rem; color: #94a3b8; }

        .empty-state { text-align: center; padding: 60px 20px; }
        .empty-state h2 { font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; color: #334155; }
        .empty-state p { color: #64748b; margin-bottom: 20px; }

        @media (max-width: 640px) {
            .detail-grid { grid-template-columns: 1fr 1fr; }
            .form-row { grid-template-columns: 1fr; }
            .order-row { flex-wrap: wrap; }
            .order-row-right { width: 100%; justify-content: flex-end; margin-top: 4px; }
            .tab-link { padding: 10px 14px; font-size: 0.85rem; }
            .filters select { flex: 1; min-width: 0; }
        }
    </style>
</head>
<body>
    <header class="dashboard-header">
        <a href="/directory/" class="header-brand"><?= SITE_NAME ?></a>
        <nav class="header-nav">
            <a href="dashboard.php">Dashboard</a>
            <a href="my-cards.php" class="active">Neighborhood Cards</a>
            <a href="/neighborhood-cards/">Browse Cards</a>
            <a href="logout.php" class="btn-logout">Logout</a>
        </nav>
    </header>

    <div class="container">
        <h1>My Neighborhood Cards</h1>

        <?php if ($message): ?>
            <div class="alert alert-<?= $messageType ?>"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <!-- Active / Past tabs -->
        <div class="tab-bar">
            <a href="?timeframe=active<?= $filterNeighborhood ? '&neighborhood=' . urlencode($filterNeighborhood) : '' ?><?= $filterStatus ? '&status=' . urlencode($filterStatus) : '' ?>"
               class="tab-link <?= $filterTimeframe === 'active' ? 'active' : '' ?>">Active</a>
            <a href="?timeframe=past<?= $filterNeighborhood ? '&neighborhood=' . urlencode($filterNeighborhood) : '' ?><?= $filterStatus ? '&status=' . urlencode($filterStatus) : '' ?>"
               class="tab-link <?= $filterTimeframe === 'past' ? 'active' : '' ?>">Past</a>
        </div>

        <!-- Filters -->
        <form class="filters" method="GET">
            <input type="hidden" name="timeframe" value="<?= htmlspecialchars($filterTimeframe) ?>">
            <select name="neighborhood" onchange="this.form.submit()">
                <option value="">All Neighborhoods</option>
                <?php foreach ($neighborhoods as $n): ?>
                    <option value="<?= htmlspecialchars($n['slug']) ?>" <?= $filterNeighborhood === $n['slug'] ? 'selected' : '' ?>><?= htmlspecialchars($n['neighborhood_name']) ?></option>
                <?php endforeach; ?>
            </select>
            <select name="status" onchange="this.form.submit()">
                <option value="">All Statuses</option>
                <option value="paid" <?= $filterStatus === 'paid' ? 'selected' : '' ?>>Paid</option>
                <option value="pending" <?= $filterStatus === 'pending' ? 'selected' : '' ?>>Pending</option>
                <option value="refund_requested" <?= $filterStatus === 'refund_requested' ? 'selected' : '' ?>>Refund Requested</option>
                <option value="refunded" <?= $filterStatus === 'refunded' ? 'selected' : '' ?>>Refunded</option>
                <option value="cancelled" <?= $filterStatus === 'cancelled' ? 'selected' : '' ?>>Cancelled</option>
            </select>
            <span class="filter-count"><?= count($orders) ?> order<?= count($orders) !== 1 ? 's' : '' ?></span>
            <?php if ($filterNeighborhood || $filterStatus): ?>
                <a href="?timeframe=<?= htmlspecialchars($filterTimeframe) ?>" style="font-size: 0.85rem; color: #ef4444; text-decoration: none; font-weight: 500;">Clear filters</a>
            <?php endif; ?>
        </form>

        <?php if (empty($orders)): ?>
            <div class="empty-state">
                <?php if ($filterNeighborhood || $filterStatus): ?>
                    <h2>No orders match your filters</h2>
                    <p>Try adjusting your filters or <a href="?timeframe=<?= htmlspecialchars($filterTimeframe) ?>" style="color: #38b6ff;">clear them</a>.</p>
                <?php elseif ($filterTimeframe === 'past'): ?>
                    <h2>No past orders</h2>
                    <p>Completed and cancelled orders will appear here.</p>
                <?php else: ?>
                    <h2>No active neighborhood card orders</h2>
                    <p>Browse available neighborhood cards and buy an ad spot to reach local homes.</p>
                    <a href="/neighborhood-cards/" class="btn btn-primary">Browse Cards</a>
                <?php endif; ?>
            </div>
        <?php else: ?>
            <div class="order-list">
            <?php foreach ($orders as $o):
                $editable = $o['status'] === 'paid' && isCardEditable($o['print_deadline']);
                $refundable = $o['status'] === 'paid' && isRefundAllowed($o['print_deadline']);
                $deadline = new DateTime($o['print_deadline']);
                $now = new DateTime();
                $daysLeft = max(0, (int)$now->diff($deadline)->format('%r%a'));
                $hasContent = !empty($o['submitted_at']);

                // Auto-expand if order_id matches URL param (after save)
                $autoExpand = isset($_GET['expanded']) && (int)$_GET['expanded'] === (int)$o['id'];
            ?>
                <!-- Clickable row -->
                <div class="order-row <?= $autoExpand ? 'expanded' : '' ?>" onclick="toggleOrder(<?= $o['id'] ?>)">
                    <div class="order-row-main">
                        <div class="order-row-title"><?= htmlspecialchars($o['neighborhood_name']) ?></div>
                        <div class="order-row-sub">
                            <span><?= htmlspecialchars($o['spot_name']) ?> (<?= $o['dimensions'] ?>)</span>
                            <span>&middot;</span>
                            <span>$<?= number_format($o['amount_cents'] / 100, 2) ?></span>
                            <span>&middot;</span>
                            <span><?= $deadline->format('M j, Y') ?><?= $daysLeft > 0 && $o['status'] === 'paid' ? ' (' . $daysLeft . 'd left)' : '' ?></span>
                        </div>
                    </div>
                    <div class="order-row-right">
                        <?php if ($o['status'] === 'paid'): ?>
                            <?php if ($hasContent && $o['admin_approved']): ?>
                                <span class="content-badge content-approved">Approved</span>
                            <?php elseif ($hasContent): ?>
                                <span class="content-badge content-review">In Review</span>
                            <?php else: ?>
                                <span class="content-badge content-needed">Content Needed</span>
                            <?php endif; ?>
                        <?php endif; ?>
                        <span class="status-badge status-<?= $o['status'] ?>"><?= ucfirst(str_replace('_', ' ', $o['status'])) ?></span>
                        <svg class="chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"/></svg>
                    </div>
                </div>

                <!-- Expandable detail/edit panel -->
                <div class="order-detail <?= $autoExpand ? 'show' : '' ?>" id="detail-<?= $o['id'] ?>">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Amount</label>
                            <span>$<?= number_format($o['amount_cents'] / 100, 2) ?></span>
                        </div>
                        <div class="detail-item">
                            <label>Deadline</label>
                            <span><?= $deadline->format('M j, Y') ?></span>
                        </div>
                        <div class="detail-item">
                            <label>Purchased</label>
                            <span><?= date('M j, Y', strtotime($o['created_at'])) ?></span>
                        </div>
                        <div class="detail-item">
                            <label>Card Status</label>
                            <span><?= ucfirst($o['card_status']) ?><?= $o['ship_date'] ? ' (' . date('M j', strtotime($o['ship_date'])) . ')' : '' ?></span>
                        </div>
                    </div>

                    <?php if ($o['status'] === 'paid'): ?>
                        <?php if ($daysLeft <= 5 && $daysLeft > 2): ?>
                            <div class="deadline-warning">Deadline is approaching! Submit your ad content soon.</div>
                        <?php elseif (!$editable && $daysLeft > 0): ?>
                            <div class="deadline-locked">Content editing is locked (within 2 days of deadline).</div>
                        <?php endif; ?>

                        <?php if ($o['admin_notes']): ?>
                            <div class="alert alert-danger" style="margin-bottom: 12px;">Admin note: <?= htmlspecialchars($o['admin_notes']) ?></div>
                        <?php endif; ?>

                        <div class="edit-form">
                            <h3>
                                Ad Content
                                <?php if ($hasContent && $o['admin_approved']): ?>
                                    <span class="approval-badge approved">Approved</span>
                                <?php elseif ($hasContent): ?>
                                    <span class="approval-badge pending-review">Pending Review</span>
                                <?php endif; ?>
                            </h3>

                            <form method="POST" enctype="multipart/form-data">
                                <input type="hidden" name="action" value="update_content">
                                <input type="hidden" name="order_id" value="<?= $o['id'] ?>">
                                <input type="hidden" name="csrf_token" value="<?= $csrf ?>">

                                <div class="form-group">
                                    <label>Logo / Ad Image (JPG, PNG, WebP — max 5MB)</label>
                                    <?php if ($o['logo_filename']): ?>
                                        <div class="current-logo">
                                            <img src="<?= SITE_URL ?>/uploads/card_ads/<?= htmlspecialchars($o['logo_filename']) ?>" alt="Current logo">
                                            <small><?= htmlspecialchars($o['logo_original_filename']) ?></small>
                                        </div>
                                    <?php endif; ?>
                                    <input type="file" name="logo" accept=".jpg,.jpeg,.png,.webp" <?= !$editable ? 'disabled' : '' ?>>
                                </div>

                                <div class="form-group">
                                    <label>Promo Text <span class="char-count" id="charCount-<?= $o['id'] ?>"><?= strlen($o['promo_text'] ?? '') ?>/100</span></label>
                                    <input type="text" name="promo_text" maxlength="100" value="<?= htmlspecialchars($o['promo_text'] ?? '') ?>"
                                           placeholder="e.g., 20% off your first visit!" <?= !$editable ? 'disabled' : '' ?>
                                           oninput="updateCharCount(this, <?= $o['id'] ?>)">
                                </div>

                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Phone Number</label>
                                        <input type="tel" name="ad_phone" value="<?= htmlspecialchars($o['ad_phone'] ?? '') ?>"
                                               placeholder="(843) 555-1234" <?= !$editable ? 'disabled' : '' ?>>
                                    </div>
                                    <div class="form-group">
                                        <label>Website URL</label>
                                        <input type="url" name="ad_url" value="<?= htmlspecialchars($o['ad_url'] ?? '') ?>"
                                               placeholder="https://yourbusiness.com" <?= !$editable ? 'disabled' : '' ?>>
                                    </div>
                                </div>

                                <div class="form-actions">
                                    <?php if ($editable): ?>
                                        <button type="submit" class="btn btn-primary">Save Ad Content</button>
                                    <?php endif; ?>
                                    <?php if ($refundable): ?>
                                        <button type="submit" name="action" value="request_refund" class="btn btn-danger"
                                                onclick="return confirm('Are you sure you want to request a refund? Your ad spot will be released.');">
                                            Request Refund
                                        </button>
                                    <?php endif; ?>
                                </div>
                            </form>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>

    <script>
    function toggleOrder(id) {
        var row = document.querySelector('.order-row[onclick*="' + id + '"]');
        var detail = document.getElementById('detail-' + id);
        if (!row || !detail) return;

        var isOpen = detail.classList.contains('show');
        // Close all
        document.querySelectorAll('.order-detail.show').forEach(function(d) { d.classList.remove('show'); });
        document.querySelectorAll('.order-row.expanded').forEach(function(r) { r.classList.remove('expanded'); });

        // Toggle clicked
        if (!isOpen) {
            detail.classList.add('show');
            row.classList.add('expanded');
        }
    }

    function updateCharCount(input, orderId) {
        var el = document.getElementById('charCount-' + orderId);
        var len = input.value.length;
        el.textContent = len + '/100';
        el.className = 'char-count' + (len >= 100 ? ' over' : (len >= 80 ? ' warn' : ''));
    }

    // Prevent row toggle when clicking inside the detail panel
    document.querySelectorAll('.order-detail').forEach(function(d) {
        d.addEventListener('click', function(e) { e.stopPropagation(); });
    });
    </script>
</body>
</html>
