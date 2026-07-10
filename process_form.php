<?php
/**
 * SECURE FORM PROCESSOR - VPS Version
 * Handles advertising form submissions
 */

// Error handling
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Load secure config (cPanel). On Railway these files are absent; config.php
// supplies the DB connection, GHL helper, and reCAPTCHA verify from env vars.
define('DB_CONFIG_LOADED', true);
$__secure = dirname(__FILE__) . '/../secure/';
if (is_file($__secure . 'db_config.php'))        { require_once $__secure . 'db_config.php'; }
if (is_file($__secure . 'ghl_helper.php'))       { require_once $__secure . 'ghl_helper.php'; }
require_once dirname(__FILE__) . '/config.php';
if (is_file($__secure . 'recaptcha_config.php')) { require_once $__secure . 'recaptcha_config.php'; }

// Get database connection
try {
    $conn = getSecureMySQLiConnection();
} catch (Exception $e) {
    error_log('Database Connection Failed: ' . $e->getMessage());
    die('Database connection error. Please try again later.');
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die('Invalid request method.');
}

// CSRF Protection — hard reject
if (!validateCSRFToken($_POST['csrf_token'] ?? '')) {
    error_log('CSRF token validation failed from IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    http_response_code(400);
    die('Invalid session. Please reload the page and try again.');
}

// reCAPTCHA v3 — silent redirect on bot score; fail-open on Google outage
$recaptcha_result = verifyRecaptcha($_POST['recaptcha_token'] ?? '', 'advertise_submit');
if ($recaptcha_result === false) {
    error_log('Spam blocked (reCAPTCHA fail) from IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    header('Location: thank_you.php');
    exit;
}

try {
    // Retrieve and sanitize form data
    $company_name = mysqli_real_escape_string($conn, trim($_POST['company_name'] ?? ''));
    $contact_name = mysqli_real_escape_string($conn, trim($_POST['contact_name'] ?? ''));
    $email = mysqli_real_escape_string($conn, trim($_POST['email'] ?? ''));
    $phone = mysqli_real_escape_string($conn, trim($_POST['phone'] ?? ''));
    $notes = mysqli_real_escape_string($conn, trim($_POST['notes'] ?? ''));
    
    // Validate email
    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        die('Invalid email address.');
    }
    
    // Location and pricing fields
    $location = mysqli_real_escape_string($conn, trim($_POST['location'] ?? ''));
    $distribution_reach = mysqli_real_escape_string($conn, trim($_POST['distribution_reach'] ?? ''));
    $ad_size = mysqli_real_escape_string($conn, trim($_POST['ad_size'] ?? ''));
    $ad_price = floatval($_POST['ad_price'] ?? 0);
    
    // Build package description
    $package_description = '';
    if ($ad_size && $distribution_reach) {
        $reach_display = $distribution_reach === '5k' ? '5,000' : '10,000';
        $package_description = "{$ad_size} Ad - {$reach_display} households (\${$ad_price})";
    }
    
    // Validate required fields
    if (empty($company_name) || empty($contact_name) || empty($email)) {
        die('Please fill in all required fields: Business Name, Contact Name, and Email.');
    }
    
    // Get IP and user agent
    $ip_address = $_SERVER['REMOTE_ADDR'] ?? null;
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    
    // Insert into leads table
    $stmt = $conn->prepare("
        INSERT INTO leads (
            company_name, contact_name, email, phone, notes,
            location, distribution_reach, ad_size, ad_price, package_description,
            ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    if (!$stmt) {
        error_log("Statement preparation failed: " . $conn->error);
        die("Error processing your request. Please try again.");
    }
    
    $stmt->bind_param(
        "ssssssssdsss",
        $company_name,
        $contact_name,
        $email,
        $phone,
        $notes,
        $location,
        $distribution_reach,
        $ad_size,
        $ad_price,
        $package_description,
        $ip_address,
        $user_agent
    );
    
    if ($stmt->execute()) {
        // Store submission data for the thank-you page, then redirect the
        // browser immediately and do the slow email + GHL work after the
        // connection closes so the user isn't held on SMTP/webhook I/O.
        if (session_status() === PHP_SESSION_NONE) session_start();
        $_SESSION['form_submission'] = [
            'company_name' => $company_name,
            'contact_name' => $contact_name,
            'email' => $email,
            'phone' => $phone,
            'package_description' => $package_description,
            'location' => $location,
        ];

        ob_start();
        header('Location: thank_you.php');
        finishRequestAndContinue();

        // ---- deferred: the browser already got the redirect ----
        // Send notification email to admin
        $to = 'exumandrew@gmail.com';
        $subject = 'New Lead: ' . $company_name;
        
        $message = "New lead submission:\n\n";
        $message .= "===== COMPANY INFORMATION =====\n";
        $message .= "Company: {$company_name}\n";
        $message .= "Contact: {$contact_name}\n";
        $message .= "Email: {$email}\n";
        $message .= "Phone: {$phone}\n";
        $message .= "Category: {$notes}\n\n";
        
        if ($package_description) {
            $message .= "===== PACKAGE SELECTION =====\n";
            $message .= "Location: {$location}\n";
            $message .= "Package: {$package_description}\n\n";
        }
        
        $message .= "===== METADATA =====\n";
        $message .= "IP: " . ($ip_address ?? 'unknown') . "\n";
        $message .= "Submitted: " . date('Y-m-d H:i:s') . "\n";
        
        $headers = "From: no-reply@lowcountrybusinessspotlight.com\r\n";
        $headers .= "Reply-To: {$email}\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        
        appSendMail($to, $subject, $message, $headers, '-f no-reply@lowcountrybusinessspotlight.com');

        $leadSourceText = "Ad Lead";
        if ($location) {
            $leadSourceText .= ": " . $location;
        }

        // Send to GoHighLevel
        $ghlNameParts = preg_split('/\s+/', trim($contact_name), 2);
        $ghlPayload = [
            'firstName'   => $ghlNameParts[0] ?? '',
            'lastName'    => $ghlNameParts[1] ?? '',
            'name'        => $contact_name,
            'email'       => $email,
            'phone'       => $phone,
            'companyName' => $company_name,
            'source'      => $leadSourceText,
            'category'    => $notes,
            'location'    => $location,
            'package'     => $package_description,
            'ad_size'     => $ad_size,
            'distribution_reach' => $distribution_reach,
            'ad_price'    => $ad_price,
            'submitted_at' => date('c'),
        ];
        if (!ghlSend($ghlPayload, 'advertise')) {
            error_log("GHL sync failed for ad lead: $email");
        }

        exit();

    } else {
        error_log("Error inserting lead: " . $stmt->error);
        die("Error processing your request. Please try again.");
    }
    
    $stmt->close();
    
} catch (Exception $e) {
    error_log("Form processing error: " . $e->getMessage());
    die("An error occurred. Please try again later.");
}

$conn->close();
?>