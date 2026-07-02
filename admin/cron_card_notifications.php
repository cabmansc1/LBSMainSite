<?php
/**
 * cron_card_notifications.php - Daily cron for deadline warning emails
 *
 * Sends warnings at 5 days and 2 days before print deadline.
 * Uses notification tracking table to avoid duplicates.
 *
 * Cron: 0 9 * * * /usr/local/bin/ea-php81 /home/cabmansc1/public_html/admin/cron_card_notifications.php
 */

// Allow CLI or admin-only
if (php_sapi_name() !== 'cli') {
    require_once 'campaign_functions.php';
    requireCampaignAdminLogin();
}

require_once dirname(__DIR__) . '/config.php';

try {
    $db = getDB();
    $now = new DateTime();
    $sent = 0;

    // Get all open cards with upcoming deadlines
    $cards = $db->query("
        SELECT * FROM " . getTable('cards') . "
        WHERE status = 'open' AND print_deadline >= CURDATE()
        ORDER BY print_deadline ASC
    ")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($cards as $card) {
        $deadline = new DateTime($card['print_deadline']);
        $daysLeft = (int)$now->diff($deadline)->format('%r%a');

        // Determine which notification to send
        $notificationType = null;
        if ($daysLeft === 5) {
            $notificationType = 'deadline_warning';
        } elseif ($daysLeft === 2) {
            $notificationType = 'deadline_final';
        }

        if (!$notificationType) continue;

        // Get all paid orders for this card
        $orders = $db->prepare("
            SELECT o.id as order_id, o.user_id, u.email, u.first_name,
                   ac.submitted_at
            FROM " . getTable('card_orders') . " o
            JOIN " . getTable('users') . " u ON u.id = o.user_id
            LEFT JOIN " . getTable('card_ad_content') . " ac ON ac.order_id = o.id
            WHERE o.card_id = ? AND o.status = 'paid'
        ");
        $orders->execute([$card['id']]);

        while ($order = $orders->fetch(PDO::FETCH_ASSOC)) {
            // Check if already sent
            $check = $db->prepare("
                SELECT id FROM " . getTable('card_notifications') . "
                WHERE order_id = ? AND notification_type = ?
            ");
            $check->execute([$order['order_id'], $notificationType]);
            if ($check->fetch()) continue;

            // Compose email
            $hasContent = !empty($order['submitted_at']);
            $subject = $notificationType === 'deadline_final'
                ? 'FINAL REMINDER: Ad content due in 2 days - ' . $card['neighborhood_name']
                : 'Reminder: Ad content due in 5 days - ' . $card['neighborhood_name'];

            $body = "Hi " . $order['first_name'] . ",\n\n";

            if ($notificationType === 'deadline_final') {
                $body .= "This is your FINAL reminder — the print deadline for the " . $card['neighborhood_name'] . " Neighborhood Card is in 2 days (" . $deadline->format('M j, Y') . ").\n\n";
                if (!$hasContent) {
                    $body .= "You have NOT yet submitted your ad content. Please do so immediately or your spot may go to print without your ad.\n\n";
                } else {
                    $body .= "Your ad content has been submitted. After today, you will no longer be able to make changes.\n\n";
                }
            } else {
                $body .= "The print deadline for the " . $card['neighborhood_name'] . " Neighborhood Card is in 5 days (" . $deadline->format('M j, Y') . ").\n\n";
                if (!$hasContent) {
                    $body .= "You haven't submitted your ad content yet. Please upload your logo and promo text as soon as possible.\n\n";
                } else {
                    $body .= "Your ad content is on file. You can still make changes for the next 3 days.\n\n";
                }
            }

            $body .= "Manage your ad: " . SITE_URL . "/my-cards.php\n\n";
            $body .= "Thank you,\n" . SITE_NAME;

            sendSecureEmail($order['email'], $subject, $body);

            // Track notification
            $db->prepare("INSERT INTO " . getTable('card_notifications') . " (order_id, card_id, user_id, notification_type) VALUES (?, ?, ?, ?)")
               ->execute([$order['order_id'], $card['id'], $order['user_id'], $notificationType]);

            $sent++;
        }

        // Admin notification for approaching deadline (5 days)
        if ($notificationType === 'deadline_warning') {
            $db->prepare("INSERT INTO " . getTable('card_admin_notifications') . " (type, message, related_card_id) VALUES ('deadline_approaching', ?, ?)")
               ->execute(["Deadline in 5 days: " . $card['neighborhood_name'], $card['id']]);
        }
    }

    $result = "Cron complete. Sent {$sent} notification(s).";
    if (php_sapi_name() === 'cli') {
        echo $result . "\n";
    } else {
        echo "<p>{$result}</p>";
    }

} catch (Exception $e) {
    $err = "Cron error: " . $e->getMessage();
    error_log($err);
    if (php_sapi_name() === 'cli') {
        echo $err . "\n";
        exit(1);
    }
}
