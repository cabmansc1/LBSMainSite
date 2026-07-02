<?php
/**
 * reCAPTCHA v3 server-side verification — committed, Railway-friendly.
 *
 * Secret resolves from RECAPTCHA_SECRET_KEY (cPanel secure/recaptcha_config.php)
 * or the RECAPTCHA_SECRET environment variable (Railway). If neither is set,
 * returns null so callers fail open (no false spam blocks).
 *
 * Only defined if secure/recaptcha_helper.php hasn't already defined it.
 *
 * Returns: true = human, false = bot/invalid, null = not configured or Google unreachable.
 */
if (!function_exists('verifyRecaptcha')) {
    function verifyRecaptcha($token, $expected_action, $threshold = 0.5) {
        $secret = (defined('RECAPTCHA_SECRET_KEY') && RECAPTCHA_SECRET_KEY !== '')
            ? RECAPTCHA_SECRET_KEY
            : getenv('RECAPTCHA_SECRET');
        if (!$secret) {
            error_log('verifyRecaptcha: no secret configured; failing open');
            return null;
        }
        if (empty($token)) {
            error_log('verifyRecaptcha: empty token submitted');
            return false;
        }

        $ch = curl_init('https://www.google.com/recaptcha/api/siteverify');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query([
                'secret'   => $secret,
                'response' => $token,
                'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_CONNECTTIMEOUT => 3,
        ]);
        $raw = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            error_log('verifyRecaptcha: cURL error — ' . $err);
            return null;
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            error_log('verifyRecaptcha: malformed JSON from Google — ' . substr($raw, 0, 200));
            return null;
        }

        $success = !empty($data['success']);
        $score   = isset($data['score']) ? (float)$data['score'] : 0.0;
        $action  = $data['action'] ?? '';

        if (!$success || $score < $threshold || $action !== $expected_action) {
            error_log(sprintf(
                'verifyRecaptcha FAIL: success=%s score=%.2f action=%s expected=%s errors=%s',
                $success ? 'true' : 'false', $score, $action, $expected_action,
                isset($data['error-codes']) ? implode(',', $data['error-codes']) : 'none'
            ));
            return false;
        }
        return true;
    }
}
