<?php
require_once 'config.php';
$csrf_token = generateCSRFToken();
$hideChatWidget = true; // A2P 10DLC: form collects phone, suppress competing chat widget opt-in
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Join Our Business Directory | Lowcountry Business Spotlight</title>
    <meta name="description" content="List your business in the Lowcountry Business Spotlight directory. Get discovered by local customers in Charleston, Summerville, Mount Pleasant and Daniel Island.">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://www.lowcountrybusinessspotlight.com/directory-signup.php">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.lowcountrybusinessspotlight.com/directory-signup.php">
    <meta property="og:title" content="Join Our Business Directory | Lowcountry Business Spotlight">
    <meta property="og:description" content="List your business in the Lowcountry Business Spotlight directory. Get discovered by local customers in Charleston.">
    <meta property="og:image" content="https://www.lowcountrybusinessspotlight.com/images/og-image.jpg">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="https://www.lowcountrybusinessspotlight.com/directory-signup.php">
    <meta name="twitter:title" content="Join Our Business Directory | Lowcountry Business Spotlight">
    <meta name="twitter:description" content="List your business in the Lowcountry Business Spotlight directory. Get discovered by local customers.">
    <meta name="twitter:image" content="https://www.lowcountrybusinessspotlight.com/images/og-image.jpg">

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
            background-color: #f8fafc;
            overflow-x: hidden;
        }

        /* ===== HEADER SECTION ===== */
        .page-header {
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
            padding: 60px 0;
            position: relative;
            overflow: hidden;
        }

        .page-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.05)"/><circle cx="80" cy="40" r="1" fill="rgba(255,255,255,0.03)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.04)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }

        .page-header-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 40px;
            text-align: center;
            position: relative;
            z-index: 2;
        }

        .page-header h1 {
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 800;
            color: white;
            margin-bottom: 15px;
        }

        .page-header .highlight-text {
            color: #000000;
            font-weight: 900;
        }

        .page-header p {
            font-size: 1.3rem;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 400;
            max-width: 600px;
            margin: 0 auto;
        }

        /* ===== FORM CONTAINER ===== */
        .form-wrapper {
            max-width: 900px;
            margin: -50px auto 60px;
            position: relative;
            z-index: 10;
        }

        .form-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }

        .form-content {
            padding: 60px 50px;
        }

        .form-section {
            margin-bottom: 50px;
        }

        .section-title {
            font-size: 1.8rem;
            font-weight: 800;
            color: #000000;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 3px solid #38b6ff;
            position: relative;
        }

        .section-title::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 0;
            width: 60px;
            height: 3px;
            background: linear-gradient(135deg, #ff8c00, #ff6b00);
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
        }

        .form-group {
            margin-bottom: 25px;
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
            font-size: 1rem;
        }

        .required {
            color: #dc2626;
        }

        input, select, textarea {
            width: 100%;
            padding: 15px 18px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 1rem;
            font-family: 'Inter', sans-serif;
            transition: all 0.3s ease;
            background: white;
        }

        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #38b6ff;
            box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
            transform: translateY(-1px);
        }

        textarea {
            resize: vertical;
            min-height: 120px;
            line-height: 1.6;
        }

        .checkbox-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }

        .checkbox-item {
            display: flex;
            align-items: center;
            padding: 12px;
            background: #f8fafc;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .checkbox-item:hover {
            background: #e6f7ff;
        }

        .checkbox-item input[type="checkbox"] {
            width: auto;
            margin-right: 12px;
            transform: scale(1.3);
            accent-color: #38b6ff;
        }

        .checkbox-item label {
            margin-bottom: 0;
            font-weight: 500;
            cursor: pointer;
        }

        /* ===== PRICING SECTION ===== */
        .pricing-info {
            background: linear-gradient(135deg, #f8fafc 0%, #e6f7ff 100%);
            padding: 40px;
            border-radius: 16px;
            border: 2px solid #38b6ff;
            margin: 40px 0;
            position: relative;
            overflow: hidden;
        }

        .pricing-info::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
        }

        .pricing-info h3 {
            color: #000000;
            margin-bottom: 20px;
            font-size: 1.8rem;
            font-weight: 800;
            text-align: center;
        }

        .pricing-info > p {
            text-align: center;
            color: #64748b;
            font-size: 1.1rem;
            margin-bottom: 30px;
        }

        .pricing-tiers {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 25px;
            margin: 30px 0;
        }

        .pricing-tier {
            background: white;
            padding: 30px 25px;
            border-radius: 16px;
            border: 2px solid #e2e8f0;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .pricing-tier:hover {
            border-color: #38b6ff;
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(56, 182, 255, 0.15);
        }

        .pricing-tier.featured {
            border-color: #ff8c00;
            background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
            color: white;
            transform: scale(1.05);
        }

        .pricing-tier.featured::before {
            content: 'MOST POPULAR';
            position: absolute;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            background: #000000;
            color: white;
            padding: 6px 16px;
            font-size: 11px;
            font-weight: 700;
            border-radius: 20px;
            letter-spacing: 0.5px;
        }

        .tier-name {
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 10px;
            text-align: center;
        }

        .pricing-tier.featured .tier-name {
            margin-top: 30px;
        }

        .tier-price {
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 20px;
            text-align: center;
        }

        .tier-features {
            list-style: none;
            padding: 0;
        }

        .tier-features li {
            padding: 8px 0;
            position: relative;
            padding-left: 25px;
            font-size: 1rem;
        }

        .tier-features li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
            font-size: 16px;
        }

        .pricing-tier.featured .tier-features li:before {
            color: #90cdf4;
        }

        /* ===== BUSINESS HOURS ===== */
        .hours-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
            gap: 15px;
        }

        .hours-day {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 15px;
            background: #f8fafc;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
        }

        .hours-day label {
            min-width: 85px;
            margin-bottom: 0;
            font-weight: 600;
            color: #333;
            font-size: 0.9rem;
            flex-shrink: 0;
        }

        .hours-inputs {
            display: flex;
            gap: 8px;
            align-items: center;
            flex: 1;
            min-width: 0;
        }

        .hours-inputs input[type="time"] {
            width: 110px;
            min-width: 100px;
            flex: 0 0 auto;
            padding: 8px 10px;
            font-size: 0.85rem;
        }

        .hours-inputs span {
            color: #64748b;
            font-weight: 500;
            flex-shrink: 0;
            font-size: 0.85rem;
        }

        /* ===== SOCIAL MEDIA GRID ===== */
        .social-media-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }

        /* ===== SUBMIT SECTION ===== */
        .submit-section {
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
            padding: 50px;
            border-radius: 16px;
            text-align: center;
            margin-top: 40px;
            position: relative;
            overflow: hidden;
        }

        .submit-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
        }

        .submit-section h3 {
            color: white;
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 15px;
            position: relative;
            z-index: 2;
        }

        .submit-section p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 1.1rem;
            margin-bottom: 30px;
            position: relative;
            z-index: 2;
        }

        .submit-btn {
            background: linear-gradient(135deg, #ff8c00, #ff6b00);
            color: white;
            padding: 18px 40px;
            border: none;
            border-radius: 12px;
            font-size: 1.2rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(234, 88, 12, 0.4);
            position: relative;
            z-index: 2;
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(234, 88, 12, 0.5);
            background: linear-gradient(135deg, #e07800, #e05500);
        }

        .submit-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }

        .help-text {
            font-size: 0.9rem;
            color: #64748b;
            margin-top: 8px;
            font-style: italic;
        }

        .submit-section .help-text {
            color: rgba(255, 255, 255, 0.8);
        }

        /* ===== FOOTER ===== */
        .footer {
            background: #000000;
            color: #94a3b8;
            padding: 40px 0;
            text-align: center;
            margin-top: 60px;
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
            .page-header-content,
            .form-content {
                padding: 40px 20px;
            }

            .form-wrapper {
                margin: -30px 20px 40px;
            }

            .form-grid {
                grid-template-columns: 1fr;
            }

            .pricing-tiers {
                grid-template-columns: 1fr;
            }

            .pricing-tier.featured {
                transform: none;
            }

            .hours-grid {
                grid-template-columns: 1fr;
            }

            .hours-day {
                flex-direction: row;
                flex-wrap: wrap;
                align-items: center;
                gap: 10px;
                padding: 15px;
            }

            .hours-day label {
                min-width: 80px;
                text-align: left;
            }

            .hours-inputs {
                flex: 1 1 auto;
                justify-content: flex-start;
            }

            .hours-inputs input[type="time"] {
                width: 100px;
                min-width: 90px;
            }

            .social-media-group {
                grid-template-columns: 1fr;
            }

            .checkbox-group {
                grid-template-columns: 1fr;
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
    <?php include 'header.php'; ?>

    <!-- Page Header -->
    <section class="page-header">
        <div class="page-header-content">
            <h1>Join Our <span class="highlight-text">Business Directory</span></h1>
            <p>Get your business discovered by thousands of local customers in the Lowcountry</p>
        </div>
    </section>

    <!-- Form Container -->
    <div class="form-wrapper">
        <div class="form-container">
            <div class="form-content">
                <form action="process_directory_signup.php" method="POST" enctype="multipart/form-data">
                    <!-- Basic Business Information -->
                    <div class="form-section">
                        <h2 class="section-title">Basic Business Information</h2>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="business_name">Business Name <span class="required">*</span></label>
                                <input type="text" id="business_name" name="business_name" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="business_category">Primary Category <span class="required">*</span></label>
                                <select id="business_category" name="business_category" required>
                                    <option value="">Select a category</option>
                                    <option value="restaurants">Restaurants & Food</option>
                                    <option value="retail">Retail & Shopping</option>
                                    <option value="services">Professional Services</option>
                                    <option value="healthcare">Healthcare & Medical</option>
                                    <option value="automotive">Automotive</option>
                                    <option value="home-garden">Home & Garden</option>
                                    <option value="beauty-wellness">Beauty & Wellness</option>
                                    <option value="fitness-recreation">Fitness & Recreation</option>
                                    <option value="education">Education & Training</option>
                                    <option value="real-estate">Real Estate</option>
                                    <option value="technology">Technology</option>
                                    <option value="construction">Construction & Trades</option>
                                    <option value="legal">Legal Services</option>
                                    <option value="financial">Financial Services</option>
                                    <option value="entertainment">Entertainment & Events</option>
                                    <option value="non-profit">Non-Profit</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            
                            <div class="form-group full-width">
                                <label for="business_description">Business Description <span class="required">*</span></label>
                                <textarea id="business_description" name="business_description" placeholder="Describe your business, services, and what makes you unique..." required></textarea>
                                <div class="help-text">This will be displayed on your directory listing</div>
                            </div>
                        </div>
                    </div>

                    <!-- Contact Information -->
                    <div class="form-section">
                        <h2 class="section-title">Contact Information</h2>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="contact_name">Primary Contact Name <span class="required">*</span></label>
                                <input type="text" id="contact_name" name="contact_name" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="phone">Phone Number <span class="required">*</span></label>
                                <input type="tel" id="phone" name="phone" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="email">Email Address <span class="required">*</span></label>
                                <input type="email" id="email" name="email" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="website">Website URL</label>
                                <input type="url" id="website" name="website" placeholder="https://yourwebsite.com">
                            </div>
                        </div>
                    </div>

                    <!-- Location Information -->
                    <div class="form-section">
                        <h2 class="section-title">Location Information</h2>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="street_address">Street Address <span class="required">*</span></label>
                                <input type="text" id="street_address" name="street_address" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="city">City <span class="required">*</span></label>
                                <select id="city" name="city" required>
                                    <option value="">Select a city</option>
                                    <option value="summerville">Summerville</option>
                                    <option value="mount-pleasant">Mount Pleasant</option>
                                    <option value="daniel-island">Daniel Island</option>
                                    <option value="charleston">Charleston</option>
                                    <option value="goose-creek">Goose Creek</option>
                                    <option value="north-charleston">North Charleston</option>
                                    <option value="other">Other Lowcountry Area</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="zip_code">ZIP Code <span class="required">*</span></label>
                                <input type="text" id="zip_code" name="zip_code" required>
                            </div>
                            
                            <div class="form-group full-width">
                                <label for="service_areas">Service Areas</label>
                                <div class="checkbox-group">
                                    <div class="checkbox-item">
                                        <input type="checkbox" id="area_summerville" name="service_areas[]" value="summerville">
                                        <label for="area_summerville">Summerville</label>
                                    </div>
                                    <div class="checkbox-item">
                                        <input type="checkbox" id="area_mount_pleasant" name="service_areas[]" value="mount-pleasant">
                                        <label for="area_mount_pleasant">Mount Pleasant</label>
                                    </div>
                                    <div class="checkbox-item">
                                        <input type="checkbox" id="area_daniel_island" name="service_areas[]" value="daniel-island">
                                        <label for="area_daniel_island">Daniel Island</label>
                                    </div>
                                    <div class="checkbox-item">
                                        <input type="checkbox" id="area_charleston" name="service_areas[]" value="charleston">
                                        <label for="area_charleston">Charleston</label>
                                    </div>
                                    <div class="checkbox-item">
                                        <input type="checkbox" id="area_lowcountry" name="service_areas[]" value="lowcountry">
                                        <label for="area_lowcountry">Greater Lowcountry</label>
                                    </div>
                                </div>
                                <div class="help-text">Select all areas where you provide services</div>
                            </div>
                        </div>
                    </div>

                    <!-- Business Hours -->
                    <div class="form-section">
                        <h2 class="section-title">Business Hours</h2>
                        <div class="hours-grid">
                            <div class="hours-day">
                                <label>Monday:</label>
                                <div class="hours-inputs">
                                    <input type="time" name="monday_open">
                                    <span>to</span>
                                    <input type="time" name="monday_close">
                                </div>
                            </div>
                            <div class="hours-day">
                                <label>Tuesday:</label>
                                <div class="hours-inputs">
                                    <input type="time" name="tuesday_open">
                                    <span>to</span>
                                    <input type="time" name="tuesday_close">
                                </div>
                            </div>
                            <div class="hours-day">
                                <label>Wednesday:</label>
                                <div class="hours-inputs">
                                    <input type="time" name="wednesday_open">
                                    <span>to</span>
                                    <input type="time" name="wednesday_close">
                                </div>
                            </div>
                            <div class="hours-day">
                                <label>Thursday:</label>
                                <div class="hours-inputs">
                                    <input type="time" name="thursday_open">
                                    <span>to</span>
                                    <input type="time" name="thursday_close">
                                </div>
                            </div>
                            <div class="hours-day">
                                <label>Friday:</label>
                                <div class="hours-inputs">
                                    <input type="time" name="friday_open">
                                    <span>to</span>
                                    <input type="time" name="friday_close">
                                </div>
                            </div>
                            <div class="hours-day">
                                <label>Saturday:</label>
                                <div class="hours-inputs">
                                    <input type="time" name="saturday_open">
                                    <span>to</span>
                                    <input type="time" name="saturday_close">
                                </div>
                            </div>
                            <div class="hours-day">
                                <label>Sunday:</label>
                                <div class="hours-inputs">
                                    <input type="time" name="sunday_open">
                                    <span>to</span>
                                    <input type="time" name="sunday_close">
                                </div>
                            </div>
                        </div>
                        <div class="help-text">Leave times blank for closed days</div>
                    </div>

                    <!-- Social Media & Online Presence -->
                    <div class="form-section">
                        <h2 class="section-title">Social Media & Online Presence</h2>
                        <div class="social-media-group">
                            <div class="form-group">
                                <label for="facebook_url">Facebook</label>
                                <input type="url" id="facebook_url" name="facebook_url" placeholder="https://facebook.com/yourpage">
                            </div>
                            
                            <div class="form-group">
                                <label for="instagram_url">Instagram</label>
                                <input type="url" id="instagram_url" name="instagram_url" placeholder="https://instagram.com/youraccount">
                            </div>
                            
                            <div class="form-group">
                                <label for="linkedin_url">LinkedIn</label>
                                <input type="url" id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/company/yourcompany">
                            </div>
                            
                            <div class="form-group">
                                <label for="google_business_url">Google Business Profile</label>
                                <input type="url" id="google_business_url" name="google_business_url" placeholder="Google Business Profile URL">
                            </div>
                        </div>
                    </div>

                    <!-- Additional Information -->
                    <div class="form-section">
                        <h2 class="section-title">Additional Information</h2>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="years_in_business">Years in Business</label>
                                <select id="years_in_business" name="years_in_business">
                                    <option value="">Select...</option>
                                    <option value="less-than-1">Less than 1 year</option>
                                    <option value="1-3">1-3 years</option>
                                    <option value="4-7">4-7 years</option>
                                    <option value="8-15">8-15 years</option>
                                    <option value="15-plus">15+ years</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="employee_count">Number of Employees</label>
                                <select id="employee_count" name="employee_count">
                                    <option value="">Select...</option>
                                    <option value="1">Just me</option>
                                    <option value="2-5">2-5 employees</option>
                                    <option value="6-15">6-15 employees</option>
                                    <option value="16-50">16-50 employees</option>
                                    <option value="50-plus">50+ employees</option>
                                </select>
                            </div>
                            
                            <div class="form-group full-width">
                                <label for="special_features">Special Features or Amenities</label>
                                <div class="checkbox-group">
                                    <div class="checkbox-item">
                                        <input type="checkbox" id="parking" name="special_features[]" value="parking">
                                        <label for="parking">Free Parking</label>
                                    </div>
                                    <div class="checkbox-item">
                                        <input type="checkbox" id="wheelchair" name="special_features[]" value="wheelchair">
                                        <label for="wheelchair">Wheelchair Accessible</label>
                                    </div>
                                    <div class="checkbox-item">
                                        <input type="checkbox" id="wifi" name="special_features[]" value="wifi">
                                        <label for="wifi">Free WiFi</label>
                                    </div>
                                    <div class="checkbox-item">
                                        <input type="checkbox" id="delivery" name="special_features[]" value="delivery">
                                        <label for="delivery">Delivery Available</label>
                                    </div>
                                    <div class="checkbox-item">
                                        <input type="checkbox" id="credit_cards" name="special_features[]" value="credit_cards">
                                        <label for="credit_cards">Credit Cards Accepted</label>
                                    </div>
                                    <div class="checkbox-item">
                                        <input type="checkbox" id="appointments" name="special_features[]" value="appointments">
                                        <label for="appointments">By Appointment</label>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group full-width">
                                <label for="additional_notes">Additional Notes</label>
                                <textarea id="additional_notes" name="additional_notes" placeholder="Anything else you'd like potential customers to know..."></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Pricing Information -->
                    <div class="pricing-info">
                        <h3>Directory Listing Pricing</h3>
                        <p>Choose the plan that best fits your business needs and budget:</p>
                        
                        <div class="pricing-tiers">
                            <div class="pricing-tier">
                                <div class="tier-name">Basic Listing</div>
                                <div class="tier-price">FREE</div>
                                <ul class="tier-features">
                                    <li>Business name and contact info</li>
                                    <li>Basic description</li>
                                    <li>Business hours</li>
                                    <li>Category listing</li>
                                    <li>Location on map</li>
                                </ul>
                            </div>

                            <div class="pricing-tier featured">
                                <div class="tier-name">Premium Listing</div>
                                <div class="tier-price">$10/mo <span style="font-size: 0.5em; font-weight: 500; display: block; margin-top: 5px;">or $100/year (save $20!)</span></div>
                                <ul class="tier-features">
                                    <li>Everything in Basic</li>
                                    <li>Photo gallery (up to 10 photos)</li>
                                    <li>Social media links</li>
                                    <li>Featured placement</li>
                                    <li>Analytics dashboard</li>
                                    <li>Priority support</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="preferred_plan">Preferred Plan <span class="required">*</span></label>
                            <select id="preferred_plan" name="preferred_plan" required>
                                <option value="">Select a plan</option>
                                <option value="basic">Basic Listing (Free)</option>
                                <option value="premium-monthly">Premium Listing ($10/month)</option>
                                <option value="premium-yearly">Premium Listing ($100/year - Save $20!)</option>
                                <option value="contact">Contact me to discuss options</option>
                            </select>
                        </div>
                    </div>

                    <!-- Hidden field to identify this as directory signup -->
                    <input type="hidden" name="form_type" value="directory_signup">

                    <?php include __DIR__ . '/includes/sms_consent.php'; ?>

                    <!-- Submit Section -->
                    <div class="submit-section">
                        <h3>Ready to Join Our Directory?</h3>
                        <p>We'll review your submission and contact you within 1-2 business days to complete your listing setup and get you started!</p>
                        <button type="submit" class="submit-btn">Submit My Business</button>
                        <div class="help-text">
                            By submitting, you agree to our terms of service and privacy policy.
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <?php include 'footer.php'; ?>

    <script>
        // Enhanced form validation and user experience
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.querySelector('form');
            
            // Add form submission handling
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Basic validation
                const requiredFields = form.querySelectorAll('[required]');
                let isValid = true;
                
                requiredFields.forEach(field => {
                    if (!field.value.trim()) {
                        isValid = false;
                        field.style.borderColor = '#dc2626';
                        field.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)';
                    } else {
                        field.style.borderColor = '#10b981';
                        field.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                    }
                });
                
                if (isValid) {
                    // Show loading state
                    const submitBtn = form.querySelector('.submit-btn');
                    const originalText = submitBtn.innerHTML;
                    submitBtn.innerHTML = 'Submitting...';
                    submitBtn.disabled = true;
                    
                    // Submit the form
                    setTimeout(() => {
                        form.submit();
                    }, 500);
                } else {
                    // Scroll to first error
                    const firstError = form.querySelector('[require