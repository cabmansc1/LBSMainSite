<?php
// business-test.php - Individual business detail page (TEST version with improvements)
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

// Separate primary (logo) from gallery photos
$primaryPhoto = null;
$galleryPhotos = [];
foreach ($business['photos'] ?? [] as $p) {
    if ($p['is_primary']) {
        $primaryPhoto = $p;
    } else {
        $galleryPhotos[] = $p;
    }
}
// If no explicit primary, treat first photo as primary
if (!$primaryPhoto && !empty($business['photos'][0])) {
    $primaryPhoto = $business['photos'][0];
}

// Banner photo — reserved for future dedicated banner upload on upgraded listings
$bannerPhoto = null;

// Determine if this is an upgraded listing (featured/priority placement or admin-featured)
$isUpgraded = !empty($business['has_featured_placement']) || !empty($business['has_priority_placement']) || !empty($business['is_featured']);

// Related businesses (same category, excluding current)
$relatedBusinesses = [];
try {
    $relatedResult = $businessObj->getBusinesses(['category' => $business['category']], 1, 4);
    foreach ($relatedResult['businesses'] as $rb) {
        if ($rb['id'] != $business['id'] && count($relatedBusinesses) < 3) {
            $relatedBusinesses[] = $rb;
        }
    }
} catch (Exception $e) {
    // silently skip related businesses
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[TEST] <?= htmlspecialchars($business['business_name']) ?> - <?= SITE_NAME ?></title>
    <meta name="robots" content="noindex, nofollow">
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

        /* Banner Header */
        .banner-header {
            position: relative; max-width: 1200px; margin: 0 auto 0;
            height: 240px; border-radius: 16px 16px 0 0; overflow: hidden;
        }
        .banner-header img {
            width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .banner-overlay {
            position: absolute; inset: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%);
        }
        .banner-fallback {
            width: 100%; height: 100%;
            background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #38b6ff 100%);
        }

        /* Main Layout */
        .main-container { max-width: 1200px; margin: 0 auto; padding: 0 20px 60px; display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }

        /* Business Header Card */
        .biz-header {
            background: white; border-radius: 0 0 12px 12px; padding: 30px; padding-top: 70px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05); margin-bottom: 24px; position: relative;
        }
        .biz-title-row { display: flex; gap: 24px; align-items: flex-start; margin-bottom: 24px; }
        .biz-logo {
            width: 120px; height: 120px; background: white; border-radius: 12px;
            display: flex; align-items: center; justify-content: center; font-size: 48px;
            overflow: hidden; flex-shrink: 0; padding: 8px;
            position: absolute; top: -60px; left: 30px;
            border: 4px solid white; box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .biz-logo img { width: 100%; height: 100%; object-fit: contain; }
        .biz-title-info { flex: 1; }
        .biz-name { font-size: 2rem; font-weight: 800; color: #1e293b; margin-bottom: 6px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        /* Badges */
        .badge-featured {
            display: inline-flex; align-items: center; gap: 4px;
            background: linear-gradient(135deg, #f59e0b, #d97706); color: white;
            padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.5px;
            box-shadow: 0 2px 6px rgba(217,119,6,0.25);
        }
        .badge-verified {
            display: inline-flex; align-items: center; gap: 4px;
            background: linear-gradient(135deg, #10b981, #059669); color: white;
            padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.5px;
            box-shadow: 0 2px 6px rgba(16,185,129,0.25);
        }

        .biz-category { color: #38b6ff; font-weight: 600; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
        .biz-contact-bar { display: flex; gap: 16px; flex-wrap: wrap; }
        .biz-contact-item { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 0.9rem; }
        .biz-contact-item a { color: #64748b; transition: color 0.2s; }
        .biz-contact-item a:hover { color: #38b6ff; }
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
        .photo-item { border-radius: 8px; overflow: hidden; background: #f1f5f9; cursor: pointer; transition: opacity 0.2s; }
        .photo-item:hover { opacity: 0.9; }
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

        /* Lightbox */
        .lightbox-overlay {
            display: none; position: fixed; inset: 0; z-index: 2000;
            background: rgba(0,0,0,0.92); align-items: center; justify-content: center;
        }
        .lightbox-overlay.active { display: flex; }
        .lightbox-img {
            max-width: 90vw; max-height: 85vh; object-fit: contain;
            border-radius: 8px; box-shadow: 0 0 40px rgba(0,0,0,0.5);
        }
        .lightbox-close {
            position: absolute; top: 20px; right: 24px;
            background: none; border: none; color: white; font-size: 2.5rem;
            cursor: pointer; line-height: 1; opacity: 0.8; transition: opacity 0.2s;
        }
        .lightbox-close:hover { opacity: 1; }
        .lightbox-prev, .lightbox-next {
            position: absolute; top: 50%; transform: translateY(-50%);
            background: rgba(255,255,255,0.15); border: none; color: white;
            font-size: 2rem; cursor: pointer; padding: 12px 16px; border-radius: 8px;
            opacity: 0.7; transition: opacity 0.2s, background 0.2s;
        }
        .lightbox-prev:hover, .lightbox-next:hover { opacity: 1; background: rgba(255,255,255,0.25); }
        .lightbox-prev { left: 16px; }
        .lightbox-next { right: 16px; }
        .lightbox-counter {
            position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
            color: rgba(255,255,255,0.7); font-size: 0.9rem; font-weight: 500;
        }

        /* Related Businesses */
        .related-section { max-width: 1200px; margin: 0 auto; padding: 0 20px 60px; }
        .related-section .section-title { font-size: 1.4rem; margin-bottom: 20px; }
        .related-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
        }
        .related-card {
            background: white; border-radius: 12px; overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .related-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.12); }
        .related-card a { text-decoration: none; color: inherit; display: flex; flex-direction: column; }
        .related-card-top { display: flex; padding: 16px 18px; gap: 14px; align-items: flex-start; }
        .related-card-logo {
            width: 70px; height: 70px; background: #f8fafc; border-radius: 10px;
            display: flex; align-items: center; justify-content: center; font-size: 28px;
            flex-shrink: 0; overflow: hidden; border: 1px solid #f1f5f9;
        }
        .related-card-logo img { width: 100%; height: 100%; object-fit: contain; }
        .related-card-info { flex: 1; min-width: 0; }
        .related-card-name {
            font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 3px;
            line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2;
            -webkit-box-orient: vertical; overflow: hidden;
        }
        .related-card-category {
            color: #38b6ff; font-size: 0.75rem; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px;
        }
        .related-card-location {
            display: flex; align-items: center; gap: 4px; font-size: 0.82rem;
            color: #64748b; font-weight: 500;
        }
        .related-card-desc {
            padding: 0 18px 14px; font-size: 0.85rem; color: #64748b; line-height: 1.5;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .related-card-footer {
            padding: 10px 18px; border-top: 1px solid #f1f5f9; margin-top: auto;
            display: flex; align-items: center; justify-content: flex-end;
        }
        .related-card-view {
            font-size: 0.78rem; font-weight: 700; color: #38b6ff;
            display: flex; align-items: center; gap: 3px;
        }

        /* Footer */
        .page-footer { background: #1e293b; color: white; text-align: center; padding: 30px 20px; font-size: 0.9rem; }
        .page-footer a { color: #38b6ff; }
        .page-footer a:hover { text-decoration: underline; }

        @media (max-width: 768px) {
            .banner-header { height: 160px; border-radius: 0; margin-left: -20px; margin-right: -20px; max-width: none; }
            .main-container { grid-template-columns: 1fr; padding: 0 16px 40px; }
            .biz-header { border-radius: 0 0 12px 12px; padding-top: 60px; }
            .biz-logo { width: 100px; height: 100px; top: -50px; left: 16px; }
            .biz-title-row { flex-direction: column; align-items: center; text-align: center; }
            .biz-name { font-size: 1.6rem; justify-content: center; }
            .biz-contact-bar { justify-content: center; }
            .biz-actions { justify-content: center; }
            .related-grid { grid-template-columns: 1fr; }
            .lightbox-prev, .lightbox-next { padding: 8px 12px; font-size: 1.5rem; }
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

    <!-- Banner Header -->
    <div class="banner-header">
        <?php if ($bannerPhoto): ?>
            <img src="<?= htmlspecialchars($bannerPhoto['url']) ?>"
                 alt="<?= htmlspecialchars($bannerPhoto['alt_text'] ?: $business['business_name']) ?>"
                 <?php if (!empty($bannerPhoto['width'])): ?>width="<?= (int)$bannerPhoto['width'] ?>" height="<?= (int)$bannerPhoto['height'] ?>"<?php endif; ?>>
        <?php else: ?>
            <div class="banner-fallback"></div>
        <?php endif; ?>
        <div class="banner-overlay"></div>
    </div>

    <!-- Main Content -->
    <div class="main-container">
        <div class="main-content">
            <!-- Business Header -->
            <div class="biz-header">
                <div class="biz-logo">
                    <?php if ($primaryPhoto): ?>
                        <img src="<?= htmlspecialchars($primaryPhoto['medium_url'] ?? $primaryPhoto['url']) ?>"
                             alt="<?= htmlspecialchars($primaryPhoto['alt_text'] ?: $business['business_name']) ?>"
                             <?php if (!empty($primaryPhoto['medium_width'])): ?>width="<?= (int)$primaryPhoto['medium_width'] ?>" height="<?= (int)$primaryPhoto['medium_height'] ?>"<?php endif; ?>>
                    <?php else: ?>
                        <?= $icon ?>
                    <?php endif; ?>
                </div>
                <div class="biz-title-row">
                    <div class="biz-title-info">
                        <h1 class="biz-name">
                            <?= htmlspecialchars($business['business_name'], ENT_QUOTES, 'UTF-8', false) ?>
                            <?php if ($isUpgraded): ?>
                                <span class="badge-featured">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                    Featured
                                </span>
                            <?php endif; ?>
                            <?php if (!empty($business['is_verified'])): ?>
                                <span class="badge-verified">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    Verified
                                </span>
                            <?php endif; ?>
                        </h1>
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
                                <div class="biz-contact-item">
                                    <span class="biz-contact-icon">📍</span>
                                    <a href="https://www.google.com/maps/search/?api=1&query=<?= urlencode($business['address'] . ($business['city'] ? ', ' . $business['city'] : '') . ($business['state'] ? ', ' . $business['state'] : '') . ($business['zip_code'] ? ' ' . $business['zip_code'] : '')) ?>" target="_blank" rel="noopener noreferrer">
                                        <?= htmlspecialchars($business['address']) ?>
                                    </a>
                                </div>
                            <?php endif; ?>
                            <?php if (!empty($business['formatted_phone'])): ?>
                                <div class="biz-contact-item">
                                    <span class="biz-contact-icon">📞</span>
                                    <a href="tel:<?= htmlspecialchars($business['phone']) ?>">
                                        <?= htmlspecialchars($business['formatted_phone']) ?>
                                    </a>
                                </div>
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
                <?php if ($isUpgraded && (!empty($business['facebook_url']) || !empty($business['instagram_url']) || !empty($business['tiktok_url']) || !empty($business['youtube_url']))): ?>
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
            <?php if (!empty($business['description'])): ?>
                <div class="content-section">
                    <h2 class="section-title">About</h2>
                    <p style="line-height: 1.7; color: #64748b;">
                        <?php if ($isUpgraded && !empty($business['extended_description'])): ?>
                            <?= nl2br(htmlspecialchars($business['extended_description'])) ?>
                        <?php else: ?>
                            <?= nl2br(htmlspecialchars($business['description'])) ?>
                        <?php endif; ?>
                    </p>
                </div>
            <?php endif; ?>

            <!-- Photos -->
            <?php if ($isUpgraded && !empty($galleryPhotos)): ?>
                <div class="content-section">
                    <h2 class="section-title">Photos</h2>
                    <div class="photo-gallery">
                        <?php foreach ($galleryPhotos as $idx => $photo): ?>
                            <div class="photo-item" onclick="openLightbox(<?= $idx ?>)">
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
            <?php if ($isUpgraded && !empty($business['hours']) && !empty($business['show_hours'])): ?>
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

            <?php if (!$isUpgraded && isLoggedIn() && !empty($business['user_id']) && $_SESSION['user_id'] == $business['user_id']): ?>
            <!-- Upgrade CTA for business owner -->
            <div class="content-section upgrade-cta-box" style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 2px dashed #38b6ff; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 12px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <h3 style="font-size: 1.2rem; font-weight: 700; color: #0c4a6e; margin-bottom: 8px;">Upgrade This Listing</h3>
                <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; margin-bottom: 16px;">
                    Show hours, photos, special offers, social links &amp; more &mdash; <strong>$75/year</strong>
                </p>
                <ul style="list-style: none; text-align: left; max-width: 320px; margin: 0 auto 20px; font-size: 0.9rem; color: #334155;">
                    <li style="padding: 5px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="color: #10b981; font-weight: bold;">&#10003;</span> Featured badge &amp; priority placement
                    </li>
                    <li style="padding: 5px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="color: #10b981; font-weight: bold;">&#10003;</span> Up to 8 gallery photos
                    </li>
                    <li style="padding: 5px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="color: #10b981; font-weight: bold;">&#10003;</span> Business hours &amp; description
                    </li>
                    <li style="padding: 5px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="color: #10b981; font-weight: bold;">&#10003;</span> Special offers &amp; coupons
                    </li>
                    <li style="padding: 5px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="color: #10b981; font-weight: bold;">&#10003;</span> Social media links
                    </li>
                    <li style="padding: 5px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="color: #10b981; font-weight: bold;">&#10003;</span> Analytics dashboard
                    </li>
                </ul>
                <a href="/register.php?plan=upgraded" class="btn-action" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); padding: 12px 28px; font-weight: 700; border-radius: 8px; color: white;">Upgrade for $75/year</a>
            </div>
            <?php endif; ?>
        </div>

        <!-- Sidebar -->
        <div class="sidebar">
            <!-- Special Offers -->
            <?php if ($isUpgraded && !empty($business['offers'])): ?>
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

    <!-- Related Businesses -->
    <?php if (!empty($relatedBusinesses)): ?>
    <div class="related-section">
        <h2 class="section-title">More <?= htmlspecialchars($catLabel) ?> Businesses</h2>
        <div class="related-grid">
            <?php foreach ($relatedBusinesses as $rb):
                $rbThumbUrl = '';
                $rbThumbAlt = $rb['business_name'];
                if (!empty($rb['photos'][0])) {
                    $rbThumbUrl = $rb['photos'][0]['medium_url'] ?? $rb['photos'][0]['url'];
                    $rbThumbAlt = $rb['photos'][0]['alt_text'] ?: $rb['business_name'];
                }
                $rbIcon = $icons[$rb['category']] ?? '🏢';
                $rbCityState = '';
                if (!empty($rb['city'])) {
                    $rbCityState = $rb['city'];
                    if (!empty($rb['state'])) $rbCityState .= ', ' . $rb['state'];
                }
            ?>
            <div class="related-card">
                <a href="<?= htmlspecialchars(businessUrl($rb['slug'])) ?>">
                    <div class="related-card-top">
                        <div class="related-card-logo">
                            <?php if ($rbThumbUrl): ?>
                                <img src="<?= htmlspecialchars($rbThumbUrl) ?>"
                                     alt="<?= htmlspecialchars($rbThumbAlt) ?>"
                                     width="70" height="70" loading="lazy">
                            <?php else: ?>
                                <?= $rbIcon ?>
                            <?php endif; ?>
                        </div>
                        <div class="related-card-info">
                            <div class="related-card-name"><?= htmlspecialchars($rb['business_name']) ?></div>
                            <div class="related-card-category"><?= htmlspecialchars($catLabel) ?></div>
                            <?php if ($rbCityState): ?>
                                <div class="related-card-location">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                    <?= htmlspecialchars($rbCityState) ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php if (!empty($rb['description'])): ?>
                        <div class="related-card-desc"><?= htmlspecialchars($rb['description']) ?></div>
                    <?php endif; ?>
                    <div class="related-card-footer">
                        <span class="related-card-view">
                            View Details
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                        </span>
                    </div>
                </a>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

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

    <!-- Lightbox Overlay -->
    <div class="lightbox-overlay" id="lightbox">
        <button class="lightbox-close" onclick="closeLightbox()" aria-label="Close">&times;</button>
        <button class="lightbox-prev" onclick="lightboxNav(-1)" aria-label="Previous">&#8249;</button>
        <img class="lightbox-img" id="lightbox-img" src="" alt="">
        <button class="lightbox-next" onclick="lightboxNav(1)" aria-label="Next">&#8250;</button>
        <div class="lightbox-counter" id="lightbox-counter"></div>
    </div>

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

    <!-- Lightbox JS -->
    <script>
    (function() {
        var photos = <?= json_encode(array_values(array_map(function($p) use ($business) {
            return [
                'url' => $p['url'],
                'alt' => $p['alt_text'] ?: $business['business_name']
            ];
        }, $galleryPhotos)), JSON_UNESCAPED_SLASHES) ?>;
        var currentIndex = 0;
        var overlay = document.getElementById('lightbox');
        var img = document.getElementById('lightbox-img');
        var counter = document.getElementById('lightbox-counter');

        window.openLightbox = function(idx) {
            if (!photos.length) return;
            currentIndex = idx;
            showPhoto();
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        window.closeLightbox = function() {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        };

        window.lightboxNav = function(dir) {
            currentIndex = (currentIndex + dir + photos.length) % photos.length;
            showPhoto();
        };

        function showPhoto() {
            img.src = photos[currentIndex].url;
            img.alt = photos[currentIndex].alt;
            counter.textContent = (currentIndex + 1) + ' / ' + photos.length;
        }

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeLightbox();
        });

        document.addEventListener('keydown', function(e) {
            if (!overlay.classList.contains('active')) return;
            if (e.key === 'Escape') closeLightbox();
            else if (e.key === 'ArrowLeft') lightboxNav(-1);
            else if (e.key === 'ArrowRight') lightboxNav(1);
        });
    })();
    </script>

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
