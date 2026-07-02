# 00 — Shared Include Structure

Date: 2026-04-29

## What's in place today

| Include | Lines | Purpose | Loaded after… |
|---------|------:|---------|----------------|
| `header.php` | 63 | Visible logo block (`<h1 class="brand-wordmark">`) + `include nav.php` + brand-block CSS | `<body>` open |
| `nav.php` | 269 | Top navigation bar | (included by header.php) |
| `footer.php` | 301 | Newsletter form + visible footer + Organization JSON-LD + LeadConnector chat widget + footer CSS + newsletter JS | Near `</body>` |
| `pricing_form_section.php` | 409 | Reusable pricing form block (used on landing pages) | n/a |

## How a typical page is structured today

Sample (`index.php`):

```php
<!doctype html>
<html …>
<head>
  …
  <title>Lowcountry Business Spotlight - Direct Mail Marketing</title>
  <meta name="description" content="…">
  <link rel="canonical" href="https://www.lowcountrybusinessspotlight.com/">
  <meta property="og:title" …>
  <meta property="og:description" …>
  <meta property="og:url" …>
  <meta property="og:image" …>
  <meta name="twitter:card" …>
  <script type="application/ld+json"> {…} </script>
  <!-- ~600 lines of inline page-specific CSS -->
</head>
<body>
  <?php include 'header.php'; ?>   <!-- logo + nav -->
  …page content…
  <?php include 'footer.php'; ?>   <!-- newsletter + footer + Org JSON-LD + chat widget -->
</body>
</html>
```

Spans for a few representative pages:

| Page | `<head>` lines | `</head>` line | header include | footer include |
|------|---------------:|---------------:|----------------|----------------|
| `index.php` | 35–732 | 732 | line 740 | line 1177 |
| `contact.php` | 3–566 | 566 | line 572 | line 697 |
| `blog.php` | 47–212 | 212 | line 217 | line 305 |
| `charleston-direct-mail-marketing.php` | 6–714 | 714 | line 717 | line 1059 |
| `business.php` | 97–485 | 485 | line 491 | line 916 |

Each `<head>` is ~150–700 lines because **inline `<style>` blocks** (page-specific CSS) live in `<head>`. The actual SEO meta is the first 30–60 lines; the rest is CSS.

## What's missing — the gap that requires refactor

There is **no shared head include**. The following are duplicated across all 49 root-level public PHP files:

- `<!doctype html>` / `<html lang="…">`
- `<meta charset>`, viewport, theme-color, favicons, font preconnect (currently in header.php — but those are visible-body things; favicons make more sense in `<head>`)
- `<title>` — every page hand-rolls this
- `<meta name="description">` — every page hand-rolls this
- `<link rel="canonical">` — every page hand-rolls this
- Open Graph (`og:title`, `og:description`, `og:url`, `og:image`, `og:image:width/height/alt`, `og:type`, `og:site_name`)
- Twitter cards (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`)
- JSON-LD (varies by page — Organization, WebPage, Service, LocalBusiness, BreadcrumbList, Article, etc.)
- GA / GSC tracking script
- `<meta name="robots" content="noindex">` — currently absent from every auth/thank-you page that should have it

**Implication**: any change (e.g., adding GA4 tag, fixing canonical hostname, adding a new OG image) means editing ~20 files. Phase 1 refactor goal: introduce `seo_head.php` so SEO meta lives in one place.

## Other anomalies in the include structure

### 1. `<h1>` lives in `header.php` (the logo block)

```html
<!-- header.php lines 10–16 -->
<h1 class="brand-wordmark">
  <a href="/">
    <span class="lowcountry">Lowcountry</span>
    <span class="business">Business</span>
    <span class="spotlight">Spotlight</span>
  </a>
</h1>
```

This means **every page has a global brand h1**, and page-specific h1s become the *second* h1. Multiple h1s aren't a hard ranking penalty in modern Google, but they confuse the topical signal of the page. Recommendation: change to `<p class="brand-wordmark">` styled visually like an h1, and let the page-specific h1 stand alone.

### 2. `header.php` is included **after** `<body>` opens, but it also contains visible markup *and* favicon/font preconnect tags

Lines 1–7 of `header.php` are `<meta>`/`<link>` tags that belong in `<head>`, but they end up in the `<body>` because the include happens after `<body>`. Browsers tolerate this (parser fix-up), but it's invalid HTML and a small perf hit (favicons get discovered late). Move favicon/preconnect into the new `seo_head.php`.

### 3. Footer carries Organization JSON-LD globally

Good — site-wide LocalBusiness schema is in `footer.php` lines 86–113. This is fine. Page-specific JSON-LD (Article, Product, Service, Breadcrumb) should be added per-page in `<head>` or before `</body>`.

### 4. No `seo_head.php` / `meta.php` / `seo.php` partial exists

Confirmed via:
```
$ ls *.php | grep -iE "seo|meta|head"
header.php   # not a head include — see above
```

## Phase 1 design recommendation

Introduce `seo_head.php` accepting variables set by each page, e.g.:

```php
<?php
// In a page (e.g. contact.php), before <head>:
$seo = [
    'title'       => 'Contact Us | Lowcountry Business Spotlight',
    'description' => '…',
    'canonical'   => SITE_URL . '/contact.php',
    'og_image'    => SITE_URL . '/images/og-contact.jpg',
    'robots'      => 'index,follow',          // or 'noindex,follow' for auth pages
    'jsonld'      => [/* per-page JSON-LD */],
    'breadcrumbs' => [['Home','/'], ['Contact','/contact.php']],
];
include 'seo_head.php';
```

`seo_head.php` then renders the full `<head>` block with sensible fallbacks (e.g., default OG image, default site name, canonical from `$_SERVER['REQUEST_URI']` if not provided, default `robots=index,follow`). The page just provides what's unique.

This refactor is the **prerequisite** for nearly every later SEO improvement — bulk meta-description fixes, canonical-hostname unification, GA→GA4 migration, schema additions, noindex on auth pages, etc.

### Migration path
1. Create `seo_head.php`. Verify on one low-traffic page (`privacy.php` or `terms.php`).
2. Migrate the 11 service-area landing pages (highest SEO value, very similar structure).
3. Migrate remaining public pages.
4. Migrate auth/thank-you pages, defaulting them to `noindex,follow`.

The page-specific inline `<style>` blocks should stay where they are during Phase 1 — separate optimization, not a blocker for SEO.
