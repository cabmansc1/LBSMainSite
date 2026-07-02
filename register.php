<?php
// register.php - User registration page (Updated for prefixed tables)
require_once 'config.php';
require_once 'User.php';

// A2P 10DLC: form collects phone, suppress competing chat widget opt-in
$hideChatWidget = true;

// Redirect if already logged in
if (isLoggedIn()) {
    header('Location: dashboard.php');
    exit;
}

$error = '';
$formData = [];
$userObj = new User();
$csrfToken = generateCSRFToken();

// Handle registration form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (!validateCSRFToken($_POST['csrf_token'] ?? '')) {
            throw new Exception('Invalid form submission. Please try again.');
        }

        $formData = [
            'first_name' => sanitizeInput($_POST['first_name']),
            'last_name' => sanitizeInput($_POST['last_name']),
            'email' => sanitizeInput($_POST['email']),
            'phone' => sanitizeInput($_POST['phone']),
            'password' => $_POST['password'],
            'confirm_password' => $_POST['confirm_password']
        ];
        
        // Validation
        $errors = [];
        
        if (empty($formData['first_name'])) {
            $errors[] = 'First name is required';
        }
        
        if (empty($formData['last_name'])) {
            $errors[] = 'Last name is required';
        }
        
        if (empty($formData['email']) || !isValidEmail($formData['email'])) {
            $errors[] = 'Valid email address is required';
        }
        
        if (strlen($formData['password']) < PASSWORD_MIN_LENGTH) {
            $errors[] = 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters long';
        }
        
        if ($formData['password'] !== $formData['confirm_password']) {
            $errors[] = 'Passwords do not match';
        }
        
        if (!isset($_POST['terms'])) {
            $errors[] = 'You must agree to the terms and conditions';
        }
        
        if (!empty($errors)) {
            throw new Exception(implode('<br>', $errors));
        }
        
        // Register user
        $userId = $userObj->register(
            $formData['email'],
            $formData['password'],
            $formData['first_name'],
            $formData['last_name'],
            $formData['phone']
        );

        if ($userId) {
            // A2P 10DLC: record consent state for audit trail (best-effort)
            require_once __DIR__ . '/includes/sms_consent_logger.php';
            logSmsConsent([
                'consent_given' => !empty($_POST['sms_consent']),
                'phone'         => $formData['phone'],
                'email'         => $formData['email'],
                'name'          => trim($formData['first_name'] . ' ' . $formData['last_name']),
                'source_form'   => 'register',
            ]);
            // Auto-login after registration
            $userObj->login($formData['email'], $_POST['password']);

            // Redirect based on context
            $claim = (int)($_POST['claim_id'] ?? 0);
            if ($claim > 0) {
                // Claim a business listing
                $db = getDB();
                $stmt = $db->prepare("UPDATE directory_businesses SET user_id = ? WHERE id = ? AND (user_id IS NULL OR user_id = 0)");
                $stmt->execute([$userId, $claim]);
                header('Location: dashboard.php?claimed=1');
            } else {
                header('Location: dashboard.php?welcome=1');
            }
            exit;
        } else {
            throw new Exception('Registration failed. Please try again.');
        }
        
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

// Get claim ID if claiming a business
$claimId = (int)($_GET['claim'] ?? 0);
$claimBiz = null;
if ($claimId > 0) {
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, business_name FROM directory_businesses WHERE id = ? AND (user_id IS NULL OR user_id = 0)");
        $stmt->execute([$claimId]);
        $claimBiz = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {}
}

// Get plan info if registering for a specific plan
$selectedPlan = $_GET['plan'] ?? null;
$planInfo = null;
if ($selectedPlan) {
    $plans = [
        'basic' => ['name' => 'Basic', 'price' => 'Free'],
        'featured' => ['name' => 'Featured', 'price' => '$29.99/month'],
        'elite' => ['name' => 'Elite', 'price' => '$39.99/month']
    ];
    $planInfo = $plans[$selectedPlan] ?? null;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Register - <?= SITE_NAME ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
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
            padding: 20px;
        }

        .register-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            width: 100%;
            max-width: 500px;
            margin: 0 auto;
            overflow: hidden;
        }

        .register-header {
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            color: white;
            padding: 40px 30px 30px;
            text-align: center;
        }

        .register-header h1 {
            font-size: 1.8rem;
            font-weight: 800;
            margin-bottom: 8px;
        }

        .register-header p {
            opacity: 0.9;
        }

        .plan-badge {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 15px;
            display: inline-block;
        }

        .register-form {
            padding: 40px 30px;
        }

        .form-group {
            margin-bottom: 25px;
        }

        .form-group.half {
            width: 48%;
            display: inline-block;
        }

        .form-group.half:first-child {
            margin-right: 4%;
        }

        .form-group label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }

        .form-group input {
            width: 100%;
            padding: 15px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
        }

        .form-group input:focus {
            outline: none;
            border-color: #38b6ff;
            box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
        }

        .password-strength {
            margin-top: 5px;
            font-size: 12px;
        }

        .strength-weak { color: #ef4444; }
        .strength-medium { color: #f59e0b; }
        .strength-strong { color: #10b981; }

        .checkbox-group {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 25px;
        }

        .checkbox-group input[type="checkbox"] {
            width: auto;
            margin: 0;
            margin-top: 4px;
        }

        .checkbox-group label {
            margin: 0;
            font-weight: 500;
            color: #64748b;
            line-height: 1.5;
        }

        .checkbox-group a {
            color: #38b6ff;
            text-decoration: none;
        }

        .checkbox-group a:hover {
            text-decoration: underline;
        }

        .btn-register {
            width: 100%;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 15px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 20px;
        }

        .btn-register:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        }

        .btn-register:disabled {
            background: #94a3b8;
            cursor: not-allowed;
            transform: none;
        }

        .form-links {
            text-align: center;
        }

        .form-links a {
            color: #38b6ff;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }

        .form-links a:hover {
            color: #0ea5e9;
        }

        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 500;
        }

        .alert.error {
            background: #fee2e2;
            border: 1px solid #ef4444;
            color: #991b1b;
        }

        .back-home {
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }

        .back-home:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .required {
            color: #ef4444;
        }

        @media (max-width: 480px) {
            .register-container {
                margin: 10px;
            }
            
            .register-form {
                padding: 30px 20px;
            }

            .form-group.half {
                width: 100%;
                display: block;
                margin-right: 0;
            }
        }
    </style>
</head>

<body>
    <a href="directory.php" class="back-home">← Back to Directory</a>

    <div class="register-container">
        <div class="register-header">
            <h1><?= $claimBiz ? 'Claim Your Business' : 'Create Your Account' ?></h1>
            <p><?= $claimBiz ? 'Create an account to manage "' . htmlspecialchars($claimBiz['business_name']) . '"' : 'Join Charleston\'s premier business directory' ?></p>
            <?php if ($planInfo && !$claimBiz): ?>
                <div class="plan-badge">
                    Selected: <?= $planInfo['name'] ?> Plan - <?= $planInfo['price'] ?>
                </div>
            <?php endif; ?>
        </div>

        <div class="register-form">
            <?php if ($error): ?>
                <div class="alert error"><?= $error ?></div>
            <?php endif; ?>

            <form method="POST" id="registerForm">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken) ?>">
                <?php if ($selectedPlan): ?>
                    <input type="hidden" name="selected_plan" value="<?= htmlspecialchars($selectedPlan) ?>">
                <?php endif; ?>
                <?php if ($claimBiz): ?>
                    <input type="hidden" name="claim_id" value="<?= (int)$claimBiz['id'] ?>">
                <?php endif; ?>

                <div class="form-group half">
                    <label for="first_name">First Name <span class="required">*</span></label>
                    <input type="text" id="first_name" name="first_name" required 
                           value="<?= htmlspecialchars($formData['first_name'] ?? '') ?>">
                </div>

                <div class="form-group half">
                    <label for="last_name">Last Name <span class="required">*</span></label>
                    <input type="text" id="last_name" name="last_name" required 
                           value="<?= htmlspecialchars($formData['last_name'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label for="email">Email Address <span class="required">*</span></label>
                    <input type="email" id="email" name="email" required 
                           value="<?= htmlspecialchars($formData['email'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label for="phone">Phone Number</label>
                    <input type="tel" id="phone" name="phone" 
                           placeholder="(843) 555-0123"
                           value="<?= htmlspecialchars($formData['phone'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label for="password">Password <span class="required">*</span></label>
                    <input type="password" id="password" name="password" required 
                           minlength="<?= PASSWORD_MIN_LENGTH ?>">
                    <div class="password-strength" id="passwordStrength"></div>
                </div>

                <div class="form-group">
                    <label for="confirm_password">Confirm Password <span class="required">*</span></label>
                    <input type="password" id="confirm_password" name="confirm_password" required>
                </div>

                <div class="checkbox-group">
                    <input type="checkbox" id="terms" name="terms" required>
                    <label for="terms">
                        I agree to the <a href="terms.php" target="_blank">Terms and Conditions</a> 
                        and <a href="privacy.php" target="_blank">Privacy Policy</a> <span class="required">*</span>
                    </label>
                </div>

                <div class="checkbox-group">
                    <input type="checkbox" id="newsletter" name="newsletter" checked>
                    <label for="newsletter">
                        Send me updates about new features and postcard marketing opportunities
                    </label>
                </div>

                <?php include __DIR__ . '/includes/sms_consent.php'; ?>

                <button type="submit" id="registerBtn" class="btn-register">Create Account</button>

                <div class="form-links">
                    <p>Already have an account? <a href="login.php">Sign in here</a></p>
                </div>
            </form>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('registerForm');
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirm_password');
            const strengthIndicator = document.getElementById('passwordStrength');
            const submitBtn = document.getElementById('registerBtn');

            // Password strength checker
            passwordInput.addEventListener('input', function() {
                const password = this.value;
                let strength = 0;
                let feedback = [];

                if (password.length >= 8) strength++;
                else feedback.push('at least 8 characters');

                if (/[a-z]/.test(password)) strength++;
                else feedback.push('lowercase letter');

                if (/[A-Z]/.test(password)) strength++;
                else feedback.push('uppercase letter');

                if (/[0-9]/.test(password)) strength++;
                else feedback.push('number');

                if (/[^A-Za-z0-9]/.test(password)) strength++;
                else feedback.push('special character');

                let strengthText = '';
                let strengthClass = '';

                if (strength <= 2) {
                    strengthText = 'Weak password. Add: ' + feedback.join(', ');
                    strengthClass = 'strength-weak';
                } else if (strength <= 3) {
                    strengthText = 'Medium strength. Add: ' + feedback.join(', ');
                    strengthClass = 'strength-medium';
                } else {
                    strengthText = 'Strong password!';
                    strengthClass = 'strength-strong';
                }

                strengthIndicator.textContent = strengthText;
                strengthIndicator.className = 'password-strength ' + strengthClass;
            });

            // Password confirmation check
            function checkPasswordMatch() {
                const password = passwordInput.value;
                const confirmPassword = confirmPasswordInput.value;

                if (confirmPassword && password !== confirmPassword) {
                    confirmPasswordInput.style.borderColor = '#ef4444';
                    return false;
                } else {
                    confirmPasswordInput.style.borderColor = '#e2e8f0';
                    return true;
                }
            }

            confirmPasswordInput.addEventListener('input', checkPasswordMatch);
            passwordInput.addEventListener('input', checkPasswordMatch);

            // Form validation
            form.addEventListener('submit', function(e) {
                let isValid = true;
                const inputs = form.querySelectorAll('input[required]');

                // Reset styles
                inputs.forEach(input => {
                    input.style.borderColor = '#e2e8f0';
                });

                // Check required fields
                inputs.forEach(input => {
                    if (!input.value.trim()) {
                        input.style.borderColor = '#ef4444';
                        isValid = false;
                    }
                });

                // Check email format
                const email = document.getElementById('email');
                if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
                    email.style.borderColor = '#ef4444';
                    isValid = false;
                }

                // Check password match
                if (!checkPasswordMatch()) {
                    isValid = false;
                }

                // Check terms agreement
                const termsCheckbox = document.getElementById('terms');
                if (!termsCheckbox.checked) {
                    termsCheckbox.style.outline = '2px solid #ef4444';
                    isValid = false;
                } else {
                    termsCheckbox.style.outline = 'none';
                }

                if (!isValid) {
                    e.preventDefault();
                    submitBtn.textContent = 'Please fix errors above';
                    setTimeout(() => {
                        submitBtn.textContent = 'Create Account';
                    }, 3000);
                }
            });

            // Format phone number
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
        });
    </script>
</body>
</html>