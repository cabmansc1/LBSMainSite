<?php
require_once 'config.php';
// Load homepage stats
$_homeStats = [];
try {
    $db = getDB();
    $db->exec("CREATE TABLE IF NOT EXISTS site_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stat_key VARCHAR(50) NOT NULL UNIQUE,
        stat_value VARCHAR(100) NOT NULL DEFAULT '',
        stat_label VARCHAR(100) NOT NULL DEFAULT '',
        stat_icon VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
        display_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    // Seed defaults if table is empty
    $statCount = (int)$db->query("SELECT COUNT(*) FROM site_stats")->fetchColumn();
    if ($statCount === 0) {
        $defaults = [
            ['postcards_mailed', '50,000+', 'Postcards Mailed', '&#x1F4EC;', 1],
            ['businesses_served', '75+', 'Local Businesses Served', '&#x1F3E2;', 2],
            ['households_reached', '5,000+', 'Households Per Mailing', '&#x1F3E0;', 3],
            ['service_areas', '6', 'Service Areas', '&#x1F4CD;', 4],
        ];
        $ins = $db->prepare("INSERT INTO site_stats (stat_key, stat_value, stat_label, stat_icon, display_order, is_active) VALUES (?, ?, ?, ?, ?, 1)");
        foreach ($defaults as $row) { $ins->execute($row); }
    }
    $_homeStats = $db->query("SELECT stat_value, stat_label, stat_icon FROM site_stats WHERE is_active = 1 ORDER BY display_order ASC")->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    // Stats bar will simply not render
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-38313KT3XE"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-38313KT3XE');
    gtag('config', 'AW-18077746446');
  </script>

  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-5ZP4TT23');</script>
  <!-- End Google Tag Manager -->
  
  <!-- Meta Pixel Code -->
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
<!-- End Meta Pixel Code -->

  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#38b6ff">
  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://www.googletagmanager.com">
  <title>Lowcountry Business Spotlight - Direct Mail Marketing</title>
  <meta name="description" content="Reach thousands of households in Charleston, Summerville, Mount Pleasant & Daniel Island with billboard-style direct mail marketing. Exclusive category placement, free ad design, starting at $99.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://www.lowcountrybusinessspotlight.com/">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.lowcountrybusinessspotlight.com/">
  <meta property="og:title" content="Lowcountry Business Spotlight - Direct Mail Marketing">
  <meta property="og:description" content="Reach thousands of households in Charleston, Summerville, Mount Pleasant & Daniel Island with billboard-style direct mail marketing. Exclusive category placement, free ad design.">
  <meta property="og:image" content="https://www.lowcountrybusinessspotlight.com/images/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Lowcountry Business Spotlight - Direct Mail Marketing">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://www.lowcountrybusinessspotlight.com/">
  <meta name="twitter:title" content="Lowcountry Business Spotlight - Direct Mail Marketing">
  <meta name="twitter:description" content="Reach thousands of households in Charleston, Summerville, Mount Pleasant & Daniel Island with billboard-style direct mail marketing.">
  <meta name="twitter:image" content="https://www.lowcountrybusinessspotlight.com/images/og-image.jpg">
  <meta name="twitter:image:alt" content="Lowcountry Business Spotlight - Direct Mail Marketing">

  <!-- Organization Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Lowcountry Business Spotlight",
    "url": "https://www.lowcountrybusinessspotlight.com",
    "logo": "https://www.lowcountrybusinessspotlight.com/images/lbs_logo.png",
    "description": "Billboard-style direct mail marketing reaching thousands of households across the Charleston Lowcountry area.",
    "areaServed": {
      "@type": "State",
      "name": "South Carolina"
    },
    "sameAs": []
  }
  </script>

  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Shadows+Into+Light+Two&display=swap" rel="stylesheet">

  <style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #ffffff;
    overflow-x: hidden;
  }

  /* ===== HERO SECTION ===== */
  .hero {
    background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
    display: flex;
    align-items: center;
    position: relative;
    overflow: hidden;
    padding: 60px 0;
  }

  .hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.05)"/><circle cx="80" cy="40" r="1" fill="rgba(255,255,255,0.03)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.04)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.3;
  }

  .hero-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 40px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
    position: relative;
    z-index: 2;
  }

  .hero-content h1 {
    font-size: clamp(2.5rem, 5vw, 4rem);
    font-weight: 800;
    color: white;
    line-height: 1.1;
    margin-bottom: 30px;
  }

  .hero-content .highlight-text {
    color: #000000;
    font-weight: 900;
  }

  .hero-content p {
    font-size: 1.3rem;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 40px;
    font-weight: 400;
    line-height: 1.6;
  }

  .hero-visual {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .postcard-showcase {
    position: relative;
    width: 100%;
    max-width: 800px;
  }

  .carousel {
    position: relative;
    width: 100%;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  }

  .carousel-image {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    width: 100%;
    height: auto;
    transition: opacity 1s ease-in-out;
  }

  .carousel-image.active {
    opacity: 1;
    position: relative;
  }

  .cta-hero {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }

  .hero-contact {
    margin-top: 25px;
    color: white;
    font-size: 1.75rem;
    font-weight: 700;
  }

  .hero-contact .highlight-mailing {
    color: white;
  }

  .hero-contact a {
    color: white;
    text-decoration: none;
    transition: opacity 0.3s ease;
  }

  .hero-contact a:hover {
    opacity: 0.9;
    text-decoration: underline;
  }

  .btn-primary {
    background: linear-gradient(135deg, #ff8c00, #ff6b00);
    color: white;
    padding: 18px 35px;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 700;
    font-size: 18px;
    box-shadow: 0 8px 25px rgba(234, 88, 12, 0.4);
    transition: all 0.3s ease;
    border: none;
    cursor: pointer;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(234, 88, 12, 0.5);
    background: linear-gradient(135deg, #e07800, #e05500);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    padding: 18px 35px;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 600;
    font-size: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
  }

  /* ===== STATS BAR ===== */
  .stats-bar {
    background: #f8fafc;
    padding: 20px 40px;
    border-bottom: 1px solid #e2e8f0;
  }
  .stats-bar-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    gap: 48px;
    flex-wrap: wrap;
  }
  .stat-item {
    text-align: center;
  }
  .stat-item .stat-icon {
    font-size: 1rem;
    display: block;
    margin-bottom: 2px;
  }
  .stat-item .stat-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
  }
  .stat-item .stat-label {
    font-size: 0.7rem;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-top: 2px;
  }

  @media (max-width: 768px) {
    .stats-bar { padding: 12px 16px; }
    .stats-bar-inner { gap: 16px 32px; }
  }

  /* ===== SECTION STYLES ===== */
  .section {
    padding: 100px 0;
  }

  .section.light {
    background: #f8fafc;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 40px;
  }

  .section-header {
    text-align: center;
    margin-bottom: 60px;
  }

  .section-header h2 {
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 800;
    color: #000000;
    margin-bottom: 20px;
  }

  .section-header p {
    font-size: 1.2rem;
    color: #64748b;
    max-width: 600px;
    margin: 0 auto;
  }

  /* ===== BENEFITS GRID ===== */
  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 40px;
    margin-bottom: 60px;
  }

  .benefit-card {
    background: white;
    padding: 40px 30px;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    transition: all 0.25s ease;
    border: 2px solid #e2e8f0;
  }

  .benefit-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(56,182,255,.12);
    border-color: #38b6ff;
  }

  .benefit-icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #ff8c00, #ff6b00);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 25px;
    font-size: 32px;
    color: white;
    box-shadow: 0 4px 12px rgba(255,140,0,.25);
  }

  .benefit-card h3 {
    font-size: 1.4rem;
    font-weight: 700;
    color: #000000;
    margin-bottom: 15px;
  }

  .benefit-card p {
    color: #64748b;
    font-size: 1rem;
    line-height: 1.6;
  }

  /* ===== SERVICES SECTION ===== */
  .services-section {
    background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
  }

  .services-section h2 {
    color: white;
  }

  .services-section p {
    color: rgba(255, 255, 255, 0.9);
  }

  /* ===== SERVICES GRID ===== */
  .services-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 30px;
    max-width: 1000px;
    margin: 0 auto;
  }

  .service-card {
    grid-column: span 2;
    background: white;
    padding: 35px;
    border-radius: 14px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    transition: all 0.25s ease;
    border: 2px solid #e2e8f0;
  }

  .service-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
    border-color: rgba(56,182,255,.3);
  }

  /* Bottom row - center the last two cards */
  .service-card:nth-child(4) {
    grid-column: 2 / 4;
  }
  
  .service-card:nth-child(5) {
    grid-column: 4 / 6;
  }

  .service-icon {
    width: 70px;
    height: 70px;
    background: linear-gradient(135deg, #ff8c00, #ff6b00);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 28px;
    color: white;
    box-shadow: 0 4px 12px rgba(255,140,0,.25);
  }

  .service-card h3 {
    font-size: 1.3rem;
    font-weight: 700;
    color: #000000;
    margin-bottom: 12px;
  }

  .service-card p {
    color: #64748b;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  /* ===== CTA SECTION ===== */
  .cta-section {
    background: linear-gradient(135deg, #38b6ff, #0ea5e9);
    position: relative;
    overflow: hidden;
  }

  .cta-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
  }

  .cta-content {
    position: relative;
    z-index: 2;
    text-align: center;
    color: white;
  }

  .cta-content h2 {
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 800;
    margin-bottom: 20px;
  }

  .cta-content p {
    font-size: 1.2rem;
    opacity: 0.9;
    margin-bottom: 40px;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  /* ===== CONTACT BANNER ===== */
  .contact-banner {
    background: rgba(255, 255, 255, 0.1);
    color: #1e3a8a;
    padding: 30px;
    border-radius: 16px;
    text-align: center;
    margin: 60px auto 0;
    max-width: 600px;
    border: 2px solid #e2e8f0;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }

  .contact-banner:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: #38b6ff;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(56, 182, 255, 0.2);
  }

  .contact-banner h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 20px;
    color: #000000;
  }

  .contact-info {
    display: flex;
    justify-content: center;
    gap: 40px;
    flex-wrap: wrap;
  }

  .contact-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.1rem;
    font-weight: 600;
    color: #000000;
  }

  .contact-item a {
    color: #000000;
    text-decoration: none;
    transition: all 0.3s ease;
    padding: 8px 16px;
    border-radius: 8px;
  }

  .contact-item a:hover {
    background: #38b6ff;
    color: white;
  }

  /* ===== FOOTER ===== */
  .footer {
    background: #000000;
    color: #94a3b8;
    padding: 20px 0;
    text-align: center;
  }

  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 40px;
  }

  .footer-left {
    text-align: left;
  }

  .footer-left p {
    margin-bottom: 0;
  }

  .footer-right {
    text-align: right;
  }

  .footer-right img {
    width: 100px;
    height: auto;
  }

  .footer a {
    color: #94a3b8;
    text-decoration: none;
    transition: color 0.3s ease;
  }

  .footer a:hover {
    color: white;
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .hero-container {
      grid-template-columns: 1fr;
      gap: 40px;
      padding: 0 20px;
      text-align: center;
    }

    .container {
      padding: 0 20px;
    }

    .cta-hero {
      justify-content: center;
    }

    .btn-primary, .btn-secondary {
      width: 100%;
      text-align: center;
    }

    .hero-contact {
      text-align: center;
      font-size: 1.35rem;
    }

    .benefits-grid {
      grid-template-columns: 1fr;
      gap: 30px;
    }

    .services-grid {
      grid-template-columns: 1fr;
    }

    .service-card {
      grid-column: span 1;
    }

    .service-card:nth-child(4),
    .service-card:nth-child(5) {
      grid-column: span 1;
    }

    .contact-info {
      flex-direction: column;
      gap: 20px;
    }

    #quick-form .container div[style*="grid-template-columns: 1fr 1fr"] {
      grid-template-columns: 1fr !important;
    }
  }

  .requirements-list {
    background: white;
    padding: 40px;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    max-width: 600px;
    margin: 0 auto;
  }

  .requirements-list ul {
    list-style: none;
    padding: 0;
  }

  .requirements-list li {
    padding: 12px 0;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.1rem;
  }

  .requirements-list li:last-child {
    border-bottom: none;
  }

  .requirements-list .check-icon {
    width: 24px;
    height: 24px;
    background: #10b981;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14px;
  }

  </style>
</head>

<body>
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5ZP4TT23"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->

  <?php include 'header.php'; ?>

  <!-- Stats Bar -->
  <?php if (!empty($_homeStats)): ?>
  <section class="stats-bar">
    <div class="stats-bar-inner">
      <?php foreach ($_homeStats as $stat): ?>
      <div class="stat-item">
        <?php if (!empty($stat['stat_icon'])): ?>
          <span class="stat-icon"><?= $stat['stat_icon'] /* HTML entities */ ?></span>
        <?php endif; ?>
        <div class="stat-value"><?= htmlspecialchars($stat['stat_value']) ?></div>
        <div class="stat-label"><?= htmlspecialchars($stat['stat_label']) ?></div>
      </div>
      <?php endforeach; ?>
    </div>
  </section>
  <?php endif; ?>

  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-container">
      <div class="hero-content">
        <h1>
          Affordable Marketing Solutions That 
          <span class="highlight-text">Deliver Results</span>
        </h1>
        <p>We help local Charleston businesses grow with billboard-style postcards, targeted direct mail, and exclusive placement opportunities.</p>
        
        <div class="cta-hero">
          <a href="advertise.php" class="btn-primary">Reserve Your Spot</a>
          <a href="#services" class="btn-secondary">Learn More</a>
        </div>
        <div class="hero-contact">
          Contact us for <span class="highlight-mailing">Our Upcoming Mailings</span> <a href="tel:8432122969">(843) 212-2969</a> or <a href="mailto:hello@lbspotlight.com">hello@lbspotlight.com</a>
        </div>
      </div>
      
      <div class="hero-visual">
        <div class="postcard-showcase">
          <div class="carousel">
            <img class="carousel-image" src="images/NMP Horizontal August 2025 side 2.jpg" alt="Mount Pleasant direct mail postcard design - back side with local business ads">
            <img class="carousel-image" src="images/NMP Horizontal August 2025 side 1.jpg" alt="Mount Pleasant billboard-style postcard - front side with exclusive business placement">
            <img class="carousel-image" src="images/9x12 Horizontal 1.jpg" alt="9x12 oversized direct mail postcard front - Charleston area local business advertising">
            <img class="carousel-image" src="images/9x12 Horizontal 2.jpg" alt="9x12 oversized direct mail postcard back - multiple business category placement example">

          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Why Choose Us Section -->
  <section class="section light" id="services">
    <div class="container">
      <div class="section-header">
        <h2>Why Join Our Postcard Campaign?</h2>
        <p>Comprehensive marketing solutions designed to help your business grow and thrive in today's competitive market.</p>
      </div>
      
      <div class="benefits-grid">
        <div class="benefit-card">
          <div class="benefit-icon">🎯</div>
          <h3>No Competitors Allowed</h3>
          <p>Your business will stand alone in your category, ensuring maximum impact and brand recognition.</p>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">📬</div>
          <h3>Billboard-Style Impact</h3>
          <p>Huge 9"x12" postcards that can't be ignored - every ad is front and center in the mailbox.</p>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">🏠</div>
          <h3>5,000+ Households</h3>
          <p>Massive local reach across Charleston area homes and businesses at an unbeatable cost.</p>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">✨</div>
          <h3>Full-Service Solution</h3>
          <p>We handle everything - design, printing, postage, and delivery. You just provide the details.</p>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">💎</div>
          <h3>Premium Quality</h3>
          <p>Full color, gloss-coated postcards that look professional and make a lasting impression.</p>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">💰</div>
          <h3>Unbeatable Value</h3>
          <p>Starting at just 5 cents per household - less than the cost of a single newspaper ad.</p>
        </div>
      </div>

      <!-- Contact Info Moved Here -->
      <div class="contact-banner">
        <h3>Ready to Get Started?</h3>
        <div class="contact-info">
          <div class="contact-item">
            <span>📞</span>
            <a href="tel:843-212-2969">843-212-2969</a>
          </div>
          <div class="contact-item">
            <span>✉️</span>
            <a href="mailto:hello@lbspotlight.com">hello@lbspotlight.com</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Services Overview -->
  <section class="section services-section">
    <div class="container">
      <div class="section-header">
        <h2>Our Services</h2>
        <p>Complete marketing solutions for Charleston area businesses</p>
      </div>
      
      <div class="services-grid">
        <div class="service-card">
          <div class="service-icon">📮</div>
          <h3>Community Postcards</h3>
          <p>Local, affordable, and targeted direct mail postcards that connect your business with the community.</p>
        </div>
        
        <div class="service-card">
          <div class="service-icon">🎨</div>
          <h3>Free Design Service</h3>
          <p>Professional ad design included at no extra cost. We create eye-catching layouts that get results.</p>
        </div>
        
        <div class="service-card">
          <div class="service-icon">📍</div>
          <h3>Business Directory</h3>
          <p>Get featured in our online directory to maximize your exposure beyond the postcard campaign.</p>
        </div>
        
        <div class="service-card">
          <div class="service-icon">📊</div>
          <h3>Campaign Tracking</h3>
          <p>Optional QR codes and tracking to measure your campaign's success and return on investment.</p>
        </div>
        
        <div class="service-card">
          <div class="service-icon">🏆</div>
          <h3>Exclusive Placement</h3>
          <p>Category exclusivity ensures your business is the only one in your industry on each postcard.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Requirements Section -->
  <section class="section light">
    <div class="container">
      <div class="section-header">
        <h2>What Do You Need to Provide?</h2>
        <p>Getting started is simple - just provide these basic details</p>
      </div>
      
      <div class="requirements-list">
        <ul>
          <li><span class="check-icon">✓</span>Company Name</li>
          <li><span class="check-icon">✓</span>Address</li>
          <li><span class="check-icon">✓</span>Phone Number</li>
          <li><span class="check-icon">✓</span>Website (optional)</li>
          <li><span class="check-icon">✓</span>Company Logo</li>
          <li><span class="check-icon">✓</span>Special Offer/Promo</li>
          <li><span class="check-icon">✓</span>Any Images for the Ad</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- Quick Contact Form -->
  <section class="section" id="quick-form" style="background: #f8fafc;">
    <div class="container">
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <h2 style="color: #000; font-size: clamp(2rem, 4vw, 2.75rem); font-weight: 800; margin-bottom: 12px;">Reserve Your Spot in 30 Seconds</h2>
        <p style="color: #64748b; font-size: 1.1rem; margin-bottom: 40px;">Tell us about your business and we'll reach out within 24 hours with a custom plan.</p>

        <form action="process_form.php" method="POST" style="text-align: left; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          <input type="hidden" name="location" value="homepage">
          <input type="hidden" name="distribution_reach" value="">
          <input type="hidden" name="ad_size" value="">
          <input type="hidden" name="ad_price" value="0">

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <label style="display: block; color: #000; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Business Name *</label>
              <input type="text" name="company_name" required placeholder="Your business name"
                style="width: 100%; padding: 14px 16px; border-radius: 10px; border: 2px solid #e2e8f0; background: #fff; color: #333; font-size: 1rem; font-family: inherit; transition: border-color 0.3s;"
                onfocus="this.style.borderColor='#38b6ff'" onblur="this.style.borderColor='#e2e8f0'">
            </div>
            <div>
              <label style="display: block; color: #000; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Your Name *</label>
              <input type="text" name="contact_name" required placeholder="Contact name"
                style="width: 100%; padding: 14px 16px; border-radius: 10px; border: 2px solid #e2e8f0; background: #fff; color: #333; font-size: 1rem; font-family: inherit; transition: border-color 0.3s;"
                onfocus="this.style.borderColor='#38b6ff'" onblur="this.style.borderColor='#e2e8f0'">
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; color: #000; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">Email *</label>
            <input type="email" name="email" required placeholder="you@company.com"
              style="width: 100%; padding: 14px 16px; border-radius: 10px; border: 2px solid #e2e8f0; background: #fff; color: #333; font-size: 1rem; font-family: inherit; transition: border-color 0.3s;"
              onfocus="this.style.borderColor='#38b6ff'" onblur="this.style.borderColor='#e2e8f0'">
            <!-- Phone field removed: SMS opt-in handled by chat widget only. -->
          </div>

          <div style="margin-bottom: 24px;">
            <label style="display: block; color: #000; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px;">What type of business? (optional)</label>
            <input type="text" name="notes" placeholder="e.g. Restaurant, Plumber, Dentist..."
              style="width: 100%; padding: 14px 16px; border-radius: 10px; border: 2px solid #e2e8f0; background: #fff; color: #333; font-size: 1rem; font-family: inherit; transition: border-color 0.3s;"
              onfocus="this.style.borderColor='#38b6ff'" onblur="this.style.borderColor='#e2e8f0'">
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; text-align: center; font-size: 1.1rem; padding: 18px; border-radius: 12px;">
            Get My Free Quote
          </button>
          <p style="color: #64748b; font-size: 0.8rem; text-align: center; margin-top: 12px;">No commitment required. We'll send you pricing options within 24 hours.</p>
        </form>
      </div>
    </div>
  </section>

  <!-- Final CTA Section -->
  <section class="cta-section section">
    <div class="container">
      <div class="cta-content">
        <h2>Don't Miss Our Upcoming Mailings</h2>
        <p>Limited spots available for our next Charleston area postcard campaign. Reserve your exclusive position today.</p>
        <a href="advertise.php" class="btn-primary">Start Your Campaign Today</a>
      </div>
    </div>
  </section>

  <!-- FAQ Section -->
  <section style="background: #ffffff; padding: 80px 20px;">
    <div style="max-width: 800px; margin: 0 auto;">
      <h2 style="font-family: 'Inter', sans-serif; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 800; color: #000; text-align: center; margin-bottom: 15px;">Frequently Asked Questions</h2>
      <p style="font-family: 'Inter', sans-serif; color: #64748b; text-align: center; font-size: 1.1rem; margin-bottom: 50px;">Everything you need to know about advertising with Lowcountry Business Spotlight.</p>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div class="faq-item" style="background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <button onclick="toggleFaq(this)" style="width: 100%; padding: 20px 24px; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-align: left;">
            <span style="font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 600; color: #000;">How much does direct mail advertising cost?</span>
            <span style="font-family: 'Inter', sans-serif; color: #38b6ff; font-size: 1.5rem; transition: transform 0.3s ease; flex-shrink: 0; margin-left: 16px;">+</span>
          </button>
          <div style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
            <p style="font-family: 'Inter', sans-serif; padding: 0 24px 20px; color: #64748b; font-size: 0.95rem; line-height: 1.7; margin: 0;">Starting at $99 per mailing. Pricing depends on location, reach, and ad size. Contact us for a custom quote.</p>
          </div>
        </div>

        <div class="faq-item" style="background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <button onclick="toggleFaq(this)" style="width: 100%; padding: 20px 24px; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-align: left;">
            <span style="font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 600; color: #000;">How many households will see my ad?</span>
            <span style="font-family: 'Inter', sans-serif; color: #38b6ff; font-size: 1.5rem; transition: transform 0.3s ease; flex-shrink: 0; margin-left: 16px;">+</span>
          </button>
          <div style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
            <p style="font-family: 'Inter', sans-serif; padding: 0 24px 20px; color: #64748b; font-size: 0.95rem; line-height: 1.7; margin: 0;">Depending on the campaign, our postcards reach 2,500, 5,000, 10,000, or 20,000 households per mailing area across Charleston, Summerville, Mount Pleasant, Daniel Island, North Charleston, and Moncks Corner.</p>
          </div>
        </div>

        <div class="faq-item" style="background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <button onclick="toggleFaq(this)" style="width: 100%; padding: 20px 24px; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-align: left;">
            <span style="font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 600; color: #000;">Do I need to design my own ad?</span>
            <span style="font-family: 'Inter', sans-serif; color: #38b6ff; font-size: 1.5rem; transition: transform 0.3s ease; flex-shrink: 0; margin-left: 16px;">+</span>
          </button>
          <div style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
            <p style="font-family: 'Inter', sans-serif; padding: 0 24px 20px; color: #64748b; font-size: 0.95rem; line-height: 1.7; margin: 0;">No! We provide free professional ad design. Just send us your logo, offer, and contact info — we'll handle the rest.</p>
          </div>
        </div>

        <div class="faq-item" style="background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <button onclick="toggleFaq(this)" style="width: 100%; padding: 20px 24px; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-align: left;">
            <span style="font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 600; color: #000;">What makes your postcards different from other advertising?</span>
            <span style="font-family: 'Inter', sans-serif; color: #38b6ff; font-size: 1.5rem; transition: transform 0.3s ease; flex-shrink: 0; margin-left: 16px;">+</span>
          </button>
          <div style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
            <p style="font-family: 'Inter', sans-serif; padding: 0 24px 20px; color: #64748b; font-size: 0.95rem; line-height: 1.7; margin: 0;">Each business gets exclusive category placement — no competitors on the same card. Your ad stands out like a mini billboard delivered directly to mailboxes.</p>
          </div>
        </div>

        <div class="faq-item" style="background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <button onclick="toggleFaq(this)" style="width: 100%; padding: 20px 24px; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-align: left;">
            <span style="font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 600; color: #000;">How do I track my results?</span>
            <span style="font-family: 'Inter', sans-serif; color: #38b6ff; font-size: 1.5rem; transition: transform 0.3s ease; flex-shrink: 0; margin-left: 16px;">+</span>
          </button>
          <div style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
            <p style="font-family: 'Inter', sans-serif; padding: 0 24px 20px; color: #64748b; font-size: 0.95rem; line-height: 1.7; margin: 0;">We provide tracking tools and can set up a custom phone number or landing page. Many of our advertisers report 40+ calls from a single mailing.</p>
          </div>
        </div>

        <div class="faq-item" style="background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <button onclick="toggleFaq(this)" style="width: 100%; padding: 20px 24px; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-align: left;">
            <span style="font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 600; color: #000;">Is the online directory listing free?</span>
            <span style="font-family: 'Inter', sans-serif; color: #38b6ff; font-size: 1.5rem; transition: transform 0.3s ease; flex-shrink: 0; margin-left: 16px;">+</span>
          </button>
          <div style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
            <p style="font-family: 'Inter', sans-serif; padding: 0 24px 20px; color: #64748b; font-size: 0.95rem; line-height: 1.7; margin: 0;">Yes! Every business gets a free basic listing in our online directory at no cost. Paid plans unlock photos, hours, offers, and featured placement.</p>
          </div>
        </div>
      </div>
    </div>

    <script>
    function toggleFaq(btn) {
      var answer = btn.nextElementSibling;
      var icon = btn.querySelector('span:last-child');
      var isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
      // Close all others
      document.querySelectorAll('.faq-item').forEach(function(item) {
        var a = item.querySelector('button + div');
        var i = item.querySelector('button span:last-child');
        if (a && a !== answer) {
          a.style.maxHeight = '0px';
          if (i) { i.textContent = '+'; i.style.transform = 'rotate(0deg)'; }
        }
      });
      if (isOpen) {
        answer.style.maxHeight = '0px';
        icon.textContent = '+';
        icon.style.transform = 'rotate(0deg)';
      } else {
        answer.style.maxHeight = answer.scrollHeight + 'px';
        icon.textContent = '-';
        icon.style.transform = 'rotate(180deg)';
      }
    }
    </script>

    <!-- FAQPage JSON-LD Schema -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How much does direct mail advertising cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Starting at $99 per mailing. Pricing depends on location, reach, and ad size. Contact us for a custom quote."
          }
        },
        {
          "@type": "Question",
          "name": "How many households will see my ad?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Depending on the campaign, our postcards reach 2,500, 5,000, 10,000, or 20,000 households per mailing area across Charleston, Summerville, Mount Pleasant, Daniel Island, North Charleston, and Moncks Corner."
          }
        },
        {
          "@type": "Question",
          "name": "Do I need to design my own ad?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No! We provide free professional ad design. Just send us your logo, offer, and contact info — we'll handle the rest."
          }
        },
        {
          "@type": "Question",
          "name": "What makes your postcards different from other advertising?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Each business gets exclusive category placement — no competitors on the same card. Your ad stands out like a mini billboard delivered directly to mailboxes."
          }
        },
        {
          "@type": "Question",
          "name": "How do I track my results?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We provide tracking tools and can set up a custom phone number or landing page. Many of our advertisers report 40+ calls from a single mailing."
          }
        },
        {
          "@type": "Question",
          "name": "Is the online directory listing free?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! Every business gets a free basic listing in our online directory at no cost. Paid plans unlock photos, hours, offers, and featured placement."
          }
        }
      ]
    }
    </script>
  </section>

  <?php include 'footer.php'; ?>

  <!-- Carousel Script -->
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const images = document.querySelectorAll('.carousel-image');
      let current = 0;

      function showNextImage() {
        images[current].classList.remove('active');
        current = (current + 1) % images.length;
        images[current].classList.add('active');
      }

      if (images.length > 0) {
        images[current].classList.add('active');
        setInterval(showNextImage, 4000);
      }
    });
  </script>
</body>
</html>