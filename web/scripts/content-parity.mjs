/**
 * Pre-cutover CONTENT parity check.
 *
 * url-parity.mjs proves every indexed URL still resolves. That is not
 * enough: a page can answer 200 and still have lost most of the copy,
 * its title, or its structured data, which is how a migration keeps its
 * URLs and loses its rankings. This fetches both the live page and the
 * staging page and compares what search actually reads.
 *
 *   node scripts/content-parity.mjs [stagingBase] [liveBase] [--json out.json]
 */

const argv = process.argv.slice(2);
const jsonFlag = argv.indexOf("--json");
const JSON_OUT = jsonFlag > -1 ? argv[jsonFlag + 1] : null;
// Drop the flag and its value before reading the positional bases.
// Guard on jsonFlag > -1: without --json it is -1, so `jsonFlag + 1`
// is 0 and this quietly ate the first positional argument. Both base
// URLs then shifted by one and the run compared the wrong pair of
// sites while looking perfectly healthy.
const args = argv.filter(
  (a, i) =>
    (jsonFlag === -1 || (i !== jsonFlag && i !== jsonFlag + 1)) &&
    !a.startsWith("--"),
);
const STAGING = args[0] ?? "https://lbs-next-staging-production.up.railway.app";
const LIVE = args[1] ?? "https://www.lowcountrybusinessspotlight.com";
const CONCURRENCY = 5;

/** Copy shortfall that counts as a real regression, not noise. */
const WORD_DROP = 0.4; // staging under 60% of live
const MIN_WORDS = 120; // ignore genuinely tiny pages either side

const paths = new Set();

async function collectFromSitemap(url, depth = 0) {
  if (depth > 2) return;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`sitemap ${url}: ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  const isIndex = /<sitemapindex/i.test(xml);
  for (const loc of locs) {
    if (isIndex) await collectFromSitemap(loc, depth + 1);
    else {
      try {
        paths.add(new URL(loc).pathname);
      } catch {
        /* malformed loc */
      }
    }
  }
}

const strip = (html) =>
  html
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

function analyse(html) {
  const text = decode(strip(html));
  const words = text.split(/\s+/).filter(Boolean).length;
  const headings = (html.match(/<h[1-3][\s>]/gi) ?? []).length;
  const title = decode(
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim(),
  );
  const description = decode(
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
    )?.[1] ?? "",
  );
  const canonical =
    html.match(
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i,
    )?.[1] ?? "";
  // Schema types, whether the JSON-LD is plain or escaped inside RSC.
  const schema = [
    ...new Set(
      [...html.matchAll(/\\?"@type\\?"\s*:\s*\\?"([^"\\]+)/g)].map((m) => m[1]),
    ),
  ].sort();
  const images = (html.match(/<img[\s>]/gi) ?? []).length;
  return { words, headings, title, description, canonical, schema, images };
}

async function grab(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return { status: res.status };
    return { status: res.status, ...analyse(await res.text()) };
  } catch (e) {
    return { status: 0, error: String(e) };
  }
}

/**
 * The live sitemap lists .php URLs; the rebuild serves clean ones. Feed
 * a .php path straight to staging and every page looks like it lost
 * 100% of its copy, because what came back was a 404.
 *
 * Mirrors the .htaccess rewrites: drop the extension, and index.php is
 * the root.
 */
const stagingPath = (path) => {
  if (path === "/index.php") return "/";
  return path.replace(/\.php$/, "");
};

async function compare(path) {
  const [live, next] = await Promise.all([
    grab(LIVE + path),
    grab(STAGING + stagingPath(path)),
  ]);
  const issues = [];

  if (next.status !== 200) {
    issues.push(`staging returns ${next.status}`);
    return { path, live, next, issues };
  }
  if (live.status !== 200) {
    // Nothing to compare against; the URL check covers reachability.
    return { path, live, next, issues, skipped: true };
  }

  if (
    live.words >= MIN_WORDS &&
    next.words < live.words * (1 - WORD_DROP)
  ) {
    issues.push(
      `copy ${next.words} vs ${live.words} words (${Math.round(
        (1 - next.words / live.words) * 100,
      )}% less)`,
    );
  }
  if (live.headings > 3 && next.headings < live.headings / 2) {
    issues.push(`headings ${next.headings} vs ${live.headings}`);
  }
  if (!next.title) issues.push("no title");
  if (!next.description) issues.push("no meta description");
  if (next.title.length > 65) issues.push(`title ${next.title.length} chars`);
  if (!next.canonical) issues.push("no canonical");

  // schema.org subtypes satisfy their parent, so a BlogPosting is not a
  // lost Article and a Restaurant is not a lost LocalBusiness.
  const SATISFIES = {
    Article: ["BlogPosting", "NewsArticle"],
    LocalBusiness: [
      "Restaurant",
      "AutoRepair",
      "BeautySalon",
      "HealthAndBeautyBusiness",
      "LegalService",
      "SportsActivityLocation",
    ],
    Blog: ["BlogPosting"],
    Place: ["City", "LocalBusiness"],
    WebPage: ["ItemPage", "AboutPage"],
  };
  const covered = (type) =>
    next.schema.includes(type) ||
    (SATISFIES[type] ?? []).some((sub) => next.schema.includes(sub));
  const lost = live.schema.filter((t) => !covered(t));
  if (lost.length) issues.push(`schema lost: ${lost.join(", ")}`);

  return { path, live, next, issues };
}

async function pool(items, worker, limit) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await worker(items[idx]);
      }
    }),
  );
  return out;
}

const bar = (n) => "".padEnd(n, "=");

async function main() {
  await collectFromSitemap(`${LIVE}/sitemap.xml`);
  const list = [...paths].sort();
  console.log(`Comparing ${list.length} URLs\n${LIVE}\n${STAGING}\n`);

  const results = await pool(list, compare, CONCURRENCY);
  const problems = results.filter((r) => r.issues.length);
  const skipped = results.filter((r) => r.skipped);

  for (const r of problems) {
    console.log(`\n${r.path}`);
    for (const i of r.issues) console.log(`   - ${i}`);
  }

  const compared = results.filter((r) => !r.skipped && r.next.status === 200);
  const liveWords = compared.reduce((n, r) => n + (r.live.words ?? 0), 0);
  const nextWords = compared.reduce((n, r) => n + (r.next.words ?? 0), 0);

  console.log(`\n${bar(60)}`);
  console.log(`compared     ${compared.length}`);
  console.log(`clean        ${compared.length - problems.length}`);
  console.log(`with issues  ${problems.length}`);
  if (skipped.length) console.log(`skipped      ${skipped.length} (no live page)`);
  console.log(
    `total copy   ${nextWords} words on staging vs ${liveWords} live`,
  );

  if (JSON_OUT) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(JSON_OUT, JSON.stringify(results, null, 2));
    console.log(`\nwrote ${JSON_OUT}`);
  }
  process.exitCode = problems.length ? 1 : 0;
}

main();
