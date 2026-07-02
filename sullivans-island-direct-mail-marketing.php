<?php
require_once __DIR__ . '/config.php';
$location = 'sullivans-island';

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
                <h1>Sullivans Island Direct Mail <span style="color: #000000; font-weight: 900;"><br>Reach the Lowcountry's Most Affluent Households</span></h1>
                <p>Target 5,000–10,000 households per mailing across Sullivans Island and nearby barrier island communities with oversized 9"x12" postcards — no competitors on the same card</p>

                <div class="cta-hero">
                    <a href="tel:843-212-2969" class="btn-primary">Call Now: 843-212-2969</a>
                    <a href="#reserve" class="btn-secondary">Get Started Today</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Why Sullivans Island -->
    <section class="section light">
        <div class="container">
            <div class="section-header">
                <h2>Why Sullivans Island Is a Premium Market for Direct Mail</h2>
                <p>Sullivans Island is one of the most exclusive and affluent communities in all of South Carolina. With sky-high household incomes and a tight-knit island culture, your message reaches residents who have the means — and the motivation — to act on it.</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number">2,000+</span>
                    <p>Island Population</p>
                </div>
                <div class="stat-card">
                    <span class="stat-number">$150K+</span>
                    <p>Median Household Income</p>
                </div>
                <div class="stat-card">
                    <span class="stat-number">10 Mi</span>
                    <p>From Downtown Charleston</p>
                </div>
                <div class="stat-card">
                    <span class="stat-number">Top 1%</span>
                    <p>Wealthiest SC Communities</p>
                </div>
            </div>
        </div>
    </section>

    <!-- In-Depth Content Section -->
    <section class="section">
        <div class="container">
            <div style="max-width: 800px; margin: 0 auto;">
                <h2 style="font-size: clamp(1.8rem, 3.5vw, 2.5rem); font-weight: 800; color: #000; margin-bottom: 20px;">Why Direct Mail Works on Sullivans Island</h2>
                <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                    Sullivans Island is not just another beach town. It is one of the wealthiest and most exclusive residential communities in South Carolina, with a median household income exceeding $150,000 and home values that regularly surpass the million-dollar mark. The island's roughly 2,000 full-time residents are a concentrated group of high-net-worth homeowners, retirees, and professionals who value quality, privacy, and premium services. When a 9"x12" oversized postcard arrives in a Sullivans Island mailbox, it does not get tossed — it gets read. In a community this small and this affluent, every piece of mail carries weight.
                </p>
                <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                    What makes Sullivans Island uniquely powerful for direct mail is the sheer lack of advertising noise. Unlike larger markets where residents are bombarded with flyers, coupons, and mailers from dozens of competing businesses, Sullivans Island mailboxes are relatively quiet. That means your postcard does not have to fight for attention — it naturally stands out. And because we guarantee exclusive category placement, your business is the only one in your industry on the card. For an island where word-of-mouth and reputation drive most purchasing decisions, a well-designed direct mail piece functions almost like a personal introduction from a trusted neighbor.
                </p>

                <h3 style="font-size: 1.4rem; font-weight: 700; color: #000; margin-bottom: 15px; margin-top: 35px;">Areas We Cover on Sullivans Island</h3>
                <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                    Our Sullivans Island direct mail campaign covers the entirety of zip code <strong>29482</strong>. That includes all of Sullivans Island proper — from the beach-side homes along <strong>Stations 12 through 28</strong> to the intercoastal properties on the back side of the island. We reach the <strong>Middle Street commercial corridor</strong>, the residential streets surrounding <strong>Fort Moultrie</strong> and the national park area, and the neighborhoods along <strong>Ion Avenue</strong> and <strong>Atlantic Avenue</strong>. The <strong>Ben Sawyer Boulevard corridor</strong> connecting the island to Mount Pleasant is also included, capturing the last stretch of homes before the bridge. Every residential delivery route on the island is covered.
                </p>

                <h3 style="font-size: 1.4rem; font-weight: 700; color: #000; margin-bottom: 15px; margin-top: 35px;">The Advantage of a Small, Exclusive Market</h3>
                <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                    Most direct mail campaigns aim for broad reach. Sullivans Island flips that model on its head. Here, the advantage is precision and exclusivity. With approximately 2,000 households on the island, you are not casting a wide net and hoping for the best — you are placing your brand directly in front of every single homeowner in one of the Southeast's most desirable communities. The response rates in affluent, low-density markets like this tend to outperform larger suburban mailings because residents have the disposable income to act immediately and the community is small enough that repeat exposure builds name recognition fast. After just two or three mailings, your business becomes a recognized name on the island.
                </p>

                <h3 style="font-size: 1.4rem; font-weight: 700; color: #000; margin-bottom: 15px; margin-top: 35px;">Direct Mail vs. Digital Advertising on Sullivans Island</h3>
                <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                    Digital advertising struggles in micro-markets like Sullivans Island. The audience is too small for most ad platforms to target effectively — Facebook and Google algorithms are designed for scale, not for a community of 2,000 people. Geo-targeting a 3-mile island is imprecise at best, and you end up paying for impressions that bleed into Mount Pleasant or Isle of Palms without any real control. Direct mail solves this problem entirely. USPS Every Door Direct Mail (EDDM) lets us target 29482 with surgical precision, ensuring that every single household on Sullivans Island receives your postcard. No wasted impressions, no algorithm guessing games — just guaranteed delivery to the exact audience you want to reach.
                </p>

                <h3 style="font-size: 1.4rem; font-weight: 700; color: #000; margin-bottom: 15px; margin-top: 35px;">How Our Sullivans Island Direct Mail Program Works</h3>
                <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                    Because Sullivans Island has roughly 2,000 households, most advertisers combine the island with nearby routes in <strong>Mount Pleasant</strong> or <strong>Isle of Palms</strong> to reach the 5,000–10,000 household mailing threshold. This is actually an advantage: you get blanket coverage of Sullivans Island plus exposure to the adjacent affluent communities that share the same lifestyle and spending habits. We handle everything — ad design, printing, and USPS EDDM delivery. Each oversized 9"x12" postcard features exclusive category placement, so there is zero competition from your industry on the same card. We also provide trackable QR codes, unique URLs, and dedicated phone numbers so you can measure exactly how many calls and visits your ad generates. With rates starting at just 5 cents per household, it is one of the most cost-effective ways to put your brand in front of the Lowcountry's highest-income homeowners.
                </p>
            </div>
        </div>
    </section>

    <!-- Coverage -->
    <section class="section light">
        <div class="container">
            <div class="section-header">
                <h2>Sullivans Island Zip Code Coverage</h2>
                <p>Complete coverage of one of South Carolina's most exclusive communities</p>
            </div>

            <div class="zip-codes">
                <div class="zip-card">
                    <h3>29482 - Sullivans Island</h3>
                    <ul>
                        <li>All beachfront homes from Station 12 to Station 28</li>
                        <li>Middle Street commercial corridor and surrounding residences</li>
                        <li>Fort Moultrie area and national park neighborhood</li>
                        <li>Ion Avenue, Atlantic Avenue, and interior island streets</li>
                        <li>Ben Sawyer Boulevard corridor to Mount Pleasant</li>
                        <li>Mix of full-time residents and vacation homeowners</li>
                        <li>Median household income $150,000+ — among SC's wealthiest</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>

    <!-- Features -->
    <section class="section blue">
        <div class="container">
            <div class="section-header">
                <h2>What Makes Our Sullivans Island Direct Mail Different</h2>
                <p>Exclusive placement in a premium, high-income market</p>
            </div>

            <div class="features-grid">
                <div class="feature-card">
                    <span class="feature-icon">🎯</span>
                    <h3>Exclusive Category Placement</h3>
                    <p>No competitors on the same postcard. When Sullivans Island residents see your 9"x12" billboard-style ad, you are the ONLY business in your category they will see.</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">💎</span>
                    <h3>Ultra-Affluent Audience</h3>
                    <p>Sullivans Island's $150K+ median household income means residents have the disposable income to act on premium offers immediately — no coupon-clipping crowd here.</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">📬</span>
                    <h3>Maximum Mailbox Impact</h3>
                    <p>Our oversized 9"x12" postcards dominate the mailbox. In a small community like Sullivans Island, your ad gets noticed, read, and remembered.</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">🗺️</span>
                    <h3>Combine Nearby Zones</h3>
                    <p>Pair Sullivans Island with Isle of Palms and Mount Pleasant routes to reach 5,000–10,000 households across the most affluent barrier island communities in the Charleston area.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Business Types -->
    <section class="section">
        <div class="container">
            <div class="section-header">
                <h2>Ideal for Businesses Serving Sullivans Island's Affluent Market</h2>
                <p>Premium services for a premium community</p>
            </div>

            <div class="business-types">
                <div class="business-type">
                    <h3>Luxury Home Services</h3>
                    <p>High-end renovations, custom builders, pool maintenance, landscaping, hurricane shutters, smart home installation</p>
                </div>
                <div class="business-type">
                    <h3>Fine Dining & Catering</h3>
                    <p>Upscale restaurants, private chefs, catering companies, wine and spirits delivery, specialty food services</p>
                </div>
                <div class="business-type">
                    <h3>Marine & Boat Services</h3>
                    <p>Boat detailing, dock construction, marine mechanics, fishing charters, watercraft storage and maintenance</p>
                </div>
                <div class="business-type">
                    <h3>Real Estate & Property</h3>
                    <p>Luxury real estate agents, property management, vacation rental management, home staging, appraisals</p>
                </div>
                <div class="business-type">
                    <h3>Interior Design & Decor</h3>
                    <p>Interior designers, custom furniture, art galleries, window treatments, coastal home styling</p>
                </div>
                <div class="business-type">
                    <h3>Concierge & Personal Services</h3>
                    <p>Personal concierge, estate management, private tutoring, personal training, pet care, errand services</p>
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
                <h2>Sullivans Island Direct Mail FAQs</h2>
                <p>Common questions about our direct mail service</p>
            </div>

            <div style="max-width: 800px; margin: 0 auto;">
                <div class="faq-item">
                    <div class="faq-question">
                        How many households receive the postcard on Sullivans Island?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        Sullivans Island proper (29482) has approximately 2,000 households. To reach the 5,000–10,000 mailing threshold, we combine Sullivans Island with nearby routes in Mount Pleasant or Isle of Palms — giving you full island coverage plus surrounding affluent communities.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">
                        Can I combine Sullivans Island with other nearby zones for more volume?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        Absolutely. Most Sullivans Island advertisers combine 29482 with Isle of Palms (29451) and select Mount Pleasant routes to hit 5,000–10,000 households. This gives you concentrated coverage across the most affluent barrier island communities in the Charleston area.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">
                        Is my category exclusive?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        Yes. Only one business per category appears on each card. No competitors on the same mailing — ever.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">
                        Why is Sullivans Island such a strong market for direct mail?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        Sullivans Island is one of the wealthiest communities in South Carolina with a median household income exceeding $150,000. The small population means far less advertising noise than larger markets, so your postcard gets noticed. Residents have significant disposable income and actively seek premium local services — making response rates in this micro-market exceptionally strong.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">
                        Do you design my ad?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        Yes — ad design is included at no additional cost. We create a professional, eye-catching ad tailored to the Sullivans Island market.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">
                        When is the next Sullivans Island print date?
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
                    <a href="/isle-of-palms-direct-mail-marketing.php" style="display: block; padding: 20px; background: white; border-radius: 12px; text-decoration: none; color: #000; border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                        <strong>Isle of Palms Direct Mail</strong>
                    </a>
                    <a href="/mount-pleasant-direct-mail-marketing.php" style="display: block; padding: 20px; background: white; border-radius: 12px; text-decoration: none; color: #000; border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                        <strong>Mount Pleasant Direct Mail</strong>
                    </a>
                    <a href="/daniel-island-direct-mail-marketing.php" style="display: block; padding: 20px; background: white; border-radius: 12px; text-decoration: none; color: #000; border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                        <strong>Daniel Island & Clements Ferry Direct Mail</strong>
                    </a>
                    <a href="/charleston-direct-mail-marketing.php" style="display: block; padding: 20px; background: white; border-radius: 12px; text-decoration: none; color: #000; border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                        <strong>Charleston Direct Mail</strong>
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
