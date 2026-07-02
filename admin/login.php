<?php
/**
 * CAMPAIGN ADMIN LOGIN
 * Separate authentication for campaign management
 */

require_once '../config.php';

// Create separate session namespace for campaign admin
if (!isset($_SESSION['campaign_admin'])) {
    $_SESSION['campaign_admin'] = array();
}

// Redirect if already logged in as campaign admin
if (isset($_SESSION['campaign_admin']['logged_in']) && $_SESSION['campaign_admin']['logged_in'] === true) {
    header('Location: dashboard.php');
    exit();
}

$error_message = '';

// Rate limiting: check failed login attempts
function checkLoginRateLimit() {
    $key = 'login_attempts';
    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = ['count' => 0, 'first_attempt' => time()];
    }
    $attempts = &$_SESSION[$key];
    // Reset window after LOGIN_TIMEOUT
    if (time() - $attempts['first_attempt'] > LOGIN_TIMEOUT) {
        $attempts = ['count' => 0, 'first_attempt' => time()];
    }
    return $attempts['count'] < MAX_LOGIN_ATTEMPTS;
}

function recordFailedLogin() {
    if (!isset($_SESSION['login_attempts'])) {
        $_SESSION['login_attempts'] = ['count' => 0, 'first_attempt' => time()];
    }
    $_SESSION['login_attempts']['count']++;
}

function clearLoginAttempts() {
    unset($_SESSION['login_attempts']);
}

// Generate CSRF token for the form
$csrfToken = generateCSRFToken();

// Handle login form submission
if ($_POST) {
    // Validate CSRF token
    if (!validateCSRFToken($_POST['csrf_token'] ?? '')) {
        $error_message = 'Invalid form submission. Please try again.';
    } elseif (!checkLoginRateLimit()) {
        $remainingSeconds = LOGIN_TIMEOUT - (time() - $_SESSION['login_attempts']['first_attempt']);
        $error_message = 'Too many failed attempts. Please try again in ' . ceil($remainingSeconds / 60) . ' minute(s).';
    } else {
        $username = sanitizeInput($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';

        if (empty($username) || empty($password)) {
            $error_message = 'Please enter both username and password.';
        } else {
            try {
                $db = getDB();
                $stmt = $db->prepare("SELECT * FROM campaign_admins WHERE username = ? AND status = 'active'");
                $stmt->execute([$username]);
                $admin = $stmt->fetch();

                if ($admin && password_verify($password, $admin['password_hash'])) {
                    // Regenerate session ID to prevent session fixation
                    session_regenerate_id(true);
                    clearLoginAttempts();

                    // Login successful
                    $_SESSION['campaign_admin']['logged_in'] = true;
                    $_SESSION['campaign_admin']['id'] = $admin['id'];
                    $_SESSION['campaign_admin']['username'] = $admin['username'];
                    $_SESSION['campaign_admin']['login_time'] = time();

                    // Update last login
                    $stmt = $db->prepare("UPDATE campaign_admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?");
                    $stmt->execute([$admin['id']]);

                    header('Location: dashboard.php');
                    exit();
                } else {
                    recordFailedLogin();
                    $error_message = 'Invalid username or password.';
                }
            } catch (Exception $e) {
                $error_message = 'Login system error. Please try again.';
                error_log("Campaign admin login error: " . $e->getMessage());
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Campaign Admin Login | <?php echo SITE_NAME; ?></title>
    
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
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .login-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            width: 100%;
            max-width: 400px;
            overflow: hidden;
        }

        .login-header {
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            color: white;
            padding: 40px 30px 30px;
            text-align: center;
        }

        .login-header h1 {
            font-size: 1.8rem;
            font-weight: 800;
            margin-bottom: 8px;
        }

        .login-header p {
            opacity: 0.9;
        }

        .logo-section {
            margin-bottom: 1rem;
            font-size: 3rem;
        }

        .login-form {
            padding: 40px 30px;
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

        .btn-login {
            width: 100%;
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
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

        .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(56, 182, 255, 0.3);
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
            color: white;
        }

        @media (max-width: 480px) {
            .login-container {
                margin: 10px;
            }
            
            .login-form {
                padding: 30px 20px;
            }
        }
    </style>
</head>

<body>
    <a href="../index.php" class="back-home">← Back to Home</a>

    <div class="login-container">
        <div class="login-header">
            <div class="logo-section">🎯</div>
            <h1>Campaign Admin</h1>
            <p>Manage postcard campaigns & registrations</p>
        </div>

        <div class="login-form">
            <?php if ($error_message): ?>
                <div class="alert error"><?php echo htmlspecialchars($error_message); ?></div>
            <?php endif; ?>

            <form method="POST" action="">
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken); ?>">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" 
                           value="<?php echo htmlspecialchars($username ?? ''); ?>" required>
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required>
                </div>

                <button type="submit" class="btn-login">
                    Login to Dashboard
                </button>
            </form>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.querySelector('form');
            const usernameInput = document.querySelector('#username');
            const passwordInput = document.querySelector('#password');

            form.addEventListener('submit', function(e) {
                let isValid = true;

                usernameInput.style.borderColor = '#e2e8f0';
                passwordInput.style.borderColor = '#e2e8f0';

                if (!usernameInput.value.trim()) {
                    usernameInput.style.borderColor = '#ef4444';
                    isValid = false;
                }

                if (!passwordInput.value.trim()) {
                    passwordInput.style.borderColor = '#ef4444';
                    isValid = false;
                }

                if (!isValid) {
                    e.preventDefault();
                }
            });

            [usernameInput, passwordInput].forEach(input => {
                input.addEventListener('input', function() {
                    this.style.borderColor = '#e2e8f0';
                });
            });
        });
    </script>
</body>
</html>