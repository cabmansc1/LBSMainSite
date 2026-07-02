<?php
// At the very top of admin.php, replace the admin check section:

require_once 'config.php';
require_once 'User.php';
require_once 'Business.php';

// Secure admin authentication
requireLogin();

$currentUser = getCurrentUser();
if (!$currentUser) {
    header('Location: login.php');
    exit;
}

// Check admin role from database
$db = getDB();
$stmt = $db->prepare("SELECT is_admin FROM users WHERE id = ? AND is_admin = 1");
$stmt->execute([$currentUser['id']]);

if (!$stmt->fetch()) {
    logActivity('unauthorized_admin_access_attempt', [
        'user_id' => $currentUser['id'],
        'email' => $currentUser['email']
    ]);
    header('Location: dashboard.php?error=unauthorized');
    exit;
}

// Rest of admin.php code continues...