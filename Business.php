<?php
// Business.php - Business management class (Updated for prefixed tables and hidden filter)

require_once 'config.php';

class Business {
    private $db;
    
    public function __construct() {
        $this->db = getDB();
    }
    
    /**
     * Get all businesses with filtering and pagination
     */
    public function getBusinesses($filters = [], $page = 1, $perPage = BUSINESSES_PER_PAGE) {
        $where = ['b.is_active = 1', 'b.is_verified = 1', 'b.is_hidden = 0'];
        $params = [];
        
        // Build WHERE clause based on filters
        if (!empty($filters['category'])) {
            $where[] = 'b.category = ?';
            $params[] = $filters['category'];
        }
        
        if (!empty($filters['location'])) {
            $where[] = 'b.location_area = ?';
            $params[] = $filters['location'];
        }
        
        if (!empty($filters['search'])) {
            $where[] = '(b.business_name LIKE ? OR b.description LIKE ? OR b.extended_description LIKE ?)';
            $searchTerm = '%' . $filters['search'] . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if (!empty($filters['tag'])) {
            $where[] = 'b.id IN (SELECT bt.business_id FROM ' . getTable('business_tags') . ' bt JOIN ' . getTable('tags') . ' t ON bt.tag_id = t.id WHERE t.slug = ?)';
            $params[] = $filters['tag'];
        }
        
        // Special filter to include hidden businesses (for admin use)
        if (isset($filters['include_hidden']) && $filters['include_hidden'] === true) {
            // Remove the is_hidden = 0 condition
            $where = array_filter($where, function($condition) {
                return $condition !== 'b.is_hidden = 0';
            });
        }
        
        // Filter to show only hidden businesses (for admin use)
        if (isset($filters['hidden_only']) && $filters['hidden_only'] === true) {
            // Replace is_hidden = 0 with is_hidden = 1
            $where = array_map(function($condition) {
                return $condition === 'b.is_hidden = 0' ? 'b.is_hidden = 1' : $condition;
            }, $where);
        }
        
        // Calculate offset
        $offset = ($page - 1) * $perPage;
        
        // Main query
        $sql = "
            SELECT 
                b.*,
                sp.name as plan_name,
                sp.has_featured_placement,
                sp.has_priority_placement,
                COUNT(bp.id) as photo_count
            FROM " . getTable('businesses') . " b
            LEFT JOIN " . getTable('users') . " u ON b.user_id = u.id
            LEFT JOIN " . getTable('user_subscriptions') . " us ON u.id = us.user_id AND us.status = 'active'
            LEFT JOIN " . getTable('subscription_plans') . " sp ON us.plan_id = sp.id OR (us.plan_id IS NULL AND sp.name = 'basic')
            LEFT JOIN " . getTable('business_photos') . " bp ON b.id = bp.business_id
            WHERE " . implode(' AND ', $where) . "
            GROUP BY b.id
            ORDER BY 
                CASE WHEN sp.has_priority_placement = 1 THEN 1 ELSE 2 END,
                CASE WHEN sp.has_featured_placement = 1 THEN 1 ELSE 2 END,
                b.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $perPage;
        $params[] = $offset;
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $businesses = $stmt->fetchAll();
        
        // Get total count for pagination
        $countSql = "
            SELECT COUNT(DISTINCT b.id) as total
            FROM " . getTable('businesses') . " b
            LEFT JOIN " . getTable('users') . " u ON b.user_id = u.id
            LEFT JOIN " . getTable('user_subscriptions') . " us ON u.id = us.user_id AND us.status = 'active'
            LEFT JOIN " . getTable('subscription_plans') . " sp ON us.plan_id = sp.id OR (us.plan_id IS NULL AND sp.name = 'basic')
            WHERE " . implode(' AND ', $where);
        
        // Remove the LIMIT and OFFSET params for count query
        $countParams = array_slice($params, 0, -2);
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($countParams);
        $totalCount = $countStmt->fetchColumn();
        
        // Batch load tags
        $businessIds = array_column($businesses, 'id');
        $tagsByBusiness = getBusinessTagsBatch($businessIds);

        // Enhance businesses with additional data
        foreach ($businesses as &$business) {
            $business['photos'] = $this->getBusinessPhotos($business['id']);
            $business['hours'] = $this->getBusinessHours($business['id']);
            $business['offers'] = $this->getBusinessOffers($business['id']);
            $business['formatted_phone'] = formatPhoneNumber($business['phone']);
            $business['tags'] = $tagsByBusiness[$business['id']] ?? [];
        }
        
        return [
            'businesses' => $businesses,
            'total' => $totalCount,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => ceil($totalCount / $perPage)
        ];
    }
    
    /**
     * Get a single business by ID or slug
     */
    public function getBusiness($identifier, $bySlug = false) {
        $field = $bySlug ? 'slug' : 'id';
        
        $sql = "
            SELECT 
                b.*,
                sp.name as plan_name,
                sp.max_photos,
                sp.has_description,
                sp.has_extended_description,
                sp.has_hours,
                sp.has_offers,
                sp.has_featured_placement,
                sp.has_priority_placement,
                sp.has_analytics,
                us.status as subscription_status,
                us.current_period_end
            FROM " . getTable('businesses') . " b
            LEFT JOIN " . getTable('users') . " u ON b.user_id = u.id
            LEFT JOIN " . getTable('user_subscriptions') . " us ON u.id = us.user_id AND us.status = 'active'
            LEFT JOIN " . getTable('subscription_plans') . " sp ON us.plan_id = sp.id OR (us.plan_id IS NULL AND sp.name = 'basic')
            WHERE b.{$field} = ? AND b.is_active = 1 AND b.is_hidden = 0
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$identifier]);
        $business = $stmt->fetch();
        
        if ($business) {
            // Increment view count (filtered)
            if ($this->shouldCountView($business['id'], $business['user_id'] ?? null)) {
                $this->incrementViews($business['id']);
                $this->markViewCounted($business['id']);
            }

            // Get additional data
            $business['photos'] = $this->getBusinessPhotos($business['id']);
            $business['hours'] = $this->getBusinessHours($business['id']);
            $business['offers'] = $this->getBusinessOffers($business['id']);
            $business['formatted_phone'] = formatPhoneNumber($business['phone']);
            $business['tags'] = getBusinessTags($business['id']);
        }
        
        return $business;
    }
    
    /**
     * Create a new business listing
     */
    public function createBusiness($data, $userId = null) {
        // Generate slug
        $slug = $this->generateUniqueSlug($data['business_name']);
        
        $sql = "
            INSERT INTO " . getTable('businesses') . " (
                user_id, business_name, slug, category, phone, email, website,
                address, city, state, zip_code, location_area, description,
                extended_description, plan_type, latitude, longitude, is_hidden
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute([
            $userId,
            $data['business_name'],
            $slug,
            $data['category'],
            $data['phone'] ?? null,
            $data['email'] ?? null,
            $data['website'] ?? null,
            $data['address'] ?? null,
            $data['city'] ?? null,
            $data['state'] ?? 'SC',
            $data['zip_code'] ?? null,
            $data['location_area'] ?? 'charleston',
            $data['description'] ?? null,
            $data['extended_description'] ?? null,
            $data['plan_type'] ?? 'basic',
            $data['latitude'] ?? null,
            $data['longitude'] ?? null,
            $data['is_hidden'] ?? 0  // Default to visible unless specified
        ]);
        
        if ($success) {
            $businessId = $this->db->lastInsertId();
            
            // Create default business hours (closed)
            $this->createDefaultHours($businessId);
            
            // Log activity
            logActivity('business_created', ['business_id' => $businessId, 'name' => $data['business_name']]);
            
            return $businessId;
        }
        
        return false;
    }
    
    /**
     * Update an existing business
     */
    public function updateBusiness($businessId, $data) {
        // Check if user owns this business or is admin
        if (!$this->canEditBusiness($businessId)) {
            throw new Exception('Not authorized to edit this business');
        }
        
        $sql = "
            UPDATE " . getTable('businesses') . " SET
                business_name = ?, category = ?, phone = ?, email = ?, website = ?,
                address = ?, city = ?, state = ?, zip_code = ?, location_area = ?,
                description = ?, extended_description = ?, latitude = ?, longitude = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ";
        
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute([
            $data['business_name'],
            $data['category'],
            $data['phone'] ?? null,
            $data['email'] ?? null,
            $data['website'] ?? null,
            $data['address'] ?? null,
            $data['city'] ?? null,
            $data['state'] ?? 'SC',
            $data['zip_code'] ?? null,
            $data['location_area'] ?? 'charleston',
            $data['description'] ?? null,
            $data['extended_description'] ?? null,
            $data['latitude'] ?? null,
            $data['longitude'] ?? null,
            $businessId
        ]);
        
        if ($success) {
            // Update slug if business name changed
            $currentBusiness = $this->getBusiness($businessId);
            if ($currentBusiness['business_name'] !== $data['business_name']) {
                $newSlug = $this->generateUniqueSlug($data['business_name'], $businessId);
                $this->updateSlug($businessId, $newSlug);
            }
            
            logActivity('business_updated', ['business_id' => $businessId]);
        }
        
        return $success;
    }
    
    /**
     * Get business photos
     */
    public function getBusinessPhotos($businessId) {
        $sql = "
            SELECT * FROM " . getTable('business_photos') . "
            WHERE business_id = ? 
            ORDER BY is_primary DESC, sort_order ASC, uploaded_at ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$businessId]);
        
        $photos = $stmt->fetchAll();
        
        // Add full URLs for all sizes and dimensions
        $baseUrl = SITE_URL . '/uploads/business_photos/';
        $baseDir = UPLOAD_DIR . 'business_photos/';
        foreach ($photos as &$photo) {
            $photo['url'] = $baseUrl . $photo['filename'];
            $photo['thumb_url'] = file_exists($baseDir . 'thumb/' . $photo['filename'])
                ? $baseUrl . 'thumb/' . $photo['filename']
                : $baseUrl . $photo['filename'];
            $photo['medium_url'] = file_exists($baseDir . 'medium/' . $photo['filename'])
                ? $baseUrl . 'medium/' . $photo['filename']
                : $baseUrl . $photo['filename'];

            // Get dimensions for the original
            $origPath = $baseDir . $photo['filename'];
            if (file_exists($origPath)) {
                $dims = @getimagesize($origPath);
                if ($dims) {
                    $photo['width'] = $dims[0];
                    $photo['height'] = $dims[1];
                }
            }

            // Get dimensions for medium
            $medPath = $baseDir . 'medium/' . $photo['filename'];
            if (file_exists($medPath)) {
                $medDims = @getimagesize($medPath);
                if ($medDims) {
                    $photo['medium_width'] = $medDims[0];
                    $photo['medium_height'] = $medDims[1];
                }
            }
        }
        
        return $photos;
    }
    
    /**
     * Add business photo
     */
    public function addBusinessPhoto($businessId, $file, $altText = '', $isPrimary = false) {
        if (!$this->canEditBusiness($businessId)) {
            throw new Exception('Not authorized to add photos to this business');
        }
        
        try {
            // Upload image
            $uploadResult = uploadImage($file, 'business_photos');
            
            // Generate resized versions (thumb + medium)
            $baseDir = UPLOAD_DIR . 'business_photos';
            generateImageSizes($uploadResult['path'], $baseDir, $uploadResult['filename']);
            
            // If this is set as primary, unset other primary photos
            if ($isPrimary) {
                $this->db->prepare("UPDATE " . getTable('business_photos') . " SET is_primary = 0 WHERE business_id = ?")
                         ->execute([$businessId]);
            }
            
            // Insert photo record
            $sql = "
                INSERT INTO " . getTable('business_photos') . " (
                    business_id, filename, original_filename, file_size, 
                    mime_type, alt_text, is_primary
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $businessId,
                $uploadResult['filename'],
                $file['name'],
                $uploadResult['size'],
                $uploadResult['mime_type'],
                $altText,
                $isPrimary ? 1 : 0
            ]);
            
            $photoId = $this->db->lastInsertId();
            
            logActivity('photo_added', ['business_id' => $businessId, 'photo_id' => $photoId]);
            
            return $photoId;
            
        } catch (Exception $e) {
            throw new Exception('Failed to upload photo: ' . $e->getMessage());
        }
    }
    
    /**
     * Get business hours
     */
    public function getBusinessHours($businessId) {
        $sql = "SELECT * FROM " . getTable('business_hours') . " WHERE business_id = ? ORDER BY day_of_week";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$businessId]);
        
        $hours = [];
        $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $result = $stmt->fetchAll();
        
        // Convert to associative array by day
        $hoursByDay = [];
        foreach ($result as $hour) {
            $hoursByDay[$hour['day_of_week']] = $hour;
        }
        
        for ($i = 0; $i < 7; $i++) {
            $hours[] = [
                'day' => $days[$i],
                'day_number' => $i,
                'open_time' => $hoursByDay[$i]['open_time'] ?? null,
                'close_time' => $hoursByDay[$i]['close_time'] ?? null,
                'is_closed' => isset($hoursByDay[$i]) ? $hoursByDay[$i]['is_closed'] : true
            ];
        }
        
        return $hours;
    }
    
    /**
     * Update business hours
     */
    public function updateBusinessHours($businessId, $hours) {
        if (!$this->canEditBusiness($businessId)) {
            throw new Exception('Not authorized to update hours for this business');
        }
        
        try {
            $this->db->beginTransaction();
            
            // Delete existing hours
            $this->db->prepare("DELETE FROM " . getTable('business_hours') . " WHERE business_id = ?")
                     ->execute([$businessId]);
            
            // Insert new hours
            $sql = "INSERT INTO " . getTable('business_hours') . " (business_id, day_of_week, open_time, close_time, is_closed) VALUES (?, ?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            
            foreach ($hours as $dayNumber => $dayHours) {
                $stmt->execute([
                    $businessId,
                    $dayNumber,
                    $dayHours['is_closed'] ? null : ($dayHours['open_time'] ?? null),
                    $dayHours['is_closed'] ? null : ($dayHours['close_time'] ?? null),
                    $dayHours['is_closed'] ? 1 : 0
                ]);
            }
            
            $this->db->commit();
            
            logActivity('hours_updated', ['business_id' => $businessId]);
            
            return true;
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }
    
    /**
     * Get business offers/coupons
     */
    public function getBusinessOffers($businessId, $activeOnly = true) {
        $where = "business_id = ?";
        $params = [$businessId];
        
        if ($activeOnly) {
            $where .= " AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())";
        }
        
        $sql = "SELECT * FROM " . getTable('business_offers') . " WHERE {$where} ORDER BY created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
    }
    
    /**
     * Add/update business offer
     */
    public function saveBusinessOffer($businessId, $data, $offerId = null) {
        if (!$this->canEditBusiness($businessId)) {
            throw new Exception('Not authorized to manage offers for this business');
        }
        
        if ($offerId) {
            // Update existing offer
            $sql = "
                UPDATE " . getTable('business_offers') . " SET
                    title = ?, description = ?, terms = ?, expires_at = ?, 
                    is_active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND business_id = ?
            ";
            $params = [
                $data['title'],
                $data['description'],
                $data['terms'] ?? null,
                $data['expires_at'] ?? null,
                $data['is_active'] ?? 1,
                $offerId,
                $businessId
            ];
        } else {
            // Create new offer
            $sql = "
                INSERT INTO " . getTable('business_offers') . " (business_id, title, description, terms, expires_at, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            ";
            $params = [
                $businessId,
                $data['title'],
                $data['description'],
                $data['terms'] ?? null,
                $data['expires_at'] ?? null,
                $data['is_active'] ?? 1
            ];
        }
        
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute($params);
        
        if ($success) {
            $id = $offerId ?: $this->db->lastInsertId();
            logActivity($offerId ? 'offer_updated' : 'offer_created', [
                'business_id' => $businessId,
                'offer_id' => $id
            ]);
            return $id;
        }
        
        return false;
    }
    
    /**
     * Record a contact inquiry and notify the business via email
     */
    public function recordInquiry($businessId, $contactData) {
        // Ensure inquiries table exists
        $this->db->exec("CREATE TABLE IF NOT EXISTS " . getTable('business_inquiries') . " (
            id INT AUTO_INCREMENT PRIMARY KEY,
            business_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) DEFAULT NULL,
            phone VARCHAR(50) DEFAULT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX (business_id)
        )");

        // Save to database
        $sql = "INSERT INTO " . getTable('business_inquiries') . " (business_id, name, email, phone, message) VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $businessId,
            $contactData['name'],
            $contactData['email'] ?: null,
            $contactData['phone'] ?: null,
            $contactData['message']
        ]);

        // Build notification email
        $bizStmt = $this->db->prepare("SELECT business_name, email FROM " . getTable('businesses') . " WHERE id = ?");
        $bizStmt->execute([$businessId]);
        $biz = $bizStmt->fetch();

        $bizName = $biz ? $biz['business_name'] : 'Unknown Business';
        $subject = "New inquiry for " . $bizName . " via Lowcountry Business Spotlight";
        $body = "You have a new inquiry from the Lowcountry Business Spotlight listing for " . $bizName . ".\n\n";
        $body .= "Name: " . $contactData['name'] . "\n";
        if (!empty($contactData['email'])) $body .= "Email: " . $contactData['email'] . "\n";
        if (!empty($contactData['phone']))  $body .= "Phone: " . $contactData['phone'] . "\n";
        $body .= "\nMessage:\n" . $contactData['message'] . "\n";

        $replyTo = !empty($contactData['email']) ? $contactData['email'] : null;

        // Always send a copy to the site owner
        $ownerEmail = 'andrew@lowcountrybusinessspotlight.com';
        sendSecureEmail($ownerEmail, $subject, $body, $replyTo);

        // Also send to the business email if they have one
        if ($biz && !empty($biz['email']) && $biz['email'] !== $ownerEmail) {
            sendSecureEmail($biz['email'], $subject, $body, $replyTo);
        }

        // Update business-level inquiry count
        $this->db->prepare("UPDATE " . getTable('businesses') . " SET inquiries_count = inquiries_count + 1 WHERE id = ?")
                 ->execute([$businessId]);

        // Update daily analytics
        $this->updateAnalytics($businessId, 'inquiries_count', 1);

        logActivity('inquiry_received', ['business_id' => $businessId]);

        return true;
    }

    // Private helper methods
    
    private function generateUniqueSlug($name, $excludeId = null) {
        $baseSlug = generateSlug($name);
        $slug = $baseSlug;
        $counter = 1;
        
        while ($this->slugExists($slug, $excludeId)) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }
        
        return $slug;
    }
    
    private function slugExists($slug, $excludeId = null) {
        $sql = "SELECT id FROM " . getTable('businesses') . " WHERE slug = ?";
        $params = [$slug];
        
        if ($excludeId) {
            $sql .= " AND id != ?";
            $params[] = $excludeId;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->rowCount() > 0;
    }
    
    private function updateSlug($businessId, $slug) {
        $stmt = $this->db->prepare("UPDATE " . getTable('businesses') . " SET slug = ? WHERE id = ?");
        return $stmt->execute([$slug, $businessId]);
    }
    
    private function canEditBusiness($businessId) {
        if (!isLoggedIn()) return false;
        
        $user = getCurrentUser();
        if (!$user) return false;
        
        // Admin can edit any business (check if user email is in admin list)
        $adminEmails = ['hello@lbspotlight.com', 'admin@lbspotlight.com'];
        if (in_array($user['email'], $adminEmails)) return true;
        
        // User can edit their own business
        $stmt = $this->db->prepare("SELECT user_id FROM " . getTable('businesses') . " WHERE id = ?");
        $stmt->execute([$businessId]);
        $business = $stmt->fetch();
        
        return $business && $business['user_id'] == $user['id'];
    }
    
    private function shouldCountView($businessId, $ownerUserId = null) {
        // Skip bots/crawlers
        $ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
        $bots = ['bot', 'crawl', 'spider', 'slurp', 'facebookexternalhit', 'linkedinbot',
                 'twitterbot', 'whatsapp', 'preview', 'fetch', 'curl', 'wget', 'python',
                 'go-http', 'headlesschrome', 'phantomjs', 'lighthouse', 'pagespeed', 'semrush',
                 'ahrefs', 'mj12bot', 'dotbot', 'petalbot', 'bytespider', 'gptbot', 'claudebot'];
        foreach ($bots as $bot) {
            if (strpos($ua, $bot) !== false) {
                return false;
            }
        }

        // Skip if no user agent (likely a script/bot)
        if (empty($ua)) {
            return false;
        }

        // Skip if the logged-in user owns this listing
        if ($ownerUserId && isLoggedIn() && isset($_SESSION['user_id']) && $_SESSION['user_id'] == $ownerUserId) {
            return false;
        }

        // Skip if admin session is active
        if (!empty($_SESSION['campaign_admin']['logged_in'])) {
            return false;
        }

        // Session-based dedup: only count once per session per business
        $viewedKey = 'viewed_businesses';
        if (!isset($_SESSION[$viewedKey])) {
            $_SESSION[$viewedKey] = [];
        }
        if (in_array($businessId, $_SESSION[$viewedKey])) {
            return false;
        }

        return true;
    }

    private function markViewCounted($businessId) {
        $_SESSION['viewed_businesses'][] = $businessId;
    }

    private function incrementViews($businessId) {
        // Update business view count
        $this->db->prepare("UPDATE " . getTable('businesses') . " SET views_count = views_count + 1 WHERE id = ?")
                 ->execute([$businessId]);

        // Update daily analytics
        $this->updateAnalytics($businessId, 'views_count', 1);
    }
    
    private function updateAnalytics($businessId, $metric, $increment = 1) {
        $today = date('Y-m-d');
        
        $sql = "
            INSERT INTO " . getTable('business_analytics') . " (business_id, date, {$metric})
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE {$metric} = {$metric} + ?
        ";
        
        $this->db->prepare($sql)->execute([$businessId, $today, $increment, $increment]);
    }
    
    private function createDefaultHours($businessId) {
        $sql = "INSERT INTO " . getTable('business_hours') . " (business_id, day_of_week, is_closed) VALUES (?, ?, 1)";
        $stmt = $this->db->prepare($sql);
        
        for ($day = 0; $day < 7; $day++) {
            $stmt->execute([$businessId, $day]);
        }
    }
}
?>