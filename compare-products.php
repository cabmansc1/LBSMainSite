<?php
/**
 * compare-products.php - Spotlight Postcards overview (legacy "compare" page).
 */
require_once 'config.php';

$pageTitle = 'Spotlight Postcards Overview - ' . SITE_NAME;
$pageDesc = 'Spotlight Postcards reach 5,000-10,000 homes in Charleston-area zip codes with exclusive category placement.';

$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
// Indexable: the page is substantive and listed in the sitemap as /compare
// (the old hand-rolled head's noindex contradicted that).
include __DIR__ . '/seo_head.php';
?>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; }

        .page-header {
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
            padding: 50px 20px; text-align: center; color: white;
        }
        .page-header h1 { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 800; margin-bottom: 12px; }
        .page-header p { font-size: 1.15rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }

        .container { max-width: 1100px; margin: 0 auto; padding: 48px 20px; }

        /* Product Cards */
        .products-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 48px; }

        .product-card {
            background: white; border-radius: 16px; border: 2px solid #e2e8f0; overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,.08); }

        .product-card-header { padding: 32px 28px 24px; text-align: center; }
        .product-label { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }

        .product-spotlight .product-label { background: #ff8c00; color: white; }
        .product-neighborhood .product-label { background: #38b6ff; color: white; }

        .product-card h2 { font-size: 1.4rem; font-weight: 800; margin-bottom: 6px; }
        .product-card .product-tagline { color: #64748b; font-size: 0.95rem; }
        .product-card .product-price { font-size: 2rem; font-weight: 800; color: #1e293b; margin-top: 16px; }
        .product-card .product-price small { font-size: 0.85rem; font-weight: 500; color: #64748b; }

        .product-card-body { padding: 0 28px 28px; }

        .feature-list { list-style: none; padding: 0; margin: 0 0 24px; }
        .feature-list li {
            padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.92rem;
            display: flex; align-items: flex-start; gap: 10px;
        }
        .feature-list li:last-child { border: none; }
        .feature-list .check { color: #10b981; font-weight: 700; flex-shrink: 0; font-size: 1rem; }
        .feature-list .label { color: #64748b; font-weight: 500; min-width: 90px; flex-shrink: 0; }
        .feature-list .value { font-weight: 600; }

        .product-cta {
            display: block; width: 100%; padding: 14px; text-align: center; border-radius: 10px;
            font-size: 1rem; font-weight: 700; text-decoration: none; transition: all 0.2s;
        }
        .product-cta:hover { transform: translateY(-1px); }

        .product-spotlight .product-cta { background: #ff8c00; color: white; }
        .product-spotlight .product-cta:hover { box-shadow: 0 6px 20px rgba(255,140,0,.3); }

        .product-neighborhood .product-cta { background: #38b6ff; color: white; }
        .product-neighborhood .product-cta:hover { box-shadow: 0 6px 20px rgba(56,182,255,.3); }

        .product-best { background: #f8fafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 0.88rem; }
        .product-best strong { display: block; margin-bottom: 4px; color: #334155; }
        .product-best span { color: #64748b; }

        /* Comparison Table */
        .comparison-section { margin-bottom: 48px; }
        .comparison-section h2 { font-size: 1.5rem; font-weight: 800; text-align: center; margin-bottom: 8px; }
        .comparison-section > p { text-align: center; color: #64748b; margin-bottom: 32px; }

        .compare-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
        .compare-table th, .compare-table td { padding: 14px 20px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 0.92rem; }
        .compare-table thead th { background: #f8fafc; font-weight: 700; font-size: 0.85rem; color: #374151; }
        .compare-table thead th:first-child { color: #64748b; }
        .compare-table .col-spotlight { color: #ff8c00; font-weight: 700; }
        .compare-table .col-neighborhood { color: #38b6ff; font-weight: 700; }
        .compare-table td:first-child { color: #64748b; font-weight: 500; }

        /* Help CTA */
        .help-section {
            background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 16px;
            padding: 40px; text-align: center; color: white; margin-bottom: 48px;
        }
        .help-section h2 { font-size: 1.4rem; font-weight: 800; margin-bottom: 8px; }
        .help-section p { color: #94a3b8; font-size: 1rem; margin-bottom: 24px; }
        .help-btns { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .help-btns a {
            padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 0.95rem;
            text-decoration: none; transition: all 0.2s;
        }
        .help-btns .btn-call { background: #ff8c00; color: white; }
        .help-btns .btn-email { background: rgba(255,255,255,.1); color: white; border: 1px solid rgba(255,255,255,.2); }
        .help-btns a:hover { transform: translateY(-2px); }

        /* FAQ */
        .faq-section { margin-bottom: 48px; }
        .faq-section h2 { font-size: 1.3rem; font-weight: 800; text-align: center; margin-bottom: 24px; }
        .faq-item { background: white; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
        .faq-q { padding: 16px 20px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; }
        .faq-q:hover { background: #f8fafc; }
        .faq-a { padding: 0 20px 16px; color: #64748b; font-size: 0.92rem; line-height: 1.6; display: none; }
        .faq-item.open .faq-a { display: block; }
        .faq-arrow { transition: transform 0.2s; font-size: 0.8rem; color: #94a3b8; }
        .faq-item.open .faq-arrow { transform: rotate(180deg); }

        @media (max-width: 768px) {
            .products-grid { grid-template-columns: 1fr; }
            .compare-table { font-size: 0.85rem; }
            .compare-table th, .compare-table td { padding: 10px 12px; }
            .help-section { padding: 30px 20px; }
        }
    </style>
</head>
<body>
    <?php include 'header.php'; ?>

    <div class="page-header">
        <h1>Spotlight Postcards Overview</h1>
        <p>9x12 oversized direct mail reaching thousands of Charleston-area homes.</p>
    </div>

    <div class="container">

        <!-- Product Cards -->
        <div class="products-grid">

            <!-- Spotlight Postcards -->
            <div class="product-card product-spotlight">
                <div class="product-card-header">
                    <span class="product-label">Premium Reach</span>
                    <h2>Spotlight Postcards</h2>
                    <p class="product-tagline">9x12 oversized postcards mailed to thousands of homes</p>
                    <div class="product-price">From $199 <small>per mailing</small></div>
                </div>
                <div class="product-card-body">
                    <div class="product-best">
                        <strong>Best for:</strong>
                        <span>Maximum reach, premium branding, businesses wanting full design service</span>
                    </div>
                    <ul class="feature-list">
                        <li><span class="check">&#10003;</span> <span class="label">Format</span> <span class="value">9x12 oversized postcard</span></li>
                        <li><span class="check">&#10003;</span> <span class="label">Reach</span> <span class="value">5,000 - 10,000 homes</span></li>
                        <li><span class="check">&#10003;</span> <span class="label">Exclusivity</span> <span class="value">Only ONE business per category</span></li>
                        <li><span class="check">&#10003;</span> <span class="label">Ad Space</span> <span class="value">3x2, 3x4, or 4x6 sizes</span></li>
                        <li><span class="check">&#10003;</span> <span class="label">Design</span> <span class="value">Free professional ad design</span></li>
                        <li><span class="check">&#10003;</span> <span class="label">Tracking</span> <span class="value">QR codes & URL tracking</span></li>
                    </ul>
                    <a href="/advertise.php" class="product-cta">Explore Spotlight Postcards</a>
                </div>
            </div>

        </div>

        <!-- Help Section -->
        <div class="help-section">
            <h2>Have Questions?</h2>
            <p>We're happy to help you figure out the right campaign for your business and budget.</p>
            <div class="help-btns">
                <a href="tel:843-212-2969" class="btn-call">Call (843) 212-2969</a>
                <a href="mailto:hello@lbspotlight.com" class="btn-email">Email Us</a>
            </div>
        </div>

    </div>

    <?php include 'footer.php'; ?>
</body>
</html>
