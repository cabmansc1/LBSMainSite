import "server-only";
import { sendEmail } from "@/lib/email";
import { cardDisplayName } from "@/lib/card-coverage";
import {
  ARTWORK_LEAD_DAYS,
  TENTATIVE_MAIL_LABEL,
  artworkDeadlineFrom,
  tentativelyMails,
} from "@/lib/mailings";
import { HOUSEHOLDS, POSTCARD_PRICING, type Reach, type SpotSize } from "@/lib/pricing";
import { SITE_URL } from "@/lib/seo";
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
export function composeOrderReceipt(f: ReceiptFacts): {
  subject: string;
  text: string;
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

  const lines: string[] = [];
  lines.push(`Hi ${f.businessName || "there"},`, "");
  lines.push(
    ...wrap("Your Spotlight Postcard spot is paid and reserved. Here is what you bought."),
    "",
  );
  lines.push(...facts.map(([k, v]) => `${k}: ${v}`), "");

  if (f.mailMonth) {
    lines.push(
      ...wrap(
        `${tentativelyMails(f.mailMonth)}. Tentative is the honest word: ` +
          "routes get added, print schedules shift, and a card sometimes " +
          "waits on one more advertiser. If the date moves we will tell " +
          "you, and your artwork deadline moves with it, because artwork " +
          `is due ${ARTWORK_LEAD_DAYS} days before the mail date.`,
      ),
      "",
    );
  } else {
    lines.push(
      ...wrap(
        "Your card is not on the print schedule yet. We will email you the " +
          `${TENTATIVE_MAIL_LABEL.toLowerCase()} and your artwork deadline ` +
          "as soon as it is set.",
      ),
      "",
    );
  }

  lines.push("What happens next", "");
  lines.push(
    ...wrap(
      "1. Send us your artwork by replying to this email. There is no " +
        "upload page on the site yet, so a reply is how it reaches us. " +
        "PDF, PNG or JPG at 300 dpi works best.",
      "   ",
    ),
  );
  lines.push(
    ...wrap(
      "2. Or let us design it. Design is included in what you already " +
        "paid. Reply and tell us what the ad should say and we will draft " +
        "it for you.",
      "   ",
    ),
  );
  lines.push(
    ...wrap(
      "3. Either way you see a proof and approve it before anything goes " +
        "to print.",
      "   ",
    ),
    "",
  );

  lines.push(
    ...wrap(
      "Your account is already set up with this email address. Sign in at " +
        `${siteUrl()}/login and we will send you a code, so there is no ` +
        "password to invent.",
    ),
    "",
  );
  lines.push(
    ...wrap(
      "Questions: reply to this email, write to hello@lbspotlight.com, or " +
        "call 843-212-2969.",
    ),
    "",
  );
  lines.push("Lowcountry Business Spotlight");

  return { subject, text: lines.join("\n") };
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

    const { subject, text } = composeOrderReceipt({
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

    const result = await sendEmail({ to, subject, text });
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
