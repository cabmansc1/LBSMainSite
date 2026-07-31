import "server-only";
import { sql } from "drizzle-orm";

/**
 * Featured images for blog posts, stored in MySQL.
 *
 * directory_blog_posts.featured_image holds a bare filename, and the
 * file itself lives under /uploads/blog on the legacy PHP host. This app
 * runs on Railway and cannot write to that disk, so the admin could name
 * an image that was already there and nothing else: adding a new one was
 * impossible.
 *
 * So new images go in the database, the same way listing logos and past
 * card images already do. Reads are cached forever because rows are
 * immutable: replacing an image writes a new row rather than editing
 * bytes in place, so a cached URL can never show the wrong picture.
 *
 * The column still carries a string, so nothing about the schema
 * changes. What is stored is now either a legacy filename, which keeps
 * resolving to the old host exactly as before, or the serving path of a
 * row in this table. resolveBlogImageUrl is the only place that tells
 * the two apart.
 */

let ready = false;

async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_blog_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mime VARCHAR(64) NOT NULL DEFAULT 'image/webp',
      width INT NOT NULL DEFAULT 0,
      height INT NOT NULL DEFAULT 0,
      bytes LONGBLOB NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

/**
 * There is no post_id column on purpose. A post is written before it is
 * saved, so the editor uploads an image for a post that has no id yet.
 * The post row points at the image rather than the other way round, and
 * that is the only direction that always exists.
 */

/** The shape of a stored image's URL. Nothing else may match it. */
const UPLOADED = /^\/api\/blog-image\/\d+$/;

const legacyBase = () =>
  (
    process.env.UPLOADS_BASE_URL ??
    "https://www.lowcountrybusinessspotlight.com/uploads"
  ).replace(/\/$/, "") + "/blog/";

/**
 * Turns whatever featured_image holds into something an img tag can use.
 *
 * Every post written before uploads existed stores a filename, and those
 * files are still only on the PHP host, so anything that is not one of
 * our own serving paths is sent there untouched. The test is an exact
 * match rather than "starts with a slash" so that no legacy value, however
 * oddly it was typed, can be mistaken for a local route.
 */
export function resolveBlogImageUrl(
  stored: string | null | undefined,
): string | undefined {
  const value = (stored ?? "").trim();
  if (!value) return undefined;
  if (UPLOADED.test(value)) return value;
  return legacyBase() + value;
}

/** The path stored in featured_image for an image saved here. */
export const blogImagePath = (id: number) => `/api/blog-image/${id}`;

export async function getBlogImageBytes(
  id: number,
): Promise<{ bytes: Buffer; mime: string } | undefined> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT bytes, mime FROM lbs_blog_images WHERE id = ${id} LIMIT 1`,
    )) as unknown as [{ bytes: Buffer; mime: string }[]];
    const r = rows[0]?.[0];
    return r ? { bytes: r.bytes, mime: String(r.mime ?? "image/webp") } : undefined;
  } catch (e) {
    console.error("[blog-images] read failed:", e);
    return undefined;
  }
}

/**
 * Resizes and stores a featured image.
 *
 * 1600px, unlike the 600px a directory logo gets, because this one is
 * seen large: it runs the full width of the 760px article column on the
 * post page, which wants 1520px on a 2x screen, and it is the image
 * social cards use, where 1200px wide is the floor Facebook and X ask
 * for. Below about 1600 the hero goes soft on a laptop; above it the
 * bytes buy nothing anyone will see.
 *
 * `fit: inside` never crops. The two places this renders crop it
 * themselves to 16/9, and cropping twice would take the subject out of
 * the frame with no way to get it back.
 */
export async function saveBlogImage(
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
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer({ resolveWithObject: true });

    const { db } = await import("@/lib/db");
    await db.execute(
      sql`INSERT INTO lbs_blog_images (mime, width, height, bytes)
          VALUES ('image/webp', ${out.info.width}, ${out.info.height}, ${out.data})`,
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
    console.error("[blog-images] save failed:", e);
    return { error: "That image could not be processed." };
  }
}
