import "server-only";
import { sql } from "drizzle-orm";

/**
 * Whether somebody has dealt with an inquiry.
 *
 * directory_business_inquiries has a name, an email, a message and a
 * date, and nothing else. No read flag, no replied flag, no owner. That
 * is why the portal has never offered a "reply to an inquiry" to-do:
 * an item that cannot clear itself teaches people to ignore the list,
 * and then the artwork deadline gets ignored along with it.
 *
 * The state goes in a table of our own rather than as new columns on
 * that one. The legacy PHP site still reads it, this app has no
 * migration history for it, and a shared table is the wrong place to
 * find out that an assumption about its shape was wrong. A join on the
 * id costs nothing and cannot break anybody else.
 *
 * A row exists only once something has happened to the inquiry, so
 * "no row" means new. That keeps the common case free.
 */

export type InquiryState = {
  status: "new" | "handled";
  handledBy: string;
  handledAt: string | null;
  note: string;
};

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_inquiry_state (
      inquiry_id INT NOT NULL PRIMARY KEY,
      status VARCHAR(16) NOT NULL DEFAULT 'new',
      handled_by VARCHAR(255) NOT NULL DEFAULT '',
      handled_at DATETIME NULL,
      note VARCHAR(500) NOT NULL DEFAULT '',
      INDEX (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

/**
 * The address to send a listing's inquiries to.
 *
 * Read here rather than taken from DirectoryBusiness, which leaves email
 * out on purpose: that type is what renders public listing pages, and a
 * business's address on one of those is a mailbox harvested within a
 * week. Wanting it for a notification is not a reason to publish it.
 */
export async function businessNotifyEmail(businessId: number): Promise<string> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT email FROM directory_businesses WHERE id = ${businessId} LIMIT 1`,
    )) as unknown as [{ email: string | null }[]];
    return String(rows[0]?.[0]?.email ?? "").trim();
  } catch (e) {
    console.error("[inquiries] owner email lookup failed:", e);
    return "";
  }
}

export async function getInquiryStates(
  ids: number[],
): Promise<Map<number, InquiryState>> {
  const out = new Map<number, InquiryState>();
  if (ids.length === 0) return out;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT inquiry_id, status, handled_by, handled_at, note
          FROM lbs_inquiry_state
          WHERE inquiry_id IN (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`, `,
          )})`,
    )) as unknown as [Record<string, unknown>[]];
    for (const r of rows[0] ?? []) {
      out.set(Number(r.inquiry_id), {
        status: String(r.status) === "handled" ? "handled" : "new",
        handledBy: String(r.handled_by ?? ""),
        handledAt: r.handled_at ? String(r.handled_at) : null,
        note: String(r.note ?? ""),
      });
    }
  } catch (e) {
    // Everything reads as new, which is the safe direction: an inquiry
    // shown as outstanding gets looked at twice, one hidden as handled
    // gets looked at never.
    console.error("[inquiries] state read failed:", e);
  }
  return out;
}

export async function setInquiryHandled(
  inquiryId: number,
  by: string,
  handled: boolean,
  note = "",
): Promise<void> {
  await ensureTable();
  const { db } = await import("@/lib/db");
  if (!handled) {
    // Reopening removes the row rather than writing status 'new', so
    // "no row" keeps meaning exactly one thing.
    await db.execute(
      sql`DELETE FROM lbs_inquiry_state WHERE inquiry_id = ${inquiryId}`,
    );
    return;
  }
  await db.execute(
    sql`INSERT INTO lbs_inquiry_state (inquiry_id, status, handled_by, handled_at, note)
        VALUES (${inquiryId}, 'handled', ${by.slice(0, 255)}, NOW(), ${note.slice(0, 500)})
        ON DUPLICATE KEY UPDATE
          status = 'handled', handled_by = VALUES(handled_by),
          handled_at = NOW(), note = VALUES(note)`,
  );
}

/**
 * Outstanding inquiries for a set of listings, for the portal to-do.
 *
 * Counted with a LEFT JOIN rather than by loading both sides, because
 * the to-do list only needs the number and an advertiser with two
 * hundred inquiries should not pay for two hundred rows to learn it.
 */
export async function countUnhandled(businessIds: number[]): Promise<number> {
  if (businessIds.length === 0) return 0;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT COUNT(*) AS n
          FROM directory_business_inquiries i
          LEFT JOIN lbs_inquiry_state s ON s.inquiry_id = i.id
          WHERE i.business_id IN (${sql.join(
            businessIds.map((id) => sql`${id}`),
            sql`, `,
          )})
            AND (s.status IS NULL OR s.status <> 'handled')`,
    )) as unknown as [{ n: number | string }[]];
    return Number(rows[0]?.[0]?.n ?? 0);
  } catch (e) {
    console.error("[inquiries] unhandled count failed:", e);
    return 0;
  }
}
