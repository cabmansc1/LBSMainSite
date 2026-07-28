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
      INDEX (business_id),
      INDEX (business_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
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
          WHERE business_id IN (${sql.join(
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
): Promise<{ id: number; width: number; height: number } | { error: string }> {
  try {
    await ensureTable();
    const sharp = (await import("sharp")).default;
    const img = sharp(input, { failOn: "none" });
    const meta = await img.metadata();
    if (!meta.width || !meta.height) {
      return { error: "That file does not look like an image." };
    }
    const out = await img
      .rotate() // honour EXIF, or phone photos arrive sideways
      .resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer({ resolveWithObject: true });

    const { db } = await import("@/lib/db");
    await db.execute(
      sql`INSERT INTO lbs_business_images (business_id, mime, width, height, bytes)
          VALUES (${businessId}, 'image/webp', ${out.info.width},
                  ${out.info.height}, ${out.data})`,
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
