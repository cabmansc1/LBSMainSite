<?php
/**
 * pricing.php - Consolidated pricing page for all products
 */
require_once 'config.php';
require_once 'pricing_config.php';

$pageTitle = 'Pricing - ' . SITE_NAME;
$pageDesc = 'Transparent pricing for all Lowcountry Business Spotlight products: Spotlight Postcards from $249 and free directory listings. No hidden fees.';

$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
include __DIR__ . '/seo_head.php';
?>
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; }

        .page-header {
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
            padding: 50px 20px; text-align: center; color: white;
        }
        .page-header h1 { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 800; margin-bottom: 12px; }
        .page-header p { font-size: 1.15rem; opacity: 0.9; max-width: 650px; margin: 0 auto; line-height: 1.6; }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

        /* Section nav tabs */
        .section-nav {
            display: flex; justify-content: center; gap: 8px; padding: 32px 20px 0; flex-wrap: wrap;
        }
        .section-nav a {
            padding: 10px 24px; border-radius: 24px; font-weight: 700; font-size: 0.9rem;
            text-decoration: none; border: 2px solid #e2e8f0; color: #64748b; background: white;
            transition: all 0.2s;
        }
        .section-nav a:hover { border-color: #38b6ff; color: #38b6ff; }
        .section-nav a.nav-spotlight { border-color: #ff8c00; color: #ff8c00; background: #fff7ed; }
        .section-nav a.nav-directory { border-color: #10b981; color: #059669; background: #f0fdf4; }

        /* Product sections */
        .product-section { padding: 48px 0; }
        .product-section + .product-section { padding-top: 0; }

        .section-header { text-align: center; margin-bottom: 36px; }
        .section-header .section-badge {
            display: inline-block; padding: 4px 14px; border-radius: 20px;
            font-size: 0.78rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.5px; margin-bottom: 12px;
        }
        .section-header h2 { font-size: 1.75rem; font-weight: 800; margin-bottom: 8px; }
        .section-header p { color: #64748b; font-size: 1.05rem; max-width: 600px; margin: 0 auto; }

        /* Spotlight pricing */
        .badge-spotlight { background: #ff8c00; color: white; }
        .badge-directory { background: #10b981; color: white; }

        /* Reach toggle */
        .reach-toggle {
            display: flex; justify-content: center; gap: 0; margin-bottom: 32px;
            background: #f1f5f9; border-radius: 12px; padding: 4px; max-width: 360px; margin-left: auto; margin-right: auto;
        }
        .reach-btn {
            flex: 1; padding: 12px 20px; border: none; border-radius: 10px; font-weight: 700;
            font-size: 0.92rem; cursor: pointer; background: transparent; color: #64748b;
            transition: all 0.2s; font-family: inherit;
        }
        .reach-btn.active { background: white; color: #1e293b; box-shadow: 0 2px 8px rgba(0,0,0,.08); }

        /* Price cards grid */
        .price-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 900px; margin: 0 auto; }

        .price-card {
            background: white; border-radius: 16px; border: 2px solid #e2e8f0; padding: 32px 24px;
            text-align: center; transition: all 0.25s; position: relative;
        }
        .price-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,.08); }
        .price-card.popular {
            border-color: #ff8c00; box-shadow: 0 8px 24px rgba(255,140,0,.15);
        }
        .popular-tag {
            position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
            background: #ff8c00; color: white; padding: 4px 16px; border-radius: 20px;
            font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
            white-space: nowrap;
        }

        .price-card .card-size { font-size: 1.1rem; font-weight: 700; color: #334155; margin-bottom: 4px; }
        .price-card .card-desc { font-size: 0.85rem; color: #94a3b8; margin-bottom: 16px; }
        .price-card .card-price { font-size: 2.5rem; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
        .price-card .card-per { font-size: 0.85rem; color: #64748b; margin-bottom: 20px; }
        .price-card .card-cph { font-size: 0.82rem; color: #10b981; font-weight: 600; margin-bottom: 20px; }

        .price-card ul { list-style: none; text-align: left; margin-bottom: 24px; }
        .price-card ul li {
            padding: 8px 0; font-size: 0.88rem; color: #475569; display: flex; align-items: flex-start; gap: 8px;
            border-bottom: 1px solid #f8fafc;
        }
        .price-card ul li:last-child { border: none; }
        .price-card .check { color: #10b981; font-weight: 700; flex-shrink: 0; }

        .price-card .card-cta {
            display: block; padding: 14px; border-radius: 10px; font-weight: 700; font-size: 0.95rem;
            text-decoration: none; text-align: center; transition: all 0.2s;
        }
        .price-card .card-cta:hover { transform: translateY(-1px); }
        .cta-spotlight { background: #ff8c00; color: white; }
        .cta-spotlight:hover { box-shadow: 0 6px 20px rgba(255,140,0,.3); }
        .cta-directory { background: #10b981; color: white; }
        .cta-directory:hover { box-shadow: 0 6px 20px rgba(16,185,129,.3); }
        .cta-outline { background: transparent; border: 2px solid #e2e8f0; color: #334155; }
        .cta-outline:hover { border-color: #38b6ff; color: #38b6ff; }


        /* Directory pricing */
        .dir-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 900px; margin: 0 auto; }

        /* Included section */
        .included-section {
            background: white; border-radius: 16px; border: 2px solid #e2e8f0;
            padding: 36px; max-width: 900px; margin: 36px auto 0;
        }
        .included-section h3 { font-size: 1.1rem; font-weight: 800; text-align: center; margin-bottom: 20px; }
        .included-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .included-item { display: flex; align-items: flex-start; gap: 10px; font-size: 0.9rem; }
        .included-item .icon { font-size: 1.2rem; flex-shrink: 0; }

        /* Divider */
        .section-divider { border: none; border-top: 2px solid #e2e8f0; max-width: 200px; margin: 0 auto; }

        /* Help CTA */
        .help-section {
            background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 16px;
            padding: 40px; text-align: center; color: white; margin: 48px auto; max-width: 900px;
        }
        .help-section h2 { font-size: 1.4rem; font-weight: 800; margin-bottom: 8px; }
        .help-section p { color: #94a3b8; font-size: 1rem; margin-bottom: 24px; max-width: 500px; margin-left: auto; margin-right: auto; }
        .help-btns { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .help-btns a {
            padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 0.95rem;
            text-decoration: none; transition: all 0.2s;
        }
        .help-btns .btn-call { background: #ff8c00; color: white; }
        .help-btns .btn-email { background: rgba(255,255,255,.1); color: white; border: 1px solid rgba(255,255,255,.2); }
        .help-btns a:hover { transform: translateY(-2px); }

        /* FAQ */
        .faq-section { max-width: 700px; margin: 0 auto 48px; }
        .faq-section h2 { font-size: 1.3rem; font-weight: 800; text-align: center; margin-bottom: 24px; }
        .faq-item { background: white; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
        .faq-q { padding: 16px 20px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; }
        .faq-q:hover { background: #f8fafc; }
        .faq-a { padding: 0 20px 16px; color: #64748b; font-size: 0.92rem; line-height: 1.6; display: none; }
        .faq-item.open .faq-a { display: block; }
        .faq-arrow { transition: transform 0.2s; font-size: 0.8rem; color: #94a3b8; }
        .faq-item.open .faq-arrow { transform: rotate(180deg); }

        /* Responsive */
        @media (max-width: 768px) {
            .price-cards, .dir-cards { grid-template-columns: 1fr; max-width: 400px; }
            .included-grid { grid-template-columns: 1fr; }
            .help-section { margin: 48px 20px; padding: 30px 20px; }
        }
    </style>
</head>
<body>
    <?php include 'header.php'; ?>

    <div class="page-header">
        <h1>Simple, Transparent Pricing</h1>
        <p>Everything you need to reach local households. No hidden fees, no long-term contracts, and free ad design on Spotlight Postcards.</p>
    </div>

    <!-- Jump nav -->
    <div class="section-nav">
        <a href="#spotlight" class="nav-spotlight">Spotlight Postcards</a>
        <a href="#directory" class="nav-directory">Directory Listings</a>
    </div>

    <div class="container">

        <!-- ==================== SPOTLIGHT POSTCARDS ==================== -->
        <div class="product-section" id="spotlight">
            <div class="section-header">
                <span class="section-badge badge-spotlight">Premium Reach</span>
                <h2>Spotlight Postcards</h2>
                <p>9x12 oversized postcards mailed directly to homes across the Charleston Lowcountry. Free professional ad design included.</p>
            </div>

            <!-- Reach toggle -->
            <div class="reach-toggle">
                <button class="reach-btn active" onclick="showReach('5k', this)">5,000 Homes</button>
                <button class="reach-btn" onclick="showReach('10k', this)">10,000 Homes</button>
            </div>

            <!-- 5K pricing -->
            <div class="price-cards" id="reach-5k">
                <div class="price-card">
                    <div class="card-size"><?= $pricing['5k']['small']['size'] ?></div>
                    <div class="card-desc"><?= $pricing['5k']['small']['description'] ?></div>
                    <div class="card-price">$<?= $pricing['5k']['small']['price'] ?></div>
                    <div class="card-per">per mailing</div>
                    <div class="card-cph"><?= number_format($pricing['5k']['small']['price'] / 5000, 3) ?>&cent; per home</div>
                    <ul>
                        <li><span class="check">&#10003;</span> Exclusive category placement</li>
                        <li><span class="check">&#10003;</span> Free professional ad design</li>
                        <li><span class="check">&#10003;</span> QR code &amp; URL tracking</li>
                        <li><span class="check">&#10003;</span> Social media spotlight post</li>
                    </ul>
                    <a href="/advertise.php" class="card-cta cta-spotlight">Get Started</a>
                </div>

                <div class="price-card popular">
                    <span class="popular-tag">Most Popular</span>
                    <div class="card-size"><?= $pricing['5k']['medium']['size'] ?></div>
                    <div class="card-desc"><?= $pricing['5k']['medium']['description'] ?></div>
                    <div class="card-price">$<?= $pricing['5k']['medium']['price'] ?></div>
                    <div class="card-per">per mailing</div>
                    <div class="card-cph"><?= number_format($pricing['5k']['medium']['price'] / 5000, 3) ?>&cent; per home</div>
                    <ul>
                        <li><span class="check">&#10003;</span> Exclusive category placement</li>
                        <li><span class="check">&#10003;</span> Free professional ad design</li>
                        <li><span class="check">&#10003;</span> QR code &amp; URL tracking</li>
                        <li><span class="check">&#10003;</span> Social media spotlight post</li>
                    </ul>
                    <a href="/advertise.php" class="card-cta cta-spotlight">Get Started</a>
                </div>

                <div class="price-card">
                    <div class="card-size"><?= $pricing['5k']['large']['size'] ?></div>
                    <div class="card-desc"><?= $pricing['5k']['large']['description'] ?></div>
                    <div class="card-price">$<?= $pricing['5k']['large']['price'] ?></div>
                    <div class="card-per">per mailing</div>
                    <div class="card-cph"><?= number_format($pricing['5k']['large']['price'] / 5000, 3) ?>&cent; per home</div>
                    <ul>
                        <li><span class="check">&#10003;</span> Exclusive category placement</li>
                        <li><span class="check">&#10003;</span> Free professional ad design</li>
                        <li><span class="check">&#10003;</span> QR code &amp; URL tracking</li>
                        <li><span class="check">&#10003;</span> Social media spotlight post</li>
                    </ul>
                    <a href="/advertise.php" class="card-cta cta-spotlight">Get Started</a>
                </div>
            </div>

            <!-- 10K pricing -->
            <div class="price-cards" id="reach-10k" style="display: none;">
                <div class="price-card">
                    <div class="card-size"><?= $pricing['10k']['small']['size'] ?></div>
                    <div class="card-desc"><?= $pricing['10k']['small']['description'] ?></div>
                    <div class="card-price">$<?= $pricing['10k']['small']['price'] ?></div>
                    <div class="card-per">per mailing</div>
                    <div class="card-cph"><?= number_format($pricing['10k']['small']['price'] / 10000, 3) ?>&cent; per home</div>
                    <ul>
                        <li><span class="check">&#10003;</span> Exclusive category placement</li>
                        <li><span class="check">&#10003;</span> Free professional ad design</li>
                        <li><span class="check">&#10003;</span> QR code &amp; URL tracking</li>
                        <li><span class="check">&#10003;</span> Social media spotlight post</li>
                    </ul>
                    <a href="/advertise.php" class="card-cta cta-spotlight">Get Started</a>
                </div>

                <div class="price-card popular">
                    <span class="popular-tag">Most Popular</span>
                    <div class="card-size"><?= $pricing['10k']['medium']['size'] ?></div>
                    <div class="card-desc"><?= $pricing['10k']['medium']['description'] ?></div>
                    <div class="card-price">$<?= $pricing['10k']['medium']['price'] ?></div>
                    <div class="card-per">per mailing</div>
                    <div class="card-cph"><?= number_format($pricing['10k']['medium']['price'] / 10000, 3) ?>&cent; per home</div>
                    <ul>
                        <li><span class="check">&#10003;</span> Exclusive category placement</li>
                        <li><span class="check">&#10003;</span> Free professional ad design</li>
                        <li><span class="check">&#10003;</span> QR code &amp; URL tracking</li>
                        <li><span class="check">&#10003;</span> Social media spotlight post</li>
                    </ul>
                    <a href="/advertise.php" class="card-cta cta-spotlight">Get Started</a>
                </div>

                <div class="price-card">
                    <div class="card-size"><?= $pricing['10k']['large']['size'] ?></div>
                    <div class="card-desc"><?= $pricing['10k']['large']['description'] ?></div>
                    <div class="card-price">$<?= $pricing['10k']['large']['price'] ?></div>
                    <div class="card-per">per mailing</div>
                    <div class="card-cph"><?= number_format($pricing['10k']['large']['price'] / 10000, 3) ?>&cent; per home</div>
                    <ul>
                        <li><span class="check">&#10003;</span> Exclusive category placement</li>
                        <li><span class="check">&#10003;</span> Free professional ad design</li>
                        <li><span class="check">&#10003;</span> QR code &amp; URL tracking</li>
                        <li><span class="check">&#10003;</span> Social media spotlight post</li>
                    </ul>
                    <a href="/advertise.php" class="card-cta cta-spotlight">Get Started</a>
                </div>
            </div>

            <div class="included-section">
                <h3>Included With Every Spotlight Postcard</h3>
                <div class="included-grid">
                    <div class="included-item">
                        <span class="icon">&#127912;</span>
                        <div><strong>Free Ad Design</strong><br><span style="color:#64748b; font-size:0.85rem;">Our team designs your ad at no extra charge</span></div>
                    </div>
                    <div class="included-item">
                        <span class="icon">&#128274;</span>
                        <div><strong>Category Exclusivity</strong><br><span style="color:#64748b; font-size:0.85rem;">Only ONE business per category per mailing</span></div>
                    </div>
                    <div class="included-item">
                        <span class="icon">&#128206;</span>
                        <div><strong>QR &amp; URL Tracking</strong><br><span style="color:#64748b; font-size:0.85rem;">Track visits and engagement from your ad</span></div>
                    </div>
                    <div class="included-item">
                        <span class="icon">&#128247;</span>
                        <div><strong>Social Spotlight</strong><br><span style="color:#64748b; font-size:0.85rem;">Featured post on our social media channels</span></div>
                    </div>
                    <div class="included-item">
                        <span class="icon">&#128205;</span>
                        <div><strong>Choose Your Area</strong><br><span style="color:#64748b; font-size:0.85rem;">9 service areas across the Lowcountry</span></div>
                    </div>
                    <div class="included-item">
                        <span class="icon">&#128176;</span>
                        <div><strong>Multi-Zone Discounts</strong><br><span style="color:#64748b; font-size:0.85rem;">Bundle multiple areas and save</span></div>
                    </div>
                </div>
            </div>
        </div>

        <hr class="section-divider" style="margin-top: 48px;">

        <!-- ==================== DIRECTORY LISTINGS ==================== -->
        <div class="product-section" id="directory">
            <div class="section-header">
                <span class="section-badge badge-directory">Online Presence</span>
                <h2>Business Directory Listings</h2>
                <p>Get your business listed in the Lowcountry's growing local directory. Free to start, upgrade for more visibility.</p>
            </div>

            <div class="dir-cards">
                <!-- Basic -->
                <div class="price-card">
                    <div class="card-size">Basic</div>
                    <div class="card-desc">Get listed for free</div>
                    <div class="card-price">Free</div>
                    <div class="card-per">forever</div>
                    <ul>
                        <li><span class="check">&#10003;</span> Business name &amp; contact info</li>
                        <li><span class="check">&#10003;</span> Category listing</li>
                        <li><span class="check">&#10003;</span> Location on directory</li>
                        <li><span class="check">&#10003;</span> Logo/photo upload</li>
                        <li><span style="color:#cbd5e1;">&#10007;</span> <span style="color:#94a3b8;">Business hours</span></li>
                        <li><span style="color:#cbd5e1;">&#10007;</span> <span style="color:#94a3b8;">Gallery photos</span></li>
                        <li><span style="color:#cbd5e1;">&#10007;</span> <span style="color:#94a3b8;">Featured placement</span></li>
                    </ul>
                    <a href="/directory-signup.php" class="card-cta cta-outline">List for Free</a>
                </div>

                <!-- Featured -->
                <div class="price-card popular">
                    <span class="popular-tag">Best Value</span>
                    <div class="card-size">Featured</div>
                    <div class="card-desc">Stand out from the crowd</div>
                    <div class="card-price">$29.99</div>
                    <div class="card-per">per month</div>
                    <ul>
                        <li><span class="check">&#10003;</span> Everything in Basic</li>
                        <li><span class="check">&#10003;</span> Featured badge</li>
                        <li><span class="check">&#10003;</span> Priority placement</li>
                        <li><span class="check">&#10003;</span> Business hours display</li>
                        <li><span class="check">&#10003;</span> Up to 8 gallery photos</li>
                        <li><span class="check">&#10003;</span> Special offers &amp; coupons</li>
                        <li><span class="check">&#10003;</span> Social media links</li>
                    </ul>
                    <a href="/register.php?plan=featured" class="card-cta cta-directory">Get Featured</a>
                </div>

                <!-- Elite -->
                <div class="price-card">
                    <div class="card-size">Elite</div>
                    <div class="card-desc">Maximum visibility</div>
                    <div class="card-price">$39.99</div>
                    <div class="card-per">per month</div>
                    <ul>
                        <li><span class="check">&#10003;</span> Everything in Featured</li>
                        <li><span class="check">&#10003;</span> Top of category results</li>
                        <li><span class="check">&#10003;</span> Extended description</li>
                        <li><span class="check">&#10003;</span> Analytics dashboard</li>
                        <li><span class="check">&#10003;</span> Lead notifications</li>
                        <li><span class="check">&#10003;</span> Banner photo</li>
                        <li><span class="check">&#10003;</span> Priority support</li>
                    </ul>
                    <a href="/register.php?plan=elite" class="card-cta cta-directory">Go Elite</a>
                </div>
            </div>
        </div>

        <!-- Help Section -->
        <div class="help-section">
            <h2>Not Sure Where to Start?</h2>
            <p>We'll help you pick the right product and reach for your business and budget. No pressure, no commitment.</p>
            <div class="help-btns">
                <a href="tel:843-212-2969" class="btn-call">Call (843) 212-2969</a>
                <a href="mailto:hello@lbspotlight.com" class="btn-email">Email Us</a>
            </div>
        </div>

        <!-- FAQ -->
        <div class="faq-section">
            <h2>Pricing Questions</h2>

            <div class="faq-item">
                <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
                    Are there any hidden fees or setup costs?
                    <span class="faq-arrow">&#9660;</span>
                </div>
                <div class="faq-a">No. The prices shown are what you pay. Spotlight Postcards include free ad design, and there are no setup fees or hidden charges on any product.</div>
            </div>

            <div class="faq-item">
                <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
                    Do I need to sign a long-term contract?
                    <span class="faq-arrow">&#9660;</span>
                </div>
                <div class="faq-a">No contracts. Spotlight Postcards are pay-per-mailing. Directory listings are month-to-month and can be cancelled anytime.</div>
            </div>

            <div class="faq-item">
                <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
                    Can I run multiple products at the same time?
                    <span class="faq-arrow">&#9660;</span>
                </div>
                <div class="faq-a">Absolutely. Many businesses combine a Spotlight Postcard for broad reach with a directory listing for ongoing online visibility.</div>
            </div>

            <div class="faq-item">
                <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
                    What's the cheapest way to get started?
                    <span class="faq-arrow">&#9660;</span>
                </div>
                <div class="faq-a">A free Basic directory listing costs nothing. For direct mail, Spotlight Postcards start at $249 for 5,000 homes.</div>
            </div>

            <div class="faq-item">
                <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
                    Do you offer discounts for multiple mailings?
                    <span class="faq-arrow">&#9660;</span>
                </div>
                <div class="faq-a">Yes! We offer multi-zone bundles when you advertise in multiple service areas on the same mailing, and multi-card commitments for repeat advertisers. Contact us for bundle pricing.</div>
            </div>

            <div class="faq-item">
                <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
                    What does "category exclusivity" mean?
                    <span class="faq-arrow">&#9660;</span>
                </div>
                <div class="faq-a">It means only one business per category appears on each mailing. If you're a plumber on our Summerville postcard, no other plumber will be on that same card. Your ad has zero direct competition.</div>
            </div>
        </div>

    </div>

    <?php include 'footer.php'; ?>

    <script>
    function showReach(tier, btn) {
        document.getElementById('reach-5k').style.display = tier === '5k' ? 'grid' : 'none';
        document.getElementById('reach-10k').style.display = tier === '10k' ? 'grid' : 'none';
        document.querySelectorAll('.reach-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
    }
    </script>
</body>
</html>
