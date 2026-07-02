# 00 — Page-level SEO Audit

Date: 2026-04-29
Method: regex extraction over each `.php`/`.html` file in project root + 1 deep. Helper script: `_seo/_audit_pages.py`.

Columns:
- **Title** — `<title>…</title>` content. `{PHP}` = dynamic value (a `<?php echo …?>` is in there).
- **Meta Description** — `<meta name="description" content="…">`. `MISSING` = tag not present.
- **H1** — first `<h1>`. `MULTIPLE (n)` = more than one (Google warns on this).
- **Canon / OG / Tw / JSON-LD / GA-GSC** — yes/no presence flags. (GA/GSC = any of: `gtag(`, googletagmanager, `google-site-verification`, `UA-…`, `G-…`, `GTM-…`, analytics.js)
- **Words** — rough visible-content word count after stripping tags/scripts/styles/PHP.

> Note: `header.php` carries a global `<h1>` for the brand wordmark. So **every** page that includes header.php effectively has at least one h1 — but most pages then add their *own* h1 too. This means **most public pages have ≥2 h1s** in the rendered output, even if my file-level scan only saw one (because the brand-h1 lives in the include). Flagged in the H1 column where the file itself contains a second h1, but assume **a global duplicate-h1 problem affects every page**. See `00-include-structure.md`.

## Public-facing pages

| File | Title | Meta Description | H1 | Canon | OG | Tw | JSON-LD | GA/GSC | Words |
|------|-------|------------------|----|-------|----|----|---------|--------|------:|
| `index.php` | Lowcountry Business Spotlight - Direct Mail Marketing | Reach thousands of households in Charleston, Summerville, Mount Pleasant & Daniel Island with billboard-style direct mai… | Affordable Marketing Solutions That Deliver Results | yes | yes | yes | yes | yes | 650 |
| `directory.php` | `{PHP} - {PHP}` | _present, no content attr_ | _empty_ | yes | yes | yes | yes | yes | 112 |
| `directory-landing.php` | Charleston Business Directory - Lowcountry Business Spotlight | Find local businesses in Charleston, Summerville, Mount Pleasant and Daniel Island. Browse the Lowcountry Business Spotl… | **MULTIPLE (2)**: "Lowcountry Business Spotlight" | yes | yes | yes | no | yes | 278 |
| `business.php` | `{PHP} - {PHP}` | [DYNAMIC] htmlspecialchars($business[…]) | Featured Verified | yes | yes | yes | yes | yes | 119 |
| `category.php` | `{PHP} - Business Directory` | **MISSING** | Businesses | no | no | no | no | no | 4 |
| `blog.php` | `{PHP} \| {PHP}` | Direct mail marketing tips, local business insights, and community news from Lowcountry Business Spotlight serving Charl… | Blog | yes | yes | yes | yes | yes | 35 |
| `blog-post.php` | `{PHP}` | _present, no content attr_ | _empty_ | yes | yes | yes | yes | yes | 28 |
| `contact.php` | Contact Us \| Lowcountry Business Spotlight | Get in touch with Lowcountry Business Spotlight. Questions about direct mail advertising in Charleston, Summerville, Mou… | Let's Connect Your Business | yes | yes | yes | no | yes | 329 |
| `advertise.php` | Advertise With Us - Lowcountry Business Spotlight | Reserve your spot on our next direct mail postcard campaign. Reach thousands of Charleston area households with affordab… | Spotlight Postcards | yes | yes | yes | yes | yes | 237 |
| `pricing.php` | `{PHP}` | _present, no content attr_ | Simple, Transparent Pricing | yes | yes | yes | no | yes | 744 |
| `compare-products.php` | `{PHP}` | _present, no content attr_ | Two Ways to Reach Local Homes | yes | yes | no | no | yes | 492 |
| `find-your-ad.php` | Find Your Perfect Ad - Lowcountry Business Spotlight | Answer a few quick questions to find the perfect direct mail advertising package for your business. Get personalized rec… | **MISSING** | yes | yes | yes | no | yes | 275 |
| `roi-calculator.php` | ROI Calculator - Lowcountry Business Spotlight | Calculate your direct mail advertising ROI. See how Lowcountry Business Spotlight postcards compare to Google Ads, Faceb… | Calculate Your Direct Mail ROI | yes | yes | yes | no | yes | 207 |
| `upcoming-mailers.php` | Upcoming Mailings - Lowcountry Business Spotlight | See our upcoming direct mail postcard campaigns. Reserve your spot before registration closes! | Upcoming Spotlight Postcard Mailings | yes | yes | yes | no | yes | 104 |
| `directory-signup.php` | Join Our Business Directory \| Lowcountry Business Spotlight | List your business in the Lowcountry Business Spotlight directory. Get discovered by local customers in Charleston, Summ… | Join Our Business Directory | yes | yes | yes | no | yes | 463 |
| `coming-soon-service-areas.php` | Coming Soon Service Areas \| Lowcountry Business Spotlight | Direct mail marketing expanding across the Lowcountry. See all 10 service areas now available, and request early access… | Expanding Across the Lowcountry | yes | yes | yes | no | yes | 477 |
| `privacy.php` | Privacy Policy - `{PHP}` | Privacy Policy for Lowcountry Business Spotlight. Learn how we collect, use, and protect your information. | Privacy Policy | yes | no | no | no | yes | 752 |
| `terms.php` | Terms and Conditions - `{PHP}` | Terms and Conditions for Lowcountry Business Spotlight directory and advertising services. | Terms and Conditions | yes | no | no | no | yes | 666 |
| `404.php` | Page Not Found \| `{PHP}` | **MISSING** | Page Not Found | no | no | no | no | no | 36 |

## Service-area landing pages (high-value SEO)

| File | Title | Meta Description | H1 | Canon | OG | Tw | JSON-LD | GA/GSC | Words |
|------|-------|------------------|----|-------|----|----|---------|--------|------:|
| `charleston-direct-mail-marketing.php` | Charleston Direct Mail \| 9x12 Postcards \| LBS | Charleston direct mail covering 29401, 29403, 29407, 29412, 29414, 29439 & 29455 — 5,000–10,000 homes per mailing. Excl… | Charleston Direct Mail Targeted to Your Ideal Customers | yes | yes | yes | yes | yes | 1386 |
| `daniel-island-direct-mail-marketing.php` | Daniel Island Direct Mail \| 9x12 Postcards \| LBS | Daniel Island direct mail targeting 5,000–10,000 households per mailing across 15,000+ homes in zip code 29492. Exclusiv… | Daniel Island Direct Mail Target 5,000–10,000 Homes Per Mailing | yes | yes | yes | yes | yes | 1416 |
| `goose-creek-direct-mail-marketing.php` | Goose Creek Direct Mail \| 9x12 Postcards \| LBS | Goose Creek direct mail covering zip code 29445 — 5,000–10,000 homes per mailing. Exclusive 9x12 billboard-style postcar… | Goose Creek Direct Mail Reach Families Where They Live | yes | yes | yes | yes | yes | 1278 |
| `isle-of-palms-direct-mail-marketing.php` | Isle of Palms Direct Mail \| 9x12 Postcards \| LBS | Isle of Palms direct mail covering zip code 29451 — 5,000–10,000 homes per mailing. Exclusive 9x12 billboard-style postc… | Isle of Palms Direct Mail Reach an Affluent Beach Community | yes | yes | yes | yes | yes | 1458 |
| `james-island-direct-mail-marketing.php` | James Island Direct Mail \| 9x12 Postcards \| LBS | James Island direct mail covering zip code 29412 — 5,000–10,000 homes per mailing. Exclusive 9x12 billboard-style postca… | James Island Direct Mail Reach Families Where They Live | yes | yes | yes | yes | yes | 1353 |
| `johns-island-direct-mail-marketing.php` | Johns Island Direct Mail \| 9x12 Postcards \| LBS | Johns Island direct mail covering zip code 29455 — 5,000–10,000 homes per mailing. Exclusive 9x12 billboard-style postca… | Johns Island Direct Mail Reach Families Where They Live | yes | yes | yes | yes | yes | 1333 |
| `moncks-corner-direct-mail-marketing.php` | Moncks Corner Direct Mail \| 9x12 Postcards \| LBS | Moncks Corner direct mail targeting 5,000–10,000 homes per mailing in zip code 29461. Exclusive 9x12 billboard-style pos… | Moncks Corner Direct Mail Marketing for Local Businesses | yes | yes | yes | yes | yes | 1330 |
| `mount-pleasant-direct-mail-marketing.php` | Mt. Pleasant Direct Mail \| 9x12 Postcards \| LBS | Mount Pleasant direct mail targeting 5,000–10,000 homes per mailing across zip codes 29464 & 29466. Exclusive 9x12 billb… | Mount Pleasant Direct Mail That Actually Gets Noticed | yes | yes | yes | yes | yes | 1090 |
| `north-charleston-direct-mail-marketing.php` | N. Charleston Direct Mail \| 9x12 Postcards \| LBS | North Charleston direct mail targeting 5,000–10,000 households per mailing across zip codes 29405, 29406, 29418 & 29420… | North Charleston Direct Mail Target 5,000–10,000 Homes Per Mailing | yes | yes | yes | yes | yes | 1359 |
| `sullivans-island-direct-mail-marketing.php` | Sullivans Island Direct Mail \| Postcards \| LBS | Sullivans Island direct mail targeting 29482 — 5,000–10,000 households per mailing with nearby zones. Exclusive 9x12 bil… | Sullivans Island Direct Mail Reach the Lowcountry's Most Affluent Households | yes | yes | yes | yes | yes | 1437 |
| `summerville-direct-mail-marketing.php` | Summerville Direct Mail \| 9x12 Postcards \| LBS | Summerville direct mail targeting 5,000–10,000 households per mailing across zip codes 29485, 29486 & 29483. Exclusive 9… | Summerville Direct Mail Marketing for Local Businesses | yes | yes | yes | yes | yes | 1263 |

## Neighborhood Cards funnel

| File | Title | Meta Description | H1 | Canon | OG | Tw | JSON-LD | GA/GSC | Words |
|------|-------|------------------|----|-------|----|----|---------|--------|------:|
| `neighborhood-cards.php` | `{PHP}` | _present, no content attr_ | Neighborhood Cards | yes | yes | no | no | yes | 233 |
| `neighborhood-card.php` | `{PHP}` | _present, no content attr_ | Community Card | yes | yes | no | no | yes | 109 |
| `neighborhood-card-checkout.php` | **MISSING** | **MISSING** | **MISSING** | no | no | no | no | no | 663 |
| `neighborhood-card-success.php` | Purchase Confirmed - `{PHP}` | **MISSING** | Purchase Confirmed! | no | no | no | no | no | 54 |
| `neighborhood-card-legacy.php` | `{PHP}` | _present, no content attr_ | Community Card | yes | yes | no | no | yes | 99 |
| `neighborhood-card-test.php` | `{PHP}` | _present, no content attr_ | Community Card | no | no | no | no | yes | 109 |

## Account / auth pages (should be `noindex`)

| File | Title | Meta Description | H1 | Canon | OG | Tw | JSON-LD | GA/GSC | Words |
|------|-------|------------------|----|-------|----|----|---------|--------|------:|
| `login.php` | Sign In - `{PHP}` | **MISSING** | Advertiser Login | no | no | no | no | yes | 29 |
| `register.php` | Register - `{PHP}` | **MISSING** | _empty_ | no | no | no | no | no | 53 |
| `dashboard.php` | Dashboard - `{PHP}` | **MISSING** | "Welcome, !" (broken token) | no | no | no | no | yes | 125 |
| `manage-listing.php` | Business Dashboard - Lowcountry Business Spotlight | **MISSING** | Business Dashboard | no | no | no | no | no | 242 |
| `create-listing.php` | Create Business Listing - `{PHP}` | **MISSING** | Create Business Listing | no | no | no | no | yes | 117 |
| `my-cards.php` | My Neighborhood Cards - `{PHP}` | **MISSING** | My Neighborhood Cards | no | no | no | no | yes | 129 |
| `gcregister.php` | Gift Card Registration \| `{PHP}` | Register to win with Lowcountry Business Spotlight postcard campaign | **MULTIPLE (2)**: "Lowcountry Business Spotlight" | yes | no | no | no | yes | 120 |
| `gcregister_mobile_fix.php` | Gift Card Registration \| `{PHP}` | Register to win with Lowcountry Business Spotlight postcard campaign | **MULTIPLE (2)**: "Lowcountry Business Spotlight" | no | no | no | no | yes | 117 |
| `directory-thank-you.php` | Thank You \| Lowcountry Business Spotlight Directory | **MISSING** | **MULTIPLE (2)**: "Lowcountry Business Spotlight" | no | no | no | no | no | 210 |
| `thank_you.php` | Thank You - Lowcountry Business Spotlight | **MISSING** | You're All Set! | no | no | no | no | yes | 117 |
| `bulk_import.php` | Bulk Import - `{PHP}` | **MISSING** | Bulk Import Business Listings | no | no | no | no | no | 75 |

## Includes / partials (informational only — no `<title>` expected)

| File | Title | Meta Desc | H1 | JSON-LD |
|------|-------|-----------|----|---------|
| `header.php` | n/a | n/a | **Lowcountry Business Spotlight** (brand wordmark — global h1!) | no |
| `footer.php` | n/a | n/a | n/a | yes (Organization/LocalBusiness) |
| `nav.php` | n/a | n/a | n/a | no |

## Admin (`/admin/*`) — should never be indexed

All ~30 admin pages have a placeholder title (`Foo | <?php …?>`) and **MISSING** meta description, canonical, OG, Twitter, JSON-LD. This is fine — they're already `Disallow`ed in robots.txt. Recommendation: also send `X-Robots-Tag: noindex` from the admin auth gate. Full table omitted; see `_seo/_page-audit-raw.md`.

---

## Patterns / observations

### Strong points
- **All 11 service-area landing pages** are well-equipped: title, meta description, canonical, OG, Twitter, JSON-LD, GA, all yes; ~1,000–1,500 words of content. These are the strongest SEO assets on the site.
- `index.php`, `advertise.php`, `business.php`, `directory.php`, `blog.php`, `blog-post.php` all have full meta + canonical + OG + Twitter + JSON-LD + GA — basics are in place.
- Sitemap (dynamic), robots.txt, .htaccess `force www`, HSTS, clean URLs, 301s from old URL formats — all already wired up.

### Top issues
1. **No centralized `<head>` include** — title/meta/canonical/OG/Twitter/JSON-LD are duplicated across 49 root pages. Any change requires touching every file. (See `00-include-structure.md`.)
2. **Global duplicate `<h1>`** — `header.php` wraps the brand wordmark in `<h1>`. Every page that *also* defines its own `<h1>` ends up with at least 2 h1s. Brand should be a `<p class="brand-wordmark">` or `<div>`; the page-specific h1 should be the only h1.
3. **Pages missing meta description**: `404.php`, `category.php`, `bulk_import.php`, `dashboard.php`, `login.php`, `register.php`, `create-listing.php`, `manage-listing.php`, `my-cards.php`, `directory-thank-you.php`, `thank_you.php`, `neighborhood-card-checkout.php`, `neighborhood-card-success.php`. (Most are auth-walled, fine — but `404.php` and `category.php` should be fixed.)
4. **Pages with empty/broken meta description** (tag exists with no `content` attr): `directory.php`, `blog-post.php`, `compare-products.php`, `pricing.php`, `neighborhood-card.php`, `neighborhood-cards.php`, `neighborhood-card-legacy.php`, `neighborhood-card-test.php`. These output `<meta name="description">` with no content — worse than missing because Google may still ingest empty.
5. **Pages with broken/empty h1**: `directory.php` (empty), `blog-post.php` (empty), `find-your-ad.php` (missing), `register.php` (empty). `dashboard.php` h1 is "Welcome, !" — broken Smarty/PHP variable substitution.
6. **MULTIPLE h1s within a single file** (in addition to the global header.php h1): `directory-landing.php`, `gcregister.php`, `gcregister_mobile_fix.php`, `directory-thank-you.php`. So those pages render with 3+ h1s.
7. **No canonical/OG/Twitter on auth pages** (`login`, `register`, `dashboard`, etc.) — fine, but they should have `<meta name="robots" content="noindex,follow">` instead. None do today.
8. **No JSON-LD on contact, pricing, find-your-ad, roi-calculator, upcoming-mailers, compare, neighborhood-cards/-card** — easy wins to add `Service`/`WebPage`/`BreadcrumbList` schema.
9. **Privacy and Terms pages** have no OG/Twitter — low priority.
10. **Thin content** — `category.php` (4 words), `blog.php` (35 words visible after strip), `blog-post.php` (28). Likely most copy is rendered dynamically by PHP and not visible in static source — verify on rendered page, but if these are genuinely thin templates they need padding.
11. **`sullivans-island-direct-mail-marketing.php`** title is the only one missing the "9x12" qualifier (`Sullivans Island Direct Mail | Postcards | LBS` vs the standard `… | 9x12 Postcards | LBS`). Minor consistency issue.
12. **`mount-pleasant`** uses `Mt. Pleasant` in title and `North Charleston` uses `N. Charleston` — abbreviations may underperform vs full search-volume terms (`Mount Pleasant`, `North Charleston`) which are how people actually search.
13. **`neighborhood-card-test.php`** is publicly accessible with content — should be deleted, blocked, or `noindex`.
14. **`neighborhood-card-legacy.php`** — confirm this is still linked anywhere; if not, remove or 301 to `neighborhood-card.php`.

Raw extractor output: `_seo/_page-audit-raw.md`.
