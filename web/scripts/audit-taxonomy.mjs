/**
 * Finds listings whose category or location area is not in the taxonomy.
 *
 * Both columns store SLUGS, and the directory filters compare slugs
 * directly. Until the admin forms became dropdowns they were free text
 * with placeholders showing display names, so "HVAC" was the natural
 * thing to type and produced a listing that:
 *
 *   - renders correctly on its own card, because the display mapping
 *     falls back to prettifying whatever is stored
 *   - matches no category filter
 *   - is missing from /directory/category/hvac
 *   - has a breadcrumb pointing at a page it does not appear on
 *
 * Nothing about it looks broken, which is why it needs a query to find.
 *
 * READ ONLY. It prints what it found and, where the fix is unambiguous,
 * the UPDATE that would fix it. It never writes. Read the statements
 * before running any of them.
 *
 * Run against staging first:
 *   DB_HOST=... DB_USER=... DB_PASS=... DB_NAME=... \
 *     node scripts/audit-taxonomy.mjs
 *
 * Options:
 *   --sql   print the suggested UPDATE statements on their own at the end
 *
 * The analysis is exported and has no database in it, so it can be
 * tested against fixtures: see audit-taxonomy.test.mjs.
 */
import { pathToFileURL } from "node:url";

/** The same shape the app's slugs take, for suggesting a match. */
export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const index = (list) => {
  const bySlug = new Map();
  const byName = new Map();
  const byLooseName = new Map();
  for (const r of list) {
    bySlug.set(r.slug, r);
    byName.set(String(r.display_name).toLowerCase(), r);
    byLooseName.set(slugify(r.display_name), r);
  }
  return { bySlug, byName, byLooseName };
};

/**
 * What is wrong with one value, and what it probably should be.
 *
 * A suggestion is only offered when the stored value lands on exactly
 * one taxonomy entry, by name or by slugified name. Anything else is
 * left for a person: a wrong guess here would be applied in bulk.
 */
export function check(value, idx) {
  const raw = value === null || value === undefined ? "" : String(value).trim();
  if (raw === "") return { kind: "empty" };
  if (idx.bySlug.has(raw)) {
    return idx.bySlug.get(raw).is_active ? { kind: "ok" } : { kind: "inactive" };
  }
  const match =
    idx.byName.get(raw.toLowerCase()) ?? idx.byLooseName.get(slugify(raw));
  return match
    ? { kind: "unknown", suggest: match.slug, suggestName: match.display_name }
    : { kind: "unknown" };
}

/** Everything the report needs, with no database involved. */
export function analyse({ businesses, categories, locations }) {
  const catIndex = index(categories);
  const locIndex = index(locations);

  const problems = [];
  let ok = 0;

  for (const b of businesses) {
    const visible = !!b.is_active && !!b.is_verified && !b.is_hidden;
    const category = check(b.category, catIndex);
    const location = check(b.location_area, locIndex);
    if (category.kind === "ok" && location.kind === "ok") {
      ok++;
      continue;
    }
    problems.push({ business: b, visible, category, location });
  }

  // Live ones first: those are the listings currently unfindable.
  problems.sort((a, b) => Number(b.visible) - Number(a.visible));

  return {
    total: businesses.length,
    ok,
    problems,
    live: problems.filter((p) => p.visible).length,
  };
}

const LABEL = {
  empty: "not set",
  unknown: "NOT IN TAXONOMY",
  inactive: "taxonomy entry is inactive",
};

/** Renders the report. `escape` quotes a value for the suggested SQL. */
export function report({ result, categories, locations, escape }) {
  const out = [];
  const suggestions = [];

  out.push(`Listings:            ${result.total}`);
  out.push(`Categories:          ${categories.length}`);
  out.push(`Location areas:      ${locations.length}`);
  out.push(`Clean on both:       ${result.ok}`);
  out.push(`Needing a look:      ${result.problems.length}`);
  out.push(
    `  of those, live:    ${result.live}  (active, verified, not hidden)`,
  );
  out.push("");

  for (const p of result.problems) {
    const b = p.business;
    const bad = [];
    if (p.category.kind !== "ok") bad.push(["category", b.category, p.category]);
    if (p.location.kind !== "ok")
      bad.push(["location_area", b.location_area, p.location]);

    out.push(
      `#${b.id}  ${b.business_name}${p.visible ? "" : "   [not live]"}`,
      `      /business/${b.slug}`,
    );
    for (const [column, value, res] of bad) {
      const shown =
        value === null || String(value ?? "").trim() === "" ? "(empty)" : value;
      out.push(`      ${column}: ${shown}  -> ${LABEL[res.kind]}`);
      if (res.suggest) {
        out.push(`        looks like "${res.suggestName}" (${res.suggest})`);
        suggestions.push(
          `UPDATE directory_businesses SET ${column} = ${escape(res.suggest)} WHERE id = ${b.id};  -- ${b.business_name}: ${shown}`,
        );
      }
    }
    out.push("");
  }

  if (result.problems.length === 0) {
    out.push("Nothing to fix. Every listing sits on a taxonomy entry.");
  }

  return { text: out.join("\n"), suggestions };
}

async function main() {
  const argv = process.argv.slice(2);
  const wantSql = argv.includes("--sql");

  const need = (name) => {
    const v = process.env[name];
    if (!v) {
      console.error(
        `Missing ${name}. This talks to the live schema, so it will not guess.`,
      );
      process.exit(2);
    }
    return v;
  };

  const { default: mysql } = await import("mysql2/promise");
  const conn = await mysql.createConnection({
    host: need("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 3306),
    user: need("DB_USER"),
    password: process.env.DB_PASS ?? "",
    database: need("DB_NAME"),
  });

  const [categories] = await conn.execute(
    "SELECT slug, display_name, is_active FROM directory_categories",
  );
  const [locations] = await conn.execute(
    "SELECT slug, display_name, is_active FROM directory_locations",
  );
  const [businesses] = await conn.execute(
    `SELECT id, business_name, slug, category, location_area, city,
            is_active, is_verified, is_hidden
       FROM directory_businesses
      ORDER BY business_name`,
  );

  const result = analyse({ businesses, categories, locations });
  const { text, suggestions } = report({
    result,
    categories,
    locations,
    escape: (v) => conn.escape(v),
  });

  console.log(text);
  if (suggestions.length > 0) {
    console.log(
      `${suggestions.length} of these have an unambiguous match. Nothing has been changed.`,
    );
    if (wantSql) {
      console.log("\n-- Review each line before running any of it.\n");
      console.log(suggestions.join("\n"));
    } else {
      console.log("Re-run with --sql to print the UPDATE statements.");
    }
  }

  await conn.end();
}

// Only when run directly, so importing this for a test does not try to
// open a database connection.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
