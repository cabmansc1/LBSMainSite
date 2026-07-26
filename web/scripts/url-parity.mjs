/**
 * Pre-cutover URL parity check.
 *
 * Pulls every URL from the live site's sitemap, requests the same path on
 * the staging app, and reports any that fail to resolve. Run before DNS
 * cutover so no indexed URL 404s on the new stack.
 *
 *   node scripts/url-parity.mjs [stagingBase] [liveBase]
 */

const STAGING =
  process.argv[2] ?? "https://lbs-next-staging-production.up.railway.app";
const LIVE = process.argv[3] ?? "https://www.lowcountrybusinessspotlight.com";
const CONCURRENCY = 6;

const paths = new Set();

async function collectFromSitemap(url, depth = 0) {
  if (depth > 2) return;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`sitemap ${url}: ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  const isIndex = /<sitemapindex/i.test(xml);
  for (const loc of locs) {
    if (isIndex) {
      await collectFromSitemap(loc, depth + 1);
    } else {
      try {
        paths.add(new URL(loc).pathname);
      } catch {
        /* ignore malformed loc */
      }
    }
  }
}

async function check(path) {
  const url = STAGING + path;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const location = res.headers.get("location");
    return { path, status: res.status, location };
  } catch (e) {
    return { path, status: 0, error: String(e) };
  }
}

async function pool(items, worker, limit) {
  const results = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await worker(items[idx]);
      }
    }),
  );
  return results;
}

console.log(`Live sitemap:   ${LIVE}/sitemap.xml`);
console.log(`Staging target: ${STAGING}\n`);

await collectFromSitemap(`${LIVE}/sitemap.xml`);
const list = [...paths].sort();
console.log(`Collected ${list.length} live URLs. Checking staging...\n`);

const results = await pool(list, check, CONCURRENCY);

const ok = results.filter((r) => r.status >= 200 && r.status < 300);
const redirects = results.filter((r) => r.status >= 300 && r.status < 400);
const missing = results.filter((r) => r.status === 404);
const errors = results.filter(
  (r) => r.status === 0 || (r.status >= 400 && r.status !== 404),
);

console.log(`OK        ${ok.length}`);
console.log(`Redirect  ${redirects.length}`);
console.log(`404       ${missing.length}`);
console.log(`Errors    ${errors.length}\n`);

if (redirects.length) {
  console.log("Redirects:");
  for (const r of redirects.slice(0, 40)) {
    console.log(`  ${r.status}  ${r.path} -> ${r.location ?? "?"}`);
  }
  console.log();
}
if (missing.length) {
  console.log("Missing on staging (would 404 after cutover):");
  for (const r of missing) console.log(`  ${r.path}`);
  console.log();
}
if (errors.length) {
  console.log("Errors:");
  for (const r of errors.slice(0, 40)) {
    console.log(`  ${r.status}  ${r.path}  ${r.error ?? ""}`);
  }
}

process.exit(missing.length + errors.length > 0 ? 1 : 0);
