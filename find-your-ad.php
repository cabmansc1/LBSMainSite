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

<?php
require_once 'pricing_config.php';
?>
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
  <title>Find Your Perfect Ad - Lowcountry Business Spotlight</title>
  <meta name="description" content="Answer a few quick questions to find the perfect direct mail advertising package for your business. Get personalized recommendations based on your goals and budget.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://www.lowcountrybusinessspotlight.com/find-your-ad.php">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.lowcountrybusinessspotlight.com/find-your-ad.php">
  <meta property="og:title" content="Find Your Perfect Ad - Lowcountry Business Spotlight">
  <meta property="og:description" content="Answer a few quick questions to find the perfect direct mail advertising package for your business.">
  <meta property="og:image" content="https://www.lowcountrybusinessspotlight.com/images/og-image.jpg">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://www.lowcountrybusinessspotlight.com/find-your-ad.php">
  <meta name="twitter:title" content="Find Your Perfect Ad - Lowcountry Business Spotlight">
  <meta name="twitter:description" content="Answer a few quick questions to find the perfect direct mail advertising package for your business.">
  <meta name="twitter:image" content="https://www.lowcountrybusinessspotlight.com/images/og-image.jpg">

  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">

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
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    min-height: 100vh;
  }

  /* Main Container */
  .quiz-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  /* Progress Bar */
  .progress-container {
    margin-bottom: 40px;
  }

  .progress-bar {
    height: 8px;
    background: #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(135deg, #38b6ff, #0ea5e9);
    border-radius: 10px;
    transition: width 0.5s ease;
    width: 0%;
  }

  .progress-text {
    text-align: center;
    margin-top: 10px;
    font-size: 0.9rem;
    color: #64748b;
    font-weight: 500;
  }

  /* Quiz Card */
  .quiz-card {
    background: white;
    border-radius: 24px;
    padding: 50px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
  }

  /* Step Sections */
  .quiz-step {
    display: none;
    animation: fadeIn 0.4s ease;
  }

  .quiz-step.active {
    display: block;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .step-header {
    text-align: center;
    margin-bottom: 35px;
  }

  .step-number {
    display: inline-block;
    background: linear-gradient(135deg, #38b6ff, #0ea5e9);
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    line-height: 40px;
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 15px;
  }

  .step-title {
    font-size: 1.8rem;
    font-weight: 800;
    color: #000;
    margin-bottom: 10px;
  }

  .step-subtitle {
    font-size: 1rem;
    color: #64748b;
  }

  /* Option Buttons */
  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 30px;
  }

  .options-grid.two-col {
    grid-template-columns: repeat(2, 1fr);
  }

  .options-grid.three-col {
    grid-template-columns: repeat(3, 1fr);
  }

  .option-btn {
    background: white;
    border: 3px solid #e2e8f0;
    border-radius: 16px;
    padding: 25px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
  }

  .option-btn:hover {
    border-color: #38b6ff;
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(56, 182, 255, 0.2);
  }

  .option-btn.selected {
    border-color: #38b6ff;
    background: linear-gradient(135deg, rgba(56, 182, 255, 0.1), rgba(14, 165, 233, 0.1));
    box-shadow: 0 0 0 4px rgba(56, 182, 255, 0.2);
  }

  .option-btn.selected::after {
    content: '✓';
    position: absolute;
    top: 10px;
    right: 10px;
    background: #38b6ff;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    font-size: 14px;
    line-height: 24px;
  }

  .option-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #38b6ff, #0ea5e9);
    border-radius: 12px;
  }

  .option-icon svg {
    width: 28px;
    height: 28px;
    fill: white;
  }

  .option-title {
    font-weight: 700;
    font-size: 1.1rem;
    color: #000;
    margin-bottom: 5px;
  }

  .option-desc {
    font-size: 0.85rem;
    color: #64748b;
  }

  /* Mailing Size Options */
  .mailing-option {
    padding: 30px 20px;
  }

  .mailing-number {
    font-size: 2.2rem;
    font-weight: 800;
    color: #38b6ff;
    margin-bottom: 5px;
  }

  .mailing-label {
    font-size: 0.9rem;
    color: #64748b;
    margin-bottom: 10px;
  }

  .mailing-price {
    font-size: 1rem;
    font-weight: 700;
    color: #22c55e;
  }

  /* Budget Slider */
  .slider-container {
    margin: 30px 0 40px;
  }

  .budget-display {
    text-align: center;
    margin-bottom: 25px;
  }

  .budget-amount {
    font-size: 3rem;
    font-weight: 800;
    color: #38b6ff;
    line-height: 1;
  }

  .budget-label {
    font-size: 1rem;
    color: #64748b;
    margin-top: 5px;
  }

  .slider-wrapper {
    position: relative;
    padding: 0 10px;
  }

  input[type="range"] {
    -webkit-appearance: none;
    width: 100%;
    height: 12px;
    background: linear-gradient(to right, #38b6ff 0%, #38b6ff var(--value), #e2e8f0 var(--value), #e2e8f0 100%);
    border-radius: 10px;
    outline: none;
    cursor: pointer;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 32px;
    height: 32px;
    background: white;
    border: 4px solid #38b6ff;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(56, 182, 255, 0.4);
    transition: transform 0.2s ease;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  input[type="range"]::-moz-range-thumb {
    width: 32px;
    height: 32px;
    background: white;
    border: 4px solid #38b6ff;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(56, 182, 255, 0.4);
  }

  .slider-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    font-size: 0.85rem;
    color: #94a3b8;
    font-weight: 500;
  }

  /* Budget Recommendation */
  .budget-recommendation {
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    border: 2px solid #22c55e;
    border-radius: 12px;
    padding: 15px 20px;
    margin-top: 20px;
    text-align: center;
  }

  .budget-recommendation p {
    color: #166534;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .budget-recommendation .recommended-package {
    font-size: 1.1rem;
    font-weight: 700;
    color: #15803d;
    margin-top: 5px;
  }

  /* Navigation Buttons */
  .nav-buttons {
    display: flex;
    justify-content: space-between;
    margin-top: 35px;
    gap: 15px;
  }

  .btn {
    padding: 16px 32px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    border: none;
    font-family: 'Inter', sans-serif;
  }

  .btn-back {
    background: #f1f5f9;
    color: #475569;
  }

  .btn-back:hover {
    background: #e2e8f0;
  }

  .btn-next {
    background: linear-gradient(135deg, #38b6ff, #0ea5e9);
    color: white;
    flex: 1;
    max-width: 250px;
  }

  .btn-next:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(56, 182, 255, 0.4);
  }

  .btn-next:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .btn-cta {
    background: linear-gradient(135deg, #ff8c00, #ff6b00);
    color: white;
    width: 100%;
    padding: 18px 32px;
    font-size: 1.1rem;
  }

  .btn-cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(234, 88, 12, 0.4);
  }

  /* Results Section */
  .results-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .results-icon {
    margin-bottom: 15px;
  }

  .recommendation-card {
    background: linear-gradient(135deg, #38b6ff, #0ea5e9);
    border-radius: 20px;
    padding: 35px;
    color: white;
    text-align: center;
    margin-bottom: 25px;
  }

  .recommendation-label {
    font-size: 0.9rem;
    opacity: 0.9;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .recommendation-title {
    font-size: 1.8rem;
    font-weight: 800;
    margin-bottom: 5px;
  }

  .recommendation-subtitle {
    font-size: 1.1rem;
    opacity: 0.9;
  }

  .recommendation-price {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 20px 0 10px;
  }

  .recommendation-details {
    font-size: 0.95rem;
    opacity: 0.9;
  }

  /* Results Summary */
  .results-summary {
    background: #f8fafc;
    border-radius: 16px;
    padding: 25px;
    margin-bottom: 25px;
  }

  .summary-title {
    font-weight: 700;
    color: #000;
    margin-bottom: 15px;
    font-size: 1.1rem;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #e2e8f0;
  }

  .summary-row:last-child {
    border-bottom: none;
  }

  .summary-label {
    color: #64748b;
  }

  .summary-value {
    font-weight: 600;
    color: #000;
  }

  /* Why This Works */
  .why-section {
    margin: 25px 0;
  }

  .why-title {
    font-weight: 700;
    color: #000;
    margin-bottom: 15px;
    font-size: 1.1rem;
  }

  .why-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  .why-icon {
    color: #22c55e;
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .why-text {
    color: #475569;
    font-size: 0.95rem;
  }

  /* Email Capture */
  .email-capture {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border: 2px solid #f59e0b;
    border-radius: 16px;
    padding: 25px;
    margin: 25px 0;
    text-align: center;
  }

  .email-capture h3 {
    color: #92400e;
    margin-bottom: 10px;
    font-size: 1.1rem;
  }

  .email-capture p {
    color: #a16207;
    font-size: 0.9rem;
    margin-bottom: 15px;
  }

  .email-form {
    display: flex;
    gap: 10px;
    max-width: 400px;
    margin: 0 auto;
  }

  .email-form input {
    flex: 1;
    padding: 12px 16px;
    border: 2px solid #fbbf24;
    border-radius: 10px;
    font-size: 1rem;
    font-family: 'Inter', sans-serif;
  }

  .email-form input:focus {
    outline: none;
    border-color: #f59e0b;
  }

  .email-form button {
    background: #f59e0b;
    color: white;
    padding: 12px 20px;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .email-form button:hover {
    background: #d97706;
  }

  /* Footer */
  .quiz-footer {
    text-align: center;
    padding: 30px 20px;
    color: #94a3b8;
    font-size: 0.9rem;
  }

  .quiz-footer a {
    color: #38b6ff;
    text-decoration: none;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .quiz-card {
      padding: 30px 20px;
      border-radius: 20px;
    }

    .step-title {
      font-size: 1.4rem;
    }

    .options-grid.three-col {
      grid-template-columns: 1fr;
    }

    .options-grid.two-col {
      grid-template-columns: 1fr;
    }

    .option-btn {
      padding: 20px 15px;
    }

    .budget-amount {
      font-size: 2.5rem;
    }

    .nav-buttons {
      flex-direction: column;
    }

    .btn-next {
      max-width: 100%;
    }

    .email-form {
      flex-direction: column;
    }

    .recommendation-price {
      font-size: 2rem;
    }
  }
  </style>
</head>

<body>
  <?php include 'header.php'; ?>

  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5ZP4TT23"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

  <div class="quiz-container">
    <!-- Progress Bar -->
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="progress-text" id="progressText">Step 1 of 4</div>
    </div>

    <div class="quiz-card">
      <!-- Step 1: Business Type -->
      <div class="quiz-step active" id="step1">
        <div class="step-header">
          <div class="step-number">1</div>
          <h2 class="step-title">What type of business do you have?</h2>
          <p class="step-subtitle">This helps us tailor our recommendations</p>
        </div>

        <div class="options-grid">
          <div class="option-btn" data-value="restaurant" onclick="selectOption(this, 'businessType')">
            <div class="option-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg></div>
            <div class="option-title">Restaurant / Food</div>
            <div class="option-desc">Dining, catering, food service</div>
          </div>
          <div class="option-btn" data-value="home-services" onclick="selectOption(this, 'businessType')">
            <div class="option-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>
            <div class="option-title">Home Services</div>
            <div class="option-desc">HVAC, plumbing, roofing, etc.</div>
          </div>
          <div class="option-btn" data-value="health-beauty" onclick="selectOption(this, 'businessType')">
            <div class="option-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
            <div class="option-title">Health & Beauty</div>
            <div class="option-desc">Salon, spa, wellness, fitness</div>
          </div>
          <div class="option-btn" data-value="retail" onclick="selectOption(this, 'businessType')">
            <div class="option-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg></div>
            <div class="option-title">Retail / Shopping</div>
            <div class="option-desc">Stores, boutiques, shops</div>
          </div>
          <div class="option-btn" data-value="professional" onclick="selectOption(this, 'businessType')">
            <div class="option-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg></div>
            <div class="option-title">Professional Services</div>
            <div class="option-desc">Legal, financial, consulting</div>
          </div>
          <div class="option-btn" data-value="other" onclick="selectOption(this, 'businessType')">
            <div class="option-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>
            <div class="option-title">Other</div>
            <div class="option-desc">Something else entirely</div>
          </div>
        </div>

        <div class="nav-buttons">
          <div></div>
          <button class="btn btn-next" id="next1" disabled onclick="nextStep(2)">Continue →</button>
        </div>
      </div>

      <!-- Step 2: Goal -->
      <div class="quiz-step" id="step2">
        <div class="step-header">
          <div class="step-number">2</div>
          <h2 class="step-title">What's your main goal?</h2>
          <p class="step-subtitle">What do you want to achieve with your ad?</p>
        </div>

        <div class="options-grid two-col">
          <div class="option-btn" data-value="awareness" onclick="selectOption(this, 'goal')">
            <div class="option-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/></svg></div>
            <div class="option-title">Brand Awareness</div>
            <div class="option-desc">Get my name out there</div>
          </div>
          <div class="option-btn" data-value="leads" onclick="selectOption(this, 'goal')">
            <div class="option-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg></div>
            <div class="option-title">Generate Leads</div>
            <div class="option-desc">Get calls and inquiries</div>
          </div>
          <div class="option-btn" data-value="sales" onclick="selectOption(this, 'goal')">
            <div class="option-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg></div>
            <div class="option-title">Drive Sales</div>
            <div class="option-desc">Increase revenue directly</div>
          </div>
          <div class="option-btn" data-value="launch" onclick="selectOption(this, 'goal')">
            <div class="option-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9.19 6.35c-2.04 2.29-3.44 5.58-3.57 5.89L2 10.69l4.05-4.05c.47-.47 1.15-.68 1.81-.55l1.33.26zM11.17 17s3.74-1.55 5.89-3.7c5.4-5.4 4.5-9.62 4.21-10.57-.95-.3-5.17-1.19-10.57 4.21C8.55 9.09 7 12.83 7 12.83l4.17 4.17zm6.48-3.7c-2.15 2.15-5.89 3.7-5.89 3.7l-4.17-4.17s1.55-3.74 3.7-5.89c5.4-5.4 9.62-4.51 10.57-4.21.29.95 1.19 5.17-4.21 10.57zM14.5 9c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM2.81 14.12l1.41-1.41c.47-.47 1.15-.68 1.81-.55l-1.81 1.96zm3.54 3.54l1.96-1.81c.13.66-.08 1.34-.55 1.81l-1.41 1.41v-1.41z"/></svg></div>
            <div class="option-title">New Launch</div>
            <div class="option-desc">Promote something new</div>
          </div>
        </div>

        <div class="nav-buttons">
          <button class="btn btn-back" onclick="prevStep(1)">← Back</button>
          <button class="btn btn-next" id="next2" disabled onclick="nextStep(3)">Continue →</button>
        </div>
      </div>

      <!-- Step 3: Mailing Size -->
      <div class="quiz-step" id="step3">
        <div class="step-header">
          <div class="step-number">3</div>
          <h2 class="step-title">How many homes do you want to reach?</h2>
          <p class="step-subtitle">More homes = more potential customers</p>
        </div>

        <div class="options-grid three-col">
          <div class="option-btn mailing-option" data-value="2500" onclick="selectOption(this, 'mailingSize')">
            <div class="mailing-number">2,500</div>
            <div class="mailing-label">Households</div>
            <div class="mailing-price">Starting at $<?php echo $pricing['2.5k']['small']['price']; ?></div>
          </div>
          <div class="option-btn mailing-option" data-value="5000" onclick="selectOption(this, 'mailingSize')">
            <div class="mailing-number">5,000</div>
            <div class="mailing-label">Households</div>
            <div class="mailing-price">Starting at $<?php echo $pricing['5k']['small']['price']; ?></div>
          </div>
          <div class="option-btn mailing-option" data-value="10000" onclick="selectOption(this, 'mailingSize')">
            <div class="mailing-number">10,000</div>
            <div class="mailing-label">Households</div>
            <div class="mailing-price">Starting at $<?php echo $pricing['10k']['small']['price']; ?></div>
          </div>
        </div>

        <div class="nav-buttons">
          <button class="btn btn-back" onclick="prevStep(2)">← Back</button>
          <button class="btn btn-next" id="next3" disabled onclick="nextStep(4)">Continue →</button>
        </div>
      </div>

      <!-- Step 4: Budget -->
      <div class="quiz-step" id="step4">
        <div class="step-header">
          <div class="step-number">4</div>
          <h2 class="step-title">What's your budget?</h2>
          <p class="step-subtitle">Drag the slider to set your budget</p>
        </div>

        <div class="slider-container">
          <div class="budget-display">
            <div class="budget-amount" id="budgetAmount">$299</div>
            <div class="budget-label">per mailing</div>
          </div>

          <div class="slider-wrapper">
            <input type="range" id="budgetSlider" min="<?php echo $pricing['2.5k']['small']['price']; ?>" max="<?php echo $pricing['10k']['large']['price']; ?>" value="299" step="1" oninput="updateBudget(this.value)">
            <div class="slider-labels">
              <span>$<?php echo $pricing['2.5k']['small']['price']; ?></span>
              <span>$<?php echo $pricing['10k']['large']['price']; ?></span>
            </div>
          </div>

          <div class="budget-recommendation" id="budgetRecommendation">
            <p>Based on your budget, we recommend:</p>
            <div class="recommended-package" id="recommendedPackage">Medium Ad - 5,000 Homes</div>
          </div>
        </div>

        <div class="nav-buttons">
          <button class="btn btn-back" onclick="prevStep(3)">← Back</button>
          <button class="btn btn-next" onclick="showResults()">See My Recommendation →</button>
        </div>
      </div>

      <!-- Step 5: Results -->
      <div class="quiz-step" id="step5">
        <div class="results-header">
          <div class="results-icon"><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="#38b6ff"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>
          <h2 class="step-title">Your Perfect Ad Package</h2>
          <p class="step-subtitle">Based on your answers, here's what we recommend</p>
        </div>

        <div class="recommendation-card">
          <div class="recommendation-label">Recommended Package</div>
          <div class="recommendation-title" id="resultAdSize">Medium Ad</div>
          <div class="recommendation-subtitle" id="resultMailingSize">5,000 Households</div>
          <div class="recommendation-price" id="resultPrice">$299</div>
          <div class="recommendation-details" id="resultDetails">3" × 4" ad space on our shared postcard</div>
        </div>

        <div class="results-summary">
          <div class="summary-title">Your Selection Summary</div>
          <div class="summary-row">
            <span class="summary-label">Business Type</span>
            <span class="summary-value" id="summaryBusiness">-</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Main Goal</span>
            <span class="summary-value" id="summaryGoal">-</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Reach</span>
            <span class="summary-value" id="summaryReach">-</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Budget</span>
            <span class="summary-value" id="summaryBudget">-</span>
          </div>
        </div>

        <div class="why-section">
          <div class="why-title">Why This Package Works For You</div>
          <div class="why-item">
            <span class="why-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
            <span class="why-text" id="why1">Perfect size for maximum visibility on our shared postcards</span>
          </div>
          <div class="why-item">
            <span class="why-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
            <span class="why-text" id="why2">Reaches the right number of households for your goals</span>
          </div>
          <div class="why-item">
            <span class="why-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
            <span class="why-text" id="why3">Great ROI for your business type - direct mail works!</span>
          </div>
        </div>

        <div class="email-capture">
          <h3><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#92400e" style="vertical-align: middle; margin-right: 8px;"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>Save Your Recommendation</h3>
          <p>Enter your email and we'll send you the details</p>
          <form class="email-form" onsubmit="saveRecommendation(event)">
            <input type="email" id="userEmail" placeholder="Your email" required>
            <button type="submit">Send</button>
          </form>
        </div>

        <a href="advertise.php" class="btn btn-cta">Reserve This Package Now →</a>

        <!-- Location Selection -->
        <div class="location-links" style="margin-top: 25px; text-align: center;">
          <p style="color: #64748b; margin-bottom: 15px; font-size: 0.95rem;">Or view pricing for a specific area:</p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <a href="summerville-direct-mail-marketing.php" style="padding: 10px 20px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #333; font-weight: 600; transition: all 0.3s;">Summerville</a>
            <a href="mount-pleasant-direct-mail-marketing.php" style="padding: 10px 20px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #333; font-weight: 600; transition: all 0.3s;">Mount Pleasant</a>
            <a href="daniel-island-direct-mail-marketing.php" style="padding: 10px 20px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #333; font-weight: 600; transition: all 0.3s;">Daniel Island</a>
          </div>
        </div>

        <div class="nav-buttons" style="margin-top: 20px;">
          <button class="btn btn-back" onclick="prevStep(4)">← Change Answers</button>
          <a href="roi-calculator.php" class="btn btn-next" style="text-decoration: none; text-align: center;">Calculate Your ROI →</a>
        </div>
      </div>
    </div>

    <?php include 'footer.php'; ?>
  </div>

  <script>
    // Quiz state
    const quizData = {
      businessType: null,
      goal: null,
      mailingSize: null,
      budget: 299
    };

    // Pricing table from pricing_config.php
    const pricing = {
      '2500': { small: <?php echo $pricing['2.5k']['small']['price']; ?>, medium: <?php echo $pricing['2.5k']['medium']['price']; ?>, large: <?php echo $pricing['2.5k']['large']['price']; ?> },
      '5000': { small: <?php echo $pricing['5k']['small']['price']; ?>, medium: <?php echo $pricing['5k']['medium']['price']; ?>, large: <?php echo $pricing['5k']['large']['price']; ?> },
      '10000': { small: <?php echo $pricing['10k']['small']['price']; ?>, medium: <?php echo $pricing['10k']['medium']['price']; ?>, large: <?php echo $pricing['10k']['large']['price']; ?> }
    };

    // Business type labels
    const businessLabels = {
      'restaurant': 'Restaurant / Food',
      'home-services': 'Home Services',
      'health-beauty': 'Health & Beauty',
      'retail': 'Retail / Shopping',
      'professional': 'Professional Services',
      'other': 'Other'
    };

    // Goal labels
    const goalLabels = {
      'awareness': 'Brand Awareness',
      'leads': 'Generate Leads',
      'sales': 'Drive Sales',
      'launch': 'New Launch'
    };

    let currentStep = 1;
    const totalSteps = 4;

    function selectOption(element, field) {
      // Remove selection from siblings
      const parent = element.parentElement;
      parent.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));

      // Select this option
      element.classList.add('selected');
      quizData[field] = element.dataset.value;

      // Enable next button
      document.getElementById('next' + currentStep).disabled = false;

      // If mailing size selected, update budget slider range
      if (field === 'mailingSize') {
        updateBudgetSliderForMailingSize();
      }
    }

    function updateBudgetSliderForMailingSize() {
      const slider = document.getElementById('budgetSlider');
      const size = quizData.mailingSize;

      if (size) {
        const minPrice = pricing[size].small;
        const maxPrice = pricing[size].large;
        slider.min = minPrice;
        slider.max = maxPrice;
        slider.value = pricing[size].medium;
        updateBudget(slider.value);
      }
    }

    function updateBudget(value) {
      quizData.budget = parseInt(value);
      document.getElementById('budgetAmount').textContent = '$' + value;

      // Update slider gradient
      const slider = document.getElementById('budgetSlider');
      const percent = ((value - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.setProperty('--value', percent + '%');

      // Determine recommended package
      updateRecommendedPackage();
    }

    function updateRecommendedPackage() {
      const size = quizData.mailingSize || '5000';
      const budget = quizData.budget;
      let adSize = 'small';
      let adSizeLabel = 'Small Ad';

      const prices = pricing[size];

      if (budget >= prices.large) {
        adSize = 'large';
        adSizeLabel = 'Large Ad (4" × 6")';
      } else if (budget >= prices.medium) {
        adSize = 'medium';
        adSizeLabel = 'Medium Ad (3" × 4")';
      } else {
        adSize = 'small';
        adSizeLabel = 'Small Ad (3" × 2")';
      }

      const homes = parseInt(size).toLocaleString();
      document.getElementById('recommendedPackage').textContent = adSizeLabel + ' - ' + homes + ' Homes';

      // Store for results
      quizData.recommendedAdSize = adSize;
      quizData.recommendedPrice = prices[adSize];
    }

    function nextStep(step) {
      document.getElementById('step' + currentStep).classList.remove('active');
      document.getElementById('step' + step).classList.add('active');
      currentStep = step;
      updateProgress();

      // Initialize budget slider when reaching step 4
      if (step === 4) {
        updateBudgetSliderForMailingSize();
      }
    }

    function prevStep(step) {
      document.getElementById('step' + currentStep).classList.remove('active');
      document.getElementById('step' + step).classList.add('active');
      currentStep = step;
      updateProgress();
    }

    function updateProgress() {
      const progress = (currentStep / totalSteps) * 100;
      document.getElementById('progressFill').style.width = progress + '%';

      if (currentStep <= totalSteps) {
        document.getElementById('progressText').textContent = 'Step ' + currentStep + ' of ' + totalSteps;
      } else {
        document.getElementById('progressText').textContent = 'Your Results';
      }
    }

    function showResults() {
      // Calculate final recommendation
      const size = quizData.mailingSize;
      const budget = quizData.budget;
      const prices = pricing[size];

      let adSize, adSizeLabel, adDimensions;

      if (budget >= prices.large) {
        adSize = 'large';
        adSizeLabel = 'Large Ad';
        adDimensions = '4" × 6" ad space';
      } else if (budget >= prices.medium) {
        adSize = 'medium';
        adSizeLabel = 'Medium Ad';
        adDimensions = '3" × 4" ad space';
      } else {
        adSize = 'small';
        adSizeLabel = 'Small Ad';
        adDimensions = '3" × 2" ad space';
      }

      const finalPrice = prices[adSize];
      const homes = parseInt(size).toLocaleString();

      // Update results display
      document.getElementById('resultAdSize').textContent = adSizeLabel;
      document.getElementById('resultMailingSize').textContent = homes + ' Households';
      document.getElementById('resultPrice').textContent = '$' + finalPrice;
      document.getElementById('resultDetails').textContent = adDimensions + ' on our shared postcard';

      // Update summary
      document.getElementById('summaryBusiness').textContent = businessLabels[quizData.businessType] || '-';
      document.getElementById('summaryGoal').textContent = goalLabels[quizData.goal] || '-';
      document.getElementById('summaryReach').textContent = homes + ' homes';
      document.getElementById('summaryBudget').textContent = '$' + budget;

      // Custom "why" messages based on selections
      updateWhyMessages();

      // Show results step
      document.getElementById('step' + currentStep).classList.remove('active');
      document.getElementById('step5').classList.add('active');
      currentStep = 5;
      document.getElementById('progressFill').style.width = '100%';
      document.getElementById('progressText').textContent = 'Your Results';

      // Track event
      if (typeof fbq !== 'undefined') {
        fbq('track', 'Lead');
      }
      if (typeof gtag !== 'undefined') {
        gtag('event', 'quiz_complete', { business_type: quizData.businessType, goal: quizData.goal });
      }
    }

    function updateWhyMessages() {
      const businessType = quizData.businessType;
      const goal = quizData.goal;
      const size = quizData.mailingSize;

      // Customize messages based on business type
      const businessMessages = {
        'restaurant': 'Restaurants see great results with direct mail - people save postcards for dining decisions!',
        'home-services': 'Home service businesses thrive with direct mail - homeowners keep your info when they need you!',
        'health-beauty': 'Beauty and wellness businesses love direct mail - it reaches people at home where decisions are made!',
        'retail': 'Retail businesses drive foot traffic with direct mail - tangible ads create lasting impressions!',
        'professional': 'Professional services build trust with direct mail - it shows you\'re established and reliable!',
        'other': 'Direct mail works for all business types - 4.9% response rate beats digital marketing!'
      };

      // Customize messages based on goal
      const goalMessages = {
        'awareness': 'Great for building brand awareness - every household sees your business!',
        'leads': 'Perfect for generating leads - direct mail has a 4.9% response rate!',
        'sales': 'Ideal for driving sales - direct mail delivers $12 return for every $1 spent!',
        'launch': 'Excellent for launches - make a big impression with a tangible mailer!'
      };

      document.getElementById('why1').textContent = businessMessages[businessType] || businessMessages['other'];
      document.getElementById('why2').textContent = goalMessages[goal] || goalMessages['awareness'];
      document.getElementById('why3').textContent = 'Reaching ' + parseInt(size).toLocaleString() + ' homes gives you excellent market coverage in the Charleston area!';
    }

    function saveRecommendation(e) {
      e.preventDefault();
      const email = document.getElementById('userEmail').value;

      // Send to backend
      fetch('save-quiz-lead.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          quizData: quizData
        })
      }).then(() => {
        alert('Thanks! Check your email for your personalized recommendation.');
      }).catch(() => {
        alert('Thanks! We\'ll be in touch soon.');
      });
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
      updateProgress();

      // Set initial slider gradient
      const slider = document.getElementById('budgetSlider');
      const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.setProperty('--value', percent + '%');
    });
  </script>
</body>
</html>
