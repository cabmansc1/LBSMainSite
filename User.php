<?php
// User.php - User management and authentication class (Updated for prefixed tables)

require_once 'config.php';

class User {
    private $db;
    
    public function __construct() {
        $this->db = getDB();
    }
    
    /**
     * Register a new user
     */
    public function register($email, $password, $firstName, $lastName, $phone = null) {
        // Validate input
        if (!isValidEmail($email)) {
            throw new Exception('Invalid email address');
        }
        
        if (strlen($password) < PASSWORD_MIN_LENGTH) {
            throw new Exception('Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters long');
        }
        
        // Check if email already exists
        if ($this->emailExists($email)) {
            throw new Exception('Email address is already registered');
        }
        
        // Hash password
        $passwordHash = hashPassword($password);
        
        // Generate verification token
        $verificationToken = generateToken();
        
        try {
            $sql = "
                INSERT INTO " . getTable('users') . " (email, password_hash, first_name, last_name, phone, verification_token, email_verified)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            ";
            
            $stmt = $this->db->prepare($sql);
            $success = $stmt->execute([
                $email,
                $passwordHash,
                $firstName,
                $lastName,
                $phone,
                $verificationToken
            ]);
            
            if ($success) {
                $userId = $this->db->lastInsertId();
                
                // For now, we'll skip sending verification email
                // $this->sendVerificationEmail($email, $verificationToken, $firstName);
                
                logActivity('user_registered', ['user_id' => $userId, 'email' => $email]);
                
                return $userId;
            }
            
            return false;
            
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) { // Duplicate entry
                throw new Exception('Email address is already registered');
            }
            throw new Exception('Registration failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Authenticate user login
     */
    public function login($email, $password, $rememberMe = false) {
        if (!isValidEmail($email)) {
            throw new Exception('Invalid email address');
        }
        
        $stmt = $this->db->prepare("SELECT * FROM " . getTable('users') . " WHERE email = ? AND is_active = 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user || !verifyPassword($password, $user['password_hash'])) {
            logActivity('login_failed', ['email' => $email]);
            throw new Exception('Invalid email or password');
        }
        
        // Start user session
        $this->startUserSession($user);
        
        // Update last login
        $this->updateLastLogin($user['id']);
        
        logActivity('user_logged_in', ['user_id' => $user['id']]);
        
        return $user;
    }
    
    /**
     * Logout user
     */
    public function logout() {
        if (isLoggedIn()) {
            logActivity('user_logged_out', ['user_id' => $_SESSION['user_id']]);
        }
        
        session_destroy();
        
        // Clear remember me cookie if it exists
        if (isset($_COOKIE['remember_me'])) {
            setcookie('remember_me', '', time() - 3600, '/');
        }
        
        return true;
    }
    
    /**
     * Verify email address
     */
    public function verifyEmail($token) {
        $stmt = $this->db->prepare("
            SELECT id, email FROM " . getTable('users') . " 
            WHERE verification_token = ? AND email_verified = 0 AND is_active = 1
        ");
        $stmt->execute([$token]);
        $user = $stmt->fetch();
        
        if (!$user) {
            throw new Exception('Invalid or expired verification token');
        }
        
        // Update user as verified
        $updateStmt = $this->db->prepare("
            UPDATE " . getTable('users') . " 
            SET email_verified = 1, verification_token = NULL 
            WHERE id = ?
        ");
        $success = $updateStmt->execute([$user['id']]);
        
        if ($success) {
            logActivity('email_verified', ['user_id' => $user['id']]);
        }
        
        return $success;
    }
    
    /**
     * Request password reset
     */
    public function requestPasswordReset($email) {
        if (!isValidEmail($email)) {
            throw new Exception('Invalid email address');
        }
        
        $stmt = $this->db->prepare("SELECT id, first_name FROM " . getTable('users') . " WHERE email = ? AND is_active = 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user) {
            // Don't reveal whether email exists or not
            return true;
        }
        
        // Generate reset token. Compute the 1-hour expiry on the DATABASE clock
        // (NOW()) so it stays consistent with the NOW() check in resetPassword().
        // PHP and MySQL run on different timezone offsets on this host, so mixing
        // a PHP-computed timestamp with a MySQL NOW() comparison skews the window.
        $resetToken = generateToken();

        $updateStmt = $this->db->prepare("
            UPDATE " . getTable('users') . "
            SET reset_token = ?, reset_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR)
            WHERE id = ?
        ");
        $updateStmt->execute([$resetToken, $user['id']]);

        // Send the reset email with a tokenised link (valid for 1 hour).
        $resetLink = SITE_URL . '/reset-password.php?token=' . urlencode($resetToken);
        $firstName = trim($user['first_name'] ?? '');
        $greeting  = $firstName !== '' ? "Hi {$firstName},\n\n" : "Hi,\n\n";

        $body  = $greeting;
        $body .= "We received a request to reset the password for your " . SITE_NAME . " account.\n\n";
        $body .= "Click the link below to choose a new password. This link expires in 1 hour:\n\n";
        $body .= $resetLink . "\n\n";
        $body .= "If you didn't request this, you can safely ignore this email — your password will not change.\n\n";
        $body .= "Thank you,\n" . SITE_NAME;

        sendSecureEmail($email, 'Reset your ' . SITE_NAME . ' password', $body);

        logActivity('password_reset_requested', ['user_id' => $user['id']]);

        return true;
    }
    
    /**
     * Reset password with token
     */
    public function resetPassword($token, $newPassword) {
        if (strlen($newPassword) < PASSWORD_MIN_LENGTH) {
            throw new Exception('Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters long');
        }
        
        $stmt = $this->db->prepare("
            SELECT id FROM " . getTable('users') . " 
            WHERE reset_token = ? AND reset_expires > NOW() AND is_active = 1
        ");
        $stmt->execute([$token]);
        $user = $stmt->fetch();
        
        if (!$user) {
            throw new Exception('Invalid or expired reset token');
        }
        
        // Update password and clear reset token
        $passwordHash = hashPassword($newPassword);
        
        $updateStmt = $this->db->prepare("
            UPDATE " . getTable('users') . " 
            SET password_hash = ?, reset_token = NULL, reset_expires = NULL
            WHERE id = ?
        ");
        $success = $updateStmt->execute([$passwordHash, $user['id']]);
        
        if ($success) {
            logActivity('password_reset', ['user_id' => $user['id']]);
        }
        
        return $success;
    }
    
    /**
     * Update user profile
     */
    public function updateProfile($userId, $data) {
        $allowedFields = ['first_name', 'last_name', 'phone'];
        $updates = [];
        $params = [];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updates[] = "{$field} = ?";
                $params[] = $data[$field];
            }
        }
        
        if (empty($updates)) {
            throw new Exception('No valid fields to update');
        }
        
        $params[] = $userId;
        
        $sql = "UPDATE " . getTable('users') . " SET " . implode(', ', $updates) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute($params);
        
        if ($success) {
            logActivity('profile_updated', ['user_id' => $userId]);
        }
        
        return $success;
    }
    
    /**
     * Change user password
     */
    public function changePassword($userId, $currentPassword, $newPassword) {
        if (strlen($newPassword) < PASSWORD_MIN_LENGTH) {
            throw new Exception('Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters long');
        }
        
        // Verify current password
        $stmt = $this->db->prepare("SELECT password_hash FROM " . getTable('users') . " WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user || !verifyPassword($currentPassword, $user['password_hash'])) {
            throw new Exception('Current password is incorrect');
        }
        
        // Update password
        $passwordHash = hashPassword($newPassword);
        
        $updateStmt = $this->db->prepare("UPDATE " . getTable('users') . " SET password_hash = ? WHERE id = ?");
        $success = $updateStmt->execute([$passwordHash, $userId]);
        
        if ($success) {
            logActivity('password_changed', ['user_id' => $userId]);
        }
        
        return $success;
    }
    
    /**
     * Get user's subscription details
     */
    public function getUserSubscription($userId) {
        $sql = "
            SELECT 
                us.*,
                sp.name as plan_name,
                sp.price_monthly,
                sp.price_yearly,
                sp.max_photos,
                sp.has_description,
                sp.has_extended_description,
                sp.has_hours,
                sp.has_offers,
                sp.has_featured_placement,
                sp.has_priority_placement,
                sp.has_analytics,
                sp.postcard_discount,
                sp.max_postcard_uses
            FROM " . getTable('user_subscriptions') . " us
            JOIN " . getTable('subscription_plans') . " sp ON us.plan_id = sp.id
            WHERE us.user_id = ? AND us.status = 'active'
            ORDER BY us.created_at DESC
            LIMIT 1
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        
        return $stmt->fetch();
    }
    
    /**
     * Get all subscription plans
     */
    public function getSubscriptionPlans() {
        $stmt = $this->db->query("SELECT * FROM " . getTable('subscription_plans') . " ORDER BY price_monthly ASC");
        return $stmt->fetchAll();
    }
    
    /**
     * Check postcard discount eligibility
     */
    public function getPostcardDiscountStatus($userId) {
        $subscription = $this->getUserSubscription($userId);
        
        if (!$subscription || $subscription['postcard_discount'] == 0) {
            return [
                'eligible' => false,
                'discount_percent' => 0,
                'remaining_uses' => 0
            ];
        }
        
        // Count usage for current year
        $currentYear = date('Y');
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as used_count 
            FROM " . getTable('postcard_usage') . " 
            WHERE user_id = ? AND year = ?
        ");
        $stmt->execute([$userId, $currentYear]);
        $usage = $stmt->fetch();
        
        $usedCount = $usage['used_count'] ?? 0;
        $remainingUses = max(0, $subscription['max_postcard_uses'] - $usedCount);
        
        return [
            'eligible' => $remainingUses > 0,
            'discount_percent' => $subscription['postcard_discount'],
            'remaining_uses' => $remainingUses,
            'max_uses' => $subscription['max_postcard_uses']
        ];
    }
    
    /**
     * Create an auto-account for community card buyers.
     * If email exists, returns existing user ID.
     * If new, creates account with random password and emails credentials.
     */
    public function createAutoAccount($email, $firstName, $lastName, $phone = null, $context = 'card') {
        $email = strtolower(trim($email));

        // Check if user already exists
        $stmt = $this->db->prepare("SELECT id FROM " . getTable('users') . " WHERE email = ?");
        $stmt->execute([$email]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            return (int)$existing['id'];
        }

        // Create new account with random password
        $randomPassword = bin2hex(random_bytes(6)); // 12-char password
        $passwordHash = hashPassword($randomPassword);
        $verificationToken = generateToken();

        $stmt = $this->db->prepare("
            INSERT INTO " . getTable('users') . " (email, password_hash, first_name, last_name, phone, verification_token, email_verified)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        ");
        $stmt->execute([$email, $passwordHash, $firstName, $lastName, $phone, $verificationToken]);
        $userId = (int)$this->db->lastInsertId();

        // Email the credentials
        $body = "Welcome to " . SITE_NAME . "!\n\n";
        if ($context === 'directory') {
            $body .= "An account has been created for you so you can manage your business listing.\n\n";
        } else {
            $body .= "An account has been created for you after your Community Card purchase.\n\n";
        }
        $body .= "Email: {$email}\n";
        $body .= "Temporary Password: {$randomPassword}\n\n";
        $body .= "Log in at: " . SITE_URL . "/login.php\n";
        $body .= "Please change your password after logging in.\n\n";
        if ($context === 'directory') {
            $body .= "Once your listing is approved, you can edit your details, add photos, and respond to inquiries from your dashboard.\n\n";
        } else {
            $body .= "You can manage your ad content from your dashboard.\n\n";
        }
        $body .= "Thank you,\n" . SITE_NAME;

        sendSecureEmail($email, 'Your ' . SITE_NAME . ' Account', $body);

        logActivity('auto_account_created', ['user_id' => $userId, 'email' => $email]);

        return $userId;
    }

    // Private helper methods

    private function emailExists($email) {
        $stmt = $this->db->prepare("SELECT id FROM " . getTable('users') . " WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->rowCount() > 0;
    }
    
    private function startUserSession($user) {
        // Regenerate session ID for security
        session_regenerate_id(true);
        
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
        $_SESSION['last_activity'] = time();
    }
    
    private function updateLastLogin($userId) {
        $stmt = $this->db->prepare("UPDATE " . getTable('users') . " SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$userId]);
    }
}
?>