<?php
/**
 * Find Your Perfect Ad Quiz Lead Capture
 * Saves lead to database and sends email with recommendation
 */

// Error handling
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Set JSON content type for response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit();
}

// Load config: secure DB on cPanel, env vars on Railway (both via config.php,
// which also provides appSendMail() and ghlSend()).
define('DB_CONFIG_LOADED', true);
$db_config_path = dirname(__FILE__) . '/../secure/db_config.php';
if (file_exists($db_config_path)) { require_once $db_config_path; }
require_once dirname(__FILE__) . '/config.php';

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid JSON input');
    }

    // Extract and sanitize data
    $email = trim($input['email'] ?? '');
    $quizData = $input['quizData'] ?? [];

    // Validate required fields
    if (empty($email)) {
        throw new Exception('Email is required');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email address');
    }

    // Extract quiz data
    $businessType = $quizData['businessType'] ?? '';
    $goal = $quizData['goal'] ?? '';
    $mailingSize = intval($quizData['mailingSize'] ?? 0);
    $budget = intval($quizData['budget'] ?? 0);
    $recommendation = $quizData['recommendation'] ?? [];

    // Get database connection
    $conn = getSecureMySQLiConnection();

    // Sanitize for database
    $email = mysqli_real_escape_string($conn, $email);
    $ip_address = $_SERVER['REMOTE_ADDR'] ?? null;
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? null;

    // Business type labels
    $businessLabels = [
        'restaurant' => 'Restaurant / Food Service',
        'home-services' => 'Home Services',
        'health' => 'Health & Beauty',
        'retail' => 'Retail Store',
        'professional' => 'Professional Services',
        'fitness' => 'Fitness / Gym'
    ];

    // Goal labels
    $goalLabels = [
        'new-customers' => 'Get New Customers',
        'brand-awareness' => 'Build Brand Awareness',
        'promote-offer' => 'Promote Special Offer',
        'grand-opening' => 'Grand Opening'
    ];

    $businessLabel = $businessLabels[$businessType] ?? $businessType;
    $goalLabel = $goalLabels[$goal] ?? $goal;

    // Build notes with quiz results
    $notes = "Find Your Perfect Ad Quiz Lead\n";
    $notes .= "------------------------------\n";
    $notes .= "Business Type: {$businessLabel}\n";
    $notes .= "Goal: {$goalLabel}\n";
    $notes .= "Mailing Size: " . number_format($mailingSize) . " households\n";
    $notes .= "Budget: $" . number_format($budget) . "\n";
    if (!empty($recommendation)) {
        $notes .= "\nRecommendation:\n";
        $notes .= "Ad Size: " . ($recommendation['adSize'] ?? 'N/A') . "\n";
        $notes .= "Price: $" . number_format($recommendation['price'] ?? 0) . "\n";
    }

    $notes = mysqli_real_escape_string($conn, $notes);

    // Build package description
    $package_description = "Quiz Lead - " . number_format($mailingSize) . " households, $" . number_format($budget) . " budget";
    $package_description = mysqli_real_escape_string($conn, $package_description);

    // Insert into leads table
    $stmt = $conn->prepare("
        INSERT INTO leads (
            company_name, contact_name, email, phone, notes,
            location, distribution_reach, ad_size, ad_price, package_description,
            ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");

    if (!$stmt) {
        throw new Exception("Database error: " . $conn->error);
    }

    $company_name = "Quiz Lead - " . $businessLabel;
    $contact_name = "";
    $phone = "";
    $location = "Find Your Ad Quiz";
    $distribution_reach = strval($mailingSize);
    $ad_size = $recommendation['adSize'] ?? "Quiz";
    $ad_price = floatval($budget);

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

    if (!$stmt->execute()) {
        throw new Exception("Failed to save lead: " . $stmt->error);
    }

    $stmt->close();
    $conn->close();

    // Respond to the browser immediately, then do the slow work (SMTP email +
    // GHL webhook) after the connection closes so the submit doesn't wait ~5s
    // on network I/O. appSendMail() and ghlSend() both swallow their own errors.
    ob_start();
    echo json_encode(['success' => true, 'message' => 'Lead saved']);
    finishRequestAndContinue();

    // ---- deferred: the user already has their success response ----
    // Send email to the lead with their recommendation
    $userSubject = "Your Perfect Ad Recommendation - Lowcountry Business Spotlight";

    $userMessage = "Hi there!\n\n";
    $userMessage .= "Thank you for taking our Find Your Perfect Ad quiz! Based on your answers, here's your personalized recommendation:\n\n";
    $userMessage .= "========================================\n";
    $userMessage .= "      YOUR QUIZ RESULTS\n";
    $userMessage .= "========================================\n\n";

    $userMessage .= "YOUR BUSINESS PROFILE\n";
    $userMessage .= "---------------------\n";
    $userMessage .= "Business Type: {$businessLabel}\n";
    $userMessage .= "Primary Goal: {$goalLabel}\n";
    $userMessage .= "Target Reach: " . number_format($mailingSize) . " households\n";
    $userMessage .= "Budget Range: $" . number_format($budget) . "\n\n";

    if (!empty($recommendation)) {
        $userMessage .= "OUR RECOMMENDATION\n";
        $userMessage .= "------------------\n";
        $userMessage .= "Ad Size: " . ($recommendation['adSize'] ?? 'Contact us for details') . "\n";
        $userMessage .= "Price: $" . number_format($recommendation['price'] ?? 0) . "\n\n";
    }

    $userMessage .= "========================================\n\n";

    $userMessage .= "WHY DIRECT MAIL WORKS\n";
    $userMessage .= "---------------------\n";
    $userMessage .= "• 90% of direct mail gets opened (vs 20% for email)\n";
    $userMessage .= "• Average response rate of 0.5-2.5%\n";
    $userMessage .= "• Tangible format creates lasting impressions\n";
    $userMessage .= "• Perfect for targeting local customers\n\n";

    $userMessage .= "READY TO GET STARTED?\n";
    $userMessage .= "Reserve your spot on our next postcard mailing:\n";
    $userMessage .= "https://lowcountrybusinessspotlight.com/advertise.php\n\n";

    $userMessage .= "Or give us a call: (843) 212-2969\n\n";

    $userMessage .= "Want to see your potential ROI? Try our calculator:\n";
    $userMessage .= "https://lowcountrybusinessspotlight.com/roi-calculator.php\n\n";

    $userMessage .= "We'd love to help you reach thousands of local customers!\n\n";

    $userMessage .= "Best regards,\n";
    $userMessage .= "The Lowcountry Business Spotlight Team\n\n";

    $userMessage .= "---\n";
    $userMessage .= "Lowcountry Business Spotlight\n";
    $userMessage .= "Bringing Local Businesses Together To Share The Cost of Advertising\n";
    $userMessage .= "https://lowcountrybusinessspotlight.com\n";

    $userHeaders = "From: Lowcountry Business Spotlight <hello@lbspotlight.com>\r\n";
    $userHeaders .= "Reply-To: hello@lbspotlight.com\r\n";
    $userHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $userHeaders .= "X-Mailer: PHP/" . phpversion();

    appSendMail($email, $userSubject, $userMessage, $userHeaders);

    // Send notification to admin
    $adminSubject = "New Quiz Lead: {$businessLabel}";

    $adminMessage = "New lead from Find Your Perfect Ad Quiz:\n\n";
    $adminMessage .= "===== CONTACT INFO =====\n";
    $adminMessage .= "Email: {$email}\n\n";

    $adminMessage .= "===== QUIZ ANSWERS =====\n";
    $adminMessage .= "Business Type: {$businessLabel}\n";
    $adminMessage .= "Goal: {$goalLabel}\n";
    $adminMessage .= "Mailing Size: " . number_format($mailingSize) . " households\n";
    $adminMessage .= "Budget: $" . number_format($budget) . "\n\n";

    if (!empty($recommendation)) {
        $adminMessage .= "===== RECOMMENDATION =====\n";
        $adminMessage .= "Ad Size: " . ($recommendation['adSize'] ?? 'N/A') . "\n";
        $adminMessage .= "Price: $" . number_format($recommendation['price'] ?? 0) . "\n\n";
    }

    $adminMessage .= "===== METADATA =====\n";
    $adminMessage .= "IP: " . ($ip_address ?? 'unknown') . "\n";
    $adminMessage .= "Submitted: " . date('Y-m-d H:i:s') . "\n";

    $adminHeaders = "From: no-reply@lowcountrybusinessspotlight.com\r\n";
    $adminHeaders .= "Reply-To: {$email}\r\n";
    $adminHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";

    appSendMail('exumandrew@gmail.com', $adminSubject, $adminMessage, $adminHeaders);

    // Send lead to GoHighLevel
    $ghlOk = ghlSend([
        'email'             => $email,
        'source'            => 'Quiz Lead: ' . $businessLabel,
        'business_type'     => $businessLabel,
        'goal'              => $goalLabel,
        'mailing_size'      => $mailingSize,
        'budget'            => $budget,
        'recommended_ad'    => $recommendation['adSize'] ?? '',
        'recommended_price' => $recommendation['price'] ?? '',
        'submitted_at'      => date('c'),
    ], 'quiz');
    if (!$ghlOk) {
        error_log("GHL sync failed for quiz lead: $email");
    }
    exit;

} catch (Exception $e) {
    error_log("Quiz Lead Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
