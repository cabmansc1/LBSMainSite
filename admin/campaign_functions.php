<?php
// admin/campaign_functions.php - Campaign management utility functions

require_once '../config.php';

// Campaign admin session timeout (2 hours)
define('CAMPAIGN_SESSION_TIMEOUT', 7200);

/**
 * Check if campaign admin is logged in
 */
function isCampaignAdminLoggedIn() {
    return isset($_SESSION['campaign_admin']['logged_in']) && 
           $_SESSION['campaign_admin']['logged_in'] === true;
}

/**
 * Require campaign admin login - redirect if not logged in
 */
function requireCampaignAdminLogin() {
    $isAjax = !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest'
              || (isset($_POST['ajax_action']) && $_SERVER['REQUEST_METHOD'] === 'POST');

    if (!isCampaignAdminLoggedIn()) {
        if ($isAjax) {
            header('Content-Type: application/json');
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'session_expired', 'message' => 'Session expired. Please log in again.']);
            exit();
        }
        header('Location: login.php');
        exit();
    }

    // Check session timeout
    if (time() - $_SESSION['campaign_admin']['login_time'] > CAMPAIGN_SESSION_TIMEOUT) {
        session_destroy();
        if ($isAjax) {
            header('Content-Type: application/json');
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'session_expired', 'message' => 'Session timed out. Please log in again.']);
            exit();
        }
        header('Location: login.php?timeout=1');
        exit();
    }

    // Update last activity
    $_SESSION['campaign_admin']['last_activity'] = time();
}

/**
 * Get current campaign admin info
 */
function getCurrentCampaignAdmin() {
    if (!isCampaignAdminLoggedIn()) {
        return null;
    }
    
    static $admin = null;
    if ($admin === null) {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM campaign_admins WHERE id = ?");
        $stmt->execute([$_SESSION['campaign_admin']['id']]);
        $admin = $stmt->fetch();
    }
    return $admin;
}

/**
 * Ensure campaign_areas table exists, seed with defaults on first run
 */
function ensureAreasTable() {
    $db = getDB();

    $db->exec("CREATE TABLE IF NOT EXISTS campaign_areas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        area_name VARCHAR(100) NOT NULL,
        area_code VARCHAR(10) NOT NULL,
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // Seed defaults if table is empty
    $count = (int)$db->query("SELECT COUNT(*) FROM campaign_areas")->fetchColumn();
    if ($count === 0) {
        $defaults = [
            ['Mount Pleasant', 'MP', 1],
            ['Summerville', 'SUM', 2],
            ['Daniel Island', 'DI', 3],
            ['James Island', 'JI', 4],
            ['Charleston', 'CHS', 5],
            ['North Charleston', 'NCH', 6],
            ['Goose Creek', 'GC', 7],
            ['Other', 'OTH', 8],
        ];
        $stmt = $db->prepare("INSERT INTO campaign_areas (area_name, area_code, display_order) VALUES (?, ?, ?)");
        foreach ($defaults as $row) {
            $stmt->execute($row);
        }
    }
}

/**
 * Get area abbreviation code from DB
 */
function getAreaCode($areaName) {
    $db = getDB();
    $stmt = $db->prepare("SELECT area_code FROM campaign_areas WHERE area_name = ? LIMIT 1");
    $stmt->execute([$areaName]);
    $code = $stmt->fetchColumn();
    return $code ?: strtoupper(substr($areaName, 0, 3));
}

/**
 * Get all areas with their codes (for JS mapping)
 */
function getAreasWithCodes() {
    $db = getDB();
    $stmt = $db->query("SELECT area_name, area_code FROM campaign_areas WHERE is_active = 1 ORDER BY display_order ASC");
    $map = [];
    while ($row = $stmt->fetch()) {
        $map[$row['area_name']] = $row['area_code'];
    }
    return $map;
}

/**
 * Generate campaign code
 */
function generateCampaignCode($area, $zipCode = '', $date = null) {
    if (!$date) {
        $date = date('MY'); // Current month-year, e.g., SEP25
    }

    // Look up area abbreviation from DB
    $areaCode = getAreaCode($area);

    // Add zip code if provided
    if ($zipCode) {
        return $areaCode . '-' . $zipCode . '-' . $date;
    } else {
        return $areaCode . '-' . $date;
    }
}

/**
 * Upload postcard image
 */
function uploadPostcardImage($file) {
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('File upload error');
    }
    
    // Create postcards directory if it doesn't exist
    $uploadDir = UPLOAD_DIR . 'postcards/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
    } else {
        $mimeType = $file['type'];
    }

    if (!in_array($mimeType, $allowedTypes)) {
        throw new Exception('Invalid file type. Please upload JPG, PNG, GIF, or WebP images.');
    }

    // Double-check with extension whitelist
    $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExts)) {
        throw new Exception('Invalid file extension. Allowed: JPG, PNG, GIF, WebP.');
    }
    
    // Validate file size (5MB max)
    if ($file['size'] > 5242880) {
        throw new Exception('File too large. Maximum size is 5MB.');
    }
    
    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'postcard_' . uniqid() . '_' . time() . '.' . $extension;
    $filePath = $uploadDir . $filename;
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception('Failed to move uploaded file');
    }
    
    return $filename;
}

/**
 * Get campaign statistics
 */
function getCampaignStats($campaignId = null) {
    $db = getDB();
    
    if ($campaignId) {
        // Stats for specific campaign
        $stmt = $db->prepare("
            SELECT 
                c.*,
                COUNT(r.id) as total_registrations,
                COUNT(CASE WHEN r.registration_date >= DATE_SUB(NOW(), INTERVAL 7 DAYS) THEN 1 END) as recent_registrations,
                COUNT(CASE WHEN r.status = 'winner' THEN 1 END) as winners
            FROM campaigns c
            LEFT JOIN campaign_registrations r ON c.id = r.campaign_id
            WHERE c.id = ?
            GROUP BY c.id
        ");
        $stmt->execute([$campaignId]);
        return $stmt->fetch();
    } else {
        // Overall stats
        $totalCampaigns = $db->query("SELECT COUNT(*) FROM campaigns")->fetchColumn();
        $activeCampaigns = $db->query("SELECT COUNT(*) FROM campaigns WHERE status = 'active'")->fetchColumn();
        $totalRegistrations = $db->query("SELECT COUNT(*) FROM campaign_registrations")->fetchColumn();
        $recentRegistrations = $db->query("SELECT COUNT(*) FROM campaign_registrations WHERE registration_date >= DATE_SUB(NOW(), INTERVAL 7 DAYS)")->fetchColumn();
        
        return [
            'total_campaigns' => $totalCampaigns,
            'active_campaigns' => $activeCampaigns,
            'total_registrations' => $totalRegistrations,
            'recent_registrations' => $recentRegistrations
        ];
    }
}

/**
 * Get all campaigns with registration counts
 */
function getAllCampaigns($orderBy = 'created_date DESC') {
    $db = getDB();
    
    $stmt = $db->prepare("
        SELECT 
            c.id,
            c.campaign_code,
            c.campaign_name,
            c.area,
            c.zip_code,
            c.status,
            c.registration_start,
            c.registration_end,
            c.postcard_image,
            c.created_date,
            c.notes,
            COUNT(r.id) as total_registrations
        FROM campaigns c
        LEFT JOIN campaign_registrations r ON c.id = r.campaign_id
        GROUP BY c.id
        ORDER BY " . $orderBy
    );
    
    $stmt->execute();
    return $stmt->fetchAll();
}

/**
 * Get registrations for a campaign
 */
function getCampaignRegistrations($campaignId, $limit = null, $offset = 0) {
    $db = getDB();
    
    $sql = "
        SELECT r.*, c.campaign_name, c.area
        FROM campaign_registrations r
        JOIN campaigns c ON r.campaign_id = c.id
        WHERE r.campaign_id = ?
        ORDER BY r.registration_date DESC
    ";
    
    if ($limit) {
        $sql .= " LIMIT ? OFFSET ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$campaignId, $limit, $offset]);
    } else {
        $stmt = $db->prepare($sql);
        $stmt->execute([$campaignId]);
    }
    
    return $stmt->fetchAll();
}

/**
 * Toggle campaign status
 */
function toggleCampaignStatus($campaignId) {
    $db = getDB();
    
    $stmt = $db->prepare("
        UPDATE campaigns 
        SET status = CASE 
            WHEN status = 'active' THEN 'inactive' 
            ELSE 'active' 
        END 
        WHERE id = ?
    ");
    
    return $stmt->execute([$campaignId]);
}

/**
 * Delete campaign (and all its registrations)
 */
function deleteCampaign($campaignId) {
    $db = getDB();
    
    try {
        $db->beginTransaction();
        
        // Get campaign info first (for deleting image file)
        $stmt = $db->prepare("SELECT postcard_image FROM campaigns WHERE id = ?");
        $stmt->execute([$campaignId]);
        $campaign = $stmt->fetch();
        
        // Delete registrations first (foreign key constraint)
        $stmt = $db->prepare("DELETE FROM campaign_registrations WHERE campaign_id = ?");
        $stmt->execute([$campaignId]);
        
        // Delete campaign
        $stmt = $db->prepare("DELETE FROM campaigns WHERE id = ?");
        $stmt->execute([$campaignId]);
        
        $db->commit();
        
        // Delete image file if exists
        if ($campaign && $campaign['postcard_image']) {
            $imagePath = UPLOAD_DIR . 'postcards/' . $campaign['postcard_image'];
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
        }
        
        return true;
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

/**
 * Export registrations to CSV
 */
function exportRegistrationsCSV($campaignId = null, $filename = null) {
    if (!$filename) {
        $filename = 'campaign_registrations_' . date('Y-m-d_H-i-s') . '.csv';
    }
    
    $db = getDB();
    
    if ($campaignId) {
        $stmt = $db->prepare("
            SELECT 
                r.name,
                r.email,
                r.phone,
                r.registration_date,
                r.status,
                c.campaign_name,
                c.campaign_code,
                c.area
            FROM campaign_registrations r
            JOIN campaigns c ON r.campaign_id = c.id
            WHERE r.campaign_id = ?
            ORDER BY r.registration_date DESC
        ");
        $stmt->execute([$campaignId]);
    } else {
        $stmt = $db->prepare("
            SELECT 
                r.name,
                r.email,
                r.phone,
                r.registration_date,
                r.status,
                c.campaign_name,
                c.campaign_code,
                c.area
            FROM campaign_registrations r
            JOIN campaigns c ON r.campaign_id = c.id
            ORDER BY r.registration_date DESC
        ");
        $stmt->execute();
    }
    
    $registrations = $stmt->fetchAll();
    
    // Set headers for download
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    $output = fopen('php://output', 'w');
    
    // Write CSV headers
    fputcsv($output, [
        'Name',
        'Email',
        'Phone',
        'Registration Date',
        'Status',
        'Campaign Name',
        'Campaign Code',
        'Area'
    ]);
    
    // Write data
    foreach ($registrations as $registration) {
        fputcsv($output, [
            $registration['name'],
            $registration['email'],
            $registration['phone'],
            $registration['registration_date'],
            $registration['status'],
            $registration['campaign_name'],
            $registration['campaign_code'],
            $registration['area']
        ]);
    }
    
    fclose($output);
    exit();
}

/**
 * Get areas for dropdown (from database)
 */
function getAvailableAreas() {
    $db = getDB();
    $stmt = $db->query("SELECT area_name FROM campaign_areas WHERE is_active = 1 ORDER BY display_order ASC");
    $areas = [];
    while ($row = $stmt->fetch()) {
        $areas[$row['area_name']] = $row['area_name'];
    }
    return $areas;
}

/**
 * Validate campaign data
 */
function validateCampaignData($data) {
    $errors = [];
    
    if (empty($data['campaign_name'])) {
        $errors[] = 'Campaign name is required.';
    }
    
    if (empty($data['area'])) {
        $errors[] = 'Area is required.';
    }
    
    if (empty($data['registration_start'])) {
        $errors[] = 'Registration start date is required.';
    }
    
    if (empty($data['registration_end'])) {
        $errors[] = 'Registration end date is required.';
    }
    
    if (!empty($data['registration_start']) && !empty($data['registration_end'])) {
        if (strtotime($data['registration_start']) >= strtotime($data['registration_end'])) {
            $errors[] = 'Registration end date must be after start date.';
        }
    }
    
    return $errors;
}

/**
 * Log campaign activity
 */
function logCampaignActivity($action, $details = null) {
    $admin = getCurrentCampaignAdmin();
    if (!$admin) return;
    
    $db = getDB();
    
    try {
        // Create campaign activity log table if it doesn't exist
        $db->exec("CREATE TABLE IF NOT EXISTS campaign_activity_log (
            id INT PRIMARY KEY AUTO_INCREMENT,
            admin_id INT,
            action VARCHAR(100),
            details TEXT,
            ip_address VARCHAR(45),
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        
        $stmt = $db->prepare("
            INSERT INTO campaign_activity_log (admin_id, action, details, ip_address) 
            VALUES (?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $admin['id'],
            $action,
            is_array($details) ? json_encode($details) : $details,
            $_SERVER['REMOTE_ADDR'] ?? null
        ]);
        
    } catch (Exception $e) {
        // Log error but don't break the application
        error_log("Failed to log campaign activity: " . $e->getMessage());
    }
}
?>