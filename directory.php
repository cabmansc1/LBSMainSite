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

// Separate featured businesses from regular
$featuredBusinesses = [];
$regularBusinesses = [];
foreach ($businesses as $b) {
    if (!empty($b['is_featured']) || !empty($b['has_priority_placement']) || !empty($b['has_featured_placement'])) {
        $featuredBusinesses[] = $b;
    } else {
        $regularBusinesses[] = $b;
    }
}

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
$pageH1 = 'Directory';

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

// Shared SEO head include — dynamic values mirror the previous hand-rolled <head>
$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
if ($filterCategory || $filterTag || $filterLocation) {
    $seo['h1'] = $pageH1; // filtered views keep their dynamic heading
} elseif (empty($seo['h1'])) {
    $seo['h1'] = 'Find Trusted Local Businesses in the Lowcountry';
}
$seo['title']           = $pageTitle . ' - ' . SITE_NAME;
$seo['description']     = $pageDesc;
$seo['canonical']       = $canonicalUrl;
$seo['og_title']        = $pageTitle;
$seo['og_description']  = $pageDesc;
$seo['og_image_width']  = 1200;
$seo['og_image_height'] = 630;
$seo['og_image_alt']    = $pageTitle;
include __DIR__ . '/seo_head.php';
?>
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



        /* Hero */
        .page-header {
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
            padding: 50px 20px;
            text-align: center;
            color: white;
        }
        .page-header h1 { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 800; margin-bottom: 12px; }
        .page-header p { font-size: 1.15rem; opacity: 0.85; max-width: 600px; margin: 0 auto; line-height: 1.6; }

        /* Search/Filter Bar */
        .filter-section {
            max-width: 1200px; margin: -30px auto 0; padding: 0 20px; position: relative; z-index: 10;
        }
        .filter-bar {
            background: white; border-radius: 16px; padding: 24px 30px;
            border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,.04);
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

        /* Sort bar */
        .results-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .results-count { color: #64748b; font-size: 0.95rem; font-weight: 500; margin: 0; }
        .sort-group { display: flex; align-items: center; gap: 8px; }
        .sort-group label { font-size: 0.85rem; color: #64748b; font-weight: 500; }
        .sort-group select { padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; font-family: inherit; color: #334155; cursor: pointer; }

        /* Directory Grid */
        .directory-section { max-width: 1200px; margin: 0 auto; padding: 40px 20px 60px; }
        .business-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;
        }

        /* ===== Featured Section ===== */
        .featured-section { max-width: 1200px; margin: 0 auto 24px; padding: 28px 20px; background: white; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.04); }
        .featured-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .featured-section-header h2 { font-size: 1.3rem; font-weight: 800; color: #1e293b; }
        .featured-badge-icon { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .featured-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;
        }

        /* ===== Business Card Design ===== */
        .business-card {
            background: #f8fafc; border-radius: 14px; overflow: hidden;
            border: 2px solid #e2e8f0;
            transition: all 0.25s ease; cursor: pointer;
            display: flex; flex-direction: column;
        }
        .business-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(56,182,255,.12); border-color: #38b6ff; }
        .business-card a.card-link { text-decoration: none; color: inherit; display: flex; flex-direction: column; flex: 1; }

        /* Card top section: logo + info side by side */
        .card-top { display: flex; padding: 16px 18px; gap: 14px; align-items: flex-start; position: relative; }
        .card-logo {
            width: 80px; height: 80px; background: #f8fafc; border-radius: 10px;
            display: flex; align-items: center; justify-content: center; font-size: 28px;
            flex-shrink: 0; overflow: hidden; border: 1px solid #f1f5f9;
        }
        .card-logo img { width: 100%; height: 100%; object-fit: contain; }
        .card-info { flex: 1; min-width: 0; }
        .card-name {
            font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-bottom: 3px;
            line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2;
            -webkit-box-orient: vertical; overflow: hidden;
        }
        .card-category-label {
            color: #38b6ff; font-size: 0.75rem; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 6px;
        }
        .card-location-line {
            display: flex; align-items: center; gap: 4px; font-size: 0.82rem;
            color: #64748b; font-weight: 500;
        }
        .card-location-line svg { flex-shrink: 0; }

        /* Featured badge */
        .card-featured-badge {
            display: inline-flex; align-items: center; gap: 4px;
            background: linear-gradient(135deg, #f59e0b, #d97706); color: white;
            padding: 3px 8px; border-radius: 5px; font-size: 0.68rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.5px;
            box-shadow: 0 2px 6px rgba(217,119,6,0.25);
            margin-top: 4px; width: fit-content;
        }

        /* Description */
        .card-desc {
            padding: 0 18px; font-size: 0.85rem; color: #64748b; line-height: 1.5;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
            overflow: hidden; margin-bottom: 10px;
        }

        /* Tags row */
        .card-tags { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 18px 10px; }
        .tag-pill {
            display: inline-block; padding: 2px 8px; border-radius: 12px;
            font-size: 0.7rem; font-weight: 600; background: #f0f9ff; color: #0369a1;
            white-space: nowrap; border: 1px solid #e0f2fe;
        }

        /* Card footer with contact info */
        .card-footer {
            padding: 10px 18px; border-top: 1px solid #e2e8f0; margin-top: auto;
            display: flex; align-items: center; justify-content: space-between; gap: 8px;
        }
        .card-contact { display: flex; align-items: center; gap: 10px; }
        .card-contact-item {
            display: flex; align-items: center; gap: 4px;
            font-size: 0.78rem; color: #64748b; font-weight: 500;
        }
        .card-contact-item svg { color: #38b6ff; flex-shrink: 0; }
        .card-view-btn {
            font-size: 0.78rem; font-weight: 700; color: #38b6ff;
            display: flex; align-items: center; gap: 3px; white-space: nowrap;
        }
        .card-view-btn svg { transition: transform 0.2s; }
        .business-card:hover .card-view-btn svg { transform: translateX(3px); }

        /* Featured card enhancements */
        .business-card.is-featured { border: 2px solid #f59e0b; background: #fffdf5; }
        .business-card.is-featured .card-logo { border-color: #fde68a; }
        .business-card.is-featured .card-top { padding: 20px 18px 16px; }
        .business-card.is-featured .card-logo { width: 90px; height: 90px; }
        .business-card.is-featured .card-name { font-size: 1.12rem; }
        .business-card.is-featured .card-desc { -webkit-line-clamp: 3; }

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
            border-radius: 16px; border: 2px dashed #cbd5e1;
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
        .get-listed-content { background: linear-gradient(135deg, #0f172a, #1e293b); border-radius: 16px; padding: 36px 40px; display: flex; align-items: center; justify-content: space-between; gap: 24px; transition: transform 0.2s, box-shadow 0.2s; }
        .get-listed-content:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,.15); }
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
            .business-grid, .featured-grid { grid-template-columns: 1fr; }
            .get-listed-content { flex-direction: column; text-align: center; padding: 28px 24px; }
            .sticky-cta-inner { flex-wrap: wrap; text-align: center; }
            .sticky-cta-text { font-size: 0.85rem; }
            .card-footer { flex-wrap: wrap; }
            .results-bar { flex-direction: column; align-items: flex-start; }
        }
    </style>
</head>
<body>
    <?php include 'header.php'; ?>

    <!-- Hero -->
    <div class="page-header">
        <h1><?= htmlspecialchars($seo['h1']) ?></h1>
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

    <?php
    // Shared icon map and card renderer
    $icons = [
        'restaurant' => '&#127869;', 'home-garden' => '&#127969;', 'automotive' => '&#128663;',
        'health-wellness' => '&#128138;', 'beauty' => '&#128135;', 'retail' => '&#127978;',
        'services' => '&#128188;', 'fitness-recreation' => '&#127947;', 'legal' => '&#9878;', 'other' => '&#127970;'
    ];

    function renderBusinessCard($business, $allCategories, $allLocations, $icons, $isFeatured = false) {
        $catLabel = $allCategories[$business['category']] ?? ucwords(str_replace('-', ' ', $business['category']));
        $locLabel = $allLocations[$business['location_area'] ?? ''] ?? '';
        $icon = $icons[$business['category']] ?? '&#127970;';
        $bizTagSlugs = array_column($business['tags'] ?? [], 'slug');
        $thumbUrl = '';
        $thumbAlt = $business['business_name'];
        if (!empty($business['photos']) && !empty($business['photos'][0])) {
            // Use medium (fit, no crop) so full logo is always visible
            $thumbUrl = $business['photos'][0]['medium_url'] ?? $business['photos'][0]['url'];
            $thumbAlt = $business['photos'][0]['alt_text'] ?: $business['business_name'];
        }
        $cityState = '';
        if (!empty($business['city'])) {
            $cityState = $business['city'];
            if (!empty($business['state'])) $cityState .= ', ' . $business['state'];
        } elseif (!empty($locLabel)) {
            $cityState = $locLabel;
        }
        ?>
        <div class="business-card<?= $isFeatured ? ' is-featured' : '' ?>"
             data-name="<?= htmlspecialchars(strtolower($business['business_name'])) ?>"
             data-category="<?= htmlspecialchars($business['category']) ?>"
             data-location="<?= htmlspecialchars($business['location_area'] ?? '') ?>"
             data-desc="<?= htmlspecialchars(strtolower($business['description'] ?? '')) ?>"
             data-tags="<?= htmlspecialchars(implode(',', $bizTagSlugs)) ?>"
             data-created="<?= htmlspecialchars($business['created_at'] ?? '') ?>"
             data-featured="<?= $isFeatured ? '1' : '0' ?>">
            <a href="<?= htmlspecialchars(businessUrl($business['slug'])) ?>" class="card-link">
                <div class="card-top">
                    <div class="card-logo">
                        <?php if ($thumbUrl): ?>
                            <img src="<?= htmlspecialchars($thumbUrl) ?>"
                                 alt="<?= htmlspecialchars($thumbAlt) ?>"
                                 width="80" height="80" loading="lazy">
                        <?php else: ?>
                            <?= $icon ?>
                        <?php endif; ?>
                    </div>
                    <div class="card-info">
                        <div class="card-name"><?= htmlspecialchars($business['business_name'], ENT_QUOTES, 'UTF-8', false) ?></div>
                        <div class="card-category-label"><?= htmlspecialchars($catLabel) ?></div>
                        <?php if ($cityState): ?>
                            <div class="card-location-line">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                <?= htmlspecialchars($cityState) ?>
                            </div>
                        <?php endif; ?>
                        <?php if ($isFeatured): ?>
                            <span class="card-featured-badge">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                Featured
                            </span>
                        <?php endif; ?>
                    </div>
                </div>
                <?php if (!empty($business['description'])): ?>
                    <div class="card-desc"><?= htmlspecialchars($business['description']) ?></div>
                <?php endif; ?>
                <?php if (!empty($business['tags'])): ?>
                    <div class="card-tags">
                        <?php foreach (array_slice($business['tags'], 0, 4) as $tag): ?>
                            <span class="tag-pill"><?= htmlspecialchars($tag['display_name']) ?></span>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
                <div class="card-footer">
                    <div class="card-contact">
                        <?php if (!empty($business['formatted_phone'])): ?>
                            <span class="card-contact-item">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                                <?= htmlspecialchars($business['formatted_phone']) ?>
                            </span>
                        <?php endif; ?>
                        <?php if (!empty($business['website'])): ?>
                            <span class="card-contact-item">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                                Website
                            </span>
                        <?php endif; ?>
                    </div>
                    <span class="card-view-btn">
                        View Details
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </span>
                </div>
            </a>
        </div>
        <?php
    }
    ?>

    <!-- Featured Businesses Section -->
    <?php if (!empty($featuredBusinesses)): ?>
    <div class="featured-section" id="featured-section">
        <div class="featured-section-header">
            <span class="featured-badge-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </span>
            <h2>Featured Businesses</h2>
        </div>
        <div class="featured-grid">
            <?php foreach ($featuredBusinesses as $business):
                renderBusinessCard($business, $allCategories, $allLocations, $icons, true);
            endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Directory Grid -->
    <div class="directory-section" style="padding-top:0;">
        <div id="map-container"></div>

        <div class="results-bar">
            <div class="results-count" id="results-count"><?= $totalCount ?> business<?= $totalCount !== 1 ? 'es' : '' ?> listed</div>
            <div class="sort-group">
                <label for="sort-by">Sort:</label>
                <select id="sort-by">
                    <option value="default">Featured First</option>
                    <option value="newest">Newest First</option>
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                </select>
            </div>
        </div>

        <?php if (!empty($businesses)): ?>
            <div class="business-grid" id="business-grid">
                <?php foreach ($regularBusinesses as $business):
                    renderBusinessCard($business, $allCategories, $allLocations, $icons, false);
                endforeach; ?>
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
                <a href="/contact.php">Contact Us to Get Listed</a>
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
        const sortSelect = document.getElementById('sort-by');
        const grid = document.getElementById('business-grid');
        const featuredSection = document.getElementById('featured-section');
        const noResults = document.getElementById('no-results');
        const countEl = document.getElementById('results-count');
        const mapContainer = document.getElementById('map-container');

        if (!grid) return;

        const cards = Array.from(grid.querySelectorAll('.business-card'));
        const featuredCards = featuredSection ? Array.from(featuredSection.querySelectorAll('.business-card')) : [];
        const allCards = featuredCards.concat(cards);
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
                    if (!opt.value) return;
                    var optCat = opt.getAttribute('data-category');
                    opt.style.display = (!cat || !optCat || optCat === cat) ? '' : 'none';
                });
                if (tagSelect.selectedOptions[0] && tagSelect.selectedOptions[0].style.display === 'none') {
                    tagSelect.value = '';
                }
            });
        }

        function matchesFilters(card) {
            const query = searchInput.value.toLowerCase().trim();
            const cat = categorySelect.value;
            const loc = locationSelect.value;
            const tag = tagSelect ? tagSelect.value : '';
            const name = card.dataset.name || '';
            const desc = card.dataset.desc || '';
            const cardCat = card.dataset.category || '';
            const cardLoc = card.dataset.location || '';
            const cardTags = card.dataset.tags || '';
            return (!query || name.includes(query) || desc.includes(query))
                && (!cat || cardCat === cat)
                && (!loc || cardLoc === loc)
                && (!tag || cardTags.split(',').indexOf(tag) !== -1);
        }

        function filterCards() {
            let visible = 0;

            // Filter featured cards
            var featuredVisible = 0;
            featuredCards.forEach(function(card) {
                var show = matchesFilters(card);
                card.style.display = show ? '' : 'none';
                if (show) { visible++; featuredVisible++; }
            });
            if (featuredSection) {
                featuredSection.style.display = featuredVisible > 0 ? '' : 'none';
            }

            // Filter regular cards
            cards.forEach(function(card, i) {
                var show = matchesFilters(card);
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

        // Store original DOM order for "default" sort
        var originalOrder = Array.from(grid.querySelectorAll('.business-card'));

        function sortCards() {
            var sortVal = sortSelect.value;
            var cardsArr = Array.from(grid.querySelectorAll('.business-card'));

            if (sortVal === 'default') {
                // Restore original PHP order (featured/priority first, then newest)
                originalOrder.forEach(function(card) { grid.appendChild(card); });
                return;
            }

            cardsArr.sort(function(a, b) {
                switch(sortVal) {
                    case 'name-asc':
                        return (a.dataset.name || '').localeCompare(b.dataset.name || '');
                    case 'name-desc':
                        return (b.dataset.name || '').localeCompare(a.dataset.name || '');
                    case 'newest':
                        return (b.dataset.created || '').localeCompare(a.dataset.created || '');
                    default:
                        return 0;
                }
            });
            cardsArr.forEach(function(card) { grid.appendChild(card); });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
                sortCards();
                filterCards();
            });
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
                if (featuredSection) featuredSection.style.display = 'none';
                if (!mapLoaded) {
                    loadGoogleMaps();
                } else {
                    updateMarkers();
                }
            } else {
                grid.style.display = '';
                mapContainer.style.display = 'none';
                if (featuredSection) featuredSection.style.display = '';
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
