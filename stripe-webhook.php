<?php
/**
 * stripe-webhook.php - Handles Stripe webhook events
 * Authoritative payment confirmation (handles browser-close edge case).
 */
require_once 'config.php';
require_once 'stripe_config.php';

// Read raw POST body
$payload = file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

try {
    $event = getStripeEvent($payload, $sigHeader);
} catch (\UnexpectedValueException $e) {
    http_response_code(400);
    exit('Invalid payload');
} catch (\Stripe\Exception\SignatureVerificationException $e) {
    http_response_code(400);
    exit('Invalid signature');
}

$db = getDB();

switch ($event->type) {
    case 'checkout.session.completed':
        $session = $event->data->object;
        $orderId = $session->metadata->order_id ?? null;

        if ($orderId && $session->payment_status === 'paid') {
            // Update order to paid
            $stmt = $db->prepare("
                UPDATE " . getTable('card_orders') . "
                SET status = 'paid', stripe_payment_intent_id = ?, stripe_checkout_session_id = ?
                WHERE id = ? AND status = 'pending'
            ");
            $stmt->execute([
                $session->payment_intent,
                $session->id,
                $orderId
            ]);

            if ($stmt->rowCount() > 0) {
                // Get order details for notification
                $order = $db->prepare("
                    SELECT o.*, c.neighborhood_name, st.display_name as spot_name
                    FROM " . getTable('card_orders') . " o
                    JOIN " . getTable('cards') . " c ON c.id = o.card_id
                    JOIN " . getTable('card_spot_types') . " st ON st.id = o.spot_type_id
                    WHERE o.id = ?
                ");
                $order->execute([$orderId]);
                $order = $order->fetch(PDO::FETCH_ASSOC);

                if ($order) {
                    // Admin notification
                    $msg = 'New purchase (webhook): ' . $order['spot_name'] . ' on ' . $order['neighborhood_name'] . ' ($' . number_format($order['amount_cents'] / 100, 2) . ')';
                    $db->prepare("INSERT INTO " . getTable('card_admin_notifications') . " (type, message, related_card_id, related_order_id) VALUES ('new_purchase', ?, ?, ?)")
                       ->execute([$msg, $order['card_id'], $order['id']]);
                }

                logActivity('webhook_payment_confirmed', ['order_id' => $orderId]);
            }
        }
        break;

    case 'charge.refunded':
        $charge = $event->data->object;
        $paymentIntentId = $charge->payment_intent;

        if ($paymentIntentId) {
            $stmt = $db->prepare("
                UPDATE " . getTable('card_orders') . "
                SET status = 'refunded', refunded_at = NOW()
                WHERE stripe_payment_intent_id = ? AND status IN ('paid', 'refund_requested')
            ");
            $stmt->execute([$paymentIntentId]);

            if ($stmt->rowCount() > 0) {
                logActivity('webhook_refund_confirmed', ['payment_intent' => $paymentIntentId]);
            }
        }
        break;
}

http_response_code(200);
echo json_encode(['status' => 'ok']);
