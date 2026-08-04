import "server-only";
import type { ActivityEvent } from "@/lib/admin-activity";

/**
 * Text messages for the things that cannot wait for an inbox.
 *
 * Twilio's REST API over plain fetch rather than their SDK: this sends
 * one form-encoded POST, and a dependency for that is a dependency to
 * keep patched forever.
 *
 * Unconfigured is a normal state, not an error. A deploy without
 * credentials logs what it would have sent, the same way sendEmail does,
 * so the wording can be checked without a phone bill.
 */

const sid = () => process.env.TWILIO_ACCOUNT_SID?.trim();
const token = () => process.env.TWILIO_AUTH_TOKEN?.trim();
const from = () => process.env.TWILIO_FROM?.trim();

/** Where alerts go. Several numbers may be given, comma separated. */
const recipients = (): string[] =>
  (process.env.ALERT_SMS_TO ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

export const smsEnabled = () =>
  !!sid() && !!token() && !!from() && recipients().length > 0;

/**
 * Which events are worth a text.
 *
 * Everything goes to the feed; almost nothing should buzz a phone. A
 * text at ten at night has to have earned it, and the fastest way to
 * make these ignored is to send one for every directory inquiry.
 * Overridable, because what is urgent changes with the print calendar.
 */
const URGENT = new Set(["artwork", "order", "refund"]);

const urgentKinds = (): Set<string> => {
  const raw = process.env.ALERT_SMS_KINDS?.trim();
  if (!raw) return URGENT;
  return new Set(
    raw.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
  );
};

export async function smsAlert(event: ActivityEvent): Promise<void> {
  if (!urgentKinds().has(event.kind)) return;

  const body = [event.title, event.detail].filter(Boolean).join(" - ").slice(0, 320);

  if (!smsEnabled()) {
    console.log(`[sms preview] would text: ${body}`);
    return;
  }

  const auth = Buffer.from(`${sid()}:${token()}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
    sid()!,
  )}/Messages.json`;

  // One request per recipient: Twilio sends to a single To per call, and
  // one bad number must not silently cost the others their message.
  for (const to of recipients()) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from()!, Body: body }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        // Twilio explains itself in the body, and the status alone
        // rarely says which of the two numbers it objected to.
        console.error(
          `[sms] ${to} failed: ${res.status} ${(await res.text()).slice(0, 300)}`,
        );
      }
    } catch (e) {
      console.error(`[sms] ${to} failed:`, e);
    }
  }
}
