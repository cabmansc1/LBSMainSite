<?php
require_once 'config.php';
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
        background: #f8fafc;
        min-height: 100vh;
    }

    /* Page Header */
    .page-header {
        background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
        padding: 50px 20px;
        text-align: center;
        color: white;
    }

    .page-header h1 {
        font-size: clamp(2rem, 5vw, 2.75rem);
        font-weight: 800;
        margin-bottom: 15px;
    }

    .page-header p {
        font-size: 1.15rem;
        opacity: 0.95;
        max-width: 600px;
        margin: 0 auto;
        line-height: 1.6;
    }

    /* Main Container */
    .container {
        max-width: 700px;
        margin: 0 auto;
        padding: 40px 20px;
    }

    /* Form Card */
    .form-card {
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,.04);
        border: 1px solid #e2e8f0;
        padding: 40px;
        margin-bottom: 30px;
    }

    .form-card h2 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 10px;
        text-align: center;
    }

    .form-card .subtitle {
        color: #64748b;
        text-align: center;
        margin-bottom: 30px;
    }

    /* Form Sections */
    .form-section {
        margin-bottom: 30px;
    }

    .form-section-title {
        font-size: 0.9rem;
        font-weight: 700;
        color: #38b6ff;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 2px solid #e2e8f0;
    }

    .form-group {
        margin-bottom: 20px;
    }

    .form-group label {
        display: block;
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
        font-size: 0.95rem;
    }

    .form-group label .required {
        color: #ef4444;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
        width: 100%;
        padding: 14px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        font-size: 1rem;
        font-family: 'Inter', sans-serif;
        transition: border-color 0.3s ease, box-shadow 0.3s ease;
        background: white;
    }

    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
        outline: none;
        border-color: #38b6ff;
        box-shadow: 0 0 0 4px rgba(56,182,255,0.1);
    }

    .form-group textarea {
        resize: vertical;
        min-height: 100px;
    }

    .form-group input[type="file"] {
        padding: 12px;
        background: #f8fafc;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }

    .form-hint {
        font-size: 0.85rem;
        color: #64748b;
        margin-top: 6px;
    }

    /* Submit Button */
    .btn-submit {
        width: 100%;
        background: linear-gradient(135deg, #ff8c00, #ff6b00);
        color: white;
        padding: 18px 30px;
        border-radius: 10px;
        text-decoration: none;
        font-weight: 700;
        font-size: 1.1rem;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 8px 25px rgba(234, 88, 12, 0.3);
        margin-top: 10px;
    }

    .btn-submit:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(234,88,12,0.35);
    }

    /* Info Cards */
    .info-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
    }

    .info-card {
        background: #f8fafc;
        border-radius: 14px;
        padding: 25px;
        text-align: center;
        border: 2px solid #e2e8f0;
        transition: all 0.25s ease;
    }

    .info-card:hover {
        border-color: #38b6ff;
        transform: translateY(-3px);
        box-shadow: 0 12px 32px rgba(56,182,255,.12);
    }

    .info-card .icon {
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #38b6ff, #0ea5e9);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 15px;
        box-shadow: 0 4px 12px rgba(56,182,255,.25);
    }

    .info-card .icon svg {
        width: 24px;
        height: 24px;
        fill: white;
    }

    .info-card h2 {
        font-size: 1rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 8px;
    }

    .info-card p {
        font-size: 0.9rem;
        color: #64748b;
    }

    /* Contact Section */
    .contact-section {
        text-align: center;
        padding: 30px;
        background: white;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 20px rgba(0,0,0,.04);
    }

    .contact-section h3 {
        font-size: 1.25rem;
        margin-bottom: 10px;
        color: #1e293b;
    }

    .contact-section p {
        color: #64748b;
        margin-bottom: 15px;
    }

    .contact-links {
        display: flex;
        justify-content: center;
        gap: 25px;
        flex-wrap: wrap;
    }

    .contact-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #38b6ff;
        text-decoration: none;
        font-weight: 600;
        font-size: 1rem;
    }

    .contact-link:hover {
        text-decoration: underline;
    }

    /* FAQ hover effect */
    .faq-item button {
        transition: background 0.2s;
    }

    /* Footer */
    .page-footer {
        background: #1e293b;
        color: white;
        text-align: center;
        padding: 30px 20px;
        margin-top: 40px;
    }

    .page-footer p {
        opacity: 0.8;
        font-size: 0.9rem;
    }

    .page-footer a {
        color: #38b6ff;
        text-decoration: none;
    }

    /* Responsive */
    @media (max-width: 768px) {
        .form-card {
            padding: 25px 20px;
        }

        .form-row {
            grid-template-columns: 1fr;
        }

        .page-header {
            padding: 40px 20px;
        }

        .logo-container {
            padding: 0 20px;
        }
    }
    </style>
</head>
<body>
    <?php include 'header.php'; ?>

    <!-- Page Header -->
    <div class="page-header">
        <h1>Spotlight Postcards</h1>
        <p>9x12 oversized postcards reaching 5,000-10,000 Charleston area households with exclusive category placement.</p>
    </div>

    <!-- Postcard Preview Images -->
    <div style="max-width: 1000px; margin: 0 auto; padding: 32px 20px 0; display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
        <img src="/images/9x12 Horizontal 1.jpg" alt="9x12 oversized direct mail postcard front - Charleston area local business advertising" style="max-width: 480px; width: calc(50% - 10px); height: auto; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,.1);">
        <img src="/images/9x12 Horizontal 2.jpg" alt="9x12 oversized direct mail postcard back - multiple business category placement example" style="max-width: 480px; width: calc(50% - 10px); height: auto; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,.1);">
    </div>

    <div class="container">
        <!-- Info Cards -->
        <div class="info-section">
            <div class="info-card">
                <div class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                </div>
                <h2>Local Reach</h2>
                <p>Target Charleston area households directly</p>
            </div>
            <div class="info-card">
                <div class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
                </div>
                <h2>Affordable</h2>
                <p>As low as 5 cents per mailbox</p>
            </div>
            <div class="info-card">
                <div class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
                </div>
                <h2>Proven Results</h2>
                <p>Direct mail delivers real ROI</p>
            </div>
        </div>

        <!-- Form Card -->
        <div class="form-card">
            <h2>Reserve Your Spot</h2>
            <p class="subtitle">Tell us a little about your business and we'll reach out to discuss options.</p>

            <form method="POST" action="process_form.php" id="advertise-form">
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                <input type="hidden" name="recaptcha_token" id="recaptcha_token" value="">

                    <div class="form-group">
                        <label>Company Name <span class="required">*</span></label>
                        <input type="text" name="company_name" required placeholder="Your Business Name">
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Contact Name <span class="required">*</span></label>
                            <input type="text" name="contact_name" required placeholder="Your Name">
                        </div>
                        <!-- Phone field removed: SMS opt-in handled by chat widget only.
                        <div class="form-group">
                            <label>Phone Number <span class="required">*</span></label>
                            <input type="tel" name="phone" required placeholder="(843) 555-1234">
                        </div>
                        -->
                    </div>

                    <div class="form-group">
                        <label>Email Address <span class="required">*</span></label>
                        <input type="email" name="email" required placeholder="you@yourbusiness.com">
                    </div>

                <button type="submit" class="btn-submit">Get Started</button>
            </form>
        </div>

        <!-- Contact Section -->
        <div class="contact-section">
            <h3>Questions? We're Here to Help!</h3>
            <p>Not sure which package is right for you? Let's chat!</p>
            <div class="contact-links">
                <a href="tel:8432122969" class="contact-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
                    (843) 212-2969
                </a>
                <a href="mailto:hello@lbspotlight.com" class="contact-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    hello@lbspotlight.com
                </a>
            </div>
        </div>
    </div>

    <!-- FAQ Section -->
    <section style="background: #1e293b; padding: 80px 20px;">
      <div style="max-width: 800px; margin: 0 auto;">
        <h2 style="font-family: 'Inter', sans-serif; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 800; color: white; text-align: center; margin-bottom: 15px;">Advertising FAQs</h2>
        <p style="font-family: 'Inter', sans-serif; color: #94a3b8; text-align: center; font-size: 1.1rem; margin-bottom: 50px;">Common questions about our postcard advertising campaigns.</p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div class="faq-item" style="background: #273549; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
            <button onclick="toggleFaq(this)" style="width: 100%; padding: 20px 24px; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-align: left;">
              <span style="font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 600; color: white;">What areas do you currently serve?</span>
              <span style="font-family: 'Inter', sans-serif; color: #38b6ff; font-size: 1.5rem; transition: transform 0.3s ease; flex-shrink: 0; margin-left: 16px;">+</span>
            </button>
            <div style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
              <p style="font-family: 'Inter', sans-serif; padding: 0 24px 20px; color: #cbd5e1; font-size: 0.95rem; line-height: 1.7; margin: 0;">We mail to households in Summerville, Mount Pleasant, Daniel Island, and Charleston. New areas are added regularly.</p>
            </div>
          </div>

          <div class="faq-item" style="background: #273549; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
            <button onclick="toggleFaq(this)" style="width: 100%; padding: 20px 24px; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-align: left;">
              <span style="font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 600; color: white;">How often are postcards mailed?</span>
              <span style="font-family: 'Inter', sans-serif; color: #38b6ff; font-size: 1.5rem; transition: transform 0.3s ease; flex-shrink: 0; margin-left: 16px;">+</span>
            </button>
            <div style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
              <p style="font-family: 'Inter', sans-serif; padding: 0 24px 20px; color: #cbd5e1; font-size: 0.95rem; line-height: 1.7; margin: 0;">We run mailings every 4-6 weeks per area. Check our upcoming mailers page for specific dates.</p>
            </div>
          </div>

          <div class="faq-item" style="background: #273549; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
            <button onclick="toggleFaq(this)" style="width: 100%; padding: 20px 24px; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-align: left;">
              <span style="font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 600; color: white;">Can I choose my ad size?</span>
              <span style="font-family: 'Inter', sans-serif; color: #38b6ff; font-size: 1.5rem; transition: transform 0.3s ease; flex-shrink: 0; margin-left: 16px;">+</span>
            </button>
            <div style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
              <p style="font-family: 'Inter', sans-serif; padding: 0 24px 20px; color: #cbd5e1; font-size: 0.95rem; line-height: 1.7; margin: 0;">Yes! We offer small, medium, and large ad sizes. Larger ads get more visibility and better placement.</p>
            </div>
          </div>

          <div class="faq-item" style="background: #273549; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
            <button onclick="toggleFaq(this)" style="width: 100%; padding: 20px 24px; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-align: left;">
              <span style="font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 600; color: white;">What's the deadline to get on the next mailing?</span>
              <span style="font-family: 'Inter', sans-serif; color: #38b6ff; font-size: 1.5rem; transition: transform 0.3s ease; flex-shrink: 0; margin-left: 16px;">+</span>
            </button>
            <div style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
              <p style="font-family: 'Inter', sans-serif; padding: 0 24px 20px; color: #cbd5e1; font-size: 0.95rem; line-height: 1.7; margin: 0;">Deadlines are typically 2 weeks before the mail date. Contact us early to secure your spot — spaces fill up fast.</p>
            </div>
          </div>

          <div class="faq-item" style="background: #273549; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
            <button onclick="toggleFaq(this)" style="width: 100%; padding: 20px 24px; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; text-align: left;">
              <span style="font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 600; color: white;">Do you offer discounts for multiple mailings?</span>
              <span style="font-family: 'Inter', sans-serif; color: #38b6ff; font-size: 1.5rem; transition: transform 0.3s ease; flex-shrink: 0; margin-left: 16px;">+</span>
            </button>
            <div style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
              <p style="font-family: 'Inter', sans-serif; padding: 0 24px 20px; color: #cbd5e1; font-size: 0.95rem; line-height: 1.7; margin: 0;">Yes! We offer package pricing for businesses that commit to multiple mailings. Contact us for details.</p>
            </div>
          </div>
        </div>
      </div>

      <script>
      function toggleFaq(btn) {
        var answer = btn.nextElementSibling;
        var icon = btn.querySelector('span:last-child');
        var isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
        document.querySelectorAll('.faq-item').forEach(function(item) {
          var a = item.querySelector('button + div');
          var i = item.querySelector('button span:last-child');
          if (a && a !== answer) {
            a.style.maxHeight = '0px';
            if (i) { i.textContent = '+'; i.style.transform = 'rotate(0deg)'; }
          }
        });
        if (isOpen) {
          answer.style.maxHeight = '0px';
          icon.textContent = '+';
          icon.style.transform = 'rotate(0deg)';
        } else {
          answer.style.maxHeight = answer.scrollHeight + 'px';
          icon.textContent = '-';
          icon.style.transform = 'rotate(180deg)';
        }
      }
      </script>

      <!-- FAQPage JSON-LD Schema -->
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What areas do you currently serve?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We mail to households in Summerville, Mount Pleasant, Daniel Island, and Charleston. New areas are added regularly."
            }
          },
          {
            "@type": "Question",
            "name": "How often are postcards mailed?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We run mailings every 4-6 weeks per area. Check our upcoming mailers page for specific dates."
            }
          },
          {
            "@type": "Question",
            "name": "Can I choose my ad size?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! We offer small, medium, and large ad sizes. Larger ads get more visibility and better placement."
            }
          },
          {
            "@type": "Question",
            "name": "What's the deadline to get on the next mailing?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Deadlines are typically 2 weeks before the mail date. Contact us early to secure your spot — spaces fill up fast."
            }
          },
          {
            "@type": "Question",
            "name": "Do you offer discounts for multiple mailings?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! We offer package pricing for businesses that commit to multiple mailings. Contact us for details."
            }
          }
        ]
      }
      </script>
    </section>

    <?php include 'footer.php'; ?>

    <script src="https://www.google.com/recaptcha/api.js?render=<?php echo RECAPTCHA_SITE_KEY; ?>"></script>
    <script>
      (function () {
        var form = document.getElementById('advertise-form');
        if (!form) return;
        form.addEventListener('submit', function (e) {
          if (form.dataset.recaptchaDone === '1') return;
          e.preventDefault();
          // In-flight lock: ignore extra clicks/Enter while reCAPTCHA runs, so a
          // fast double-click can't fire two submissions (duplicate lead + emails).
          if (form.dataset.submitting === '1') return;
          form.dataset.submitting = '1';
          var btn = form.querySelector('[type="submit"]');
          if (btn) { btn.dataset.orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'Submitting…'; }
          grecaptcha.ready(function () {
            grecaptcha.execute('<?php echo RECAPTCHA_SITE_KEY; ?>', { action: 'advertise_submit' })
              .then(function (token) {
                document.getElementById('recaptcha_token').value = token;
                form.dataset.recaptchaDone = '1';
                form.submit();
              })
              .catch(function () {
                // Don't leave the form permanently locked if reCAPTCHA fails.
                form.dataset.submitting = '0';
                if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.orig; }
              });
          });
        });
      })();
    </script>

</body>
</html>
