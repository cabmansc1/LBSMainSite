<?php
$location = 'coming-soon';

require_once __DIR__ . '/config.php';
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
        padding: 50px 0;
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
        font-size: clamp(1.75rem, 4vw, 2.5rem);
        font-weight: 800;
        color: white;
        line-height: 1.1;
        margin-bottom: 15px;
    }

    .hero-content p {
        font-size: 1.1rem;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 25px;
        font-weight: 400;
        line-height: 1.5;
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

    /* ===== CURRENT AREAS GRID ===== */
    .current-areas {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 30px;
        margin-bottom: 60px;
    }

    .current-area-card {
        background: white;
        padding: 30px;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
        transition: all 0.3s ease;
        border: 2px solid #22c55e;
        position: relative;
    }

    .current-area-card::before {
        content: "✅ AVAILABLE NOW";
        position: absolute;
        top: -12px;
        left: 20px;
        background: #22c55e;
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
    }

    .current-area-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(34, 197, 94, 0.15);
    }

    .current-area-card h3 {
        font-size: 1.3rem;
        font-weight: 700;
        color: #000000;
        margin-bottom: 15px;
        margin-top: 10px;
    }

    .current-area-card p {
        color: #64748b;
        font-size: 0.95rem;
        line-height: 1.5;
        margin-bottom: 15px;
    }

    .current-area-card a {
        color: #22c55e;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.9rem;
    }

    .current-area-card a:hover {
        text-decoration: underline;
    }

    /* ===== COMING SOON AREAS GRID ===== */
    .coming-soon-areas {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 30px;
        margin-bottom: 60px;
    }

    .coming-soon-card {
        background: white;
        padding: 30px;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
        transition: all 0.3s ease;
        border: 2px solid #f59e0b;
        position: relative;
    }

    .coming-soon-card::before {
        content: "COMING SOON";
        position: absolute;
        top: -12px;
        left: 20px;
        background: #f59e0b;
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
    }

    .coming-soon-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(245, 158, 11, 0.15);
    }

    .coming-soon-card h3 {
        font-size: 1.3rem;
        font-weight: 700;
        color: #000000;
        margin-bottom: 10px;
        margin-top: 10px;
    }

    .coming-soon-card .population {
        color: #38b6ff;
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 10px;
    }

    .coming-soon-card .description {
        color: #64748b;
        font-size: 0.95rem;
        line-height: 1.5;
        margin-bottom: 15px;
    }

    .coming-soon-card .timeline {
        color: #f59e0b;
        font-weight: 600;
        font-size: 0.9rem;
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

        .current-areas, .coming-soon-areas {
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

        div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
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
                <h1>Expanding Across the <span style="color: #000000; font-weight: 900;">Lowcountry</span></h1>
                <p>Direct mail marketing coming to your area soon. Be the first to know when we launch!</p>
                
                <div class="cta-hero">
                    <a href="tel:843-212-2969" class="btn-primary">Call Now: 843-212-2969</a>
                    <a href="#early-access" class="btn-secondary">Get Early Access</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Current Service Areas -->
    <section class="section light">
        <div class="container">
            <div class="section-header">
                <h2>Currently Available</h2>
                <p>Direct mail marketing is live and ready to go in these areas</p>
            </div>
            
            <div class="current-areas">
                <div class="current-area-card">
                    <h3>Summerville</h3>
                    <p>Reach 52,625+ residents in the "Flower Town in the Pines" with our 9×12 billboard-style postcards.</p>
                    <a href="/summerville-direct-mail-marketing.php">View Summerville Pricing →</a>
                </div>
                <div class="current-area-card">
                    <h3>Mount Pleasant</h3>
                    <p>Target 92,600+ affluent residents in Charleston's premier suburb with exclusive category placement.</p>
                    <a href="/mount-pleasant-direct-mail-marketing.php">View Mount Pleasant Pricing →</a>
                </div>
                <div class="current-area-card">
                    <h3>Daniel Island & Clements Ferry</h3>
                    <p>Reach 15,000+ professionals and families in Charleston's newest master-planned communities.</p>
                    <a href="/daniel-island-direct-mail-marketing.php">View Daniel Island Pricing →</a>
                </div>
                <div class="current-area-card">
                    <h3>North Charleston</h3>
                    <p>Reach 115,000+ residents in the Lowcountry's largest and most diverse market across four zip codes.</p>
                    <a href="/north-charleston-direct-mail-marketing.php">View North Charleston Pricing →</a>
                </div>
                <div class="current-area-card">
                    <h3>Moncks Corner</h3>
                    <p>Connect with 12,000+ residents in Berkeley County's tight-knit county seat community.</p>
                    <a href="/moncks-corner-direct-mail-marketing.php">View Moncks Corner Pricing →</a>
                </div>
                <div class="current-area-card">
                    <h3>Goose Creek</h3>
                    <p>Reach 45,000+ residents in one of the fastest-growing suburban communities with strong military presence and young families.</p>
                    <a href="/goose-creek-direct-mail-marketing.php">View Goose Creek Pricing →</a>
                </div>
                <div class="current-area-card">
                    <h3>Sullivans Island</h3>
                    <p>Reach 2,000+ residents in this exclusive beach community with high-income residents and premium market focus.</p>
                    <a href="/sullivans-island-direct-mail-marketing.php">View Sullivans Island Pricing →</a>
                </div>
                <div class="current-area-card">
                    <h3>Isle of Palms</h3>
                    <p>Reach 4,500+ residents in this premium beach destination and resort community with affluent seasonal residents.</p>
                    <a href="/isle-of-palms-direct-mail-marketing.php">View Isle of Palms Pricing →</a>
                </div>
                <div class="current-area-card">
                    <h3>James Island</h3>
                    <p>Reach 12,000+ residents in this island community between downtown Charleston and Folly Beach with a strong local identity.</p>
                    <a href="/james-island-direct-mail-marketing.php">View James Island Pricing →</a>
                </div>
                <div class="current-area-card">
                    <h3>Johns Island</h3>
                    <p>Reach 21,000+ residents in one of the Lowcountry's fastest-growing areas with new developments and expanding business districts.</p>
                    <a href="/johns-island-direct-mail-marketing.php">View Johns Island Pricing →</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Coming Soon Areas -->
    <section class="section">
        <div class="container">
            <div class="section-header">
                <h2>Coming Soon to Your Area</h2>
                <p>We're expanding our direct mail marketing across the Lowcountry. Get early access and priority placement!</p>
            </div>
            
            <div class="coming-soon-areas">
                <div class="coming-soon-card" style="border: 2px dashed #94a3b8; background: #f8fafc;">
                    <h3 style="color: #64748b;">More Areas</h3>
                    <div class="population" style="color: #94a3b8;">Lowcountry Wide</div>
                    <div class="description">Additional Charleston area communities based on demand and early interest. Let us know where you'd like to see us next!</div>
                    <div class="timeline" style="color: #94a3b8;">📧 Request Your Area</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Early Access Form -->
    <section id="early-access" class="section light">
        <div class="container">
            <div class="section-header">
                <h2>Get Early Access</h2>
                <p>Be the first to know when direct mail marketing launches in your area. Early birds get priority placement and special pricing!</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start;">
                <div class="form-container">
                    <form action="process_form.php" method="post">
                        <!-- Hidden field to track this as early access -->
                        <input type="hidden" name="location" value="coming-soon">
                        <input type="hidden" name="form_type" value="early-access">
                        
                        <div class="form-group">
                            <input class="form-control" name="company_name" type="text" placeholder="Business Name *" required>
                        </div>
                        <div class="form-group">
                            <input class="form-control" name="contact_name" type="text" placeholder="Your Name *" required>
                        </div>
                        <div class="form-group">
                            <input class="form-control" name="email" type="email" placeholder="Email *" required>
                        </div>
                        <!-- Phone field removed: SMS opt-in handled by chat widget only.
                        <div class="form-group">
                            <input class="form-control" name="phone" type="tel" placeholder="Phone">
                        </div>
                        -->
                        <div class="form-group">
                            <select class="form-control" name="preferred_area" required>
                                <option value="">Select Your Preferred Area *</option>
                                <option value="west-ashley">West Ashley</option>
                                <option value="ladson">Ladson</option>
                                <option value="hanahan">Hanahan</option>
                                <option value="folly-beach">Folly Beach</option>
                                <option value="kiawah-seabrook">Kiawah / Seabrook</option>
                                <option value="other">Other Area (please specify in notes)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <select class="form-control" name="interest_timeline">
                                <option value="immediate">Ready to start immediately</option>
                                <option value="3-months">Interested in 3 months</option>
                                <option value="6-months">Planning for 6+ months</option>
                                <option value="just-exploring">Just exploring options</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <select class="form-control" name="ad_size_interest">
                                <option value="">Preferred Ad Size</option>
                                <option value="3x2">Small 3x2</option>
                                <option value="3x4">Medium 3x4</option>
                                <option value="4x6">Large 4x6</option>
                                <option value="multiple">Multiple sizes/campaigns</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <input class="form-control" name="notes" type="text" placeholder="Your Business Category (e.g., HVAC, Dental, Landscaping)">
                        </div>
                        <button class="btn-primary" type="submit" style="width: 100%;">Get Early Access</button>
                    </form>
                    <p style="color:#64748b; margin-top:15px; text-align: center;">Questions? Call <a href="tel:843-212-2969" style="color: #38b6ff;">843-212-2969</a></p>
                </div>
                
                <div class="form-container">
                    <h3 style="margin-bottom: 20px; color: #000;">Early Bird Benefits</h3>
                    <ul style="list-style: none; padding: 0; margin-bottom: 30px;">
                        <li style="padding: 8px 0; display: flex; align-items: flex-start; gap: 10px;">
                            <span style="color: #ff8c00; font-weight: bold;">🎯</span>
                            <span><strong>Priority category selection</strong> - Choose your category before public launch</span>
                        </li>
                        <li style="padding: 8px 0; display: flex; align-items: flex-start; gap: 10px;">
                            <span style="color: #ff8c00; font-weight: bold;">💰</span>
                            <span><strong>Early bird pricing</strong> - Special launch rates for first customers</span>
                        </li>
                        <li style="padding: 8px 0; display: flex; align-items: flex-start; gap: 10px;">
                            <span style="color: #ff8c00; font-weight: bold;">📧</span>
                            <span><strong>Launch notifications</strong> - Be first to know when we go live</span>
                        </li>
                        <li style="padding: 8px 0; display: flex; align-items: flex-start; gap: 10px;">
                            <span style="color: #ff8c00; font-weight: bold;">🎨</span>
                            <span><strong>Free design consultation</strong> - Work with our team on your campaign</span>
                        </li>
                        <li style="padding: 8px 0; display: flex; align-items: flex-start; gap: 10px;">
                            <span style="color: #ff8c00; font-weight: bold;">📊</span>
                            <span><strong>Market insights</strong> - Get demographic data for your target area</span>
                        </li>
                    </ul>
                    
                    <h3 style="margin-bottom: 20px; color: #000;">How It Works</h3>
                    <ol style="padding-left: 20px; color: #64748b; line-height: 1.6;">
                        <li style="margin-bottom: 10px;">Submit your early access request</li>
                        <li style="margin-bottom: 10px;">We'll contact you before public launch</li>
                        <li style="margin-bottom: 10px;">Reserve your category with priority placement</li>
                        <li style="margin-bottom: 10px;">Launch your campaign when the area goes live</li>
                    </ol>

                    <!-- Contact Info -->
                    <div class="contact-banner">
                        <h3>Questions About Expansion?</h3>
                        <div class="contact-info">
                            <div class="contact-item">
                                <span>📞</span>
                                <a href="tel:843-212-2969">843-212-2969</a>
                            </div>
                            <div class="contact-item">
                                <span>✉️</span>
                                <a href="mailto:Andrew@LowcountryBusinessSpotlight.com">Andrew@LowcountryBusinessSpotlight.com</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <?php include 'footer.php'; ?>
</body>
</html>