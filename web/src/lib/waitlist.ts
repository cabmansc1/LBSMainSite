import "server-only";
import { sql } from "drizzle-orm";

/**
 * Category waitlist.
 *
 * Somebody wanted a spot, their category was already taken on the card
 * that is filling, and they asked to be told when it frees up. That is
 * a warm lead with a stated category, which makes it the most valuable
 * thing the site captures short of a sale.
 *
 * This replaces an earlier attempt that wrote to `waitlist_entries` and
 * `mailing_zones` from the Drizzle schema. Nothing ever created those
 * tables: there are no migrations in this repo and no push step in the
 * build, so every submission threw ER_NO_SUCH_TABLE and the visitor got
 * a 500. Runtime-created `lbs_` tables are how the rest of the app does
 * this, so the waitlist does it that way too.
 *
 * Two things the old shape got wrong and this one fixes:
 *
 * The category was never stored. It went to Mission Control and nowhere
 * else, and the column held a hardcoded `category_id` of 0. A waitlist
 * that cannot say what somebody is waiting for answers no question.
 *
 * The zone was a foreign key into a table that does not exist. Zones
 * live in lib/zones.ts and are keyed by slug everywhere else in the app,
 * so the slug is stored directly and there is no join to get wrong.
 */

export type WaitlistEntry = {
  id: number;
  zoneSlug: string;
  category: string;
  email: string;
  businessName: string;
  notifiedAt: string | null;
  createdAt: string | null;
};

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_waitlist (
      id INT AUTO_INCREMENT PRIMARY KEY,
      zone_slug VARCHAR(120) NOT NULL DEFAULT '',
      category VARCHAR(160) NOT NULL DEFAULT '',
      email VARCHAR(255) NOT NULL,
      business_name VARCHAR(255) DEFAULT '',
      notified_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_lbs_waitlist (zone_slug, category, email(190)),
      INDEX (created_at),
      INDEX (notified_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

/**
 * Asking twice is not an error. The unique key covers zone, category
 * and email, so a repeat submission refreshes the row rather than
 * stacking duplicates, and a different category in the same zone is a
 * separate wait rather than a collision.
 *
 * Returns false when the write did not land. The caller has to know:
 * telling somebody they are on a list they are not on is the one
 * outcome worse than an error message.
 */
export async function addWaitlistEntry(input: {
  zoneSlug: string;
  category: string;
  email: string;
  businessName?: string;
}): Promise<boolean> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`INSERT INTO lbs_waitlist (zone_slug, category, email, business_name)
          VALUES (${input.zoneSlug}, ${input.category}, ${input.email},
                  ${input.businessName ?? ""})
          ON DUPLICATE KEY UPDATE
            business_name = VALUES(business_name),
            created_at = created_at`,
    );
    return true;
  } catch (e) {
    console.error("[waitlist] could not record entry:", e);
    return false;
  }
}

const row = (r: Record<string, unknown>): WaitlistEntry => ({
  id: Number(r.id),
  zoneSlug: String(r.zone_slug ?? ""),
  category: String(r.category ?? ""),
  email: String(r.email ?? ""),
  businessName: String(r.business_name ?? ""),
  notifiedAt: r.notified_at ? String(r.notified_at) : null,
  createdAt: r.created_at ? String(r.created_at) : null,
});

export async function getWaitlistEntries(): Promise<WaitlistEntry[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT * FROM lbs_waitlist
          ORDER BY notified_at IS NOT NULL, created_at DESC
          LIMIT 500`,
    )) as unknown as [Record<string, unknown>[]];
    return (rows[0] ?? []).map(row);
  } catch (e) {
    console.error("[waitlist] list failed:", e);
    return [];
  }
}

/** People still owed a reply. This is the number worth putting on a dashboard. */
export async function countWaitingEntries(): Promise<number> {
  await ensureTable();
  const { db } = await import("@/lib/db");
  const rows = (await db.execute(
    sql`SELECT COUNT(*) AS n FROM lbs_waitlist WHERE notified_at IS NULL`,
  )) as unknown as [{ n: number }[]];
  return Number(rows[0]?.[0]?.n ?? 0);
}

export async function setWaitlistNotified(
  ids: number[],
  notified: boolean,
): Promise<number> {
  const clean = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (clean.length === 0) return 0;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const list = sql.join(
      clean.map((id) => sql`${id}`),
      sql`, `,
    );
    const result = (await db.execute(
      notified
        ? sql`UPDATE lbs_waitlist SET notified_at = NOW() WHERE id IN (${list})`
        : sql`UPDATE lbs_waitlist SET notified_at = NULL WHERE id IN (${list})`,
    )) as unknown as [{ affectedRows?: number }];
    return result[0]?.affectedRows ?? 0;
  } catch (e) {
    console.error("[waitlist] could not update:", e);
    return 0;
  }
}

export async function deleteWaitlistEntries(ids: number[]): Promise<number> {
  const clean = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (clean.length === 0) return 0;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const result = (await db.execute(
      sql`DELETE FROM lbs_waitlist WHERE id IN (${sql.join(
        clean.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )) as unknown as [{ affectedRows?: number }];
    return result[0]?.affectedRows ?? 0;
  } catch (e) {
    console.error("[waitlist] could not delete:", e);
    return 0;
  }
}

/**
 * Rows in the abandoned `waitlist_entries` table, if it exists at all.
 *
 * Near certainly zero, since nothing ever created it. Counted rather
 * than displayed because writing a reader for a table that was never
 * written to is speculative work, and a count is enough to prove the
 * assumption right or wrong. A missing table is the expected answer,
 * so the error is swallowed.
 */
export async function countLegacyWaitlistRows(): Promise<number> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM waitlist_entries`,
    )) as unknown as [{ n: number }[]];
    return Number(rows[0]?.[0]?.n ?? 0);
  } catch {
    return 0;
  }
}
