import "server-only";
import { sql } from "drizzle-orm";

/**
 * Logos for directory listings, stored in MySQL.
 *
 * The legacy site keeps photos as files under /uploads/business_photos
 * on its own server and records the filename in
 * directory_business_photos. This app runs on Railway and cannot write
 * to that filesystem, which is why uploading stopped working: the
 * column could read the old files and nothing could add a new one.
 *
 * So logos go in the database, the same way past card images already
 * do. A logo is tens of kilobytes after resizing, and a few hundred
 * listings is a few megabytes, which is nothing for MySQL to carry.
 * Reads are cached forever because rows are immutable: replacing a logo
 * writes a new row rather than editing bytes in place, so a cached URL
 * can never show the wrong image.
 *
 * The legacy PHP site cannot see these, since it looks for files on
 * disk. That is fine while it serves production and this one does not,
 * and it stops mattering at cutover.
 */

/** A logo is the thumbnail; gallery photos are the strip on the page. */
export type ImageKind = "logo" | "gallery";

export type BusinessImage = {
  id: number;
  businessId: number;
  mime: string;
  width: number;
  height: number;
};

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_business_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      mime VARCHAR(64) NOT NULL DEFAULT 'image/webp',
      width INT NOT NULL DEFAULT 0,
      height INT NOT NULL DEFAULT 0,
      bytes LONGBLOB NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      kind VARCHAR(16) NOT NULL DEFAULT 'logo',
      sort_order INT NOT NULL DEFAULT 0,
      INDEX (business_id),
      INDEX (business_id, id),
      INDEX (business_id, kind)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  // CREATE TABLE IF NOT EXISTS does nothing to a table that already
  // exists, and this one predates the gallery. Duplicate column is the
  // expected outcome on every run after the first.
  const codeOf = (err: unknown): string | undefined =>
    (err as { code?: string })?.code ??
    (err as { cause?: { code?: string } })?.cause?.code;
  for (const alter of [
    sql`ALTER TABLE lbs_business_images ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'logo'`,
    sql`ALTER TABLE lbs_business_images ADD COLUMN sort_order INT NOT NULL DEFAULT 0`,
  ]) {
    try {
      await db.execute(alter);
    } catch (e) {
      if (codeOf(e) !== "ER_DUP_FIELDNAME") {
        console.error("[business-images] could not add column:", e);
      }
    }
  }

  ready = true;
}

/**
 * Newest logo id per business, for the listing pages.
 *
 * Ids only. Selecting bytes here would drag every logo through a query
 * that only needs to build a URL.
 */
export async function getBusinessImageIds(
  businessIds: number[],
): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (businessIds.length === 0) return out;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT business_id, MAX(id) AS id
          FROM lbs_business_images
          WHERE kind = 'logo' AND business_id IN (${sql.join(
            businessIds.map((id) => sql`${id}`),
            sql`, `,
          )})
          GROUP BY business_id`,
    )) as unknown as [{ business_id: number; id: number }[]];
    for (const r of rows[0] ?? []) {
      out.set(Number(r.business_id), Number(r.id));
    }
  } catch (e) {
    // A listing without a thumbnail is a cosmetic problem. Failing the
    // whole admin screen over it is not.
    console.error("[business-images] lookup failed:", e);
  }
  return out;
}

export async function getBusinessImageBytes(
  id: number,
): Promise<{ bytes: Buffer; mime: string } | undefined> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT bytes, mime FROM lbs_business_images WHERE id = ${id} LIMIT 1`,
    )) as unknown as [{ bytes: Buffer; mime: string }[]];
    const r = rows[0]?.[0];
    return r ? { bytes: r.bytes, mime: String(r.mime ?? "image/webp") } : undefined;
  } catch (e) {
    console.error("[business-images] read failed:", e);
    return undefined;
  }
}

/**
 * Resizes and stores a logo.
 *
 * 600px and WebP because a directory thumbnail renders at 36px and a
 * listing page at a few hundred. Storing the 4MB original a phone
 * produced would make every backup slower to no visible benefit.
 *
 * `fit: inside` never crops. A logo cropped to a square loses the parts
 * of a wordmark that make it readable.
 */
export async function saveBusinessImage(
  businessId: number,
  input: Buffer,
  kind: ImageKind = "logo",
): Promise<{ id: number; width: number; height: number } | { error: string }> {
  try {
    await ensureTable();
    const sharp = (await import("sharp")).default;
    const img = sharp(input, { failOn: "none" });
    const meta = await img.metadata();
    if (!meta.width || !meta.height) {
      return { error: "That file does not look like an image." };
    }
    // A gallery photo is looked at rather than glanced at, so it gets
    // room a 600px logo does not need.
    const box = kind === "gallery" ? 1400 : 600;
    const out = await img
      .rotate() // honour EXIF, or phone photos arrive sideways
      .resize({ width: box, height: box, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer({ resolveWithObject: true });

    const { db } = await import("@/lib/db");
    // Appended after whatever is already there, so an upload never
    // reorders a gallery somebody has already arranged.
    const next = (await db.execute(
      sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS n
          FROM lbs_business_images
          WHERE business_id = ${businessId} AND kind = ${kind}`,
    )) as unknown as [{ n: number }[]];

    await db.execute(
      sql`INSERT INTO lbs_business_images
            (business_id, mime, width, height, bytes, kind, sort_order)
          VALUES (${businessId}, 'image/webp', ${out.info.width},
                  ${out.info.height}, ${out.data}, ${kind},
                  ${Number(next[0]?.[0]?.n ?? 0)})`,
    );
    const rows = (await db.execute(
      sql`SELECT LAST_INSERT_ID() AS id`,
    )) as unknown as [{ id: number }[]];
    return {
      id: Number(rows[0]?.[0]?.id ?? 0),
      width: out.info.width,
      height: out.info.height,
    };
  } catch (e) {
    console.error("[business-images] save failed:", e);
    return { error: "That image could not be processed." };
  }
}

export async function deleteBusinessImages(businessId: number): Promise<void> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`DELETE FROM lbs_business_images WHERE business_id = ${businessId}`,
    );
  } catch (e) {
    console.error("[business-images] delete failed:", e);
  }
}

/**
 * Gallery photos for a page of listings, newest arrangement first.
 *
 * Ids and dimensions only, never bytes: this builds URLs, and dragging
 * every photo through it would make the directory query carry megabytes
 * it never renders.
 */
export async function getGalleryImages(
  businessIds: number[],
): Promise<Map<number, { id: number; width: number; height: number }[]>> {
  const out = new Map<number, { id: number; width: number; height: number }[]>();
  if (businessIds.length === 0) return out;
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT id, business_id, width, height
          FROM lbs_business_images
          WHERE kind = 'gallery' AND business_id IN (${sql.join(
            businessIds.map((id) => sql`${id}`),
            sql`, `,
          )})
          ORDER BY business_id, sort_order, id`,
    )) as unknown as [
      { id: number; business_id: number; width: number; height: number }[],
    ];
    for (const r of rows[0] ?? []) {
      const list = out.get(Number(r.business_id)) ?? [];
      list.push({
        id: Number(r.id),
        width: Number(r.width),
        height: Number(r.height),
      });
      out.set(Number(r.business_id), list);
    }
  } catch (e) {
    console.error("[business-images] gallery lookup failed:", e);
  }
  return out;
}

/** What one listing has, for the portal to draw and delete from. */
export async function getImagesFor(
  businessId: number,
): Promise<{ logo?: number; gallery: number[] }> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT id, kind FROM lbs_business_images
          WHERE business_id = ${businessId}
          ORDER BY sort_order, id`,
    )) as unknown as [{ id: number; kind: string }[]];
    const gallery: number[] = [];
    let logo: number | undefined;
    for (const r of rows[0] ?? []) {
      // Newest logo wins, matching what the listing pages render.
      if (r.kind === "logo") logo = Number(r.id);
      else gallery.push(Number(r.id));
    }
    return { logo, gallery };
  } catch (e) {
    console.error("[business-images] listing lookup failed:", e);
    return { gallery: [] };
  }
}

/**
 * Removes one image.
 *
 * Scoped to the business as well as the image id, so an id belonging to
 * somebody else's listing deletes nothing rather than deleting theirs.
 * Returns whether it actually removed a row.
 */
export async function deleteBusinessImage(
  businessId: number,
  imageId: number,
): Promise<boolean> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`DELETE FROM lbs_business_images
          WHERE id = ${imageId} AND business_id = ${businessId}`,
    );
    const check = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM lbs_business_images WHERE id = ${imageId}`,
    )) as unknown as [{ n: number }[]];
    return Number(check[0]?.[0]?.n ?? 0) === 0;
  } catch (e) {
    console.error("[business-images] delete failed:", e);
    return false;
  }
}

/** How many gallery photos one listing already has. */
export async function countGallery(businessId: number): Promise<number> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM lbs_business_images
          WHERE business_id = ${businessId} AND kind = 'gallery'`,
    )) as unknown as [{ n: number }[]];
    return Number(rows[0]?.[0]?.n ?? 0);
  } catch {
    return 0;
  }
}
