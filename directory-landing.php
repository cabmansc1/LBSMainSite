<?php
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
    }

    /* ===== HEADER ===== */
    .header {
      background: #000;
      padding: 15px 0;
      border-bottom: 1px solid #222;
    }

    .header-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand-wordmark {
      font-family: 'Inter', sans-serif;
      font-weight: 800;
      font-size: clamp(1.8rem, 3vw, 2.5rem);
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

    .nav-links {
      display: flex;
      gap: 30px;
      align-items: center;
    }

    .nav-links a {
      color: #ccc;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.3s ease;
    }

    .nav-links a:hover {
      color: #38b6ff;
    }

    .btn-list {
      background: linear-gradient(135deg, #ff8c00, #ff6b00);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 700;
      transition: all 0.3s ease;
    }

    .btn-list:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(234, 88, 12, 0.4);
    }

    /* ===== HERO SECTION ===== */
    .hero {
      background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
      padding: 80px 0;
      position: relative;
      overflow: hidden;
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
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 800;
      color: white;
      line-height: 1.1;
      margin-bottom: 20px;
    }

    .hero .highlight-text {
      color: #000000;
    }

    .hero p {
      font-size: 1.3rem;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 40px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    /* ===== SEARCH BAR ===== */
    .search-section {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 15px 50px rgba(0, 0, 0, 0.1);
      max-width: 800px;
      margin: 0 auto;
    }

    .search-form {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      gap: 15px;
      align-items: end;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }

    .form-group input,
    .form-group select {
      padding: 15px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.3s ease;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #38b6ff;
      box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
    }

    .btn-search {
      background: linear-gradient(135deg, #38b6ff, #0ea5e9);
      color: white;
      padding: 15px 30px;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      height: fit-content;
    }

    .btn-search:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(56, 182, 255, 0.3);
    }

    /* ===== FEATURED SECTION ===== */
    .featured-section {
      background: #f8fafc;
      padding: 80px 0;
    }

    .container {
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

    .featured-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 30px;
      margin-bottom: 60px;
    }

    /* ===== BUSINESS CARDS ===== */
    .business-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      border: 1px solid #e2e8f0;
    }

    .business-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
    }

    .business-card.featured {
      border: 3px solid #38b6ff;
      position: relative;
    }

    .tier-badge {
      position: absolute;
      top: 15px;
      right: 15px;
      background: #38b6ff;
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      z-index: 2;
    }

    .business-image {
      width: 100%;
      height: 200px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      color: #94a3b8;
      position: relative;
      overflow: hidden;
    }

    .business-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .business-content {
      padding: 25px;
    }

    .business-name {
      font-size: 1.4rem;
      font-weight: 700;
      color: #000000;
      margin-bottom: 8px;
    }

    .business-category {
      color: #38b6ff;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 15px;
    }

    .business-description {
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .business-info {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: #64748b;
    }

    .info-icon {
      width: 18px;
      text-align: center;
    }

    .business-hours {
      background: #f8fafc;
      padding: 15px;
      border-radius: 10px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .hours-title {
      font-weight: 600;
      margin-bottom: 10px;
      color: #333;
    }

    .coupon-section {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      border: 2px dashed #f59e0b;
      text-align: center;
    }

    .coupon-title {
      font-weight: 700;
      color: #92400e;
      margin-bottom: 8px;
    }

    .coupon-text {
      color: #b45309;
      font-size: 14px;
      font-weight: 600;
    }

    .business-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-contact {
      background: #38b6ff;
      color: white;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.3s ease;
      flex: 1;
      text-align: center;
      min-width: 120px;
    }

    .btn-contact:hover {
      background: #0ea5e9;
      transform: translateY(-2px);
    }

    .btn-website {
      background: #64748b;
      color: white;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.3s ease;
      flex: 1;
      text-align: center;
      min-width: 120px;
    }

    .btn-website:hover {
      background: #475569;
      transform: translateY(-2px);
    }

    /* ===== PRICING SECTION ===== */
    .pricing-section {
      padding: 80px 0;
      background: white;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .pricing-card {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px 30px;
      text-align: center;
      position: relative;
      transition: all 0.3s ease;
    }

    .pricing-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
    }

    .pricing-card.featured {
      border-color: #38b6ff;
      transform: scale(1.05);
    }

    .pricing-popular {
      position: absolute;
      top: -15px;
      left: 50%;
      transform: translateX(-50%);
      background: #38b6ff;
      color: white;
      padding: 8px 24px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .pricing-tier {
      font-size: 1.5rem;
      font-weight: 800;
      margin-bottom: 10px;
    }

    .pricing-price {
      font-size: 2.5rem;
      font-weight: 900;
      color: #38b6ff;
      margin-bottom: 5px;
    }

    .pricing-period {
      color: #64748b;
      margin-bottom: 30px;
    }

    .pricing-features {
      list-style: none;
      margin-bottom: 40px;
    }

    .pricing-features li {
      padding: 10px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .feature-check {
      width: 20px;
      height: 20px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    }

    .btn-pricing {
      background: linear-gradient(135deg, #38b6ff, #0ea5e9);
      color: white;
      padding: 15px 30px;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.3s ease;
      display: inline-block;
      width: 100%;
    }

    .btn-pricing:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(56, 182, 255, 0.3);
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .header-container {
        padding: 0 20px;
      }

      .nav-links {
        display: none;
      }

      .hero-container {
        padding: 0 20px;
      }

      .container {
        padding: 0 20px;
      }

      .search-form {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .featured-grid {
        grid-template-columns: 1fr;
      }

      .business-actions {
        flex-direction: column;
      }

      .pricing-grid {
        grid-template-columns: 1fr;
      }

      .pricing-card.featured {
        transform: none;
      }
    }
  </style>
</head>

<body>
  <!-- Header -->
  <header class="header">
    <div class="header-container">
      <p class="brand-wordmark">
        <span class="lowcountry">Lowcountry</span>
        <span class="business">Business</span>
        <span class="spotlight">Spotlight</span>
      </p>
      <nav class="nav-links">
        <a href="index.php">Home</a>
        <a href="directory.php">Directory</a>
        <a href="advertise.php">Advertise</a>
        <a href="#pricing">List Your Business</a>
        <a href="login.php" class="btn-list">Business Login</a>
      </nav>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-container">
      <h1>Charleston's Premier <span class="highlight-text">Business Directory</span></h1>
      <p>Discover local restaurants, home services, and retail businesses across the Lowcountry. Connect with trusted businesses in your community.</p>
      
      <!-- Search Section -->
      <div class="search-section">
        <form class="search-form" action="search.php" method="GET">
          <div class="form-group">
            <label for="search">What are you looking for?</label>
            <input type="text" id="search" name="q" placeholder="Business name, service, product...">
          </div>
          <div class="form-group">
            <label for="category">Category</label>
            <select id="category" name="category">
              <option value="">All Categories</option>
              <option value="restaurant">Restaurants</option>
              <option value="home-services">Home Services</option>
              <option value="retail">Retail</option>
            </select>
          </div>
          <div class="form-group">
            <label for="location">Location</label>
            <select id="location" name="location">
              <option value="">All Areas</option>
              <option value="charleston">Charleston</option>
              <option value="mount-pleasant">Mount Pleasant</option>
              <option value="summerville">Summerville</option>
              <option value="north-charleston">North Charleston</option>
              <option value="daniel-island">Daniel Island</option>
              <option value="goose-creek">Goose Creek</option>
              <option value="moncks-corner">Moncks Corner</option>
            </select>
          </div>
          <button type="submit" class="btn-search">Search</button>
        </form>
      </div>
    </div>
  </section>

  <!-- Featured Businesses -->
  <section class="featured-section">
    <div class="container">
      <div class="section-header">
        <h2>Featured Businesses</h2>
        <p>Premium listings from trusted local businesses across the Charleston area</p>
      </div>
      
      <div class="featured-grid">
        <!-- Upgraded Business Example -->
        <div class="business-card featured">
          <div class="tier-badge">Featured</div>
          <div class="business-image">
            🍕
          </div>
          <div class="business-content">
            <h3 class="business-name">Mario's Authentic Italian</h3>
            <div class="business-category">Restaurant</div>
            <p class="business-description">Family-owned Italian restaurant serving authentic homemade pasta, wood-fired pizzas, and traditional dishes passed down through generations. Using only the finest imported ingredients.</p>
            
            <div class="business-info">
              <div class="info-item">
                <span class="info-icon">📍</span>
                <span>123 King Street, Charleston, SC 29401</span>
              </div>
              <div class="info-item">
                <span class="info-icon">📞</span>
                <span>(843) 555-0123</span>
              </div>
              <div class="info-item">
                <span class="info-icon">🌐</span>
                <span>www.mariositalian.com</span>
              </div>
            </div>

            <div class="business-hours">
              <div class="hours-title">Hours</div>
              <div>Mon-Thu: 11am-9pm</div>
              <div>Fri-Sat: 11am-10pm</div>
              <div>Sun: 12pm-8pm</div>
            </div>

            <div class="coupon-section">
              <div class="coupon-title">🎉 Special Offer</div>
              <div class="coupon-text">20% Off Any Large Pizza - Show This Ad!</div>
            </div>

            <div class="business-actions">
              <a href="tel:843-555-0123" class="btn-contact">Call Now</a>
              <a href="https://mariositalian.com" class="btn-website">Visit Website</a>
            </div>
          </div>
        </div>

        <!-- Basic Business Example (shown for comparison) -->
        <div class="business-card">
          <div class="business-image">
            👕
          </div>
          <div class="business-content">
            <h3 class="business-name">Coastal Boutique</h3>
            <div class="business-category">Retail</div>
            
            <div class="business-info">
              <div class="info-item">
                <span class="info-icon">📍</span>
                <span>789 Market St, Charleston, SC 29401</span>
              </div>
              <div class="info-item">
                <span class="info-icon">📞</span>
                <span>(843) 555-0789</span>
              </div>
              <div class="info-item">
                <span class="info-icon">🌐</span>
                <span>www.coastalboutique.com</span>
              </div>
            </div>

            <div class="business-actions">
              <a href="tel:843-555-0789" class="btn-contact">Call Now</a>
              <a href="https://coastalboutique.com" class="btn-website">Visit Website</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing Section -->
  <section class="pricing-section" id="pricing">
    <div class="container">
      <div class="section-header">
        <h2>List Your Business Today</h2>
        <p>Choose the perfect plan to showcase your business and attract more customers</p>
      </div>
      
      <div class="pricing-grid" style="max-width: 800px;">
        <!-- Basic Tier -->
        <div class="pricing-card">
          <h3 class="pricing-tier">Basic Listing</h3>
          <div class="pricing-price">FREE</div>
          <p class="pricing-period">Always Free</p>

          <ul class="pricing-features">
            <li><span class="feature-check">✓</span> Business name &amp; category</li>
            <li><span class="feature-check">✓</span> Contact info (phone, address, website)</li>
            <li><span class="feature-check">✓</span> 1 logo photo</li>
            <li><span class="feature-check">✓</span> Contact form</li>
            <li><span class="feature-check">✓</span> Listed in directory</li>
          </ul>

          <a href="signup.php?plan=basic" class="btn-pricing">Get Listed Free</a>
        </div>

        <!-- Upgraded Tier -->
        <div class="pricing-card featured">
          <div class="pricing-popular">Best Value</div>
          <h3 class="pricing-tier">Upgraded Listing</h3>
          <div class="pricing-price">$75</div>
          <p class="pricing-period">per year</p>

          <ul class="pricing-features">
            <li><span class="feature-check">✓</span> Everything in Basic</li>
            <li><span class="feature-check">✓</span> Featured placement (gold badge, top of directory)</li>
            <li><span class="feature-check">✓</span> Up to 8 photos with gallery</li>
            <li><span class="feature-check">✓</span> Custom banner image</li>
            <li><span class="feature-check">✓</span> Description &amp; extended description</li>
            <li><span class="feature-check">✓</span> Business hours</li>
            <li><span class="feature-check">✓</span> Special offers &amp; coupons</li>
            <li><span class="feature-check">✓</span> Social media links</li>
            <li><span class="feature-check">✓</span> Analytics dashboard</li>
            <li><span class="feature-check">✓</span> 25% off postcard marketing (2x/year)</li>
          </ul>

          <a href="signup.php?plan=upgraded" class="btn-pricing">Get Upgraded</a>
        </div>
      </div>

      <!-- Bundle Offer -->
      <div style="text-align: center; margin-top: 60px; padding: 40px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 16px; border: 2px solid #f59e0b;">
        <h3 style="color: #92400e; margin-bottom: 15px; font-size: 1.5rem;">💥 Bundle &amp; Save!</h3>
        <p style="color: #b45309; font-size: 1.1rem; margin-bottom: 20px;">Combine your directory listing with our postcard marketing for maximum exposure!</p>
        <a href="bundles.php" style="background: linear-gradient(135deg, #ff8c00, #ff6b00); color: white; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: 700; display: inline-block;">View Bundle Options</a>
      </div>
    </div>
  </section>

  <?php include 'footer.php'; ?>

  <script>
    // Simple search form enhancement
    document.addEventListener('DOMContentLoaded', function() {
      const searchForm = document.querySelector('.search-form');
      const searchInput = document.querySelector('#search');
      
      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchForm.submit();
        }
      });
    });
  </script>
</body>
</html>