# SEO Audit & Refactor Workspace

This directory holds audit notes and reference artifacts for the SEO project on Lowcountry Business Spotlight. **Nothing in this folder is part of the live site** — all files here are for reference only.

## Phase 2 — Per-page SEO data (2026-04-29)

Centralised SEO data into `includes/seo-config.php` (the only Phase 2 deliverable that ships to the live site) and audited the remaining structural problems for Andrew to drive.

| Doc | Purpose |
|-----|---------|
| [`02-h1-audit.md`](02-h1-audit.md) | Every page's `<h1>` count + proposed fix for zero-or-multiple violations |
| [`02-missing-alt-text.md`](02-missing-alt-text.md) | Checklist of `<img>` tags needing alt copy from Andrew |
| `_audit_h1.py` / `_audit_alt.py` | Re-runnable helper scripts (see "To re-run" below) |
| `*.pre-phase2.bak` | Backups of the 11 service-area pages immediately before Phase 2 wiring |

**What changed on the live site:**
- New file `includes/seo-config.php` — single array keyed by filename, holding title/description/canonical/og/twitter/extra_jsonld/h1/priority for all 47 public pages. Phase 1 service-area pages have full real data; pages still hand-rolling their `<head>` have placeholders marked `TODO: Andrew to write` where copy is missing.
- The 11 service-area pages now read `$seo` from the config (lookup by `basename(__FILE__)`) instead of declaring it inline. Verified with `php -l` and a runtime render check (title/canonical/JSON-LD all match the config).

**What's left for Andrew (one human pass each):**
- 19 `TODO: Andrew to write` markers in `includes/seo-config.php` (search the file).
- 6 H1 fixes in `_seo/02-h1-audit.md` (2 missing, 4 multi-h1 pages).
- 1 missing alt text in `_seo/02-missing-alt-text.md`, plus 3 `alt=""` to confirm decorative.

**Known limitations of Phase 2 wiring:**
- The 38 non-service-area pages still hand-roll their `<head>` and ignore `seo-config.php` until they're migrated to `seo_head.php` in a later phase. The config entries for those pages are correct and ready — wiring is the only missing step.

## Phase 0 — Discovery & Baseline (2026-04-29)

| Doc | Purpose |
|-----|---------|
| [`00-file-inventory.md`](00-file-inventory.md) | Tree of all PHP/HTML/CSS/JS files with line counts, grouped by purpose |
| [`00-page-audit.md`](00-page-audit.md) | Per-page SEO tag audit (title, meta desc, h1, canonical, OG, Twitter, JSON-LD, GA, word count) |
| [`00-tech-files.md`](00-tech-files.md) | sitemap.php, robots.txt, .htaccess analysis |
| [`00-include-structure.md`](00-include-structure.md) | header/footer include analysis + Phase 1 design recommendation |
| [`00-hardcoded-urls.md`](00-hardcoded-urls.md) | http/https, www/non-www inconsistency scan |
| `_audit_pages.py` | Helper script (run again any time to refresh data) |
| `_page-audit-raw.md` | Raw output of the audit script |

## TL;DR — what we found

**Already in place (good):**
- Canonical hostname enforced at edge: `.htaccess` 301s non-www → www; HSTS forces HTTPS.
- 11 service-area landing pages have full SEO meta + JSON-LD + 1,000–1,500 words of content.
- Dynamic XML sitemap pulls from DB (`/sitemap.xml` → `sitemap.php`).
- Clean URLs for `/business/{slug}`, `/directory/`, `/blog/{slug}`, `/pricing/`, `/compare/`, `/neighborhood-cards/`, plus 301s from old query-string formats.
- Site-wide `LocalBusiness` JSON-LD in `footer.php`.
- Security headers, gzip, browser caching all configured in `.htaccess`.

**Top issues to address:**

1. **No shared `<head>` include.** Title/meta/canonical/OG/Twitter/JSON-LD are duplicated in ~49 files. Phase 1 should introduce `seo_head.php`. Without this, every other SEO improvement multiplies the change surface 20×.

2. **Global duplicate `<h1>`.** `header.php` wraps the brand wordmark in `<h1>`. Every page that has its own h1 ends up with at least 2 h1s. Demote brand to `<p>` or `<div>` styled visually as h1.

3. **Hardcoded canonical URL** in 24 files (instead of `SITE_URL`). One-time mechanical fix; payoff is being able to change hostname in one place if ever needed.

4. **Pages with broken/empty meta description**: `directory.php`, `blog-post.php`, `compare-products.php`, `pricing.php`, `neighborhood-card.php`, `neighborhood-cards.php`, `neighborhood-card-legacy.php`, `neighborhood-card-test.php` (tag exists with no `content` attribute).

5. **Auth/thank-you pages lack `noindex`**: `login`, `register`, `dashboard`, `manage-listing`, `create-listing`, `my-cards`, `gcregister*`, `directory-thank-you`, `thank_you`, `bulk_import`, `404`, `neighborhood-card-test`, `neighborhood-card-legacy`. Currently nothing tells Google to skip them.

6. **Sitemap gaps**: `james-island-…`, `johns-island-…`, `coming-soon-service-areas` are missing from `sitemap.php`. Static pages have no `lastmod`.

7. **Service-area page title inconsistencies**: `Sullivans Island` page is missing the `9x12` qualifier; `mount-pleasant` and `north-charleston` use abbreviated forms (`Mt. Pleasant`, `N. Charleston`) that may underperform vs the full city names users actually search for.

8. **Test/legacy artifacts to remove or noindex**: `neighborhood-card-test.php`, `neighborhood-card-legacy.php`, `composer-setup.php`, `gcregister_mobile_fix.php` (duplicate of `gcregister.php`).

## Suggested Phase 1 priority order

1. Build `seo_head.php`. Migrate one low-traffic page (privacy or terms) to validate.
2. Fix the duplicate-h1 problem (one-line change in `header.php`).
3. Migrate the 11 service-area pages to `seo_head.php`. Highest SEO value, very similar templates.
4. Replace hardcoded canonical URLs with `SITE_URL`.
5. Add `noindex` to auth/thank-you pages.
6. Sitemap: fix missing pages + add `lastmod`.
7. Clean up test/legacy files.

Lower priority / Phase 2+: GA4 verification, schema additions to non-landing pages (Service, BreadcrumbList, FAQPage), Image Search opt-in via robots.txt, performance/Core Web Vitals on rendered pages.

## To re-run the audits

```bash
cd /home/cabmansc1/public_html
python3 _seo/_audit_pages.py > _seo/_page-audit-raw.md   # Phase 0 page meta
python3 _seo/_audit_h1.py    > _seo/02-h1-audit.md        # Phase 2 h1 count
python3 _seo/_audit_alt.py   > _seo/02-missing-alt-text.md # Phase 2 alt text
```

All three scripts regex-extract over PHP/HTML files in root (page audit also walks one dir deep). Skip lists are configured at the top of each script.
