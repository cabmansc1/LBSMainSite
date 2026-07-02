<?php
// create-listing.php - Create new business listing
require_once 'config.php';
require_once 'User.php';
require_once 'Business.php';

// A2P 10DLC: form collects phone, suppress competing chat widget opt-in
$hideChatWidget = true;

// Require login
requireLogin();

$userObj = new User();
$businessObj = new Business();
$user = getCurrentUser();

// Check if user already has a business (basic users get only 1)
$existingBusiness = getUserBusiness($user['id']);
$subscription = $userObj->getUserSubscription($user['id']);

// Handle form submission
$success = '';
$error = '';
$formData = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $formData = [
            'business_name' => sanitizeInput($_POST['business_name']),
            'category' => sanitizeInput($_POST['category']),
            'phone' => sanitizeInput($_POST['phone']),
            'email' => sanitizeInput($_POST['email']),
            'website' => sanitizeInput($_POST['website']),
            'address' => sanitizeInput($_POST['address']),
            'city' => sanitizeInput($_POST['city']),
            'zip_code' => sanitizeInput($_POST['zip_code']),
            'location_area' => sanitizeInput($_POST['location_area']),
            'description' => sanitizeInput($_POST['description']),
            'plan_type' => 'basic' // Start with basic, can upgrade later
        ];
        
        // Validation
        $errors = [];
        
        if (empty($formData['business_name'])) {
            $errors[] = 'Business name is required';
        }
        
        if (empty($formData['category'])) {
            $errors[] = 'Category is required';
        }
        
        if (empty($formData['phone']) && empty($formData['email']) && empty($formData['website'])) {
            $errors[] = 'Please provide at least one contact method (phone, email, or website)';
        }
        
        // Check if user already has a business (for basic users)
        if ($existingBusiness && (!$subscription || $subscription['plan_name'] === 'basic')) {
            $errors[] = 'You already have a business listing. Upgrade to a paid plan to create multiple listings.';
        }
        
        if (!empty($errors)) {
            throw new Exception(implode('<br>', $errors));
        }
        
        // Create the business
        $businessId = $businessObj->createBusiness($formData, $user['id']);

        if ($businessId) {
            $success = 'Business listing submitted! Our team will review it and it should appear in the directory within 24 hours.';

            // A2P 10DLC: record consent state for audit trail (best-effort)
            require_once __DIR__ . '/includes/sms_consent_logger.php';
            logSmsConsent([
                'consent_given' => !empty($_POST['sms_consent']),
                'phone'         => $formData['phone'],
                'email'         => $formData['email'],
                'name'          => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')),
                'source_form'   => 'create-listing',
            ]);

            // Send confirmation email to business owner
            try {
                $ownerEmail = $user['email'] ?? '';
                if ($ownerEmail) {
                    $emailBody = "Hi " . ($user['first_name'] ?? '') . ",\n\n";
                    $emailBody .= "Thanks for submitting your business listing for \"" . $formData['business_name'] . "\" to " . SITE_NAME . "!\n\n";
                    $emailBody .= "Your listing is now pending review by our team. We typically review new listings within 24 hours, and you'll receive another email once it's been approved.\n\n";
                    $emailBody .= "In the meantime, you can check the status of your listing on your dashboard:\n";
                    $emailBody .= SITE_URL . "/dashboard.php\n\n";
                    $emailBody .= "If you have any questions, feel free to reply to this email or call us at (843) 212-2969.\n\n";
                    $emailBody .= "Thanks for joining the Lowcountry Business Spotlight!\n";
                    $emailBody .= "- The LBS Team";
                    sendSecureEmail($ownerEmail, 'Listing Received: ' . $formData['business_name'], $emailBody, ADMIN_EMAIL);
                }

                // Notify admin of new submission
                $adminBody = "New business listing submitted and pending review:\n\n";
                $adminBody .= "Business: " . $formData['business_name'] . "\n";
                $adminBody .= "Category: " . $formData['category'] . "\n";
                $adminBody .= "Owner: " . ($user['first_name'] ?? '') . " " . ($user['last_name'] ?? '') . " (" . ($user['email'] ?? '') . ")\n\n";
                $adminBody .= "Review it here: " . SITE_URL . "/admin/manage_directory.php\n";
                sendSecureEmail(ADMIN_EMAIL, 'New Listing Pending: ' . $formData['business_name'], $adminBody);
            } catch (Exception $emailEx) {
                error_log("Listing email error: " . $emailEx->getMessage());
            }

            // Redirect to dashboard after a short delay
            header("refresh:3;url=dashboard.php");
        } else {
            throw new Exception('Failed to create business listing. Please try again.');
        }
        
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

// Get plan for upgrade suggestions
$plans = $userObj->getSubscriptionPlans();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Create Business Listing - <?= SITE_NAME ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
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

        /* Header */
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

        .header-nav {
            display: flex;
            gap: 20px;
            align-items: center;
        }

        .header-nav a {
            color: #64748b;
            text-decoration: none;
            font-weight: 500;
        }

        .header-nav a:hover {
            color: #38b6ff;
        }

        /* Main Container */
        .main-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }

        .page-title {
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 10px;
            color: #333;
        }

        .page-subtitle {
            color: #64748b;
            font-size: 1.1rem;
            margin-bottom: 30px;
        }

        /* Alerts */
        .alert {
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 500;
        }

        .alert.success {
            background: #d1fae5;
            border: 1px solid #10b981;
            color: #065f46;
        }

        .alert.error {
            background: #fee2e2;
            border: 1px solid #ef4444;
            color: #991b1b;
        }

        .alert.warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            color: #92400e;
        }

        /* Form */
        .form-container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        .form-section {
            margin-bottom: 40px;
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

        .required {
            color: #ef4444;
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

        .form-help {
            font-size: 14px;
            color: #64748b;
            margin-top: 5px;
        }

        /* Buttons */
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
            font-size: 16px;
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

        .btn-group {
            display: flex;
            gap: 15px;
            margin-top: 30px;
        }

        /* Upgrade Banner */
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

        /* Already Has Business */
        .existing-business {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            text-align: center;
        }

        .existing-business h3 {
            color: #333;
            font-size: 1.5rem;
            margin-bottom: 15px;
        }

        .existing-business p {
            color: #64748b;
            margin-bottom: 30px;
            font-size: 1.1rem;
        }

        .business-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
        }

        .business-name {
            font-size: 1.2rem;
            font-weight: 700;
            color: #333;
            margin-bottom: 5px;
        }

        .business-category {
            color: #38b6ff;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .main-container {
                padding: 20px;
            }

            .form-container {
                padding: 30px 20px;
            }

            .form-grid {
                grid-template-columns: 1fr;
            }

            .btn-group {
                flex-direction: column;
            }
        }
    </style>
</head>

<body>
    <!-- Header -->
    <header class="header">
        <div class="header-container">
            <div class="brand-wordmark">Lowcountry Business Spotlight</div>
            <nav class="header-nav">
                <a href="dashboard.php">← Back to Dashboard</a>
                <a href="directory.php">Directory</a>
                <a href="logout.php">Logout</a>
            </nav>
        </div>
    </header>

    <!-- Main Container -->
    <div class="main-container">
        <h1 class="page-title">Create Business Listing</h1>
        <p class="page-subtitle">Add your business to Charleston's premier directory</p>

        <?php if ($success): ?>
            <div class="alert success">
                <?= htmlspecialchars($success) ?>
                <br><small>Redirecting to dashboard...</small>
            </div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="alert error"><?= $error ?></div>
        <?php endif; ?>

        <?php if ($existingBusiness && (!$subscription || $subscription['plan_name'] === 'basic')): ?>
            <!-- User already has a business -->
            <div class="existing-business">
                <h3>You Already Have a Business Listing</h3>
                <p>Basic users are limited to one business listing. Upgrade to create multiple listings.</p>
                
                <div class="business-card">
                    <div class="business-name"><?= htmlspecialchars($existingBusiness['business_name']) ?></div>
                    <div class="business-category"><?= htmlspecialchars(ucfirst($existingBusiness['category'])) ?></div>
                </div>

                <div class="btn-group">
                    <a href="dashboard.php" class="btn btn-secondary">Manage Current Listing</a>
                    <a href="upgrade.php" class="btn btn-upgrade">Upgrade Plan</a>
                </div>
            </div>

        <?php else: ?>
            <!-- Show upgrade banner for free users -->
            <?php if (!$subscription): ?>
                <div class="upgrade-banner">
                    <h3>🚀 Want More Features?</h3>
                    <p>Upgrade to Featured ($29.99/mo) or Elite ($39.99/mo) for photos, descriptions, special offers, and postcard discounts!</p>
                    <a href="upgrade.php" class="btn-upgrade">View Upgrade Options</a>
                </div>
            <?php endif; ?>

            <!-- Create Listing Form -->
            <div class="form-container">
                <form method="POST" id="businessForm">
                    <!-- Basic Information -->
                    <div class="form-section">
                        <h2 class="section-title">📝 Basic Information</h2>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="business_name">Business Name <span class="required">*</span></label>
                                <input type="text" id="business_name" name="business_name" required 
                                       value="<?= htmlspecialchars($formData['business_name'] ?? '') ?>"
                                       placeholder="e.g., Mario's Italian Restaurant">
                            </div>

                            <div class="form-group">
                                <label for="category">Category <span class="required">*</span></label>
                                <select id="category" name="category" required>
                                    <option value="">Select Category</option>
                                    <?php foreach (getCategories() as $key => $name): ?>
                                        <option value="<?= $key ?>" <?= ($formData['category'] ?? '') === $key ? 'selected' : '' ?>>
                                            <?= htmlspecialchars($name) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Contact Information -->
                    <div class="form-section">
                        <h2 class="section-title">📞 Contact Information</h2>
                        <p class="form-help">Provide at least one contact method</p>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="phone">Phone Number</label>
                                <input type="tel" id="phone" name="phone" 
                                       value="<?= htmlspecialchars($formData['phone'] ?? '') ?>"
                                       placeholder="(843) 555-0123">
                            </div>

                            <div class="form-group">
                                <label for="email">Business Email</label>
                                <input type="email" id="email" name="email" 
                                       value="<?= htmlspecialchars($formData['email'] ?? '') ?>"
                                       placeholder="info@yourbusiness.com">
                            </div>

                            <div class="form-group full-width">
                                <label for="website">Website</label>
                                <input type="url" id="website" name="website" 
                                       value="<?= htmlspecialchars($formData['website'] ?? '') ?>"
                                       placeholder="https://www.yourbusiness.com">
                            </div>
                        </div>
                    </div>

                    <!-- Location Information -->
                    <div class="form-section">
                        <h2 class="section-title">📍 Location</h2>
                        
                        <div class="form-grid">
                            <div class="form-group full-width">
                                <label for="address">Street Address</label>
                                <input type="text" id="address" name="address" 
                                       value="<?= htmlspecialchars($formData['address'] ?? '') ?>"
                                       placeholder="123 Main Street">
                            </div>

                            <div class="form-group">
                                <label for="city">City</label>
                                <input type="text" id="city" name="city" 
                                       value="<?= htmlspecialchars($formData['city'] ?? 'Charleston') ?>"
                                       placeholder="Charleston">
                            </div>

                            <div class="form-group">
                                <label for="zip_code">ZIP Code</label>
                                <input type="text" id="zip_code" name="zip_code" 
                                       value="<?= htmlspecialchars($formData['zip_code'] ?? '') ?>"
                                       placeholder="29401">
                            </div>

                            <div class="form-group full-width">
                                <label for="location_area">Area</label>
                                <select id="location_area" name="location_area">
                                    <?php foreach (getLocationAreas() as $key => $name): ?>
                                        <option value="<?= $key ?>" <?= ($formData['location_area'] ?? 'charleston') === $key ? 'selected' : '' ?>>
                                            <?= htmlspecialchars($name) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Description -->
                    <div class="form-section">
                        <h2 class="section-title">📄 Description</h2>
                        
                        <div class="form-group">
                            <label for="description">Business Description</label>
                            <textarea id="description" name="description" 
                                      placeholder="Tell customers about your business, what services you offer, what makes you special..."><?= htmlspecialchars($formData['description'] ?? '') ?></textarea>
                            <div class="form-help">This will be visible to customers browsing the directory</div>
                        </div>
                    </div>

                    <?php include __DIR__ . '/includes/sms_consent.php'; ?>

                    <!-- Submit Buttons -->
                    <div class="btn-group">
                        <button type="submit" class="btn btn-primary">Create Business Listing</button>
                        <a href="dashboard.php" class="btn btn-secondary">Cancel</a>
                    </div>
                </form>
            </div>
        <?php endif; ?>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('businessForm');
            
            if (form) {
                // Format phone number as user types
                const phoneInput = document.getElementById('phone');
                phoneInput.addEventListener('input', function() {
                    let value = this.value.replace(/\D/g, '');
                    if (value.length >= 6) {
                        value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
                    } else if (value.length >= 3) {
                        value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                    }
                    this.value = value;
                });

                // Form validation
                form.addEventListener('submit', function(e) {
                    let isValid = true;
                    const requiredFields = form.querySelectorAll('[required]');
                    
                    // Reset styles
                    requiredFields.forEach(field => {
                        field.style.borderColor = '#e2e8f0';
                    });
                    
                    // Check required fields
                    requiredFields.forEach(field => {
                        if (!field.value.trim()) {
                            field.style.borderColor = '#ef4444';
                            isValid = false;
                        }
                    });
                    
                    // Check that at least one contact method is provided
                    const phone = document.getElementById('phone').value.trim();
                    const email = document.getElementById('email').value.trim();
                    const website = document.getElementById('website').value.trim();
                    
                    if (!phone && !email && !website) {
                        [document.getElementById('phone'), document.getElementById('email'), document.getElementById('website')]
                            .forEach(field => field.style.borderColor = '#ef4444');
                        alert('Please provide at least one contact method (phone, email, or website)');
                        isValid = false;
                    }
                    
                    if (!isValid) {
                        e.preventDefault();
                    }
                });
            }
        });
    </script>
</body>
</html>