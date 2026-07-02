<?php
/**
 * community-card-checkout.php - POST handler
 * Validates availability with DB lock, creates pending order, redirects to Stripe.
 */
require_once 'config.php';
require_once 'stripe_config.php';
require_once 'User.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /neighborhood-cards/');
    exit;
}

// CSRF check
if (!validateCSRFToken($_POST['csrf_token'] ?? '')) {
    die('Invalid request. Please go back and try again.');
}

$cardId = (int)($_POST['card_id'] ?? 0);
$spotTypeId = (int)($_POST['spot_type_id'] ?? 0);
$categoryId = (int)($_POST['card_category_id'] ?? 0);
$positionId = (int)($_POST['position_id'] ?? 0); // 0 = legacy flow (no position)

if (!$cardId || !$spotTypeId || !$categoryId) {
    die('Missing required fields. Please select a spot size and business category.');
}

try {
    $db = getDB();

    // Determine user
    $userId = null;
    $email = '';

    if (isLoggedIn()) {
        $user = getCurrentUser();
        $userId = $user['id'];
        $email = $user['email'];
    } else {
        $email = sanitizeEmail($_POST['email'] ?? '');
        $firstName = sanitizeInput($_POST['first_name'] ?? '');
        $lastName = sanitizeInput($_POST['last_name'] ?? '');
        $phone = sanitizePhone($_POST['phone'] ?? '');

        if (!$email || !$firstName || !$lastName) {
            die('Email, first name, and last name are required.');
        }

        // A2P 10DLC: record consent state for audit trail (best-effort)
        require_once __DIR__ . '/includes/sms_consent_logger.php';
        logSmsConsent([
            'consent_given' => !empty($_POST['sms_consent']),
            'phone'         => $phone,
            'email'         => $email,
            'name'          => trim($firstName . ' ' . $lastName),
            'source_form'   => 'neighborhood-card-checkout',
        ]);

        // Create or get existing user
        $userObj = new User();
        $userId = $userObj->createAutoAccount($email, $firstName, $lastName, $phone ?: null);
    }

    // Release abandoned checkouts older than 5 minutes
    expireStalePendingOrders();

    // ── Transaction with FOR UPDATE lock to prevent overselling ──
    $db->beginTransaction();

    // Lock the card row
    $stmt = $db->prepare("SELECT * FROM " . getTable('cards') . " WHERE id = ? AND status = 'open' FOR UPDATE");
    $stmt->execute([$cardId]);
    $card = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$card) {
        $db->rollBack();
        die('This card is no longer available.');
    }

    // Check deadline
    if (strtotime($card['print_deadline']) < time()) {
        $db->rollBack();
        die('The deadline for this card has passed.');
    }

    // Get spot type
    $stmt = $db->prepare("SELECT * FROM " . getTable('card_spot_types') . " WHERE id = ? AND is_active = 1");
    $stmt->execute([$spotTypeId]);
    $spotType = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$spotType) {
        $db->rollBack();
        die('Invalid spot type.');
    }

    // Position validation (if position-based checkout)
    if ($positionId > 0) {
        // Verify position exists, belongs to this card, and matches spot type
        $stmt = $db->prepare("
            SELECT p.* FROM " . getTable('card_positions') . " p
            WHERE p.id = ? AND p.card_id = ?
        ");
        $stmt->execute([$positionId, $cardId]);
        $position = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$position) {
            $db->rollBack();
            die('Invalid spot position.');
        }

        if ((int)$position['spot_type_id'] !== $spotTypeId) {
            $db->rollBack();
            die('Spot type does not match the selected position.');
        }

        // Check position not already taken
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM " . getTable('card_orders') . "
            WHERE position_id = ? AND status IN ('pending','paid')
        ");
        $stmt->execute([$positionId]);
        if ((int)$stmt->fetchColumn() > 0) {
            $db->rollBack();
            die('This spot has already been claimed. Please choose a different spot.');
        }
    }

    // Calculate remaining spots (within transaction)
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(st.spots_used), 0) as used
        FROM " . getTable('card_orders') . " o
        JOIN " . getTable('card_spot_types') . " st ON st.id = o.spot_type_id
        WHERE o.card_id = ? AND o.status IN ('pending','paid')
    ");
    $stmt->execute([$cardId]);
    $used = (float)$stmt->fetch(PDO::FETCH_ASSOC)['used'];
    $remaining = (float)$card['total_spots'] - $used;

    if ($remaining < (float)$spotType['spots_used']) {
        $db->rollBack();
        die('Not enough spots remaining on this card. Please choose a smaller size.');
    }

    // Category exclusivity check
    $stmt = $db->prepare("
        SELECT COUNT(*) FROM " . getTable('card_orders') . "
        WHERE card_id = ? AND card_category_id = ? AND status IN ('pending','paid')
    ");
    $stmt->execute([$cardId, $categoryId]);
    if ((int)$stmt->fetchColumn() > 0) {
        $db->rollBack();
        // Get the category name for the error message
        $catName = $db->prepare("SELECT name FROM " . getTable('card_categories') . " WHERE id = ?");
        $catName->execute([$categoryId]);
        $catName = $catName->fetchColumn() ?: 'that category';
        die('Sorry, a "' . htmlspecialchars($catName) . '" business has already claimed a spot on this card. Each category is exclusive to one advertiser per card.');
    }

    // Verify category exists and is active
    $stmt = $db->prepare("SELECT id FROM " . getTable('card_categories') . " WHERE id = ? AND is_active = 1");
    $stmt->execute([$categoryId]);
    if (!$stmt->fetch()) {
        $db->rollBack();
        die('Invalid business category.');
    }

    // Coupon limit check
    if ($spotType['name'] === 'coupon') {
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM " . getTable('card_orders') . " o
            JOIN " . getTable('card_spot_types') . " st ON st.id = o.spot_type_id
            WHERE o.card_id = ? AND o.status IN ('pending','paid') AND st.name = 'coupon'
        ");
        $stmt->execute([$cardId]);
        if ((int)$stmt->fetchColumn() >= (int)$card['max_coupons']) {
            $db->rollBack();
            die('Maximum coupon spots reached for this card.');
        }
    }

    // Get per-card price (falls back to global if no override)
    $priceCents = getCardSpotPrice($cardId, $spotTypeId);

    // Create pending order
    $stmt = $db->prepare("
        INSERT INTO " . getTable('card_orders') . " (card_id, user_id, spot_type_id, card_category_id, position_id, amount_cents, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
    ");
    $stmt->execute([$cardId, $userId, $spotTypeId, $categoryId, $positionId ?: null, $priceCents]);
    $orderId = (int)$db->lastInsertId();

    // Create empty ad content row
    $db->prepare("INSERT INTO " . getTable('card_ad_content') . " (order_id) VALUES (?)")->execute([$orderId]);

    $db->commit();

    // Create Stripe Checkout Session
    $order = ['id' => $orderId, 'amount_cents' => $priceCents];
    $session = createCheckoutSession($order, $spotType, $card, $email);

    // Save session ID on the order
    $db->prepare("UPDATE " . getTable('card_orders') . " SET stripe_checkout_session_id = ? WHERE id = ?")
       ->execute([$session->id, $orderId]);

    logActivity('card_checkout_started', ['order_id' => $orderId, 'card_id' => $cardId, 'spot_type' => $spotType['name']]);

    // Redirect to Stripe
    header('Location: ' . $session->url);
    exit;

} catch (\Stripe\Exception\ApiErrorException $e) {
    error_log("Stripe error in checkout: " . $e->getMessage());
    die('Payment service error. Please try again.');
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Checkout error: " . $e->getMessage());
    die('An error occurred. Please try again.');
}
