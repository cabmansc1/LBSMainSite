<?php
if (session_status() === PHP_SESSION_NONE) session_start();
$submission = $_SESSION['form_submission'] ?? null;
$justSubmitted = (bool)$submission;
// Clear after reading so refresh doesn't show stale data
if ($submission) unset($_SESSION['form_submission']);

require_once __DIR__ . '/config.php';
$seoConfig = require __DIR__ . '/includes/seo-config.php';
$seo = $seoConfig[basename(__FILE__)] ?? [];
include __DIR__ . '/seo_head.php';
?>
  <!-- Page-specific conversion tracking (gtag/fbq defined by seo_head.php) -->
  <script>
<?php if ($justSubmitted): ?>
    gtag('event', 'conversion', {
      'send_to': 'AW-18077746446/XxKsCMijt68cEI6KkqxD'
    });
<?php endif; ?>
    fbq('track', 'Lead');
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; }

    .hero {
      background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
      color: white; text-align: center; padding: 60px 20px 50px;
    }
    .hero .checkmark {
      width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%;
      display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;
      font-size: 40px;
    }
    .hero h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 12px; }
    .hero p { font-size: 1.15rem; opacity: 0.9; max-width: 550px; margin: 0 auto; }

    .container { max-width: 800px; margin: 0 auto; padding: 0 20px; }

    /* Submission summary */
    .summary-card {
      background: white; border-radius: 16px; padding: 32px; margin: -30px auto 32px;
      position: relative; z-index: 2; box-shadow: 0 8px 30px rgba(0,0,0,0.1);
      border: 1px solid #e2e8f0;
    }
    .summary-card h3 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 16px; }
    .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { font-weight: 600; color: #64748b; font-size: 0.9rem; }
    .summary-value { font-weight: 600; color: #1e293b; font-size: 0.9rem; }

    /* Next steps */
    .steps-section { padding: 40px 0; }
    .steps-section h2 { font-size: 1.5rem; font-weight: 800; color: #1e293b; text-align: center; margin-bottom: 32px; }
    .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .step-card {
      background: white; border-radius: 12px; padding: 28px 24px; text-align: center;
      border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .step-number {
      width: 48px; height: 48px; background: linear-gradient(135deg, #38b6ff, #0ea5e9);
      color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem; font-weight: 800; margin: 0 auto 16px;
    }
    .step-card h4 { font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
    .step-card p { font-size: 0.9rem; color: #64748b; line-height: 1.5; }

    /* Timeline callout */
    .timeline-callout {
      background: linear-gradient(135deg, #1e293b, #0f172a); color: white;
      border-radius: 16px; padding: 32px; text-align: center; margin: 32px 0;
    }
    .timeline-callout .clock { font-size: 2rem; margin-bottom: 12px; }
    .timeline-callout h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; }
    .timeline-callout p { color: #94a3b8; font-size: 1rem; }

    /* Contact fallback */
    .contact-section {
      background: white; border-radius: 16px; padding: 32px; text-align: center;
      border: 1px solid #e2e8f0; margin-bottom: 40px;
    }
    .contact-section h3 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 16px; }
    .contact-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .contact-btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px;
      border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 1rem;
      transition: all 0.3s ease;
    }
    .contact-btn.phone {
      background: linear-gradient(135deg, #ff8c00, #ff6b00); color: white;
      box-shadow: 0 4px 15px rgba(234,88,12,0.3);
    }
    .contact-btn.phone:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(234,88,12,0.4); }
    .contact-btn.email {
      background: white; color: #1e293b; border: 2px solid #e2e8f0;
    }
    .contact-btn.email:hover { border-color: #38b6ff; color: #38b6ff; }

    .home-link { text-align: center; padding-bottom: 40px; }
    .home-link a {
      color: #38b6ff; text-decoration: none; font-weight: 600; font-size: 0.95rem;
    }
    .home-link a:hover { text-decoration: underline; }

    /* Footer */
    .footer { background: #000; color: #94a3b8; padding: 20px 0; }
    .footer-content {
      max-width: 800px; margin: 0 auto; padding: 0 20px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .footer-content img { height: 50px; }

    @media (max-width: 768px) {
      .hero h1 { font-size: 1.8rem; }
      .steps-grid { grid-template-columns: 1fr; }
      .summary-row { flex-direction: column; gap: 4px; }
      .contact-buttons { flex-direction: column; align-items: center; }
    }
  </style>
</head>
<body>
  <?php include 'nav.php'; ?>

  <section class="hero">
    <div class="checkmark">&#10003;</div>
    <h1>You're All Set!</h1>
    <p>Your information has been received. We're excited to help grow your business.</p>
  </section>

  <div class="container">

    <?php if ($submission): ?>
    <div class="summary-card">
      <h3>Your Submission</h3>
      <div class="summary-row">
        <span class="summary-label">Business</span>
        <span class="summary-value"><?php echo htmlspecialchars($submission['company_name']); ?></span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Contact</span>
        <span class="summary-value"><?php echo htmlspecialchars($submission['contact_name']); ?></span>
      </div>
      <?php if (!empty($submission['package_description'])): ?>
      <div class="summary-row">
        <span class="summary-label">Package</span>
        <span class="summary-value"><?php echo htmlspecialchars($submission['package_description']); ?></span>
      </div>
      <?php endif; ?>
      <?php if (!empty($submission['location'])): ?>
      <div class="summary-row">
        <span class="summary-label">Service Area</span>
        <span class="summary-value"><?php echo htmlspecialchars($submission['location']); ?></span>
      </div>
      <?php endif; ?>
      <div class="summary-row">
        <span class="summary-label">Confirmation sent to</span>
        <span class="summary-value"><?php echo htmlspecialchars($submission['email']); ?></span>
      </div>
    </div>
    <?php endif; ?>

    <div class="steps-section">
      <h2>What Happens Next</h2>
      <div class="steps-grid">
        <div class="step-card">
          <div class="step-number">1</div>
          <h4>We Review Your Info</h4>
          <p>Our team reviews your submission and confirms your exclusive category placement.</p>
        </div>
        <div class="step-card">
          <div class="step-number">2</div>
          <h4>We Design Your Ad</h4>
          <p>Our designers create a professional ad layout at no extra cost. You'll approve it before printing.</p>
        </div>
        <div class="step-card">
          <div class="step-number">3</div>
          <h4>Your Ad Gets Mailed</h4>
          <p>Your billboard-style postcard reaches thousands of households in your target area.</p>
        </div>
      </div>
    </div>

    <div class="timeline-callout">
      <div class="clock">&#9201;</div>
      <h3>We'll Contact You Within 24 Hours</h3>
      <p>A team member will reach out to discuss your campaign details and next steps.</p>
    </div>

    <div class="contact-section">
      <h3>Can't wait? Reach out directly.</h3>
      <div class="contact-buttons">
        <a href="tel:843-212-2969" class="contact-btn phone">Call (843) 212-2969</a>
        <a href="mailto:hello@lbspotlight.com" class="contact-btn email">Email hello@lbspotlight.com</a>
      </div>
    </div>

    <div class="home-link">
      <a href="index.php">&larr; Back to Homepage</a>
    </div>
  </div>

  <?php include 'footer.php'; ?>
</body>
</html>
