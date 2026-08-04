import "server-only";
import { sendAlertEmail, sendEmail } from "@/lib/email";
import { cardDisplayName } from "@/lib/card-coverage";
import {
  ARTWORK_LEAD_DAYS,
  TENTATIVE_MAIL_LABEL,
  artworkDeadlineFrom,
  tentativelyMails,
} from "@/lib/mailings";
import { HOUSEHOLDS, POSTCARD_PRICING, type Reach, type SpotSize } from "@/lib/pricing";
import { CONTACT_PHONE, SITE_URL } from "@/lib/seo";
import { zoneBySlug } from "@/lib/zones";

/**
 * The receipt a customer gets after paying for a Spotlight Postcard spot.
 *
 * Until this existed, buying ended at a success page: no record of the
 * reference, no mail date, no way to know what to send us or where. The
 * only thing the customer could do was wait to be contacted.
 *
 * Composed here rather than in the webhook so the webhook keeps doing one
 * job, and so the wording can be read in one place. Nothing in this file
 * is allowed to throw at the caller: it runs inside the webhook's
 * idempotency guard, and a non-2xx there makes Stripe retry the whole
 * event, which would re-run the Mission Control placement to fix an
 * email.
 */

/** Where the customer signs in. Railway serves the public host, so the
 *  same env the checkout return URLs use wins over the compiled-in one. */
const siteUrl = () =>
  process.env.PUBLIC_SITE_URL?.replace(/\/$/, "") || SITE_URL;

/**
 * Duplicated from the checkout component rather than imported: that file
 * is a client component, and pulling it into a server module would drag
 * React and the whole checkout UI into the webhook's bundle for six
 * words.
 */
const SPOT_LABELS: Record<SpotSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  triple: "Triple",
  quad: "Quad",
  full: "Full page",
};

/** Cents, with the cents shown. A promotion code can make the total land
 *  off a whole dollar, and a receipt that rounds is not a receipt. */
const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * artworkDeadlineFrom parses a date-only string as UTC midnight, so
 * formatting it in the server's local zone would print the day before
 * anywhere west of Greenwich. The deadline is a calendar date, not a
 * moment, so it is read back in the zone it was built in.
 */
const dueDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * Plain text does not reflow in every client, and an unwrapped paragraph
 * arrives as one long line in the ones that do not. Wrapped here so the
 * copy can stay written as sentences rather than as pre-broken lines
 * that drift the moment a month name changes length.
 */
function wrap(text: string, indent = ""): string[] {
  const width = 72;
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length + (out.length ? indent.length : 0) > width && line) {
      out.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) out.push(line);
  return out.map((l, i) => (i === 0 ? l : indent + l));
}

export type ReceiptFacts = {
  reference: string;
  businessName: string;
  /** Friendly zone name, e.g. "Daniel Island & Clements Ferry". */
  zoneName?: string;
  /** The specific card inside the zone, when Mission Control names one. */
  cardName?: string;
  /** Raw spot key as the order stored it, e.g. "medium". */
  spot: string;
  /** Raw reach key as the order stored it, e.g. "5k". */
  reach: string;
  category: string;
  amountCents: number;
  /** e.g. "September 2026". Absent when no card is scheduled yet. */
  mailMonth?: string;
  /** Already formatted for reading. Absent when the mail date is not known. */
  artworkDue?: string;
};

/**
 * Pure: every fact is passed in, so the wording can be exercised without
 * a database, Mission Control or a Stripe event.
 */
/**
 * Escapes text for the HTML part.
 *
 * Business names carry ampersands, and "Jack & Sons" arriving as
 * "Jack &amp; Sons" in an email is the kind of small wrongness that
 * makes a receipt look automated in the bad sense.
 */
const esc = (v: string) =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Makes the addresses in the copy clickable, after escaping.
 *
 * The sentences are written once for both parts, so they carry bare
 * URLs, which is right in plain text and a wasted step in HTML: nobody
 * copies a link out of an email to paste it into a browser. Escaping
 * happens first, so nothing here can inject markup.
 */
const linkify = (escaped: string) =>
  escaped.replace(
    /https:\/\/[^\s<)]+[^\s<).,]/g,
    (url) =>
      `<a href="${url}" style="color:#1E9BE9;text-decoration:underline">${url}</a>`,
  );

/** Tokens the HTML uses so the two parts cannot drift apart. */
const NAVY = "#0B1F33";
const BODY = "#334155";
const MUTED = "#64748B";
const LINE = "#E2E8F0";

/**
 * The site's typeface, with a fallback that looks like it.
 *
 * Named first for the clients that honour the @font-face below, which
 * is Apple Mail and iOS Mail and not much else: Gmail, Outlook and
 * Yahoo all drop web fonts and use the next name they recognise. So the
 * stack matters more than the import does. Helvetica Neue and Arial are
 * the closest grotesques that are actually installed everywhere, and
 * -apple-system picks up SF on Apple hardware, which sits nearer to
 * Geist than Arial does.
 */
const FONT =
  "Geist, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function composeOrderReceipt(f: ReceiptFacts): {
  subject: string;
  text: string;
  html: string;
} {
  const place = [f.cardName, f.zoneName].filter(Boolean).join(", ");

  const subject = place
    ? `Your ${f.zoneName ?? place} postcard spot is confirmed (${f.reference})`
    : `Your Spotlight Postcard spot is confirmed (${f.reference})`;

  const size = f.spot as SpotSize;
  const reach: Reach = f.reach === "10k" ? "10k" : "5k";
  const dims = SPOT_LABELS[size] ? POSTCARD_PRICING[reach][size]?.size : undefined;
  const spotLine = SPOT_LABELS[size]
    ? [SPOT_LABELS[size], dims].filter(Boolean).join(", ")
    : f.spot;

  const facts: [string, string][] = [["Order reference", f.reference]];
  if (spotLine) facts.push(["Spot", spotLine]);
  if (place) facts.push(["Card", place]);
  // Only the two reaches we actually sell get a line. An order taken
  // before reach was recorded says nothing rather than guessing 5,000.
  if (f.reach === "5k" || f.reach === "10k") {
    facts.push(["Reach", `${HOUSEHOLDS[f.reach].toLocaleString("en-US")} households`]);
  }
  if (f.category) {
    facts.push(["Category", `${f.category}, held for you alone on this card`]);
  }
  facts.push(["Paid", money(f.amountCents)]);
  if (f.mailMonth) facts.push([TENTATIVE_MAIL_LABEL, f.mailMonth]);
  if (f.artworkDue) facts.push(["Artwork due", f.artworkDue]);

  // Written once, rendered twice. A receipt whose plain text and HTML
  // say slightly different things is worse than one with no HTML.
  const greeting = `Hi ${f.businessName || "there"},`;
  const intro =
    "Your Spotlight Postcard spot is paid and reserved. Here is what you bought.";

  const schedule = f.mailMonth
    ? `${tentativelyMails(f.mailMonth)}. Tentative is the honest word: ` +
      "routes get added, print schedules shift, and a card sometimes waits " +
      "on one more advertiser. If the date moves we will tell you, and " +
      "your artwork deadline moves with it, because artwork is due " +
      `${ARTWORK_LEAD_DAYS} days before the mail date.`
    : "Your card is not on the print schedule yet. We will email you the " +
      `${TENTATIVE_MAIL_LABEL.toLowerCase()} and your artwork deadline as ` +
      "soon as it is set.";

  const steps = [
    `Send us your artwork. Upload it at ${siteUrl()}/account/cards, or ` +
      "just reply to this email with the file attached. Either reaches " +
      "us. PDF, PNG or JPG at 300 dpi works best.",
    "Or let us design it. Design is included in what you already paid. " +
      "Reply and tell us what the ad should say and we will draft it for you.",
    "Either way you see a proof and approve it before anything goes to print.",
  ];

  const account =
    "Your account is already set up with this email address. Sign in at " +
    `${siteUrl()}/login and we will send you a code, so there is no ` +
    "password to invent.";
  const help =
    "Questions: reply to this email, write to hello@lowcountrybusinessspotlight.com, or " +
    `call ${CONTACT_PHONE}.`;

  const lines: string[] = [];
  lines.push(greeting, "");
  lines.push(...wrap(intro), "");
  lines.push(...facts.map(([k, v]) => `${k}: ${v}`), "");
  lines.push(...wrap(schedule), "");
  lines.push("What happens next", "");
  steps.forEach((s, i) => lines.push(...wrap(`${i + 1}. ${s}`, "   ")));
  lines.push("");
  lines.push(...wrap(account), "");
  lines.push(...wrap(help), "");
  lines.push("Lowcountry Business Spotlight");

  /**
   * Tables and inline styles, because that is what email clients
   * actually render. No external stylesheet, no flexbox, no web font:
   * Outlook ignores all three and the layout collapses to something
   * worse than the plain text it replaced.
   */
  const p = (text: string) =>
    `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.6;color:${BODY}">${linkify(esc(text))}</p>`;

  const factRows = facts
    .map(
      ([k, v], i) => `
        <tr>
          <td style="padding:10px 0;font-family:${FONT};font-size:13px;color:${MUTED};${i ? `border-top:1px solid ${LINE};` : ""}white-space:nowrap;vertical-align:top">${esc(k)}</td>
          <td style="padding:10px 0 10px 18px;font-family:${FONT};font-size:14px;color:${BODY};font-weight:600;${i ? `border-top:1px solid ${LINE};` : ""}text-align:right">${esc(v)}</td>
        </tr>`,
    )
    .join("");

  const stepRows = steps
    .map(
      (s, i) => `
        <tr>
          <td style="padding:0 12px 12px 0;vertical-align:top">
            <span style="display:inline-block;width:22px;height:22px;border-radius:11px;background:${NAVY};color:#fff;font-family:${FONT};font-size:12px;font-weight:700;text-align:center;line-height:22px">${i + 1}</span>
          </td>
          <td style="padding:0 0 12px;font-family:${FONT};font-size:14.5px;line-height:1.6;color:${BODY}">${linkify(esc(s))}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  /* Honoured by Apple Mail and iOS Mail. Everything else falls through
     to the stack in the inline styles, which is the point of having
     one. */
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap');
  body { margin:0; padding:0; }
</style>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:${FONT}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${LINE};border-radius:14px;overflow:hidden">
        <tr>
          <td style="background:${NAVY};padding:20px 28px">
            <span style="font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;letter-spacing:-0.01em">Lowcountry Business Spotlight</span>
          </td>
        </tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 6px;font-family:${FONT};font-size:19px;font-weight:700;color:#0F172A;letter-spacing:-0.02em">Your spot is confirmed</p>
          ${p(greeting)}
          ${p(intro)}

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px;border:1px solid ${LINE};border-radius:10px;padding:4px 16px">
            ${factRows}
          </table>

          ${p(schedule)}

          <p style="margin:22px 0 12px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED}">What happens next</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stepRows}</table>

          ${p(account)}
          ${p(help)}
        </td></tr>
        <tr>
          <td style="border-top:1px solid ${LINE};padding:16px 28px;font-family:${FONT};font-size:12px;color:${MUTED}">
            Lowcountry Business Spotlight &middot; hello@lowcountrybusinessspotlight.com &middot; ${CONTACT_PHONE}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text: lines.join("\n"), html };
}

type Schedule = { mailMonth?: string; cardName?: string; artworkDue?: string };

/**
 * The card this order is on, asked of Mission Control the same way the
 * public pages ask.
 *
 * Never throws and never blocks the receipt: a confirmation without a
 * mail date still tells the customer what they bought and how to reach
 * us, which is the whole complaint this fixes.
 */
async function scheduleFor(order: {
  cardId: string;
  zoneSlug: string;
}): Promise<Schedule> {
  try {
    const mc = await import("@/lib/mission-control");

    // With Mission Control unconfigured, the lookups below fall back to
    // the sample schedule in mailings.ts. That is fine on a web page,
    // which anyone can reload once the real date is known. An email
    // cannot be taken back: a sample mail date becomes a written promise
    // about when somebody's ad reaches mailboxes. The copy already reads
    // properly with no date, so say nothing rather than something made
    // up.
    if (!mc.mcEnabled()) return {};

    // The card id is the precise answer. A zone can be filling two cards
    // at once, and quoting the zone's soonest date to someone who bought
    // the other one puts a wrong deadline in writing.
    if (order.cardId) {
      const card = await mc.getMcCardById(order.cardId);
      if (card) {
        const due = artworkDeadlineFrom(card.mailDateIso);
        return {
          mailMonth: card.mailMonth,
          cardName: cardDisplayName(card),
          artworkDue: due ? dueDate(due) : undefined,
        };
      }
    }

    if (order.zoneSlug) {
      // Falls back to the sample schedule only when Mission Control is
      // not configured at all, which is the same condition under which
      // every public page shows it.
      const mailing = await mc.getZoneMailing(order.zoneSlug);
      if (mailing) {
        // No ISO date on this path, so the deadline can only be the one
        // Mission Control published. "TBD" is its way of saying it has
        // not set one, and printing that as a due date is worse than
        // printing nothing.
        const quoted = (mailing.artworkDeadline ?? "").trim();
        return {
          mailMonth: mailing.mailMonth,
          cardName: cardDisplayName(mailing),
          artworkDue: quoted && quoted.toUpperCase() !== "TBD" ? quoted : undefined,
        };
      }
    }
  } catch (e) {
    console.error("[order-receipt] could not read the card schedule:", e);
  }
  return {};
}

/**
 * Sends the receipt for a paid order.
 *
 * Call this from inside the webhook's firstTime guard. It reads the order
 * back rather than taking the facts as arguments, because the order row
 * is what the customer's reference, category and reach live on; Stripe
 * metadata is the fallback for the case where the pending insert failed
 * and the sale went through anyway.
 */
export async function sendOrderReceipt(input: {
  sessionId: string;
  /** Stripe's collected email, which beats whatever was typed earlier. */
  email?: string;
  /** Stripe's total, so a promotion code shows as what was really paid. */
  amountCents?: number;
  metadata?: Record<string, string>;
}): Promise<void> {
  try {
    const md = input.metadata ?? {};
    const { getOrderBySession } = await import("@/lib/orders");
    const order = await getOrderBySession(input.sessionId);

    const to = (input.email || order?.email || md.email || "").trim();
    if (!to) {
      // Worth a log line: the sale is real and nobody is getting told.
      console.error(
        `[order-receipt] no email on ${md.reference || input.sessionId}, receipt not sent`,
      );
      return;
    }

    const zoneSlug = order?.zoneSlug || md.zone || md.card || "";
    const cardId = order?.cardId || md.cardId || "";
    const schedule = await scheduleFor({ cardId, zoneSlug });

    const { subject, text, html } = composeOrderReceipt({
      reference: order?.reference || md.reference || input.sessionId,
      businessName: order?.businessName || md.businessName || "",
      zoneName: zoneBySlug(zoneSlug)?.name,
      cardName: schedule.cardName,
      spot: order?.spot || md.spotSize || md.spotType || "",
      reach: order?.reach || md.reach || "",
      category: order?.category || md.category || "",
      amountCents: input.amountCents ?? order?.amountCents ?? 0,
      mailMonth: schedule.mailMonth,
      artworkDue: schedule.artworkDue,
    });

    // Both parts. Resend sends them as one multipart message, so a
    // client that refuses HTML still gets the receipt it always got.
    const result = await sendEmail({ to, subject, text, html });
    if (result.error) {
      // sendEmail already logged the provider's reason; this ties the
      // failure to an order so it can be resent by hand.
      console.error(
        `[order-receipt] receipt for ${md.reference || input.sessionId} not delivered: ${result.error}`,
      );
    }
  } catch (e) {
    console.error("[order-receipt] could not send receipt:", e);
  }
}

/**
 * Tells us a refund happened and that a spot may still be held.
 *
 * Refunding money in Stripe does not take an advertiser off a card.
 * Mission Control owns the card, the spot may already be at the
 * printer, and no automatic delete is safe against a card mid
 * production. So this does the one safe thing: makes sure the manual
 * step is not forgotten. Before it existed, a refunded advertiser went
 * on holding an exclusive category against a real sale and nothing
 * anywhere said so.
 *
 * Goes to us, never to the customer: Stripe already emails them about
 * their own refund.
 */
export async function sendRefundAlert(input: {
  order: { reference: string; businessName: string; category: string; cardId?: string; zoneSlug: string; email: string } | null;
  fully: boolean;
  amountRefundedCents: number;
  amountCents: number;
}): Promise<void> {
  const { order, fully, amountRefundedCents, amountCents } = input;
  const who = order?.businessName || order?.email || "an order we cannot match";
  const kind = fully ? "Refunded" : "Partly refunded";

  // Deliberately does not assume which kind of refund this was. A
  // cancellation and a goodwill credit look identical from Stripe, and
  // only one of them means somebody has to go and remove a spot. So it
  // states where things stand and offers both, rather than telling you
  // to undo something you may have meant to keep.
  const mcCard =
    order?.cardId && process.env.MC_BASE_URL?.trim()
      ? `${process.env.MC_BASE_URL.trim().replace(/\/+$/, "")}/pipeline/${order.cardId}`
      : "";

  const lines = [
    `${kind}: ${money(amountRefundedCents)} of ${money(amountCents)}.`,
    "",
    `Business: ${who}`,
    order?.category ? `Category: ${order.category}` : "",
    order?.zoneSlug ? `Zone: ${order.zoneSlug}` : "",
    order?.cardId ? `Card: ${order.cardId}` : "",
    order?.reference ? `Reference: ${order.reference}` : "",
    "",
    "Where this stands: they are still on the card in Mission Control and"
      + ` still holding${order?.category ? ` ${order.category}` : " their category"}.`,
    "",
    "If this was a cancellation, remove them in Mission Control and the"
      + " spot goes back on sale.",
    "If it was goodwill and they are staying on the card, leave them there"
      + ` and set their amount paid to ${money(Math.max(0, amountCents - amountRefundedCents))}.`,
    // Mission Control does not hear about refunds, so its amount paid
    // still reads the full charge. Left alone, a goodwill credit quietly
    // overstates what the card collected, and the card's own revenue is
    // what the print run is judged against.
    "Mission Control still has them down as paying"
      + ` ${money(amountCents)}, because Stripe refunds do not reach it.`,
    fully
      ? ""
      : "The order stays marked paid here, because only part of it came back.",
    "",
    mcCard ? `Card in Mission Control: ${mcCard}` : "",
    `${SITE_URL}/admin/orders`,
  ].filter((l) => l !== "");

  try {
    await sendAlertEmail("refund", {
      subject: `${kind}: ${who}${order?.category ? ` (${order.category})` : ""}`,
      text: lines.join("\n"),
    });
  } catch (e) {
    console.error("[order-receipt] refund alert failed:", e);
  }
}
