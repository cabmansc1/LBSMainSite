<!-- Newsletter + Footer -->
<section class="site-newsletter">
  <div class="site-newsletter-inner">
    <h3>Stay in the Loop</h3>
    <p>Get local business tips, new listings, and exclusive deals delivered to your inbox.</p>
    <form class="site-newsletter-form" id="siteNewsletterForm" onsubmit="return siteSubmitNewsletter(event)">
      <input type="email" name="email" placeholder="Enter your email address" required>
      <input type="hidden" name="source" value="<?php echo basename($_SERVER['PHP_SELF'], '.php'); ?>">
      <button type="submit">Subscribe</button>
    </form>
    <div class="site-newsletter-msg" id="siteNewsletterMsg"></div>
  </div>
</section>

<footer class="site-footer">
  <div class="site-footer-container">
    <div class="site-footer-grid">
      <!-- Column 1: Brand -->
      <div class="site-footer-col">
        <h4 class="site-footer-brand">
          <span style="color:#38b6ff;">Lowcountry</span> Business <span style="color:#38b6ff;">Spotlight</span>
        </h4>
        <p class="site-footer-tagline">Bringing Local Businesses Together To Share The Cost of Advertising</p>
        <div class="site-footer-contact-list">
          <a href="tel:843-212-2969">📞 (843) 212-2969</a>
          <a href="mailto:hello@lbspotlight.com">✉️ hello@lbspotlight.com</a>
          <span style="color:#94a3b8; font-size:0.9rem;">📬 PO Box 357, Huger, SC 29450</span>
        </div>
      </div>

      <!-- Column 2: Quick Links -->
      <div class="site-footer-col">
        <h5>Quick Links</h5>
        <ul>
          <li><a href="/index.php">Home</a></li>
          <li><a href="/advertise.php">Spotlight Postcards</a></li>
          <li><a href="/directory/">Business Directory</a></li>
          <li><a href="/directory-signup.php">List Your Business</a></li>
          <li><a href="/blog.php">Blog</a></li>
          <li><a href="/contact.php">Contact</a></li>
        </ul>
      </div>

      <!-- Column 3: Service Areas -->
      <div class="site-footer-col">
        <h5>Service Areas</h5>
        <ul>
          <li><a href="/summerville-direct-mail-marketing.php">Summerville</a></li>
          <li><a href="/mount-pleasant-direct-mail-marketing.php">Mount Pleasant</a></li>
          <li><a href="/daniel-island-direct-mail-marketing.php">Daniel Island</a></li>
          <li><a href="/north-charleston-direct-mail-marketing.php">North Charleston</a></li>
          <li><a href="/moncks-corner-direct-mail-marketing.php">Moncks Corner</a></li>
          <li><a href="/charleston-direct-mail-marketing.php">Charleston</a></li>
          <li><a href="/goose-creek-direct-mail-marketing.php">Goose Creek</a></li>
          <li><a href="/sullivans-island-direct-mail-marketing.php">Sullivans Island</a></li>
          <li><a href="/isle-of-palms-direct-mail-marketing.php">Isle of Palms</a></li>
        </ul>
      </div>

      <!-- Column 4: Resources -->
      <div class="site-footer-col">
        <h5>Resources</h5>
        <ul>
          <li><a href="/roi-calculator.php">ROI Calculator</a></li>
          <li><a href="/find-your-ad.php">Find Your Ad</a></li>
          <li><a href="/privacy.php">Privacy Policy</a></li>
          <li><a href="/terms.php">Terms of Service</a></li>
          <li><a href="/dashboard.php">Advertiser Login</a></li>
        </ul>
      </div>
    </div>

    <div class="site-footer-bottom">
      <p>&copy; 2025-2026 Lowcountry Business Spotlight. All rights reserved.</p>
    </div>
  </div>

  <!-- Organization Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Lowcountry Business Spotlight",
    "description": "Billboard-style direct mail marketing serving the Charleston, SC metro area. Affordable postcard advertising with exclusive category placement.",
    "url": "https://www.lowcountrybusinessspotlight.com",
    "logo": "https://www.lowcountrybusinessspotlight.com/images/lbs_logo.png",
    "image": "https://www.lowcountrybusinessspotlight.com/images/og-image.jpg",
    "telephone": "+1-843-212-2969",
    "email": "hello@lbspotlight.com",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "PO Box 357",
      "addressLocality": "Huger",
      "addressRegion": "SC",
      "postalCode": "29450",
      "addressCountry": "US"
    },
    "areaServed": [
      {"@type": "City", "name": "Summerville", "containedInPlace": {"@type": "State", "name": "South Carolina"}},
      {"@type": "City", "name": "Mount Pleasant", "containedInPlace": {"@type": "State", "name": "South Carolina"}},
      {"@type": "City", "name": "Daniel Island", "containedInPlace": {"@type": "State", "name": "South Carolina"}},
      {"@type": "City", "name": "North Charleston", "containedInPlace": {"@type": "State", "name": "South Carolina"}},
      {"@type": "City", "name": "Moncks Corner", "containedInPlace": {"@type": "State", "name": "South Carolina"}},
      {"@type": "City", "name": "Charleston", "containedInPlace": {"@type": "State", "name": "South Carolina"}}
    ],
    "openingHoursSpecification": [
      {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "09:00", "closes": "18:00"},
      {"@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "10:00", "closes": "16:00"}
    ],
    "priceRange": "$$",
    "knowsAbout": ["Direct Mail Marketing", "Postcard Advertising", "Local Business Advertising"]
  }
  </script>

  <!-- LeadConnector Chat Widget -->
  <?php if (empty($hideChatWidget)): // suppressed on pages with phone-collecting forms (A2P 10DLC: single opt-in source) ?>
  <script src="https://beta.leadconnectorhq.com/loader.js" data-resources-url="https://beta.leadconnectorhq.com/chat-widget/loader.js" data-widget-id="69d532d03d6e16133a207508"></script>
  <?php endif; ?>
</footer>

<style>
/* ===== NEWSLETTER SECTION ===== */
.site-newsletter {
  background: #f0f4f8;
  padding: 60px 20px;
  text-align: center;
  border-top: 1px solid #e2e8f0;
}
.site-newsletter-inner {
  max-width: 560px;
  margin: 0 auto;
}
.site-newsletter h3 {
  font-family: 'Inter', sans-serif;
  color: #1e293b;
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 10px;
}
.site-newsletter p {
  font-family: 'Inter', sans-serif;
  color: #64748b;
  font-size: 1.05rem;
  margin-bottom: 25px;
}
.site-newsletter-form {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.site-newsletter-form input[type="email"] {
  flex: 1;
  max-width: 360px;
  padding: 14px 18px;
  border: 2px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  color: #1e293b;
  font-size: 1rem;
  font-family: 'Inter', sans-serif;
}
.site-newsletter-form input[type="email"]::placeholder { color: #94a3b8; }
.site-newsletter-form input[type="email"]:focus { outline: none; border-color: #38b6ff; }
.site-newsletter-form button {
  background: linear-gradient(135deg, #38b6ff, #0ea5e9);
  color: #fff;
  padding: 14px 28px;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  white-space: nowrap;
  font-family: 'Inter', sans-serif;
  transition: transform 0.2s;
}
.site-newsletter-form button:hover { transform: translateY(-2px); }
.site-newsletter-msg {
  margin-top: 12px;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  min-height: 1.4em;
}
.site-newsletter-msg.success { color: #22c55e; }
.site-newsletter-msg.error { color: #ef4444; }

/* ===== FOOTER ===== */
.site-footer {
  background: #000;
  color: #94a3b8;
  padding: 60px 0 0;
  font-family: 'Inter', sans-serif;
}
.site-footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
}
.site-footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 40px;
}
.site-footer-brand {
  font-size: 1.3rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 10px;
}
.site-footer-tagline {
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 20px;
  line-height: 1.5;
}
.site-footer-contact-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.site-footer-contact-list a {
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.3s;
}
.site-footer-contact-list a:hover { color: #38b6ff; }
.site-footer-col h5 {
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 16px;
}
.site-footer-col ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.site-footer-col ul li { margin-bottom: 10px; }
.site-footer-col ul li::before { content: none !important; }
.site-footer-col ul li a {
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.3s;
}
.site-footer-col ul li a:hover { color: #38b6ff; }
.site-footer-bottom {
  margin-top: 40px;
  padding: 20px 0;
  border-top: 1px solid #1a1a1a;
  text-align: center;
  font-size: 0.85rem;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .site-newsletter-form {
    flex-direction: column;
    align-items: center;
  }
  .site-newsletter-form input[type="email"] {
    max-width: 100%;
    width: 100%;
  }
  .site-newsletter-form button { width: 100%; }
  .site-footer-grid {
    grid-template-columns: 1fr;
    gap: 30px;
    text-align: center;
  }
  .site-footer-contact-list { align-items: center; }
  .site-footer-container { padding: 0 20px; }
}
</style>

<script>
function siteSubmitNewsletter(e) {
  e.preventDefault();
  var form = document.getElementById('siteNewsletterForm');
  var msg = document.getElementById('siteNewsletterMsg');
  var email = form.querySelector('input[name="email"]').value;
  var source = form.querySelector('input[name="source"]').value;
  msg.textContent = 'Subscribing...';
  msg.className = 'site-newsletter-msg';

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/newsletter_subscribe.php', true);
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.onload = function() {
    try {
      var data = JSON.parse(xhr.responseText);
      msg.textContent = data.message;
      msg.className = 'site-newsletter-msg ' + (data.success ? 'success' : 'error');
      if (data.success) form.querySelector('input[name="email"]').value = '';
    } catch(err) {
      msg.textContent = 'Something went wrong. Please try again.';
      msg.className = 'site-newsletter-msg error';
    }
  };
  xhr.send('email=' + encodeURIComponent(email) + '&source=' + encodeURIComponent(source));
  return false;
}
</script>