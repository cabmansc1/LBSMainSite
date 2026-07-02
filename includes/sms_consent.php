<?php
/**
 * SMS opt-in consent block — A2P 10DLC compliance.
 *
 * Include inside any <form> that collects a phone number, near the submit button.
 * The form handler should treat the `sms_consent` field as optional metadata
 * (presence = "1" means the user opted in to SMS).
 *
 * Pages that include this should also set `$hideChatWidget = true;` BEFORE
 * footer.php is included, so the LeadConnector widget does not render as a
 * second opt-in source on the same page.
 */
?>
<div class="sms-consent" style="margin: 18px 0; padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; line-height: 1.55; color: #475569;">
    <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; margin: 0;">
        <input type="checkbox" name="sms_consent" value="1" style="margin-top: 3px; flex-shrink: 0; width: 16px; height: 16px; cursor: pointer;">
        <span>
            By checking this box, I agree to receive promotional and marketing SMS text messages from Lowcountry Business Spotlight at the phone number provided. Message frequency varies. Message and data rates may apply. Reply <strong>STOP</strong> to unsubscribe at any time, or <strong>HELP</strong> for help. Consent is not a condition of purchase. View our <a href="/privacy.php" target="_blank" rel="noopener">Privacy Policy</a> and <a href="/terms.php" target="_blank" rel="noopener">Terms of Service</a>.
        </span>
    </label>
</div>
