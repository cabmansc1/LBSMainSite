import "server-only";

/**
 * GoHighLevel inbound webhooks, ported from includes/ghl.php.
 *
 * The webhook URL carries its own secret in the path, so it lives in the
 * environment and never in the repo. Resolution order is the PHP one,
 * unchanged, because the same variables are already set on the live host
 * and the cutover must not need them renamed:
 *
 *   GHL_WEBHOOK_<KEY>   per form, e.g. GHL_WEBHOOK_ADVERTISE
 *   GHL_WEBHOOK_URL     one webhook for every form, branched on `source`
 *
 * The PHP had a third step, the GHL_WEBHOOK_AD_LEAD constant defined by
 * cPanel's secure/ghl_helper.php. There is no equivalent here: that file
 * is outside the web root of the legacy host and is not deployed with
 * this app, so an operator moving to this stack sets the environment
 * variable instead.
 *
 * Nothing in here throws. A lead that reached the database is captured;
 * the CRM push failing is a problem for the operator, never for the
 * person who filled in the form.
 */

/**
 * curl was given CURLOPT_TIMEOUT 10, so a stalled webhook could hold the
 * request for ten seconds. The same ceiling applies here, and the send
 * runs after the response so nobody waits on it.
 */
const GHL_TIMEOUT_MS = 10_000;

/** Keys already reported as unconfigured, so the log says it once per process. */
const warned = new Set<string>();

export function ghlWebhookUrl(key: string): string | undefined {
  // Trimmed because a URL pasted into a hosting dashboard picks up
  // whitespace with no visible sign, and a trailing newline makes the
  // fetch throw rather than fail cleanly.
  const perForm = process.env[`GHL_WEBHOOK_${key.toUpperCase()}`]?.trim();
  if (perForm) return perForm;
  const generic = process.env.GHL_WEBHOOK_URL?.trim();
  if (generic) return generic;
  return undefined;
}

/**
 * Whether a lead of this kind has anywhere to go besides the local
 * table. The route uses it to decide whether a failed insert has lost
 * the lead outright or merely lost the local copy.
 */
export const ghlConfigured = (key: string) => !!ghlWebhookUrl(key);

/** The path only. The host and the token in the URL stay out of the log. */
const safePath = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return "(unparseable url)";
  }
};

export async function ghlSend(
  payload: Record<string, unknown>,
  key: string,
): Promise<boolean> {
  const url = ghlWebhookUrl(key);
  if (!url) {
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(
        `[ghl] no webhook configured for key '${key}': set GHL_WEBHOOK_${key.toUpperCase()} or GHL_WEBHOOK_URL. Leads are still stored locally.`,
      );
    }
    return false;
  }

  // A payload that names its own source keeps it, matching the PHP
  // empty() test. The advertise form sends "Ad Lead: Summerville", which
  // is what the existing GHL automations branch on.
  const body = { ...payload, source: payload.source || key };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(GHL_TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.ok) return true;
    const text = await res.text().catch(() => "");
    console.error(
      `[ghl] webhook failed: HTTP ${res.status} path=${safePath(url)} body=${text.slice(0, 200)}`,
    );
    return false;
  } catch (e) {
    console.error(`[ghl] webhook error for key '${key}':`, e);
    return false;
  }
}
