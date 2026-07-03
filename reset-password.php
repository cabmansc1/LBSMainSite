<?php
// reset-password.php - Set a new password using a reset token
require_once 'config.php';
require_once 'User.php';

// Redirect if already logged in
if (isLoggedIn()) {
    header('Location: dashboard.php');
    exit;
}

$error = '';
$userObj = new User();
$csrfToken = generateCSRFToken();

// Token arrives via the emailed link (GET) and is carried through the form (POST).
$token = sanitizeInput($_POST['token'] ?? $_GET['token'] ?? '');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (!validateCSRFToken($_POST['csrf_token'] ?? '')) {
            throw new Exception('Invalid form submission. Please try again.');
        }

        $password = $_POST['password'] ?? '';
        $confirm  = $_POST['confirm_password'] ?? '';

        if (empty($token)) {
            throw new Exception('Missing reset token. Please use the link from your email again.');
        }
        if (empty($password) || empty($confirm)) {
            throw new Exception('Please enter and confirm your new password.');
        }
        if ($password !== $confirm) {
            throw new Exception('The passwords do not match.');
        }

        // resetPassword() enforces PASSWORD_MIN_LENGTH and the token's validity/expiry.
        $userObj->resetPassword($token, $password);

        header('Location: login.php?reset=1');
        exit;

    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

// No seo-config entry for this page — inline SEO values
$seo = [
    'title'       => 'Choose a New Password - Lowcountry Business Spotlight',
    'description' => 'Set a new password for your Lowcountry Business Spotlight account.',
    'canonical'   => null,
    'robots'      => 'noindex,follow',
];
include __DIR__ . '/seo_head.php';
?>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; min-height: 100vh; margin: 0; display: flex; flex-direction: column; }
        .login-top { background: linear-gradient(135deg, #38b6ff 0%, #0ea5e9 50%, #0284c7 100%); padding: 24px 20px 16px; display: flex; justify-content: space-between; align-items: center; }
        .login-top-brand { font-size: 1rem; font-weight: 800; color: white; text-decoration: none; }
        .login-top-back { color: rgba(255,255,255,.85); text-decoration: none; font-weight: 600; font-size: 0.88rem; padding: 6px 14px; border-radius: 6px; background: rgba(255,255,255,.15); transition: background 0.2s; }
        .login-top-back:hover { background: rgba(255,255,255,.25); }
        .login-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px 16px 40px; }
        .login-container { background: white; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,.08); border: 1px solid #e2e8f0; width: 100%; max-width: 420px; overflow: hidden; }
        .login-header { padding: 32px 24px 24px; text-align: center; }
        .login-header h1 { font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-bottom: 6px; }
        .login-header p { color: #64748b; font-size: 0.92rem; }
        .login-form { padding: 0 24px 32px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-weight: 600; margin-bottom: 6px; color: #374151; font-size: 0.9rem; }
        .form-group input { width: 100%; padding: 14px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 16px; font-family: 'Inter', sans-serif; transition: border-color 0.2s; -webkit-appearance: none; }
        .form-group input:focus { outline: none; border-color: #38b6ff; box-shadow: 0 0 0 3px rgba(56,182,255,.1); }
        .form-hint { font-size: 0.8rem; color: #94a3b8; margin-top: 6px; }
        .btn-login { width: 100%; background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; padding: 14px; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.2s; margin-bottom: 20px; -webkit-appearance: none; }
        .btn-login:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(56,182,255,.3); }
        .btn-login:active { transform: translateY(0); }
        .form-links { text-align: center; }
        .form-links p { margin-bottom: 8px; color: #64748b; font-size: 0.9rem; }
        .form-links a { color: #38b6ff; text-decoration: none; font-weight: 600; transition: color 0.2s; }
        .form-links a:hover { color: #0ea5e9; }
        .alert { padding: 14px; border-radius: 8px; margin-bottom: 16px; font-weight: 500; font-size: 0.9rem; }
        .alert.error { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
        @media (max-width: 480px) {
            .login-wrap { padding: 20px 12px 32px; align-items: flex-start; padding-top: 24px; }
            .login-container { border-radius: 14px; }
            .login-header { padding: 28px 20px 20px; }
            .login-header h1 { font-size: 1.35rem; }
            .login-form { padding: 0 20px 28px; }
        }
    </style>
</head>
<body>
    <div class="login-top">
        <a href="/" class="login-top-brand"><?= SITE_NAME ?></a>
        <a href="login.php" class="login-top-back">&larr; Back to Login</a>
    </div>

    <div class="login-wrap">
    <div class="login-container">
        <div class="login-header">
            <h1>Choose a New Password</h1>
            <p>Enter a new password for your account</p>
        </div>

        <div class="login-form">
            <?php if ($error): ?>
                <div class="alert error"><?= htmlspecialchars($error) ?></div>
            <?php endif; ?>

            <?php if (empty($token)): ?>
                <div class="form-links">
                    <p>This reset link is missing or invalid.</p>
                    <p><a href="forgot-password.php">Request a new reset link</a></p>
                </div>
            <?php else: ?>
            <form method="POST" id="resetForm">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken) ?>">
                <input type="hidden" name="token" value="<?= htmlspecialchars($token) ?>">
                <div class="form-group">
                    <label for="password">New Password</label>
                    <input type="password" id="password" name="password" required
                           autocomplete="new-password" minlength="<?= (int)PASSWORD_MIN_LENGTH ?>">
                    <div class="form-hint">At least <?= (int)PASSWORD_MIN_LENGTH ?> characters.</div>
                </div>

                <div class="form-group">
                    <label for="confirm_password">Confirm New Password</label>
                    <input type="password" id="confirm_password" name="confirm_password" required
                           autocomplete="new-password" minlength="<?= (int)PASSWORD_MIN_LENGTH ?>">
                </div>

                <button type="submit" class="btn-login">Update Password</button>

                <div class="form-links">
                    <p><a href="login.php">Back to Sign In</a></p>
                </div>
            </form>
            <?php endif; ?>
        </div>
    </div>
    </div>
</body>
</html>
