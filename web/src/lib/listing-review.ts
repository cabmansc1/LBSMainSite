import "server-only";
import { sql } from "drizzle-orm";

/**
 * Why a listing was turned down.
 *
 * Denying used to delete the row outright, which meant a rejection left
 * nothing behind: no record that it happened, no reason, and nothing to
 * tell the business. A legitimate shop whose submission was thin got the
 * same treatment as spam, and if they asked why, there was no answer to
 * give them.
 *
 * Kept and marked instead. The listing stays unverified so it is still
 * invisible to the public, exactly as before, and this table carries the
 * reason so it can be explained and so the queue does not show a
 * rejected listing as though nobody had looked at it yet.
 *
 * Its own table rather than columns on directory_businesses: the legacy
 * PHP still reads that one, and it has no notion of a rejection.
 * Deleting is still available and still means what it says.
 */

export type ListingReview = {
  status: "rejected";
  reason: string;
  by: string;
  at: string | null;
};

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_listing_review (
      business_id INT NOT NULL PRIMARY KEY,
      status VARCHAR(16) NOT NULL DEFAULT 'rejected',
      reason VARCHAR(500) NOT NULL DEFAULT '',
      reviewed_by VARCHAR(255) NOT NULL DEFAULT '',
      reviewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

export async function getReviews(
  businessIds: number[],
): Promise<Map<number, ListingReview>> {
  const out = new Map<number, ListingReview>();
  if (businessIds.length === 0) return out;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT business_id, status, reason, reviewed_by, reviewed_at
          FROM lbs_listing_review
          WHERE business_id IN (${sql.join(
            businessIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
    )) as unknown as [Record<string, unknown>[]];
    for (const r of rows[0] ?? []) {
      out.set(Number(r.business_id), {
        status: "rejected",
        reason: String(r.reason ?? ""),
        by: String(r.reviewed_by ?? ""),
        at: r.reviewed_at ? String(r.reviewed_at) : null,
      });
    }
  } catch (e) {
    // Everything reads as not-rejected, which shows a listing in the
    // queue again rather than hiding one that needs attention.
    console.error("[listing-review] read failed:", e);
  }
  return out;
}

export async function markRejected(
  businessId: number,
  reason: string,
  by: string,
): Promise<void> {
  await ensureTable();
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`INSERT INTO lbs_listing_review (business_id, status, reason, reviewed_by)
        VALUES (${businessId}, 'rejected', ${reason.slice(0, 500)}, ${by.slice(0, 255)})
        ON DUPLICATE KEY UPDATE
          status = 'rejected', reason = VALUES(reason),
          reviewed_by = VALUES(reviewed_by)`,
  );
}

/**
 * Puts a listing back in the queue.
 *
 * The row goes rather than gaining a status of its own, so "no row"
 * keeps meaning exactly one thing. A business that fixed what was wrong
 * should look identical to one that has just arrived.
 */
export async function clearRejected(businessId: number): Promise<void> {
  await ensureTable();
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`DELETE FROM lbs_listing_review WHERE business_id = ${businessId}`,
  );
}

/**
 * How many listings are waiting for somebody to look at them.
 *
 * The same question /admin/directory answers in its "Pending review"
 * chip, asked in SQL rather than by counting a list in the browser:
 * unverified, and with no rejection recorded against it. Rejected has
 * to be excluded here for the same reason it comes first in statusOf,
 * or a denied listing would sit in the count forever looking like
 * nobody had got to it.
 *
 * Errors are not swallowed into a zero. The dashboard renders a failed
 * stat as a dash on purpose, because a 0 for an unreachable table is
 * how a dashboard talks you out of checking something that is broken.
 */
export async function countAwaitingReview(): Promise<number> {
  await ensureTable();
  const { db } = await import("@/lib/db");
  const rows = (await db.execute(
    sql`SELECT COUNT(*) AS n
          FROM directory_businesses b
          LEFT JOIN lbs_listing_review r ON r.business_id = b.id
         WHERE b.is_verified = 0 AND r.business_id IS NULL`,
  )) as unknown as [{ n: number | string }[]];
  return Number(rows[0]?.[0]?.n ?? 0);
}
