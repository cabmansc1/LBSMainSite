import "server-only";
import { sql } from "drizzle-orm";

/**
 * Which listings belong to a postcard advertiser.
 *
 * Nothing stores this, and nothing should. A business that signs up for
 * a free directory listing today and buys a card spot next month has not
 * changed category into something a flag would need updating for; it has
 * simply bought something, and buying something is already recorded in
 * two places. Deriving the answer means it is right the moment the
 * payment lands, with nobody remembering to tick a box.
 *
 * The two places, and why both are needed:
 *
 *   lbs_orders   spots bought through this website. Only ever holds card
 *                purchases: the directory subscription is a Stripe
 *                subscription and never writes a row here, so a paid row
 *                means a postcard and nothing else.
 *   Mission Ctrl every spot ever sold, including the years before this
 *                site could sell one. Most advertisers are only here.
 *
 * Matched on email and on name, not on email alone. The directory and
 * Mission Control are typed by different people at different times, so a
 * listing created under office@ against an advertiser recorded as owner@
 * is the ordinary case rather than the exception. Email alone would
 * label most real advertisers directory-only, which is exactly the
 * mistake this is meant to prevent. name-match.ts is deliberately
 * conservative about what counts as the same business.
 */

export type AdvertiserIndex = {
  /** Ids of the listings that belong to a postcard advertiser. */
  businessIds: Set<number>;
  /**
   * False when Mission Control could not be read, so the answer is
   * orders only. Worth surfacing rather than hiding: with MC missing,
   * the great majority of real advertisers would be labelled
   * directory-only, and a label that is confidently wrong is worse than
   * one that admits it.
   */
  missionControl: boolean;
};

type Listing = { id: number; name: string; email: string };

export async function getAdvertiserIndex(
  listings: Listing[],
): Promise<AdvertiserIndex> {
  // Everyone who has bought a card spot, by whatever we know them as.
  const emails = new Set<string>();
  const names: string[] = [];

  try {
    const { db } = await import("@/lib/db");
    const { ensureOrdersTable } = await import("@/lib/orders");
    await ensureOrdersTable();
    const rows = (await db.execute(
      sql`SELECT DISTINCT LOWER(email) AS email, business_name
          FROM lbs_orders
          WHERE status = 'paid'`,
    )) as unknown as [{ email: string | null; business_name: string | null }[]];
    for (const r of rows[0] ?? []) {
      const email = String(r.email ?? "");
      if (email) emails.add(email);
      const name = String(r.business_name ?? "").trim();
      if (name) names.push(name);
    }
  } catch (e) {
    console.error("[customer-type] order lookup failed:", e);
  }

  let missionControl = false;
  try {
    const { getMcCustomers, mcEnabled } = await import("@/lib/mission-control");
    if (mcEnabled()) {
      const customers = await getMcCustomers();
      if (customers) {
        missionControl = true;
        for (const c of customers) {
          if (c.email) emails.add(c.email);
          if (c.businessName.trim()) names.push(c.businessName);
        }
      }
    }
  } catch (e) {
    console.error("[customer-type] Mission Control lookup failed:", e);
  }

  const { sameBusiness } = await import("@/lib/name-match");
  const businessIds = new Set<number>();
  for (const listing of listings) {
    const email = listing.email.trim().toLowerCase();
    if (email && emails.has(email)) {
      businessIds.add(listing.id);
      continue;
    }
    if (listing.name.trim() && names.some((n) => sameBusiness(listing.name, n))) {
      businessIds.add(listing.id);
    }
  }

  return { businessIds, missionControl };
}
