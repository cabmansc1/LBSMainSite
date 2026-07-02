<?php
/**
 * One-time setup script: Creates community card tables and seeds spot types.
 * Run once, then delete or restrict access.
 */
require_once '../config.php';
require_once 'campaign_functions.php';
requireCampaignAdminLogin();

$db = getDB();
$messages = [];

try {
    // 1. Cards table
    $db->exec("
        CREATE TABLE IF NOT EXISTS " . getTable('cards') . " (
            id INT AUTO_INCREMENT PRIMARY KEY,
            neighborhood_name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            households INT NOT NULL DEFAULT 2500,
            total_spots DECIMAL(4,1) NOT NULL DEFAULT 16.0,
            max_coupons INT NOT NULL DEFAULT 2,
            print_deadline DATE NOT NULL,
            ship_date DATE DEFAULT NULL,
            status ENUM('open','full','printing','shipped') NOT NULL DEFAULT 'open',
            display_order INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_slug (slug)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $messages[] = 'Created directory_cards table.';

    // 2. Spot types reference table
    $db->exec("
        CREATE TABLE IF NOT EXISTS " . getTable('card_spot_types') . " (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            display_name VARCHAR(100) NOT NULL,
            dimensions VARCHAR(50) NOT NULL,
            price_cents INT NOT NULL,
            spots_used DECIMAL(3,1) NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            display_order INT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $messages[] = 'Created directory_card_spot_types table.';

    // Seed spot types if empty
    $count = (int)$db->query("SELECT COUNT(*) FROM " . getTable('card_spot_types'))->fetchColumn();
    if ($count === 0) {
        $types = [
            ['coupon',    'Coupon',       '2.8" x 1.2"',  7900,  0.5, 1],
            ['single',    'Single',       '2.8" x 2.5"',  12900, 1.0, 2],
            ['double',    'Double',       '5.8" x 2.5"',  23900, 2.0, 3],
            ['triple',    'Triple',       '8.7" x 2.5"',  34900, 3.0, 4],
            ['quad_wide', 'Quad (Wide)',  '11.7" x 2.5"', 45900, 4.0, 5],
            ['quad_tall', 'Quad (Tall)',  '5.8" x 6.3"',  45900, 4.0, 6],
        ];
        $stmt = $db->prepare("INSERT INTO " . getTable('card_spot_types') . " (name, display_name, dimensions, price_cents, spots_used, display_order) VALUES (?, ?, ?, ?, ?, ?)");
        foreach ($types as $t) {
            $stmt->execute($t);
        }
        $messages[] = 'Seeded 6 spot types.';
    } else {
        $messages[] = 'Spot types already seeded (' . $count . ' rows).';
    }

    // 3. Orders table
    $db->exec("
        CREATE TABLE IF NOT EXISTS " . getTable('card_orders') . " (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_id INT NOT NULL,
            user_id INT NOT NULL,
            spot_type_id INT NOT NULL,
            stripe_payment_intent_id VARCHAR(255) DEFAULT NULL,
            stripe_checkout_session_id VARCHAR(255) DEFAULT NULL,
            amount_cents INT NOT NULL,
            status ENUM('pending','paid','refund_requested','refunded','cancelled') NOT NULL DEFAULT 'pending',
            refund_requested_at DATETIME DEFAULT NULL,
            refunded_at DATETIME DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_card (card_id),
            INDEX idx_user (user_id),
            INDEX idx_status (status),
            INDEX idx_stripe_session (stripe_checkout_session_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $messages[] = 'Created directory_card_orders table.';

    // 4. Ad content table
    $db->exec("
        CREATE TABLE IF NOT EXISTS " . getTable('card_ad_content') . " (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL UNIQUE,
            logo_filename VARCHAR(255) DEFAULT NULL,
            logo_original_filename VARCHAR(255) DEFAULT NULL,
            promo_text VARCHAR(100) DEFAULT NULL,
            phone VARCHAR(30) DEFAULT NULL,
            url VARCHAR(500) DEFAULT NULL,
            admin_approved TINYINT(1) NOT NULL DEFAULT 0,
            admin_notes TEXT DEFAULT NULL,
            submitted_at DATETIME DEFAULT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_order (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $messages[] = 'Created directory_card_ad_content table.';

    // 5. Buyer notifications tracking
    $db->exec("
        CREATE TABLE IF NOT EXISTS " . getTable('card_notifications') . " (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT DEFAULT NULL,
            card_id INT DEFAULT NULL,
            user_id INT DEFAULT NULL,
            notification_type ENUM('purchase_confirm','deadline_warning','deadline_final','card_shipped','refund_approved') NOT NULL,
            sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_order (order_id),
            INDEX idx_user_type (user_id, notification_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $messages[] = 'Created directory_card_notifications table.';

    // 6. Admin notifications
    $db->exec("
        CREATE TABLE IF NOT EXISTS " . getTable('card_admin_notifications') . " (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type ENUM('new_purchase','refund_request','deadline_approaching','card_full') NOT NULL,
            message TEXT NOT NULL,
            related_card_id INT DEFAULT NULL,
            related_order_id INT DEFAULT NULL,
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_unread (is_read, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $messages[] = 'Created directory_card_admin_notifications table.';

    // 7. Card categories (exclusivity list)
    $db->exec("
        CREATE TABLE IF NOT EXISTS " . getTable('card_categories') . " (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            display_order INT NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $messages[] = 'Created directory_card_categories table.';

    // Seed default card categories if empty
    $count = (int)$db->query("SELECT COUNT(*) FROM " . getTable('card_categories'))->fetchColumn();
    if ($count === 0) {
        $defaults = [
            'HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Landscaping', 'Pest Control',
            'Pizza', 'Mexican Restaurant', 'Seafood Restaurant', 'BBQ Restaurant',
            'Hair Salon', 'Barber Shop', 'Nail Salon', 'Med Spa',
            'Dentist', 'Chiropractor', 'Physical Therapy',
            'Auto Repair', 'Auto Detailing',
            'Real Estate Agent', 'Mortgage Lender', 'Insurance',
            'Attorney', 'CPA / Accountant',
            'Gym / Fitness', 'Martial Arts', 'Yoga Studio',
            'Pet Grooming', 'Veterinarian',
            'House Cleaning', 'Pressure Washing', 'Handyman',
        ];
        $stmt = $db->prepare("INSERT INTO " . getTable('card_categories') . " (name, display_order) VALUES (?, ?)");
        foreach ($defaults as $i => $name) {
            $stmt->execute([$name, $i + 1]);
        }
        $messages[] = 'Seeded ' . count($defaults) . ' card categories.';
    }

    // Add card_category_id column to orders table if missing
    try {
        $db->exec("ALTER TABLE " . getTable('card_orders') . " ADD COLUMN card_category_id INT DEFAULT NULL AFTER spot_type_id");
        $db->exec("ALTER TABLE " . getTable('card_orders') . " ADD INDEX idx_card_category (card_id, card_category_id)");
        $messages[] = 'Added card_category_id column to orders table.';
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            $messages[] = 'card_category_id column already exists.';
        } else {
            $messages[] = 'Note: ' . $e->getMessage();
        }
    }

    // Add col_span/row_span to spot types if missing
    try {
        $db->exec("ALTER TABLE " . getTable('card_spot_types') . " ADD COLUMN col_span INT NOT NULL DEFAULT 1 AFTER spots_used");
        $db->exec("ALTER TABLE " . getTable('card_spot_types') . " ADD COLUMN row_span INT NOT NULL DEFAULT 1 AFTER col_span");
        $db->exec("UPDATE " . getTable('card_spot_types') . " SET col_span=2, row_span=1 WHERE name='double'");
        $db->exec("UPDATE " . getTable('card_spot_types') . " SET col_span=3, row_span=1 WHERE name='triple'");
        $db->exec("UPDATE " . getTable('card_spot_types') . " SET col_span=4, row_span=1 WHERE name='quad_wide'");
        $db->exec("UPDATE " . getTable('card_spot_types') . " SET col_span=2, row_span=2 WHERE name='quad_tall'");
        $messages[] = 'Added col_span/row_span columns to spot types.';
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            $messages[] = 'col_span/row_span columns already exist on spot types.';
        } else {
            $messages[] = 'Note: ' . $e->getMessage();
        }
    }

    // 8. Card positions table (visual spot grid)
    $db->exec("
        CREATE TABLE IF NOT EXISTS " . getTable('card_positions') . " (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_id INT NOT NULL,
            label VARCHAR(10) NOT NULL,
            side ENUM('front','back') NOT NULL,
            spot_type_id INT NOT NULL,
            grid_row INT NOT NULL,
            grid_col INT NOT NULL,
            row_span INT NOT NULL DEFAULT 1,
            col_span INT NOT NULL DEFAULT 1,
            display_order INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_card (card_id),
            INDEX idx_card_side (card_id, side),
            UNIQUE KEY uk_card_label (card_id, label)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $messages[] = 'Created directory_card_positions table.';

    // 9. Per-card spot pricing table
    $db->exec("
        CREATE TABLE IF NOT EXISTS " . getTable('card_spot_prices') . " (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_id INT NOT NULL,
            spot_type_id INT NOT NULL,
            price_cents INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_card_spot (card_id, spot_type_id),
            INDEX idx_card (card_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $messages[] = 'Created directory_card_spot_prices table.';

    // Backfill pricing for existing cards that don't have per-card prices yet
    $existingCards = $db->query("SELECT id, households FROM " . getTable('cards'))->fetchAll(PDO::FETCH_ASSOC);
    $backfilled = 0;
    foreach ($existingCards as $ec) {
        $chk = $db->prepare("SELECT COUNT(*) FROM " . getTable('card_spot_prices') . " WHERE card_id = ?");
        $chk->execute([(int)$ec['id']]);
        if ((int)$chk->fetchColumn() === 0) {
            syncCardPricing((int)$ec['id'], (int)$ec['households']);
            $backfilled++;
        }
    }
    if ($backfilled > 0) {
        $messages[] = "Backfilled pricing for {$backfilled} existing card(s).";
    }

    // 10. Neighborhood suggestions table
    $db->exec("
        CREATE TABLE IF NOT EXISTS " . getTable('card_suggestions') . " (
            id INT AUTO_INCREMENT PRIMARY KEY,
            neighborhood_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(50) DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            ip_address VARCHAR(45) DEFAULT NULL,
            status ENUM('new','reviewed','added','dismissed') NOT NULL DEFAULT 'new',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $messages[] = 'Created directory_card_suggestions table.';

    // Add position_id column to orders table if missing
    try {
        $db->exec("ALTER TABLE " . getTable('card_orders') . " ADD COLUMN position_id INT DEFAULT NULL AFTER card_category_id");
        $db->exec("ALTER TABLE " . getTable('card_orders') . " ADD INDEX idx_position (position_id)");
        $messages[] = 'Added position_id column to orders table.';
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            $messages[] = 'position_id column already exists.';
        } else {
            $messages[] = 'Note: ' . $e->getMessage();
        }
    }

} catch (Exception $e) {
    $messages[] = 'ERROR: ' . $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Setup Neighborhood Card Tables</title>
    <style>
        body { font-family: 'Inter', sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; }
        .msg { padding: 12px 16px; margin: 8px 0; border-radius: 8px; background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .msg.error { background: #fee2e2; border-color: #ef4444; color: #991b1b; }
        a { color: #38b6ff; }
    </style>
</head>
<body>
    <h1>Neighborhood Card Tables Setup</h1>
    <?php foreach ($messages as $m): ?>
        <div class="msg <?= strpos($m, 'ERROR') === 0 ? 'error' : '' ?>"><?= htmlspecialchars($m) ?></div>
    <?php endforeach; ?>
    <p style="margin-top: 20px;"><a href="manage_cards.php">Go to Manage Cards &rarr;</a></p>
</body>
</html>
