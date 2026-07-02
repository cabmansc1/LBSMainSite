<?php
require_once 'config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit;
}

$email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
if (!$email) {
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

try {
    $db = getDB();

    // Create table if it doesn't exist
    $db->exec("CREATE TABLE IF NOT EXISTS directory_newsletter_subscribers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        source VARCHAR(50) DEFAULT 'blog',
        is_active TINYINT(1) DEFAULT 1,
        subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Check if already subscribed
    $stmt = $db->prepare("SELECT id, is_active FROM directory_newsletter_subscribers WHERE email = ?");
    $stmt->execute([$email]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        if ($existing['is_active']) {
            echo json_encode(['success' => true, 'message' => "You're already subscribed!"]);
        } else {
            $db->prepare("UPDATE directory_newsletter_subscribers SET is_active = 1 WHERE id = ?")->execute([$existing['id']]);
            echo json_encode(['success' => true, 'message' => 'Welcome back! You\'ve been re-subscribed.']);
        }
    } else {
        $source = sanitizeInput($_POST['source'] ?? 'blog');
        $stmt = $db->prepare("INSERT INTO directory_newsletter_subscribers (email, source) VALUES (?, ?)");
        $stmt->execute([$email, $source]);

        // Send to GoHighLevel
        if (!ghlSend([
            'email'        => $email,
            'source'       => 'Newsletter: ' . $source,
            'signup_type'  => 'newsletter',
            'origin'       => $source,
            'submitted_at' => date('c'),
        ], 'newsletter')) {
            error_log("GHL sync failed for newsletter subscriber: $email");
        }

        echo json_encode(['success' => true, 'message' => 'Thanks for subscribing! You\'ll hear from us soon.']);
    }
} catch (Exception $e) {
    error_log("Newsletter subscribe error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Something went wrong. Please try again.']);
}
