import "server-only";
import { sql } from "drizzle-orm";

/**
 * The areas a directory listing can be filed under.
 *
 * These live in directory_locations, which the legacy PHP site also
 * reads, so this adds and edits rows and never alters the table's shape.
 *
 * Adding one had no path at all. The list arrived with the migration and
 * there was no screen for it in either admin, so a new town meant somebody
 * writing SQL by hand against production. That is the kind of job that
 * gets done once, at speed, with a typo in it.
 */

export type DirectoryArea = {
  id: number;
  /** What listings store in location_area. Fixed once created. */
  slug: string;
  name: string;
  order: number;
  active: boolean;
  /** Published listings filed here, so nothing is hidden blindly. */
  listings: number;
};

export const slugifyArea = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function listAreas(): Promise<DirectoryArea[]> {
  try {
    const { db } = await import("@/lib/db");
    // Counted against location_area, which stores the slug, so the
    // number is what the public filter would actually return.
    const rows = (await db.execute(
      sql`SELECT l.id, l.slug, l.display_name, l.display_order, l.is_active,
                 (SELECT COUNT(*) FROM directory_businesses b
                   WHERE b.location_area = l.slug
                     AND b.is_active = 1 AND b.is_verified = 1 AND b.is_hidden = 0
                 ) AS listings
          FROM directory_locations l
          ORDER BY l.display_order, l.display_name`,
    )) as unknown as [
      {
        id: number;
        slug: string;
        display_name: string;
        display_order: number | null;
        is_active: number | null;
        listings: number | string;
      }[],
    ];
    return (rows[0] ?? []).map((r) => ({
      id: Number(r.id),
      slug: String(r.slug),
      name: String(r.display_name),
      order: Number(r.display_order ?? 0),
      // Only a literal 1 counts, because the public filter compares
      // is_active to true and SQL drops NULL from that comparison. A row
      // left NULL by the legacy site is already invisible on the site,
      // and calling it "Showing" here would have this screen disagree
      // with the thing it exists to control. Toggling writes 1 or 0, so
      // an old NULL settles the first time anybody touches it.
      active: Number(r.is_active) === 1,
      listings: Number(r.listings ?? 0),
    }));
  } catch (e) {
    console.error("[areas] list failed:", e);
    return [];
  }
}

export type AreaResult = { ok: true } | { ok: false; error: string };

/**
 * Adds an area.
 *
 * The slug comes from the name and is never editable afterwards, because
 * listings store the slug rather than a foreign key. Changing it would
 * not move the listings; it would orphan them, and they would vanish
 * from the very filter this screen exists to populate.
 */
export async function createArea(name: string): Promise<AreaResult> {
  const display = name.trim();
  const slug = slugifyArea(display);
  if (display.length < 2 || !slug) {
    return { ok: false, error: "Give the area a name." };
  }
  try {
    const { db } = await import("@/lib/db");
    const existing = (await db.execute(
      sql`SELECT id, display_name FROM directory_locations WHERE slug = ${slug} LIMIT 1`,
    )) as unknown as [{ id: number; display_name: string }[]];
    if (existing[0]?.[0]) {
      return {
        ok: false,
        error: `That is already here as "${existing[0][0].display_name}".`,
      };
    }
    // Appended, so adding one never reshuffles an order somebody set.
    const next = (await db.execute(
      sql`SELECT COALESCE(MAX(display_order), 0) + 1 AS n FROM directory_locations`,
    )) as unknown as [{ n: number }[]];
    await db.execute(
      sql`INSERT INTO directory_locations (slug, display_name, display_order, is_active)
          VALUES (${slug}, ${display}, ${Number(next[0]?.[0]?.n ?? 1)}, 1)`,
    );
    clearAreaCache();
    return { ok: true };
  } catch (e) {
    console.error("[areas] create failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

/** Renames an area. The slug stays as it is, so listings keep their home. */
export async function renameArea(id: number, name: string): Promise<AreaResult> {
  const display = name.trim();
  if (display.length < 2) return { ok: false, error: "Give the area a name." };
  try {
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`UPDATE directory_locations SET display_name = ${display} WHERE id = ${id}`,
    );
    clearAreaCache();
    return { ok: true };
  } catch (e) {
    console.error("[areas] rename failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

/**
 * Takes an area off the filters, or puts it back.
 *
 * There is no delete. A listing records its area as a slug rather than a
 * link, so removing the row would not tidy anything up: the listings
 * would keep pointing at a name nothing can resolve, and would drop out
 * of the filter with no trace of why. Hiding it does the same job and
 * can be undone.
 */
export async function setAreaActive(
  id: number,
  active: boolean,
): Promise<AreaResult> {
  try {
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`UPDATE directory_locations SET is_active = ${active ? 1 : 0} WHERE id = ${id}`,
    );
    clearAreaCache();
    return { ok: true };
  } catch (e) {
    console.error("[areas] activate failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

/**
 * Labels are cached for the life of the process, so a rename here would
 * otherwise keep showing the old name on listing pages until a deploy.
 */
function clearAreaCache() {
  void import("@/lib/taxonomy-labels")
    .then((m) => m.forgetTaxonomy("location"))
    .catch(() => {});
}
