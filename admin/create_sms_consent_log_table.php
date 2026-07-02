<?php
/**
 * One-time setup: create directory_sms_consent_log for A2P 10DLC audit trail.
 * Idempotent — safe to re-run.
 *
 * Run once via browser (logged in as admin) or CLI.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/campaign_functions.php';

// Require admin (uses the campaign admin session, same as other admin pages)
if (php_sapi_name() !== 'cli') {
    requireCampaignAdminLogin();
}

try {
    $db = getDB();
    $db->exec("CREATE TABLE IF NOT EXISTS directory_sms_consent_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        consent_given TINYINT(1) NOT NULL DEFAULT 0,
        phone VARCHAR(32) NULL,
        email VARCHAR(255) NULL,
        name VARCHAR(255) NULL,
        source_form VARCHAR(100) NOT NULL,
        source_url VARCHAR(500) NULL,
        consent_text_version VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_email (email),
        INDEX idx_created (created_at),
        INDEX idx_consent_given (consent_given)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    echo "OK: directory_sms_consent_log table is ready.\n";
} catch (Exception $e) {
    http_response_code(500);
    echo 'Error: ' . htmlspecialchars($e->getMessage()) . "\n";
}
