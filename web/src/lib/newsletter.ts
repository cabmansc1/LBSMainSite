import "server-only";
import { sql } from "drizzle-orm";

/**
 * Newsletter subscribers, replacing newsletter_subscribe.php.
 *
 * Writes to `directory_newsletter_subscribers`, the same table the PHP
 * site writes to and the same one its own list exports read. This is a
 * shared table, not an `lbs_` table this app invented, so nothing here
 * alters it.
 *
 * The CREATE TABLE is copied from the PHP verbatim, engine and charset
 * defaults included, because the PHP runs that exact statement on every
 * subscribe. On the live database the table already exists and this is a
 * no-op; on a fresh one both systems end up with the same table rather
 * than two guesses at it.
 */

/**
 * What happened to this address, because the caller needs to tell the
 * visitor the truth and only a genuinely new subscriber gets pushed to
 * the CRM. Resubscribing is not an error and never reaches the visitor
 * as one.
 */
export type SubscribeResult =
  | "subscribed"
  | "already"
  | "resubscribed"
  | "failed";

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS directory_newsletter_subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      source VARCHAR(50) DEFAULT 'blog',
      is_active TINYINT(1) DEFAULT 1,
      subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  ready = true;
}

/** `source` is VARCHAR(50) and MySQL in strict mode rejects an overrun row. */
const cut = (value: string, max: number) => value.slice(0, max);

export async function subscribeToNewsletter(
  email: string,
  source: string,
): Promise<SubscribeResult> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");

    const found = (await db.execute(
      sql`SELECT id, is_active FROM directory_newsletter_subscribers
          WHERE email = ${email}
          LIMIT 1`,
    )) as unknown as [Record<string, unknown>[]];
    const existing = found[0]?.[0];

    if (existing) {
      if (Number(existing.is_active) === 1) return "already";
      await db.execute(
        sql`UPDATE directory_newsletter_subscribers
            SET is_active = 1
            WHERE id = ${Number(existing.id)}`,
      );
      return "resubscribed";
    }

    // ON DUPLICATE KEY covers the gap between the SELECT above and this
    // INSERT. Two clicks landing together used to raise a duplicate key
    // error on the unique email index, which the PHP would have shown as
    // "Something went wrong"; here the second one is simply a no-op that
    // leaves the original subscribed_at alone.
    await db.execute(
      sql`INSERT INTO directory_newsletter_subscribers (email, source)
          VALUES (${email}, ${cut(source, 50)})
          ON DUPLICATE KEY UPDATE is_active = 1`,
    );
    return "subscribed";
  } catch (e) {
    // The route decides what the visitor sees. It cannot claim somebody
    // is on a list they are not on, so this returns a value rather than
    // throwing.
    console.error("[newsletter] could not record subscriber:", e);
    return "failed";
  }
}
