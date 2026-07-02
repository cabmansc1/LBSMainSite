<?php
/**
 * Business Directory - Live Page
 * Lowcountry Business Spotlight
 */
require_once 'config.php';
require_once 'Business.php';

// Initialize
$businessObj = new Business();

// Get filter parameters
$search = isset($_GET['q']) ? sanitizeInput($_GET['q']) : '';
$category = isset($_GET['category']) ? sanitizeInput($_GET['category']) : '';
$location = isset($_GET['location']) ? sanitizeInput($_GET['location']) : '';
$sort = isset($_GET['sort']) ? sanitizeInput($_GET['sort']) : 'featured';
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$perPage = 12;

// Build filters array
$filters = [];
if (!empty($search)) {
    $filters['search'] = $search;
}
if (!empty($category)) {
    $filters['category'] = $category;
}
if (!empty($location)) {
    $filters['location'] = $location;
}

// Get businesses
$results = $businessObj->getBusinesses($filters, $page, $perPage);
$businesses = $results['businesses'];
$totalCount = $results['total'];
$totalPages = $results['total_pages'];

// Get featured businesses for top section (if no search active)
$featuredBusinesses = [];
if (empty($search) && empty($category) && empty($location) && $page === 1) {
    $featuredResults = $businessObj->getBusinesses(['featured' => true], 1, 4);
    $featuredBusinesses = $featuredResults['businesses'];
}

// Categories with icons
$categories = [
    'restaurant' => ['name' => 'Restaurants & Dining', 'icon' => '🍽️', 'color' => '#ef4444'],
    'home-garden' => ['name' => 'Home & Garden', 'icon' => '🏡', 'color' => '#22c55e'],
    'automotive' => ['name' => 'Automotive', 'icon' => '🚗', 'color' => '#3b82f6'],
    'health-wellness' => ['name' => 'Health & Wellness', 'icon' => '💊', 'color' => '#ec4899'],
    'beauty' => ['name' => 'Beauty & Personal Care', 'icon' => '💇', 'color' => '#a855f7'],
    'retail' => ['name' => 'Retail & Shopping', 'icon' => '🛍️', 'color' => '#f59e0b'],
    'services' => ['name' => 'Professional Services', 'icon' => '💼', 'color' => '#6366f1'],
    'fitness-recreation' => ['name' => 'Fitness & Recreation', 'icon' => '🏋️', 'color' => '#14b8a6'],
    'legal' => ['name' => 'Legal & Financial', 'icon' => '⚖️', 'color' => '#78716c'],
    'other' => ['name' => 'Other Services', 'icon' => '🏢', 'color' => '#64748b']
];

// Location areas
$locations = [
    'summerville' => 'Summerville',
    'mount-pleasant' => 'Mount Pleasant',
    'daniel-island' => 'Daniel Island',
    'james-island' => 'James Island',
    'charleston' => 'Charleston',
    'north-charleston' => 'North Charleston',
    'goose-creek' => 'Goose Creek',
    'lowcountry' => 'Other Lowcountry'
];

// Get category counts
$db = getDB();
$categoryCounts = [];
try {
    $stmt = $db->query("SELECT category, COUNT(*) as count FROM directory_businesses WHERE is_active = 1 AND is_verified = 1 AND is_hidden = 0 GROUP BY category");
    while ($row = $stmt->fetch()) {
        $categoryCounts[$row['category']] = $row['count'];
    }
} catch (Exception $e) {
    // Silently fail
}

// Get total active business count
$totalActiveBusinesses = array_sum($categoryCounts);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Directory | <?php echo SITE_NAME; ?></title>
    <meta name="description" content="Discover local businesses in the Charleston Lowcountry. Find restaurants, home services, retail shops, and more in Summerville, Mount Pleasant, Daniel Island, and Charleston.">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Shadows+Into+Light+Two&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Inter', sans-serif;
            background-color: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }

        /* ===== HEADER ===== */
        .header {
            background: #000;
            padding: 15px 0;
            border-bottom: 1px solid #222;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .header-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .brand-wordmark {
            font-weight: 800;
            font-size: clamp(1.5rem, 2.5vw, 2rem);
            text-decoration: none;
            display: flex;
            gap: 8px;
        }

        .brand-wordmark .lowcountry { color: #38b6ff; }
        .brand-wordmark .business { color: white; }
        .brand-wordmark .spotlight { color: #38b6ff; }

        .nav-links {
            display: flex;
            gap: 25px;
            align-items: center;
        }

        .nav-links a {
            color: #ccc;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }

        .nav-links a:hover { color: #38b6ff; }

        .btn-list-business {
            background: linear-gradient(135deg, #ff8c00, #ff6b00);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 700;
            transition: all 0.3s ease;
        }

        .btn-list-business:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(234, 88, 12, 0.4);
        }

        /* ===== HERO SECTION ===== */
        .hero {
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
            padding: 60px 0 80px;
            position: relative;
            overflow: hidden;
        }

        .hero::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.05)"/><circle cx="80" cy="40" r="1" fill="rgba(255,255,255,0.03)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.04)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }

        .hero-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 40px;
            position: relative;
            z-index: 2;
            text-align: center;
        }

        .hero h1 {
            font-size: clamp(2.5rem, 5vw, 3.5rem);
            font-weight: 800;
            color: white;
            margin-bottom: 15px;
        }

        .hero h1 .highlight { color: #000; }

        .hero p {
            font-size: 1.2rem;
            color: rgba(255,255,255,0.9);
            margin-bottom: 40px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        .hero-stats {
            display: flex;
            justify-content: center;
            gap: 50px;
            margin-bottom: 40px;
        }

        .hero-stat {
            text-align: center;
            color: white;
        }

        .hero-stat-number {
            font-size: 2.5rem;
            font-weight: 800;
        }

        .hero-stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* ===== SEARCH BOX ===== */
        .search-box {
            background: white;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            max-width: 900px;
            margin: 0 auto;
        }

        .search-form {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr auto;
            gap: 15px;
            align-items: end;
        }

        .form-group {
            display: flex;
            flex-direction: column;
        }

        .form-group label {
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
            font-size: 0.9rem;
        }

        .form-group input,
        .form-group select {
            padding: 14px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 15px;
            transition: all 0.3s ease;
            background: #f8fafc;
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #38b6ff;
            background: white;
            box-shadow: 0 0 0 3px rgba(56,182,255,0.1);
        }

        .btn-search {
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            color: white;
            padding: 14px 30px;
            border: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            height: fit-content;
        }

        .btn-search:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(56,182,255,0.3);
        }

        /* ===== MAIN CONTENT ===== */
        .main-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 60px 40px;
        }

        .section-header {
            text-align: center;
            margin-bottom: 40px;
        }

        .section-header h2 {
            font-size: clamp(1.75rem, 3vw, 2.25rem);
            font-weight: 800;
            color: #1e293b;
            margin-bottom: 10px;
        }

        .section-header p {
            color: #64748b;
            font-size: 1.1rem;
        }

        /* ===== CATEGORIES GRID ===== */
        .categories-section {
            margin-bottom: 60px;
        }

        .categories-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
        }

        .category-card {
            background: white;
            padding: 25px 20px;
            border-radius: 12px;
            text-align: center;
            text-decoration: none;
            color: #333;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border: 2px solid transparent;
            transition: all 0.3s ease;
        }

        .category-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            border-color: #38b6ff;
        }

        .category-card.active {
            border-color: #38b6ff;
            background: #f0f9ff;
        }

        .category-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            margin: 0 auto 15px;
        }

        .category-name {
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 5px;
        }

        .category-count {
            font-size: 0.8rem;
            color: #64748b;
        }

        /* ===== LOCATIONS BAR ===== */
        .locations-section {
            margin-bottom: 40px;
        }

        .locations-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
        }

        .location-chip {
            padding: 10px 20px;
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 25px;
            text-decoration: none;
            color: #64748b;
            font-weight: 500;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }

        .location-chip:hover {
            border-color: #38b6ff;
            color: #38b6ff;
        }

        .location-chip.active {
            background: #38b6ff;
            border-color: #38b6ff;
            color: white;
        }

        /* ===== RESULTS BAR ===== */
        .results-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding: 15px 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .results-count {
            font-weight: 600;
            color: #1e293b;
        }

        .results-count span {
            color: #38b6ff;
        }

        .sort-select {
            padding: 8px 15px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.9rem;
            cursor: pointer;
        }

        .active-filters {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .filter-tag {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: #e0f2fe;
            color: #0369a1;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
        }

        .filter-tag a {
            color: #0369a1;
            text-decoration: none;
            font-weight: 700;
        }

        /* ===== BUSINESS GRID ===== */
        .business-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 25px;
            margin-bottom: 50px;
        }

        .business-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 15px rgba(0,0,0,0.08);
            transition: all 0.3s ease;
            border: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
        }

        .business-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.12);
        }

        .business-card.featured {
            border-top: 4px solid #38b6ff;
        }

        .business-card.elite {
            border-top: 4px solid #ff8c00;
        }

        .business-image {
            height: 160px;
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            color: #94a3b8;
            position: relative;
        }

        .business-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .business-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
        }

        .business-badge.featured {
            background: #38b6ff;
            color: white;
        }

        .business-badge.elite {
            background: #ff8c00;
            color: white;
        }

        .business-content {
            padding: 20px;
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .business-category-tag {
            display: inline-block;
            padding: 4px 10px;
            background: #f1f5f9;
            color: #64748b;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-bottom: 10px;
            width: fit-content;
        }

        .business-name {
            font-size: 1.15rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 8px;
            text-decoration: none;
            display: block;
        }

        .business-name:hover {
            color: #38b6ff;
        }

        .business-rating {
            display: flex;
            align-items: center;
            gap: 5px;
            margin-bottom: 10px;
        }

        .stars {
            color: #fbbf24;
            font-size: 14px;
        }

        .rating-text {
            color: #64748b;
            font-size: 0.85rem;
        }

        .business-description {
            color: #64748b;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-bottom: 15px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            flex: 1;
        }

        .business-meta {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-top: 15px;
            border-top: 1px solid #f1f5f9;
        }

        .business-meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: #64748b;
        }

        .business-meta-item .icon {
            width: 16px;
            text-align: center;
            color: #38b6ff;
        }

        .business-footer {
            padding: 15px 20px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }

        .btn-view-business {
            display: block;
            text-align: center;
            padding: 10px;
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }

        .btn-view-business:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(56,182,255,0.3);
        }

        /* ===== EMPTY STATE ===== */
        .empty-state {
            text-align: center;
            padding: 80px 40px;
            background: white;
            border-radius: 16px;
            border: 2px dashed #e2e8f0;
        }

        .empty-state-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }

        .empty-state h3 {
            font-size: 1.5rem;
            color: #1e293b;
            margin-bottom: 10px;
        }

        .empty-state p {
            color: #64748b;
            margin-bottom: 30px;
        }

        .btn-primary {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(56,182,255,0.3);
        }

        /* ===== PAGINATION ===== */
        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            margin-top: 40px;
        }

        .pagination a,
        .pagination span {
            padding: 10px 16px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }

        .pagination a {
            background: white;
            color: #64748b;
            border: 2px solid #e2e8f0;
        }

        .pagination a:hover {
            border-color: #38b6ff;
            color: #38b6ff;
        }

        .pagination span.current {
            background: #38b6ff;
            color: white;
            border: 2px solid #38b6ff;
        }

        .pagination span.dots {
            color: #64748b;
            border: none;
            background: none;
        }

        /* ===== CTA SECTION ===== */
        .cta-section {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            padding: 80px 40px;
            text-align: center;
            margin-top: 60px;
        }

        .cta-container {
            max-width: 800px;
            margin: 0 auto;
        }

        .cta-section h2 {
            font-size: clamp(2rem, 4vw, 2.5rem);
            font-weight: 800;
            color: white;
            margin-bottom: 15px;
        }

        .cta-section p {
            font-size: 1.1rem;
            color: #94a3b8;
            margin-bottom: 30px;
        }

        .btn-cta {
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, #ff8c00, #ff6b00);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(234, 88, 12, 0.3);
        }

        .btn-cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(234, 88, 12, 0.4);
        }

        /* ===== FOOTER ===== */
        .footer {
            background: #000;
            color: #94a3b8;
            padding: 40px;
            text-align: center;
        }

        .footer-content {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .footer a {
            color: #94a3b8;
            text-decoration: none;
        }

        .footer a:hover {
            color: white;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 900px) {
            .search-form {
                grid-template-columns: 1fr;
            }

            .header-container {
                padding: 0 20px;
            }

            .nav-links {
                display: none;
            }

            .hero-container,
            .main-content {
                padding-left: 20px;
                padding-right: 20px;
            }

            .hero-stats {
                gap: 30px;
            }

            .categories-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .business-grid {
                grid-template-columns: 1fr;
            }

            .results-bar {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }

            .footer-content {
                flex-direction: column;
                gap: 20px;
            }
        }

        @media (max-width: 480px) {
            .categories-grid {
                grid-template-columns: 1fr;
            }

            .hero-stats {
                flex-direction: column;
                gap: 20px;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="header-container">
            <a href="index.php" class="brand-wordmark">
                <span class="lowcountry">Lowcountry</span>
                <span class="business">Business</span>
                <span class="spotlight">Spotlight</span>
            </a>
            <nav class="nav-links">
                <a href="index.php">Home</a>
                <a href="directory-live.php">Directory</a>
                <a href="advertise.php">Advertise</a>
                <a href="directory-signup.php" class="btn-list-business">List Your Business</a>
            </nav>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-container">
            <h1>Discover <span class="highlight">Local Businesses</span></h1>
            <p>Find trusted restaurants, services, and shops across the Charleston Lowcountry</p>

            <div class="hero-stats">
                <div class="hero-stat">
                    <div class="hero-stat-number"><?php echo number_format($totalActiveBusinesses); ?></div>
                    <div class="hero-stat-label">Businesses</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-number"><?php echo count(array_filter($categoryCounts)); ?></div>
                    <div class="hero-stat-label">Categories</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-number"><?php echo count($locations); ?></div>
                    <div class="hero-stat-label">Areas</div>
                </div>
            </div>

            <!-- Search Box -->
            <div class="search-box">
                <form class="search-form" method="GET" action="directory-live.php">
                    <div class="form-group">
                        <label for="search">What are you looking for?</label>
                        <input type="text" id="search" name="q" placeholder="Business name, service, keyword..." value="<?php echo htmlspecialchars($search); ?>">
                    </div>
                    <div class="form-group">
                        <label for="category">Category</label>
                        <select id="category" name="category">
                            <option value="">All Categories</option>
                            <?php foreach ($categories as $key => $cat): ?>
                                <option value="<?php echo $key; ?>" <?php echo $category === $key ? 'selected' : ''; ?>>
                                    <?php echo $cat['name']; ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="location">Location</label>
                        <select id="location" name="location">
                            <option value="">All Areas</option>
                            <?php foreach ($locations as $key => $name): ?>
                                <option value="<?php echo $key; ?>" <?php echo $location === $key ? 'selected' : ''; ?>>
                                    <?php echo $name; ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <button type="submit" class="btn-search">Search</button>
                </form>
            </div>
        </div>
    </section>

    <div class="main-content">
        <!-- Categories Section -->
        <?php if (empty($search) && empty($category) && empty($location)): ?>
        <section class="categories-section">
            <div class="section-header">
                <h2>Browse by Category</h2>
                <p>Explore businesses by what they offer</p>
            </div>
            <div class="categories-grid">
                <?php foreach ($categories as $key => $cat): ?>
                    <a href="?category=<?php echo $key; ?>" class="category-card <?php echo $category === $key ? 'active' : ''; ?>">
                        <div class="category-icon" style="background: <?php echo $cat['color']; ?>20;">
                            <?php echo $cat['icon']; ?>
                        </div>
                        <div class="category-name"><?php echo $cat['name']; ?></div>
                        <div class="category-count"><?php echo ($categoryCounts[$key] ?? 0); ?> businesses</div>
                    </a>
                <?php endforeach; ?>
            </div>
        </section>
        <?php endif; ?>

        <!-- Location Filter Bar -->
        <section class="locations-section">
            <div class="locations-bar">
                <a href="?<?php echo http_build_query(array_merge($_GET, ['location' => ''])); ?>" class="location-chip <?php echo empty($location) ? 'active' : ''; ?>">All Areas</a>
                <?php foreach ($locations as $key => $name): ?>
                    <a href="?<?php echo http_build_query(array_merge($_GET, ['location' => $key])); ?>" class="location-chip <?php echo $location === $key ? 'active' : ''; ?>">
                        <?php echo $name; ?>
                    </a>
                <?php endforeach; ?>
            </div>
        </section>

        <!-- Results Bar -->
        <div class="results-bar">
            <div class="results-count">
                <span><?php echo number_format($totalCount); ?></span> businesses found
                <?php if (!empty($search) || !empty($category) || !empty($location)): ?>
                    <div class="active-filters" style="margin-top: 10px;">
                        <?php if (!empty($search)): ?>
                            <span class="filter-tag">
                                Search: "<?php echo htmlspecialchars($search); ?>"
                                <a href="?<?php echo http_build_query(array_diff_key($_GET, ['q' => ''])); ?>">×</a>
                            </span>
                        <?php endif; ?>
                        <?php if (!empty($category)): ?>
                            <span class="filter-tag">
                                <?php echo $categories[$category]['name'] ?? $category; ?>
                                <a href="?<?php echo http_build_query(array_diff_key($_GET, ['category' => ''])); ?>">×</a>
                            </span>
                        <?php endif; ?>
                        <?php if (!empty($location)): ?>
                            <span class="filter-tag">
                                <?php echo $locations[$location] ?? $location; ?>
                                <a href="?<?php echo http_build_query(array_diff_key($_GET, ['location' => ''])); ?>">×</a>
                            </span>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </div>
            <div>
                <select class="sort-select" onchange="window.location.href='?'+new URLSearchParams({...Object.fromEntries(new URLSearchParams(window.location.search)), sort: this.value}).toString()">
                    <option value="featured" <?php echo $sort === 'featured' ? 'selected' : ''; ?>>Featured First</option>
                    <option value="newest" <?php echo $sort === 'newest' ? 'selected' : ''; ?>>Newest</option>
                    <option value="name" <?php echo $sort === 'name' ? 'selected' : ''; ?>>A-Z</option>
                </select>
            </div>
        </div>

        <!-- Business Listings -->
        <?php if (!empty($businesses)): ?>
            <div class="business-grid">
                <?php foreach ($businesses as $business): ?>
                    <div class="business-card <?php echo strtolower($business['plan_name'] ?? ''); ?>">
                        <div class="business-image">
                            <?php if (!empty($business['photos']) && !empty($business['photos'][0])): ?>
                                <img src="<?php echo htmlspecialchars($business['photos'][0]['thumb_url']); ?>" alt="<?php echo htmlspecialchars($business['business_name']); ?>">
                            <?php else: ?>
                                <?php echo $categories[$business['category']]['icon'] ?? '🏢'; ?>
                            <?php endif; ?>

                            <?php if (!empty($business['plan_name']) && $business['plan_name'] !== 'basic'): ?>
                                <span class="business-badge <?php echo strtolower($business['plan_name']); ?>">
                                    <?php echo ucfirst($business['plan_name']); ?>
                                </span>
                            <?php endif; ?>
                        </div>

                        <div class="business-content">
                            <span class="business-category-tag">
                                <?php echo $categories[$business['category']]['name'] ?? ucfirst($business['category']); ?>
                            </span>

                            <a href="business.php?slug=<?php echo htmlspecialchars($business['slug']); ?>" class="business-name">
                                <?php echo htmlspecialchars($business['business_name']); ?>
                            </a>

                            <div class="business-rating">
                                <span class="stars">★★★★★</span>
                                <span class="rating-text">5.0</span>
                            </div>

                            <?php if (!empty($business['description'])): ?>
                                <p class="business-description">
                                    <?php echo htmlspecialchars($business['description']); ?>
                                </p>
                            <?php endif; ?>

                            <div class="business-meta">
                                <?php if (!empty($business['formatted_phone'])): ?>
                                    <div class="business-meta-item">
                                        <span class="icon">📞</span>
                                        <span><?php echo htmlspecialchars($business['formatted_phone']); ?></span>
                                    </div>
                                <?php endif; ?>

                                <?php if (!empty($business['city'])): ?>
                                    <div class="business-meta-item">
                                        <span class="icon">📍</span>
                                        <span><?php echo htmlspecialchars(ucwords(str_replace('-', ' ', $business['city']))); ?>, SC</span>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <div class="business-footer">
                            <a href="business.php?slug=<?php echo htmlspecialchars($business['slug']); ?>" class="btn-view-business">
                                View Details
                            </a>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>

            <!-- Pagination -->
            <?php if ($totalPages > 1): ?>
                <div class="pagination">
                    <?php if ($page > 1): ?>
                        <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $page - 1])); ?>">← Previous</a>
                    <?php endif; ?>

                    <?php
                    $startPage = max(1, $page - 2);
                    $endPage = min($totalPages, $page + 2);

                    if ($startPage > 1): ?>
                        <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => 1])); ?>">1</a>
                        <?php if ($startPage > 2): ?>
                            <span class="dots">...</span>
                        <?php endif; ?>
                    <?php endif; ?>

                    <?php for ($i = $startPage; $i <= $endPage; $i++): ?>
                        <?php if ($i == $page): ?>
                            <span class="current"><?php echo $i; ?></span>
                        <?php else: ?>
                            <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $i])); ?>"><?php echo $i; ?></a>
                        <?php endif; ?>
                    <?php endfor; ?>

                    <?php if ($endPage < $totalPages): ?>
                        <?php if ($endPage < $totalPages - 1): ?>
                            <span class="dots">...</span>
                        <?php endif; ?>
                        <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $totalPages])); ?>"><?php echo $totalPages; ?></a>
                    <?php endif; ?>

                    <?php if ($page < $totalPages): ?>
                        <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $page + 1])); ?>">Next →</a>
                    <?php endif; ?>
                </div>
            <?php endif; ?>

        <?php else: ?>
            <!-- Empty State -->
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <h3>No businesses found</h3>
                <p>
                    <?php if (!empty($search) || !empty($category) || !empty($location)): ?>
                        Try adjusting your search filters or browse all businesses.
                    <?php else: ?>
                        Be the first to list your business in our directory!
                    <?php endif; ?>
                </p>
                <?php if (!empty($search) || !empty($category) || !empty($location)): ?>
                    <a href="directory-live.php" class="btn-primary">View All Businesses</a>
                <?php else: ?>
                    <a href="directory-signup.php" class="btn-primary">List Your Business</a>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>

    <!-- CTA Section -->
    <section class="cta-section">
        <div class="cta-container">
            <h2>Ready to Grow Your Business?</h2>
            <p>Join the Lowcountry's premier business directory and connect with customers in your community.</p>
            <a href="directory-signup.php" class="btn-cta">List Your Business Today</a>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-content">
            <div>
                <p>© <?php echo date('Y'); ?> <?php echo SITE_NAME; ?> - (843) 212-2969</p>
            </div>
            <div>
                <a href="mailto:andrew@lowcountrybusinessspotlight.com">Contact Us</a>
            </div>
        </div>
    </footer>
</body>
</html>
