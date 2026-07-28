import { after, NextResponse } from "next/server";
import { ghlConfigured, ghlSend } from "@/lib/ghl";
import { subscribeToNewsletter } from "@/lib/newsletter";

/**
 * Newsletter signup, replacing newsletter_subscribe.php.
 *
 * The PHP did three things in order: validate the email, write to
 * `directory_newsletter_subscribers`, and push brand new subscribers to
 * GoHighLevel under the `newsletter` key. All three are reproduced, with
 * the GHL payload copied field for field so the automations already
 * running against it keep working.
 *
 * Only a genuinely new subscriber is pushed, which is what the PHP did:
 * the push sat inside the else branch, so somebody resubscribing never
 * re-entered the workflow and never got the welcome sequence twice.
 *
 * Conventions follow /api/leads: honeypot named company_website, the
 * webhook sent from after() so nobody waits on it, and a preview answer
 * when there is no database configured.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v: unknown, max = 500) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("x-real-ip")?.trim() ||
  null;

/**
 * The messages are the PHP's, unchanged. They are what the live site has
 * been telling people, and two of them exist purely so that an address
 * we already hold reads as a confirmation rather than a failure.
 */
const MESSAGES = {
  subscribed: "Thanks for subscribing! You'll hear from us soon.",
  already: "You're already subscribed!",
  resubscribed: "Welcome back! You've been re-subscribed.",
} as const;

/**
 * reCAPTCHA v3, ported from includes/recaptcha.php, with one deliberate
 * difference from /api/leads: a missing token passes here instead of
 * being rejected.
 *
 * The reason is the surface. This form is in the sitewide footer, on
 * every page, and the token comes from a script loaded from Google. If a
 * secret were set and the script were blocked, failing closed would kill
 * the signup on all 161 pages at once and nobody would see an error
 * worth reporting. The honeypot runs either way and is the control this
 * form actually relies on; the score check only tightens things when a
 * caller does send a token.
 */
async function humanScore(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET?.trim();
  if (!secret || !token) return true;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: ip ?? "",
      }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const data = (await res.json()) as {
      success?: boolean;
      score?: number;
      "error-codes"?: string[];
    };
    const ok = !!data.success && (data.score ?? 0) >= 0.5;
    if (!ok) {
      console.warn(
        `[newsletter] reCAPTCHA rejected: success=${data.success} score=${data.score} errors=${(data["error-codes"] ?? []).join(",") || "none"}`,
      );
    }
    return ok;
  } catch (e) {
    console.error("[newsletter] reCAPTCHA verify unreachable, failing open:", e);
    return true;
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot filled means bot: answer success, store nothing, push
  // nothing. Same silent handling /api/leads gives it, so the bot never
  // learns it was caught.
  if (str(body.company_website) !== "") {
    return NextResponse.json({ ok: true, message: MESSAGES.subscribed });
  }

  const email = str(body.email, 190);
  if (!EMAIL.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 422 },
    );
  }

  if (!(await humanScore(str(body.recaptchaToken, 8000), clientIp(req)))) {
    return NextResponse.json({ ok: true, message: MESSAGES.subscribed });
  }

  // Which page they subscribed from. The PHP sent
  // basename($_SERVER['PHP_SELF'], '.php') and defaulted to 'blog'; the
  // client sends the same kind of short page name.
  const source = str(body.source, 50) || "blog";

  // Field for field from newsletter_subscribe.php. `source` here is the
  // prefixed string GHL branches on; `origin` is the bare page name.
  const ghlPayload = {
    email,
    source: `Newsletter: ${source}`,
    signup_type: "newsletter",
    origin: source,
    submitted_at: new Date().toISOString(),
  };

  // No database configured (local preview): the GHL push is still the
  // real one, so say it landed rather than erroring.
  if (!process.env.DB_HOST) {
    after(() => ghlSend(ghlPayload, "newsletter"));
    return NextResponse.json({
      ok: true,
      preview: true,
      message: MESSAGES.subscribed,
    });
  }

  const result = await subscribeToNewsletter(email, source);

  if (result === "failed") {
    // The list that actually sends mail is the CRM one. With a webhook
    // configured, pushing here means the subscription is real even
    // though the local copy was lost, so the visitor is told the truth.
    // With no webhook the table was the only copy and there is nothing
    // to confirm.
    if (ghlConfigured("newsletter")) {
      after(() => ghlSend(ghlPayload, "newsletter"));
      return NextResponse.json({ ok: true, message: MESSAGES.subscribed });
    }
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  if (result === "subscribed") {
    after(() => ghlSend(ghlPayload, "newsletter"));
  }

  return NextResponse.json({ ok: true, message: MESSAGES[result] });
}
