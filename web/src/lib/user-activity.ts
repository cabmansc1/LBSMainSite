import "server-only";
import { sql } from "drizzle-orm";

/**
 * When an advertiser last signed in, and when they were last here.
 *
 * Nothing recorded either. Neither this app nor the legacy PHP site ever
 * wrote a login timestamp, so the only answers available were indirect
 * and misleading: the date an account was created, or the last order
 * placed. Neither tells you whether somebody has opened their portal
 * since spring, which is the question worth asking before an invoice or
 * a renewal call.
 *
 * A side table rather than a column on directory_users, for the reason
 * every other addition here uses one: the PHP site still reads that
 * table and nothing good comes of altering it underneath.
 *
 * Two timestamps, because they answer different questions. The login is
 * the deliberate act, and it counts. Being seen is any authenticated
 * page view afterwards, which is what tells you somebody is actually
 * using the thing rather than having signed in once in March.
 */

export type UserActivity = {
  email: string;
  lastLogin: string | null;
  lastSeen: string | null;
  loginCount: number;
};

/**
 * How stale `last_seen` is allowed to get.
 *
 * Without this every page view in the portal is a database write, and
 * the difference between "seen at 2:04" and "seen at 2:06" is worth
 * nothing to anybody. The throttle is in the WHERE clause rather than a
 * read followed by a decision, so it stays one statement.
 */
const SEEN_THROTTLE_MINUTES = 60;

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_user_activity (
      email VARCHAR(255) NOT NULL PRIMARY KEY,
      last_login DATETIME NULL,
      last_seen DATETIME NULL,
      login_count INT NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      INDEX (last_login),
      INDEX (last_seen)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

const key = (email: string) => email.trim().toLowerCase();

/**
 * Records a sign-in.
 *
 * Called from the three routes where somebody actually signs in, and
 * deliberately not from setSessionCookie, which looks like the one place
 * to hook it but is not: it is also called when a profile edit refreshes
 * the cookie, and when an admin starts viewing as somebody. Both would
 * write a login that never happened, and the second would put your own
 * activity on their account, which makes the figure worthless exactly
 * when you are reading it.
 *
 * Never throws. A failure to count must not stop somebody signing in.
 */
export async function recordLogin(email: string): Promise<void> {
  if (!email.trim()) return;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`INSERT INTO lbs_user_activity (email, last_login, last_seen, login_count)
          VALUES (${key(email)}, NOW(), NOW(), 1)
          ON DUPLICATE KEY UPDATE
            last_login = NOW(),
            last_seen = NOW(),
            login_count = login_count + 1`,
    );
  } catch (e) {
    console.error("[user-activity] could not record login:", e);
  }
}

/**
 * Records that somebody is here, at most once an hour.
 *
 * Call inside after(): nobody should wait on this, and a portal page
 * must render whether or not it works.
 */
export async function touchSeen(email: string): Promise<void> {
  if (!email.trim()) return;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const minutes = sql.raw(String(SEEN_THROTTLE_MINUTES));
    // Only writes when the row is stale or absent. An account that
    // signed in before this existed has no row at all, so the insert
    // branch is what gives it one without waiting for a fresh sign-in.
    await db.execute(
      sql`INSERT INTO lbs_user_activity (email, last_seen, login_count)
          VALUES (${key(email)}, NOW(), 0)
          ON DUPLICATE KEY UPDATE
            last_seen = IF(
              last_seen IS NULL
                OR last_seen < DATE_SUB(NOW(), INTERVAL ${minutes} MINUTE),
              NOW(),
              last_seen
            )`,
    );
  } catch (e) {
    console.error("[user-activity] could not record a visit:", e);
  }
}

/** Activity for a page of accounts, keyed by lowercased email. */
export async function activityFor(
  emails: string[],
): Promise<Map<string, UserActivity>> {
  const out = new Map<string, UserActivity>();
  const wanted = [...new Set(emails.map(key).filter(Boolean))];
  if (wanted.length === 0) return out;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT email, last_login, last_seen, login_count
          FROM lbs_user_activity
          WHERE email IN (${sql.join(
            wanted.map((e) => sql`${e}`),
            sql`, `,
          )})`,
    )) as unknown as [
      {
        email: string;
        last_login: string | Date | null;
        last_seen: string | Date | null;
        login_count: number;
      }[],
    ];
    const iso = (v: string | Date | null) =>
      v ? new Date(v).toISOString() : null;
    for (const r of rows[0] ?? []) {
      out.set(key(String(r.email)), {
        email: String(r.email),
        lastLogin: iso(r.last_login),
        lastSeen: iso(r.last_seen),
        loginCount: Number(r.login_count ?? 0),
      });
    }
  } catch (e) {
    // An unknown last login reads as "never", which is honest: before
    // this table existed that was the only answer available anyway.
    console.error("[user-activity] lookup failed:", e);
  }
  return out;
}
