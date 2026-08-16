import "server-only";
import { sql } from "drizzle-orm";

/**
 * Where a renamed listing used to live.
 *
 * A listing's slug is built from its name once, at creation, and then
 * frozen, so a name typed wrong stays in the URL forever. Making the
 * slug editable is the fix, but a bare rename trades one problem for a
 * worse one: the old URL is what search has indexed and what a QR code
 * printed on a mailed postcard resolves through, and paper already in
 * mailboxes cannot be reissued. So a rename records where the listing
 * went, and the public routes follow it.
 *
 * A table rather than next.config, because these are written by an
 * admin at runtime and a config rule needs a deploy.
 */

let ensured = false;

async function ensureTable() {
  if (ensured) return;
  const { db } = await import("@/lib/db");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lbs_slug_redirects (
      from_slug VARCHAR(190) NOT NULL PRIMARY KEY,
      to_slug VARCHAR(190) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_to (to_slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  ensured = true;
}

/** The shape a slug has to have to be reachable and readable. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Point an old slug at the listing's new one.
 *
 * Three writes, and each one prevents a specific way this goes wrong
 * once a listing has been renamed more than once:
 *
 * Existing rows aiming at the old slug are moved to the new one, so a
 * listing renamed A to B to C leaves both A and B pointing at C. Left
 * alone they would chain, and a chain costs an extra round trip per hop
 * and dies entirely if a middle row is ever removed.
 *
 * Any row whose from_slug is the slug being adopted is deleted. A live
 * listing must win over a redirect, and leaving it would mean a rename
 * back to a previous name produced a page that redirected away from
 * itself.
 *
 * The pair is only written when the two differ, which keeps a save that
 * did not touch the slug from recording a self-referential hop.
 */
export async function recordSlugChange(from: string, to: string) {
  if (!from || !to || from === to) return;
  await ensureTable();
  const { db } = await import("@/lib/db");

  await db.execute(
    sql`UPDATE lbs_slug_redirects SET to_slug = ${to} WHERE to_slug = ${from}`,
  );
  await db.execute(sql`DELETE FROM lbs_slug_redirects WHERE from_slug = ${to}`);
  await db.execute(sql`
    INSERT INTO lbs_slug_redirects (from_slug, to_slug)
    VALUES (${from}, ${to})
    ON DUPLICATE KEY UPDATE to_slug = VALUES(to_slug)
  `);
}

/**
 * The slug a dead one now points at, if any.
 *
 * Called only when a lookup has already missed, so the cost lands on
 * requests that were going to 404 anyway rather than on every page view.
 */
export async function resolveSlugRedirect(slug: string): Promise<string | undefined> {
  if (!slug) return undefined;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT to_slug FROM lbs_slug_redirects WHERE from_slug = ${slug} LIMIT 1`,
    )) as unknown as [{ to_slug?: string }[]];
    const to = (rows[0] ?? [])[0]?.to_slug;
    return to ? String(to) : undefined;
  } catch {
    // A missing table or an unreachable database should leave the
    // visitor with the 404 they were already getting, not an error page.
    return undefined;
  }
}
