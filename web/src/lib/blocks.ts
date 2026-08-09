import "server-only";
import { sql } from "drizzle-orm";
import { BLOCK_REGISTRY, type BlockDef } from "@/lib/blocks-registry";

/**
 * Editable page copy.
 *
 * Roughly half the words on this site were compiled into it. The zone
 * pages carry about thirteen thousand of them in zone-content.ts, and
 * every headline on every marketing page sat in its own page.tsx. That
 * was the right call during the migration, when preserving years of
 * search equity mattered more than making it editable, and it is the
 * wrong one now: changing a sentence meant a commit, a build and a
 * deploy, so sentences did not get changed.
 *
 * The mechanism is the one pricing-store and zone-store already use.
 * Code holds the value the site ships with; a row in this table
 * overrides it. That ordering is what makes it safe to roll out: an
 * empty table leaves every page byte-identical to what it serves today,
 * so nothing can break on the way in, and a bad edit is undone by
 * deleting a row rather than by shipping a fix.
 *
 * Reads never create the table. A public page asking for a headline must
 * not run DDL, and if the table is absent, unreadable, or this is the
 * Docker build with no database at all, the fallbacks in code are the
 * right answer anyway.
 */

export type { BlockDef, BlockKind } from "@/lib/blocks-registry";

/** What a page's copy resolves to once overrides are applied. */
export type PageCopy = {
  /** A single string. Falls back to the registry, then to "". */
  t: (key: string) => string;
  /** A list of strings. Falls back to the registry, then to []. */
  list: (key: string) => string[];
};

let ready = false;

/** Created from admin writes only, never from a page render. */
async function ensureTable() {
  if (ready) return;
  const { db } = await import("@/lib/db");
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS lbs_blocks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      page_key VARCHAR(80) NOT NULL,
      block_key VARCHAR(120) NOT NULL,
      value MEDIUMTEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by VARCHAR(191) NOT NULL DEFAULT '',
      UNIQUE KEY page_block (page_key, block_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  ready = true;
}

const defsFor = (page: string) => BLOCK_REGISTRY.filter((b) => b.page === page);

const defAt = (page: string, key: string) =>
  BLOCK_REGISTRY.find((b) => b.page === page && b.key === key);

/**
 * A stored list is JSON. A stored anything-else is the string itself.
 *
 * Parsing defensively rather than trusting the kind, because the kind
 * lives in code and the value lives in the database, and the two can
 * disagree the moment a block is retyped in the registry. A list that
 * will not parse falls back to code instead of rendering "[object
 * Object]" on the homepage.
 */
function parseList(raw: string): string[] | undefined {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => String(x)) : undefined;
  } catch {
    return undefined;
  }
}

async function readOverrides(page: string): Promise<Map<string, string>> {
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT block_key, value FROM lbs_blocks WHERE page_key = ${page}`,
    )) as unknown as [{ block_key: string; value: string }[]];
    return new Map((rows[0] ?? []).map((r) => [String(r.block_key), String(r.value)]));
  } catch {
    // No table, no database, no problem: code is the fallback.
    return new Map();
  }
}

/**
 * The copy for one page, overrides applied.
 *
 * Called once per render and passed down, rather than once per string,
 * so a page with twenty blocks still costs one query.
 */
export async function pageCopy(page: string): Promise<PageCopy> {
  const saved = await readOverrides(page);
  return {
    t: (key) => {
      const raw = saved.get(key);
      if (raw !== undefined && raw.trim()) return raw;
      const def = defAt(page, key);
      const fb = def?.fallback;
      if (typeof fb === "string") return fb;
      // Asking for a key that is not in the registry is a typo in a
      // template. Returning "" renders nothing rather than the literal
      // key, which is the failure a visitor is least likely to notice.
      return "";
    },
    list: (key) => {
      const raw = saved.get(key);
      const parsed = raw !== undefined ? parseList(raw) : undefined;
      if (parsed && parsed.length) return parsed;
      const fb = defAt(page, key)?.fallback;
      return Array.isArray(fb) ? fb : [];
    },
  };
}

/**
 * Splits copy on *asterisks* so a headline can carry one emphasised run.
 *
 * The homepage headline has always had a coloured phrase inside it, and
 * an editable headline has to keep that without asking anyone to type
 * HTML into a textarea. One convention, one meaning, and text that still
 * reads correctly if nobody ever uses it.
 */
export function highlightSegments(text: string): { text: string; mark: boolean }[] {
  return text
    .split(/(\*[^*]+\*)/g)
    .filter((part) => part !== "")
    .map((part) =>
      part.startsWith("*") && part.endsWith("*") && part.length > 2
        ? { text: part.slice(1, -1), mark: true }
        : { text: part, mark: false },
    );
}

/* ---------- admin ---------- */

export type BlockRow = BlockDef & {
  /** What is stored, or null when the page is still using the code value. */
  override: string | null;
  /** What the page actually renders right now. */
  current: string | string[];
  updatedAt?: string;
  updatedBy?: string;
};

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

/**
 * Every block on a page, whether or not it has been edited.
 *
 * Driven by the registry rather than by the table, so the screen lists
 * the copy that exists on the page instead of only the copy somebody has
 * already changed. A block nobody has touched is the normal case and it
 * still needs a row to type into.
 */
export async function listBlocks(page: string): Promise<BlockRow[]> {
  let meta = new Map<string, { value: string; updated_at?: unknown; updated_by?: string }>();
  try {
    const { db } = await import("@/lib/db");
    const rows = (await db.execute(
      sql`SELECT block_key, value, updated_at, updated_by
            FROM lbs_blocks WHERE page_key = ${page}`,
    )) as unknown as [
      { block_key: string; value: string; updated_at?: unknown; updated_by?: string }[],
    ];
    meta = new Map((rows[0] ?? []).map((r) => [String(r.block_key), r]));
  } catch {
    meta = new Map();
  }

  return defsFor(page).map((def) => {
    const row = meta.get(def.key);
    const override = row?.value ?? null;
    let current: string | string[] = def.fallback;
    if (override !== null && override.trim()) {
      if (def.kind === "list") {
        current = parseList(override) ?? def.fallback;
      } else {
        current = override;
      }
    }
    return {
      ...def,
      override,
      current,
      updatedAt: row ? fmtDate(row.updated_at) : undefined,
      updatedBy: row?.updated_by || undefined,
    };
  });
}

export type BlockResult = { ok: true } | { ok: false; error: string };

/**
 * Saves an edit.
 *
 * Refuses a key the registry does not know, because a block that no
 * template reads is a row nobody will ever see the effect of, and the
 * screen would happily accept it forever.
 */
export async function saveBlock(
  page: string,
  key: string,
  value: string,
  by = "",
): Promise<BlockResult> {
  const def = defAt(page, key);
  if (!def) return { ok: false, error: "Nothing on the site reads that." };
  if (def.kind === "list" && !parseList(value)) {
    return { ok: false, error: "That list could not be read. Give one item per line." };
  }
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`INSERT INTO lbs_blocks (page_key, block_key, value, updated_by)
          VALUES (${page}, ${key}, ${value}, ${by.slice(0, 191)})
          ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by)`,
    );
    return { ok: true };
  } catch (e) {
    console.error("[blocks] save failed:", e);
    return { ok: false, error: "That did not save." };
  }
}

/**
 * Puts a block back to the words the site ships with.
 *
 * Deleting the row rather than writing the fallback into it, so the page
 * goes back to tracking code. Writing the current fallback in would
 * freeze it: a later copy change in a deploy would not reach a page that
 * had been "reset".
 */
export async function resetBlock(page: string, key: string): Promise<BlockResult> {
  try {
    await ensureTable();
    const { db } = await import("@/lib/db");
    await db.execute(
      sql`DELETE FROM lbs_blocks WHERE page_key = ${page} AND block_key = ${key}`,
    );
    return { ok: true };
  } catch (e) {
    console.error("[blocks] reset failed:", e);
    return { ok: false, error: "That did not save." };
  }
}
