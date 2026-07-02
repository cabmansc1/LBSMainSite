<?php
// admin/pipeline_functions.php - Pipeline CRUD, stats, validation, advertiser profiles

require_once '../config.php';
require_once 'campaign_functions.php';

/**
 * Create pipeline tables if they don't exist
 */
function ensurePipelineTables() {
    $db = getDB();

    $db->exec("
        CREATE TABLE IF NOT EXISTS pipeline_cards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_name VARCHAR(255) NOT NULL,
            area VARCHAR(100) NOT NULL,
            mail_date DATE DEFAULT NULL,
            total_spots INT DEFAULT 8,
            status ENUM('filling','full','in_production','mailed') DEFAULT 'filling',
            notes TEXT,
            display_order INT DEFAULT 0,
            distribution INT DEFAULT 0,
            start_date DATE DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    // Add new columns to existing tables
    try {
        $db->exec("ALTER TABLE pipeline_cards ADD COLUMN distribution INT DEFAULT 0");
    } catch (PDOException $e) { /* column already exists */ }
    try {
        $db->exec("ALTER TABLE pipeline_cards ADD COLUMN start_date DATE DEFAULT NULL");
    } catch (PDOException $e) { /* column already exists */ }
    try {
        $db->exec("ALTER TABLE pipeline_cards ADD COLUMN production_cost DECIMAL(10,2) DEFAULT 0.00");
    } catch (PDOException $e) { /* column already exists */ }
    try {
        $db->exec("ALTER TABLE pipeline_cards ADD COLUMN postage_per_card DECIMAL(10,4) DEFAULT 0.0000");
    } catch (PDOException $e) { /* column already exists */ }
    try {
        $db->exec("ALTER TABLE pipeline_cards ADD COLUMN cards_mailed INT DEFAULT 0");
    } catch (PDOException $e) { /* column already exists */ }

    $db->exec("
        CREATE TABLE IF NOT EXISTS pipeline_advertisers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_id INT NOT NULL,
            business_name VARCHAR(255) NOT NULL,
            contact_name VARCHAR(255) DEFAULT '',
            phone VARCHAR(50) DEFAULT '',
            email VARCHAR(255) DEFAULT '',
            spots_purchased INT DEFAULT 1,
            price_per_spot DECIMAL(10,2) DEFAULT 0.00,
            total_amount DECIMAL(10,2) DEFAULT 0.00,
            payment_status ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
            amount_paid DECIMAL(10,2) DEFAULT 0.00,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (card_id) REFERENCES pipeline_cards(id) ON DELETE CASCADE
        )
    ");

    // Advertiser profiles table
    $db->exec("
        CREATE TABLE IF NOT EXISTS pipeline_advertiser_profiles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            business_name VARCHAR(255) NOT NULL,
            category VARCHAR(50) DEFAULT 'Other',
            contact_name VARCHAR(255) DEFAULT '',
            phone VARCHAR(50) DEFAULT '',
            email VARCHAR(255) DEFAULT '',
            cards_purchased INT DEFAULT 0,
            repeat_customer TINYINT(1) DEFAULT 0,
            lowcodeals_subscriber TINYINT(1) DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    // Add profile_id, ad_size, spots_consumed to pipeline_advertisers
    try {
        $db->exec("ALTER TABLE pipeline_advertisers ADD COLUMN profile_id INT DEFAULT NULL");
    } catch (PDOException $e) { /* column already exists */ }
    try {
        $db->exec("ALTER TABLE pipeline_advertisers ADD COLUMN ad_size ENUM('small','medium','large','custom') DEFAULT 'medium'");
    } catch (PDOException $e) {
        // Column exists, but may need 'custom' value added
        try {
            $db->exec("ALTER TABLE pipeline_advertisers MODIFY COLUMN ad_size ENUM('small','medium','large','custom') DEFAULT 'medium'");
        } catch (PDOException $e2) { /* ignore */ }
    }
    try {
        $db->exec("ALTER TABLE pipeline_advertisers ADD COLUMN spots_consumed DECIMAL(3,1) DEFAULT 1.0");
    } catch (PDOException $e) { /* column already exists */ }

    // Backfill existing rows: sync spots_consumed with spots_purchased where they differ
    try {
        $db->exec("UPDATE pipeline_advertisers SET spots_consumed = spots_purchased WHERE spots_consumed = 1.0 AND spots_purchased != 1");
    } catch (PDOException $e) { /* ignore */ }

    // Fix existing data: sync amount_paid with total_amount for advertisers marked as "paid" but with mismatched amounts
    try {
        $db->exec("UPDATE pipeline_advertisers SET amount_paid = total_amount WHERE payment_status = 'paid' AND amount_paid < total_amount");
    } catch (PDOException $e) { /* ignore */ }

    // Legacy cards base for transaction system backward compatibility
    try {
        $db->exec("ALTER TABLE pipeline_advertiser_profiles ADD COLUMN legacy_cards_base INT DEFAULT NULL");
    } catch (PDOException $e) { /* column already exists */ }

    // Advertiser transactions ledger
    $db->exec("
        CREATE TABLE IF NOT EXISTS pipeline_advertiser_transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            profile_id INT NOT NULL,
            type ENUM('purchase','payment') NOT NULL,
            cards INT DEFAULT 0,
            amount DECIMAL(10,2) DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (profile_id) REFERENCES pipeline_advertiser_profiles(id) ON DELETE CASCADE
        )
    ");
}

/**
 * Get preset advertiser categories
 */
function getAdvertiserCategories() {
    return [
        'Home Services', 'HVAC', 'Roofing', 'Plumbing', 'Electrical',
        'Restaurant', 'Retail', 'Auto Services', 'Landscaping', 'Cleaning',
        'Real Estate', 'Legal', 'Medical/Dental', 'Insurance', 'Financial',
        'Pet Services', 'Beauty/Salon', 'Fitness', 'Other'
    ];
}

/**
 * Map ad size to spots consumed
 */
function adSizeToSpots($size) {
    $map = ['small' => 0.5, 'medium' => 1.0, 'large' => 2.0];
    return $map[$size] ?? 1.0;  // 'custom' size uses spots_consumed directly
}

/**
 * Get all advertiser profiles with computed card balances
 */
function getAllAdvertiserProfiles($search = '', $category = '') {
    $db = getDB();

    $where = [];
    $params = [];

    if ($search !== '') {
        $where[] = "(p.business_name LIKE ? OR p.contact_name LIKE ? OR p.email LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    if ($category !== '') {
        $where[] = "p.category = ?";
        $params[] = $category;
    }

    $whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $db->prepare("
        SELECT p.*,
            COALESCE(SUM(c.distribution), 0) AS cards_assigned,
            p.cards_purchased - COALESCE(SUM(c.distribution), 0) AS cards_remaining
        FROM pipeline_advertiser_profiles p
        LEFT JOIN pipeline_advertisers a ON a.profile_id = p.id
        LEFT JOIN pipeline_cards c ON c.id = a.card_id
        $whereSQL
        GROUP BY p.id
        ORDER BY p.business_name ASC
    ");
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Get a single advertiser profile with computed balances
 */
function getAdvertiserProfile($id) {
    $db = getDB();

    $stmt = $db->prepare("
        SELECT p.*,
            COALESCE(SUM(c.distribution), 0) AS cards_assigned,
            p.cards_purchased - COALESCE(SUM(c.distribution), 0) AS cards_remaining
        FROM pipeline_advertiser_profiles p
        LEFT JOIN pipeline_advertisers a ON a.profile_id = p.id
        LEFT JOIN pipeline_cards c ON c.id = a.card_id
        WHERE p.id = ?
        GROUP BY p.id
    ");
    $stmt->execute([(int)$id]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * Create an advertiser profile
 */
function createAdvertiserProfile($data) {
    $db = getDB();

    $stmt = $db->prepare("
        INSERT INTO pipeline_advertiser_profiles (business_name, category, contact_name, phone, email, cards_purchased, repeat_customer, lowcodeals_subscriber, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $data['business_name'],
        $data['category'] ?? 'Other',
        $data['contact_name'] ?? '',
        $data['phone'] ?? '',
        $data['email'] ?? '',
        (int)($data['cards_purchased'] ?? 0),
        (int)($data['repeat_customer'] ?? 0),
        (int)($data['lowcodeals_subscriber'] ?? 0),
        $data['notes'] ?? ''
    ]);

    return $db->lastInsertId();
}

/**
 * Update an advertiser profile
 */
function updateAdvertiserProfile($id, $data) {
    $db = getDB();

    $stmt = $db->prepare("
        UPDATE pipeline_advertiser_profiles
        SET business_name = ?, category = ?, contact_name = ?, phone = ?, email = ?, cards_purchased = ?, repeat_customer = ?, lowcodeals_subscriber = ?, notes = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $data['business_name'],
        $data['category'] ?? 'Other',
        $data['contact_name'] ?? '',
        $data['phone'] ?? '',
        $data['email'] ?? '',
        (int)($data['cards_purchased'] ?? 0),
        (int)($data['repeat_customer'] ?? 0),
        (int)($data['lowcodeals_subscriber'] ?? 0),
        $data['notes'] ?? '',
        (int)$id
    ]);
}

/**
 * Delete an advertiser profile (block if active assignments exist)
 */
function deleteAdvertiserProfile($id) {
    $db = getDB();

    // Check for active assignments
    $stmt = $db->prepare("SELECT COUNT(*) FROM pipeline_advertisers WHERE profile_id = ?");
    $stmt->execute([(int)$id]);
    if ((int)$stmt->fetchColumn() > 0) {
        return false;
    }

    $stmt = $db->prepare("DELETE FROM pipeline_advertiser_profiles WHERE id = ?");
    return $stmt->execute([(int)$id]);
}

/**
 * Validate advertiser profile data
 */
function validateAdvertiserProfile($data) {
    $errors = [];
    if (empty($data['business_name'])) $errors[] = 'Business name is required.';
    if (isset($data['cards_purchased']) && (int)$data['cards_purchased'] < 0) $errors[] = 'Cards purchased cannot be negative.';
    return $errors;
}

/**
 * Search advertiser profiles (for AJAX typeahead)
 */
function searchAdvertiserProfiles($term) {
    $db = getDB();

    $stmt = $db->prepare("
        SELECT p.id, p.business_name, p.contact_name, p.phone, p.email, p.category,
            p.cards_purchased,
            COALESCE(SUM(c.distribution), 0) AS cards_assigned,
            p.cards_purchased - COALESCE(SUM(c.distribution), 0) AS cards_remaining
        FROM pipeline_advertiser_profiles p
        LEFT JOIN pipeline_advertisers a ON a.profile_id = p.id
        LEFT JOIN pipeline_cards c ON c.id = a.card_id
        WHERE p.business_name LIKE ? OR p.contact_name LIKE ?
        GROUP BY p.id
        ORDER BY p.business_name ASC
        LIMIT 10
    ");
    $stmt->execute(["%$term%", "%$term%"]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Get all card assignments for an advertiser profile
 */
function getAdvertiserCardAssignments($profileId) {
    $db = getDB();

    $stmt = $db->prepare("
        SELECT a.*, c.card_name, c.area, c.distribution, c.status AS card_status, c.mail_date
        FROM pipeline_advertisers a
        JOIN pipeline_cards c ON c.id = a.card_id
        WHERE a.profile_id = ?
        ORDER BY c.created_at DESC
    ");
    $stmt->execute([(int)$profileId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// ==========================================
// Advertiser Transactions
// ==========================================

/**
 * Add a transaction and recalculate the profile's cards_purchased
 */
function addAdvertiserTransaction($data) {
    $db = getDB();

    $profileId = (int)$data['profile_id'];
    $type = in_array($data['type'], ['purchase', 'payment']) ? $data['type'] : 'purchase';
    $cards = (int)($data['cards'] ?? 0);
    $amount = (float)($data['amount'] ?? 0);
    $notes = $data['notes'] ?? '';

    $stmt = $db->prepare("
        INSERT INTO pipeline_advertiser_transactions (profile_id, type, cards, amount, notes)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$profileId, $type, $cards, $amount, $notes]);
    $txnId = $db->lastInsertId();

    recalcProfileCards($profileId);

    return $txnId;
}

/**
 * Get all transactions for a profile, most recent first
 */
function getAdvertiserTransactions($profileId) {
    $db = getDB();

    $stmt = $db->prepare("
        SELECT * FROM pipeline_advertiser_transactions
        WHERE profile_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([(int)$profileId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Delete a transaction and recalculate the profile total
 */
function deleteAdvertiserTransaction($id) {
    $db = getDB();

    // Get profile_id before deleting
    $stmt = $db->prepare("SELECT profile_id FROM pipeline_advertiser_transactions WHERE id = ?");
    $stmt->execute([(int)$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) return false;

    $profileId = (int)$row['profile_id'];

    $stmt = $db->prepare("DELETE FROM pipeline_advertiser_transactions WHERE id = ?");
    $stmt->execute([(int)$id]);

    recalcProfileCards($profileId);

    return true;
}

/**
 * Recalculate a profile's cards_purchased from legacy base + purchase transactions.
 * On first transaction, the current cards_purchased is saved as legacy_cards_base
 * so it's preserved. After that: cards_purchased = legacy_base + SUM(purchase txn cards).
 */
function recalcProfileCards($profileId) {
    $db = getDB();

    // Get current profile data
    $stmt = $db->prepare("SELECT cards_purchased, legacy_cards_base FROM pipeline_advertiser_profiles WHERE id = ?");
    $stmt->execute([(int)$profileId]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$profile) return;

    // On first-ever recalc, snapshot the current cards_purchased as the legacy base
    if ($profile['legacy_cards_base'] === null) {
        $legacyBase = (int)$profile['cards_purchased'];
        $stmt = $db->prepare("UPDATE pipeline_advertiser_profiles SET legacy_cards_base = ? WHERE id = ?");
        $stmt->execute([$legacyBase, (int)$profileId]);
    } else {
        $legacyBase = (int)$profile['legacy_cards_base'];
    }

    // Sum of all purchase transaction cards
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(cards), 0)
        FROM pipeline_advertiser_transactions
        WHERE profile_id = ? AND type = 'purchase'
    ");
    $stmt->execute([(int)$profileId]);
    $txnCards = (int)$stmt->fetchColumn();

    $newTotal = $legacyBase + $txnCards;

    $stmt = $db->prepare("UPDATE pipeline_advertiser_profiles SET cards_purchased = ? WHERE id = ?");
    $stmt->execute([$newTotal, (int)$profileId]);
}

// ==========================================
// Pipeline Stats
// ==========================================

/**
 * Get pipeline dashboard stats
 */
function getPipelineStats() {
    $db = getDB();

    $stats = [];
    $stats['total_cards'] = (int)$db->query("SELECT COUNT(*) FROM pipeline_cards")->fetchColumn();
    $stats['filling'] = (int)$db->query("SELECT COUNT(*) FROM pipeline_cards WHERE status = 'filling'")->fetchColumn();
    $stats['full'] = (int)$db->query("SELECT COUNT(*) FROM pipeline_cards WHERE status = 'full'")->fetchColumn();
    $stats['in_production'] = (int)$db->query("SELECT COUNT(*) FROM pipeline_cards WHERE status = 'in_production'")->fetchColumn();
    $stats['mailed'] = (int)$db->query("SELECT COUNT(*) FROM pipeline_cards WHERE status = 'mailed'")->fetchColumn();

    $rev = $db->query("SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COALESCE(SUM(amount_paid), 0) as total_collected FROM pipeline_advertisers")->fetch(PDO::FETCH_ASSOC);
    $stats['total_revenue'] = (float)$rev['total_revenue'];
    $stats['total_collected'] = (float)$rev['total_collected'];

    // Outstanding = sum of (total_amount - amount_paid) for advertisers not fully paid
    $outstandingRow = $db->query("SELECT COALESCE(SUM(total_amount - amount_paid), 0) as outstanding FROM pipeline_advertisers WHERE payment_status != 'paid'")->fetch(PDO::FETCH_ASSOC);
    $stats['outstanding'] = (float)$outstandingRow['outstanding'];

    $costRow = $db->query("SELECT COALESCE(SUM(production_cost), 0) as total_production, COALESCE(SUM(postage_per_card * cards_mailed), 0) as total_postage FROM pipeline_cards")->fetch(PDO::FETCH_ASSOC);
    $stats['total_cost'] = (float)$costRow['total_production'] + (float)$costRow['total_postage'];
    $stats['total_profit'] = $stats['total_revenue'] - $stats['total_cost'];

    return $stats;
}

// ==========================================
// Pipeline Cards CRUD
// ==========================================

/**
 * Get all pipeline cards with computed spots_filled (using spots_consumed)
 */
function getAllPipelineCards($orderBy = 'display_order ASC, created_at DESC') {
    $db = getDB();

    $stmt = $db->query("
        SELECT c.*,
            COALESCE(SUM(a.spots_consumed), 0) AS spots_filled,
            COALESCE(SUM(a.total_amount), 0) AS card_revenue,
            COALESCE(SUM(a.amount_paid), 0) AS card_collected
        FROM pipeline_cards c
        LEFT JOIN pipeline_advertisers a ON a.card_id = c.id
        GROUP BY c.id
        ORDER BY $orderBy
    ");

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Get a single pipeline card by ID
 */
function getPipelineCard($id) {
    $db = getDB();

    $stmt = $db->prepare("
        SELECT c.*,
            COALESCE(SUM(a.spots_consumed), 0) AS spots_filled,
            COALESCE(SUM(a.total_amount), 0) AS card_revenue,
            COALESCE(SUM(a.amount_paid), 0) AS card_collected
        FROM pipeline_cards c
        LEFT JOIN pipeline_advertisers a ON a.card_id = c.id
        WHERE c.id = ?
        GROUP BY c.id
    ");
    $stmt->execute([(int)$id]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * Create a pipeline card
 */
function createPipelineCard($data) {
    $db = getDB();

    $stmt = $db->prepare("
        INSERT INTO pipeline_cards (card_name, area, mail_date, total_spots, status, notes, display_order, distribution, start_date, production_cost, postage_per_card, cards_mailed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $data['card_name'],
        $data['area'],
        $data['mail_date'] ?: null,
        $data['total_spots'] ?: 8,
        $data['status'] ?: 'filling',
        $data['notes'] ?? '',
        $data['display_order'] ?? 0,
        (int)($data['distribution'] ?? 0),
        $data['start_date'] ?: null,
        (float)($data['production_cost'] ?? 0),
        (float)($data['postage_per_card'] ?? 0),
        (int)($data['cards_mailed'] ?? 0)
    ]);

    return $db->lastInsertId();
}

/**
 * Update a pipeline card
 */
function updatePipelineCard($id, $data) {
    $db = getDB();

    $stmt = $db->prepare("
        UPDATE pipeline_cards
        SET card_name = ?, area = ?, mail_date = ?, total_spots = ?, status = ?, notes = ?, display_order = ?, distribution = ?, start_date = ?, production_cost = ?, postage_per_card = ?, cards_mailed = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $data['card_name'],
        $data['area'],
        $data['mail_date'] ?: null,
        $data['total_spots'] ?: 8,
        $data['status'] ?: 'filling',
        $data['notes'] ?? '',
        $data['display_order'] ?? 0,
        (int)($data['distribution'] ?? 0),
        $data['start_date'] ?: null,
        (float)($data['production_cost'] ?? 0),
        (float)($data['postage_per_card'] ?? 0),
        (int)($data['cards_mailed'] ?? 0),
        (int)$id
    ]);
}

/**
 * Update only the status of a pipeline card (for drag-and-drop)
 */
function updatePipelineCardStatus($id, $status) {
    $allowed = ['filling', 'full', 'in_production', 'mailed'];
    if (!in_array($status, $allowed)) return false;

    $db = getDB();
    $stmt = $db->prepare("UPDATE pipeline_cards SET status = ? WHERE id = ?");
    return $stmt->execute([$status, (int)$id]);
}

/**
 * Delete a pipeline card (cascades to advertisers)
 */
function deletePipelineCard($id) {
    $db = getDB();
    $stmt = $db->prepare("DELETE FROM pipeline_cards WHERE id = ?");
    return $stmt->execute([(int)$id]);
}

/**
 * Clone a pipeline card (and optionally its advertisers)
 */
function clonePipelineCard($id, $cloneAdvertisers = false) {
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM pipeline_cards WHERE id = ?");
    $stmt->execute([(int)$id]);
    $card = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$card) return false;

    $stmt = $db->prepare("
        INSERT INTO pipeline_cards (card_name, area, mail_date, total_spots, status, notes, display_order, distribution, start_date, production_cost, postage_per_card, cards_mailed)
        VALUES (?, ?, NULL, ?, 'filling', ?, ?, ?, NULL, ?, ?, 0)
    ");
    $stmt->execute([
        $card['card_name'] . ' (Copy)',
        $card['area'],
        $card['total_spots'],
        $card['notes'] ?? '',
        (int)$card['display_order'],
        (int)$card['distribution'],
        (float)$card['production_cost'],
        (float)$card['postage_per_card']
    ]);

    $newCardId = $db->lastInsertId();

    if ($cloneAdvertisers) {
        $stmt = $db->prepare("SELECT * FROM pipeline_advertisers WHERE card_id = ?");
        $stmt->execute([(int)$id]);
        $advertisers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $ins = $db->prepare("
            INSERT INTO pipeline_advertisers (card_id, business_name, contact_name, phone, email, spots_purchased, price_per_spot, total_amount, payment_status, amount_paid, notes, profile_id, ad_size, spots_consumed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 0, ?, ?, ?, ?)
        ");
        foreach ($advertisers as $adv) {
            $ins->execute([
                $newCardId,
                $adv['business_name'],
                $adv['contact_name'] ?? '',
                $adv['phone'] ?? '',
                $adv['email'] ?? '',
                (int)$adv['spots_purchased'],
                (float)$adv['price_per_spot'],
                (float)$adv['total_amount'],
                $adv['notes'] ?? '',
                $adv['profile_id'] ?: null,
                $adv['ad_size'] ?? 'medium',
                (float)($adv['spots_consumed'] ?? 1.0)
            ]);
        }
    }

    return $newCardId;
}

/**
 * Get cards that are almost full (1-2 spots remaining, using spots_consumed)
 */
function getAlmostFullCards() {
    $db = getDB();

    $stmt = $db->query("
        SELECT c.*,
            COALESCE(SUM(a.spots_consumed), 0) AS spots_filled
        FROM pipeline_cards c
        LEFT JOIN pipeline_advertisers a ON a.card_id = c.id
        WHERE c.status = 'filling'
        GROUP BY c.id
        HAVING (c.total_spots - spots_filled) BETWEEN 0.5 AND 2
    ");

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// ==========================================
// Advertisers CRUD (card-level)
// ==========================================

/**
 * Get advertisers for a card (with profile data)
 */
function getCardAdvertisers($cardId) {
    $db = getDB();

    $stmt = $db->prepare("
        SELECT a.*, p.category, p.repeat_customer, p.lowcodeals_subscriber, p.cards_purchased AS profile_cards_purchased
        FROM pipeline_advertisers a
        LEFT JOIN pipeline_advertiser_profiles p ON p.id = a.profile_id
        WHERE a.card_id = ?
        ORDER BY a.created_at ASC
    ");
    $stmt->execute([(int)$cardId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Get a single advertiser
 */
function getPipelineAdvertiser($id) {
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM pipeline_advertisers WHERE id = ?");
    $stmt->execute([(int)$id]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * Create an advertiser (with profile_id and ad_size support)
 */
function createAdvertiser($data) {
    $db = getDB();

    $adSize = $data['ad_size'] ?? 'medium';
    $spotsConsumed = ($adSize === 'custom') ? (float)($data['spots_consumed'] ?? 1.0) : adSizeToSpots($adSize);
    $totalAmount = (float)($data['total_amount'] ?? 0);
    $profileId = !empty($data['profile_id']) ? (int)$data['profile_id'] : null;
    $paymentStatus = $data['payment_status'] ?: 'unpaid';
    $amountPaid = (float)($data['amount_paid'] ?: 0);
    // Auto-sync: if marked paid, ensure amount_paid matches total
    if ($paymentStatus === 'paid' && $amountPaid < $totalAmount) {
        $amountPaid = $totalAmount;
    }

    $stmt = $db->prepare("
        INSERT INTO pipeline_advertisers (card_id, business_name, contact_name, phone, email, spots_purchased, price_per_spot, total_amount, payment_status, amount_paid, notes, profile_id, ad_size, spots_consumed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        (int)$data['card_id'],
        $data['business_name'],
        $data['contact_name'] ?? '',
        $data['phone'] ?? '',
        $data['email'] ?? '',
        (int)($data['spots_purchased'] ?? 1),
        (float)($data['price_per_spot'] ?? 0),
        $totalAmount,
        $paymentStatus,
        $amountPaid,
        $data['notes'] ?? '',
        $profileId,
        $adSize,
        $spotsConsumed
    ]);

    return $db->lastInsertId();
}

/**
 * Update an advertiser (with profile_id and ad_size support)
 */
function updateAdvertiser($id, $data) {
    $db = getDB();

    $adSize = $data['ad_size'] ?? 'medium';
    $spotsConsumed = ($adSize === 'custom') ? (float)($data['spots_consumed'] ?? 1.0) : adSizeToSpots($adSize);
    $totalAmount = (float)($data['total_amount'] ?? 0);
    $profileId = !empty($data['profile_id']) ? (int)$data['profile_id'] : null;
    $paymentStatus = $data['payment_status'] ?: 'unpaid';
    $amountPaid = (float)($data['amount_paid'] ?: 0);
    // Auto-sync: if marked paid, ensure amount_paid matches total
    if ($paymentStatus === 'paid' && $amountPaid < $totalAmount) {
        $amountPaid = $totalAmount;
    }

    $stmt = $db->prepare("
        UPDATE pipeline_advertisers
        SET business_name = ?, contact_name = ?, phone = ?, email = ?, spots_purchased = ?, price_per_spot = ?, total_amount = ?, payment_status = ?, amount_paid = ?, notes = ?, profile_id = ?, ad_size = ?, spots_consumed = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $data['business_name'],
        $data['contact_name'] ?? '',
        $data['phone'] ?? '',
        $data['email'] ?? '',
        (int)($data['spots_purchased'] ?? 1),
        (float)($data['price_per_spot'] ?? 0),
        $totalAmount,
        $paymentStatus,
        $amountPaid,
        $data['notes'] ?? '',
        $profileId,
        $adSize,
        $spotsConsumed,
        (int)$id
    ]);
}

/**
 * Delete an advertiser
 */
function deleteAdvertiser($id) {
    $db = getDB();
    $stmt = $db->prepare("DELETE FROM pipeline_advertisers WHERE id = ?");
    return $stmt->execute([(int)$id]);
}

/**
 * Validate pipeline card data
 */
function validatePipelineCard($data) {
    $errors = [];
    if (empty($data['card_name'])) $errors[] = 'Card name is required.';
    if (empty($data['area'])) $errors[] = 'Area is required.';
    if (isset($data['total_spots']) && (int)$data['total_spots'] < 1) $errors[] = 'Total spots must be at least 1.';
    if (isset($data['distribution']) && (int)$data['distribution'] < 0) $errors[] = 'Distribution cannot be negative.';
    return $errors;
}

/**
 * Validate advertiser data
 */
function validateAdvertiser($data) {
    $errors = [];
    if (empty($data['business_name'])) $errors[] = 'Business name is required.';
    if (isset($data['ad_size']) && !in_array($data['ad_size'], ['small', 'medium', 'large', 'custom'])) {
        $errors[] = 'Ad size must be small, medium, large, or custom.';
    }
    if (isset($data['ad_size']) && $data['ad_size'] === 'custom' && (float)($data['spots_consumed'] ?? 0) <= 0) {
        $errors[] = 'Custom ad size requires a spots value greater than 0.';
    }
    if (isset($data['total_amount']) && (float)$data['total_amount'] < 0) $errors[] = 'Price cannot be negative.';
    if (isset($data['amount_paid']) && (float)$data['amount_paid'] < 0) $errors[] = 'Amount paid cannot be negative.';
    return $errors;
}
