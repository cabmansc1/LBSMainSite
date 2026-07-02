<?php
// admin/card_orders.php - View/manage all community card orders
require_once '../config.php';
require_once '../stripe_config.php';
require_once 'campaign_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();

try {
    $db = getDB();
    $message = '';
    $messageType = '';

    // Handle actions
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';

        if ($action === 'approve_content') {
            $db->prepare("UPDATE " . getTable('card_ad_content') . " SET admin_approved = 1 WHERE order_id = ?")
               ->execute([(int)$_POST['order_id']]);
            $message = 'Ad content approved.';
            $messageType = 'success';
        }

        if ($action === 'save_notes') {
            $db->prepare("UPDATE " . getTable('card_ad_content') . " SET admin_notes = ? WHERE order_id = ?")
               ->execute([sanitizeInput($_POST['admin_notes']), (int)$_POST['order_id']]);
            $message = 'Notes saved.';
            $messageType = 'success';
        }

        if ($action === 'approve_refund') {
            $orderId = (int)$_POST['order_id'];
            $order = $db->prepare("SELECT * FROM " . getTable('card_orders') . " WHERE id = ? AND status = 'refund_requested'");
            $order->execute([$orderId]);
            $order = $order->fetch(PDO::FETCH_ASSOC);

            if ($order && $order['stripe_payment_intent_id']) {
                try {
                    issueRefund($order['stripe_payment_intent_id']);
                    $db->prepare("UPDATE " . getTable('card_orders') . " SET status = 'refunded', refunded_at = NOW() WHERE id = ?")
                       ->execute([$orderId]);

                    // Notify buyer
                    $buyer = $db->prepare("SELECT email, first_name FROM " . getTable('users') . " WHERE id = ?")->execute([$order['user_id']]);
                    $buyer = $db->prepare("SELECT email, first_name FROM " . getTable('users') . " WHERE id = ?");
                    $buyer->execute([$order['user_id']]);
                    $buyer = $buyer->fetch(PDO::FETCH_ASSOC);
                    if ($buyer) {
                        $body = "Hi " . $buyer['first_name'] . ",\n\nYour refund of $" . number_format($order['amount_cents'] / 100, 2) . " has been approved and processed.\n\nIt may take 5-10 business days to appear on your statement.\n\nThank you,\n" . SITE_NAME;
                        sendSecureEmail($buyer['email'], 'Your Neighborhood Card Refund Has Been Processed', $body);
                        $db->prepare("INSERT INTO " . getTable('card_notifications') . " (order_id, card_id, user_id, notification_type) VALUES (?, ?, ?, 'refund_approved')")
                           ->execute([$orderId, $order['card_id'], $order['user_id']]);
                    }

                    $message = 'Refund processed successfully.';
                    $messageType = 'success';
                } catch (Exception $e) {
                    $message = 'Stripe refund failed: ' . $e->getMessage();
                    $messageType = 'danger';
                }
            } else {
                $message = 'Order not found or not in refund_requested state.';
                $messageType = 'danger';
            }
        }

        if ($action === 'cancel_order') {
            $db->prepare("UPDATE " . getTable('card_orders') . " SET status = 'cancelled' WHERE id = ? AND status = 'pending'")
               ->execute([(int)$_POST['order_id']]);
            $message = 'Order cancelled.';
            $messageType = 'success';
        }
    }

    // Filters — default purchase status to "paid"
    $filterCard = isset($_GET['card_id']) ? (int)$_GET['card_id'] : null;
    $filterStatus = $_GET['status'] ?? (isset($_GET['card_id']) || isset($_GET['card_status']) ? '' : 'paid');
    $filterCardStatus = $_GET['card_status'] ?? '';

    $where = "1=1";
    $params = [];
    if ($filterCard) { $where .= " AND o.card_id = ?"; $params[] = $filterCard; }
    if ($filterStatus) { $where .= " AND o.status = ?"; $params[] = $filterStatus; }
    if ($filterCardStatus) { $where .= " AND c.status = ?"; $params[] = $filterCardStatus; }

    // Card status label mapping
    $cardStatusLabels = ['open' => 'Active', 'full' => 'Filled', 'printing' => 'In Production', 'shipped' => 'Complete'];

    $orders = $db->prepare("
        SELECT o.*, c.neighborhood_name, c.print_deadline, c.slug as card_slug, c.status as card_status,
               st.display_name as spot_name, st.dimensions, st.spots_used,
               u.email, u.first_name, u.last_name, u.phone as user_phone,
               ac.promo_text, ac.phone as ad_phone, ac.url as ad_url,
               ac.logo_filename, ac.logo_original_filename, ac.admin_approved, ac.admin_notes, ac.submitted_at,
               cc.name as category_name
        FROM " . getTable('card_orders') . " o
        JOIN " . getTable('cards') . " c ON c.id = o.card_id
        JOIN " . getTable('card_spot_types') . " st ON st.id = o.spot_type_id
        JOIN " . getTable('users') . " u ON u.id = o.user_id
        LEFT JOIN " . getTable('card_ad_content') . " ac ON ac.order_id = o.id
        LEFT JOIN " . getTable('card_categories') . " cc ON cc.id = o.card_category_id
        WHERE {$where}
        ORDER BY o.created_at DESC
    ");
    $orders->execute($params);
    $orders = $orders->fetchAll(PDO::FETCH_ASSOC);

    // Get cards for filter dropdown
    $allCards = $db->query("SELECT id, neighborhood_name FROM " . getTable('cards') . " ORDER BY display_order")->fetchAll(PDO::FETCH_ASSOC);

    // CSV Export
    if (isset($_GET['export']) && $_GET['export'] === 'csv') {
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="card_orders_' . date('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['Order ID','Card','Category','Spot Type','Dimensions','Buyer Name','Email','Phone','Amount','Card Status','Purchase Status','Promo Text','Ad Phone','Ad URL','Logo File','Approved','Created']);
        foreach ($orders as $o) {
            fputcsv($out, [
                $o['id'], $o['neighborhood_name'], $o['category_name'] ?? '', $o['spot_name'], $o['dimensions'],
                $o['first_name'] . ' ' . $o['last_name'], $o['email'], $o['user_phone'],
                '$' . number_format($o['amount_cents'] / 100, 2),
                $cardStatusLabels[$o['card_status']] ?? ucfirst($o['card_status']),
                $o['status'],
                $o['promo_text'], $o['ad_phone'], $o['ad_url'],
                $o['logo_original_filename'], $o['admin_approved'] ? 'Yes' : 'No',
                $o['created_at']
            ]);
        }
        fclose($out);
        exit;
    }

} catch (Exception $e) {
    $error_message = "Error: " . $e->getMessage();
    error_log("Card orders error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Card Orders | <?= SITE_NAME ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; }
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem 20px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .page-title { font-size: 1.75rem; font-weight: 800; color: #1e293b; }
        .btn { padding: 0.6rem 1.2rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s; border: none; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-success { background: #10b981; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-secondary { background: #64748b; color: white; }
        .btn-warning { background: #f59e0b; color: white; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
        .btn-sm { padding: 0.35rem 0.7rem; font-size: 0.78rem; }
        .alert { padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
        .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; margin-bottom: 1.5rem; overflow: hidden; }
        .card-header { background: #f8fafc; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; font-weight: 700; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
        .filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 1.5rem; }
        .filters select { padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-family: inherit; font-size: 0.9rem; }
        .filters select:focus { outline: none; border-color: #38b6ff; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 0.88rem; }
        th { background: #f8fafc; font-weight: 600; color: #374151; font-size: 0.8rem; text-transform: uppercase; }
        tr:hover { background: #f9fafb; }
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-paid { background: #dcfce7; color: #166534; }
        .status-refund_requested { background: #fee2e2; color: #991b1b; }
        .status-refunded { background: #e5e7eb; color: #374151; }
        .status-cancelled { background: #f1f5f9; color: #64748b; }
        .card-status-open { background: #dcfce7; color: #166534; }
        .card-status-full { background: #fef3c7; color: #92400e; }
        .card-status-printing { background: #dbeafe; color: #1e40af; }
        .card-status-shipped { background: #e5e7eb; color: #374151; }
        .content-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
        .content-submitted { background: #dbeafe; color: #1e40af; }
        .content-approved { background: #dcfce7; color: #166534; }
        .content-missing { background: #fef3c7; color: #92400e; }
        .detail-row { background: #f8fafc; }
        .detail-content { padding: 1rem 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.88rem; }
        .detail-content dt { font-weight: 600; color: #374151; }
        .detail-content dd { color: #64748b; margin-bottom: 8px; }
        .action-btns { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        @media (max-width: 768px) {
            th, td { padding: 0.5rem; font-size: 0.8rem; }
            .detail-content { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'cards'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="page-header">
            <h1 class="page-title">Card Orders</h1>
            <div>
                <a href="manage_cards.php" class="btn btn-secondary">Back to Cards</a>
                <a href="?<?= http_build_query(array_merge($_GET, ['export' => 'csv'])) ?>" class="btn btn-primary">Export CSV</a>
            </div>
        </div>

        <?php if (!empty($message)): ?>
            <div class="alert alert-<?= $messageType ?>"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>
        <?php if (isset($error_message)): ?>
            <div class="alert alert-danger"><?= htmlspecialchars($error_message) ?></div>
        <?php endif; ?>

        <form class="filters" method="GET">
            <select name="card_id" onchange="this.form.submit()">
                <option value="">All Neighborhoods</option>
                <?php foreach ($allCards as $c): ?>
                    <option value="<?= $c['id'] ?>" <?= $filterCard == $c['id'] ? 'selected' : '' ?>><?= htmlspecialchars($c['neighborhood_name']) ?></option>
                <?php endforeach; ?>
            </select>
            <select name="card_status" onchange="this.form.submit()">
                <option value="">All Card Statuses</option>
                <option value="open" <?= $filterCardStatus === 'open' ? 'selected' : '' ?>>Active</option>
                <option value="full" <?= $filterCardStatus === 'full' ? 'selected' : '' ?>>Filled</option>
                <option value="printing" <?= $filterCardStatus === 'printing' ? 'selected' : '' ?>>In Production</option>
                <option value="shipped" <?= $filterCardStatus === 'shipped' ? 'selected' : '' ?>>Complete</option>
            </select>
            <select name="status" onchange="this.form.submit()">
                <option value="">All Purchase Statuses</option>
                <option value="paid" <?= $filterStatus === 'paid' ? 'selected' : '' ?>>Paid</option>
                <option value="pending" <?= $filterStatus === 'pending' ? 'selected' : '' ?>>Pending</option>
                <option value="refund_requested" <?= $filterStatus === 'refund_requested' ? 'selected' : '' ?>>Refund Requested</option>
                <option value="refunded" <?= $filterStatus === 'refunded' ? 'selected' : '' ?>>Refunded</option>
                <option value="cancelled" <?= $filterStatus === 'cancelled' ? 'selected' : '' ?>>Cancelled</option>
            </select>
            <span style="color: #64748b; font-size: 0.88rem;"><?= count($orders) ?> order(s)</span>
        </form>

        <div class="card">
            <?php if (empty($orders)): ?>
                <div style="text-align: center; padding: 3rem; color: #64748b;">No orders found.</div>
            <?php else: ?>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Card</th>
                                <th>Buyer</th>
                                <th>Spot</th>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>Ad Content</th>
                                <th>Card Status</th>
                                <th>Purchase Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($orders as $o): ?>
                            <tr>
                                <td>#<?= $o['id'] ?></td>
                                <td><?= htmlspecialchars($o['neighborhood_name']) ?></td>
                                <td>
                                    <strong><?= htmlspecialchars($o['first_name'] . ' ' . $o['last_name']) ?></strong>
                                    <br><small><?= htmlspecialchars($o['email']) ?></small>
                                </td>
                                <td><?= htmlspecialchars($o['spot_name']) ?><br><small><?= $o['dimensions'] ?></small></td>
                                <td><?= htmlspecialchars($o['category_name'] ?? '—') ?></td>
                                <td>$<?= number_format($o['amount_cents'] / 100, 2) ?></td>
                                <td>
                                    <?php if ($o['submitted_at']): ?>
                                        <?php if ($o['admin_approved']): ?>
                                            <span class="content-badge content-approved">Approved</span>
                                        <?php else: ?>
                                            <span class="content-badge content-submitted">Submitted</span>
                                        <?php endif; ?>
                                    <?php else: ?>
                                        <span class="content-badge content-missing">Missing</span>
                                    <?php endif; ?>
                                </td>
                                <td><span class="status-badge card-status-<?= $o['card_status'] ?>"><?= $cardStatusLabels[$o['card_status']] ?? ucfirst($o['card_status']) ?></span></td>
                                <td><span class="status-badge status-<?= $o['status'] ?>"><?= ucfirst(str_replace('_', ' ', $o['status'])) ?></span></td>
                                <td><?= date('M j, Y', strtotime($o['created_at'])) ?></td>
                                <td>
                                    <div class="action-btns">
                                        <button class="btn btn-secondary btn-sm" onclick="toggleDetail(<?= $o['id'] ?>)">View</button>
                                        <?php if ($o['submitted_at'] && !$o['admin_approved']): ?>
                                            <form method="POST" style="display:inline;">
                                                <input type="hidden" name="action" value="approve_content">
                                                <input type="hidden" name="order_id" value="<?= $o['id'] ?>">
                                                <button class="btn btn-success btn-sm" type="submit">Approve</button>
                                            </form>
                                        <?php endif; ?>
                                        <?php if ($o['status'] === 'refund_requested'): ?>
                                            <form method="POST" style="display:inline;" onsubmit="return confirm('Process refund of $<?= number_format($o['amount_cents'] / 100, 2) ?>?');">
                                                <input type="hidden" name="action" value="approve_refund">
                                                <input type="hidden" name="order_id" value="<?= $o['id'] ?>">
                                                <button class="btn btn-danger btn-sm" type="submit">Refund</button>
                                            </form>
                                        <?php endif; ?>
                                        <?php if ($o['status'] === 'pending'): ?>
                                            <form method="POST" style="display:inline;" onsubmit="return confirm('Cancel this pending order?');">
                                                <input type="hidden" name="action" value="cancel_order">
                                                <input type="hidden" name="order_id" value="<?= $o['id'] ?>">
                                                <button class="btn btn-warning btn-sm" type="submit">Cancel</button>
                                            </form>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            </tr>
                            <tr class="detail-row" id="detail-<?= $o['id'] ?>" style="display: none;">
                                <td colspan="9">
                                    <div class="detail-content">
                                        <dl>
                                            <dt>Promo Text</dt>
                                            <dd><?= htmlspecialchars($o['promo_text'] ?: '—') ?></dd>
                                            <dt>Ad Phone</dt>
                                            <dd><?= htmlspecialchars($o['ad_phone'] ?: '—') ?></dd>
                                            <dt>Ad URL</dt>
                                            <dd><?= $o['ad_url'] ? '<a href="' . htmlspecialchars($o['ad_url']) . '" target="_blank">' . htmlspecialchars($o['ad_url']) . '</a>' : '—' ?></dd>
                                            <dt>Logo File</dt>
                                            <dd>
                                                <?php if ($o['logo_filename']): ?>
                                                    <?= htmlspecialchars($o['logo_original_filename']) ?>
                                                    <br><a href="<?= SITE_URL ?>/uploads/card_ads/<?= htmlspecialchars($o['logo_filename']) ?>" target="_blank">View</a>
                                                <?php else: ?>
                                                    —
                                                <?php endif; ?>
                                            </dd>
                                        </dl>
                                        <dl>
                                            <dt>Stripe Session</dt>
                                            <dd><small><?= htmlspecialchars($o['stripe_checkout_session_id'] ?: '—') ?></small></dd>
                                            <dt>Payment Intent</dt>
                                            <dd><small><?= htmlspecialchars($o['stripe_payment_intent_id'] ?: '—') ?></small></dd>
                                            <dt>Deadline</dt>
                                            <dd><?= date('M j, Y', strtotime($o['print_deadline'])) ?></dd>
                                            <dt>Admin Notes</dt>
                                            <dd>
                                                <form method="POST" style="display: flex; gap: 6px;">
                                                    <input type="hidden" name="action" value="save_notes">
                                                    <input type="hidden" name="order_id" value="<?= $o['id'] ?>">
                                                    <input type="text" name="admin_notes" value="<?= htmlspecialchars($o['admin_notes'] ?? '') ?>" style="flex:1; padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 0.85rem;">
                                                    <button class="btn btn-secondary btn-sm" type="submit">Save</button>
                                                </form>
                                            </dd>
                                        </dl>
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

    <script>
    function toggleDetail(id) {
        var row = document.getElementById('detail-' + id);
        row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    }
    </script>
</body>
</html>
