import "server-only";

/**
 * Transactional email.
 *
 * Deliberately a thin wrapper over one HTTP call rather than a
 * dependency. Resend's SDK adds a package to keep current for something
 * that is a POST with a JSON body, and staying at this layer means
 * swapping provider later is one file.
 *
 * Marketing mail is not this. Nurture, campaigns and reactivation live
 * in GoHighLevel. What sends from here is everything tied to an order
 * or a login: things that need our state and cannot wait on a sync.
 */

const KEY = () => process.env.RESEND_API_KEY?.trim();
const FROM = () =>
  process.env.EMAIL_FROM?.trim() ||
  "Lowcountry Business Spotlight <hello@lowcountrybusinessspotlight.com>";
const REPLY_TO = () => process.env.EMAIL_REPLY_TO?.trim();

/**
 * Sending is off until a key exists, the same way Stripe falls back to
 * preview mode. The whole flow stays clickable before DNS propagates,
 * and a missing key never turns into a crash on the one page where a
 * customer is waiting to get in.
 */
export const emailEnabled = () => !!KEY();

/**
 * Where "somebody needs to do something" mail goes.
 *
 * Here rather than in each notification module because there are now
 * three of them, and an inbox address copied into three files is one
 * that gets changed in two.
 */
export const alertsTo = () =>
  process.env.LEAD_ALERT_EMAIL?.trim() || "andrew@lowcountrybusinessspotlight.com";

export type SendResult = { sent: boolean; id?: string; error?: string };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  /** Plain text. Always sent, and the only thing some clients show. */
  text: string;
  /** Optional HTML. Keep it simple: transactional mail is read, not admired. */
  html?: string;
  /**
   * Overrides EMAIL_REPLY_TO for this message.
   *
   * A lead notification is the case that needs it: the PHP set Reply-To
   * to the lead's own address, so hitting reply in the inbox answers the
   * customer rather than writing back to ourselves. Losing that would
   * turn every enquiry into a copy and paste.
   */
  replyTo?: string;
}): Promise<SendResult> {
  if (!emailEnabled()) {
    // The full body, because the point of preview mode is checking what
    // would have gone out. A subject line alone tells you nothing about
    // whether the code or the deadline in it was right.
    console.log(
      `[email preview] would send to ${opts.to}\n` +
        `  subject: ${opts.subject}\n` +
        opts.text.split("\n").map((l) => `  | ${l}`).join("\n"),
    );
    return { sent: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY()}`,
        "Content-Type": "application/json",
      },
      // A login code is worthless if it arrives after the person has
      // given up, so fail fast rather than hold the request open.
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: FROM(),
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
        ...(opts.html ? { html: opts.html } : {}),
        ...(opts.replyTo?.trim() || REPLY_TO()
          ? { reply_to: opts.replyTo?.trim() || REPLY_TO() }
          : {}),
      }),
    });

    if (!res.ok) {
      // Resend puts the reason in the body, and it is usually
      // actionable: an unverified domain, a malformed from address.
      const detail = await res.text().catch(() => "");
      console.error(`[email] send failed ${res.status}: ${detail.slice(0, 300)}`);
      return { sent: false, error: `provider returned ${res.status}` };
    }

    const body = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: body.id };
  } catch (e) {
    console.error("[email] send threw:", e);
    return { sent: false, error: "send failed" };
  }
}
