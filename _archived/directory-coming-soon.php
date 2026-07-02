<?php
$success = isset($_GET['success']) && $_GET['success'] == '1';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Directory - Coming Soon | Lowcountry Business Spotlight</title>
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

        /* ===== LOGO HEADER ===== */
        .logo-header {
            background: #000;
            padding: 15px 0;
            border-bottom: 1px solid #222;
        }

        .logo-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 40px;
            text-align: center;
        }

        .brand-wordmark {
            font-family: 'Inter', sans-serif;
            font-weight: 800;
            font-size: clamp(2.5rem, 5vw, 3.5rem);
            margin: 0;
            line-height: 1.2;
        }

        .brand-wordmark .lowcountry {
            color: #38b6ff;
        }

        .brand-wordmark .business {
            color: white;
            margin: 0 8px;
        }

        .brand-wordmark .spotlight {
            color: #38b6ff;
        }

        .brand-tagline {
            font-family: 'Shadows Into Light Two', cursive;
            font-size: clamp(14px, 2vw, 18px);
            color: #ccc;
            margin-top: 8px;
            font-weight: 400;
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

        .hero h1 {
            font-size: clamp(3rem, 6vw, 5rem);
            font-weight: 800;
            color: white;
            line-height: 1.1;
            margin-bottom: 20px;
        }

        .hero .highlight-text {
            color: #000000;
            font-weight: 900;
        }

        .hero p {
            font-size: 1.4rem;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 50px;
            font-weight: 400;
            line-height: 1.6;
            max-width: 700px;
            margin-left: auto;
            margin-right: auto;
        }

        .cta-hero {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 40px;
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

        /* ===== SECTIONS ===== */
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

        /* ===== FEATURES GRID ===== */
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 40px;
            margin-bottom: 60px;
        }

        .feature-card {
            background: white;
            padding: 40px 30px;
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

        /* ===== TIMELINE ===== */
        .timeline {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
            border: 1px solid #e2e8f0;
            max-width: 800px;
            margin: 0 auto;
        }

        .timeline h3 {
            color: #000000;
            margin-bottom: 30px;
            font-size: 1.8rem;
            font-weight: 700;
            text-align: center;
        }

        .timeline-item {
            display: flex;
            align-items: center;
            margin: 20px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 12px;
            transition: all 0.3s ease;
        }

        .timeline-item:hover {
            transform: translateX(5px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .timeline-date {
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-weight: 700;
            margin-right: 25px;
            min-width: 140px;
            text-align: center;
            font-size: 1rem;
        }

        .timeline-description {
            font-size: 1.1rem;
            color: #333;
            font-weight: 500;
        }

        /* ===== CTA SECTION ===== */
        .cta-section {
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
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

        /* ===== NOTIFY SECTION ===== */
        .notify-section {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            max-width: 700px;
            margin: 50px auto 0;
            text-align: center;
        }

        .notify-section h3 {
            color: white;
            margin-bottom: 20px;
            font-size: 1.8rem;
            font-weight: 700;
        }

        .notify-section p {
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 30px;
            font-size: 1.1rem;
        }

        .email-signup {
            display: flex;
            gap: 15px;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
        }

        .email-input {
            flex: 1;
            min-width: 300px;
            padding: 15px 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            font-size: 1.1rem;
            outline: none;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            backdrop-filter: blur(10px);
        }

        .email-input::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }

        .email-input:focus {
            border-color: rgba(255, 255, 255, 0.6);
            background: rgba(255, 255, 255, 0.2);
        }

        .email-button {
            padding: 15px 30px;
            background: linear-gradient(135deg, #ff8c00, #ff6b00);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(234, 88, 12, 0.3);
        }

        .email-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(234, 88, 12, 0.4);
            background: linear-gradient(135deg, #e07800, #e05500);
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
            .hero-container,
            .container {
                padding: 0 20px;
            }

            .cta-hero {
                flex-direction: column;
                align-items: center;
            }

            .btn-primary, .btn-secondary {
                width: 100%;
                max-width: 300px;
                text-align: center;
            }

            .features-grid {
                grid-template-columns: 1fr;
                gap: 30px;
            }

            .timeline {
                padding: 30px 20px;
            }

            .timeline-item {
                flex-direction: column;
                text-align: center;
                gap: 15px;
            }

            .timeline-date {
                margin-right: 0;
                margin-bottom: 10px;
            }

            .email-signup {
                flex-direction: column;
            }

            .email-input {
                min-width: 100%;
            }

            .footer-content {
                flex-direction: column;
                gap: 20px;
            }

            .footer-left,
            .footer-right {
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <?php if ($success): ?>
<div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 20px 30px; border-radius: 12px; box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3); z-index: 9999; font-weight: 600; animation: slideIn 0.3s ease;">
    ✓ Success! You'll be notified when we launch.
</div>
<style>
@keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
</style>
<script>
// Auto-hide success message after 5 seconds
setTimeout(function() {
    const successMsg = document.querySelector('div[style*="position: fixed"]');
    if (successMsg) {
        successMsg.style.opacity = '0';
        successMsg.style.transform = 'translateX(400px)';
        setTimeout(() => successMsg.remove(), 300);
    }
}, 5000);
</script>
<?php endif; ?>
    <?php include 'nav.php'; ?>
    <!-- Logo Header -->
    <div class="logo-header">
        <div class="logo-container">
            <h1 class="brand-wordmark">
                <span class="lowcountry">Lowcountry</span>
                <span class="business">Business</span>
                <span class="spotlight">Spotlight</span>
            </h1>
            <p class="brand-tagline">Bringing Local Businesses Together To Share The Cost of Advertising</p>
        </div>
    </div>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-container">
            <h1>Business Directory <span class="highlight-text"><br>Coming Soon!</span></h1>
            <p>Your comprehensive guide to local businesses in the Lowcountry is launching soon. Get discovered by thousands of potential customers!</p>
            
            <div class="cta-hero">
                <a href="#business-signup" class="btn-primary">List Your Business</a>
                <a href="mailto:andrew@lowcountrybusinessspotlight.com" class="btn-secondary">Contact Us</a>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="section light">
        <div class="container">
            <div class="section-header">
                <h2>What's Coming</h2>
                <p>A powerful platform to connect local businesses with customers across the Lowcountry</p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">🏢</div>
                    <h3>Local Business Listings</h3>
                    <p>Discover and connect with businesses across Summerville, Mount Pleasant, Daniel Island, and Charleston.</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🔍</div>
                    <h3>Advanced Search & Filter</h3>
                    <p>Find exactly what you're looking for with our powerful search engine and category filters.</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">⭐</div>
                    <h3>Reviews & Ratings</h3>
                    <p>Read authentic reviews and ratings from fellow community members to make informed decisions.</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📱</div>
                    <h3>Mobile Optimized</h3>
                    <p>Access the directory anywhere, anytime with our responsive mobile-first design.</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🎯</div>
                    <h3>Category Spotlights</h3>
                    <p>Directory spotlights on Socials - just like our postcard campaigns.</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <h3>Business Analytics</h3>
                    <p>Track views, clicks, and customer engagement with detailed analytics dashboard.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Timeline Section -->
    <section class="section">
        <div class="container">
            <div class="section-header">
                <h2>Launch Timeline</h2>
                <p>Here's when you can expect each phase of our directory rollout</p>
            </div>
            
            <div class="timeline">
                <div class="timeline-item">
                    <div class="timeline-date">Q4 2025</div>
                    <div class="timeline-description">Beta testing with select local businesses and early adopters</div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-date">Q1 2026</div>
                    <div class="timeline-description">Public launch with full feature set and customer reviews</div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-date">Q2 2026</div>
                    <div class="timeline-description">Mobile app release for iOS and Android platforms</div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-date">Q3 2026</div>
                    <div class="timeline-description">Advanced features: events, special offers, and enhanced analytics</div>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section section" id="business-signup">
        <div class="container">
            <div class="cta-content">
                <h2>Ready to Join Our Directory?</h2>
                <p>Get your business listed early and take advantage of our launch promotions. Limited spots available for founding members!</p>
                <a href="directory-signup.php" class="btn-primary">List Your Business</a>
                
                <div class="notify-section">
                    <h3>🔔 Stay Updated</h3>
                    <p>Be the first to know when we launch! Join our mailing list for exclusive updates and early access.</p>
                    <form class="email-signup" action="process_directory_signup.php" method="POST">
                        <input type="email" class="email-input" name="email" placeholder="Enter your email address" required>
                        <input type="hidden" name="form_type" value="directory_notification">
                        <button type="submit" class="email-button">Notify Me</button>
                    </form>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-left">
                <p>© 2025-2026 by Lowcountry Business Spotlight - (843) 212-2969</p>
            </div>
            <div class="footer-right">
                <a href="https://ourlocalspotlight.com" target="_blank" rel="noopener noreferrer">
                    <img src="images/LOCALSPOTLIGHTBADGE.png" alt="Our Local Spotlight Logo">
                </a>
            </div>
        </div>
    </footer>

    <script>
        // Add smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    </script>
</body>
</html>