<?php
/**
 * GoHighLevel (LeadConnector) inbound-webhook helper — committed, Railway-friendly.
 *
 * Webhook URLs come from environment variables so no secret lives in the repo:
 *   GHL_WEBHOOK_<KEY>  (per-form, e.g. GHL_WEBHOOK_ADVERTISE) — preferred
 *   GHL_WEBHOOK_URL    (single webhook for all forms; branch by the payload 'source')
 * On cPanel, falls back to the legacy GHL_WEBHOOK_AD_LEAD constant from secure/ghl_helper.php.
 *
 * sendToGHL() is only defined if the cPanel secure/ helper hasn't already defined it,
 * so both environments coexist without a redeclare error.
 */

if (!function_exists('sendToGHL')) {
    /** POST a JSON payload to a GHL Inbound Webhook. Returns true on 2xx. Never throws. */
    function sendToGHL($webhookUrl, array $payload, $timeout = 10) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $webhookUrl,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            return true;
        }
        error_log("GHL webhook failed: HTTP {$httpCode} url=" . parse_url((string)$webhookUrl, PHP_URL_PATH) . " err={$curlErr} body=" . substr((string)$response, 0, 200));
        return false;
    }
}

if (!function_exists('ghlWebhookUrl')) {
    /** Resolve the webhook URL for a form key from env, with cPanel constant fallback. */
    function ghlWebhookUrl($key) {
        $perForm = getenv('GHL_WEBHOOK_' . strtoupper($key));
        if ($perForm) { return $perForm; }
        $generic = getenv('GHL_WEBHOOK_URL');
        if ($generic) { return $generic; }
        if ($key === 'advertise' && defined('GHL_WEBHOOK_AD_LEAD')) { return GHL_WEBHOOK_AD_LEAD; }
        return null;
    }
}

if (!function_exists('ghlSend')) {
    /** Send a lead payload to GHL for the given form key. Adds 'source' if absent. */
    function ghlSend(array $payload, $key) {
        $url = ghlWebhookUrl($key);
        if (!$url) {
            error_log("ghlSend: no GHL webhook configured for key='{$key}' (set GHL_WEBHOOK_" . strtoupper($key) . " or GHL_WEBHOOK_URL)");
            return false;
        }
        if (empty($payload['source'])) { $payload['source'] = $key; }
        return sendToGHL($url, $payload);
    }
}
