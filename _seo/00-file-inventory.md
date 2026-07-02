# 00 — File Inventory

Date: 2026-04-29
Scope: project root + 1 directory deep (`/home/cabmansc1/public_html/`)
Excluded: `vendor/`, `_archived/`, `.trash/`, `_seo/`, `.well-known/`, `uploads/`, `images/`, `dreamsanddrinks/`, `templates/`, `public_html/` (empty placeholder)

Counts via `wc -l`. Files grouped by purpose so SEO-relevance is obvious at a glance.

## Public-facing pages (SEO targets)

| File | Lines | Notes |
|------|------:|-------|
| `index.php` | 1197 | Home |
| `directory.php` | 966 | Directory index + filters (canonical via clean URLs `/directory/`, `/directory/category/...`, etc.) |
| `directory-landing.php` | 812 | Older landing variant — needs review for duplicate-content risk vs `directory.php` |
| `business.php` | 930 | Business detail page (clean URL: `/business/{slug}`) |
| `category.php` | 86 | Likely thin redirect — verify |
| `blog.php` | 307 | Blog index |
| `blog-post.php` | 329 | Blog detail (clean URL: `/blog/{slug}`) |
| `contact.php` | 698 | |
| `advertise.php` | 605 | "Spotlight Postcards" service page |
| `pricing.php` | 587 | Clean URL: `/pricing/` |
| `compare-products.php` | 308 | Clean URL: `/compare/` |
| `find-your-ad.php` | 1166 | Quiz page |
| `roi-calculator.php` | 606 | |
| `upcoming-mailers.php` | 664 | |
| `directory-signup.php` | 986 | List-your-business funnel |
| `coming-soon-service-areas.php` | 689 | |
| `privacy.php` | 142 | |
| `terms.php` | 129 | |
| `404.php` | 64 | |

### Service-area landing pages (high-value SEO set)

| File | Lines |
|------|------:|
| `charleston-direct-mail-marketing.php` | 1087 |
| `daniel-island-direct-mail-marketing.php` | 1022 |
| `goose-creek-direct-mail-marketing.php` | 1038 |
| `isle-of-palms-direct-mail-marketing.php` | 1045 |
| `james-island-direct-mail-marketing.php` | 1042 |
| `johns-island-direct-mail-marketing.php` | 1038 |
| `moncks-corner-direct-mail-marketing.php` | 982 |
| `mount-pleasant-direct-mail-marketing.php` | 1026 |
| `north-charleston-direct-mail-marketing.php` | 995 |
| `sullivans-island-direct-mail-marketing.php` | 1045 |
| `summerville-direct-mail-marketing.php` | 986 |

### Neighborhood Cards funnel

| File | Lines | Notes |
|------|------:|-------|
| `neighborhood-cards.php` | 610 | Clean URL: `/neighborhood-cards/` |
| `neighborhood-card.php` | 550 | Clean URL: `/neighborhood-card/{slug}` |
| `neighborhood-card-checkout.php` | 211 | |
| `neighborhood-card-success.php` | 179 | |
| `neighborhood-card-legacy.php` | 396 | **Legacy — confirm if still linked** |
| `neighborhood-card-test.php` | 545 | **Test page — should be `noindex`** |

## Account / auth pages (non-SEO, but should be `noindex`)

| File | Lines |
|------|------:|
| `login.php` | 327 |
| `register.php` | 567 |
| `dashboard.php` | 472 |
| `manage-listing.php` | 796 |
| `create-listing.php` | 664 |
| `my-cards.php` | 527 |
| `gcregister.php` | 557 |
| `gcregister_mobile_fix.php` | 507 |
| `directory-thank-you.php` | 534 |
| `thank_you.php` | 234 |

## Form/processing endpoints (no body, no SEO)

`logout.php` (10) · `process_business.php` (96) · `process_directory_signup.php` (254) · `process_form.php` (186) · `process_login.php` (110) · `newsletter_subscribe.php` (66) · `save-quiz-lead.php` (292) · `stripe-webhook.php` (87) · `bulk_import.php` (467) · `admin.php` (30)

## Includes / shared partials

| File | Lines | Notes |
|------|------:|-------|
| `header.php` | 63 | **Partial only — does NOT contain `<head>`/`<title>`/`<meta>`. Just visible logo block + nav include.** Contains a global `<h1>` (brand wordmark) — duplicate-h1 risk on every page that has its own h1. |
| `nav.php` | 269 | Top nav |
| `footer.php` | 301 | Visible footer + Organization JSON-LD + LeadConnector chat widget |
| `pricing_form_section.php` | 409 | Reusable pricing form block |

## Class / config files (PHP libraries, no SEO)

`config.php` (888) · `Business.php` (718) · `User.php` (428) · `pricing_config.php` (139) · `stripe_config.php` (85)

## SEO infrastructure

| File | Lines | Notes |
|------|------:|-------|
| `sitemap.php` | 88 | Dynamic XML sitemap; rewritten from `/sitemap.xml` |
| `robots.txt` | 9 | (lines, not in find above) |
| `.htaccess` | 137 | (lines, not in find above) |

## Composer / artifacts (ignore)

`composer-setup.php` (1788) — should be **deleted**, this is the Composer installer left on the server.

## Admin area (auth-walled, exclude from SEO)

33 files, totaling ~13,500 lines. All under `/admin/`. Already `Disallow`ed in `robots.txt`. No SEO action needed; should also serve `X-Robots-Tag: noindex` defensively (not currently set).

## CSS / JS / templates

| File | Lines |
|------|------:|
| `css/main.css` | 610 |
| `templates/LinkTreeTemplate.html` | 0 (empty) |
| `dreamsanddrinks/index.html` | 0 (empty) |

## Totals (approximate)

- Public-facing pages (root): **49 PHP files**
- Service-area landing pages: **11 files** (~11,300 lines combined)
- Admin: **33 PHP files**
- Includes: 4 files
- Total `.php`/`.html` in scope: **~95 files**
