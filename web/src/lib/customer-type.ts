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
 * Email is the join, the same as everywhere else in this app.
 */

export type AdvertiserIndex = {
  /** Lowercase emails that have bought a card spot. */
  emails: Set<string>;
  /**
   * False when Mission Control could not be read, so the set is orders
   * only. Worth surfacing rather than hiding: with MC missing, the great
   * majority of real advertisers would be labelled directory-only, and a
   * label that is confidently wrong is worse than one that admits it.
   */
  missionControl: boolean;
};

export async function getAdvertiserIndex(): Promise<AdvertiserIndex> {
  const emails = new Set<string>();

  try {
    const { db } = await import("@/lib/db");
    const { ensureOrdersTable } = await import("@/lib/orders");
    await ensureOrdersTable();
    const rows = (await db.execute(
      sql`SELECT DISTINCT LOWER(email) AS email FROM lbs_orders
          WHERE status = 'paid' AND email <> ''`,
    )) as unknown as [{ email: string }[]];
    for (const r of rows[0] ?? []) emails.add(String(r.email));
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
        for (const c of customers) if (c.email) emails.add(c.email);
      }
    }
  } catch (e) {
    console.error("[customer-type] Mission Control lookup failed:", e);
  }

  return { emails, missionControl };
}
