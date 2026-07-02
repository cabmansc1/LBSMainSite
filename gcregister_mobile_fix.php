<?php
require_once 'config.php';

$error_message = '';
$success_message = '';

// Initialize variables
$name = '';
$email = '';
$phone = '';
$area = '';
$email_opt_in = 1;

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST)) {
    // Get raw data first
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $area = trim($_POST['area'] ?? '');
    $email_opt_in = isset($_POST['email_opt_in']) ? 1 : 0;
    
    // Simple validation
    $errors = [];
    
    if (empty($name)) $errors[] = 'Name is required.';
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Valid email is required.';
    // Phone validation disabled: phone field removed (SMS opt-in handled by chat widget).
    // if (empty($phone)) $errors[] = 'Phone is required.';
    if (empty($area)) $errors[] = 'Campaign is required.';
    
    // Check duplicate
    if (empty($errors)) {
        try {
            $db = getDB();
            $stmt = $db->prepare("SELECT id FROM campaign_registrations WHERE campaign_code = ? AND email = ?");
            $stmt->execute([$area, $email]);
            if ($stmt->fetch()) {
                $errors[] = 'Email already registered for this campaign.';
            }
        } catch (Exception $e) {
            $errors[] = 'System error.';
        }
    }
    
    // Save
    if (empty($errors)) {
        try {
            $db = getDB();
            
            // Get campaign
            $stmt = $db->prepare("
                SELECT * FROM campaigns 
                WHERE campaign_code = ? AND status = 'active' 
                AND CURDATE() BETWEEN registration_start AND registration_end
            ");
            $stmt->execute([$area]);
            $campaign = $stmt->fetch();
            
            if (!$campaign) {
                $errors[] = 'Campaign not active.';
            } else {
                // Clean phone
                $clean_phone = preg_replace('/[^0-9]/', '', $phone);
                if (strlen($clean_phone) === 10) {
                    $clean_phone = '(' . substr($clean_phone, 0, 3) . ') ' . substr($clean_phone, 3, 3) . '-' . substr($clean_phone, 6);
                }
                
                // Insert
                $stmt = $db->prepare("
                    INSERT INTO campaign_registrations 
                    (campaign_id, campaign_code, name, email, phone, ip_address, user_agent, email_opt_in) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $result = $stmt->execute([
                    $campaign['id'],
                    $campaign['campaign_code'],
                    htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
                    htmlspecialchars($email, ENT_QUOTES, 'UTF-8'),
                    $clean_phone,
                    $_SERVER['REMOTE_ADDR'] ?? '',
                    $_SERVER['HTTP_USER_AGENT'] ?? '',
                    $email_opt_in
                ]);
                
                if ($result) {
                    $success_message = 'Thank you! Your registration has been submitted successfully for: ' . htmlspecialchars($campaign['campaign_name']) . '.';
                    $name = $email = $phone = $area = '';
                    $email_opt_in = 1;
                } else {
                    $errors[] = 'Failed to save.';
                }
            }
        } catch (Exception $e) {
            $errors[] = 'Registration failed.';
            error_log("Mobile registration error: " . $e->getMessage());
        }
    }
    
    if (!empty($errors)) {
        $error_message = implode('<br>', $errors);
    }
}

// Get active campaigns
try {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT area, campaign_name, campaign_code
        FROM campaigns 
        WHERE status = 'active' 
        AND CURDATE() BETWEEN registration_start AND registration_end 
        ORDER BY area, campaign_name
    ");
    $stmt->execute();
    $activeCampaigns = $stmt->fetchAll();
} catch (Exception $e) {
    $activeCampaigns = [];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gift Card Registration | <?php echo SITE_NAME; ?></title>
    <meta name="description" content="Register to win with Lowcountry Business Spotlight postcard campaign">
    
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
            background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%);
            min-height: 100vh;
            overflow-x: hidden;
        }
        
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
        
        .main-content {
            padding: 20px;
        }
        
        .registration-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            margin: 2rem auto;
            max-width: 600px;
        }
        
        .header-section {
            background: #000000;
            color: white;
            padding: 3rem 2rem;
            text-align: center;
        }
        
        .header-logo {
            max-width: 120px;
            height: auto;
            margin-bottom: 1.5rem;
        }
        
        .header-title {
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 1rem;
        }
        
        .header-subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 0.5rem;
        }
        
        .header-description {
            opacity: 0.8;
        }
        
        .form-section {
            padding: 3rem 2rem;
        }
        
        .form-group {
            margin-bottom: 25px;
        }

        .form-group label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: 15px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
            -webkit-appearance: none;
            appearance: none;
            background: white;
        }

        .form-group select {
            background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3e%3cpolyline points="6 9 12 15 18 9"%3e%3c/polyline%3e%3c/svg%3e');
            background-repeat: no-repeat;
            background-position: right 10px center;
            background-size: 20px;
            padding-right: 40px;
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #38b6ff;
            box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
        }
        
        .btn-register {
            width: 100%;
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            color: white;
            padding: 18px;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 20px;
            -webkit-appearance: none;
            appearance: none;
            touch-action: manipulation;
        }

        .btn-register:active {
            transform: scale(0.98);
        }
        
        .alert {
            padding: 15px;
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
        
        .info-section {
            background: #f8fafc;
            padding: 1.5rem;
            border-radius: 8px;
            margin-top: 1.5rem;
            text-align: center;
            color: #64748b;
        }
        
        .footer {
            background: #000000;
            color: #94a3b8;
            padding: 20px 0;
            text-align: center;
            margin-top: 2rem;
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
        
        @media (max-width: 768px) {
            .registration-container {
                margin: 1rem;
                border-radius: 12px;
            }
            
            .header-section,
            .form-section {
                padding: 2rem 1.5rem;
            }
            
            .header-title {
                font-size: 2rem;
            }
            
            .footer-content {
                flex-direction: column;
                gap: 20px;
            }

            .footer-left, .footer-right {
                text-align: center;
            }
        }
    </style>
</head>
<body>
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
    
    <div class="main-content">
        <div class="registration-container">
            <div class="header-section">
                <img src="images/lbs_logo.png" alt="Lowcountry Business Spotlight Logo" class="header-logo">
                
                <h1 class="header-title">Enter to Win!</h1>
                <p class="header-subtitle">Lowcountry Business Spotlight</p>
                <p class="header-description">Register for your chance to win gift cards from local businesses</p>
            </div>
            
            <div class="form-section">
                <?php if ($error_message): ?>
                    <div class="alert error"><?php echo $error_message; ?></div>
                <?php endif; ?>
                
                <?php if ($success_message): ?>
                    <div class="alert success"><?php echo $success_message; ?></div>
                <?php else: ?>
                    <?php if (!empty($activeCampaigns)): ?>
                        <form method="POST" action="gcregister_mobile_fix.php">
                            <div class="form-group">
                                <label for="name">Full Name *</label>
                                <input type="text" id="name" name="name" 
                                       value="<?php echo htmlspecialchars($name); ?>" 
                                       autocomplete="name"
                                       required>
                            </div>
                            
                            <div class="form-group">
                                <label for="email">Email Address *</label>
                                <input type="email" id="email" name="email" 
                                       value="<?php echo htmlspecialchars($email); ?>"
                                       autocomplete="email"
                                       inputmode="email"
                                       required>
                            </div>
                            
                            <!-- Phone field removed: SMS opt-in handled by chat widget only.
                            <div class="form-group">
                                <label for="phone">Phone Number *</label>
                                <input type="tel" id="phone" name="phone"
                                       value="<?php echo htmlspecialchars($phone); ?>"
                                       placeholder="(xxx) xxx-xxxx"
                                       autocomplete="tel"
                                       inputmode="tel"
                                       required>
                            </div>
                            -->
                            
                            <div class="form-group">
                                <label for="area">Select Your Postcard *</label>
                                <select id="area" name="area" required>
                                    <option value="">Choose your postcard...</option>
                                    <?php foreach ($activeCampaigns as $campaign): ?>
                                        <option value="<?php echo htmlspecialchars($campaign['campaign_code']); ?>" 
                                                <?php echo $area === $campaign['campaign_code'] ? 'selected' : ''; ?>>
                                            <?php echo htmlspecialchars($campaign['campaign_name']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <div style="display: flex; align-items: flex-start; gap: 10px; margin-top: 10px;">
                                    <input type="checkbox" id="email_opt_in" name="email_opt_in" value="1" 
                                           style="width: auto; min-width: 20px; height: 20px; margin: 2px 0 0 0; padding: 0;" 
                                           <?php echo $email_opt_in ? 'checked' : ''; ?>>
                                    <label for="email_opt_in" style="margin: 0; font-weight: normal; color: #64748b; font-size: 14px; line-height: 1.4;">
                                        Yes, I'd like to receive email notifications about future postcard campaigns and giveaways in my area. You can unsubscribe at any time.
                                    </label>
                                </div>
                            </div>
                            
                            <button type="submit" class="btn-register">
                                Register Now
                            </button>
                        </form>
                    <?php else: ?>
                        <div style="text-align: center; padding: 2rem; color: #64748b;">
                            <h3>No Active Campaigns</h3>
                            <p>There are currently no active gift card campaigns. Please check back soon!</p>
                        </div>
                    <?php endif; ?>
                <?php endif; ?>
                
                <div class="info-section">
                    <p><strong>How it works:</strong> Fill out the form above to enter our gift card contest. Winners will be selected randomly and contacted via email.</p>
                </div>
            </div>
        </div>
    </div>
    
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-left">
                <p>© 2025-2026 by Lowcountry Business Spotlight - (843) 212-2969</p>
            </div>
        </div>
    </footer>
</body>
</html>