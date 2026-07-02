<?php
/**
 * SMS consent audit logger — A2P 10DLC compliance.
 *
 * Record consent state every time a phone number is submitted through a form
 * that includes includes/sms_consent.php. Failures are logged to error_log
 * but do NOT block the parent submission (consent logging is best-effort).
 *
 * Setup: run admin/create_sms_consent_log_table.php once before deploying.
 *
 * Usage:
 *   require_once __DIR__ . '/includes/sms_consent_logger.php';
 *   logSmsConsent([
 *       'consent_given' => !empty($_POST['sms_consent']),
 *       'phone'         => $phone,
 *       'email'         => $email,
 *       'name'          => $first . ' ' . $last,
 *       'source_form'   => 'directory-signup',
 *   ]);
 */

if (!defined('SMS_CONSENT_TEXT_VERSION')) {
    // Bump this string when sms_consent.php wording changes — old records keep their version.
    define('SMS_CONSENT_TEXT_VERSION', 'v1-2026-05-08');
}

function logSmsConsent(array $data): bool {
    $phone = $data['phone'] ?? null;
    if (empty($phone)) {
        return false; // nothing to log when no number was submitted
    }

    try {
        $db = getDB();
        $stmt = $db->prepare("
            INSERT INTO directory_sms_consent_log
              (consent_given, phone, email, name, source_form, source_url, consent_text_version, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        return $stmt->execute([
            !empty($data['consent_given']) ? 1 : 0,
            substr((string)$phone, 0, 32),
            isset($data['email']) ? substr((string)$data['email'], 0, 255) : null,
            isset($data['name']) ? substr((string)$data['name'], 0, 255) : null,
            substr((string)($data['source_form'] ?? 'unknown'), 0, 100),
            isset($_SERVER['HTTP_REFERER']) ? substr($_SERVER['HTTP_REFERER'], 0, 500) : null,
            SMS_CONSENT_TEXT_VERSION,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null,
        ]);
    } catch (Throwable $e) {
        error_log('logSmsConsent failed: ' . $e->getMessage());
        return false;
    }
}
