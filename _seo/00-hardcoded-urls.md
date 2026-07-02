# 00 — Hardcoded URL Scan

Date: 2026-04-29
Scope: all `.php` and `.html` files (excluding `vendor/`, `_archived/`, `.trash/`, `_seo/`).

## Headline

- Canonical hostname is **`https://www.lowcountrybusinessspotlight.com`** (defined as `SITE_URL` in `config.php:45`).
- The site already enforces this at the edge: `.htaccess` lines 19–21 301-redirect non-www → www, and HSTS forces HTTPS.
- **No `http://` references to the site domain or to social/external resources** were found. No mixed-content risk.
- Main issue: the canonical URL is **hardcoded** in `<head>` blocks of ~24 files instead of using `SITE_URL`. Three files use the **non-www** form (in email-message bodies, not in HTML tags).

## Variants found

| Variant | Files | Behavior |
|---------|-------|----------|
| `https://www.lowcountrybusinessspotlight.com` (canonical) | 24 files | Correct — but hardcoded instead of `SITE_URL` |
| `https://lowcountrybusinessspotlight.com` (non-www) | 3 files | Wrong canonical form — but only in email bodies (auto-redirected by .htaccess); fix for hygiene |
| `http://…lowcountrybusinessspotlight.com` (plain HTTP) | 0 files | ✅ none |
| `http://…lbspotlight.com` (plain HTTP, alt domain) | 0 files | ✅ none |

## Files with hardcoded canonical URL (sorted by occurrence count)

These should use `SITE_URL` instead.

| Count | File | Notes |
|------:|------|-------|
| 7 | `charleston-direct-mail-marketing.php` | Service-area page |
| 7 | `daniel-island-direct-mail-marketing.php` | Service-area page |
| 7 | `goose-creek-direct-mail-marketing.php` | Service-area page |
| 7 | `index.php` | Home |
| 7 | `isle-of-palms-direct-mail-marketing.php` | Service-area page |
| 7 | `james-island-direct-mail-marketing.php` | Service-area page |
| 7 | `johns-island-direct-mail-marketing.php` | Service-area page |
| 7 | `moncks-corner-direct-mail-marketing.php` | Service-area page |
| 7 | `mount-pleasant-direct-mail-marketing.php` | Service-area page |
| 7 | `north-charleston-direct-mail-marketing.php` | Service-area page |
| 7 | `summerville-direct-mail-marketing.php` | Service-area page |
| 7 | `sullivans-island-direct-mail-marketing.php` | Service-area page |
| 5 | `advertise.php` | |
| 5 | `coming-soon-service-areas.php` | |
| 5 | `contact.php` | |
| 5 | `directory-landing.php` | |
| 5 | `directory-signup.php` | |
| 5 | `find-your-ad.php` | |
| 5 | `roi-calculator.php` | |
| 5 | `upcoming-mailers.php` | |
| 3 | `footer.php` | Organization JSON-LD `url`/`logo`/`image` |
| 3 | `save-quiz-lead.php` | Email-body URLs (non-www variants — see below) |
| 1 | `gcregister.php` | |
| 1 | `config.php` | Defines `SITE_URL` itself — correct |
| 1 | `templates/LinkTreeTemplate.html` | Empty/template file — low priority |
| 1 | `dreamsanddrinks/index.html` | Empty file — low priority |

The **7 occurrences per service-area page** = canonical + og:url + og:image + twitter:url + twitter:image + JSON-LD url + JSON-LD logo (typical pattern).

## Non-www occurrences (3 files, all in email bodies)

`save-quiz-lead.php` lines 197, 202, 212 — quiz-lead notification email body:

```php
$userMessage .= "https://lowcountrybusinessspotlight.com/advertise.php\n\n";
$userMessage .= "https://lowcountrybusinessspotlight.com/roi-calculator.php\n\n";
$userMessage .= "https://lowcountrybusinessspotlight.com\n";
```

These are emails sent to leads, not HTML pages. The `.htaccess` 301 will normalize when clicked, so no broken links — but for brand consistency they should be `https://www.lowcountrybusinessspotlight.com…`.

`templates/LinkTreeTemplate.html` and `dreamsanddrinks/index.html` are both empty (`0` bytes) — non-issues.

## Files using `SITE_URL` (20 files)

| Count | File |
|------:|------|
| 22 | `sitemap.php` |
| 9 | `blog-post.php` |
| 9 | `blog.php` |
| 8 | `config.php` (SITE_URL definition + helper functions) |
| 5 | `admin/manage_directory.php` |
| 4 | `pricing.php` |
| 2 | `terms.php`, `stripe_config.php`, `privacy.php`, `neighborhood-cards.php`, `directory.php`, `create-listing.php`, `compare-products.php` |
| 1 | `User.php`, `neighborhood-card-success.php`, `my-cards.php`, `Business.php`, `admin/manage_cards.php`, `admin/cron_card_notifications.php`, `admin/card_orders.php` |

These are the "good" pages that use the constant. Phase 1 should bring the rest of the site into this pattern.

## Other URL/brand observations

- **Contact email** is `hello@lbspotlight.com` — uses a *different* domain from the canonical site (`lowcountrybusinessspotlight.com`). This is intentional (shorter email), and not an SEO bug. Search engines may see slightly weaker brand-entity signal because the email TLD doesn't match the website TLD. Optional: add the email's domain to `Organization.contactPoint.email` in JSON-LD; or mention in `sameAs` if there's a parent company entity.
- **Sister site** `ourlocalspotlight.com` linked from `footer.php` and listed in `sameAs` of the global Organization JSON-LD — fine.
- **Phone number** `(843) 212-2969` is consistently formatted as `843-212-2969` in `tel:` links and `+1-843-212-2969` in JSON-LD — also fine.

## Recommended fixes (Phase 1)

1. **Replace hardcoded `https://www.lowcountrybusinessspotlight.com` with `<?= SITE_URL ?>`** in all 24 files. Mechanical find/replace, but verify config.php is required at top of each file (most public pages require it directly or transitively).
2. **`save-quiz-lead.php`** — switch the 3 non-www string literals to `https://www.lowcountrybusinessspotlight.com…` (or use `SITE_URL`).
3. **`footer.php` JSON-LD** — replace 3 hardcoded URLs with `<?= SITE_URL ?>` interpolations.
4. After Phase 1's `seo_head.php` is in place, the canonical/og:url/twitter:url etc. should derive from `SITE_URL` + `$_SERVER['REQUEST_URI']` automatically — eliminating most hardcodes in one move.
