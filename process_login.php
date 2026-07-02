<?php
/**
 * SECURE LOGIN PROCESSOR
 * Handles user authentication with rate limiting and security measures
 */

session_start();

// Production error handling
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Load configuration
require_once 'config.php';

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: login.php');
    exit();
}

// CSRF Protection (if you add it to login form)
if (isset($_POST['csrf_token']) && !validateCSRFToken($_POST['csrf_token'])) {
    logActivity('login_csrf_failed', ['ip' => $_SERVER['REMOTE_ADDR']]);
    header('Location: login.php?error=security');
    exit();
}

try {
    // Get credentials
    $username = sanitizeInput($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    // Validate inputs
    if (empty($username) || empty($password)) {
        throw new Exception('Username and password are required');
    }
    
    // Check rate limiting
    checkLoginAttempts($username);
    
    // Get database connection
    $db = getDB();
    
    // Query user
    $stmt = $db->prepare("
        SELECT user_id, username, password 
        FROM users 
        WHERE username = ? AND is_active = 1
        LIMIT 1
    ");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    // Verify credentials
    if (!$user || !verifyPassword($password, $user['password'])) {
        logActivity('login_failed', [
            'username' => $username,
            'ip' => $_SERVER['REMOTE_ADDR']
        ]);
        
        // Generic error message
        throw new Exception('Invalid username or password');
    }
    
    // Regenerate session ID for security
    session_regenerate_id(true);
    
    // Set session variables
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['last_activity'] = time();
    $_SESSION['login_time'] = time();
    
    // Clear login attempts
    unset($_SESSION['login_attempts']);
    
    // Update last login in database
    $stmt = $db->prepare("
        UPDATE users 
        SET last_login = NOW(), last_login_ip = ? 
        WHERE user_id = ?
    ");
    $stmt->execute([
        $_SERVER['REMOTE_ADDR'] ?? null,
        $user['user_id']
    ]);
    
    // Log successful login
    logActivity('login_success', [
        'user_id' => $user['user_id'],
        'username' => $user['username']
    ]);
    
    // Redirect to dashboard or intended page
    $redirect = $_SESSION['redirect_after_login'] ?? 'dashboard.php';
    unset($_SESSION['redirect_after_login']);
    
    header('Location: ' . $redirect);
    exit();
    
} catch (Exception $e) {
    // Log error
    error_log("Login error: " . $e->getMessage());
    
    // Redirect with error
    header('Location: login.php?error=' . urlencode($e->getMessage()));
    exit();
}
?>