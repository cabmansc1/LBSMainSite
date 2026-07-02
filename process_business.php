<?php
/**
 * SECURE BUSINESS PROCESSOR - VPS Version
 * Handles business submissions from dashboard
 */

session_start();

// Check authentication
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

// Error handling
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Load secure database configuration
define('DB_CONFIG_LOADED', true);
require_once dirname(__FILE__) . '/../secure/db_config.php';

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

try {
    $user_id = $_SESSION['user_id'];
    
    // Sanitize inputs
    $business_name = mysqli_real_escape_string($conn, trim($_POST['business_name'] ?? ''));
    $category = mysqli_real_escape_string($conn, trim($_POST['category'] ?? ''));
    $description = mysqli_real_escape_string($conn, trim($_POST['description'] ?? ''));
    $address = mysqli_real_escape_string($conn, trim($_POST['address'] ?? ''));
    $state = mysqli_real_escape_string($conn, trim($_POST['state'] ?? ''));
    $zip = mysqli_real_escape_string($conn, trim($_POST['zip'] ?? ''));
    $phone = mysqli_real_escape_string($conn, trim($_POST['phone'] ?? ''));
    $website = mysqli_real_escape_string($conn, trim($_POST['website'] ?? ''));
    
    // Validate required fields
    if (empty($business_name)) {
        die('Business name is required.');
    }
    
    // Prepare insert statement
    $stmt = $conn->prepare("
        INSERT INTO businesses 
        (user_id, name, category, description, address, state, zip, phone, website, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    if ($stmt === false) {
        error_log("Prepare failed: " . $conn->error);
        die("Error processing your request.");
    }
    
    $stmt->bind_param(
        "issssssss", 
        $user_id, 
        $business_name, 
        $category, 
        $description, 
        $address, 
        $state, 
        $zip, 
        $phone, 
        $website
    );
    
    if ($stmt->execute()) {
        error_log("Business added successfully for user_id: {$user_id}");
        header("Location: dashboard.php?message=Business+added+successfully");
        exit();
    } else {
        error_log("Error executing statement: " . $stmt->error);
        die("Error processing your request.");
    }
    
    $stmt->close();
    
} catch (Exception $e) {
    error_log("Business processing error: " . $e->getMessage());
    die("An error occurred. Please try again later.");
}

$conn->close();
?>