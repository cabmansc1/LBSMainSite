<?php
/**
 * Centralized SEO data for every page on the site (Phase 2).
 *
 * USAGE
 *   require_once __DIR__ . '/config.php';                    // for SITE_URL
 *   $seoConfig = require __DIR__ . '/includes/seo-config.php';
 *   $seo = $seoConfig[basename(__FILE__)] ?? [];
 *   include __DIR__ . '/seo_head.php';
 *
 * KEYS RECOGNISED BY seo_head.php
 *   title, description, canonical, robots,
 *   og_type, og_title, og_description, og_image,
 *   og_image_width, og_image_height, og_image_alt,
 *   twitter_card, twitter_title, twitter_description, twitter_image,
 *   extra_jsonld
 *
 * KEYS USED BY THIS PROJECT (not consumed by seo_head.php — for templates / sitemap)
 *   h1        — recommended <h1> text. Pages can render `<?= $seo['h1'] ?>`.
 *   priority  — sitemap priority (0.0–1.0). Reserved for sitemap.php.
 *
 * COPY STATUS MARKERS
 *   Where a value is `'TODO: Andrew to write'`, the page currently has no usable
 *   copy and needs a human pass. Existing decent copy was preserved verbatim from
 *   each page's current `<head>`/`<h1>` so the system is consistent today and
 *   Andrew can iterate one entry at a time without breaking anything.
 *
 *   The 11 service-area pages already shipped via Phase 1 — their entries here
 *   reflect the live values. Other public pages still hand-roll their `<head>`;
 *   their entries here are correct but unused until those pages are migrated to
 *   `seo_head.php` in a later phase.
 */

require_once __DIR__ . '/../config.php';

return [

    // ============================================================
    // PUBLIC LANDING / CORE PAGES
    // ============================================================

    'index.php' => [
        'title'       => 'Lowcountry Business Spotlight - Direct Mail Marketing',
        'description' => 'Reach thousands of households in Charleston, Summerville, Mount Pleasant & Daniel Island with billboard-style direct mail postcards. Affordable shared 9x12 EDDM advertising that gets your business noticed.',
        'canonical'   => SITE_URL . '/',
        'h1'          => 'Affordable Marketing Solutions That Deliver Results',
        'priority'    => 1.0,
        'og_image'    => SITE_URL . '/images/og-image.jpg', // TODO: confirm preferred home OG image
    ],

    'directory.php' => [
        // Title is built dynamically per category/search; leaving structural defaults.
        'title'       => 'Business Directory - Lowcountry Business Spotlight',
        'description' => 'Browse trusted local businesses across Charleston, Summerville, Mount Pleasant, Goose Creek and the greater Lowcountry. Restaurants, home services, health, retail and more in our verified directory.',
        'canonical'   => SITE_URL . '/directory',
        'h1'          => 'Find Trusted Local Businesses in the Lowcountry',
        'priority'    => 0.8,
    ],

    'directory-landing.php' => [
        'title'       => 'Charleston Business Directory - Lowcountry Business Spotlight',
        'description' => 'Find local businesses in Charleston, Summerville, Mount Pleasant and Daniel Island. Browse the Lowcountry Business Spotlight verified directory.',
        'canonical'   => SITE_URL . '/directory-landing',
        'h1'          => 'Charleston\'s Premier Business Directory', // see _seo/02-h1-audit.md — keep this, demote brand wordmark on line 593
        'priority'    => 0.7,
    ],

    'business.php' => [
        // Per-business page — title, description, canonical, og_image are dynamic
        // from the $business record. This entry only sets defaults.
        'title'       => 'Business Listing - Lowcountry Business Spotlight',
        'description' => 'Verified local business listing in the Lowcountry Business Spotlight directory serving Charleston, Summerville, Mount Pleasant and the surrounding Lowcountry.', // fallback only; per-listing values come from the DB
        'canonical'   => SITE_URL . '/business',
        'h1'          => null, // dynamic — uses $business[business_name]
        'priority'    => 0.7,
    ],

    'category.php' => [
        'title'       => 'Category - Lowcountry Business Spotlight',
        'description' => 'Browse local Charleston-area businesses by category in the Lowcountry Business Spotlight directory — find restaurants, contractors, health providers and more near you.', // fallback; page should append the category name dynamically
        'canonical'   => SITE_URL . '/category',
        'h1'          => null, // dynamic — uses category name
        'priority'    => 0.6,
    ],

    'blog.php' => [
        'title'       => 'Blog | Lowcountry Business Spotlight',
        'description' => 'Direct mail marketing tips, local business insights, and community news from Lowcountry Business Spotlight serving Charleston, Mount Pleasant, Summerville and Daniel Island.',
        'canonical'   => SITE_URL . '/blog',
        'h1'          => 'Blog',
        'priority'    => 0.6,
    ],

    'blog-post.php' => [
        // Per-post page — values overridden by post data.
        'title'       => 'Blog Post - Lowcountry Business Spotlight',
        'description' => 'Direct mail marketing tips and local business insights from Lowcountry Business Spotlight in Charleston, SC.', // fallback; pages should prefer the post excerpt when available
        'canonical'   => SITE_URL . '/blog',
        'h1'          => null, // dynamic — uses post title
        'priority'    => 0.6,
    ],

    'contact.php' => [
        'title'       => 'Contact Us | Lowcountry Business Spotlight',
        'description' => 'Get in touch with Lowcountry Business Spotlight. Questions about direct mail advertising in Charleston, Summerville, Mount Pleasant and Daniel Island? We\'re here to help.',
        'canonical'   => SITE_URL . '/contact',
        'h1'          => 'Let\'s Connect Your Business',
        'priority'    => 0.7,
    ],

    'advertise.php' => [
        'title'       => 'Advertise With Us - Lowcountry Business Spotlight',
        'description' => 'Reserve your spot on our next direct mail postcard campaign. Reach thousands of Charleston area households with affordable billboard-style advertising.',
        'canonical'   => SITE_URL . '/advertise',
        'h1'          => 'Spotlight Postcards',
        'priority'    => 0.9,
    ],

    'pricing.php' => [
        'title'       => 'Pricing - Lowcountry Business Spotlight',
        'description' => 'Direct mail advertising starting at 5¢ per household. Compare shared 9x12 Spotlight Postcard tiers and Neighborhood Cards — transparent pricing with professional ad design included.',
        'canonical'   => SITE_URL . '/pricing',
        'h1'          => 'Simple, Transparent Pricing',
        'priority'    => 0.9,
    ],

    'compare-products.php' => [
        'title'       => 'Compare Products - Lowcountry Business Spotlight',
        'description' => 'Compare 9x12 Spotlight Postcards and Neighborhood Cards side by side — reach, pricing and exclusivity — to pick the right direct mail option for your Charleston-area business.',
        'canonical'   => SITE_URL . '/compare-products',
        'h1'          => 'Two Ways to Reach Local Homes',
        'priority'    => 0.7,
    ],

    'find-your-ad.php' => [
        'title'       => 'Find Your Perfect Ad - Lowcountry Business Spotlight',
        'description' => 'Answer a few quick questions to find the perfect direct mail advertising package for your business. Get personalized recommendations.',
        'canonical'   => SITE_URL . '/find-your-ad',
        'h1'          => 'Find Your Perfect Direct Mail Ad',
        'priority'    => 0.8,
    ],

    'roi-calculator.php' => [
        'title'       => 'ROI Calculator - Lowcountry Business Spotlight',
        'description' => 'Calculate your direct mail advertising ROI. See how Lowcountry Business Spotlight postcards compare to Google Ads, Facebook Ads and other channels.',
        'canonical'   => SITE_URL . '/roi-calculator',
        'h1'          => 'Calculate Your Direct Mail ROI',
        'priority'    => 0.7,
    ],

    'upcoming-mailers.php' => [
        'title'       => 'Upcoming Mailings - Lowcountry Business Spotlight',
        'description' => 'See our upcoming direct mail postcard campaigns. Reserve your spot before registration closes!',
        'canonical'   => SITE_URL . '/upcoming-mailers',
        'h1'          => 'Upcoming Spotlight Postcard Mailings',
        'priority'    => 0.6,
    ],

    'directory-signup.php' => [
        'title'       => 'Join Our Business Directory | Lowcountry Business Spotlight',
        'description' => 'List your business in the Lowcountry Business Spotlight directory. Get discovered by local customers in Charleston, Summerville, Mount Pleasant and Daniel Island.',
        'canonical'   => SITE_URL . '/directory-signup',
        'h1'          => 'Join Our Business Directory',
        'priority'    => 0.8,
    ],

    'coming-soon-service-areas.php' => [
        'title'       => 'Coming Soon Service Areas | Lowcountry Business Spotlight',
        'description' => 'Direct mail marketing expanding across the Lowcountry. See all 10 service areas now available, and request early access to upcoming zones.',
        'canonical'   => SITE_URL . '/coming-soon-service-areas',
        'h1'          => 'Expanding Across the Lowcountry',
        'priority'    => 0.6,
    ],

    'privacy.php' => [
        'title'       => 'Privacy Policy - Lowcountry Business Spotlight',
        'description' => 'Privacy Policy for Lowcountry Business Spotlight. Learn how we collect, use, and protect your information.',
        'canonical'   => SITE_URL . '/privacy',
        'h1'          => 'Privacy Policy',
        'priority'    => 0.3,
    ],

    'terms.php' => [
        'title'       => 'Terms and Conditions - Lowcountry Business Spotlight',
        'description' => 'Terms and Conditions for Lowcountry Business Spotlight directory and advertising services.',
        'canonical'   => SITE_URL . '/terms',
        'h1'          => 'Terms and Conditions',
        'priority'    => 0.3,
    ],

    '404.php' => [
        'title'       => 'Page Not Found | Lowcountry Business Spotlight',
        'description' => 'The page you\'re looking for can\'t be found. Browse the Lowcountry Business Spotlight directory for local businesses or get in touch.',
        'canonical'   => null, // 404s should not be canonicalised
        'robots'      => 'noindex,follow',
        'h1'          => 'Page Not Found',
        'priority'    => null,
    ],

    // ============================================================
    // SERVICE-AREA LANDING PAGES (Phase 1 — already on seo_head.php)
    // ============================================================

    'charleston-direct-mail-marketing.php' => [
        'title'           => 'Charleston Direct Mail | 9x12 Postcards | LBS',
        'description'     => 'Charleston direct mail covering 29401, 29403, 29407, 29412, 29414, 29439 & 29455 — 5,000–10,000 homes per mailing. Exclusive 9x12 billboard-style postcards with no competitors on the same card. Downtown, West Ashley, James Island, Johns Island, Folly Beach & more. Starting at 5¢ per household.',
        'canonical'       => SITE_URL . '/charleston-direct-mail-marketing.php',
        'og_title'        => 'Charleston Direct Mail | Targeted Postcard Mailings',
        'og_description'  => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 Charleston households per mailing. No competitors on the same card. Starting at 5¢ per household.',
        'twitter_description' => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 Charleston households per mailing. Starting at 5¢ per household.',
        'h1'              => 'Charleston Direct Mail Targeted to Your Ideal Customers',
        'priority'        => 0.9,
        'extra_jsonld'    => [
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Charleston Direct Mail",
    "description": "Direct mail service delivering 9x12 billboard-style postcards to 5,000–10,000 households per mailing across greater Charleston, SC zip codes 29401, 29403, 29407, 29412, 29414, 29439, and 29455. Covering Downtown, West Ashley, James Island, Johns Island, Folly Beach, and more. Exclusive category placement with no competitors on the same mailing.",
    "provider": {
        "@type": "LocalBusiness",
        "name": "Lowcountry Business Spotlight",
        "telephone": "843-212-2969",
        "email": "hello@lbspotlight.com",
        "url": "https://www.lowcountrybusinessspotlight.com"
    },
    "areaServed": {
        "@type": "City",
        "name": "Charleston",
        "containedInPlace": {"@type": "State", "name": "South Carolina"}
    },
    "serviceType": "Direct Mail Advertising",
    "url": "https://www.lowcountrybusinessspotlight.com/charleston-direct-mail-marketing.php"
}
JSON,
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": "How many Charleston households receive the postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Each Charleston mailing targets 5,000 to 10,000 households. You choose the zip codes and volume that fit your budget and market."}},
        {"@type": "Question", "name": "Is my business category exclusive on the Charleston direct mail postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Only one business per category appears on each card. No competitors will be on the same mailing."}},
        {"@type": "Question", "name": "Do you design my direct mail ad?", "acceptedAnswer": {"@type": "Answer", "text": "Yes — ad design is included at no additional cost."}},
        {"@type": "Question", "name": "Which Charleston zip codes can I target?", "acceptedAnswer": {"@type": "Answer", "text": "We cover the entire greater Charleston area: 29401 (Downtown/Peninsula), 29403 (Upper Peninsula/North Central), 29407 (West Ashley), 29412 (James Island), 29414 (West Ashley/Bees Ferry), 29439 (Folly Beach), and 29455 (Johns Island). You can target one or combine multiple zones."}},
        {"@type": "Question", "name": "When is the next Charleston direct mail print date?", "acceptedAnswer": {"@type": "Answer", "text": "We print on a regular cadence. Submit the inquiry form for current availability and deadlines."}}
    ]
}
JSON,
        ],
    ],

    'daniel-island-direct-mail-marketing.php' => [
        'title'           => 'Daniel Island Direct Mail | 9x12 Postcards | LBS',
        'description'     => 'Daniel Island direct mail targeting 5,000–10,000 households per mailing across 15,000+ homes in zip code 29492. Exclusive 9x12 billboard-style postcards — no competitors on the same mailing. Covering Daniel Island, Clements Ferry & Cainhoy. Starting at 5¢ per household.',
        'canonical'       => SITE_URL . '/daniel-island-direct-mail-marketing.php',
        'og_title'        => 'Daniel Island Direct Mail | Target 5,000–10,000 Homes Per Mailing',
        'og_description'  => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 households per mailing across Daniel Island & Clements Ferry. 15,000+ homes available in the zone. No competitors on the same mailing. Starting at 5¢ per household.',
        'h1'              => 'Daniel Island Direct Mail Target 5,000–10,000 Homes Per Mailing',
        'priority'        => 0.9,
        'extra_jsonld'    => [
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Daniel Island Direct Mail",
    "description": "Direct mail service delivering 9x12 billboard-style postcards to 5,000–10,000 targeted households per mailing across Daniel Island and Clements Ferry, SC zip code 29492. Over 15,000 homes available in the total zone. Exclusive category placement with no competitors on the same mailing.",
    "provider": {
        "@type": "LocalBusiness",
        "name": "Lowcountry Business Spotlight",
        "telephone": "843-212-2969",
        "email": "hello@lbspotlight.com",
        "url": "https://www.lowcountrybusinessspotlight.com"
    },
    "areaServed": {
        "@type": "City",
        "name": "Daniel Island",
        "containedInPlace": {"@type": "State", "name": "South Carolina"}
    },
    "serviceType": "Direct Mail Advertising",
    "url": "https://www.lowcountrybusinessspotlight.com/daniel-island-direct-mail-marketing.php"
}
JSON,
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": "How many Daniel Island households receive the postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Each mailing targets 5,000–10,000 households in ZIP code 29492, with over 15,000 total homes available across Daniel Island, The Waterfront, Captain's Island, Cainhoy, and the Clements Ferry Road corridor. You can cover the full zone over multiple mailings."}},
        {"@type": "Question", "name": "Is my business category exclusive on the Daniel Island mailing?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Only one business per category appears on each card. This means no competitors will be on the same mailing reaching Daniel Island households."}},
        {"@type": "Question", "name": "Do you design my ad for the Daniel Island direct mail?", "acceptedAnswer": {"@type": "Answer", "text": "Yes — professional ad design is included at no additional cost. Our designers create eye-catching 9x12 billboard-style postcard ads optimized for the Daniel Island market."}},
        {"@type": "Question", "name": "How do we measure results from Daniel Island direct mail?", "acceptedAnswer": {"@type": "Answer", "text": "We can include a trackable QR code, unique URL, and phone tracking to measure scans, visits, and calls from Daniel Island and Clements Ferry residents."}},
        {"@type": "Question", "name": "When is the next Daniel Island print date?", "acceptedAnswer": {"@type": "Answer", "text": "We print on a regular cadence for the Daniel Island and Clements Ferry area. Contact us for current availability and deadlines."}}
    ]
}
JSON,
        ],
    ],

    'goose-creek-direct-mail-marketing.php' => [
        'title'           => 'Goose Creek Direct Mail | 9x12 Postcards | LBS',
        'description'     => 'Goose Creek direct mail covering zip code 29445 — 5,000–10,000 homes per mailing. Exclusive 9x12 billboard-style postcards with no competitors on the same card. Crowfield Plantation, Carnes Crossroads, Liberty Hall, Boulder Bluff & more. Starting at 5¢ per household.',
        'canonical'       => SITE_URL . '/goose-creek-direct-mail-marketing.php',
        'og_title'        => 'Goose Creek Direct Mail | Targeted Postcard Mailings',
        'og_description'  => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 Goose Creek households per mailing. No competitors on the same card. Starting at 5¢ per household.',
        'twitter_description' => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 Goose Creek households per mailing. Starting at 5¢ per household.',
        'h1'              => 'Goose Creek Direct Mail Reach Families Where They Live',
        'priority'        => 0.9,
        'extra_jsonld'    => [
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Goose Creek Direct Mail",
    "description": "Direct mail service delivering 9x12 billboard-style postcards to 5,000–10,000 households per mailing in Goose Creek, SC zip code 29445. Covering Crowfield Plantation, Carnes Crossroads, Liberty Hall Plantation, Boulder Bluff, Howe Hall, downtown Goose Creek, and the Naval Weapons Station area. Exclusive category placement with no competitors on the same mailing.",
    "provider": {
        "@type": "LocalBusiness",
        "name": "Lowcountry Business Spotlight",
        "telephone": "843-212-2969",
        "email": "hello@lbspotlight.com",
        "url": "https://www.lowcountrybusinessspotlight.com"
    },
    "areaServed": {
        "@type": "City",
        "name": "Goose Creek",
        "containedInPlace": {"@type": "State", "name": "South Carolina"}
    },
    "serviceType": "Direct Mail Advertising",
    "url": "https://www.lowcountrybusinessspotlight.com/goose-creek-direct-mail-marketing.php"
}
JSON,
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": "How many Goose Creek households receive the postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Each Goose Creek mailing targets 5,000 to 10,000 households within the 29445 zip code. You choose the volume that fits your budget and market."}},
        {"@type": "Question", "name": "Is my business category exclusive on the Goose Creek direct mail postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Only one business per category appears on each card. No competitors will be on the same mailing."}},
        {"@type": "Question", "name": "Do you design my direct mail ad?", "acceptedAnswer": {"@type": "Answer", "text": "Yes — ad design is included at no additional cost."}},
        {"@type": "Question", "name": "Which Goose Creek neighborhoods can I target?", "acceptedAnswer": {"@type": "Answer", "text": "We cover the entire Goose Creek 29445 zip code, including Crowfield Plantation, Carnes Crossroads, Liberty Hall Plantation, Boulder Bluff, Howe Hall, downtown Goose Creek along US-176, and neighborhoods near Naval Weapons Station Charleston."}},
        {"@type": "Question", "name": "Can I combine Goose Creek with other nearby zones?", "acceptedAnswer": {"@type": "Answer", "text": "Absolutely. Many businesses pair Goose Creek mailings with North Charleston, Summerville, or Moncks Corner to expand their reach across the Tri-County area."}},
        {"@type": "Question", "name": "When is the next Goose Creek direct mail print date?", "acceptedAnswer": {"@type": "Answer", "text": "We print on a regular cadence. Submit the inquiry form for current availability and deadlines."}}
    ]
}
JSON,
        ],
    ],

    'isle-of-palms-direct-mail-marketing.php' => [
        'title'           => 'Isle of Palms Direct Mail | 9x12 Postcards | LBS',
        'description'     => 'Isle of Palms direct mail covering zip code 29451 — 5,000–10,000 homes per mailing. Exclusive 9x12 billboard-style postcards reaching affluent beach homeowners, Wild Dunes Resort area, and vacation property owners. No competitors on the same card. Starting at 5¢ per household.',
        'canonical'       => SITE_URL . '/isle-of-palms-direct-mail-marketing.php',
        'og_title'        => 'Isle of Palms Direct Mail | Targeted Postcard Mailings',
        'og_description'  => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 Isle of Palms and surrounding households per mailing. Reach affluent beach homeowners and vacation property owners. Starting at 5¢ per household.',
        'twitter_description' => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 Isle of Palms households per mailing. Starting at 5¢ per household.',
        'h1'              => 'Isle of Palms Direct Mail Reach an Affluent Beach Community',
        'priority'        => 0.9,
        'extra_jsonld'    => [
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Isle of Palms Direct Mail",
    "description": "Direct mail service delivering 9x12 billboard-style postcards to 5,000–10,000 households per mailing across Isle of Palms, SC zip code 29451. Covering Wild Dunes Resort area, Palm Boulevard corridor, Breach Inlet area, and IOP Marina. Exclusive category placement with no competitors on the same mailing. Can combine with Mount Pleasant or Sullivans Island zones for additional volume.",
    "provider": {
        "@type": "LocalBusiness",
        "name": "Lowcountry Business Spotlight",
        "telephone": "843-212-2969",
        "email": "hello@lbspotlight.com",
        "url": "https://www.lowcountrybusinessspotlight.com"
    },
    "areaServed": {
        "@type": "City",
        "name": "Isle of Palms",
        "containedInPlace": {"@type": "State", "name": "South Carolina"}
    },
    "serviceType": "Direct Mail Advertising",
    "url": "https://www.lowcountrybusinessspotlight.com/isle-of-palms-direct-mail-marketing.php"
}
JSON,
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": "How many Isle of Palms households receive the postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Each Isle of Palms mailing targets 5,000 to 10,000 households. Because Isle of Palms is a smaller community, you can combine it with Mount Pleasant or Sullivans Island zones to reach your desired volume."}},
        {"@type": "Question", "name": "Is my business category exclusive on the Isle of Palms direct mail postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Only one business per category appears on each card. No competitors will be on the same mailing."}},
        {"@type": "Question", "name": "Can I combine Isle of Palms with nearby zones for a larger mailing?", "acceptedAnswer": {"@type": "Answer", "text": "Absolutely. Isle of Palms pairs naturally with Mount Pleasant and Sullivans Island. Many businesses combine two or three zones to reach 5,000–10,000 households across the East Cooper corridor while keeping their exclusive category placement."}},
        {"@type": "Question", "name": "Do you design my direct mail ad?", "acceptedAnswer": {"@type": "Answer", "text": "Yes — ad design is included at no additional cost."}},
        {"@type": "Question", "name": "Does the mailing reach vacation rental properties on Isle of Palms?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Our EDDM mailings are delivered to every residential address on qualifying postal routes, which includes vacation rental properties and second homes. This means your ad reaches both full-time residents and the property owners who manage vacation rentals — a valuable dual audience for service businesses."}},
        {"@type": "Question", "name": "When is the next Isle of Palms direct mail print date?", "acceptedAnswer": {"@type": "Answer", "text": "We print on a regular cadence. Submit the inquiry form for current availability and deadlines."}}
    ]
}
JSON,
        ],
    ],

    'james-island-direct-mail-marketing.php' => [
        'title'           => 'James Island Direct Mail | 9x12 Postcards | LBS',
        'description'     => 'James Island direct mail covering zip code 29412 — 5,000–10,000 homes per mailing. Exclusive 9x12 billboard-style postcards with no competitors on the same card. Riverland Terrace, Stiles Point, Secessionville, Ft. Johnson Estates, Camp Road corridor & more. Starting at 5¢ per household.',
        'canonical'       => SITE_URL . '/james-island-direct-mail-marketing.php',
        'og_title'        => 'James Island Direct Mail | Targeted Postcard Mailings',
        'og_description'  => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 James Island households per mailing. No competitors on the same card. Starting at 5¢ per household.',
        'twitter_description' => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 James Island households per mailing. Starting at 5¢ per household.',
        'h1'              => 'James Island Direct Mail Reach Families Where They Live',
        'priority'        => 0.9,
        'extra_jsonld'    => [
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "James Island Direct Mail",
    "description": "Direct mail service delivering 9x12 billboard-style postcards to 5,000–10,000 households per mailing in James Island, SC zip code 29412. Covering Riverland Terrace, Stiles Point, Secessionville, Ft. Johnson Estates, Camp Road corridor, Folly Road corridor, Harborview, Lighthouse Point, Bayfront, and Grimball Gates. Exclusive category placement with no competitors on the same mailing.",
    "provider": {
        "@type": "LocalBusiness",
        "name": "Lowcountry Business Spotlight",
        "telephone": "843-212-2969",
        "email": "hello@lbspotlight.com",
        "url": "https://www.lowcountrybusinessspotlight.com"
    },
    "areaServed": {
        "@type": "Place",
        "name": "James Island",
        "containedInPlace": {"@type": "State", "name": "South Carolina"}
    },
    "serviceType": "Direct Mail Advertising",
    "url": "https://www.lowcountrybusinessspotlight.com/james-island-direct-mail-marketing.php"
}
JSON,
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": "How many James Island households receive the postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Each James Island mailing targets 5,000 to 10,000 households within the 29412 zip code. You choose the volume that fits your budget and market."}},
        {"@type": "Question", "name": "Which James Island neighborhoods can I target?", "acceptedAnswer": {"@type": "Answer", "text": "We cover the entire James Island 29412 zip code, including Riverland Terrace, Stiles Point, Secessionville, Ft. Johnson Estates, Harborview, Lighthouse Point, Bayfront, Grimball Gates, and the Camp Road and Folly Road corridors."}},
        {"@type": "Question", "name": "Is my business category exclusive on the James Island direct mail postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Only one business per category appears on each card. No competitors will be on the same mailing."}},
        {"@type": "Question", "name": "Do you design my direct mail ad?", "acceptedAnswer": {"@type": "Answer", "text": "Yes — ad design is included at no additional cost."}},
        {"@type": "Question", "name": "Can I combine James Island with other nearby zones?", "acceptedAnswer": {"@type": "Answer", "text": "Absolutely. Many businesses pair James Island mailings with Charleston, Johns Island, or Sullivans Island to expand their reach across the Lowcountry."}},
        {"@type": "Question", "name": "When is the next James Island direct mail print date?", "acceptedAnswer": {"@type": "Answer", "text": "We print on a regular cadence. Submit the inquiry form for current availability and deadlines."}}
    ]
}
JSON,
        ],
    ],

    'johns-island-direct-mail-marketing.php' => [
        'title'           => 'Johns Island Direct Mail | 9x12 Postcards | LBS',
        'description'     => 'Johns Island direct mail covering zip code 29455 — 5,000–10,000 homes per mailing. Exclusive 9x12 billboard-style postcards with no competitors on the same card. Kiawah River, Brownswood, Mullet Hall, St. Johns Woods, River Road & more. Starting at 5¢ per household.',
        'canonical'       => SITE_URL . '/johns-island-direct-mail-marketing.php',
        'og_title'        => 'Johns Island Direct Mail | Targeted Postcard Mailings',
        'og_description'  => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 Johns Island households per mailing. No competitors on the same card. Starting at 5¢ per household.',
        'twitter_description' => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 Johns Island households per mailing. Starting at 5¢ per household.',
        'h1'              => 'Johns Island Direct Mail Reach Families Where They Live',
        'priority'        => 0.9,
        'extra_jsonld'    => [
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Johns Island Direct Mail",
    "description": "Direct mail service delivering 9x12 billboard-style postcards to 5,000–10,000 households per mailing in Johns Island, SC zip code 29455. Covering Kiawah River, Brownswood, Mullet Hall, St. Johns Woods, River Road area, Maybank Highway corridor, Bohicket Road corridor, Fenwick Hall, and Johns Island proper. Exclusive category placement with no competitors on the same mailing.",
    "provider": {
        "@type": "LocalBusiness",
        "name": "Lowcountry Business Spotlight",
        "telephone": "843-212-2969",
        "email": "hello@lbspotlight.com",
        "url": "https://www.lowcountrybusinessspotlight.com"
    },
    "areaServed": {
        "@type": "City",
        "name": "Johns Island",
        "containedInPlace": {"@type": "State", "name": "South Carolina"}
    },
    "serviceType": "Direct Mail Advertising",
    "url": "https://www.lowcountrybusinessspotlight.com/johns-island-direct-mail-marketing.php"
}
JSON,
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": "How many Johns Island households receive the postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Each Johns Island mailing targets 5,000 to 10,000 households within the 29455 zip code. You choose the volume that fits your budget and market."}},
        {"@type": "Question", "name": "Is my business category exclusive on the Johns Island direct mail postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Only one business per category appears on each card. No competitors will be on the same mailing."}},
        {"@type": "Question", "name": "Do you design my direct mail ad?", "acceptedAnswer": {"@type": "Answer", "text": "Yes — ad design is included at no additional cost."}},
        {"@type": "Question", "name": "Which Johns Island neighborhoods can I target?", "acceptedAnswer": {"@type": "Answer", "text": "We cover the entire Johns Island 29455 zip code, including Kiawah River, Brownswood, Mullet Hall, St. Johns Woods, River Road area, the Maybank Highway corridor, Bohicket Road corridor, Seabrook area, and Fenwick Hall. You select the EDDM carrier routes that match your ideal customer base."}},
        {"@type": "Question", "name": "Can I combine Johns Island with other nearby zones?", "acceptedAnswer": {"@type": "Answer", "text": "Absolutely. Many businesses pair Johns Island mailings with Charleston, James Island, Summerville, or Mount Pleasant to expand their reach across the Lowcountry."}},
        {"@type": "Question", "name": "When is the next Johns Island direct mail print date?", "acceptedAnswer": {"@type": "Answer", "text": "We print on a regular cadence. Submit the inquiry form for current availability and deadlines."}}
    ]
}
JSON,
        ],
    ],

    'moncks-corner-direct-mail-marketing.php' => [
        'title'           => 'Moncks Corner Direct Mail | 9x12 Postcards | LBS',
        'description'     => 'Moncks Corner direct mail targeting 5,000–10,000 homes per mailing in zip code 29461. Exclusive 9x12 billboard-style postcards — no competitors on the same mailing. 12,000+ total households available across Moncks Corner, Berkeley County & the Foxbank area. Starting at 5¢ per household.',
        'canonical'       => SITE_URL . '/moncks-corner-direct-mail-marketing.php',
        'og_title'        => 'Moncks Corner Direct Mail | Target 5,000–10,000 Homes Per Mailing',
        'og_description'  => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 Moncks Corner households per mailing. 12,000+ total homes available in the zone. No competitors on the same mailing. Starting at 5¢ per household.',
        'h1'              => 'Moncks Corner Direct Mail Marketing for Local Businesses',
        'priority'        => 0.9,
        'extra_jsonld'    => [
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Moncks Corner Direct Mail",
    "description": "Direct mail service delivering 9x12 billboard-style postcards to 5,000–10,000 targeted households per mailing in Moncks Corner and Berkeley County, SC zip code 29461. Over 12,000 total homes available in the zone. Exclusive category placement with no competitors on the same mailing.",
    "provider": {
        "@type": "LocalBusiness",
        "name": "Lowcountry Business Spotlight",
        "telephone": "843-212-2969",
        "email": "hello@lbspotlight.com",
        "url": "https://www.lowcountrybusinessspotlight.com"
    },
    "areaServed": {
        "@type": "City",
        "name": "Moncks Corner",
        "containedInPlace": {"@type": "State", "name": "South Carolina"}
    },
    "serviceType": "Direct Mail Advertising",
    "url": "https://www.lowcountrybusinessspotlight.com/moncks-corner-direct-mail-marketing.php"
}
JSON,
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": "How many households receive the postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Each mailing targets 5,000–10,000 households in Moncks Corner and Berkeley County (29461 zip code). The full zone covers 12,000+ homes that can be reached over multiple mailings."}},
        {"@type": "Question", "name": "Is my category exclusive?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Only one business per category appears on each card."}},
        {"@type": "Question", "name": "Do you design my ad?", "acceptedAnswer": {"@type": "Answer", "text": "Yes—ad design is included at no additional cost."}},
        {"@type": "Question", "name": "How do we measure results?", "acceptedAnswer": {"@type": "Answer", "text": "We can include a trackable QR code, unique URL, and phone tracking to measure scans, visits, and calls."}},
        {"@type": "Question", "name": "When is the next print date?", "acceptedAnswer": {"@type": "Answer", "text": "We print on a regular cadence. Submit the form above for current availability and deadlines."}}
    ]
}
JSON,
        ],
    ],

    'mount-pleasant-direct-mail-marketing.php' => [
        'title'           => 'Mount Pleasant Direct Mail | 9x12 Postcards | LBS',
        'description'     => 'Mount Pleasant direct mail targeting 5,000–10,000 homes per mailing across zip codes 29464 & 29466. Exclusive 9x12 billboard-style postcards — no competitors on the same mailing. Serving Old Village, I\'On, Park West, Dunes West & more. Starting at 5¢ per household.',
        'canonical'       => SITE_URL . '/mount-pleasant-direct-mail-marketing.php',
        'og_title'        => 'Mount Pleasant Direct Mail | 9x12 Postcards',
        'og_description'  => 'Target 5,000–10,000 Mount Pleasant households per mailing with exclusive 9x12 billboard-style postcards. No competitors on the same card. Starting at 5¢ per household.',
        'twitter_description' => 'Target 5,000–10,000 Mount Pleasant households per mailing with exclusive 9x12 postcards. No competitors on the same card. Starting at 5¢ per household.',
        'h1'              => 'Mount Pleasant Direct Mail That Actually Gets Noticed',
        'priority'        => 0.9,
        'extra_jsonld'    => [
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Mount Pleasant Direct Mail",
    "description": "Direct mail service delivering 9x12 billboard-style postcards to 5,000–10,000 households per mailing across Mount Pleasant, SC zip codes 29464 and 29466. Exclusive category placement with no competitors on the same mailing.",
    "provider": {
        "@type": "LocalBusiness",
        "name": "Lowcountry Business Spotlight",
        "telephone": "843-212-2969",
        "email": "hello@lbspotlight.com",
        "url": "https://www.lowcountrybusinessspotlight.com"
    },
    "areaServed": {
        "@type": "City",
        "name": "Mount Pleasant",
        "containedInPlace": {"@type": "State", "name": "South Carolina"}
    },
    "serviceType": "Direct Mail Advertising",
    "url": "https://www.lowcountrybusinessspotlight.com/mount-pleasant-direct-mail-marketing.php"
}
JSON,
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": "How many Mount Pleasant households receive the postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Each mailing targets 5,000 to 10,000 households across Mount Pleasant ZIP codes 29464 and 29466, with the ability to cover the entire zone of 38,000+ homes over multiple mailings."}},
        {"@type": "Question", "name": "Is my business category exclusive on the Mount Pleasant direct mail postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Only one business per category appears on each card. No competitors will be on the same mailing."}},
        {"@type": "Question", "name": "Do you design my direct mail ad?", "acceptedAnswer": {"@type": "Answer", "text": "Yes — ad design is included at no additional cost."}},
        {"@type": "Question", "name": "How do we measure direct mail results in Mount Pleasant?", "acceptedAnswer": {"@type": "Answer", "text": "We can include a trackable QR code, unique URL, and phone tracking to measure scans, visits, and calls."}},
        {"@type": "Question", "name": "When is the next Mount Pleasant direct mail print date?", "acceptedAnswer": {"@type": "Answer", "text": "We print on a regular cadence. Submit the inquiry form for current availability and deadlines."}}
    ]
}
JSON,
        ],
    ],

    'north-charleston-direct-mail-marketing.php' => [
        'title'           => 'North Charleston Direct Mail | 9x12 Postcards | LBS',
        'description'     => 'North Charleston direct mail targeting 5,000–10,000 households per mailing across zip codes 29405, 29406, 29418 & 29420. 45,000+ homes available across multiple mailings. Exclusive 9x12 billboard-style postcards — no competitors on the same mailing. Starting at 5¢ per household.',
        'canonical'       => SITE_URL . '/north-charleston-direct-mail-marketing.php',
        'og_title'        => 'North Charleston Direct Mail | Target 5,000–10,000 Homes Per Mailing',
        'og_description'  => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 North Charleston households per mailing. 45,000+ homes available across four zip codes. No competitors on the same mailing. Starting at 5¢ per household.',
        'h1'              => 'North Charleston Direct Mail Target 5,000–10,000 Homes Per Mailing',
        'priority'        => 0.9,
        'extra_jsonld'    => [
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "North Charleston Direct Mail",
    "description": "Direct mail service targeting 5,000–10,000 households per mailing across North Charleston, SC zip codes 29405, 29406, 29418, and 29420. 45,000+ total homes available across multiple mailings. Exclusive category placement with no competitors on the same mailing.",
    "provider": {
        "@type": "LocalBusiness",
        "name": "Lowcountry Business Spotlight",
        "telephone": "843-212-2969",
        "email": "hello@lbspotlight.com",
        "url": "https://www.lowcountrybusinessspotlight.com"
    },
    "areaServed": {
        "@type": "City",
        "name": "North Charleston",
        "containedInPlace": {"@type": "State", "name": "South Carolina"}
    },
    "serviceType": "Direct Mail Advertising",
    "url": "https://www.lowcountrybusinessspotlight.com/north-charleston-direct-mail-marketing.php"
}
JSON,
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": "How many households receive the postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Each mailing targets 5,000–10,000 North Charleston homes and businesses. The full zone covers 45,000+ households across ZIPs 29405, 29406, 29418, and 29420, which can be reached over multiple mailings."}},
        {"@type": "Question", "name": "Is my category exclusive?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Only one business per category appears on each card."}},
        {"@type": "Question", "name": "Do you design my ad?", "acceptedAnswer": {"@type": "Answer", "text": "Yes—ad design is included at no additional cost."}},
        {"@type": "Question", "name": "How do we measure results?", "acceptedAnswer": {"@type": "Answer", "text": "We can include a trackable QR code, unique URL, and phone tracking to measure scans, visits, and calls."}},
        {"@type": "Question", "name": "When is the next print date?", "acceptedAnswer": {"@type": "Answer", "text": "We print on a regular cadence. Submit the form for current availability and deadlines."}}
    ]
}
JSON,
        ],
    ],

    'sullivans-island-direct-mail-marketing.php' => [
        'title'           => 'Sullivans Island Direct Mail | 9x12 Postcards | LBS',
        'description'     => 'Sullivans Island direct mail targeting 29482 — 5,000–10,000 households per mailing with nearby zones. Exclusive 9x12 billboard-style postcards reaching one of South Carolina\'s most affluent beach communities. No competitors on the same card. Starting at 5¢ per household.',
        'canonical'       => SITE_URL . '/sullivans-island-direct-mail-marketing.php',
        'og_title'        => 'Sullivans Island Direct Mail | Targeted Postcard Mailings',
        'og_description'  => 'Exclusive 9x12 billboard-style postcards targeting Sullivans Island\'s ultra-affluent households. Combine with Mount Pleasant or Isle of Palms for 5,000–10,000 per mailing. Starting at 5¢ per household.',
        'twitter_description' => 'Exclusive 9x12 billboard-style postcards reaching Sullivans Island\'s affluent 29482 households. Starting at 5¢ per household.',
        'h1'              => 'Sullivans Island Direct Mail Reach the Lowcountry\'s Most Affluent Households',
        'priority'        => 0.9,
        'extra_jsonld'    => [
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Sullivans Island Direct Mail",
    "description": "Direct mail service delivering 9x12 billboard-style postcards to 5,000–10,000 households per mailing covering Sullivans Island, SC zip code 29482. Can combine with nearby Mount Pleasant and Isle of Palms routes for volume. Exclusive category placement with no competitors on the same mailing. Reaching one of South Carolina's wealthiest communities with median household income over $150,000.",
    "provider": {
        "@type": "LocalBusiness",
        "name": "Lowcountry Business Spotlight",
        "telephone": "843-212-2969",
        "email": "hello@lbspotlight.com",
        "url": "https://www.lowcountrybusinessspotlight.com"
    },
    "areaServed": {
        "@type": "City",
        "name": "Sullivans Island",
        "containedInPlace": {"@type": "State", "name": "South Carolina"}
    },
    "serviceType": "Direct Mail Advertising",
    "url": "https://www.lowcountrybusinessspotlight.com/sullivans-island-direct-mail-marketing.php"
}
JSON,
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": "How many Sullivans Island households receive the postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Sullivans Island proper (29482) has approximately 2,000 households. To reach the 5,000–10,000 mailing threshold, we combine Sullivans Island with nearby routes in Mount Pleasant or Isle of Palms — giving you full coverage of the island plus surrounding affluent communities."}},
        {"@type": "Question", "name": "Can I combine Sullivans Island with other nearby zones for more volume?", "acceptedAnswer": {"@type": "Answer", "text": "Absolutely. Most Sullivans Island advertisers combine 29482 with Isle of Palms (29451) and select Mount Pleasant routes to hit 5,000–10,000 households. This gives you a concentrated mailing across the most affluent barrier island communities in the Charleston area."}},
        {"@type": "Question", "name": "Is my business category exclusive on the Sullivans Island direct mail postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Only one business per category appears on each card. No competitors will be on the same mailing."}},
        {"@type": "Question", "name": "Do you design my direct mail ad?", "acceptedAnswer": {"@type": "Answer", "text": "Yes — ad design is included at no additional cost."}},
        {"@type": "Question", "name": "Why is Sullivans Island such a strong market for direct mail?", "acceptedAnswer": {"@type": "Answer", "text": "Sullivans Island is one of the wealthiest communities in South Carolina with a median household income exceeding $150,000. The small population means less advertising noise and higher visibility for every piece of mail. Residents here have significant disposable income and actively seek premium local services."}},
        {"@type": "Question", "name": "When is the next Sullivans Island direct mail print date?", "acceptedAnswer": {"@type": "Answer", "text": "We print on a regular cadence. Submit the inquiry form for current availability and deadlines."}}
    ]
}
JSON,
        ],
    ],

    'summerville-direct-mail-marketing.php' => [
        'title'           => 'Summerville Direct Mail | 9x12 Postcards | LBS',
        'description'     => 'Summerville direct mail targeting 5,000–10,000 households per mailing across zip codes 29485, 29486 & 29483. Exclusive 9x12 billboard-style postcards — no competitors on the same mailing. 52,000+ homes available across Summerville, Ladson, Knightsville & Lincolnville. Starting at 5¢ per household.',
        'canonical'       => SITE_URL . '/summerville-direct-mail-marketing.php',
        'og_title'        => 'Summerville Direct Mail | Target 5,000–10,000 Homes Per Mailing',
        'og_description'  => 'Exclusive 9x12 billboard-style postcards targeting 5,000–10,000 Summerville households per mailing. 52,000+ homes available across all Summerville zip codes. No competitors on the same mailing. Starting at 5¢ per household.',
        'h1'              => 'Summerville Direct Mail Marketing for Local Businesses',
        'priority'        => 0.9,
        'extra_jsonld'    => [
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Summerville Direct Mail",
    "description": "Direct mail service targeting 5,000–10,000 households per mailing across Summerville, SC zip codes 29485, 29486, and 29483. Over 52,000 homes available across multiple mailings. Exclusive category placement with no competitors on the same mailing.",
    "provider": {
        "@type": "LocalBusiness",
        "name": "Lowcountry Business Spotlight",
        "telephone": "843-212-2969",
        "email": "hello@lbspotlight.com",
        "url": "https://www.lowcountrybusinessspotlight.com"
    },
    "areaServed": {
        "@type": "City",
        "name": "Summerville",
        "containedInPlace": {"@type": "State", "name": "South Carolina"}
    },
    "serviceType": "Direct Mail Advertising",
    "url": "https://www.lowcountrybusinessspotlight.com/summerville-direct-mail-marketing.php"
}
JSON,
            <<<'JSON'
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": "How many households receive the postcard?", "acceptedAnswer": {"@type": "Answer", "text": "Each mailing targets 5,000–10,000 Summerville households. The full Summerville zone covers 52,000+ homes across ZIPs 29483, 29485, and 29486, which can be reached over multiple mailings."}},
        {"@type": "Question", "name": "Is my category exclusive?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Only one business per category appears on each card."}},
        {"@type": "Question", "name": "Do you design my ad?", "acceptedAnswer": {"@type": "Answer", "text": "Yes—ad design is included at no additional cost."}},
        {"@type": "Question", "name": "How do we measure results?", "acceptedAnswer": {"@type": "Answer", "text": "We can include a trackable QR code, unique URL, and phone tracking to measure scans, visits, and calls."}},
        {"@type": "Question", "name": "When is the next print date?", "acceptedAnswer": {"@type": "Answer", "text": "We print on a regular cadence. Submit the form for current availability and deadlines."}}
    ]
}
JSON,
        ],
    ],

    // ============================================================
    // NEIGHBORHOOD CARDS funnel
    // ============================================================

    'neighborhood-cards.php' => [
        'title'       => 'Neighborhood Cards - Lowcountry Business Spotlight',
        'description' => 'Sponsor a postcard mailed to homes in your Charleston-area neighborhood. Exclusive community advertising — one business per card, design included.',
        'canonical'   => null,
        'robots'      => 'noindex,nofollow',
        'h1'          => 'Neighborhood Cards',
        'priority'    => null,
    ],

    'neighborhood-card.php' => [
        'title'       => 'Community Card - Lowcountry Business Spotlight',
        'description' => 'Sponsor this neighborhood card and put your business in front of local Charleston-area homes with an exclusive community mailing.',
        'canonical'   => null,
        'robots'      => 'noindex,nofollow',
        'h1'          => null, // dynamic — uses card name
        'priority'    => null,
    ],

    'neighborhood-card-checkout.php' => [
        'title'       => 'Checkout - Lowcountry Business Spotlight',
        'description' => 'Complete your neighborhood card sponsorship checkout.',
        'canonical'   => null,
        'robots'      => 'noindex,follow',
        'h1'          => 'Complete Your Sponsorship',
        'priority'    => null,
    ],

    'neighborhood-card-success.php' => [
        'title'       => 'Purchase Confirmed - Lowcountry Business Spotlight',
        'description' => 'Your neighborhood card sponsorship is confirmed. Thanks for supporting your local community!',
        'canonical'   => null,
        'robots'      => 'noindex,follow',
        'h1'          => 'Purchase Confirmed!',
        'priority'    => null,
    ],

    // ============================================================
    // ACCOUNT / AUTH / TRANSACTIONAL — should all be noindex
    // ============================================================

    'login.php' => [
        'title'       => 'Sign In - Lowcountry Business Spotlight',
        'description' => 'Sign in to your Lowcountry Business Spotlight account.',
        'canonical'   => null,
        'robots'      => 'noindex,follow',
        'h1'          => 'Advertiser Login',
        'priority'    => null,
    ],

    'register.php' => [
        'title'       => 'Create Account - Lowcountry Business Spotlight',
        'description' => 'Create a Lowcountry Business Spotlight account.',
        'canonical'   => null,
        'robots'      => 'noindex,follow',
        'h1'          => 'Create Your Account',
        'priority'    => null,
    ],

    'dashboard.php' => [
        'title'       => 'Dashboard - Lowcountry Business Spotlight',
        'description' => 'Account dashboard.',
        'canonical'   => null,
        'robots'      => 'noindex,follow',
        'h1'          => null, // dynamic — greets the logged-in user by name
        'priority'    => null,
    ],

    'manage-listing.php' => [
        'title'       => 'Business Dashboard - Lowcountry Business Spotlight',
        'description' => 'Manage your business listing.',
        'canonical'   => null,
        'robots'      => 'noindex,follow',
        'h1'          => 'Business Dashboard',
        'priority'    => null,
    ],

    'create-listing.php' => [
        'title'       => 'Create Business Listing - Lowcountry Business Spotlight',
        'description' => 'Create a new business listing.',
        'canonical'   => null,
        'robots'      => 'noindex,follow',
        'h1'          => 'Create Business Listing',
        'priority'    => null,
    ],

    'my-cards.php' => [
        'title'       => 'My Neighborhood Cards - Lowcountry Business Spotlight',
        'description' => 'View and manage your purchased neighborhood cards.',
        'canonical'   => null,
        'robots'      => 'noindex,follow',
        'h1'          => 'My Neighborhood Cards',
        'priority'    => null,
    ],

    'gcregister.php' => [
        'title'       => 'Gift Card Registration | Lowcountry Business Spotlight',
        'description' => 'Register to win with Lowcountry Business Spotlight postcard campaign',
        'canonical'   => SITE_URL . '/gcregister',
        'robots'      => 'noindex,follow', // lead-capture entry; not a primary SEO page
        'h1'          => 'Enter to Win!', // see _seo/02-h1-audit.md — keep this, demote brand wordmark on line 440
        'priority'    => null,
    ],

    'directory-thank-you.php' => [
        'title'       => 'Thank You | Lowcountry Business Spotlight Directory',
        'description' => 'Thanks for joining the Lowcountry Business Spotlight directory.',
        'canonical'   => null,
        'robots'      => 'noindex,follow',
        'h1'          => 'Thank You for Joining Our Directory!', // see _seo/02-h1-audit.md — keep this, demote brand wordmark on line 438
        'priority'    => null,
    ],

    'thank_you.php' => [
        'title'       => 'Thank You - Lowcountry Business Spotlight',
        'description' => 'Thanks for getting in touch.',
        'canonical'   => null,
        'robots'      => 'noindex,follow',
        'h1'          => 'You\'re All Set!',
        'priority'    => null,
    ],

    'bulk_import.php' => [
        // Admin tool exposed at root — should be noindex AND ideally moved into /admin.
        'title'       => 'Bulk Import - Lowcountry Business Spotlight',
        'description' => 'Bulk import business listings.',
        'canonical'   => null,
        'robots'      => 'noindex,nofollow',
        'h1'          => 'Bulk Import Business Listings',
        'priority'    => null,
    ],

];
