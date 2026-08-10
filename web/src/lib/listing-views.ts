import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { SITE_TZ } from "@/lib/time";

/**
 * How many people actually looked at a listing.
 *
 * Deliberately not the legacy views_count column. That was incremented by
 * the PHP site, stopped meaning anything the day traffic moved here, and
 * has unknown provenance stretching back years. Mixing it with real
 * numbers would produce a figure nobody could defend, and this one is
 * meant to be shown to the advertiser it belongs to.
 *
 * A row per business, per day, per visitor, with the primary key doing
 * the deduplication: someone reading a listing, going away and coming
 * back an hour later is one view, not two. INSERT IGNORE means the second
 * write is free rather than a read followed by a decision.
 *
 * The visitor is a hash, never an address. Salted with the day as well as
 * a secret, so the same person on two days does not produce the same
 * value and the table cannot be walked backwards into a browsing history.
 * It exists to answer "is this the same person again today", and it
 * cannot answer anything else.
 */

/** Crawlers, previewers and monitors. Counting these makes the number a lie. */
const BOTS =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|flipboard|tumblr|headless|lighthouse|pagespeed|gtmetrix|uptime|pingdom|curl|wget|python-requests|axios|node-fetch|postman|monitor|preview/i;

export const looksLikeBot = (userAgent: string): boolean =>
  !userAgent.trim() || BOTS.test(userAgent);

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_listing_views (
      business_id INT NOT NULL,
      day DATE NOT NULL,
      visitor CHAR(32) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (business_id, day, visitor),
      INDEX (business_id, day),
      INDEX (day)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

/**
 * One visitor, for one day, as a value that cannot be reversed.
 *
 * The secret comes from the environment where there is one. Without it
 * the salt is a constant, which is weaker but still means the table holds
 * no addresses; the alternative is refusing to count at all on a deploy
 * that has not set it, which would silently produce zeros.
 */
function visitorHash(ip: string, userAgent: string, day: string): string {
  const secret = process.env.AUTH_SECRET ?? process.env.SESSION_SECRET ?? "lbs";
  return createHash("sha256")
    .update(`${secret}|${day}|${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

/** Today where the business is, not where the server is. */
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: SITE_TZ });

/**
 * Records a view. Never throws, never blocks the page.
 *
 * Call inside after(): a listing must render whether or not this works,
 * and a visitor should not wait on a write they will never see.
 */
export async function recordListingView(input: {
  businessId: number;
  ip: string;
  userAgent: string;
  /** Signed-in admins are skipped: looking at a listing to check it is
   *  not a visit, and an admin reviewing fifty of them would be the
   *  busiest reader in the directory. */
  isAdmin?: boolean;
}): Promise<void> {
  if (!Number.isInteger(input.businessId) || input.businessId <= 0) return;
  if (input.isAdmin) return;
  if (looksLikeBot(input.userAgent)) return;

  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const day = today();
    await db.execute(
      sql`INSERT IGNORE INTO lbs_listing_views (business_id, day, visitor)
          VALUES (${input.businessId}, ${day},
                  ${visitorHash(input.ip, input.userAgent, day)})`,
    );
  } catch (e) {
    console.error("[views] could not record:", e);
  }
}

/** Views per listing over the last N days, for a page of listings. */
export async function viewsFor(
  businessIds: number[],
  days = 30,
): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (businessIds.length === 0) return out;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT business_id, COUNT(*) AS n
          FROM lbs_listing_views
          WHERE business_id IN (${sql.join(
            businessIds.map((id) => sql`${id}`),
            sql`, `,
          )})
            AND day >= DATE_SUB(CURDATE(), INTERVAL ${sql.raw(
              String(Math.max(1, Math.min(3650, days))),
            )} DAY)
          GROUP BY business_id`,
    )) as unknown as [{ business_id: number; n: number | string }[]];
    for (const r of rows[0] ?? []) {
      out.set(Number(r.business_id), Number(r.n));
    }
  } catch (e) {
    console.error("[views] lookup failed:", e);
  }
  return out;
}

export type ViewTotals = {
  last7: number;
  last30: number;
  total: number;
  /** When counting began, so a small number can be read fairly. */
  since: string | null;
};

/** The numbers for one listing, for its owner. */
export async function viewTotals(businessId: number): Promise<ViewTotals> {
  const empty: ViewTotals = { last7: 0, last30: 0, total: 0, since: null };
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT
            SUM(day >= DATE_SUB(CURDATE(), INTERVAL 7 DAY))  AS last7,
            SUM(day >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS last30,
            COUNT(*) AS total,
            MIN(day) AS since
          FROM lbs_listing_views WHERE business_id = ${businessId}`,
    )) as unknown as [
      {
        last7: number | string | null;
        last30: number | string | null;
        total: number | string | null;
        since: string | null;
      }[],
    ];
    const r = rows[0]?.[0];
    if (!r) return empty;
    return {
      last7: Number(r.last7 ?? 0),
      last30: Number(r.last30 ?? 0),
      total: Number(r.total ?? 0),
      since: r.since ? String(r.since).slice(0, 10) : null,
    };
  } catch (e) {
    console.error("[views] totals failed:", e);
    return empty;
  }
}
