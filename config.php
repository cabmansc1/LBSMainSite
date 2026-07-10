<?php
/**
 * MAIN CONFIGURATION FILE
 * Location: /public_html/config.php
 */

// Start session securely
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_samesite', 'Strict');
    session_start();
}

// Error reporting - CHANGE TO 0 IN PRODUCTION
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', dirname(__FILE__) . '/../logs/php-errors.log');
error_reporting(E_ALL);

// Define constant for db_config (guarded — handlers like process_directory_signup.php may have already set this)
if (!defined('DB_CONFIG_LOADED')) {
    define('DB_CONFIG_LOADED', true);
}

// Try to load secure database config.
// Priority: (1) cPanel secure file outside web root, (2) same via DOCUMENT_ROOT,
// (3) environment variables (Railway / containerized hosting).
$db_config_path = dirname(__FILE__) . '/../secure/db_config.php';
$db_config_path_alt = ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/../secure/db_config.php';
if (file_exists($db_config_path)) {
    require_once $db_config_path;
} elseif (!empty($_SERVER['DOCUMENT_ROOT']) && file_exists($db_config_path_alt)) {
    require_once $db_config_path_alt;
} elseif (getenv('DB_HOST') || getenv('MYSQLHOST')) {
    // ----- Environment-variable database config (Railway, Docker, etc.) -----
    // Accepts generic DB_* names, falling back to Railway's MYSQL* names.
    define('DB_HOST', getenv('DB_HOST') ?: getenv('MYSQLHOST'));
    define('DB_USER', getenv('DB_USER') ?: getenv('MYSQLUSER'));
    define('DB_PASS', getenv('DB_PASS') ?: getenv('MYSQLPASSWORD'));
    define('DB_NAME', getenv('DB_NAME') ?: getenv('MYSQLDATABASE'));
    define('DB_PORT', (int)(getenv('DB_PORT') ?: getenv('MYSQLPORT') ?: 3306));
    define('DB_CHARSET', getenv('DB_CHARSET') ?: 'utf8mb4');
    if (!defined('SECURE_SITE'))  define('SECURE_SITE', true);
    if (!defined('FORCE_HTTPS'))  define('FORCE_HTTPS', true);

    // Mirror the connection helpers from secure/db_config.php so getDB() works.
    if (!function_exists('getSecureDBConnection')) {
        function getSecureDBConnection() {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    // Match cPanel MariaDB's permissive grouping (Railway's MySQL 9
                    // enables ONLY_FULL_GROUP_BY by default, which breaks the app's GROUP BY queries).
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET . ", time_zone = '-05:00', SESSION sql_mode = (SELECT REPLACE(@@SESSION.sql_mode, 'ONLY_FULL_GROUP_BY', ''))",
                    PDO::ATTR_PERSISTENT => false,
                ];
                return new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                error_log("Database connection failed: " . $e->getMessage());
                die("Database connection error. Please contact support.");
            }
        }
    }
    if (!function_exists('getSecureMySQLiConnection')) {
        function getSecureMySQLiConnection() {
            mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
            try {
                $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
                $conn->set_charset(DB_CHARSET);
                $conn->query("SET time_zone = '-05:00'");
                // Match cPanel MariaDB's permissive grouping (see PDO note above).
                $conn->query("SET SESSION sql_mode = (SELECT REPLACE(@@SESSION.sql_mode, 'ONLY_FULL_GROUP_BY', ''))");
                return $conn;
            } catch (Exception $e) {
                error_log("MySQLi connection failed: " . $e->getMessage());
                die("Database connection error. Please contact support.");
            }
        }
    }
} else {
    error_log("CRITICAL: db_config.php not found at: " . $db_config_path);
    // Don't die, just log - let pages that don't need DB still work
}

// Google Maps API Key
define('GOOGLE_MAPS_API_KEY', 'AIzaSyBFLaij-Kfr-R59wnpzFzdak0HNGBHps-0');

// Site configuration
define('SITE_NAME', 'Lowcountry Business Spotlight');
define('SITE_URL', getenv('SITE_URL') ?: 'https://www.lowcountrybusinessspotlight.com');
define('ADMIN_EMAIL', 'hello@lbspotlight.com');

// Security settings
define('CSRF_TOKEN_NAME', 'csrf_token');
define('PASSWORD_MIN_LENGTH', 8);
define('SESSION_TIMEOUT', 7200);
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_TIMEOUT', 900);
define('RECAPTCHA_SITE_KEY', '6Len4fssAAAAAMjgYPdcYTzE_ML6GzDG8SDbMrQs');

// File upload settings
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('MAX_FILE_SIZE', 5242880);
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp']);

// Database table prefix
define('TABLE_PREFIX', 'directory_');

// Committed integration helpers (GHL webhook + reCAPTCHA). These defer to the
// cPanel secure/ helpers when those are already loaded, and read env vars on Railway.
require_once __DIR__ . '/includes/ghl.php';
require_once __DIR__ . '/includes/recaptcha.php';

// Database wrapper — memoized: one connection per request. Previously every
// call opened a fresh PDO connection (TCP + auth handshake), and pages like
// the directory make half a dozen getDB() calls per view.
function getDB() {
    static $db = null;
    if ($db instanceof PDO) {
        return $db;
    }
    if (function_exists('getSecureDBConnection')) {
        $db = getSecureDBConnection();
        return $db;
    }
    throw new Exception('Database connection not available');
}

// Get prefixed table name
function getTable($table) {
    return TABLE_PREFIX . $table;
}

// CSRF Protection
function generateCSRFToken() {
    if (empty($_SESSION[CSRF_TOKEN_NAME])) {
        $_SESSION[CSRF_TOKEN_NAME] = bin2hex(random_bytes(32));
    }
    return $_SESSION[CSRF_TOKEN_NAME];
}

function validateCSRFToken($token) {
    if (!isset($_SESSION[CSRF_TOKEN_NAME]) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION[CSRF_TOKEN_NAME], $token);
}

// Input sanitization
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return strip_tags(trim($input));
}

function sanitizeEmail($email) {
    $email = filter_var(trim($email), FILTER_SANITIZE_EMAIL);
    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : false;
}

function sanitizePhone($phone) {
    return preg_replace('/[^0-9+\-() ]/', '', trim($phone));
}

function sanitizeURL($url) {
    $url = filter_var(trim($url), FILTER_SANITIZE_URL);
    return filter_var($url, FILTER_VALIDATE_URL) ? $url : false;
}

// Validation functions
function validateRequired($value, $fieldName = 'Field') {
    if (empty(trim($value))) {
        throw new Exception("{$fieldName} is required");
    }
    return trim($value);
}

function validateEmail($email) {
    $email = sanitizeEmail($email);
    if (!$email) {
        throw new Exception('Invalid email address');
    }
    return $email;
}

function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Password functions
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Session management
function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

// Require login - redirect if not logged in
function requireLogin() {
    if (!isLoggedIn()) {
        header('Location: login.php');
        exit;
    }
}

// Get current logged in user
function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }

    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM " . getTable('users') . " WHERE id = ? AND is_active = 1");
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return null;
    }
}

// Get user's business
function getUserBusiness($userId) {
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM " . getTable('businesses') . " WHERE user_id = ? AND is_active = 1 LIMIT 1");
        $stmt->execute([$userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return null;
    }
}

// Generate random token
function generateToken($length = 32) {
    return bin2hex(random_bytes($length));
}

// Generate URL slug from string
function generateSlug($string) {
    $slug = strtolower(trim($string));
    $slug = preg_replace('/[^a-z0-9-]/', '-', $slug);
    $slug = preg_replace('/-+/', '-', $slug);
    return trim($slug, '-');
}

// Ensure directory taxonomy tables exist and seed defaults.
// Runs at most once per request; callers invoke it lazily (only when a
// SELECT comes back empty/failing), so steady-state requests do no DDL.
function ensureDirectoryTaxonomyTables() {
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;
    $db = getDB();

    $db->exec("CREATE TABLE IF NOT EXISTS directory_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(150) NOT NULL,
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS directory_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(150) NOT NULL,
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Seed categories if empty
    $count = (int)$db->query("SELECT COUNT(*) FROM directory_categories")->fetchColumn();
    if ($count === 0) {
        $defaults = [
            ['restaurant', 'Restaurants & Dining', 1],
            ['home-garden', 'Home & Garden', 2],
            ['automotive', 'Automotive', 3],
            ['health-wellness', 'Health & Wellness', 4],
            ['beauty', 'Beauty & Personal Care', 5],
            ['retail', 'Retail & Shopping', 6],
            ['services', 'Professional Services', 7],
            ['fitness-recreation', 'Fitness & Recreation', 8],
            ['legal', 'Legal & Financial', 9],
            ['other', 'Other Services', 10],
        ];
        $stmt = $db->prepare("INSERT INTO directory_categories (slug, display_name, display_order) VALUES (?, ?, ?)");
        foreach ($defaults as $row) {
            $stmt->execute($row);
        }
    }

    // Tags table
    $db->exec("CREATE TABLE IF NOT EXISTS directory_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(150) NOT NULL,
        category_slug VARCHAR(100) DEFAULT NULL,
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Business-tags junction table
    $db->exec("CREATE TABLE IF NOT EXISTS directory_business_tags (
        business_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (business_id, tag_id),
        INDEX (tag_id)
    )");

    // Seed tags if empty
    $count = (int)$db->query("SELECT COUNT(*) FROM directory_tags")->fetchColumn();
    if ($count === 0) {
        $tagDefaults = [
            ['hvac', 'HVAC', 'home-garden', 1],
            ['roofing', 'Roofing', 'home-garden', 2],
            ['handyman', 'Handyman', 'home-garden', 3],
            ['electrical', 'Electrical', 'home-garden', 4],
            ['plumbing', 'Plumbing', 'home-garden', 5],
            ['landscaping', 'Landscaping', 'home-garden', 6],
            ['italian', 'Italian', 'restaurant', 1],
            ['mexican', 'Mexican', 'restaurant', 2],
            ['seafood', 'Seafood', 'restaurant', 3],
            ['bbq', 'BBQ', 'restaurant', 4],
            ['american', 'American', 'restaurant', 5],
            ['asian', 'Asian', 'restaurant', 6],
            ['auto-repair', 'Auto Repair', 'automotive', 1],
            ['body-shop', 'Body Shop', 'automotive', 2],
            ['women-owned', 'Women-Owned', null, 90],
            ['veteran-owned', 'Veteran-Owned', null, 91],
            ['locally-owned', 'Locally Owned', null, 92],
        ];
        $tagStmt = $db->prepare("INSERT INTO directory_tags (slug, display_name, category_slug, display_order) VALUES (?, ?, ?, ?)");
        foreach ($tagDefaults as $row) {
            $tagStmt->execute($row);
        }
    }

    // Seed locations if empty
    $count = (int)$db->query("SELECT COUNT(*) FROM directory_locations")->fetchColumn();
    if ($count === 0) {
        $defaults = [
            ['summerville', 'Summerville', 1],
            ['mount-pleasant', 'Mount Pleasant', 2],
            ['daniel-island', 'Daniel Island', 3],
            ['james-island', 'James Island', 4],
            ['charleston', 'Charleston', 5],
            ['north-charleston', 'North Charleston', 6],
            ['goose-creek', 'Goose Creek', 7],
            ['hanahan', 'Hanahan', 8],
            ['lowcountry', 'Other Lowcountry', 9],
        ];
        $stmt = $db->prepare("INSERT INTO directory_locations (slug, display_name, display_order) VALUES (?, ?, ?)");
        foreach ($defaults as $row) {
            $stmt->execute($row);
        }
    }
}

// Get categories list
function getCategories() {
    $sql = "SELECT slug, display_name FROM directory_categories WHERE is_active = 1 ORDER BY display_order, display_name";
    try {
        $db = getDB();
        try {
            $result = $db->query($sql)->fetchAll(PDO::FETCH_KEY_PAIR);
        } catch (PDOException $e) {
            $result = []; // table missing — provision below
        }
        if (!$result) {
            ensureDirectoryTaxonomyTables();
            $result = $db->query($sql)->fetchAll(PDO::FETCH_KEY_PAIR);
        }
        return $result ?: [];
    } catch (Exception $e) {
        return [];
    }
}

// Get location areas list
function getLocationAreas() {
    $sql = "SELECT slug, display_name FROM directory_locations WHERE is_active = 1 ORDER BY display_order, display_name";
    try {
        $db = getDB();
        try {
            $result = $db->query($sql)->fetchAll(PDO::FETCH_KEY_PAIR);
        } catch (PDOException $e) {
            $result = []; // table missing — provision below
        }
        if (!$result) {
            ensureDirectoryTaxonomyTables();
            $result = $db->query($sql)->fetchAll(PDO::FETCH_KEY_PAIR);
        }
        return $result ?: [];
    } catch (Exception $e) {
        return [];
    }
}

// Pagination settings
define('BUSINESSES_PER_PAGE', 12);

// Activity logging
function logActivity($action, $details = null) {
    $logFile = dirname(__FILE__) . '/../logs/activity.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    
    $userId = $_SESSION['user_id'] ?? 'guest';
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $timestamp = date('Y-m-d H:i:s');
    
    $logEntry = "[{$timestamp}] User: {$userId} | IP: {$ip} | Action: {$action}";
    if ($details) {
        $logEntry .= " | Details: " . json_encode($details);
    }
    $logEntry .= "\n";
    
    @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// Central mail sender. Uses SMTP (PHPMailer) when SMTP_HOST is set (Railway),
// otherwise falls back to PHP mail() (cPanel). Signature mirrors mail() so it
// is a drop-in replacement at every call site.
function appSendMail($to, $subject, $body, $headers = '', $params = '') {
    $smtpHost = getenv('SMTP_HOST');
    if (!$smtpHost) {
        // No SMTP configured -> native mail() (cPanel behavior, unchanged).
        return mail($to, $subject, $body, $headers, $params);
    }

    // Parse the raw header string that call sites already build.
    $forcedFrom = getenv('SMTP_FROM');   // when set, authoritative (single verified sender)
    $from     = $forcedFrom ?: 'no-reply@lowcountrybusinessspotlight.com';
    $fromName = getenv('SMTP_FROM_NAME') ?: (defined('SITE_NAME') ? SITE_NAME : '');
    $replyTo  = null; $cc = []; $bcc = []; $isHtml = false; $headerFrom = null;
    foreach (preg_split('/\r\n|\r|\n/', (string)$headers) as $line) {
        if (stripos($line, 'From:') === 0)              { $headerFrom = trim(substr($line, 5)); }
        elseif (stripos($line, 'Reply-To:') === 0)      { $replyTo = trim(substr($line, 9)); }
        elseif (stripos($line, 'Cc:') === 0)            { $cc[] = trim(substr($line, 3)); }
        elseif (stripos($line, 'Bcc:') === 0)           { $bcc[] = trim(substr($line, 4)); }
        elseif (stripos($line, 'Content-Type:') === 0 && stripos($line, 'text/html') !== false) { $isHtml = true; }
    }
    // A verified SMTP_FROM keeps every message on one verified domain; otherwise
    // honor the From the call site built.
    if (!$forcedFrom && $headerFrom) { $from = $headerFrom; }
    // Split an optional display name out of the From header.
    $fromEmail = $from; $fromDisplay = $fromName;
    if (preg_match('/^(.*)<([^>]+)>\s*$/', $from, $m)) { $fromDisplay = trim($m[1]) ?: $fromName; $fromEmail = trim($m[2]); }

    if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        $autoload = __DIR__ . '/vendor/autoload.php';
        if (is_file($autoload)) { require_once $autoload; }
    }
    if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        error_log('appSendMail: PHPMailer unavailable; falling back to mail()');
        return mail($to, $subject, $body, $headers, $params);
    }

    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = $smtpHost;
        $mail->Port       = (int)(getenv('SMTP_PORT') ?: 587);
        // Bound the SMTP socket. PHPMailer's default Timeout is 300s, so a slow or
        // blocked SMTP host (cloud platforms often throttle outbound SMTP) would hang
        // the whole request for minutes per send until the edge proxy closed the
        // connection (ERR_CONNECTION_CLOSED) and users re-submitted. Fail fast instead.
        $mail->Timeout    = (int)(getenv('SMTP_TIMEOUT') ?: 8);
        $mail->SMTPAuth   = true;
        $mail->Username   = getenv('SMTP_USER');
        $mail->Password   = getenv('SMTP_PASS');
        $mail->SMTPSecure = ((getenv('SMTP_ENCRYPTION') ?: 'tls') === 'ssl')
            ? \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS
            : \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom($fromEmail, $fromDisplay);
        foreach (preg_split('/\s*,\s*/', (string)$to) as $addr) { if ($addr) { $mail->addAddress($addr); } }
        if ($replyTo) { $mail->addReplyTo($replyTo); }
        foreach ($cc as $c)  { if ($c)  { $mail->addCC($c); } }
        foreach ($bcc as $b) { if ($b)  { $mail->addBCC($b); } }

        $mail->Subject = $subject;
        $mail->isHTML($isHtml);
        $mail->Body = $body;
        if ($isHtml) { $mail->AltBody = strip_tags($body); }

        $mail->send();
        return true;
    } catch (\Throwable $e) {
        error_log('appSendMail SMTP error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Flush the response the caller has already produced to the browser, then let
 * the request keep running so slow post-processing (SMTP email, GHL webhooks)
 * no longer makes the user wait. Works under Apache/mod_php (prefork) and PHP-FPM.
 *
 * Caller contract: buffer the FULL response body with a single ob_start() before
 * calling this, set any status/redirect headers first, and echo NOTHING after.
 * Fallback is safe: if the SAPI ignores the early close, the response is still
 * correct and complete — the user just waits as they did before.
 */
function finishRequestAndContinue() {
    @ignore_user_abort(true);
    // Persist and release the session lock so the browser's next request
    // (e.g. a thank-you page) isn't blocked while we finish emailing.
    if (function_exists('session_status') && session_status() === PHP_SESSION_ACTIVE) {
        @session_write_close();
    }
    // PHP-FPM fast path: hands the connection back cleanly.
    if (function_exists('fastcgi_finish_request')) {
        @fastcgi_finish_request();
        return;
    }
    // Apache/mod_php: declare the body length and ask Apache to close the
    // socket, then flush every buffer level to the client.
    if (!headers_sent()) {
        $len = ob_get_length();
        if ($len !== false) { header('Content-Length: ' . $len); }
        header('Connection: close');
    }
    while (ob_get_level() > 0) { @ob_end_flush(); }
    @flush();
}

// Secure email sending
function sendSecureEmail($to, $subject, $body, $replyTo = null) {
    $to = sanitizeEmail($to);
    if (!$to) {
        throw new Exception('Invalid recipient email');
    }
    
    $subject = sanitizeInput($subject);
    $subject = substr($subject, 0, 200);
    
    $headers = "From: no-reply@lowcountrybusinessspotlight.com\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    if ($replyTo) {
        $replyTo = sanitizeEmail($replyTo);
        if ($replyTo) {
            $replyTo = str_replace(["\r", "\n"], '', $replyTo);
            $headers .= "Reply-To: {$replyTo}\r\n";
        }
    }
    
    return appSendMail($to, $subject, $body, $headers, '-f no-reply@lowcountrybusinessspotlight.com');
}

// Format phone number
function formatPhoneNumber($phone) {
    $cleaned = preg_replace('/[^0-9]/', '', $phone);
    if (strlen($cleaned) === 10) {
        return '(' . substr($cleaned, 0, 3) . ') ' . substr($cleaned, 3, 3) . '-' . substr($cleaned, 6);
    }
    return $phone;
}

// Generic image upload function
function uploadImage($file, $subdirectory = 'images') {
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('File upload error');
    }

    // Validate file size
    if ($file['size'] > MAX_FILE_SIZE) {
        throw new Exception('File too large. Maximum size is ' . (MAX_FILE_SIZE / 1048576) . 'MB.');
    }

    // Validate file type by extension
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (!in_array($extension, $allowedExtensions)) {
        throw new Exception('Invalid file type. Allowed: JPG, PNG, WebP.');
    }

    $extToMime = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
    $mimeType = $extToMime[$extension];

    // Create subdirectory if needed
    $uploadDir = UPLOAD_DIR . rtrim($subdirectory, '/') . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Generate unique filename
    $safeSubdir = preg_replace('/[^a-z0-9_-]/', '', $subdirectory);
    $filename = $safeSubdir . '_' . uniqid() . '_' . time() . '.' . $extension;
    $filePath = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception('Failed to save uploaded file.');
    }

    return [
        'filename' => $filename,
        'path' => $filePath,
        'size' => $file['size'],
        'mime_type' => $mimeType
    ];
}

// URL helper functions for clean URLs
function businessUrl($slug) {
    return SITE_URL . '/business/' . urlencode($slug);
}

function directoryUrl() {
    return SITE_URL . '/directory/';
}

function categoryUrl($slug) {
    return SITE_URL . '/directory/category/' . urlencode($slug);
}

function tagUrl($slug) {
    return SITE_URL . '/directory/tag/' . urlencode($slug);
}

function locationUrl($slug) {
    return SITE_URL . '/directory/location/' . urlencode($slug);
}

// Get tags, optionally filtered by category slug
function getTags($categorySlug = null) {
    try {
        $db = getDB();
        $sql = "SELECT id, slug, display_name, category_slug FROM directory_tags WHERE is_active = 1";
        $params = [];
        if ($categorySlug !== null) {
            $sql .= " AND (category_slug = ? OR category_slug IS NULL)";
            $params[] = $categorySlug;
        }
        $sql .= " ORDER BY display_order, display_name";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return [];
    }
}

// Get tags for a single business
function getBusinessTags($businessId) {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            SELECT t.id, t.slug, t.display_name, t.category_slug
            FROM directory_tags t
            JOIN directory_business_tags bt ON t.id = bt.tag_id
            WHERE bt.business_id = ? AND t.is_active = 1
            ORDER BY t.display_order, t.display_name
        ");
        $stmt->execute([$businessId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return [];
    }
}

// Batch load tags for multiple businesses (avoids N+1)
function getBusinessTagsBatch($businessIds) {
    if (empty($businessIds)) return [];
    try {
        $db = getDB();
        $placeholders = implode(',', array_fill(0, count($businessIds), '?'));
        $stmt = $db->prepare("
            SELECT bt.business_id, t.id, t.slug, t.display_name, t.category_slug
            FROM directory_tags t
            JOIN directory_business_tags bt ON t.id = bt.tag_id
            WHERE bt.business_id IN ($placeholders) AND t.is_active = 1
            ORDER BY t.display_order, t.display_name
        ");
        $stmt->execute(array_values($businessIds));
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = [];
        foreach ($rows as $row) {
            $bid = $row['business_id'];
            unset($row['business_id']);
            $result[$bid][] = $row;
        }
        return $result;
    } catch (Exception $e) {
        return [];
    }
}

// Replace all tags for a business
function saveBusinessTags($businessId, $tagSlugs) {
    try {
        $db = getDB();
        $db->prepare("DELETE FROM directory_business_tags WHERE business_id = ?")->execute([$businessId]);
        if (!empty($tagSlugs)) {
            $placeholders = implode(',', array_fill(0, count($tagSlugs), '?'));
            $stmt = $db->prepare("
                INSERT INTO directory_business_tags (business_id, tag_id)
                SELECT ?, id FROM directory_tags WHERE slug IN ($placeholders)
            ");
            $stmt->execute(array_merge([$businessId], $tagSlugs));
        }
        return true;
    } catch (Exception $e) {
        return false;
    }
}

// Image resize sizes
define('IMAGE_SIZES', [
    'thumb'  => ['width' => 150, 'height' => 150, 'crop' => true],
    'medium' => ['width' => 600, 'height' => 450, 'crop' => false],
]);

/**
 * Resize an image using GD and save to a subdirectory.
 * Returns the path to the resized file, or false on failure.
 */
function resizeImage($sourcePath, $destPath, $maxWidth, $maxHeight, $crop = false) {
    $info = @getimagesize($sourcePath);
    if (!$info) return false;

    list($origW, $origH, $type) = $info;

    $createFunc = [IMAGETYPE_JPEG => 'imagecreatefromjpeg', IMAGETYPE_PNG => 'imagecreatefrompng', IMAGETYPE_WEBP => 'imagecreatefromwebp'];
    $saveFunc   = [IMAGETYPE_JPEG => 'imagejpeg', IMAGETYPE_PNG => 'imagepng', IMAGETYPE_WEBP => 'imagewebp'];

    if (!isset($createFunc[$type])) return false;

    $src = $createFunc[$type]($sourcePath);
    if (!$src) return false;

    if ($crop) {
        // Crop to fill the target dimensions
        $ratio = max($maxWidth / $origW, $maxHeight / $origH);
        $srcW = (int)round($maxWidth / $ratio);
        $srcH = (int)round($maxHeight / $ratio);
        $srcX = (int)round(($origW - $srcW) / 2);
        $srcY = (int)round(($origH - $srcH) / 2);
        $newW = $maxWidth;
        $newH = $maxHeight;
    } else {
        // Fit within bounds, preserve aspect ratio
        $ratio = min($maxWidth / $origW, $maxHeight / $origH);
        if ($ratio >= 1) {
            // Image already smaller than target — just copy it
            $destDir = dirname($destPath);
            if (!is_dir($destDir)) mkdir($destDir, 0755, true);
            copy($sourcePath, $destPath);
            imagedestroy($src);
            return $destPath;
        }
        $newW = (int)round($origW * $ratio);
        $newH = (int)round($origH * $ratio);
        $srcX = 0;
        $srcY = 0;
        $srcW = $origW;
        $srcH = $origH;
    }

    $dst = imagecreatetruecolor($newW, $newH);

    // Preserve transparency for PNG/WebP
    if ($type === IMAGETYPE_PNG || $type === IMAGETYPE_WEBP) {
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
    }

    imagecopyresampled($dst, $src, 0, 0, $srcX, $srcY, $newW, $newH, $srcW, $srcH);

    $destDir = dirname($destPath);
    if (!is_dir($destDir)) mkdir($destDir, 0755, true);

    if ($type === IMAGETYPE_PNG) {
        $saveFunc[$type]($dst, $destPath, 8);
    } elseif ($type === IMAGETYPE_WEBP) {
        $saveFunc[$type]($dst, $destPath, 82);
    } else {
        $saveFunc[$type]($dst, $destPath, 85);
    }

    imagedestroy($src);
    imagedestroy($dst);

    return $destPath;
}

/**
 * Generate all defined sizes for an uploaded image.
 */
function generateImageSizes($sourcePath, $baseDir, $filename) {
    foreach (IMAGE_SIZES as $sizeName => $dims) {
        $sizeDir = rtrim($baseDir, '/') . '/' . $sizeName . '/';
        resizeImage($sourcePath, $sizeDir . $filename, $dims['width'], $dims['height'], $dims['crop']);
    }
}

// ── Community Card Helpers ──

/**
 * Expire pending card orders older than 5 minutes.
 * Call before any availability check to release abandoned checkouts.
 */
function expireStalePendingOrders() {
    try {
        $db = getDB();
        $db->exec("
            UPDATE " . getTable('card_orders') . "
            SET status = 'cancelled'
            WHERE status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        ");
    } catch (Exception $e) {
        error_log("expireStalePendingOrders error: " . $e->getMessage());
    }
}

/**
 * Get remaining spots for a community card (calculated from paid orders).
 */
function getCardSpotsRemaining($cardId) {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            SELECT c.total_spots - COALESCE(SUM(st.spots_used), 0) AS remaining
            FROM " . getTable('cards') . " c
            LEFT JOIN " . getTable('card_orders') . " o ON o.card_id = c.id AND o.status IN ('pending','paid')
            LEFT JOIN " . getTable('card_spot_types') . " st ON st.id = o.spot_type_id
            WHERE c.id = ?
            GROUP BY c.id
        ");
        $stmt->execute([$cardId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (float)$row['remaining'] : 0;
    } catch (Exception $e) {
        return 0;
    }
}

/**
 * Get count of coupons already sold on a card.
 */
function getCardCouponCount($cardId) {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM " . getTable('card_orders') . " o
            JOIN " . getTable('card_spot_types') . " st ON st.id = o.spot_type_id
            WHERE o.card_id = ? AND o.status IN ('pending','paid') AND st.name = 'coupon'
        ");
        $stmt->execute([$cardId]);
        return (int)$stmt->fetchColumn();
    } catch (Exception $e) {
        return 0;
    }
}

/**
 * Check if a community card's ad content is still editable.
 * Editable until 2 days before print deadline.
 */
function isCardEditable($printDeadline) {
    if (!$printDeadline) return false;
    $cutoff = new DateTime($printDeadline);
    $cutoff->modify('-2 days');
    return new DateTime() < $cutoff;
}

/**
 * Check if refund is still allowed (same cutoff as edit).
 */
function isRefundAllowed($printDeadline) {
    return isCardEditable($printDeadline);
}

/**
 * URL helper for community cards.
 */
function communityCardUrl($slug) {
    return SITE_URL . '/neighborhood-card/' . urlencode($slug);
}

function communityCardsUrl() {
    return SITE_URL . '/neighborhood-cards/';
}

// ── Neighborhood Card Pricing Tiers ──

/**
 * Pricing tiers based on household count.
 * Each tier defines a min/max range and price_cents per spot type name.
 */
define('CARD_PRICING_TIERS', [
    ['min' => 500,  'max' => 999,  'label' => '500–999 homes', 'prices' => [
        'coupon' => 4900, 'single' => 6900, 'double' => 13900, 'triple' => 19900, 'quad_wide' => 26900, 'quad_tall' => 26900,
    ]],
    ['min' => 1000, 'max' => 1499, 'label' => '1,000–1,499 homes', 'prices' => [
        'coupon' => 5900, 'single' => 8900, 'double' => 16900, 'triple' => 24900, 'quad_wide' => 32900, 'quad_tall' => 32900,
    ]],
    ['min' => 1500, 'max' => 1999, 'label' => '1,500–1,999 homes', 'prices' => [
        'coupon' => 6900, 'single' => 10900, 'double' => 19900, 'triple' => 29900, 'quad_wide' => 38900, 'quad_tall' => 38900,
    ]],
    ['min' => 2000, 'max' => 2500, 'label' => '2,000–2,500 homes', 'prices' => [
        'coupon' => 7900, 'single' => 14900, 'double' => 27900, 'triple' => 37900, 'quad_wide' => 46900, 'quad_tall' => 46900,
    ]],
]);

/**
 * Get the pricing tier for a given household count.
 * Returns the tier array or null if out of range.
 */
function getCardPricingTier($households) {
    foreach (CARD_PRICING_TIERS as $tier) {
        if ($households >= $tier['min'] && $households <= $tier['max']) {
            return $tier;
        }
    }
    // If above max tier, use the highest tier
    if ($households > 2500) {
        return CARD_PRICING_TIERS[count(CARD_PRICING_TIERS) - 1];
    }
    // If below min tier, use the lowest tier
    if ($households < 500) {
        return CARD_PRICING_TIERS[0];
    }
    return null;
}

/**
 * Sync per-card spot prices based on household count.
 * Inserts or updates rows in card_spot_prices for every active spot type.
 * If $overrideExisting is false, only inserts missing rows (preserves manual overrides).
 */
function syncCardPricing($cardId, $households, $overrideExisting = true) {
    $db = getDB();
    $tier = getCardPricingTier($households);
    if (!$tier) return;

    $spotTypes = $db->query("SELECT id, name FROM " . getTable('card_spot_types') . " WHERE is_active = 1")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($spotTypes as $st) {
        $priceCents = $tier['prices'][$st['name']] ?? null;
        if ($priceCents === null) continue;

        if ($overrideExisting) {
            $stmt = $db->prepare("
                INSERT INTO " . getTable('card_spot_prices') . " (card_id, spot_type_id, price_cents)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE price_cents = VALUES(price_cents)
            ");
        } else {
            $stmt = $db->prepare("
                INSERT IGNORE INTO " . getTable('card_spot_prices') . " (card_id, spot_type_id, price_cents)
                VALUES (?, ?, ?)
            ");
        }
        $stmt->execute([$cardId, $st['id'], $priceCents]);
    }
}

/**
 * Get the price for a specific card + spot type.
 * Falls back to global spot type price if no per-card price exists.
 */
function getCardSpotPrice($cardId, $spotTypeId) {
    $db = getDB();
    $stmt = $db->prepare("SELECT price_cents FROM " . getTable('card_spot_prices') . " WHERE card_id = ? AND spot_type_id = ?");
    $stmt->execute([$cardId, $spotTypeId]);
    $price = $stmt->fetchColumn();
    if ($price !== false) {
        return (int)$price;
    }
    // Fallback to global price
    $stmt = $db->prepare("SELECT price_cents FROM " . getTable('card_spot_types') . " WHERE id = ?");
    $stmt->execute([$spotTypeId]);
    return (int)$stmt->fetchColumn();
}

// ── Card Position Helpers ──

/**
 * Generate default 16 positions (8 singles per side) for a card.
 * Layout: 2 columns x 4 rows per side.
 */
function generateDefaultPositions($cardId) {
    $db = getDB();

    // Get the 'single' spot type ID
    $stmt = $db->prepare("SELECT id FROM " . getTable('card_spot_types') . " WHERE name = 'single'");
    $stmt->execute();
    $singleTypeId = (int)$stmt->fetchColumn();
    if (!$singleTypeId) {
        throw new Exception('Single spot type not found. Run setup first.');
    }

    $stmt = $db->prepare("
        INSERT INTO " . getTable('card_positions') . " (card_id, label, side, spot_type_id, grid_row, grid_col, row_span, col_span, display_order)
        VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)
    ");

    $order = 0;
    foreach (['front' => 'A', 'back' => 'B'] as $side => $prefix) {
        $num = 1;
        for ($row = 1; $row <= 2; $row++) {
            for ($col = 1; $col <= 4; $col++) {
                $label = $prefix . $num;
                $stmt->execute([$cardId, $label, $side, $singleTypeId, $row, $col, ++$order]);
                $num++;
            }
        }
    }
}

/**
 * Get all positions for a card with their current order status.
 * Returns positions LEFT JOINed with active orders and categories.
 */
function getCardPositions($cardId) {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT p.id AS position_id, p.label, p.side, p.grid_row, p.grid_col, p.row_span, p.col_span, p.display_order,
               st.id AS spot_type_id, st.display_name AS spot_name, st.dimensions,
               COALESCE(csp.price_cents, st.price_cents) AS price_cents,
               st.spots_used, st.name AS spot_type_name,
               o.id AS order_id, o.status AS order_status,
               cc.name AS category_name
        FROM " . getTable('card_positions') . " p
        JOIN " . getTable('card_spot_types') . " st ON st.id = p.spot_type_id
        LEFT JOIN " . getTable('card_spot_prices') . " csp ON csp.card_id = p.card_id AND csp.spot_type_id = st.id
        LEFT JOIN " . getTable('card_orders') . " o ON o.position_id = p.id AND o.status IN ('pending','paid')
        LEFT JOIN " . getTable('card_categories') . " cc ON cc.id = o.card_category_id
        WHERE p.card_id = ?
        ORDER BY p.side, p.display_order
    ");
    $stmt->execute([$cardId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Group positions by side and determine display status for each.
 * Returns ['front' => [...], 'back' => [...]] with 'status' key added.
 */
function getPositionsBySize($positions) {
    $grouped = ['front' => [], 'back' => []];
    foreach ($positions as $pos) {
        if ($pos['order_status'] === 'paid') {
            $pos['status'] = 'filled';
        } elseif ($pos['order_status'] === 'pending') {
            $pos['status'] = 'pending';
        } else {
            $pos['status'] = 'available';
        }
        $grouped[$pos['side']][] = $pos;
    }
    return $grouped;
}

// Set timezone
date_default_timezone_set('America/New_York');
?>