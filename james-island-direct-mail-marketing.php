<?php
require_once __DIR__ . '/config.php';
$location = 'james-island';

$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
include __DIR__ . '/seo_head.php';
?>
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
        text-align: center;
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

    .hero-content p {
        font-size: 1.3rem;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 40px;
        font-weight: 400;
        line-height: 1.6;
    }

    .cta-hero {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        justify-content: center;
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
        margin-bottom: 80px;
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

    /* ===== STATS GRID ===== */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 30px;
        margin-bottom: 60px;
    }

    .stat-card {
        background: white;
        padding: 40px 30px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
        transition: all 0.3s ease;
        border: 1px solid #e2e8f0;
        border-left: 5px solid #38b6ff;
    }

    .stat-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
    }

    .stat-number {
        font-size: 2.5rem;
        font-weight: 800;
        color: #38b6ff;
        margin-bottom: 10px;
        display: block;
    }

    .stat-card p {
        color: #64748b;
        font-size: 1.1rem;
        font-weight: 600;
    }

    /* ===== ZIP CODES GRID ===== */
    .zip-codes {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 30px;
        margin-bottom: 60px;
    }

    .zip-card {
        background: white;
        padding: 40px 30px;
        border-radius: 20px;
        box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
        transition: all 0.3s ease;
        border: 1px solid #e2e8f0;
    }

    .zip-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
    }

    .zip-card h3 {
        font-size: 1.4rem;
        font-weight: 700;
        color: #000000;
        margin-bottom: 20px;
    }

    .zip-card ul {
        list-style: none;
        padding: 0;
    }

    .zip-card li {
        padding: 8px 0;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        font-size: 1rem;
        line-height: 1.5;
    }

    .zip-card li::before {
        content: "\2713";
        color: #ff8c00;
        font-weight: bold;
        font-size: 16px;
        margin-top: 2px;
        flex-shrink: 0;
    }

    /* ===== BLUE SECTION STYLES ===== */
    .section.blue {
        background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
    }

    .section.blue .section-header h2 {
        color: #000000;
    }

    .section.blue .section-header p {
        color: #1a202c;
    }
    .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 30px;
        margin-bottom: 60px;
    }

    .feature-card {
        background: white;
        padding: 30px 25px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
        transition: all 0.3s ease;
        border: 1px solid #e2e8f0;
    }

    .feature-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
    }

    .feature-icon {
        font-size: 3rem;
        margin-bottom: 20px;
        display: block;
    }

    .feature-card h3 {
        font-size: 1.4rem;
        font-weight: 700;
        color: #000000;
        margin-bottom: 15px;
    }

    .feature-card p {
        color: #64748b;
        font-size: 1rem;
        line-height: 1.6;
    }

    /* ===== BUSINESS TYPES GRID ===== */
    .business-types {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 30px;
        margin-bottom: 60px;
        max-width: 1000px;
        margin: 0 auto;
    }

    .business-type {
        background: white;
        padding: 30px;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
        transition: all 0.3s ease;
        border: 1px solid #e2e8f0;
    }

    .business-type:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }

    .business-type h3 {
        font-size: 1.3rem;
        font-weight: 700;
        color: #000000;
        margin-bottom: 12px;
    }

    .business-type p {
        color: #64748b;
        font-size: 0.95rem;
        line-height: 1.5;
    }

    /* ===== PRICING SECTION ===== */
    .pricing-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 30px;
        margin-bottom: 60px;
    }

    .pricing-card {
        background: white;
        padding: 40px 30px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
        transition: all 0.3s ease;
        border: 1px solid #e2e8f0;
        position: relative;
    }

    .pricing-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
    }

    .pricing-card h3 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #000000;
        margin-bottom: 15px;
    }

    .price {
        font-size: 2.5rem;
        font-weight: 800;
        color: #ff8c00;
        margin-bottom: 20px;
    }

    .pricing-card ul {
        list-style: none;
        padding: 0;
        margin-bottom: 30px;
    }

    .pricing-card li {
        padding: 8px 0;
        color: #64748b;
        font-size: 1rem;
    }

    /* ===== FORM STYLES ===== */
    .form-container {
        background: white;
        padding: 40px;
        border-radius: 20px;
        box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
        border: 1px solid #e2e8f0;
    }

    .form-group {
        margin-bottom: 20px;
    }

    .form-control {
        width: 100%;
        padding: 15px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        font-size: 16px;
        transition: border-color 0.3s ease;
        font-family: 'Inter', sans-serif;
    }

    .form-control:focus {
        outline: none;
        border-color: #38b6ff;
        box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
    }

    /* ===== FAQ STYLES ===== */
    .faq-item {
        background: white;
        border-radius: 12px;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        border: 1px solid #e2e8f0;
        overflow: hidden;
    }

    .faq-question {
        padding: 20px;
        font-weight: 700;
        color: #000000;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background-color 0.3s ease;
    }

    .faq-question:hover {
        background-color: #f8fafc;
    }

    .faq-answer {
        padding: 0 20px 20px;
        color: #64748b;
        line-height: 1.6;
    }

    /* ===== CONTACT BANNER ===== */
    .contact-banner {
        background: rgba(255, 255, 255, 0.1);
        color: #000000;
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
            padding: 0 20px;
        }

        .container {
            padding: 0 20px;
        }

        .cta-hero {
            flex-direction: column;
            align-items: center;
        }

        .btn-primary, .btn-secondary {
            width: 100%;
            text-align: center;
        }

        .stats-grid, .features-grid, .zip-codes, .business-types, .pricing-grid {
            grid-template-columns: 1fr;
        }

        .contact-info {
            flex-direction: column;
            gap: 20px;
        }

        .footer-content {
            flex-direction: column;
            gap: 20px;
            text-align: center;
        }

        .footer-left, .footer-right {
            text-align: center;
        }
    }
    </style>
</head>

<body>
    <?php include 'header.php'; ?>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-container">
            <div class="hero-content">
                <h1>James Island Direct Mail <span style="color: #000000; font-weight: 900;"><br>Reach Families Where They Live</span></h1>
                <p>Reach 5,000–10,000 James Island households per mailing with oversized 9"x12" postcards — no competitors on the same card</p>

                <div class="cta-hero">
                    <a href="tel:843-212-2969" class="btn-primary">Call Now: 843-212-2969</a>
                    <a href="#reserve" class="btn-secondary">Get Started Today</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Why James Island -->
    <section class="section light">
        <div class="container">
            <div class="section-header">
                <h2>Why James Island Is a Prime Market for Direct Mail</h2>
                <p>James Island is a tight-knit island community nestled between downtown Charleston and Folly Beach, with a strong local identity and a growing mix of established residents and young professionals.</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number">12,000+</span>
                    <p>Area Population</p>
                </div>
                <div class="stat-card">
                    <span class="stat-number">$65,000+</span>
                    <p>Median Household Income</p>
                </div>
                <div class="stat-card">
                    <span class="stat-number">29412</span>
                    <p>Primary Zip Code</p>
                </div>
                <div class="stat-card">
                    <span class="stat-number">5K–10K</span>
                    <p>Households Per Mailing</p>
                </div>
            </div>
        </div>
    </section>

    <!-- In-Depth Content Section -->
    <section class="section">
        <div class="container">
            <div style="max-width: 800px; margin: 0 auto;">
                <h2 style="font-size: clamp(1.8rem, 3.5vw, 2.5rem); font-weight: 800; color: #000; margin-bottom: 20px;">Why Direct Mail Works on James Island, SC</h2>
                <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                    James Island occupies a unique position in the Charleston market — literally and figuratively. Sitting between the historic peninsula and Folly Beach, the island has long been a preferred landing spot for residents who want quick access to downtown Charleston's restaurants, jobs, and culture without the premium price tag of living south of Broad. The result is a community with deep roots and genuine local pride, where neighbors know each other, support local businesses, and pay attention to what arrives in their mailbox. For businesses looking to build trust and visibility, that kind of engaged audience is exactly what makes direct mail so effective here.
                </p>
                <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                    What sets James Island apart from other Lowcountry markets is the blend of long-time residents and newer arrivals. Established neighborhoods like Riverland Terrace and Secessionville are home to families who have been on the island for decades, while newer developments and renovated homes along the Folly Road and Camp Road corridors have attracted young professionals, couples, and growing families. Many of these newer residents are still building their list of trusted service providers — a plumber, a dentist, a go-to restaurant for date night. A well-designed 9"x12" postcard arriving at their door isn't junk mail — it's a timely introduction to the businesses that serve their community. And because our program guarantees exclusive category placement, your ad stands alone in your industry on every card. No competitor clutter. No shared attention.
                </p>

                <h3 style="font-size: 1.4rem; font-weight: 700; color: #000; margin-bottom: 15px; margin-top: 35px;">Neighborhoods We Reach Across James Island</h3>
                <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                    Our James Island direct mail campaigns cover the 29412 zip code, reaching households across the island's most desirable neighborhoods. <strong>Riverland Terrace</strong> is one of the island's most charming areas, with tree-lined streets, mid-century homes, and a walkable village feel that draws residents who value community connection. <strong>Stiles Point</strong> and <strong>Ft. Johnson Estates</strong> offer waterfront and marsh-view living with families who invest in home services, landscaping, and outdoor living. <strong>Secessionville</strong> blends historic character with a loyal, long-established resident base that relies on trusted local providers.
                </p>
                <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                    The <strong>Camp Road corridor</strong> serves as the island's commercial backbone, lined with local restaurants, shops, and service businesses that residents visit daily. The <strong>Folly Road corridor</strong> connects the island to both downtown Charleston and Folly Beach, making it a high-traffic artery where businesses benefit from consistent local visibility. <strong>Harborview</strong>, <strong>Lighthouse Point</strong>, <strong>Bayfront</strong>, and <strong>Grimball Gates</strong> round out the island's residential landscape with a mix of established subdivisions and newer homes. Whether you're targeting the walkable neighborhoods near Riverland Terrace or the growing communities closer to Folly Road, our EDDM routes let you focus your mailing exactly where your ideal customers live.
                </p>

                <h3 style="font-size: 1.4rem; font-weight: 700; color: #000; margin-bottom: 15px; margin-top: 35px;">Direct Mail vs. Digital Advertising on James Island</h3>
                <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                    James Island residents are community-oriented and locally minded — but they're also bombarded by the same digital noise as everyone else. Social media feeds are crowded, Google ads blend together, and email inboxes overflow. Direct mail cuts through that clutter in a way digital channels simply cannot. The Data & Marketing Association reports direct mail response rates of 2.7% to 4.4%, compared to just 0.6% for email and 0.1% for display ads. A physical postcard sits on the kitchen counter, gets pinned to the fridge, and stays visible for days. In a community where residents actively seek out local businesses and word-of-mouth still carries weight, putting your brand physically into the home is the most direct path to earning a new customer. And compared to more saturated markets like Mt. Pleasant, James Island offers less advertising competition — your message has room to stand out.
                </p>

                <h3 style="font-size: 1.4rem; font-weight: 700; color: #000; margin-bottom: 15px; margin-top: 35px;">How Our James Island Direct Mail Program Works</h3>
                <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                    Getting started is straightforward. Each James Island mailing targets 5,000 to 10,000 households within the 29412 zip code — this is not blanket coverage, but a focused, route-based approach using USPS Every Door Direct Mail (EDDM). You select the volume that fits your budget, and we handle everything from there: ad design, printing, and postal delivery. Each oversized 9"x12" postcard features local businesses with exclusive category placement, so there's zero competition from your industry on the same card. We also provide trackable QR codes, unique URLs, and dedicated phone numbers so you can measure exactly how many calls and visits your ad generates. With rates starting at just 5 cents per household, it's one of the most cost-effective ways to reach James Island families.
                </p>
            </div>
        </div>
    </section>

    <!-- Coverage -->
    <section class="section light">
        <div class="container">
            <div class="section-header">
                <h2>James Island Zip Code Coverage</h2>
                <p>Target the neighborhoods that matter most to your business</p>
            </div>

            <div class="zip-codes" style="max-width: 600px; margin: 0 auto;">
                <div class="zip-card">
                    <h3>29412 - James Island</h3>
                    <ul>
                        <li>Riverland Terrace and Stiles Point</li>
                        <li>Secessionville and Ft. Johnson Estates</li>
                        <li>Camp Road corridor and Folly Road corridor</li>
                        <li>Harborview, Lighthouse Point, and Bayfront</li>
                        <li>Grimball Gates and surrounding neighborhoods</li>
                        <li>Island community with strong local identity and growing population</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>

    <!-- Features -->
    <section class="section blue">
        <div class="container">
            <div class="section-header">
                <h2>What Makes Our James Island Direct Mail Different</h2>
                <p>Exclusive placement and maximum impact for your business</p>
            </div>

            <div class="features-grid">
                <div class="feature-card">
                    <span class="feature-icon">🎯</span>
                    <h3>Exclusive Market Position</h3>
                    <p>No competitors allowed on the same postcard! When James Island residents see your 9"x12" billboard-style ad, you're the ONLY business in your category they'll remember.</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">📬</span>
                    <h3>Maximum Mailbox Impact</h3>
                    <p>Our oversized 9"x12" postcards don't get lost in the mail. They stand out like billboards in every James Island mailbox, ensuring your message gets noticed.</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">🗺️</span>
                    <h3>Focused Route Selection</h3>
                    <p>Target 5,000 to 10,000 households across James Island's 29412 zip code. Focus on Riverland Terrace, Stiles Point, the Folly Road corridor, or combine routes for broader reach.</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">💰</span>
                    <h3>Affordable & Trackable</h3>
                    <p>Starting at just 5 cents per household with built-in tracking. QR codes, unique URLs, and call tracking let you measure your ROI from day one.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Business Types -->
    <section class="section">
        <div class="container">
            <div class="section-header">
                <h2>Ideal for James Island's Local Business Community</h2>
                <p>From Camp Road to Folly Road, direct mail works for local businesses of all kinds</p>
            </div>

            <div class="business-types">
                <div class="business-type">
                    <h3>Home Services</h3>
                    <p>HVAC, plumbing, landscaping, roofing, pressure washing, pest control, cleaning</p>
                </div>
                <div class="business-type">
                    <h3>Restaurants & Bars</h3>
                    <p>Local dining, craft cocktail bars, takeout, catering, brunch spots, seafood restaurants</p>
                </div>
                <div class="business-type">
                    <h3>Dental & Medical</h3>
                    <p>Family dentistry, pediatrics, urgent care, chiropractic, dermatology, physical therapy</p>
                </div>
                <div class="business-type">
                    <h3>Fitness & Wellness</h3>
                    <p>Gyms, yoga studios, personal training, martial arts, wellness centers, cycling</p>
                </div>
                <div class="business-type">
                    <h3>Pet Services</h3>
                    <p>Veterinary clinics, dog grooming, pet sitting, boarding, training, pet supply shops</p>
                </div>
                <div class="business-type">
                    <h3>Real Estate</h3>
                    <p>Residential agents, property management, home staging, mortgage lending, title services</p>
                </div>
            </div>
        </div>
    </section>


    <!-- Pricing and Form Section -->
    <?php include 'pricing_form_section.php'; ?>

    <!-- FAQ -->
    <section class="section light">
        <div class="container">
            <div class="section-header">
                <h2>James Island Direct Mail FAQs</h2>
                <p>Common questions about our direct mail service</p>
            </div>

            <div style="max-width: 800px; margin: 0 auto;">
                <div class="faq-item">
                    <div class="faq-question">
                        How many households receive the postcard?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        Each James Island mailing targets 5,000 to 10,000 households within the 29412 zip code. You choose the volume that fits your budget and market.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">
                        Which neighborhoods can I target?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        We cover the entire James Island 29412 zip code, including Riverland Terrace, Stiles Point, Secessionville, Ft. Johnson Estates, Harborview, Lighthouse Point, Bayfront, Grimball Gates, and the Camp Road and Folly Road corridors. You select the EDDM carrier routes that match your ideal customer base.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">
                        Is my category exclusive?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        Yes. Only one business per category appears on each card. No competitors on the same mailing.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">
                        Do you design my ad?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        Yes — ad design is included at no additional cost.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">
                        Can I combine James Island with other zones?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        Absolutely. Many businesses pair James Island mailings with Charleston, Johns Island, or Sullivans Island to expand their reach across the Lowcountry. You can mix and match zones to match your service area.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">
                        When is the next print date?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        We print on a regular cadence. Submit the form above for current availability and deadlines.
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Related Zones -->
    <section class="section">
        <div class="container">
            <div class="section-header">
                <h2>Explore Nearby Zones</h2>
                <p>Expand your reach across the Lowcountry with targeted direct mail</p>
            </div>

            <div style="max-width: 600px; margin: 0 auto;">
                <div style="display: grid; gap: 15px;">
                    <a href="/charleston-direct-mail-marketing.php" style="display: block; padding: 20px; background: white; border-radius: 12px; text-decoration: none; color: #000; border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                        <strong>Charleston Direct Mail</strong>
                    </a>
                    <a href="/johns-island-direct-mail-marketing.php" style="display: block; padding: 20px; background: white; border-radius: 12px; text-decoration: none; color: #000; border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                        <strong>Johns Island Direct Mail</strong>
                    </a>
                    <a href="/sullivans-island-direct-mail-marketing.php" style="display: block; padding: 20px; background: white; border-radius: 12px; text-decoration: none; color: #000; border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                        <strong>Sullivans Island Direct Mail</strong>
                    </a>
                    <a href="/isle-of-palms-direct-mail-marketing.php" style="display: block; padding: 20px; background: white; border-radius: 12px; text-decoration: none; color: #000; border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                        <strong>Isle of Palms Direct Mail</strong>
                    </a>
                </div>
            </div>
        </div>
    </section>

    <?php include 'footer.php'; ?>

    <script>
        // Simple FAQ toggle functionality
        document.addEventListener('DOMContentLoaded', function() {
            const faqQuestions = document.querySelectorAll('.faq-question');

            faqQuestions.forEach(question => {
                question.addEventListener('click', function() {
                    const answer = this.nextElementSibling;
                    const isOpen = answer.style.display === 'block';

                    // Close all other answers
                    document.querySelectorAll('.faq-answer').forEach(a => {
                        a.style.display = 'none';
                    });

                    // Toggle current answer
                    answer.style.display = isOpen ? 'none' : 'block';

                    // Update icon
                    const icon = this.querySelector('span:last-child');
                    icon.textContent = isOpen ? '+' : '−';
                });
            });
        });
    </script>
</body>
</html>
