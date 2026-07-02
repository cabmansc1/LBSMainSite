# 00 — Tech Files

Date: 2026-04-29

## Summary

| File | Path | Status |
|------|------|--------|
| `sitemap.xml` | `/sitemap.xml` | **Not a real file** — served dynamically via `.htaccess` rewrite to `sitemap.php` |
| `sitemap.php` | `/sitemap.php` | Present, 88 lines |
| `robots.txt` | `/robots.txt` | Present, 9 lines |
| `.htaccess` | `/.htaccess` | Present, 137 lines |

## sitemap.xml / sitemap.php

There is **no static `sitemap.xml`**. Instead, `.htaccess` line 96 rewrites `/sitemap.xml` → `/sitemap.php`, and `sitemap.php` produces XML on demand from the database:

- Static URLs hardcoded: home, `/directory/`, `/advertise.php`, `/contact.php`, `/blog.php`, `/upcoming-mailers.php`, `/roi-calculator.php`, `/find-your-ad.php`, `/directory-signup.php`, `/pricing/`, `/compare/`, `/privacy.php`, `/terms.php`, plus all 9 of the listed service-area landing pages.
- Dynamic URLs from the DB: `directory_categories`, `directory_tags`, verified+active+visible `directory_businesses`, published blog posts.
- Uses `SITE_URL` constant + helper functions (`businessUrl()`, `categoryUrl()`, `tagUrl()`, `directoryUrl()`) for canonical generation. Good.
- `lastmod` only emitted for businesses and blog posts; static pages have no `lastmod`.

### Findings — sitemap

| Severity | Finding |
|----------|---------|
| 🟡 | **Missing landing pages**: `coming-soon-service-areas.php`, `directory-landing.php`, `404.php` (correct to omit), and `compare-products.php` (covered via `/compare/` clean URL — fine). The `coming-soon-service-areas.php` is in the audit but absent from the sitemap. |
| 🟡 | **Missing service-area pages**: `james-island-direct-mail-marketing.php` and `johns-island-direct-mail-marketing.php` are NOT in `sitemap.php` (only 9 of 11 service-area pages are listed). |
| 🟡 | **No `lastmod` on static pages** — Google ignores `priority`/`changefreq` and uses `lastmod` to decide recrawl. Add `lastmod` (use file mtime via `filemtime()` or hardcode the last edit). |
| 🟢 | **Neighborhood-cards pages** (`/neighborhood-cards/`, individual cards) — not in sitemap. Decide whether they should be indexable. If yes, add a section similar to businesses. |
| 🟢 | Good practice: blog tables wrapped in try/catch — won't break sitemap if blog isn't migrated yet. |

## robots.txt

```
User-agent: *
Allow: /

Disallow: /admin/
Disallow: /process_*
Disallow: /uploads/

Sitemap: https://www.lowcountrybusinessspotlight.com/sitemap.xml
```

### Findings — robots.txt

| Severity | Finding |
|----------|---------|
| 🟢 | Sitemap reference uses canonical hostname (https + www). |
| 🟢 | `/admin/` and `/process_*` correctly disallowed. |
| 🟡 | `Disallow: /uploads/` blocks crawling of the entire uploads tree — but `uploads/business_photos/` images are referenced in `og:image`, JSON-LD `image`, and `<img>` tags on business pages. **Google can still index images linked from indexable pages**, but disallowing them in robots.txt prevents Image Search from properly recrawling. Recommend allowing `/uploads/business_photos/` (or the entire uploads tree if all sub-dirs are public images). |
| 🟡 | No explicit `Disallow` for low-value endpoints: `/login.php`, `/register.php`, `/dashboard.php`, `/manage-listing.php`, `/create-listing.php`, `/my-cards.php`, `/dashboard.php`, `/logout.php`, `/thank_you.php`, `/directory-thank-you.php`, `/neighborhood-card-test.php`, `/neighborhood-card-legacy.php`, `/gcregister*.php`. Better to handle these with `<meta name="robots" content="noindex">` per page (more reliable than robots.txt — disallow blocks crawl, doesn't prevent indexing of URLs Google already discovered). |
| 🟢 | `Allow: /` is implicit and harmless. |

## .htaccess

Already does most of the heavy lifting. Key behaviors:

| Behavior | Detail | Verdict |
|----------|--------|---------|
| 404 page | `ErrorDocument 404 /404.php` | ✅ |
| Security headers | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, HSTS | ✅ |
| Force www | 301 from `lowcountrybusinessspotlight.com` to `https://www.lowcountrybusinessspotlight.com` | ✅ — handles non-www correctly |
| Force HTTPS | **Not explicit** — relies on HSTS preload + cert. Consider adding `RewriteCond %{HTTPS} !on` redirect for first-visit safety. | 🟡 |
| 301 query→clean URLs | `business.php?slug=` → `/business/{slug}`, `directory.php?category=` → `/directory/category/{slug}`, plus tag/location/blog. | ✅ excellent |
| Clean URL rewrites (internal) | `/business/{slug}`, `/directory/`, `/directory/category/{slug}`, `/directory/tag/{slug}`, `/directory/location/{slug}`, `/blog/{slug}`, `/compare/`, `/pricing/`, `/neighborhood-cards/`, `/neighborhood-card/{slug}` | ✅ |
| Legacy redirects | `community-cards/` and `community-card/{slug}` 301 to neighborhood-cards/ | ✅ |
| `/sitemap.xml` rewrite | → `/sitemap.php` | ✅ |
| Gzip + browser caching | `mod_deflate` + `mod_expires`, sensible TTLs | ✅ |
| Cache-Control | static assets: 1yr immutable; html/php: 1 day | ✅ |
| `Vary: Accept-Encoding` | Set on all responses | ✅ |

### Findings — .htaccess

| Severity | Finding |
|----------|---------|
| 🟡 | **No explicit HTTPS redirect**. HSTS prevents downgrade *after* first visit, but a fresh visitor going to `http://www.…` will hit the server on port 80 first. Add: `RewriteCond %{HTTPS} !on` → `RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]` before the force-www rule. |
| 🟡 | **No trailing-slash normalization**. `/directory` and `/directory/` are both reachable; the 301 rule for `directory.php?…` redirects to `/directory/?` (trailing slash), but the internal rewrite rule accepts `/directory/?$` (optional slash). May cause duplicate-content if anyone links without slash. Consider adding a single canonical-form 301 (or rely on canonical tag — already in place). |
| 🟢 | `php81` handler is fine. |
| 🟢 | Cache-Control max-age=86400 on PHP/HTML is conservative — for dynamic pages this means 1-day proxy/browser caching. If pages personalize per-user (login state in nav), they shouldn't be `public`. Verify before relying on it. |

## What's missing entirely

- **`sitemap.xml` as a real file** — fine, since it's rewritten dynamically.
- **`humans.txt`** — optional, low priority.
- **`security.txt`** under `/.well-known/` — `.well-known/` directory exists; verify whether `security.txt` is present (not currently in scope).
- **A favicon at `/favicon.ico` root** — header.php only references `/images/favicon-*.png`. Some legacy crawlers/bookmarks request `/favicon.ico` — confirm it's served (not checked in this audit).

## Action items for Phase 1+

1. Add `lastmod` to all static pages in `sitemap.php` (use `filemtime()`).
2. Add `james-island-direct-mail-marketing.php`, `johns-island-direct-mail-marketing.php`, `coming-soon-service-areas.php` to `sitemap.php`.
3. Decide whether neighborhood cards belong in the sitemap; if so, add them.
4. Add explicit HTTPS-redirect rule to `.htaccess` (defense in depth on top of HSTS).
5. Update `robots.txt` to allow `/uploads/business_photos/` for Image Search.
6. Add per-page `<meta name="robots" content="noindex,follow">` to: `login`, `register`, `dashboard`, `manage-listing`, `create-listing`, `my-cards`, `gcregister*`, `directory-thank-you`, `thank_you`, `neighborhood-card-test`, `neighborhood-card-legacy`, `bulk_import`, `404`.
7. Verify `/favicon.ico` is reachable.
