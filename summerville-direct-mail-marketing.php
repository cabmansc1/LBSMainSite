<?php
// Load pricing configuration with error handling
if (file_exists('pricing_config.php')) {
    require_once 'pricing_config.php';
} else {
    die('Error: pricing_config.php not found');
}

require_once __DIR__ . '/config.php';
$location = 'summerville';
$csrf_token = generateCSRFToken();

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
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
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
        content: "✓";
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

        .stats-grid, .features-grid, .zip-codes, .business-types {
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
                <h1><span style="color: #000000; font-weight: 900;">Summerville Direct Mail</span> Marketing for Local Businesses</h1>
                <p>Reach the Heart of the Lowcountry's Fastest-Growing Community</p>
                
                <div class="cta-hero">
                    <a href="tel:843-212-2969" class="btn-primary">Call Now: 843-212-2969</a>
                    <a href="#reserve" class="btn-secondary">Get Started Today</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Why Summerville -->
    <section class="section light">
        <div class="container">
            <div class="section-header">
                <h2>Why Summerville is Perfect for Direct Mail Marketing</h2>
                <p>Summerville isn't just growing—it's thriving. With over 52,000 households and a median household income of $78,621, this historic "Flower Town in the Pines" represents one of the Charleston area's most attractive markets for local businesses. Target 5,000–10,000 homes per mailing and cover the entire zone over multiple sends.</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number">5K–10K</span>
                    <p>Households Per Mailing</p>
                </div>
                <div class="stat-card">
                    <span class="stat-number">$78,621</span>
                    <p>Median Household Income</p>
                </div>
                <div class="stat-card">
                    <span class="stat-number">38.1</span>
                    <p>Median Age (Prime Working Years)</p>
                </div>
                <div class="stat-card">
                    <span class="stat-number">25 mi</span>
                    <p>From Charleston</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Why Direct Mail Works in Summerville -->
    <section class="section">
        <div style="max-width: 800px; margin: 0 auto; padding: 0 40px;">

            <h2 style="font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 800; color: #0f172a; margin-bottom: 20px; line-height: 1.25;">Why Direct Mail Works in Summerville, SC</h2>
            <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 24px;">Summerville is one of the fastest-growing cities in South Carolina, and that growth is exactly what makes direct mail such a powerful channel here. Thousands of new residents move into the area every year, and they are actively searching for local service providers, restaurants, and retailers. Unlike digital ads that disappear with a scroll, a 9x12 billboard-style postcard sits on a kitchen counter where the entire household can see it. For businesses looking to build name recognition across Summerville, direct mail delivers a tangible impression that digital simply cannot match.</p>
            <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 24px;">What sets Summerville apart from other Lowcountry markets is its unique blend of historic charm and rapid suburban expansion. The town spans three distinct zip codes and includes everything from century-old homes near downtown to brand-new construction in master-planned communities. That diversity means a single direct mail campaign can reach young professionals closing on their first home, established families who have lived here for decades, and retirees drawn to the area's mild climate and walkable downtown.</p>

            <h3 style="font-size: 1.35rem; font-weight: 700; color: #0f172a; margin-bottom: 14px; margin-top: 36px;">Neighborhoods and Communities We Reach</h3>
            <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 24px;">Our Summerville direct mail program covers a wide range of neighborhoods and communities across all three zip codes. In the heart of town you will find the <strong>Summerville Historic District</strong>, including the tree-lined streets around <strong>Azalea Park</strong> and <strong>Downtown Summerville</strong> where foot traffic and community events keep local businesses top of mind. Just to the west, <strong>Knightsville</strong> offers established residential streets with strong homeownership rates, while <strong>Ladson</strong> and <strong>Lincolnville</strong> provide a mix of affordable housing and growing commercial corridors along Highway 78 and Highway 17-A.</p>
            <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 24px;">The newer master-planned communities are where much of the population growth is concentrated. <strong>Cane Bay Plantation</strong> and <strong>Nexton</strong> are two of the top-selling communities in the entire Southeast, attracting families relocating from out of state who need everything from pediatric dentists to lawn care. <strong>Summers Corner</strong>, <strong>Branches</strong>, and <strong>The Ponds</strong> round out the new-construction landscape with thousands of additional rooftops. Meanwhile, the <strong>Pine Forest Country Club</strong> area represents a higher-income demographic that responds well to home service and luxury retail advertising. Every one of these neighborhoods receives mail through the USPS routes our program targets.</p>

            <h3 style="font-size: 1.35rem; font-weight: 700; color: #0f172a; margin-bottom: 14px; margin-top: 36px;">Direct Mail vs. Digital Advertising in Summerville</h3>
            <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 24px;">Digital advertising has its place, but it comes with real limitations for local businesses. Social media feeds are crowded, Google Ads costs continue to rise, and ad blockers strip your message away before it is ever seen. Direct mail has none of those problems. A physical postcard has a 100% delivery rate to the mailbox, an average household lifespan of 17 days, and no algorithm deciding whether your customer sees it. For service-area businesses in Summerville that depend on a local customer base, direct mail consistently outperforms digital channels in cost per lead and overall return on investment.</p>
            <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 24px;">That does not mean you have to choose one or the other. Many of our Summerville advertisers pair their postcard campaign with a QR code that drives traffic to a landing page or special offer, giving them the physical impact of direct mail combined with the tracking capabilities of digital. The result is a measurable, multi-channel strategy that starts at the mailbox and ends with a phone call, website visit, or in-store purchase.</p>

            <h3 style="font-size: 1.35rem; font-weight: 700; color: #0f172a; margin-bottom: 14px; margin-top: 36px;">How the Program Works</h3>
            <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 24px;">Our Summerville direct mail program uses <strong>Every Door Direct Mail (EDDM)</strong> through the United States Postal Service, which allows us to target specific carrier routes without needing a mailing list. You choose your zip codes and routes, and every residential address on those selected routes receives your postcard — typically 5,000–10,000 households per mailing, with 52,000+ homes available across the full Summerville zone over multiple sends. The key differentiator is <strong>exclusive category placement</strong>: only one business per industry appears on each mailing. If you are an HVAC company, no other HVAC company will be on the same card. That exclusivity eliminates the side-by-side comparison that plagues other advertising formats.</p>
            <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 24px;">Every advertiser receives <strong>free professional ad design</strong> as part of the program. Our designers create your ad space on the oversized 9x12 postcard, ensuring it looks polished and grabs attention. We also offer <strong>built-in tracking</strong> through QR codes, unique phone numbers, and custom URLs so you can measure exactly how many leads your campaign generates. From first conversation to mailbox delivery, the entire process is handled for you, and pricing starts at just 5 cents per household reached.</p>

        </div>
    </section>

    <!-- Coverage -->
    <section class="section">
        <div class="container">
            <div class="section-header">
                <h2>Complete Summerville Coverage</h2>
                <p>Target 5,000–10,000 households per mailing across all three Summerville zip codes — 52,000+ homes available across the full zone</p>
            </div>
            
            <div class="zip-codes">
                <div class="zip-card">
                    <h3>29483 - Historic Downtown Summerville</h3>
                    <ul>
                        <li>Established neighborhoods with deep community roots</li>
                        <li>Mix of historic homes and modern developments</li>
                        <li>Strong local business district support</li>
                    </ul>
                </div>
                <div class="zip-card">
                    <h3>29486 - North Summerville Growth Area</h3>
                    <ul>
                        <li>Newer residential developments</li>
                        <li>Young families and professionals</li>
                        <li>High household income demographics</li>
                    </ul>
                </div>
                <div class="zip-card">
                    <h3>29485 - West Summerville Expansion</h3>
                    <ul>
                        <li>Rapidly growing suburban area</li>
                        <li>Family-oriented communities</li>
                        <li>Excellent schools and amenities</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>

    <!-- Features -->
    <section class="section blue">
        <div class="container">
            <div class="section-header">
                <h2>What Makes Our Summerville Direct Mail Different</h2>
                <p>Exclusive placement and maximum impact for your business</p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <span class="feature-icon">🎯</span>
                    <h3>Exclusive Market Position</h3>
                    <p>No competitors allowed on the same postcard! When Summerville residents see your 9"x12" billboard-style ad, you're the ONLY business in your category they'll remember.</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">📬</span>
                    <h3>Maximum Mailbox Impact</h3>
                    <p>Our oversized 9"x12" postcards don't get lost in the mail. They stand out like billboards in every Summerville mailbox, ensuring your message gets noticed.</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">🏠</span>
                    <h3>Targeted Coverage</h3>
                    <p>Target 5,000–10,000 Summerville households per mailing across all three zip codes. With 52,000+ homes in the full zone, build consistent reach over multiple mailings.</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">💰</span>
                    <h3>Unbeatable Value</h3>
                    <p>Starting at just 5¢ per household, you can reach thousands of potential Summerville customers for less than the cost of a single newspaper ad.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Business Types -->
    <section class="section">
        <div class="container">
            <div class="section-header">
                <h2>Perfect for Summerville's Business Community</h2>
                <p>Ideal for local businesses looking to reach their target audience</p>
            </div>
            
            <div class="business-types">
                <div class="business-type">
                    <h3>Home Services</h3>
                    <p>HVAC, plumbing, landscaping, cleaning services</p>
                </div>
                <div class="business-type">
                    <h3>Restaurants & Food</h3>
                    <p>Local eateries, delivery services, catering</p>
                </div>
                <div class="business-type">
                    <h3>Professional Services</h3>
                    <p>Real estate, insurance, financial planning</p>
                </div>
                <div class="business-type">
                    <h3>Retail & Shopping</h3>
                    <p>Local boutiques, specialty stores, services</p>
                </div>
                <div class="business-type">
                    <h3>Health & Wellness</h3>
                    <p>Medical practices, fitness centers, spas</p>
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
                <h2>Summerville Postcard FAQs</h2>
                <p>Common questions about our direct mail service</p>
            </div>
            
            <div style="max-width: 800px; margin: 0 auto;">
                <div class="faq-item">
                    <div class="faq-question">
                        How many households receive the postcard?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        Each mailing targets 5,000–10,000 Summerville households. The full Summerville zone covers 52,000+ homes across ZIPs 29483, 29485, and 29486, which can be reached over multiple mailings.
                    </div>
                </div>
                
                <div class="faq-item">
                    <div class="faq-question">
                        Is my category exclusive?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        Yes. Only one business per category appears on each card.
                    </div>
                </div>
                
                <div class="faq-item">
                    <div class="faq-question">
                        Do you design my ad?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        Yes—ad design is included at no additional cost.
                    </div>
                </div>
                
                <div class="faq-item">
                    <div class="faq-question">
                        How do we measure results?
                        <span style="font-size: 1.2rem;">+</span>
                    </div>
                    <div class="faq-answer">
                        We can include a trackable QR code, unique URL, and phone tracking to measure scans, visits, and calls.
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
                    <a href="/mount-pleasant-direct-mail-marketing.php" style="display: block; padding: 20px; background: white; border-radius: 12px; text-decoration: none; color: #000; border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                        <strong>Mount Pleasant Direct Mail</strong>
                    </a>
                    <a href="/daniel-island-direct-mail-marketing.php" style="display: block; padding: 20px; background: white; border-radius: 12px; text-decoration: none; color: #000; border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                        <strong>Daniel Island & Clements Ferry Direct Mail</strong>
                    </a>
                    <a href="/charleston-direct-mail-marketing.php" style="display: block; padding: 20px; background: white; border-radius: 12px; text-decoration: none; color: #000; border: 1px solid #e2e8f0; transition: all 0.3s ease;">
                        <strong>Charleston Metro Direct Mail</strong>
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