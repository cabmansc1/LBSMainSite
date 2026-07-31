import "server-only";
import { ghlSend } from "@/lib/ghl";
import { buildTags, tagFields, tagSlug } from "@/lib/ghl-tags";
import { zoneBySlug } from "@/lib/zones";

/**
 * Tells GoHighLevel that somebody bought.
 *
 * Until this existed a purchase never reached the CRM at all. A contact
 * filled in a form, was tagged a lead, paid, and stayed a lead forever,
 * which meant any nurture sequence carried on pitching the customer who
 * had already bought. Missing data is a gap; that is actively wrong
 * outreach aimed at the person who just paid.
 *
 * A push rather than a pull. The Stripe webhook already fires at the
 * moment of truth holding every fact worth sending, so there is nothing
 * for GoHighLevel to go and fetch, no polling lag, and no read API to
 * secure on this side.
 */

export type PaidOrderFacts = {
  reference: string;
  email?: string;
  businessName?: string;
  phone?: string;
  category?: string;
  zoneSlug?: string;
  cardId?: string;
  cardName?: string;
  mailMonth?: string;
  spot?: string;
  amountCents?: number;
};

/**
 * Everyone on one card, as a tag.
 *
 * Chasing artwork and getting proofs approved are both "message the
 * eleven businesses on the September Summerville card", and that is a
 * segment the CRM otherwise cannot express.
 */
const cardTag = (zoneSlug?: string, mailMonth?: string) => {
  if (!zoneSlug || !mailMonth) return undefined;
  return `lbs-card-${tagSlug(zoneSlug)}-${tagSlug(mailMonth)}`;
};

export function composeOrderPush(f: PaidOrderFacts) {
  const zone = f.zoneSlug ? zoneBySlug(f.zoneSlug) : undefined;
  const zoneName = zone?.name ?? f.zoneSlug;

  // The buying tags, plus the same zone, category and size vocabulary a
  // lead gets, so one filter covers a contact at either stage.
  const tags = buildTags({
    kind: "advertise",
    zoneSlug: f.zoneSlug,
    category: f.category,
    adSize: f.spot,
  })
    // lbs-lead-advertise describes how they arrived, and they have moved
    // past it. lbs-customer is the tag a nurture sequence exits on.
    .filter((t) => t !== "lbs-lead-advertise" && t !== "lbs-lead")
    .concat(["lbs-customer"]);

  const card = cardTag(f.zoneSlug, f.mailMonth);
  if (card) tags.push(card);

  // Split the same way the contact form splits it, so a contact created
  // by a purchase and one created by a form look alike in the CRM.
  const parts = (f.businessName ?? "").trim().split(/\s+/);

  return {
    email: f.email,
    name: f.businessName,
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    companyName: f.businessName,
    phone: f.phone,
    source: zoneName ? `Paid: ${zoneName} card` : "Paid: postcard order",
    signup_type: "order_paid",
    order_reference: f.reference,
    // Dollars, because every other money field in these payloads is
    // dollars and a workflow comparing them should not have to know
    // which one is cents.
    amount_paid: f.amountCents !== undefined ? f.amountCents / 100 : undefined,
    ad_size: f.spot,
    category: f.category,
    location: zoneName,
    zone: f.zoneSlug,
    card_id: f.cardId,
    card_name: f.cardName,
    mail_month: f.mailMonth,
    ...tagFields([...new Set(tags)].sort()),
    submitted_at: new Date().toISOString(),
  };
}

/**
 * Never throws and never blocks. The caller is the Stripe webhook, and a
 * non-2xx there makes Stripe retry the whole event, which would re-run
 * the Mission Control placement and the receipt to fix a CRM sync that
 * is not worth re-running either of them.
 */
export async function pushOrderToGhl(f: PaidOrderFacts): Promise<void> {
  try {
    if (!f.email) {
      console.warn(`[order-ghl] no email on ${f.reference}, nothing to sync`);
      return;
    }
    await ghlSend(composeOrderPush(await withCardSchedule(f)), "order");
  } catch (e) {
    console.error("[order-ghl] push failed:", e);
  }
}

/**
 * Fills in the card name and mail month from Mission Control.
 *
 * Checkout does not know either: it validates a zone and a card id and
 * hands off, and Stripe metadata is a flat string map that is not worth
 * padding with facts we can look up later. The receipt resolves the
 * schedule from the card id the same way.
 *
 * Skipped entirely when Mission Control is unconfigured, because the
 * lookup falls back to sample data there, and a sample month would end
 * up baked into a CRM tag that outlives the mistake.
 */
async function withCardSchedule(f: PaidOrderFacts): Promise<PaidOrderFacts> {
  if (f.mailMonth || !f.cardId) return f;
  try {
    const mc = await import("@/lib/mission-control");
    if (!mc.mcEnabled()) return f;
    const card = await mc.getMcCardById(f.cardId);
    if (!card) return f;
    return {
      ...f,
      cardName: f.cardName ?? card.cardName ?? undefined,
      mailMonth: card.mailMonth ?? undefined,
    };
  } catch (e) {
    // A tag is not worth failing a sync over.
    console.error("[order-ghl] could not read the card schedule:", e);
    return f;
  }
}
