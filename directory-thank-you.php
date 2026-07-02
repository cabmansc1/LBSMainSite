<?php
// Optional: Add any PHP logic here if needed
// For now, this is just the HTML content
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Thank You | Lowcountry Business Spotlight Directory</title>
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
            font-size: clamp(2rem, 4vw, 2.8rem);
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
            font-size: clamp(12px, 2vw, 16px);
            color: #ccc;
            margin-top: 8px;
            font-weight: 400;
        }

        /* ===== MAIN CONTENT ===== */
        .main-content {
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
            min-height: 80vh;
            display: flex;
            align-items: center;
            position: relative;
            overflow: hidden;
            padding: 80px 0;
        }

        .main-content::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.05)"/><circle cx="80" cy="40" r="1" fill="rgba(255,255,255,0.03)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.04)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }

        .content-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 40px;
            text-align: center;
            position: relative;
            z-index: 2;
        }

        .success-icon {
            width: 120px;
            height: 120px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 40px;
            font-size: 60px;
            backdrop-filter: blur(10px);
            border: 3px solid rgba(255, 255, 255, 0.3);
        }

        .main-content h1 {
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 800;
            color: white;
            margin-bottom: 25px;
            line-height: 1.1;
        }

        .main-content .highlight-text {
            color: #000000;
            font-weight: 900;
        }

        .main-content p {
            font-size: 1.3rem;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 40px;
            line-height: 1.6;
        }

        .info-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin: 50px 0;
        }

        .info-card {
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 16px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }

        .info-card:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
            transform: translateY(-5px);
        }

        .info-card h3 {
            color: white;
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 15px;
        }

        .info-card p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 1rem;
            margin-bottom: 0;
            line-height: 1.5;
        }

        .cta-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 40px;
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

        /* ===== ADDITIONAL INFO SECTION ===== */
        .additional-info {
            background: #f8fafc;
            padding: 80px 0;
        }

        .additional-info .container {
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

        .timeline-steps {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
            max-width: 1000px;
            margin: 0 auto;
        }

        .timeline-step {
            background: white;
            padding: 30px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
            border: 1px solid #e2e8f0;
            position: relative;
        }

        .step-number {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.3rem;
            font-weight: 700;
            margin: 0 auto 20px;
        }

        .timeline-step h3 {
            color: #000000;
            font-size: 1.3rem;
            font-weight: 700;
            margin-bottom: 15px;
        }

        .timeline-step p {
            color: #64748b;
            font-size: 1rem;
            line-height: 1.5;
        }

        /* ===== CONTACT SECTION ===== */
        .contact-section {
            background: white;
            padding: 60px 0;
        }

        .contact-banner {
            background: linear-gradient(135deg, #f8fafc 0%, #e6f7ff 100%);
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            max-width: 700px;
            margin: 0 auto;
            border: 2px solid #38b6ff;
        }

        .contact-banner h3 {
            font-size: 1.8rem;
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
            padding: 40px 0;
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
            .content-container,
            .additional-info .container {
                padding: 0 20px;
            }

            .info-cards {
                grid-template-columns: 1fr;
                gap: 20px;
            }

            .cta-buttons {
                flex-direction: column;
                align-items: center;
            }

            .btn-primary,
            .btn-secondary {
                width: 100%;
                max-width: 300px;
            }

            .timeline-steps {
                grid-template-columns: 1fr;
            }

            .contact-info {
                flex-direction: column;
                gap: 20px;
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

    <!-- Main Content -->
    <section class="main-content">
        <div class="content-container">
            <div class="success-icon">✓</div>
            <h1>Thank You for <span class="highlight-text">Joining</span> Our Directory!</h1>
            <p>Your business submission has been received and we're excited to help you connect with local customers across the Lowcountry.</p>
            
            <div class="info-cards">
                <div class="info-card">
                    <h3>📋 Application Received</h3>
                    <p>We've successfully received your business information and preferred plan selection. Our team is reviewing your submission.</p>
                </div>
                
                <div class="info-card">
                    <h3>📞 We'll Contact You Soon</h3>
                    <p>Expect to hear from us within 1-2 business days to confirm details and finalize your directory listing setup.</p>
                </div>
                
                <div class="info-card">
                    <h3>🚀 Early Access Benefits</h3>
                    <p>As a founding member, you'll receive special pricing and priority placement when we officially launch.</p>
                </div>
            </div>

            <div class="cta-buttons">
                <a href="index.php" class="btn-primary">Back to Home</a>
                <a href="advertise.php" class="btn-secondary">Explore Advertising</a>
            </div>
        </div>
    </section>

    <!-- Next Steps Section -->
    <section class="additional-info">
        <div class="container">
            <div class="section-header">
                <h2>What Happens Next?</h2>
                <p>Here's our simple 4-step process to get your business featured in our directory</p>
            </div>
            
            <div class="timeline-steps">
                <div class="timeline-step">
                    <div class="step-number">1</div>
                    <h3>Review & Verification</h3>
                    <p>We review your submission for completeness and verify business information to ensure quality listings.</p>
                </div>
                
                <div class="timeline-step">
                    <div class="step-number">2</div>
                    <h3>Personal Consultation</h3>
                    <p>Our team contacts you to discuss your needs, confirm plan details, and answer any questions you have.</p>
                </div>
                
                <div class="timeline-step">
                    <div class="step-number">3</div>
                    <h3>Listing Creation</h3>
                    <p>We create your professional directory listing with all your business information, photos, and special features.</p>
                </div>
                
                <div class="timeline-step">
                    <div class="step-number">4</div>
                    <h3>Go Live & Analytics</h3>
                    <p>Your listing goes live and you receive access to your dashboard to track views, engagement, and manage your profile.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section class="contact-section">
        <div class="container">
            <div class="contact-banner">
                <h3>Questions? We're Here to Help!</h3>
                <div class="contact-info">
                    <div class="contact-item">
                        <span>📞</span>
                        <a href="tel:843-212-2969">843-212-2969</a>
                    </div>
                    <div class="contact-item">
                        <span>✉️</span>
                        <a href="mailto:andrew@lowcountrybusinessspotlight.com">hello@lbspotlight.com</a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <?php include 'footer.php'; ?>
</body>
</html>