import "server-only";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";

/**
 * One picture library, for everything written from here on.
 *
 * Images already live in three separate tables: lbs_blog_images,
 * lbs_business_images and lbs_card_images, plus whatever is still on the
 * old PHP host. All three work and none of them are touched here. This
 * is not a migration; it is where the next thing goes.
 *
 * What it adds that none of the three have room for is alt text. The
 * site currently records none anywhere, which is a real accessibility
 * gap and a small search one, and it is close to impossible to backfill
 * honestly once a few hundred pictures exist without it. Caption and
 * credit are here for the same reason: a photograph of somebody's
 * business, taken by somebody, is going to want both eventually and
 * adding the columns later is the expensive version.
 *
 * Rows are immutable. Replacing a picture writes a new row and points at
 * it, so a serving URL can be cached forever and can never come back
 * with different bytes than it did last time.
 */

export type MediaItem = {
  id: number;
  url: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  alt: string;
  caption: string;
  credit: string;
  createdAt?: string;
};

/** The shape of a stored media URL. Nothing else may match it. */
const SERVED = /^\/api\/media\/\d+$/;

export const mediaPath = (id: number) => `/api/media/${id}`;

export const isMediaPath = (value: string | null | undefined) =>
  SERVED.test((value ?? "").trim());

let ready = false;

/**
 * Unlike the places table this one is created on read as well as write,
 * because reads here are byte fetches for a URL somebody has already
 * been given. A missing table on that path is a broken picture either
 * way; creating it costs one statement per process and removes a class
 * of "the admin uploaded it but nothing serves it" bug.
 */
async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_media (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mime VARCHAR(64) NOT NULL DEFAULT 'image/webp',
      width INT NOT NULL DEFAULT 0,
      height INT NOT NULL DEFAULT 0,
      byte_size INT NOT NULL DEFAULT 0,
      sha256 CHAR(64) NOT NULL DEFAULT '',
      alt VARCHAR(500) NOT NULL DEFAULT '',
      caption VARCHAR(500) NOT NULL DEFAULT '',
      credit VARCHAR(255) NOT NULL DEFAULT '',
      bytes LONGBLOB NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY sha_idx (sha256)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

const fmtDate = (d: unknown) => {
  const dt = d instanceof Date ? d : new Date(String(d ?? ""));
  return isNaN(dt.getTime())
    ? undefined
    : dt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

type Row = {
  id: number;
  mime: string;
  width: number;
  height: number;
  byte_size: number;
  alt: string | null;
  caption: string | null;
  credit: string | null;
  created_at?: unknown;
};

const toItem = (r: Row): MediaItem => ({
  id: Number(r.id),
  url: mediaPath(Number(r.id)),
  mime: String(r.mime ?? "image/webp"),
  width: Number(r.width ?? 0),
  height: Number(r.height ?? 0),
  bytes: Number(r.byte_size ?? 0),
  alt: r.alt ?? "",
  caption: r.caption ?? "",
  credit: r.credit ?? "",
  createdAt: fmtDate(r.created_at),
});

/**
 * Never selects the blob.
 *
 * Listing forty pictures would otherwise pull forty full-size images
 * into memory to render a grid of thumbnails, which is the difference
 * between a fast screen and one that times out.
 */
export async function listMedia(limit = 200): Promise<MediaItem[]> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT id, mime, width, height, byte_size, alt, caption, credit, created_at
            FROM lbs_media
           ORDER BY id DESC
           LIMIT ${limit}`,
    )) as unknown as [Row[]];
    return (rows[0] ?? []).map(toItem);
  } catch (e) {
    console.error("[media] list failed:", e);
    return [];
  }
}

export async function getMedia(id: number): Promise<MediaItem | undefined> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT id, mime, width, height, byte_size, alt, caption, credit, created_at
            FROM lbs_media WHERE id = ${id} LIMIT 1`,
    )) as unknown as [Row[]];
    const r = rows[0]?.[0];
    return r ? toItem(r) : undefined;
  } catch (e) {
    console.error("[media] read failed:", e);
    return undefined;
  }
}

export async function getMediaBytes(
  id: number,
): Promise<{ bytes: Buffer; mime: string } | undefined> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT bytes, mime FROM lbs_media WHERE id = ${id} LIMIT 1`,
    )) as unknown as [{ bytes: Buffer; mime: string }[]];
    const r = rows[0]?.[0];
    return r
      ? { bytes: r.bytes, mime: String(r.mime ?? "image/webp") }
      : undefined;
  } catch (e) {
    console.error("[media] bytes read failed:", e);
    return undefined;
  }
}

export type SaveMediaResult =
  | { id: number; width: number; height: number; reused: boolean }
  | { error: string };

/**
 * Resizes and stores a picture.
 *
 * 2000px on the long edge. Larger than the 1600 a blog hero gets,
 * because this library also holds market hub headers, which run the full
 * width of the page rather than an article column, and a picture stored
 * once is going to be asked for at sizes nobody has thought of yet.
 * `fit: inside` never crops; the templates crop, and cropping twice
 * takes the subject out of the frame with no way back.
 *
 * The hash is taken after the resize rather than on the upload, so the
 * same photograph sent twice at different original sizes still lands on
 * one row. Reuse returns the existing id and leaves its alt text alone,
 * because whoever wrote that alt text described this exact picture.
 */
export async function saveMedia(
  input: Buffer,
  meta: { alt?: string; caption?: string; credit?: string } = {},
): Promise<SaveMediaResult> {
  try {
    await ensureTable();
    const sharp = (await import("sharp")).default;
    const img = sharp(input, { failOn: "none" });
    const probe = await img.metadata();
    if (!probe.width || !probe.height) {
      return { error: "That file does not look like an image." };
    }
    const out = await img
      .rotate() // honour EXIF, or phone photos arrive sideways
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer({ resolveWithObject: true });

    const sha = createHash("sha256").update(out.data).digest("hex");
    const { db } = await import("@/lib/db");

    const dupe = (await db.execute(
      sql`SELECT id, width, height FROM lbs_media WHERE sha256 = ${sha} LIMIT 1`,
    )) as unknown as [{ id: number; width: number; height: number }[]];
    const found = dupe[0]?.[0];
    if (found) {
      return {
        id: Number(found.id),
        width: Number(found.width),
        height: Number(found.height),
        reused: true,
      };
    }

    await db.execute(
      sql`INSERT INTO lbs_media
            (mime, width, height, byte_size, sha256, alt, caption, credit, bytes)
          VALUES ('image/webp', ${out.info.width}, ${out.info.height},
                  ${out.data.length}, ${sha},
                  ${(meta.alt ?? "").slice(0, 500)},
                  ${(meta.caption ?? "").slice(0, 500)},
                  ${(meta.credit ?? "").slice(0, 255)},
                  ${out.data})`,
    );
    const row = (await db.execute(
      sql`SELECT id FROM lbs_media WHERE sha256 = ${sha} ORDER BY id DESC LIMIT 1`,
    )) as unknown as [{ id: number }[]];
    const id = Number(row[0]?.[0]?.id ?? 0);
    if (!id) return { error: "That saved but could not be read back." };
    return { id, width: out.info.width, height: out.info.height, reused: false };
  } catch (e) {
    console.error("[media] save failed:", e);
    return { error: "That did not save." };
  }
}

/**
 * Edits the words attached to a picture, never the picture.
 *
 * Alt text is the whole reason this table exists, and it is the one
 * thing about a stored image that genuinely should be correctable after
 * the fact without minting a new id and breaking every page pointing at
 * the old one.
 */
export async function updateMediaText(
  id: number,
  meta: { alt: string; caption: string; credit: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`UPDATE lbs_media
             SET alt = ${meta.alt.slice(0, 500)},
                 caption = ${meta.caption.slice(0, 500)},
                 credit = ${meta.credit.slice(0, 255)}
           WHERE id = ${id}`,
    );
    return { ok: true };
  } catch (e) {
    console.error("[media] text update failed:", e);
    return { ok: false, error: "That did not save." };
  }
}
