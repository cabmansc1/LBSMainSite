<?php
// A2P 10DLC: page has phone-shaped fields, suppress chat widget to avoid scanner false positives
$hideChatWidget = true;

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
      background: #f8fafc;
      color: #333;
    }

    /* ===== HEADER ===== */
    .header {
      background: white;
      border-bottom: 1px solid #e2e8f0;
      padding: 20px 0;
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
      font-size: 1.5rem;
      font-weight: 800;
      color: #38b6ff;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .user-info {
      font-weight: 600;
      color: #333;
    }

    .btn-logout {
      background: #ef4444;
      color: white;
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.3s ease;
    }

    .btn-logout:hover {
      background: #ff6b00;
    }

    /* ===== DASHBOARD LAYOUT ===== */
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px;
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 40px;
    }

    /* ===== SIDEBAR ===== */
    .sidebar {
      background: white;
      border-radius: 12px;
      padding: 30px;
      height: fit-content;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }

    .sidebar h3 {
      margin-bottom: 20px;
      color: #333;
      font-size: 1.1rem;
    }

    .sidebar-nav {
      list-style: none;
    }

    .sidebar-nav li {
      margin-bottom: 10px;
    }

    .sidebar-nav a {
      display: block;
      padding: 12px 16px;
      color: #64748b;
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.3s ease;
      font-weight: 500;
    }

    .sidebar-nav a:hover,
    .sidebar-nav a.active {
      background: #38b6ff;
      color: white;
    }

    /* ===== MAIN CONTENT ===== */
    .main-content {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }

    .page-title {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 30px;
      color: #333;
    }

    /* ===== STATUS CARDS ===== */
    .status-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .status-card {
      background: linear-gradient(135deg, #38b6ff, #0ea5e9);
      color: white;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
    }

    .status-card.featured {
      background: linear-gradient(135deg, #10b981, #059669);
    }

    .status-card.elite {
      background: linear-gradient(135deg, #ff8c00, #ff6b00);
    }

    .status-card h4 {
      font-size: 1.2rem;
      margin-bottom: 10px;
    }

    .status-card p {
      opacity: 0.9;
      font-size: 0.9rem;
    }

    .status-value {
      font-size: 2rem;
      font-weight: 900;
      margin: 10px 0;
    }

    /* ===== FORM SECTIONS ===== */
    .form-section {
      margin-bottom: 40px;
      padding: 30px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
    }

    .section-title {
      font-size: 1.3rem;
      font-weight: 700;
      margin-bottom: 20px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 16px;
      transition: all 0.3s ease;
    }

    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
      outline: none;
      border-color: #38b6ff;
      box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
    }

    .form-group textarea {
      resize: vertical;
      min-height: 100px;
    }

    /* ===== FILE UPLOAD ===== */
    .file-upload-area {
      border: 2px dashed #38b6ff;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      background: #f0f9ff;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .file-upload-area:hover {
      border-color: #0ea5e9;
      background: #e0f2fe;
    }

    .file-upload-area.dragover {
      border-color: #0ea5e9;
      background: #e0f2fe;
      transform: scale(1.02);
    }

    .upload-icon {
      font-size: 3rem;
      color: #38b6ff;
      margin-bottom: 20px;
    }

    .upload-text {
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 10px;
    }

    .upload-subtext {
      color: #64748b;
      font-size: 0.9rem;
    }

    /* ===== IMAGE PREVIEW ===== */
    .image-preview {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }

    .image-item {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      aspect-ratio: 1;
      border: 2px solid #e2e8f0;
    }

    .image-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .image-remove {
      position: absolute;
      top: 5px;
      right: 5px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ===== HOURS TABLE ===== */
    .hours-table {
      width: 100%;
      border-collapse: collapse;
    }

    .hours-table th,
    .hours-table td {
      padding: 15px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    .hours-table th {
      background: #f8fafc;
      font-weight: 600;
      color: #333;
    }

    .hours-input {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .hours-input input {
      width: 100px;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin: 0;
    }

    .closed-checkbox {
      margin-right: 10px;
    }

    /* ===== BUTTONS ===== */
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.3s ease;
      display: inline-block;
      text-align: center;
    }

    .btn-primary {
      background: linear-gradient(135deg, #38b6ff, #0ea5e9);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(56, 182, 255, 0.3);
    }

    .btn-secondary {
      background: #64748b;
      color: white;
    }

    .btn-secondary:hover {
      background: #475569;
    }

    .btn-success {
      background: #10b981;
      color: white;
    }

    .btn-success:hover {
      background: #059669;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #ff6b00;
    }

    .btn-group {
      display: flex;
      gap: 15px;
      margin-top: 30px;
    }

    /* ===== UPGRADE BANNER ===== */
    .upgrade-banner {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      margin-bottom: 30px;
    }

    .upgrade-banner h3 {
      color: #92400e;
      font-size: 1.4rem;
      margin-bottom: 15px;
    }

    .upgrade-banner p {
      color: #b45309;
      margin-bottom: 20px;
    }

    .btn-upgrade {
      background: linear-gradient(135deg, #ff8c00, #ff6b00);
      color: white;
      padding: 15px 30px;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-block;
    }

    .btn-upgrade:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(234, 88, 12, 0.3);
    }

    /* ===== PREVIEW SECTION ===== */
    .preview-section {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 30px;
      margin-top: 30px;
    }

    .preview-title {
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 20px;
      color: #333;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .dashboard-container {
        grid-template-columns: 1fr;
        padding: 20px;
        gap: 20px;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .btn-group {
        flex-direction: column;
      }

      .status-cards {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>

<body>
  <!-- Header -->
  <header class="header">
    <div class="header-container">
      <div class="brand-wordmark">Lowcountry Business Spotlight</div>
      <div class="user-menu">
        <span class="user-info">Welcome, Mario's Italian Restaurant</span>
        <a href="logout.php" class="btn-logout">Logout</a>
      </div>
    </div>
  </header>

  <!-- Dashboard Container -->
  <div class="dashboard-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <h3>Dashboard Menu</h3>
      <ul class="sidebar-nav">
        <li><a href="#overview" class="active">📊 Overview</a></li>
        <li><a href="#edit-listing">✏️ Edit Listing</a></li>
        <li><a href="#photos">📷 Manage Photos</a></li>
        <li><a href="#hours">🕒 Business Hours</a></li>
        <li><a href="#coupons">🎟️ Coupons & Offers</a></li>
        <li><a href="#analytics">📈 Analytics</a></li>
        <li><a href="#billing">💳 Billing</a></li>
        <li><a href="#upgrade">⭐ Upgrade Plan</a></li>
      </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <h1 class="page-title">Business Dashboard</h1>

      <!-- Status Cards -->
      <div class="status-cards">
        <div class="status-card elite">
          <h4>Current Plan</h4>
          <div class="status-value">Elite</div>
          <p>Next billing: March 15, 2025</p>
        </div>
        <div class="status-card">
          <h4>Monthly Views</h4>
          <div class="status-value">1,247</div>
          <p>+23% from last month</p>
        </div>
        <div class="status-card featured">
          <h4>Total Inquiries</h4>
          <div class="status-value">89</div>
          <p>This month</p>
        </div>
      </div>

      <!-- Edit Listing Form -->
      <div class="form-section" id="edit-listing">
        <h2 class="section-title">📝 Basic Information</h2>
        <form id="business-form">
          <div class="form-grid">
            <div class="form-group">
              <label for="business-name">Business Name *</label>
              <input type="text" id="business-name" value="Mario's Authentic Italian" required>
            </div>
            <div class="form-group">
              <label for="category">Category *</label>
              <select id="category" required>
                <option value="restaurant" selected>Restaurant</option>
                <option value="home-services">Home Services</option>
                <option value="retail">Retail</option>
              </select>
            </div>
            <div class="form-group">
              <label for="phone">Phone Number *</label>
              <input type="tel" id="phone" value="(843) 555-0123" required>
            </div>
            <div class="form-group">
              <label for="website">Website</label>
              <input type="url" id="website" value="https://www.mariositalian.com">
            </div>
            <div class="form-group full-width">
              <label for="address">Full Address *</label>
              <input type="text" id="address" value="123 King Street, Charleston, SC 29401" required>
            </div>
            <div class="form-group">
              <label for="location">Area</label>
              <select id="location">
                <option value="charleston" selected>Charleston</option>
                <option value="mount-pleasant">Mount Pleasant</option>
                <option value="summerville">Summerville</option>
                <option value="north-charleston">North Charleston</option>
                <option value="daniel-island">Daniel Island</option>
                <option value="goose-creek">Goose Creek</option>
                <option value="moncks-corner">Moncks Corner</option>
              </select>
            </div>
            <div class="form-group">
              <label for="email">Contact Email</label>
              <input type="email" id="email" value="info@mariositalian.com">
            </div>
            <div class="form-group full-width">
              <label for="description">Business Description</label>
              <textarea id="description" placeholder="Tell customers about your business, services, and what makes you special...">Family-owned Italian restaurant serving authentic homemade pasta, wood-fired pizzas, and traditional dishes passed down through generations. Using only the finest imported ingredients.</textarea>
            </div>
          </div>
        </form>
      </div>

      <!-- Photo Management -->
      <div class="form-section" id="photos">
        <h2 class="section-title">📷 Photo Management</h2>
        <p style="margin-bottom: 20px; color: #64748b;">Upload up to 8 photos (Elite plan). Supported formats: JPG, PNG. Max size: 5MB each.</p>
        
        <div class="file-upload-area" onclick="document.getElementById('photo-upload').click()">
          <div class="upload-icon">📸</div>
          <div class="upload-text">Click or drag photos here to upload</div>
          <div class="upload-subtext">JPG, PNG up to 5MB each</div>
          <input type="file" id="photo-upload" accept="image/*" multiple style="display: none;">
        </div>

        <div class="image-preview">
          <div class="image-item">
            <img src="https://via.placeholder.com/120x120/38b6ff/white?text=🍝" alt="Pasta">
            <button class="image-remove">×</button>
          </div>
          <div class="image-item">
            <img src="https://via.placeholder.com/120x120/ea580c/white?text=🍕" alt="Pizza">
            <button class="image-remove">×</button>
          </div>
          <div class="image-item">
            <img src="https://via.placeholder.com/120x120/10b981/white?text=🏪" alt="Restaurant">
            <button class="image-remove">×</button>
          </div>
        </div>
      </div>

      <!-- Business Hours -->
      <div class="form-section" id="hours">
        <h2 class="section-title">🕒 Business Hours</h2>
        <table class="hours-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Open Time</th>
              <th>Close Time</th>
              <th>Closed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Monday</td>
              <td><input type="time" value="11:00"></td>
              <td><input type="time" value="21:00"></td>
              <td><input type="checkbox" class="closed-checkbox"></td>
            </tr>
            <tr>
              <td>Tuesday</td>
              <td><input type="time" value="11:00"></td>
              <td><input type="time" value="21:00"></td>
              <td><input type="checkbox" class="closed-checkbox"></td>
            </tr>
            <tr>
              <td>Wednesday</td>
              <td><input type="time" value="11:00"></td>
              <td><input type="time" value="21:00"></td>
              <td><input type="checkbox" class="closed-checkbox"></td>
            </tr>
            <tr>
              <td>Thursday</td>
              <td><input type="time" value="11:00"></td>
              <td><input type="time" value="21:00"></td>
              <td><input type="checkbox" class="closed-checkbox"></td>
            </tr>
            <tr>
              <td>Friday</td>
              <td><input type="time" value="11:00"></td>
              <td><input type="time" value="22:00"></td>
              <td><input type="checkbox" class="closed-checkbox"></td>
            </tr>
            <tr>
              <td>Saturday</td>
              <td><input type="time" value="11:00"></td>
              <td><input type="time" value="22:00"></td>
              <td><input type="checkbox" class="closed-checkbox"></td>
            </tr>
            <tr>
              <td>Sunday</td>
              <td><input type="time" value="12:00"></td>
              <td><input type="time" value="20:00"></td>
              <td><input type="checkbox" class="closed-checkbox"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Coupons & Offers -->
      <div class="form-section" id="coupons">
        <h2 class="section-title">🎟️ Special Offers & Coupons</h2>
        <div class="form-group">
          <label for="coupon-title">Offer Title</label>
          <input type="text" id="coupon-title" value="Special Offer" placeholder="e.g., Grand Opening Special">
        </div>
        <div class="form-group">
          <label for="coupon-text">Offer Details</label>
          <textarea id="coupon-text" placeholder="Describe your special offer, discount, or promotion...">20% Off Any Large Pizza - Show This Ad!</textarea>
        </div>
        <div class="form-group">
          <label for="coupon-expires">Expiration Date (Optional)</label>
          <input type="date" id="coupon-expires">
        </div>
      </div>

      <!-- Preview Section -->
      <div class="preview-section">
        <h3 class="preview-title">👀 Listing Preview</h3>
        <p style="color: #64748b; margin-bottom: 20px;">This is how your listing will appear to customers:</p>
        
        <!-- Preview card (mini version of the actual listing) -->
        <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; max-width: 400px;">
          <div style="background: #f1f5f9; height: 120px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 15px;">🍕</div>
          <h4 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 5px;">Mario's Authentic Italian</h4>
          <div style="color: #38b6ff; font-size: 0.8rem; text-transform: uppercase; font-weight: 600; margin-bottom: 10px;">RESTAURANT</div>
          <p style="color: #64748b; font-size: 0.9rem; line-height: 1.4;">Family-owned Italian restaurant serving authentic homemade pasta...</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="btn-group">
        <button type="submit" class="btn btn-primary">💾 Save Changes</button>
        <button type="button" class="btn btn-secondary">👁️ Preview Public Listing</button>
        <button type="button" class="btn btn-success">🚀 Publish Changes</button>
      </div>

      <!-- Upgrade Banner (shown for lower tiers) -->
      <div class="upgrade-banner" style="display: none;" id="upgrade-banner">
        <h3>🚀 Upgrade to Elite for More Features!</h3>
        <p>Get up to 8 photos, extended descriptions, priority placement, and analytics dashboard.</p>
        <a href="upgrade.php" class="btn-upgrade">Upgrade Now - Only $39.99/month</a>
      </div>
    </main>
  </div>

  <script>
    // File upload functionality
    document.addEventListener('DOMContentLoaded', function() {
      const uploadArea = document.querySelector('.file-upload-area');
      const fileInput = document.getElementById('photo-upload');
      const imagePreview = document.querySelector('.image-preview');

      // Drag and drop functionality
      uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
      });

      uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
      });

      uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleFiles(files);
      });

      fileInput.addEventListener('change', function(e) {
        handleFiles(e.target.files);
      });

      function handleFiles(files) {
        Array.from(files).forEach(file => {
          if (file.type.startsWith('image/')) {
            // File upload handled by form submission
          }
        });
      }

      // Hours table functionality
      document.querySelectorAll('.closed-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
          const row = this.closest('tr');
          const timeInputs = row.querySelectorAll('input[type="time"]');
          timeInputs.forEach(input => {
            input.disabled = this.checked;
            if (this.checked) {
              input.style.opacity = '0.5';
            } else {
              input.style.opacity = '1';
            }
          });
        });
      });

      // Form submission
      document.getElementById('business-form').addEventListener('submit', function(e) {
        e.preventDefault();
        // Show success message
        alert('Changes saved successfully!');
      });

      // Image removal
      document.addEventListener('click', function(e) {
        if (e.target.classList.contains('image-remove')) {
          e.target.closest('.image-item').remove();
        }
      });
    });
  </script>
</body>
</html>