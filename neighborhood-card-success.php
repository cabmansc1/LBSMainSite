<?php
/**
 * community-card-success.php - Stripe success URL
 * Verifies payment, updates order, logs in user, redirects to ad content form.
 */
require_once 'config.php';
require_once 'stripe_config.php';
require_once 'User.php';

$sessionId = $_GET['session_id'] ?? '';
if (!$sessionId) {
    header('Location: /neighborhood-cards/');
    exit;
}

try {
    $db = getDB();

    // Verify Stripe session
    $session = getStripeSession($sessionId);

    if ($session->payment_status !== 'paid') {
        header('Location: /neighborhood-cards/?error=payment_incomplete');
        exit;
    }

    // Find the order
    $stmt = $db->prepare("
        SELECT o.*, c.neighborhood_name, c.slug, c.print_deadline, st.display_name as spot_name, st.price_cents
        FROM " . getTable('card_orders') . " o
        JOIN " . getTable('cards') . " c ON c.id = o.card_id
        JOIN " . getTable('card_spot_types') . " st ON st.id = o.spot_type_id
        WHERE o.stripe_checkout_session_id = ?
    ");
    $stmt->execute([$sessionId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        die('Order not found.');
    }

    // Update order to paid (if not already done by webhook)
    if ($order['status'] === 'pending') {
        $paymentIntentId = $session->payment_intent;
        $db->prepare("
            UPDATE " . getTable('card_orders') . "
            SET status = 'paid', stripe_payment_intent_id = ?
            WHERE id = ? AND status = 'pending'
        ")->execute([$paymentIntentId, $order['id']]);

        // Admin notification
        $msg = 'New community card purchase: ' . $order['spot_name'] . ' on ' . $order['neighborhood_name'] . ' ($' . number_format($order['price_cents'] / 100, 2) . ')';
        $db->prepare("INSERT INTO " . getTable('card_admin_notifications') . " (type, message, related_card_id, related_order_id) VALUES ('new_purchase', ?, ?, ?)")
           ->execute([$msg, $order['card_id'], $order['id']]);

        logActivity('card_payment_confirmed', ['order_id' => $order['id']]);
    }

    // Log the user in if not already
    if (!isLoggedIn()) {
        $user = $db->prepare("SELECT * FROM " . getTable('users') . " WHERE id = ? AND is_active = 1");
        $user->execute([$order['user_id']]);
        $user = $user->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
            $_SESSION['last_activity'] = time();
        }
    }

    // Send purchase confirmation email
    $buyerEmail = $db->prepare("SELECT email, first_name FROM " . getTable('users') . " WHERE id = ?");
    $buyerEmail->execute([$order['user_id']]);
    $buyer = $buyerEmail->fetch(PDO::FETCH_ASSOC);

    if ($buyer) {
        // Check if we already sent this notification
        $alreadySent = $db->prepare("SELECT id FROM " . getTable('card_notifications') . " WHERE order_id = ? AND notification_type = 'purchase_confirm'");
        $alreadySent->execute([$order['id']]);
        if (!$alreadySent->fetch()) {
            $body = "Hi " . $buyer['first_name'] . ",\n\n";
            $body .= "Thank you for purchasing a " . $order['spot_name'] . " ad spot on the " . $order['neighborhood_name'] . " Community Card!\n\n";
            $body .= "Amount: $" . number_format($order['price_cents'] / 100, 2) . "\n";
            $body .= "Print Deadline: " . date('M j, Y', strtotime($order['print_deadline'] ?? '')) . "\n\n";
            $body .= "Next step: Submit your ad content (logo, promo text, phone, URL) from your dashboard:\n";
            $body .= SITE_URL . "/my-cards.php\n\n";
            $body .= "Please submit your ad content at least 2 days before the deadline.\n\n";
            $body .= "Thank you,\n" . SITE_NAME;

            sendSecureEmail($buyer['email'], 'Community Card Purchase Confirmation - ' . $order['neighborhood_name'], $body);

            $db->prepare("INSERT INTO " . getTable('card_notifications') . " (order_id, card_id, user_id, notification_type) VALUES (?, ?, ?, 'purchase_confirm')")
               ->execute([$order['id'], $order['card_id'], $order['user_id']]);
        }
    }

    // Also email admin
    $adminAmount = number_format($order['price_cents'] / 100, 2);
    sendSecureEmail(ADMIN_EMAIL, 'New Community Card Purchase', "Order #{$order['id']}: {$order['spot_name']} on {$order['neighborhood_name']} - \${$adminAmount}");

} catch (Exception $e) {
    error_log("Success page error: " . $e->getMessage());
}

$amountFormatted = number_format(($order['price_cents'] ?? 0) / 100, 2);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Purchase Confirmed - <?= SITE_NAME ?></title>
    <meta name="robots" content="noindex,nofollow">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #1e293b; min-height: 100vh; }
        .container { max-width: 600px; margin: 0 auto; padding: 60px 20px; text-align: center; }
        .checkmark { width: 80px; height: 80px; border-radius: 50%; background: #dcfce7; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px; }
        .checkmark svg { width: 40px; height: 40px; color: #22c55e; }
        h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 12px; }
        .subtitle { color: #64748b; font-size: 1.05rem; margin-bottom: 32px; line-height: 1.6; }
        .receipt { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: left; margin-bottom: 24px; }
        .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.92rem; }
        .receipt-row:last-child { border: none; }
        .receipt-label { color: #64748b; }
        .receipt-value { font-weight: 600; }
        .receipt-total { display: flex; justify-content: space-between; padding: 12px 0 0; margin-top: 8px; border-top: 2px solid #e2e8f0; font-size: 1.1rem; font-weight: 800; }
        .btn { display: inline-block; padding: 14px 32px; border-radius: 10px; font-size: 1rem; font-weight: 700; text-decoration: none; transition: all 0.2s; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(56,182,255,.35); }
        .btn-secondary { background: #f1f5f9; color: #334155; margin-left: 12px; }
        .actions { margin-top: 24px; }
        .note { margin-top: 24px; font-size: 0.88rem; color: #94a3b8; line-height: 1.5; }
    </style>
</head>
<body>
    <?php include 'nav.php'; ?>

    <div class="container">
        <div class="checkmark">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
        </div>

        <h1>Purchase Confirmed!</h1>
        <p class="subtitle">Your ad spot on the <?= htmlspecialchars($order['neighborhood_name'] ?? '') ?> Community Card has been reserved.</p>

        <div class="receipt">
            <div class="receipt-row">
                <span class="receipt-label">Card</span>
                <span class="receipt-value"><?= htmlspecialchars($order['neighborhood_name'] ?? '') ?></span>
            </div>
            <div class="receipt-row">
                <span class="receipt-label">Spot Size</span>
                <span class="receipt-value"><?= htmlspecialchars($order['spot_name'] ?? '') ?></span>
            </div>
            <div class="receipt-row">
                <span class="receipt-label">Order #</span>
                <span class="receipt-value"><?= $order['id'] ?? '' ?></span>
            </div>
            <div class="receipt-total">
                <span>Total Paid</span>
                <span>$<?= $amountFormatted ?></span>
            </div>
        </div>

        <div class="actions">
            <a href="my-cards.php" class="btn btn-primary">Submit Your Ad Content</a>
            <a href="/neighborhood-cards/" class="btn btn-secondary">Browse More Cards</a>
        </div>

        <p class="note">A confirmation email has been sent. You can upload your ad content (logo, promo text, phone, URL) from your dashboard. Please do so before the print deadline.</p>
    </div>
</body>
</html>
