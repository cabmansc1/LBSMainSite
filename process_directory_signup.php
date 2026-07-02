<?php
/**
 * DIRECTORY SIGNUP PROCESSOR
 * Uses secure database configuration
 */

// Error handling
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Load secure database configuration
define('DB_CONFIG_LOADED', true);
require_once dirname(__FILE__) . '/../secure/db_config.php';
require_once dirname(__FILE__) . '/../secure/pipedrive_helper.php';

// Get database connection
try {
    $conn = getSecureMySQLiConnection();
} catch (Exception $e) {
    error_log('Database Connection Failed: ' . $e->getMessage());
    die('Database connection error. Please try again later.');
}

// Only process POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die('Invalid request method.');
}

$form_type = trim($_POST['form_type'] ?? '');

if ($form_type === 'directory_notification') {
    handleDirectoryNotification($conn);
} elseif ($form_type === 'directory_signup') {
    handleDirectorySignup($conn);
} else {
    die('Invalid form submission.');
}

$conn->close();

function handleDirectoryNotification($conn) {
    $email = trim($_POST['email'] ?? '');
    
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        die('Invalid email address provided.');
    }
    
    $stmt = $conn->prepare("INSERT INTO directory_notifications (email, signup_date) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE signup_date = NOW()");
    
    if (!$stmt) {
        error_log("Statement preparation failed: " . $conn->error);
        die("Error processing your request.");
    }
    
    $stmt->bind_param("s", $email);
    
    if ($stmt->execute()) {
        // Send confirmation email
        $to = $email;
        $subject = 'Thank you for your interest in Lowcountry Business Spotlight Directory';
        
        $message = "Dear Subscriber,\n\n"
                 . "Thank you for signing up to be notified about the launch of our Business Directory!\n\n"
                 . "You'll be among the first to know when we:\n"
                 . "• Launch the directory in Q1 2026\n"
                 . "• Open early access for founding members\n"
                 . "• Announce special pricing and promotions\n"
                 . "• Release new features and updates\n\n"
                 . "In the meantime, if you have a business and want to get listed early, you can:\n"
                 . "• Visit our directory signup page\n"
                 . "• Contact us directly at exumandrew@gmail.com\n"
                 . "• Call us at (843) 212-2969\n\n"
                 . "We're excited to help connect local businesses with customers across the Lowcountry!\n\n"
                 . "Best regards,\n"
                 . "The Lowcountry Business Spotlight Team\n\n"
                 . "---\n"
                 . "Lowcountry Business Spotlight\n"
                 . "(843) 212-2969\n"
                 . "exumandrew@gmail.com";
        
        $headers = "From: no-reply@lowcountrybusinessspotlight.com\r\n";
        $headers .= "Reply-To: exumandrew@gmail.com\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        
        appSendMail($to, $subject, $message, $headers);
        
        // Notify admin
        $admin_to = 'exumandrew@gmail.com';
        $admin_subject = 'New Directory Launch Notification Signup';
        $admin_message = "Someone signed up for directory launch notifications:\n\nEmail: $email\nDate: " . date('Y-m-d H:i:s');
        
        appSendMail($admin_to, $admin_subject, $admin_message, $headers);

        // Send to Pipedrive
        $pipedriveNote = "Directory Launch Notification\n";
        $pipedriveNote .= "-----------------------------\n";
        $pipedriveNote .= "Signed up for directory launch updates\n";
        $pipedriveNote .= "Date: " . date('Y-m-d H:i:s');

        sendToPipedrive(
            '',
            $email,
            '',
            PIPEDRIVE_LABEL_DIRECTORY_SIGNUP,
            "Directory: Launch Notification",
            $pipedriveNote
        );

        header('Location: directory-coming-soon.php?success=1');
        exit();
    } else {
        error_log("Error saving notification: " . $stmt->error);
        die("Error processing your request.");
    }
    
    $stmt->close();
}

function handleDirectorySignup($conn) {
    // Retrieve and sanitize form data
    $business_name = mysqli_real_escape_string($conn, trim($_POST['business_name'] ?? ''));
    $business_category = mysqli_real_escape_string($conn, trim($_POST['business_category'] ?? ''));
    $business_description = mysqli_real_escape_string($conn, trim($_POST['business_description'] ?? ''));
    $contact_name = mysqli_real_escape_string($conn, trim($_POST['contact_name'] ?? ''));
    $phone = mysqli_real_escape_string($conn, trim($_POST['phone'] ?? ''));
    $email = mysqli_real_escape_string($conn, trim($_POST['email'] ?? ''));
    $website = mysqli_real_escape_string($conn, trim($_POST['website'] ?? ''));
    $street_address = mysqli_real_escape_string($conn, trim($_POST['street_address'] ?? ''));
    $city = mysqli_real_escape_string($conn, trim($_POST['city'] ?? ''));
    $zip_code = mysqli_real_escape_string($conn, trim($_POST['zip_code'] ?? ''));

    // Validate email
    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        die('Invalid email address.');
    }

    // A2P 10DLC: record consent state for audit trail (best-effort, won't block submission)
    require_once dirname(__FILE__) . '/config.php';
    require_once dirname(__FILE__) . '/includes/sms_consent_logger.php';
    logSmsConsent([
        'consent_given' => !empty($_POST['sms_consent']),
        'phone'         => trim($_POST['phone'] ?? ''),
        'email'         => trim($_POST['email'] ?? ''),
        'name'          => trim($_POST['contact_name'] ?? ''),
        'source_form'   => 'directory-signup',
    ]);
    
    // Service areas
    $service_areas = '';
    if (isset($_POST['service_areas']) && is_array($_POST['service_areas'])) {
        $clean_areas = array_map(function($area) use ($conn) {
            return mysqli_real_escape_string($conn, $area);
        }, $_POST['service_areas']);
        $service_areas = implode(', ', $clean_areas);
    }
    
    // Business hours
    $business_hours = [];
    $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    foreach ($days as $day) {
        $open = trim($_POST[$day . '_open'] ?? '');
        $close = trim($_POST[$day . '_close'] ?? '');
        if ($open && $close) {
            $business_hours[$day] = $open . ' - ' . $close;
        } else {
            $business_hours[$day] = 'Closed';
        }
    }
    $business_hours_string = mysqli_real_escape_string($conn, json_encode($business_hours));
    
    // Social media
    $facebook_url = mysqli_real_escape_string($conn, trim($_POST['facebook_url'] ?? ''));
    $instagram_url = mysqli_real_escape_string($conn, trim($_POST['instagram_url'] ?? ''));
    $linkedin_url = mysqli_real_escape_string($conn, trim($_POST['linkedin_url'] ?? ''));
    $google_business_url = mysqli_real_escape_string($conn, trim($_POST['google_business_url'] ?? ''));
    
    // Additional info
    $years_in_business = mysqli_real_escape_string($conn, trim($_POST['years_in_business'] ?? ''));
    $employee_count = mysqli_real_escape_string($conn, trim($_POST['employee_count'] ?? ''));
    
    $special_features = '';
    if (isset($_POST['special_features']) && is_array($_POST['special_features'])) {
        $clean_features = array_map(function($feature) use ($conn) {
            return mysqli_real_escape_string($conn, $feature);
        }, $_POST['special_features']);
        $special_features = implode(', ', $clean_features);
    }
    
    $additional_notes = mysqli_real_escape_string($conn, trim($_POST['additional_notes'] ?? ''));
    $preferred_plan = mysqli_real_escape_string($conn, trim($_POST['preferred_plan'] ?? ''));
    
    // Validate required fields
    if (empty($business_name) || empty($business_category) || empty($business_description) || 
        empty($contact_name) || empty($phone) || empty($email) || empty($street_address) || 
        empty($city) || empty($zip_code) || empty($preferred_plan)) {
        die('Please fill in all required fields.');
    }
    
    // Insert into database
    $stmt = $conn->prepare("INSERT INTO directory_signups (
        business_name, business_category, business_description, contact_name, phone, email, website,
        street_address, city, zip_code, service_areas, business_hours, facebook_url, instagram_url,
        linkedin_url, google_business_url, years_in_business, employee_count, special_features,
        additional_notes, preferred_plan, signup_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
    
    if (!$stmt) {
        error_log("Statement preparation failed: " . $conn->error);
        die("Error processing your request. Please try again.");
    }
    
    $stmt->bind_param(
        "sssssssssssssssssssss",
        $business_name, $business_category, $business_description, $contact_name, $phone, $email, $website,
        $street_address, $city, $zip_code, $service_areas, $business_hours_string, $facebook_url,
        $instagram_url, $linkedin_url, $google_business_url, $years_in_business, $employee_count,
        $special_features, $additional_notes, $preferred_plan
    );
    
    if ($stmt->execute()) {
        // Send admin notification
        $to = 'exumandrew@gmail.com';
        $subject = 'New Business Directory Signup - ' . $business_name;
        $message = "New directory signup:\n\nBusiness: $business_name\nContact: $contact_name\nEmail: $email\nPhone: $phone\nPlan: $preferred_plan";
        
        $headers = "From: no-reply@lowcountrybusinessspotlight.com\r\n";
        $headers .= "Reply-To: $email\r\n";
        
        appSendMail($to, $subject, $message, $headers);
        
        // Send customer confirmation
        appSendMail($email, 'Thank you for joining our directory', "Dear $contact_name,\n\nThank you for signing up! We'll contact you within 1-2 business days.", $headers);

        // Send to Pipedrive
        $pipedriveNote = "Directory Signup\n";
        $pipedriveNote .= "-----------------\n";
        $pipedriveNote .= "Business: {$business_name}\n";
        $pipedriveNote .= "Category: {$business_category}\n";
        $pipedriveNote .= "Address: {$street_address}, {$city} {$zip_code}\n";
        $pipedriveNote .= "Service Areas: {$service_areas}\n";
        $pipedriveNote .= "Plan: {$preferred_plan}\n";
        $pipedriveNote .= "Years in Business: {$years_in_business}\n";
        $pipedriveNote .= "Website: {$website}\n";
        $pipedriveNote .= "Date: " . date('Y-m-d H:i:s');

        sendToPipedrive(
            $contact_name,
            $email,
            $phone,
            PIPEDRIVE_LABEL_DIRECTORY_SIGNUP,
            "Directory: " . $preferred_plan,
            $pipedriveNote,
            $business_name
        );

        header('Location: directory-thank-you.php');
        exit();
    } else {
        error_log("Error during signup: " . $stmt->error);
        die("Error processing your request. Please try again.");
    }
    
    $stmt->close();
}
?>