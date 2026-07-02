<?php
// business.php - Individual business detail page
require_once 'config.php';
require_once 'Business.php';

$businessObj = new Business();

// Get business by slug
$slug = sanitizeInput($_GET['slug'] ?? '');
if (empty($slug)) {
    header('Location: /directory/');
    exit;
}

$business = $businessObj->getBusiness($slug, true);
if (!$business) {
    header('Location: /directory/');
    exit;
}

// Handle contact form submission
$success = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['contact_form'])) {
    try {
        $contactData = [
            'name' => sanitizeInput($_POST['name']),
            'email' => sanitizeInput($_POST['email']),
            'phone' => sanitizeInput($_POST['phone']),
            'message' => sanitizeInput($_POST['message'])
        ];

        if (empty($contactData['name']) || empty($contactData['message'])) {
            throw new Exception('Name and message are required');
        }

        if (empty($contactData['email']) && empty($contactData['phone'])) {
            throw new Exception('Please provide either an email or phone number');
        }

        if ($businessObj->recordInquiry($business['id'], $contactData)) {
            $success = 'Your message has been sent successfully!';
        }

    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

$catLabel = getCategories()[$business['category']] ?? ucwords(str_replace('-', ' ', $business['category']));
$icons = ['restaurant' => '🍽️', 'home-garden' => '🏡', 'automotive' => '🚗', 'health-wellness' => '💊', 'beauty' => '💇', 'retail' => '🏪', 'services' => '💼', 'fitness-recreation' => '🏋️', 'legal' => '⚖️', 'other' => '🏢'];
$icon = $icons[$business['category']] ?? '🏢';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($business['business_name']) ?> - <?= SITE_NAME ?></title>
    <meta name="description" content="<?= htmlspecialchars($business['business_name']) ?> - <?= htmlspecialchars($catLabel) ?> in the Charleston Lowcountry area. View details, hours, and contact information.">
    <link rel="canonical" href="<?= htmlspecialchars(businessUrl($business['slug'])) ?>">

    <?php
    // Pick the best OG image — prefer a larger non-primary photo, fall back to primary
    $ogPhoto = null;
    foreach ($business['photos'] ?? [] as $p) {
        if (!$p['is_primary']) { $ogPhoto = $p; break; }
    }
    if (!$ogPhoto && !empty($business['photos'][0])) $ogPhoto = $business['photos'][0];
    $ogDesc = htmlspecialchars($business['description'] ?? ($business['business_name'] . ' - ' . $catLabel));
    ?>

    <!-- Open Graph -->
    <meta property="og:title" content="<?= htmlspecialchars($business['business_name']) ?> - <?= SITE_NAME ?>">
    <meta property="og:description" content="<?= $ogDesc ?>">
    <meta property="og:url" content="<?= htmlspecialchars(businessUrl($business['slug'])) ?>">
    <meta property="og:type" content="business.business">
    <meta property="og:site_name" content="<?= SITE_NAME ?>">
    <?php if ($ogPhoto): ?>
    <meta property="og:image" content="<?= htmlspecialchars($ogPhoto['url']) ?>">
    <?php if (!empty($ogPhoto['width'])): ?>
    <meta property="og:image:width" content="<?= (int)$ogPhoto['width'] ?>">
    <meta property="og:image:height" content="<?= (int)$ogPhoto['height'] ?>">
    <?php endif; ?>
    <meta property="og:image:alt" content="<?= htmlspecialchars($ogPhoto['alt_text'] ?: $business['business_name']) ?>">
    <?php endif; ?>

    <!-- Twitter Card -->
    <meta name="twitter:card" content="<?= ($ogPhoto && !empty($ogPhoto['width']) && $ogPhoto['width'] >= 600) ? 'summary_large_image' : 'summary' ?>">
    <meta name="twitter:title" content="<?= htmlspecialchars($business['business_name']) ?>">
    <meta name="twitter:description" content="<?= $ogDesc ?>">
    <?php if ($ogPhoto): ?>
    <meta name="twitter:image" content="<?= htmlspecialchars($ogPhoto['url']) ?>">
    <meta name="twitter:image:alt" content="<?= htmlspecialchars($ogPhoto['alt_text'] ?: $business['business_name']) ?>">
    <?php endif; ?>

    <?php
    // JSON-LD LocalBusiness Schema
    $schemaTypeMap = [
        'restaurant' => 'Restaurant',
        'automotive' => 'AutoRepair',
        'health-wellness' => 'HealthAndBeautyBusiness',
        'beauty' => 'BeautySalon',
        'legal' => 'LegalService',
        'fitness-recreation' => 'SportsActivityLocation',
    ];
    $schemaType = $schemaTypeMap[$business['category']] ?? 'LocalBusiness';

    $localBusiness = [
        '@context' => 'https://schema.org',
        '@type' => $schemaType,
        'name' => $business['business_name'],
        'url' => businessUrl($business['slug']),
    ];
    if (!empty($business['description'])) $localBusiness['description'] = $business['description'];
    if (!empty($business['phone'])) $localBusiness['telephone'] = $business['phone'];
    if (!empty($business['email'])) $localBusiness['email'] = $business['email'];

    // sameAs: website + social profiles
    $sameAs = [];
    if (!empty($business['website'])) $sameAs[] = $business['website'];
    if (!empty($business['facebook_url'])) $sameAs[] = $business['facebook_url'];
    if (!empty($business['instagram_url'])) $sameAs[] = $business['instagram_url'];
    if (!empty($business['tiktok_url'])) $sameAs[] = $business['tiktok_url'];
    if (!empty($business['youtube_url'])) $sameAs[] = $business['youtube_url'];
    if ($sameAs) $localBusiness['sameAs'] = $sameAs;

    // Include all photos in schema
    $schemaImages = [];
    foreach ($business['photos'] ?? [] as $p) {
        $schemaImages[] = $p['url'];
    }
    if ($schemaImages) $localBusiness['image'] = count($schemaImages) === 1 ? $schemaImages[0] : $schemaImages;

    if (!empty($business['address'])) {
        $localBusiness['address'] = [
            '@type' => 'PostalAddress',
            'streetAddress' => $business['address'],
            'addressLocality' => $business['city'] ?? '',
            'addressRegion' => $business['state'] ?? 'SC',
            'postalCode' => $business['zip_code'] ?? '',
        ];
    }

    if (!empty($business['lat']) && !empty($business['lng'])) {
        $localBusiness['geo'] = [
            '@type' => 'GeoCoordinates',
            'latitude' => (float)$business['lat'],
            'longitude' => (float)$business['lng'],
        ];
    }

    // Opening hours
    if (!empty($business['hours']) && !empty($business['show_hours'])) {
        $dayMap = ['Su','Mo','Tu','We','Th','Fr','Sa'];
        $hoursSpec = [];
        foreach ($business['hours'] as $h) {
            if (!$h['is_closed'] && !empty($h['open_time']) && !empty($h['close_time'])) {
                $hoursSpec[] = $dayMap[$h['day_number']] . ' ' . substr($h['open_time'], 0, 5) . '-' . substr($h['close_time'], 0, 5);
            }
        }
        if ($hoursSpec) $localBusiness['openingHours'] = $hoursSpec;
    }

    // BreadcrumbList schema
    $breadcrumbSchema = [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Directory', 'item' => directoryUrl()],
            ['@type' => 'ListItem', 'position' => 2, 'name' => $catLabel, 'item' => categoryUrl($business['category'])],
            ['@type' => 'ListItem', 'position' => 3, 'name' => $business['business_name']],
        ]
    ];
    ?>
    <script type="application/ld+json"><?= json_encode($localBusiness, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) ?></script>
    <script type="application/ld+json"><?= json_encode($breadcrumbSchema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) ?></script>

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

    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; }
        a { text-decoration: none; }

        /* Logo Header */
        .logo-header { background: #000; padding: 15px 0; border-bottom: 1px solid #222; text-align: center; }
        .brand-wordmark a { text-decoration: none; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 800; letter-spacing: -0.5px; }
        .lowcountry, .spotlight { color: #38b6ff; }
        .business-word { color: white; margin: 0 8px; }

        /* Breadcrumb */
        .breadcrumb { max-width: 1200px; margin: 0 auto; padding: 16px 20px; font-size: 0.9rem; }
        .breadcrumb a { color: #38b6ff; font-weight: 500; }
        .breadcrumb span { color: #94a3b8; margin: 0 6px; }

        /* Main Layout */
        .main-container { max-width: 1200px; margin: 0 auto; padding: 0 20px 60px; display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }

        /* Business Header Card */
        .biz-header { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); margin-bottom: 24px; }
        .biz-title-row { display: flex; gap: 24px; align-items: flex-start; margin-bottom: 24px; }
        .biz-logo { width: 160px; height: 160px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 48px; overflow: hidden; flex-shrink: 0; padding: 8px; }
        .biz-logo img { width: 100%; height: 100%; object-fit: contain; }
        .biz-title-info { flex: 1; }
        .biz-name { font-size: 2rem; font-weight: 800; color: #1e293b; margin-bottom: 6px; }
        .biz-category { color: #38b6ff; font-weight: 600; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
        .biz-contact-bar { display: flex; gap: 16px; flex-wrap: wrap; }
        .biz-contact-item { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 0.9rem; }
        .biz-contact-icon { color: #38b6ff; }
        .biz-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn-action { background: #38b6ff; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; display: inline-block; transition: all 0.2s; }
        .btn-action:hover { background: #0ea5e9; transform: translateY(-1px); color: white; }
        .btn-secondary { background: #64748b; }
        .btn-secondary:hover { background: #475569; }

        /* Social Media Icons */
        .social-links { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
        .social-link { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 8px; background: #f1f5f9; transition: all 0.2s; }
        .social-link:hover { background: #38b6ff; }
        .social-link svg { width: 20px; height: 20px; fill: #38b6ff; transition: fill 0.2s; }
        .social-link:hover svg { fill: white; }

        /* Content Sections */
        .content-section { background: white; border-radius: 12px; padding: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); margin-bottom: 24px; }
        .section-title { font-size: 1.3rem; font-weight: 700; color: #1e293b; margin-bottom: 16px; }

        .photo-gallery { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .photo-item { border-radius: 8px; overflow: hidden; background: #f1f5f9; }
        .photo-item img { width: 100%; height: auto; display: block; }

        .hours-table { width: 100%; border-collapse: collapse; }
        .hours-table th, .hours-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; }
        .hours-table th { font-weight: 600; color: #1e293b; background: #f8fafc; }
        .hours-closed { color: #ef4444; }

        /* Sidebar */
        .sidebar { display: flex; flex-direction: column; gap: 24px; }
        .sidebar-section { background: white; border-radius: 12px; padding: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }

        /* Contact Form */
        .contact-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { font-weight: 600; margin-bottom: 6px; color: #1e293b; font-size: 0.9rem; }
        .form-group input, .form-group textarea {
            padding: 10px 12px; border: 2px solid #e2e8f0; border-radius: 8px;
            font-size: 15px; font-family: inherit; transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #38b6ff; }
        .form-group textarea { resize: vertical; min-height: 90px; }

        .special-offer { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px dashed #f59e0b; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 12px; }
        .offer-title { font-weight: 700; color: #92400e; margin-bottom: 6px; }
        .offer-text { color: #b45309; font-weight: 600; }

        .alert { padding: 12px; border-radius: 8px; margin-bottom: 16px; font-weight: 500; font-size: 0.95rem; }
        .alert.success { background: #d1fae5; border: 1px solid #10b981; color: #065f46; }
        .alert.error { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        /* Claim Listing */
        .claim-listing-box { background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 2px dashed #38b6ff; border-radius: 12px; padding: 20px; }
        .btn-claim { background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; padding: 12px; font-weight: 700; color: white; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; }
        .btn-claim:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16,185,129,0.3); }

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
            .main-container { grid-template-columns: 1fr; padding: 0 16px 40px; }
            .biz-title-row { flex-direction: column; align-items: center; text-align: center; }
            .biz-name { font-size: 1.6rem; }
            .biz-contact-bar { justify-content: center; }
            .biz-actions { justify-content: center; }
        }
    </style>
</head>
<body>
    <!-- GTM noscript -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5ZP4TT23"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

    <!-- Logo Header -->
    <div class="logo-header">
        <h1 class="brand-wordmark">
            <a href="index.php">
                <span class="lowcountry">Lowcountry</span>
                <span class="business-word">Business</span>
                <span class="spotlight">Spotlight</span>
            </a>
        </h1>
    </div>

    <?php include 'nav.php'; ?>

    <!-- Breadcrumb -->
    <div class="breadcrumb">
        <a href="/directory/">Directory</a>
        <span>›</span>
        <a href="<?= htmlspecialchars(categoryUrl($business['category'])) ?>"><?= htmlspecialchars($catLabel) ?></a>
        <span>›</span>
        <?= htmlspecialchars($business['business_name']) ?>
    </div>

    <!-- Main Content -->
    <div class="main-container">
        <div class="main-content">
            <!-- Business Header -->
            <div class="biz-header">
                <div class="biz-title-row">
                    <div class="biz-logo">
                        <?php if (!empty($business['photos']) && !empty($business['photos'][0])): ?>
                            <img src="<?= htmlspecialchars($business['photos'][0]['thumb_url'] ?? $business['photos'][0]['url']) ?>"
                                 alt="<?= htmlspecialchars($business['photos'][0]['alt_text'] ?: $business['business_name']) ?>"
                                 width="150" height="150">
                        <?php else: ?>
                            <?= $icon ?>
                        <?php endif; ?>
                    </div>
                    <div class="biz-title-info">
                        <h1 class="biz-name"><?= htmlspecialchars($business['business_name'], ENT_QUOTES, 'UTF-8', false) ?></h1>
                        <div class="biz-category"><?= htmlspecialchars($catLabel) ?></div>
                        <?php if (!empty($business['tags'])): ?>
                        <div class="biz-tags" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
                            <?php foreach ($business['tags'] as $tag): ?>
                                <a href="<?= htmlspecialchars(tagUrl($tag['slug'])) ?>" class="tag-pill" style="display:inline-block; padding:3px 10px; border-radius:12px; font-size:0.78rem; font-weight:600; background:#e0f2fe; color:#0369a1; text-decoration:none; transition:background 0.2s;">
                                    <?= htmlspecialchars($tag['display_name']) ?>
                                </a>
                            <?php endforeach; ?>
                        </div>
                        <?php endif; ?>
                        <div class="biz-contact-bar">
                            <?php if ($business['address']): ?>
                                <div class="biz-contact-item"><span class="biz-contact-icon">📍</span> <?= htmlspecialchars($business['address']) ?></div>
                            <?php endif; ?>
                            <?php if (!empty($business['formatted_phone'])): ?>
                                <div class="biz-contact-item"><span class="biz-contact-icon">📞</span> <?= htmlspecialchars($business['formatted_phone']) ?></div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                <div class="biz-actions">
                    <?php if ($business['phone']): ?>
                        <a href="tel:<?= htmlspecialchars($business['phone']) ?>" class="btn-action">Call Now</a>
                    <?php endif; ?>
                    <?php if ($business['website']): ?>
                        <a href="<?= htmlspecialchars($business['website']) ?>" target="_blank" class="btn-action btn-secondary">Visit Website</a>
                    <?php endif; ?>
                </div>
                <?php if (!empty($business['facebook_url']) || !empty($business['instagram_url']) || !empty($business['tiktok_url']) || !empty($business['youtube_url'])): ?>
                <div class="social-links">
                    <?php if (!empty($business['facebook_url'])): ?>
                        <a href="<?= htmlspecialchars($business['facebook_url']) ?>" target="_blank" rel="noopener noreferrer" class="social-link" title="Facebook">
                            <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                    <?php endif; ?>
                    <?php if (!empty($business['instagram_url'])): ?>
                        <a href="<?= htmlspecialchars($business['instagram_url']) ?>" target="_blank" rel="noopener noreferrer" class="social-link" title="Instagram">
                            <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                        </a>
                    <?php endif; ?>
                    <?php if (!empty($business['tiktok_url'])): ?>
                        <a href="<?= htmlspecialchars($business['tiktok_url']) ?>" target="_blank" rel="noopener noreferrer" class="social-link" title="TikTok">
                            <svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                        </a>
                    <?php endif; ?>
                    <?php if (!empty($business['youtube_url'])): ?>
                        <a href="<?= htmlspecialchars($business['youtube_url']) ?>" target="_blank" rel="noopener noreferrer" class="social-link" title="YouTube">
                            <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        </a>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
            </div>

            <!-- Description -->
            <?php if (!empty($business['description']) || !empty($business['extended_description'])): ?>
                <div class="content-section">
                    <h2 class="section-title">About</h2>
                    <p style="line-height: 1.7; color: #64748b;">
                        <?= nl2br(htmlspecialchars($business['extended_description'] ?: $business['description'])) ?>
                    </p>
                </div>
            <?php endif; ?>

            <!-- Photos -->
            <?php
                $galleryPhotos = array_filter($business['photos'] ?? [], function($p) { return !$p['is_primary']; });
            ?>
            <?php if (!empty($galleryPhotos)): ?>
                <div class="content-section">
                    <h2 class="section-title">Photos</h2>
                    <div class="photo-gallery">
                        <?php foreach ($galleryPhotos as $photo): ?>
                            <div class="photo-item">
                                <img src="<?= htmlspecialchars($photo['medium_url'] ?? $photo['url']) ?>"
                                     alt="<?= htmlspecialchars($photo['alt_text'] ?: $business['business_name']) ?>"
                                     <?php if (!empty($photo['medium_width'])): ?>width="<?= (int)$photo['medium_width'] ?>" height="<?= (int)$photo['medium_height'] ?>"<?php endif; ?>
                                     loading="lazy">
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endif; ?>

            <!-- Hours -->
            <?php if (!empty($business['hours']) && !empty($business['show_hours'])): ?>
                <div class="content-section">
                    <h2 class="section-title">Hours</h2>
                    <table class="hours-table">
                        <?php foreach ($business['hours'] as $dayHours): ?>
                            <tr>
                                <th><?= $dayHours['day'] ?></th>
                                <td>
                                    <?php if ($dayHours['is_closed']): ?>
                                        <span class="hours-closed">Closed</span>
                                    <?php else: ?>
                                        <?= date('g:i A', strtotime($dayHours['open_time'])) ?> -
                                        <?= date('g:i A', strtotime($dayHours['close_time'])) ?>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </table>
                </div>
            <?php endif; ?>
        </div>

        <!-- Sidebar -->
        <div class="sidebar">
            <!-- Special Offers -->
            <?php if (!empty($business['offers'])): ?>
                <div class="sidebar-section">
                    <h3 class="section-title">Special Offers</h3>
                    <?php foreach ($business['offers'] as $offer): ?>
                        <div class="special-offer">
                            <div class="offer-title"><?= htmlspecialchars($offer['title']) ?></div>
                            <div class="offer-text"><?= htmlspecialchars($offer['description']) ?></div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <!-- Location Map -->
            <?php if (!empty($business['lat']) && !empty($business['lng'])): ?>
            <div class="sidebar-section">
                <h3 class="section-title">Location</h3>
                <div id="business-map" style="height: 250px; border-radius: 8px; overflow: hidden;"></div>
            </div>
            <?php endif; ?>

            <!-- Contact Form -->
            <div class="sidebar-section">
                <h3 class="section-title">Contact Business</h3>

                <?php if ($success): ?>
                    <div class="alert success"><?= htmlspecialchars($success) ?></div>
                <?php endif; ?>

                <?php if ($error): ?>
                    <div class="alert error"><?= htmlspecialchars($error) ?></div>
                <?php endif; ?>

                <form method="POST" class="contact-form">
                    <input type="hidden" name="contact_form" value="1">

                    <div class="form-group">
                        <label for="name">Your Name *</label>
                        <input type="text" id="name" name="name" required>
                    </div>

                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email">
                    </div>

                    <div class="form-group">
                        <label for="phone">Phone</label>
                        <input type="tel" id="phone" name="phone">
                    </div>

                    <div class="form-group">
                        <label for="message">Message *</label>
                        <textarea id="message" name="message" required
                                  placeholder="Tell them what you're interested in..."></textarea>
                    </div>

                    <button type="submit" class="btn-action" style="width: 100%; text-align: center; cursor: pointer;">Send Message</button>
                </form>
            </div>

            <!-- Claim This Listing -->
            <?php if (empty($business['user_id'])): ?>
            <div class="sidebar-section claim-listing-box">
                <h3 class="section-title">Is this your business?</h3>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 16px;">Claim this listing to update your info, add photos, respond to inquiries, and more.</p>
                <a href="/register.php?claim=<?= (int)$business['id'] ?>&plan=basic" class="btn-action btn-claim" style="width: 100%; text-align: center; display: block;">Claim This Listing</a>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Sticky CTA Bar (non-logged-in visitors only) -->
    <?php if (!isLoggedIn()): ?>
    <div id="sticky-cta" class="sticky-cta" style="display:none;">
        <div class="sticky-cta-inner">
            <span class="sticky-cta-text">Own a local business? <strong>Get listed free</strong> in the Lowcountry's premier directory.</span>
            <a href="/register.php?plan=basic" class="sticky-cta-btn">Get Listed</a>
            <button class="sticky-cta-close" onclick="document.getElementById('sticky-cta').style.display='none'" aria-label="Close">&times;</button>
        </div>
    </div>
    <?php endif; ?>

    <?php if (!empty($business['lat']) && !empty($business['lng'])): ?>
    <script>
    function initBusinessMap() {
        var pos = {lat: <?= (float)$business['lat'] ?>, lng: <?= (float)$business['lng'] ?>};
        var map = new google.maps.Map(document.getElementById('business-map'), {
            center: pos,
            zoom: 15,
            styles: [{featureType: 'poi', stylers: [{visibility: 'off'}]}]
        });
        new google.maps.Marker({position: pos, map: map, title: <?= json_encode($business['business_name']) ?>});
    }
    </script>
    <script async defer src="https://maps.googleapis.com/maps/api/js?key=<?= GOOGLE_MAPS_API_KEY ?>&callback=initBusinessMap"></script>
    <?php endif; ?>

    <?php include 'footer.php'; ?>

    <?php if (!isLoggedIn()): ?>
    <script>
    (function() {
        var bar = document.getElementById('sticky-cta');
        if (!bar) return;
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) bar.style.display = '';
        }, {once: true});
    })();
    </script>
    <?php endif; ?>
</body>
</html>
