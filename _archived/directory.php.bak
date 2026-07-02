<?php
// directory.php - Main directory landing page
require_once 'config.php';
require_once 'Business.php';

$businessObj = new Business();

// Read filter parameters
$filterCategory = sanitizeInput($_GET['category'] ?? '');
$filterLocation = sanitizeInput($_GET['location'] ?? '');
$filterTag = sanitizeInput($_GET['tag'] ?? '');

$filters = [];
if ($filterCategory) $filters['category'] = $filterCategory;
if ($filterLocation) $filters['location'] = $filterLocation;
if ($filterTag) $filters['tag'] = $filterTag;

// Get all active businesses for display
$results = $businessObj->getBusinesses($filters, 1, 200);
$businesses = $results['businesses'];
$totalCount = $results['total'];

// Build unique categories and locations from actual data
$usedCategories = [];
$usedLocations = [];
foreach ($businesses as $b) {
    if (!empty($b['category'])) $usedCategories[$b['category']] = true;
    if (!empty($b['location_area'])) $usedLocations[$b['location_area']] = true;
}
$allCategories = getCategories();
$allLocations = getLocationAreas();
$allTags = getTags($filterCategory ?: null);

// Build dynamic page title and description
$pageTitle = 'Lowcountry Business Directory';
$pageDesc = 'Browse the Lowcountry Business Directory. Find local restaurants, home services, and businesses across Charleston, Summerville, Mount Pleasant and more.';
$pageH1 = 'Lowcountry Business Directory';

if ($filterCategory && isset($allCategories[$filterCategory])) {
    $catName = $allCategories[$filterCategory];
    $pageTitle = $catName . ' Businesses in the Lowcountry';
    $pageDesc = "Browse {$catName} businesses in the Charleston Lowcountry area. Find trusted local providers.";
    $pageH1 = $catName . ' Businesses';
}
if ($filterTag) {
    $tagName = '';
    foreach ($allTags as $t) {
        if ($t['slug'] === $filterTag) { $tagName = $t['display_name']; break; }
    }
    if (!$tagName) {
        // Tag might not be in filtered set, look it up
        foreach (getTags() as $t) {
            if ($t['slug'] === $filterTag) { $tagName = $t['display_name']; break; }
        }
    }
    if ($tagName) {
        $pageTitle = $tagName . ' Services - Lowcountry Business Directory';
        $pageDesc = "Find {$tagName} businesses in the Charleston Lowcountry area.";
        $pageH1 = $tagName . ' Businesses';
    }
}
if ($filterLocation) {
    $locName = $allLocations[$filterLocation] ?? ucwords(str_replace('-', ' ', $filterLocation));
    $pageH1 .= ' in ' . $locName;
}

// Build canonical URL
$canonicalUrl = directoryUrl();
if ($filterCategory) $canonicalUrl = categoryUrl($filterCategory);
elseif ($filterTag) $canonicalUrl = tagUrl($filterTag);
elseif ($filterLocation) $canonicalUrl = locationUrl($filterLocation);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?> - <?= SITE_NAME ?></title>
    <meta name="description" content="<?= htmlspecialchars($pageDesc) ?>">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="<?= htmlspecialchars($canonicalUrl) ?>">
    <meta property="og:title" content="<?= htmlspecialchars($pageTitle) ?>">
    <meta property="og:description" content="<?= htmlspecialchars($pageDesc) ?>">
    <meta property="og:url" content="<?= htmlspecialchars($canonicalUrl) ?>">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="<?= SITE_NAME ?>">
    <meta name="twitter:card" content="summary">

    <!-- Google Analytics (GA4) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-38313KT3XE"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-38313KT3XE');
    </script>

    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-5ZP4TT23');</script>

    <!-- Meta Pixel -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '629481023248934');
    fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=629481023248934&ev=PageView&noscript=1"
    /></noscript>

    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">

    <?php
    // JSON-LD ItemList schema
    $itemListItems = [];
    $pos = 0;
    foreach (array_slice($businesses, 0, 50) as $b) {
        $pos++;
        $itemListItems[] = [
            '@type' => 'ListItem',
            'position' => $pos,
            'url' => businessUrl($b['slug']),
            'name' => $b['business_name']
        ];
    }
    $itemListSchema = [
        '@context' => 'https://schema.org',
        '@type' => 'ItemList',
        'name' => $pageTitle,
        'numberOfItems' => $totalCount,
        'itemListElement' => $itemListItems
    ];
    ?>
    <script type="application/ld+json"><?= json_encode($itemListSchema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) ?></script>

    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; color: #334155; background: #f8fafc; }
        a { text-decoration: none; }

        /* Logo Header */
        .logo-header { background: #000; padding: 15px 0; border-bottom: 1px solid #222; }
        .logo-header-inner { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; }
        .brand-wordmark { text-align: center; flex: 1; }
        .brand-wordmark a { text-decoration: none; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 800; letter-spacing: -0.5px; }
        .lowcountry, .spotlight { color: #38b6ff; }
        .business { color: white; margin: 0 8px; }
        .header-auth-link { color: #94a3b8; font-size: 0.85rem; font-weight: 600; text-decoration: none; white-space: nowrap; padding: 8px 16px; border: 1px solid #333; border-radius: 8px; transition: all 0.2s; }
        .header-auth-link:hover { color: #38b6ff; border-color: #38b6ff; }

        /* Hero */
        .page-header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
            padding: 50px 20px;
            text-align: center;
            color: white;
        }
        .page-header h1 { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 800; margin-bottom: 12px; }
        .page-header p { font-size: 1.15rem; opacity: 0.85; max-width: 600px; margin: 0 auto; }

        /* Search/Filter Bar */
        .filter-section {
            max-width: 1200px; margin: -30px auto 0; padding: 0 20px; position: relative; z-index: 10;
        }
        .filter-bar {
            background: white; border-radius: 16px; padding: 24px 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 16px; align-items: end;
        }
        .filter-group label { display: block; font-weight: 600; font-size: 0.85rem; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .filter-group input,
        .filter-group select {
            width: 100%; padding: 12px 14px; border: 2px solid #e2e8f0; border-radius: 10px;
            font-size: 15px; font-family: inherit; transition: border-color 0.2s;
        }
        .filter-group input:focus,
        .filter-group select:focus { outline: none; border-color: #38b6ff; }

        /* Directory Grid */
        .directory-section { max-width: 1200px; margin: 0 auto; padding: 40px 20px 60px; }
        .results-count { color: #64748b; font-size: 0.95rem; margin-bottom: 20px; font-weight: 500; }
        .business-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;
        }

        /* Business Card */
        .business-card {
            background: white; border-radius: 12px; overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;
            transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;
        }
        .business-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.12); }
        .business-card a { text-decoration: none; color: inherit; display: block; }

        .card-body { display: flex; padding: 18px; gap: 16px; align-items: flex-start; }
        .card-icon {
            width: 100px; height: 100px; background: #f1f5f9; border-radius: 10px;
            display: flex; align-items: center; justify-content: center; font-size: 28px;
            flex-shrink: 0; overflow: hidden; padding: 6px;
        }
        .card-icon img { width: 100%; height: 100%; object-fit: contain; }
        .card-info { flex: 1; min-width: 0; }
        .card-name { font-size: 1.05rem; font-weight: 700; color: #1e293b; margin-bottom: 4px; line-height: 1.3; }
        .card-category { color: #38b6ff; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 8px; }
        .card-meta { display: flex; flex-direction: column; gap: 3px; }
        .card-meta-item { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #64748b; }
        .card-meta-icon { color: #38b6ff; width: 14px; text-align: center; flex-shrink: 0; }
        .card-desc { padding: 0 18px 4px; font-size: 0.88rem; color: #64748b; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .card-more { padding: 0 18px 14px; font-size: 0.82rem; color: #38b6ff; font-weight: 600; display: none; }
        .card-desc.is-truncated + .card-more { display: block; }

        .tag-pill { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; background: #e0f2fe; color: #0369a1; white-space: nowrap; }

        .active-pill {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 5px 10px 5px 12px; border-radius: 20px;
            font-size: .8rem; font-weight: 600; background: #dbeafe; color: #1d4ed8;
            white-space: nowrap;
        }
        .active-pill .pill-x {
            display: inline-flex; align-items: center; justify-content: center;
            width: 18px; height: 18px; border-radius: 50%;
            background: rgba(29,78,216,.15); color: #1d4ed8;
            font-size: .75rem; cursor: pointer; border: none;
            transition: background .15s; line-height: 1;
        }
        .active-pill .pill-x:hover { background: rgba(29,78,216,.3); }
        #clear-all-filters:hover { border-color: #ef4444; color: #ef4444; }

        /* Empty state */
        .empty-state {
            text-align: center; padding: 60px 30px; background: white;
            border-radius: 16px; border: 2px dashed #e2e8f0;
        }
        .empty-state h3 { font-size: 1.4rem; margin-bottom: 12px; color: #1e293b; }
        .empty-state p { color: #64748b; margin-bottom: 20px; }
        .empty-state a {
            display: inline-block; background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            color: white; padding: 12px 28px; border-radius: 10px; font-weight: 700;
        }

        /* Map/List Toggle */
        .view-toggle { display: flex; gap: 4px; background: #f1f5f9; border-radius: 8px; padding: 4px; }
        .view-toggle button {
            padding: 8px 16px; border: none; border-radius: 6px; font-size: 0.85rem;
            font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s;
            background: transparent; color: #64748b;
        }
        .view-toggle button.active { background: white; color: #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        #map-container { display: none; height: 500px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }

        /* No results from filter */
        .no-results { display: none; text-align: center; padding: 40px; color: #64748b; }
        .no-results h3 { font-size: 1.2rem; margin-bottom: 8px; color: #1e293b; }

        /* Get Listed CTA */
        .get-listed-cta { margin-top: 40px; padding: 0 0 10px; }
        .get-listed-content { background: linear-gradient(135deg, #0f172a, #1e293b); border-radius: 16px; padding: 36px 40px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .get-listed-text h3 { color: white; font-size: 1.4rem; font-weight: 800; margin-bottom: 6px; }
        .get-listed-text p { color: #94a3b8; font-size: 1rem; }
        .get-listed-btn { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 1rem; text-decoration: none; white-space: nowrap; transition: transform 0.2s, box-shadow 0.2s; }
        .get-listed-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(56,182,255,0.3); }

        /* Sticky CTA Bar */
        .sticky-cta { position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000; background: #0f172a; border-top: 2px solid #38b6ff; box-shadow: 0 -4px 20px rgba(0,0,0,0.2); }
        .sticky-cta-inner { max-width: 1200px; margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; justify-content: center; gap: 16px; }
        .sticky-cta-text { color: #e2e8f0; font-size: 0.95rem; }
        .sticky-cta-text strong { color: #38b6ff; }
        .sticky-cta-btn { background: #38b6ff; color: white; padding: 10px 24px; border-radius: 8px; font-weight: 700; font-size: 0.9rem; text-decoration: none; white-space: nowrap; transition: background 0.2s; }
        .sticky-cta-btn:hover { background: #0ea5e9; }
        .sticky-cta-close { background: none; border: none; color: #64748b; font-size: 1.4rem; cursor: pointer; padding: 0 4px; line-height: 1; }
        .sticky-cta-close:hover { color: white; }

        /* Footer */
        .page-footer { background: #1e293b; color: white; text-align: center; padding: 30px 20px; font-size: 0.9rem; }
        .page-footer a { color: #38b6ff; }
        .page-footer a:hover { text-decoration: underline; }

        @media (max-width: 768px) {
            .filter-bar { grid-template-columns: 1fr; }
            .business-grid { grid-template-columns: 1fr; }
            .get-listed-content { flex-direction: column; text-align: center; padding: 28px 24px; }
            .sticky-cta-inner { flex-wrap: wrap; text-align: center; }
            .sticky-cta-text { font-size: 0.85rem; }
        }
    </style>
</head>
<body>
    <!-- GTM noscript -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5ZP4TT23"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

    <!-- Logo Header -->
    <div class="logo-header">
        <div class="logo-header-inner">
            <h1 class="brand-wordmark">
                <a href="index.php">
                    <span class="lowcountry">Lowcountry</span>
                    <span class="business">Business</span>
                    <span class="spotlight">Spotlight</span>
                </a>
            </h1>
            <?php if (isLoggedIn()): ?>
                <a href="/dashboard.php" class="header-auth-link">My Dashboard</a>
            <?php else: ?>
                <a href="/login.php" class="header-auth-link">Business Sign In</a>
            <?php endif; ?>
        </div>
    </div>

    <?php include 'nav.php'; ?>

    <!-- Hero -->
    <div class="page-header">
        <h1><?= htmlspecialchars($pageH1) ?></h1>
        <p>Discover trusted local businesses across the Charleston Lowcountry area.</p>
    </div>

    <!-- Search/Filter Bar -->
    <div class="filter-section">
        <div class="filter-bar">
            <div class="filter-group">
                <label for="search">Search</label>
                <input type="text" id="search" placeholder="Business name, service, keyword...">
            </div>
            <div class="filter-group">
                <label for="filter-category">Category</label>
                <select id="filter-category">
                    <option value="">All Categories</option>
                    <?php foreach ($allCategories as $key => $name): ?>
                        <option value="<?= htmlspecialchars($key) ?>" <?= $filterCategory === $key ? 'selected' : '' ?>><?= htmlspecialchars($name) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="filter-group">
                <label for="filter-tag">Tag</label>
                <select id="filter-tag">
                    <option value="">All Tags</option>
                    <?php foreach ($allTags as $t): ?>
                        <option value="<?= htmlspecialchars($t['slug']) ?>"
                            data-category="<?= htmlspecialchars($t['category_slug'] ?? '') ?>"
                            <?= $filterTag === $t['slug'] ? 'selected' : '' ?>>
                            <?= htmlspecialchars($t['display_name']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="filter-group">
                <label for="filter-location">Location</label>
                <select id="filter-location">
                    <option value="">All Areas</option>
                    <?php foreach ($allLocations as $key => $name): ?>
                        <option value="<?= htmlspecialchars($key) ?>" <?= $filterLocation === $key ? 'selected' : '' ?>><?= htmlspecialchars($name) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="filter-group">
                <label>View</label>
                <div class="view-toggle">
                    <button id="btn-list" class="active" onclick="setView('list')">List</button>
                    <button id="btn-map" onclick="setView('map')">Map</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Active Filters Bar -->
    <div class="directory-section" style="padding-bottom:0;">
        <div id="active-filters" style="display:none; margin-bottom:16px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:.85rem; font-weight:600; color:#64748b;">Filters:</span>
            <div id="active-filter-pills" style="display:flex; gap:6px; flex-wrap:wrap;"></div>
            <button id="clear-all-filters" onclick="clearAllFilters()" style="padding:5px 14px; border-radius:20px; border:2px solid #e2e8f0; background:white; color:#64748b; font-size:.8rem; font-weight:600; cursor:pointer; transition:all .15s;">Clear All</button>
        </div>
    </div>

    <!-- Directory Grid -->
    <div class="directory-section" style="padding-top:0;">
        <div class="results-count" id="results-count"><?= $totalCount ?> business<?= $totalCount !== 1 ? 'es' : '' ?> listed</div>

        <div id="map-container"></div>

        <?php if (!empty($businesses)): ?>
            <div class="business-grid" id="business-grid">
                <?php
                $icons = [
                    'restaurant' => '🍽️', 'home-garden' => '🏡', 'automotive' => '🚗',
                    'health-wellness' => '💊', 'beauty' => '💇', 'retail' => '🏪',
                    'services' => '💼', 'fitness-recreation' => '🏋️', 'legal' => '⚖️', 'other' => '🏢'
                ];
                foreach ($businesses as $business):
                    $catLabel = $allCategories[$business['category']] ?? ucwords(str_replace('-', ' ', $business['category']));
                    $locLabel = $allLocations[$business['location_area'] ?? ''] ?? '';
                    $icon = $icons[$business['category']] ?? '🏢';
                ?>
                <?php $bizTagSlugs = array_column($business['tags'] ?? [], 'slug'); ?>
                <div class="business-card"
                     data-name="<?= htmlspecialchars(strtolower($business['business_name'])) ?>"
                     data-category="<?= htmlspecialchars($business['category']) ?>"
                     data-location="<?= htmlspecialchars($business['location_area'] ?? '') ?>"
                     data-desc="<?= htmlspecialchars(strtolower($business['description'] ?? '')) ?>"
                     data-tags="<?= htmlspecialchars(implode(',', $bizTagSlugs)) ?>">
                    <a href="<?= htmlspecialchars(businessUrl($business['slug'])) ?>">
                        <div class="card-body">
                            <div class="card-icon">
                                <?php if (!empty($business['photos']) && !empty($business['photos'][0])): ?>
                                    <img src="<?= htmlspecialchars($business['photos'][0]['thumb_url'] ?? $business['photos'][0]['url']) ?>"
                                         alt="<?= htmlspecialchars($business['photos'][0]['alt_text'] ?: $business['business_name']) ?>"
                                         width="100" height="100" loading="lazy">
                                <?php else: ?>
                                    <?= $icon ?>
                                <?php endif; ?>
                            </div>
                            <div class="card-info">
                                <div class="card-name"><?= htmlspecialchars($business['business_name'], ENT_QUOTES, 'UTF-8', false) ?></div>
                                <div class="card-category"><?= htmlspecialchars($catLabel) ?></div>
                                <div class="card-meta">
                                    <?php if (!empty($locLabel)): ?>
                                        <div class="card-meta-item"><span class="card-meta-icon">📍</span> <?= htmlspecialchars($locLabel) ?></div>
                                    <?php endif; ?>
                                    <?php if (!empty($business['formatted_phone'])): ?>
                                        <div class="card-meta-item"><span class="card-meta-icon">📞</span> <?= htmlspecialchars($business['formatted_phone']) ?></div>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                        <?php if (!empty($business['tags'])): ?>
                            <div class="card-tags" style="padding: 0 18px 4px; display:flex; flex-wrap:wrap; gap:4px;">
                                <?php foreach ($business['tags'] as $tag): ?>
                                    <span class="tag-pill"><?= htmlspecialchars($tag['display_name']) ?></span>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                        <?php if (!empty($business['description'])): ?>
                            <div class="card-desc"><?= htmlspecialchars($business['description']) ?></div>
                            <div class="card-more">more...</div>
                        <?php endif; ?>
                    </a>
                </div>
                <?php endforeach; ?>
            </div>

            <div class="no-results" id="no-results">
                <h3>No businesses match your filters</h3>
                <p>Try adjusting your search or clearing the filters.</p>
            </div>

            <!-- Get Listed CTA -->
            <div class="get-listed-cta">
                <div class="get-listed-content">
                    <div class="get-listed-text">
                        <h3>Own a local business?</h3>
                        <p>Join <?= count($businesses) ?>+ businesses already listed in the Lowcountry's premier directory. It's free to get started.</p>
                    </div>
                    <a href="/register.php?plan=basic" class="get-listed-btn">Get Listed Free</a>
                </div>
            </div>

        <?php else: ?>
            <div class="empty-state">
                <h3>Directory Coming Soon</h3>
                <p>We're building the Lowcountry's best local business directory. Want to be listed?</p>
                <a href="contact.php">Contact Us to Get Listed</a>
            </div>
        <?php endif; ?>
    </div>

    <!-- Sticky CTA Bar (non-logged-in visitors only) -->
    <?php if (!isLoggedIn()): ?>
    <div id="sticky-cta" class="sticky-cta" style="display:none;">
        <div class="sticky-cta-inner">
            <span class="sticky-cta-text">Own a local business? <strong>Get listed free</strong> — join <?= count($businesses) ?>+ Lowcountry businesses.</span>
            <a href="/register.php?plan=basic" class="sticky-cta-btn">Get Listed</a>
            <button class="sticky-cta-close" onclick="document.getElementById('sticky-cta').style.display='none'" aria-label="Close">&times;</button>
        </div>
    </div>
    <?php endif; ?>

    <?php include 'footer.php'; ?>

    <?php
    // Build JSON data for map markers
    $mapData = [];
    foreach ($businesses as $b) {
        $mapData[] = [
            'name' => $b['business_name'],
            'slug' => $b['slug'],
            'category' => $b['category'],
            'location' => $b['location_area'] ?? '',
            'address' => trim(($b['address'] ?? '') . ', ' . ($b['city'] ?? ''), ', '),
            'lat' => $b['lat'] ?? null,
            'lng' => $b['lng'] ?? null,
            'catLabel' => $allCategories[$b['category']] ?? ucwords(str_replace('-', ' ', $b['category']))
        ];
    }
    ?>
    <script>
    var businessData = <?= json_encode($mapData, JSON_HEX_TAG | JSON_HEX_AMP) ?>;
    </script>

    <script>
    (function() {
        const searchInput = document.getElementById('search');
        const categorySelect = document.getElementById('filter-category');
        const locationSelect = document.getElementById('filter-location');
        const tagSelect = document.getElementById('filter-tag');
        const grid = document.getElementById('business-grid');
        const noResults = document.getElementById('no-results');
        const countEl = document.getElementById('results-count');
        const mapContainer = document.getElementById('map-container');

        if (!grid) return;

        const cards = Array.from(grid.querySelectorAll('.business-card'));
        let currentView = 'list';
        let map = null;
        let markers = [];
        let infoWindow = null;
        let mapLoaded = false;

        // Filter tag options when category changes
        if (categorySelect && tagSelect) {
            categorySelect.addEventListener('change', function() {
                var cat = this.value;
                var opts = tagSelect.querySelectorAll('option');
                opts.forEach(function(opt) {
                    if (!opt.value) return; // skip "All Tags"
                    var optCat = opt.getAttribute('data-category');
                    opt.style.display = (!cat || !optCat || optCat === cat) ? '' : 'none';
                });
                // Reset tag if hidden
                if (tagSelect.selectedOptions[0] && tagSelect.selectedOptions[0].style.display === 'none') {
                    tagSelect.value = '';
                }
            });
        }

        function filterCards() {
            const query = searchInput.value.toLowerCase().trim();
            const cat = categorySelect.value;
            const loc = locationSelect.value;
            const tag = tagSelect ? tagSelect.value : '';
            let visible = 0;

            cards.forEach(function(card, i) {
                const name = card.dataset.name || '';
                const desc = card.dataset.desc || '';
                const cardCat = card.dataset.category || '';
                const cardLoc = card.dataset.location || '';
                const cardTags = card.dataset.tags || '';

                const matchSearch = !query || name.includes(query) || desc.includes(query);
                const matchCat = !cat || cardCat === cat;
                const matchLoc = !loc || cardLoc === loc;
                const matchTag = !tag || cardTags.split(',').indexOf(tag) !== -1;

                const show = matchSearch && matchCat && matchLoc && matchTag;
                card.style.display = show ? '' : 'none';
                if (businessData[i]) businessData[i]._visible = show;
                if (show) visible++;
            });

            countEl.textContent = visible + ' business' + (visible !== 1 ? 'es' : '') + ' found';
            noResults.style.display = (visible === 0 && currentView === 'list') ? 'block' : 'none';

            if (currentView === 'map' && map) {
                updateMarkers();
            }

            updateActivePills();
        }

        function updateActivePills() {
            var bar = document.getElementById('active-filters');
            var container = document.getElementById('active-filter-pills');
            container.innerHTML = '';
            var hasAny = false;

            var query = searchInput.value.trim();
            if (query) {
                hasAny = true;
                container.appendChild(makePill('Search: ' + query, function() {
                    searchInput.value = '';
                    filterCards();
                }));
            }

            if (categorySelect.value) {
                hasAny = true;
                var label = categorySelect.options[categorySelect.selectedIndex].text;
                container.appendChild(makePill(label, function() {
                    categorySelect.value = '';
                    categorySelect.dispatchEvent(new Event('change'));
                }));
            }

            if (tagSelect && tagSelect.value) {
                hasAny = true;
                var label = tagSelect.options[tagSelect.selectedIndex].text;
                container.appendChild(makePill(label, function() {
                    tagSelect.value = '';
                    filterCards();
                }));
            }

            if (locationSelect.value) {
                hasAny = true;
                var label = locationSelect.options[locationSelect.selectedIndex].text;
                container.appendChild(makePill(label, function() {
                    locationSelect.value = '';
                    filterCards();
                }));
            }

            bar.style.display = hasAny ? 'flex' : 'none';
        }

        function makePill(text, onRemove) {
            var span = document.createElement('span');
            span.className = 'active-pill';
            span.textContent = text;
            var x = document.createElement('button');
            x.className = 'pill-x';
            x.innerHTML = '&times;';
            x.type = 'button';
            x.addEventListener('click', onRemove);
            span.appendChild(x);
            return span;
        }

        window.clearAllFilters = function() {
            searchInput.value = '';
            categorySelect.value = '';
            if (tagSelect) tagSelect.value = '';
            locationSelect.value = '';
            // Re-show all tag options
            if (tagSelect) {
                tagSelect.querySelectorAll('option').forEach(function(opt) { opt.style.display = ''; });
            }
            filterCards();
        };

        window.setView = function(view) {
            currentView = view;
            document.getElementById('btn-list').classList.toggle('active', view === 'list');
            document.getElementById('btn-map').classList.toggle('active', view === 'map');

            if (view === 'map') {
                grid.style.display = 'none';
                noResults.style.display = 'none';
                mapContainer.style.display = 'block';
                if (!mapLoaded) {
                    loadGoogleMaps();
                } else {
                    updateMarkers();
                }
            } else {
                grid.style.display = '';
                mapContainer.style.display = 'none';
                filterCards();
            }
        };

        function loadGoogleMaps() {
            if (mapLoaded) return;
            var script = document.createElement('script');
            script.src = 'https://maps.googleapis.com/maps/api/js?key=<?= GOOGLE_MAPS_API_KEY ?>&callback=initDirectoryMap';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        window.initDirectoryMap = function() {
            mapLoaded = true;
            map = new google.maps.Map(mapContainer, {
                center: {lat: 32.9, lng: -80.05},
                zoom: 10,
                styles: [{featureType: 'poi', stylers: [{visibility: 'off'}]}]
            });
            infoWindow = new google.maps.InfoWindow();
            updateMarkers();
        };

        function updateMarkers() {
            // Clear existing markers
            markers.forEach(function(m) { m.setMap(null); });
            markers = [];

            var bounds = new google.maps.LatLngBounds();
            var hasMarkers = false;

            businessData.forEach(function(biz) {
                if (!biz._visible && biz._visible !== undefined) return;
                if (!biz.lat || !biz.lng) return;

                var marker = new google.maps.Marker({
                    position: {lat: parseFloat(biz.lat), lng: parseFloat(biz.lng)},
                    map: map,
                    title: biz.name
                });

                marker.addListener('click', function() {
                    infoWindow.setContent(
                        '<div style="font-family:Inter,sans-serif;max-width:220px;">' +
                        '<strong style="font-size:14px;">' + escHtml(biz.name) + '</strong><br>' +
                        '<span style="color:#38b6ff;font-size:12px;">' + escHtml(biz.catLabel) + '</span><br>' +
                        (biz.address ? '<span style="color:#64748b;font-size:12px;">' + escHtml(biz.address) + '</span><br>' : '') +
                        '<a href="/business/' + encodeURIComponent(biz.slug) + '" style="color:#38b6ff;font-weight:600;font-size:13px;">View Details &rarr;</a>' +
                        '</div>'
                    );
                    infoWindow.open(map, marker);
                });

                markers.push(marker);
                bounds.extend(marker.getPosition());
                hasMarkers = true;
            });

            if (hasMarkers) {
                map.fitBounds(bounds);
                if (markers.length === 1) map.setZoom(14);
            }
        }

        function escHtml(str) {
            var div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        searchInput.addEventListener('input', filterCards);
        categorySelect.addEventListener('change', filterCards);
        locationSelect.addEventListener('change', filterCards);
        if (tagSelect) tagSelect.addEventListener('change', filterCards);

        // Mark all as visible initially
        businessData.forEach(function(b) { b._visible = true; });

        // Show active filter pills on load
        updateActivePills();

        // Mark truncated descriptions
        document.querySelectorAll('.card-desc').forEach(function(el) {
            if (el.scrollHeight > el.clientHeight) {
                el.classList.add('is-truncated');
            }
        });
    })();
    </script>

    <?php if (!isLoggedIn()): ?>
    <script>
    (function() {
        var bar = document.getElementById('sticky-cta');
        if (!bar) return;
        var shown = false;
        window.addEventListener('scroll', function() {
            if (window.scrollY > 400 && !shown) {
                bar.style.display = '';
                shown = true;
            }
        });
    })();
    </script>
    <?php endif; ?>
</body>
</html>
