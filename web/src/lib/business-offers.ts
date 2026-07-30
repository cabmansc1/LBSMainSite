import "server-only";
import { sql } from "drizzle-orm";

/**
 * The special offer on a directory listing.
 *
 * `directory_business_offers` is a legacy table the PHP admin has always
 * written, and DirectoryBusiness has always declared an `offer` field.
 * Nothing ever loaded it: only the sample data filled it in, so the
 * offer badge on a listing card and the offer block on a business page
 * have never appeared for a real business. Same shape of gap as opening
 * hours had.
 *
 * Both halves live here so the advertiser writing an offer and the page
 * rendering it cannot disagree about what counts as live.
 *
 * One offer per listing, deliberately. The table allows several and the
 * public page only ever shows the first, so letting somebody enter three
 * would mean two of them silently doing nothing.
 */

export type BusinessOffer = {
  id: number;
  title: string;
  description: string;
  terms: string;
  /** ISO date, or empty when it does not expire. */
  expiresAt: string;
};

export const OFFER_TITLE_MAX = 120;
export const OFFER_TEXT_MAX = 600;

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Dates arrive as Date or string depending on the driver. */
const isoDate = (v: unknown): string => {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(String(v));
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const row = (r: Record<string, unknown>): BusinessOffer => ({
  id: Number(r.id),
  title: str(r.title),
  description: str(r.description),
  terms: str(r.terms),
  expiresAt: isoDate(r.expires_at),
});

/**
 * Live offers for a page of listings.
 *
 * Expiry is filtered in SQL rather than after, because an offer that
 * ran out yesterday is not something to render and then hide. An offer
 * with no expiry date runs until it is deleted.
 */
export async function getOffersFor(
  businessIds: number[],
): Promise<Map<number, BusinessOffer>> {
  const out = new Map<number, BusinessOffer>();
  if (businessIds.length === 0) return out;
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT id, business_id, title, description, terms, expires_at
          FROM directory_business_offers
          WHERE is_active = 1
            AND (expires_at IS NULL OR expires_at >= CURDATE())
            AND business_id IN (${sql.join(
              businessIds.map((i) => sql`${i}`),
              sql`, `,
            )})
          ORDER BY business_id, id DESC`,
    )) as unknown as [Record<string, unknown>[]];
    // Descending id, so the newest offer wins the one slot a listing has.
    for (const r of rows[0] ?? []) {
      const id = Number(r.business_id);
      if (!out.has(id)) out.set(id, row(r));
    }
  } catch (e) {
    // A missing offer is cosmetic. Taking the directory down over one
    // is not.
    console.error("[offers] lookup failed:", e);
  }
  return out;
}

/** Whatever this listing has, expired or not, for the portal to edit. */
export async function getOffer(
  businessId: number,
): Promise<BusinessOffer | undefined> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT id, business_id, title, description, terms, expires_at
          FROM directory_business_offers
          WHERE business_id = ${businessId} AND is_active = 1
          ORDER BY id DESC LIMIT 1`,
    )) as unknown as [Record<string, unknown>[]];
    const r = rows[0]?.[0];
    return r ? row(r) : undefined;
  } catch (e) {
    console.error("[offers] read failed:", e);
    return undefined;
  }
}

export type OfferInput = {
  title: string;
  description?: string;
  terms?: string;
  /** "YYYY-MM-DD", or empty for no expiry. */
  expiresAt?: string;
};

/**
 * Replaces the listing's offer.
 *
 * Deactivates rather than deletes what was there, because the legacy
 * PHP admin reads this table too and a hard delete would remove history
 * it may be showing. `is_active = 0` is the state that table already
 * uses for an offer that is no longer running.
 */
export async function saveOffer(
  businessId: number,
  input: OfferInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const title = (input.title ?? "").trim();
  if (title.length < 3) {
    return { ok: false, error: "Give the offer a title people will recognise." };
  }
  if (title.length > OFFER_TITLE_MAX) {
    return { ok: false, error: `Keep the title under ${OFFER_TITLE_MAX} characters.` };
  }

  const description = (input.description ?? "").trim().slice(0, OFFER_TEXT_MAX);
  const terms = (input.terms ?? "").trim().slice(0, OFFER_TEXT_MAX);

  const expires = (input.expiresAt ?? "").trim();
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
    return { ok: false, error: "That expiry date is not a date." };
  }
  if (expires) {
    const when = new Date(`${expires}T23:59:59`);
    if (isNaN(when.getTime())) {
      return { ok: false, error: "That expiry date is not a date." };
    }
    // Said here rather than accepted and silently hidden: an offer that
    // expired before it was written would simply never appear, and the
    // advertiser would have no way to tell why.
    if (when.getTime() < Date.now()) {
      return { ok: false, error: "That date has already passed, so the offer would never show." };
    }
  }

  try {
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`UPDATE directory_business_offers SET is_active = 0
          WHERE business_id = ${businessId}`,
    );
    await db.execute(
      sql`INSERT INTO directory_business_offers
            (business_id, title, description, terms, expires_at, is_active, created_at)
          VALUES (${businessId}, ${title}, ${description}, ${terms},
                  ${expires || null}, 1, NOW())`,
    );
    return { ok: true };
  } catch (e) {
    console.error("[offers] save failed:", e);
    return { ok: false, error: "That offer could not be saved just now." };
  }
}

/** Takes the offer down without losing the record of it. */
export async function clearOffer(businessId: number): Promise<boolean> {
  try {
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`UPDATE directory_business_offers SET is_active = 0
          WHERE business_id = ${businessId}`,
    );
    return true;
  } catch (e) {
    console.error("[offers] clear failed:", e);
    return false;
  }
}
