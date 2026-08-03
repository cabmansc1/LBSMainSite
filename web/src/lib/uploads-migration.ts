import "server-only";
import { sql } from "drizzle-orm";
import { alreadyApplied } from "@/lib/db-errors";

/**
 * Copies the legacy PHP site's uploaded files into MySQL, so the old
 * service can be switched off.
 *
 * Everything this app uploads already goes into the database as blobs,
 * because Railway containers have no persistent disk. What is left on
 * the old host is history: files written by the PHP site before the
 * cutover, still referenced by filename from rows this app reads. Those
 * references are the only reason lbsmainsite-production.up.railway.app
 * has to stay alive, and UPLOADS_BASE_URL currently points at it.
 *
 * Three kinds, each with a different destination and a different rule
 * about what may be done to the bytes:
 *
 *   directory_business_photos.filename      -> lbs_business_images
 *   directory_blog_posts.featured_image     -> lbs_blog_images
 *   directory_card_ad_content.logo_filename -> lbs_card_ad_files
 *
 * The first two are display images and go through the same sharp
 * resize the upload paths use, so a migrated photo is byte-identical in
 * treatment to a freshly uploaded one. The third is print artwork a
 * customer sent us and is stored untouched: resizing a logo destined
 * for a printing press to a 600px WebP would quietly destroy the only
 * copy we hold.
 *
 * Every attempt is written to lbs_upload_migration before anything else
 * changes, so this is safe to run repeatedly, safe to interrupt, and
 * answerable afterwards about any file that did not make it.
 */

export type { Category, CategorySurvey } from "@/lib/uploads-migration-types";
import type { Category, CategorySurvey } from "@/lib/uploads-migration-types";

export const CATEGORIES: Category[] = ["business_photos", "blog", "card_ads"];

export const CATEGORY_LABELS: Record<Category, string> = {
  business_photos: "Directory photos",
  blog: "Blog featured images",
  card_ads: "Card ad artwork",
};

/** Where each category's files sit under the uploads base. */
const SUBDIR: Record<Category, string> = {
  business_photos: "business_photos",
  blog: "blog",
  card_ads: "card_ads",
};

/**
 * The host still holding the files.
 *
 * Deliberately the same variable the read paths use. Pointing this at a
 * host that no longer has the files would make every fetch 404, and the
 * run would faithfully record that every file is missing, which is a
 * very convincing way to be told the wrong thing.
 */
const uploadsBase = () =>
  (
    process.env.UPLOADS_BASE_URL ??
    "https://www.lowcountrybusinessspotlight.com/uploads"
  ).replace(/\/+$/, "");

export const sourceUrl = (category: Category, filename: string) =>
  `${uploadsBase()}/${SUBDIR[category]}/${encodeURIComponent(filename)}`;

let ready = false;

async function ensureTables() {
  if (ready) return;
  const { db } = await import("@/lib/db");

  // One row per source row, not per attempt. The unique key is what
  // makes a second run skip what the first one finished rather than
  // storing every photo twice.
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_upload_migration (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category VARCHAR(32) NOT NULL,
      source_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL DEFAULT '',
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      new_id INT NULL,
      bytes INT NOT NULL DEFAULT 0,
      note VARCHAR(500) NOT NULL DEFAULT '',
      attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_source (category, source_id),
      INDEX (category, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  // Print artwork, kept exactly as the customer sent it. Separate from
  // lbs_artwork because that table is keyed by Mission Control card id
  // and these predate it: they belong to legacy card orders and the only
  // key they have is the order.
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_card_ad_files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL DEFAULT '',
      original_filename VARCHAR(255) NOT NULL DEFAULT '',
      mime VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
      bytes LONGBLOB NOT NULL,
      byte_size INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  for (const alter of [
    "ALTER TABLE lbs_upload_migration ADD COLUMN bytes INT NOT NULL DEFAULT 0",
    "ALTER TABLE lbs_upload_migration ADD COLUMN note VARCHAR(500) NOT NULL DEFAULT ''",
  ]) {
    try {
      await db.execute(sql.raw(alter));
    } catch (e) {
      if (!alreadyApplied(e)) throw e;
    }
  }

  ready = true;
}

/** What MySQL will take in one statement, for the untouched originals. */
let packetLimit: number | null = null;
const PACKET_HEADROOM = 512 * 1024;

async function readPacketLimit() {
  if (packetLimit !== null) return packetLimit;
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT @@max_allowed_packet AS n`,
    )) as unknown as [{ n: number | string }[]];
    const n = Number(rows[0]?.[0]?.n);
    if (Number.isFinite(n) && n > 0) packetLimit = n;
  } catch (e) {
    console.error("[uploads-migration] could not read max_allowed_packet:", e);
  }
  return packetLimit;
}

type Pending = { sourceId: number; filename: string; extra?: number };

/**
 * Source rows still pointing at a file on the old host.
 *
 * Each query excludes anything already recorded done, so "remaining"
 * shrinks as work completes and a resumed run picks up where it stopped.
 * A row whose last attempt failed is offered again; a row whose file was
 * genuinely not there is not, because retrying a 404 forever turns a
 * finished migration into one that never completes.
 */
async function pendingFor(category: Category, limit: number): Promise<Pending[]> {
  const { db } = await import("@/lib/db");
  const done = sql`SELECT source_id FROM lbs_upload_migration
                   WHERE category = ${category}
                     AND status IN ('done', 'missing', 'skipped')`;

  if (category === "business_photos") {
    const rows = (await db.execute(
      sql`SELECT id, filename, business_id, is_primary
          FROM directory_business_photos
          WHERE filename IS NOT NULL AND filename <> ''
            AND id NOT IN (${done})
          ORDER BY id
          LIMIT ${sql.raw(String(limit))}`,
    )) as unknown as [
      { id: number; filename: string; business_id: number; is_primary: number }[],
    ];
    return (rows[0] ?? []).map((r) => ({
      sourceId: Number(r.id),
      filename: String(r.filename),
      extra: Number(r.business_id),
    }));
  }

  if (category === "blog") {
    // Anything already rewritten to a serving path is finished by
    // definition, so it is excluded here rather than fetched and failed.
    const rows = (await db.execute(
      sql`SELECT id, featured_image
          FROM directory_blog_posts
          WHERE featured_image IS NOT NULL AND featured_image <> ''
            AND featured_image NOT LIKE '/api/%'
            AND id NOT IN (${done})
          ORDER BY id
          LIMIT ${sql.raw(String(limit))}`,
    )) as unknown as [{ id: number; featured_image: string }[]];
    return (rows[0] ?? []).map((r) => ({
      sourceId: Number(r.id),
      filename: String(r.featured_image),
    }));
  }

  const rows = (await db.execute(
    sql`SELECT id, order_id, logo_filename, logo_original_filename
        FROM directory_card_ad_content
        WHERE logo_filename IS NOT NULL AND logo_filename <> ''
          AND id NOT IN (${done})
        ORDER BY id
        LIMIT ${sql.raw(String(limit))}`,
  )) as unknown as [
    { id: number; order_id: number; logo_filename: string }[],
  ];
  return (rows[0] ?? []).map((r) => ({
    sourceId: Number(r.id),
    filename: String(r.logo_filename),
    extra: Number(r.order_id),
  }));
}

async function record(
  category: Category,
  sourceId: number,
  filename: string,
  status: "done" | "failed" | "missing" | "skipped",
  newId: number | null,
  bytes: number,
  note: string,
) {
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`INSERT INTO lbs_upload_migration
          (category, source_id, filename, status, new_id, bytes, note)
        VALUES (${category}, ${sourceId}, ${filename.slice(0, 255)},
                ${status}, ${newId}, ${bytes}, ${note.slice(0, 500)})
        ON DUPLICATE KEY UPDATE
          status = VALUES(status), new_id = COALESCE(VALUES(new_id), new_id),
          bytes = VALUES(bytes), note = VALUES(note)`,
  );
}

/**
 * The blob id an earlier attempt stored, if it got that far.
 *
 * new_id is a fact about where the bytes now live, not part of the
 * status, which is why record() above refuses to overwrite a known id
 * with null. A later attempt that fails still knows the bytes are safe.
 */
async function priorNewId(
  category: Category,
  sourceId: number,
): Promise<number | null> {
  const { db } = await import("@/lib/db");
  const rows = (await db.execute(
    sql`SELECT new_id FROM lbs_upload_migration
        WHERE category = ${category} AND source_id = ${sourceId}
          AND new_id IS NOT NULL
        LIMIT 1`,
  )) as unknown as [{ new_id: number }[]];
  const n = Number(rows[0]?.[0]?.new_id ?? 0);
  return n > 0 ? n : null;
}

/**
 * Redirects the source row at the bytes now held in the database.
 *
 * Always the step after the bytes are stored, never before: if this runs
 * first and the store then fails, the photo has been unhooked from the
 * old host and hooked to nothing.
 *
 * The directory photo case blanks the filename rather than nulling it.
 * Both readers of that column skip a falsy filename, so an empty string
 * hides the row exactly as null would, and pendingFor already excludes
 * `filename <> ''` so the row stays out of later batches. The difference
 * is that this cannot be refused: nothing in this repo creates
 * directory_business_photos, the legacy PHP writes a filename on every
 * insert and so never exercised a null, and a NOT NULL column there
 * would reject the update after the bytes were already stored.
 *
 * alt_text is deliberately left in place. It is the only copy of that
 * text anywhere, the blob table has nowhere to put it yet, and clearing
 * the filename already hides the row.
 *
 * Card artwork gets no pointer at all: logo_filename is read by the
 * admin orders list as a yes/no "has artwork" flag and nothing renders
 * the file, so clearing it would make every historic order look like the
 * customer never sent anything.
 */
async function pointAtStored(
  category: Category,
  sourceId: number,
  newId: number,
): Promise<void> {
  const { db } = await import("@/lib/db");
  if (category === "business_photos") {
    await db.execute(
      sql`UPDATE directory_business_photos SET filename = ''
          WHERE id = ${sourceId}`,
    );
  } else if (category === "blog") {
    const { blogImagePath } = await import("@/lib/blog-images");
    await db.execute(
      sql`UPDATE directory_blog_posts SET featured_image = ${blogImagePath(newId)}
          WHERE id = ${sourceId}`,
    );
  }
}

/**
 * Pulls one file off the old host.
 *
 * A 404 and a timeout are different answers and must not be recorded the
 * same way: the first means the row points at something that is not
 * there and never will be, the second means try again. Only the first is
 * terminal.
 */
async function fetchFile(
  url: string,
): Promise<
  | { ok: true; bytes: Buffer; mime: string }
  | { ok: false; missing: boolean; error: string }
> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });
    if (res.status === 404 || res.status === 410) {
      return { ok: false, missing: true, error: `not on the old host (${res.status})` };
    }
    if (!res.ok) {
      return { ok: false, missing: false, error: `http ${res.status}` };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) {
      return { ok: false, missing: true, error: "empty file" };
    }
    return {
      ok: true,
      bytes: buf,
      mime: res.headers.get("content-type")?.split(";")[0]?.trim() || "",
    };
  } catch (e) {
    const msg = String(e);
    return {
      ok: false,
      missing: false,
      error: /timeout|abort/i.test(msg) ? "timed out" : msg.slice(0, 200),
    };
  }
}

export type BatchResult = {
  category: Category;
  attempted: number;
  done: number;
  missing: number;
  failed: number;
  remaining: number;
  errors: { filename: string; error: string }[];
};

/**
 * Migrates up to `limit` files, then returns.
 *
 * Bounded rather than looping to completion because this runs inside a
 * request: a few hundred files, each a network fetch plus a resize plus
 * a blob insert, is far past any sensible request timeout. The caller
 * repeats until `remaining` reaches zero, which also means an interrupted
 * run costs at most one batch.
 */
export async function migrateBatch(
  category: Category,
  limit = 10,
): Promise<BatchResult> {
  await ensureTables();
  const { db } = await import("@/lib/db");

  const out: BatchResult = {
    category,
    attempted: 0,
    done: 0,
    missing: 0,
    failed: 0,
    remaining: 0,
    errors: [],
  };

  const pending = await pendingFor(category, limit);
  out.attempted = pending.length;

  for (const p of pending) {
    // Storing the bytes and pointing the row at them are two writes, and
    // a row that failed between them is offered again. Without this, that
    // retry would store the same photo a second time and the listing
    // would render it twice. A partial row is finished, never redone.
    const prior = await priorNewId(category, p.sourceId);
    if (prior !== null) {
      try {
        await pointAtStored(category, p.sourceId, prior);
        await record(
          category, p.sourceId, p.filename, "done", prior, 0,
          "bytes were already stored by an earlier attempt",
        );
        out.done++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await record(category, p.sourceId, p.filename, "failed", prior, 0, msg);
        out.failed++;
        out.errors.push({ filename: p.filename, error: msg.slice(0, 200) });
      }
      continue;
    }

    const got = await fetchFile(sourceUrl(category, p.filename));

    if (!got.ok) {
      const status = got.missing ? "missing" : "failed";
      await record(category, p.sourceId, p.filename, status, null, 0, got.error);
      if (got.missing) out.missing++;
      else out.failed++;
      out.errors.push({ filename: p.filename, error: got.error });
      continue;
    }

    // Known as soon as the bytes are stored, so the catch below reports a
    // failure without losing where they went.
    let storedId: number | null = null;

    try {
      if (category === "business_photos") {
        const { saveBusinessImage } = await import("@/lib/business-images");
        // is_primary decides logo or gallery, matching how the legacy
        // site chose which photo headed the listing.
        const rows = (await db.execute(
          sql`SELECT is_primary FROM directory_business_photos
              WHERE id = ${p.sourceId} LIMIT 1`,
        )) as unknown as [{ is_primary: number }[]];
        const kind = Number(rows[0]?.[0]?.is_primary ?? 0) === 1 ? "logo" : "gallery";

        // reuseIdentical because a run that stored the bytes and then
        // failed on the update recorded no id to find them by. The
        // resize is deterministic, so the same legacy file coming back
        // through here produces the row that is already there.
        const saved = await saveBusinessImage(Number(p.extra), got.bytes, kind, {
          reuseIdentical: true,
        });
        // saveBusinessImage answers an upload form, so its error is
        // written for a customer. detail carries what actually went
        // wrong, which is the only version worth writing to a log a
        // migration is going to be debugged from.
        if ("error" in saved) throw new Error(saved.detail ?? saved.error);
        storedId = saved.id;

        // Written before the source row is touched, so a run interrupted
        // here can be resumed rather than storing the photo again.
        await record(
          category, p.sourceId, p.filename, "failed", saved.id, got.bytes.length,
          "bytes stored, source row not yet updated",
        );
        await pointAtStored(category, p.sourceId, saved.id);
        await record(
          category, p.sourceId, p.filename, "done", saved.id, got.bytes.length,
          `${kind}, ${saved.width}x${saved.height}`,
        );
      } else if (category === "blog") {
        const { saveBlogImage } = await import("@/lib/blog-images");
        const saved = await saveBlogImage(got.bytes);
        if ("error" in saved) throw new Error(saved.error);
        storedId = saved.id;

        await record(
          category, p.sourceId, p.filename, "failed", saved.id, got.bytes.length,
          "bytes stored, source row not yet updated",
        );
        await pointAtStored(category, p.sourceId, saved.id);
        await record(
          category, p.sourceId, p.filename, "done", saved.id, got.bytes.length,
          `${saved.width}x${saved.height}`,
        );
      } else {
        // Print artwork: stored byte for byte. No resize, no re-encode.
        const cap = await readPacketLimit();
        const max = cap === null ? Infinity : Math.max(0, cap - PACKET_HEADROOM);
        if (got.bytes.length > max) {
          await record(
            category, p.sourceId, p.filename, "failed", null, got.bytes.length,
            `too large for max_allowed_packet (${got.bytes.length} bytes)`,
          );
          out.failed++;
          out.errors.push({
            filename: p.filename,
            error: `${Math.round(got.bytes.length / 1024)}KB exceeds max_allowed_packet`,
          });
          continue;
        }

        const orig = (await db.execute(
          sql`SELECT logo_original_filename AS n FROM directory_card_ad_content
              WHERE id = ${p.sourceId} LIMIT 1`,
        )) as unknown as [{ n: string | null }[]];

        await db.execute(
          sql`INSERT INTO lbs_card_ad_files
                (order_id, filename, original_filename, mime, bytes, byte_size)
              VALUES (${Number(p.extra)}, ${p.filename},
                      ${String(orig[0]?.[0]?.n ?? "")},
                      ${got.mime || "application/octet-stream"},
                      ${got.bytes}, ${got.bytes.length})`,
        );
        const idRow = (await db.execute(
          sql`SELECT LAST_INSERT_ID() AS id`,
        )) as unknown as [{ id: number }[]];
        storedId = Number(idRow[0]?.[0]?.id ?? 0) || null;

        await record(
          category, p.sourceId, p.filename, "done",
          storedId, got.bytes.length,
          got.mime || "unknown type",
        );
      }
      out.done++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[uploads-migration] ${category}/${p.filename} failed:`, e);
      await record(category, p.sourceId, p.filename, "failed", storedId, 0, msg);
      out.failed++;
      out.errors.push({ filename: p.filename, error: msg.slice(0, 200) });
    }
  }

  out.remaining = (await pendingFor(category, 100000)).length;
  return out;
}

/** Counts only. Safe to load on every render of the admin page. */
export async function surveyUploads(): Promise<{
  categories: CategorySurvey[];
  base: string;
  totalRemaining: number;
}> {
  const base = uploadsBase();
  const categories: CategorySurvey[] = [];
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    for (const category of CATEGORIES) {
      const stats = (await db.execute(
        sql`SELECT status, COUNT(*) AS n FROM lbs_upload_migration
            WHERE category = ${category} GROUP BY status`,
      )) as unknown as [{ status: string; n: number }[]];
      const by = new Map(
        (stats[0] ?? []).map((r) => [String(r.status), Number(r.n)]),
      );
      categories.push({
        category,
        label: CATEGORY_LABELS[category],
        remaining: (await pendingFor(category, 100000)).length,
        done: by.get("done") ?? 0,
        missing: by.get("missing") ?? 0,
        failed: by.get("failed") ?? 0,
      });
    }
  } catch (e) {
    console.error("[uploads-migration] survey failed:", e);
  }
  return {
    categories,
    base,
    totalRemaining: categories.reduce((n, c) => n + c.remaining, 0),
  };
}

/** Everything that did not make it, for the admin to look at. */
export async function getProblems(): Promise<
  { category: string; filename: string; status: string; note: string; url: string }[]
> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT category, filename, status, note FROM lbs_upload_migration
          WHERE status IN ('failed', 'missing')
          ORDER BY category, filename LIMIT 200`,
    )) as unknown as [
      { category: string; filename: string; status: string; note: string }[],
    ];
    return (rows[0] ?? []).map((r) => ({
      category: String(r.category),
      filename: String(r.filename),
      status: String(r.status),
      note: String(r.note ?? ""),
      url: sourceUrl(String(r.category) as Category, String(r.filename)),
    }));
  } catch (e) {
    console.error("[uploads-migration] problems read failed:", e);
    return [];
  }
}

/**
 * Clears the failed rows so a run can try them again.
 *
 * Only 'failed', never 'missing'. A file the old host does not have is
 * not going to appear because we asked a second time, and offering that
 * as a retry button would just be a way to make the same run take longer
 * every time it is pressed.
 */
export async function retryFailed(): Promise<number> {
  try {
    await ensureTables();
    const { db } = await import("@/lib/db");
    const before = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM lbs_upload_migration WHERE status = 'failed'`,
    )) as unknown as [{ n: number }[]];
    await db.execute(sql`DELETE FROM lbs_upload_migration WHERE status = 'failed'`);
    return Number(before[0]?.[0]?.n ?? 0);
  } catch (e) {
    console.error("[uploads-migration] retry reset failed:", e);
    return 0;
  }
}
