import "server-only";

/**
 * The real name of a category, location or tag.
 *
 * Every directory page title was built by title-casing the URL slug,
 * which is how "/directory/tag/bbq" became "Bbq Businesses" and
 * "/directory/category/legal" became "Legal Businesses" on a page the
 * live site calls "Legal & Financial". The names exist: all three
 * taxonomy tables carry a display_name and the PHP has always read it.
 * The listing query in directory.ts already reads it too, for the labels
 * on the cards. Only generateMetadata was inventing its own.
 *
 * A caught crawl of the live sitemap turned up 41 title differences.
 * Most were the deliberate rewrite to shorter, keyword-led titles, but
 * fifteen tags and eleven categories were losing real words: the
 * ampersands, the hyphens in "Women-Owned", and the acronyms.
 */

type Kind = "category" | "location" | "tag";

/**
 * Cached for the process, because a taxonomy row changes when somebody
 * edits it in the admin, which is roughly never, and this is otherwise
 * a database round trip on every directory page render.
 */
const cache = new Map<Kind, Map<string, string>>();

/**
 * Words the generic title-caser gets wrong.
 *
 * Only needed when a slug has no row behind it. The table is the real
 * answer; this is what keeps the fallback from printing "Bbq".
 */
const ACRONYMS = new Set([
  "bbq",
  "hvac",
  "llc",
  "diy",
  "suv",
  "rv",
  "atv",
  "hoa",
  "cpa",
  "it",
  "hr",
  "pc",
  "tv",
  "ac",
]);

/**
 * Title-case a slug without destroying what it says.
 *
 * Hyphens are kept rather than flattened to spaces, since "Women-Owned"
 * and "Veteran-Owned" are how those read everywhere else on the site,
 * and acronyms come back in capitals.
 */
export function prettifySlug(slug: string): string {
  return slug
    .split("-")
    .map((word, i) => {
      if (ACRONYMS.has(word)) return word.toUpperCase();
      const cased = word.charAt(0).toUpperCase() + word.slice(1);
      // "owned" in "women-owned" stays attached; a plain multi-word slug
      // reads as separate words. The distinction is the compound suffix.
      return i > 0 && COMPOUND_SUFFIX.has(word) ? `-${cased}` : cased;
    })
    .reduce((out, part, i) => {
      if (i === 0) return part;
      return part.startsWith("-") ? out + part : `${out} ${part}`;
    }, "");
}

/** Second halves of compounds the site hyphenates. */
const COMPOUND_SUFFIX = new Set(["owned", "friendly", "operated", "run"]);

const TABLE = {
  category: "directory_categories",
  location: "directory_locations",
  tag: "directory_tags",
} as const;

async function load(kind: Kind): Promise<Map<string, string>> {
  const hit = cache.get(kind);
  if (hit) return hit;

  const labels = new Map<string, string>();
  try {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    // Raw, because the three tables are identical in the two columns
    // that matter and a switch over three Drizzle table objects to
    // select the same two columns is more code saying less.
    const rows = (await db.execute(
      sql.raw(`SELECT slug, display_name FROM ${TABLE[kind]}`),
    )) as unknown as [{ slug: string; display_name: string }[]];
    for (const r of rows[0] ?? []) {
      if (r.slug && r.display_name) labels.set(r.slug, r.display_name);
    }
    // Only cached once it has something. An empty map from a failed or
    // not-yet-migrated install would otherwise be cached forever and
    // every page would keep the fallback name for the process lifetime.
    if (labels.size > 0) cache.set(kind, labels);
  } catch (e) {
    console.error(`[taxonomy] could not read ${TABLE[kind]}:`, e);
  }
  return labels;
}

/**
 * Falls back to the slug when there is no row and when there is no
 * database at all, so a page still renders a sensible title rather than
 * failing over a heading.
 */
export async function taxonomyLabel(kind: Kind, slug: string): Promise<string> {
  const labels = await load(kind);
  return labels.get(slug) ?? prettifySlug(slug);
}
