<?php
// --- Strict, private, no-cache for admin pages ---
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Vary: Cookie, Authorization');

// admin/manage_directory.php - Business Directory CRUD
require_once '../config.php';
require_once 'campaign_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();

$db = getDB();
ensureDirectoryTaxonomyTables();

// Ensure show_hours column exists
try {
    $db->query("SELECT show_hours FROM directory_businesses LIMIT 1");
} catch (PDOException $e) {
    $db->exec("ALTER TABLE directory_businesses ADD COLUMN show_hours TINYINT(1) NOT NULL DEFAULT 0");
}

// Ensure social media columns exist
foreach (['facebook_url', 'instagram_url', 'tiktok_url', 'youtube_url'] as $col) {
    try {
        $db->query("SELECT $col FROM directory_businesses LIMIT 1");
    } catch (PDOException $e) {
        $db->exec("ALTER TABLE directory_businesses ADD COLUMN $col VARCHAR(255) DEFAULT NULL");
    }
}

// Ensure lat/lng columns exist
foreach (['lat' => 'DECIMAL(10,7)', 'lng' => 'DECIMAL(10,7)'] as $col => $type) {
    try {
        $db->query("SELECT $col FROM directory_businesses LIMIT 1");
    } catch (PDOException $e) {
        $db->exec("ALTER TABLE directory_businesses ADD COLUMN $col $type DEFAULT NULL");
    }
}

// Ensure is_featured column exists (admin-controlled featured placement)
try {
    $db->query("SELECT is_featured FROM directory_businesses LIMIT 1");
} catch (PDOException $e) {
    $db->exec("ALTER TABLE directory_businesses ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0");
}

// Ensure inquiries_count column exists on businesses table
try {
    $db->query("SELECT inquiries_count FROM directory_businesses LIMIT 1");
} catch (PDOException $e) {
    $db->exec("ALTER TABLE directory_businesses ADD COLUMN inquiries_count INT NOT NULL DEFAULT 0");
}

// Sync inquiries_count from business_inquiries table on demand
if (isset($_GET['sync_inquiries'])) {
    try {
        $db->exec("UPDATE directory_businesses b
            SET inquiries_count = (
                SELECT COUNT(*) FROM directory_business_inquiries i WHERE i.business_id = b.id
            )");
        header('Location: manage_directory.php?message=inquiries_synced');
        exit();
    } catch (PDOException $e) {
        // table may not exist yet
    }
}

/**
 * Geocode an address using Google Geocoding API
 * Returns ['lat' => float, 'lng' => float] or null on failure
 */
function geocodeAddress($address, $city, $state, $zip) {
    $parts = array_filter([$address, $city, $state, $zip]);
    if (empty($parts)) return null;

    $fullAddress = implode(', ', $parts);
    $url = 'https://maps.googleapis.com/maps/api/geocode/json?address='
         . urlencode($fullAddress) . '&key=' . GOOGLE_MAPS_API_KEY;

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $response = curl_exec($ch);
    curl_close($ch);

    if (!$response) return null;

    $data = json_decode($response, true);
    if (!empty($data['results'][0]['geometry']['location'])) {
        $loc = $data['results'][0]['geometry']['location'];
        return ['lat' => $loc['lat'], 'lng' => $loc['lng']];
    }
    return null;
}

// Batch geocode businesses with NULL lat/lng (one-time, rate-limited)
if (isset($_GET['batch_geocode'])) {
    $ungeocodedStmt = $db->query("SELECT id, address, city, state, zip_code FROM directory_businesses WHERE lat IS NULL AND address IS NOT NULL AND address != '' LIMIT 50");
    $geocoded = 0;
    $updateStmt = $db->prepare("UPDATE directory_businesses SET lat = ?, lng = ? WHERE id = ?");
    while ($row = $ungeocodedStmt->fetch(PDO::FETCH_ASSOC)) {
        $coords = geocodeAddress($row['address'], $row['city'], $row['state'] ?? 'SC', $row['zip_code']);
        if ($coords) {
            $updateStmt->execute([$coords['lat'], $coords['lng'], $row['id']]);
            $geocoded++;
        }
        usleep(200000); // 200ms delay for rate limiting
    }
    header('Location: manage_directory.php?message=geocoded&count=' . $geocoded);
    exit();
}

$categories = getCategories();
$locations = getLocationAreas();
$allTags = getTags();

// CSV template download
if (isset($_GET['download_template'])) {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="directory_import_template.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['business_name', 'category', 'location_area', 'phone', 'email', 'website', 'address', 'city', 'zip_code', 'description']);
    fputcsv($out, ['Example Business', 'restaurant', 'summerville', '(843) 555-1234', 'info@example.com', 'https://example.com', '123 Main St', 'Summerville', '29483', 'A great local business.']);
    fclose($out);
    exit();
}

// Helper: get primary photo for a business
function getBusinessLogo($db, $businessId) {
    $stmt = $db->prepare("SELECT filename FROM directory_business_photos WHERE business_id = ? AND is_primary = 1 LIMIT 1");
    $stmt->execute([$businessId]);
    return $stmt->fetchColumn();
}

// Handle POST actions
$csv_results = null;
$duplicate_warning = null;
$prefill = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        if ($action === 'add') {
            $name = sanitizeInput($_POST['business_name'] ?? '');
            if (empty($name)) throw new Exception('Business name is required.');

            // Duplicate name check
            $dupCheck = $db->prepare("SELECT id FROM directory_businesses WHERE business_name = ?");
            $dupCheck->execute([$name]);
            if ($dupCheck->fetchColumn() && empty($_POST['confirm_duplicate'])) {
                $duplicate_warning = $name;
                // Re-populate form data for redisplay
                $prefill = $_POST;
                throw new Exception('');
            }

            $slug = generateSlug($name);
            $check = $db->prepare("SELECT COUNT(*) FROM directory_businesses WHERE slug = ?");
            $check->execute([$slug]);
            if ($check->fetchColumn() > 0) {
                $slug .= '-' . time();
            }

            $stmt = $db->prepare("INSERT INTO directory_businesses
                (business_name, slug, category, phone, email, website, address, city, state, zip_code, location_area, description, facebook_url, instagram_url, tiktok_url, youtube_url, is_active, is_verified, is_hidden, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SC', ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, NOW())");
            $stmt->execute([
                $name,
                $slug,
                sanitizeInput($_POST['category'] ?? ''),
                sanitizePhone($_POST['phone'] ?? ''),
                sanitizeEmail($_POST['email'] ?? '') ?: '',
                sanitizeURL($_POST['website'] ?? '') ?: '',
                sanitizeInput($_POST['address'] ?? ''),
                sanitizeInput($_POST['city'] ?? ''),
                sanitizeInput($_POST['zip_code'] ?? ''),
                sanitizeInput($_POST['location_area'] ?? ''),
                sanitizeInput($_POST['description'] ?? ''),
                sanitizeURL($_POST['facebook_url'] ?? '') ?: null,
                sanitizeURL($_POST['instagram_url'] ?? '') ?: null,
                sanitizeURL($_POST['tiktok_url'] ?? '') ?: null,
                sanitizeURL($_POST['youtube_url'] ?? '') ?: null
            ]);

            $newBizId = $db->lastInsertId();

            // Geocode address for lat/lng
            $coords = geocodeAddress(
                sanitizeInput($_POST['address'] ?? ''),
                sanitizeInput($_POST['city'] ?? ''),
                'SC',
                sanitizeInput($_POST['zip_code'] ?? '')
            );
            if ($coords) {
                $db->prepare("UPDATE directory_businesses SET lat = ?, lng = ? WHERE id = ?")
                   ->execute([$coords['lat'], $coords['lng'], $newBizId]);
            }

            // Handle logo upload
            if (!empty($_FILES['logo']['name']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
                $uploadResult = uploadImage($_FILES['logo'], 'business_photos');
                generateImageSizes($uploadResult['path'], UPLOAD_DIR . 'business_photos', $uploadResult['filename']);
                $photoStmt = $db->prepare("INSERT INTO directory_business_photos (business_id, filename, original_filename, file_size, mime_type, alt_text, is_primary) VALUES (?, ?, ?, ?, ?, ?, 1)");
                $photoStmt->execute([
                    $newBizId,
                    $uploadResult['filename'],
                    $_FILES['logo']['name'],
                    $uploadResult['size'],
                    $uploadResult['mime_type'],
                    $name . ' logo'
                ]);
            }

            // Handle gallery uploads on add
            if (!empty($_FILES['gallery']['name'][0])) {
                $galStmt = $db->prepare("INSERT INTO directory_business_photos (business_id, filename, original_filename, file_size, mime_type, alt_text, is_primary, sort_order) VALUES (?, ?, ?, ?, ?, ?, 0, ?)");
                $fileCount = count($_FILES['gallery']['name']);
                for ($i = 0; $i < $fileCount && $i < 6; $i++) {
                    if ($_FILES['gallery']['error'][$i] === UPLOAD_ERR_OK) {
                        $galleryFile = [
                            'name' => $_FILES['gallery']['name'][$i],
                            'type' => $_FILES['gallery']['type'][$i],
                            'tmp_name' => $_FILES['gallery']['tmp_name'][$i],
                            'error' => $_FILES['gallery']['error'][$i],
                            'size' => $_FILES['gallery']['size'][$i],
                        ];
                        $galResult = uploadImage($galleryFile, 'business_photos');
                        generateImageSizes($galResult['path'], UPLOAD_DIR . 'business_photos', $galResult['filename']);
                        $galStmt->execute([
                            $newBizId,
                            $galResult['filename'],
                            $galleryFile['name'],
                            $galResult['size'],
                            $galResult['mime_type'],
                            $name . ' gallery photo',
                            $i + 1
                        ]);
                    }
                }
            }

            // Save tags
            if (isset($_POST['tags'])) {
                saveBusinessTags($newBizId, $_POST['tags']);
            }

            header('Location: manage_directory.php?message=added');
            exit();

        } elseif ($action === 'edit') {
            $id = (int)($_POST['id'] ?? 0);
            if (!$id) throw new Exception('Invalid business ID.');

            $name = sanitizeInput($_POST['business_name'] ?? '');
            if (empty($name)) throw new Exception('Business name is required.');

            $showHours = isset($_POST['show_hours']) ? 1 : 0;
            $isFeatured = isset($_POST['is_featured']) ? 1 : 0;

            $stmt = $db->prepare("UPDATE directory_businesses SET
                business_name = ?, category = ?, phone = ?, email = ?, website = ?,
                address = ?, city = ?, zip_code = ?, location_area = ?, description = ?,
                facebook_url = ?, instagram_url = ?, tiktok_url = ?, youtube_url = ?,
                show_hours = ?, is_featured = ?, updated_at = NOW()
                WHERE id = ?");
            $stmt->execute([
                $name,
                sanitizeInput($_POST['category'] ?? ''),
                sanitizePhone($_POST['phone'] ?? ''),
                sanitizeEmail($_POST['email'] ?? '') ?: '',
                sanitizeURL($_POST['website'] ?? '') ?: '',
                sanitizeInput($_POST['address'] ?? ''),
                sanitizeInput($_POST['city'] ?? ''),
                sanitizeInput($_POST['zip_code'] ?? ''),
                sanitizeInput($_POST['location_area'] ?? ''),
                sanitizeInput($_POST['description'] ?? ''),
                sanitizeURL($_POST['facebook_url'] ?? '') ?: null,
                sanitizeURL($_POST['instagram_url'] ?? '') ?: null,
                sanitizeURL($_POST['tiktok_url'] ?? '') ?: null,
                sanitizeURL($_POST['youtube_url'] ?? '') ?: null,
                $showHours,
                $isFeatured,
                $id
            ]);

            // Re-geocode if address fields changed
            $oldBiz = $db->prepare("SELECT address, city, zip_code, lat FROM directory_businesses WHERE id = ?");
            $oldBiz->execute([$id]);
            $oldData = $oldBiz->fetch(PDO::FETCH_ASSOC);
            $newAddress = sanitizeInput($_POST['address'] ?? '');
            $newCity = sanitizeInput($_POST['city'] ?? '');
            $newZip = sanitizeInput($_POST['zip_code'] ?? '');
            if ($newAddress && ($oldData['lat'] === null || $oldData['address'] !== $newAddress || $oldData['city'] !== $newCity || $oldData['zip_code'] !== $newZip)) {
                $coords = geocodeAddress($newAddress, $newCity, 'SC', $newZip);
                if ($coords) {
                    $db->prepare("UPDATE directory_businesses SET lat = ?, lng = ? WHERE id = ?")
                       ->execute([$coords['lat'], $coords['lng'], $id]);
                }
            }

            // Save business hours
            if (isset($_POST['hours'])) {
                $db->prepare("DELETE FROM directory_business_hours WHERE business_id = ?")->execute([$id]);
                $hoursStmt = $db->prepare("INSERT INTO directory_business_hours (business_id, day_of_week, open_time, close_time, is_closed) VALUES (?, ?, ?, ?, ?)");
                foreach ($_POST['hours'] as $dayNum => $dayData) {
                    $isClosed = isset($dayData['closed']) ? 1 : 0;
                    $hoursStmt->execute([
                        $id,
                        (int)$dayNum,
                        $isClosed ? null : ($dayData['open'] ?? null),
                        $isClosed ? null : ($dayData['close'] ?? null),
                        $isClosed
                    ]);
                }
            }

            // Handle gallery photo deletion
            if (!empty($_POST['delete_photos'])) {
                $delStmt = $db->prepare("SELECT id, filename FROM directory_business_photos WHERE id = ? AND business_id = ? AND is_primary = 0");
                $delDel = $db->prepare("DELETE FROM directory_business_photos WHERE id = ?");
                foreach ($_POST['delete_photos'] as $photoId) {
                    $delStmt->execute([(int)$photoId, $id]);
                    $photo = $delStmt->fetch(PDO::FETCH_ASSOC);
                    if ($photo) {
                        $filePath = __DIR__ . '/../uploads/business_photos/' . $photo['filename'];
                        if (file_exists($filePath)) {
                            unlink($filePath);
                        }
                        $delDel->execute([$photo['id']]);
                    }
                }
            }

            // Handle logo upload on edit
            if (!empty($_FILES['logo']['name']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
                $uploadResult = uploadImage($_FILES['logo'], 'business_photos');
                generateImageSizes($uploadResult['path'], UPLOAD_DIR . 'business_photos', $uploadResult['filename']);
                // Remove old primary photo record
                $db->prepare("DELETE FROM directory_business_photos WHERE business_id = ? AND is_primary = 1")->execute([$id]);
                // Insert new
                $photoStmt = $db->prepare("INSERT INTO directory_business_photos (business_id, filename, original_filename, file_size, mime_type, alt_text, is_primary) VALUES (?, ?, ?, ?, ?, ?, 1)");
                $photoStmt->execute([
                    $id,
                    $uploadResult['filename'],
                    $_FILES['logo']['name'],
                    $uploadResult['size'],
                    $uploadResult['mime_type'],
                    $name . ' logo'
                ]);
            }

            // Handle gallery uploads on edit
            if (!empty($_FILES['gallery']['name'][0])) {
                $sortStmt = $db->prepare("SELECT COALESCE(MAX(sort_order), 0) FROM directory_business_photos WHERE business_id = ?");
                $sortStmt->execute([$id]);
                $maxSort = (int)$sortStmt->fetchColumn();
                $galStmt = $db->prepare("INSERT INTO directory_business_photos (business_id, filename, original_filename, file_size, mime_type, alt_text, is_primary, sort_order) VALUES (?, ?, ?, ?, ?, ?, 0, ?)");
                $fileCount = count($_FILES['gallery']['name']);
                for ($i = 0; $i < $fileCount && $i < 6; $i++) {
                    if ($_FILES['gallery']['error'][$i] === UPLOAD_ERR_OK) {
                        $galleryFile = [
                            'name' => $_FILES['gallery']['name'][$i],
                            'type' => $_FILES['gallery']['type'][$i],
                            'tmp_name' => $_FILES['gallery']['tmp_name'][$i],
                            'error' => $_FILES['gallery']['error'][$i],
                            'size' => $_FILES['gallery']['size'][$i],
                        ];
                        $galResult = uploadImage($galleryFile, 'business_photos');
                        generateImageSizes($galResult['path'], UPLOAD_DIR . 'business_photos', $galResult['filename']);
                        $maxSort++;
                        $galStmt->execute([
                            $id,
                            $galResult['filename'],
                            $galleryFile['name'],
                            $galResult['size'],
                            $galResult['mime_type'],
                            $name . ' gallery photo',
                            $maxSort
                        ]);
                    }
                }
            }

            // Handle banner upload on edit
            if (!empty($_FILES['banner']['name']) && $_FILES['banner']['error'] === UPLOAD_ERR_OK) {
                $bannerResult = uploadImage($_FILES['banner'], 'business_photos');
                generateImageSizes($bannerResult['path'], UPLOAD_DIR . 'business_photos', $bannerResult['filename']);
                // Remove old banner photo record
                $db->prepare("DELETE FROM directory_business_photos WHERE business_id = ? AND photo_type = 'banner'")->execute([$id]);
                $bannerStmt = $db->prepare("INSERT INTO directory_business_photos (business_id, filename, original_filename, file_size, mime_type, alt_text, is_primary, photo_type) VALUES (?, ?, ?, ?, ?, ?, 0, 'banner')");
                $bannerStmt->execute([
                    $id,
                    $bannerResult['filename'],
                    $_FILES['banner']['name'],
                    $bannerResult['size'],
                    $bannerResult['mime_type'],
                    $name . ' banner'
                ]);
            }

            // Handle banner deletion
            if (!empty($_POST['delete_banner'])) {
                $delBanner = $db->prepare("SELECT id, filename FROM directory_business_photos WHERE business_id = ? AND photo_type = 'banner' LIMIT 1");
                $delBanner->execute([$id]);
                $bannerRec = $delBanner->fetch(PDO::FETCH_ASSOC);
                if ($bannerRec) {
                    $bannerPath = __DIR__ . '/../uploads/business_photos/' . $bannerRec['filename'];
                    if (file_exists($bannerPath)) unlink($bannerPath);
                    $db->prepare("DELETE FROM directory_business_photos WHERE id = ?")->execute([$bannerRec['id']]);
                }
            }

            // Save tags
            saveBusinessTags($id, $_POST['tags'] ?? []);

            header('Location: manage_directory.php?message=updated');
            exit();

        } elseif ($action === 'delete') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id) {
                $stmt = $db->prepare("DELETE FROM directory_businesses WHERE id = ?");
                $stmt->execute([$id]);
            }
            header('Location: manage_directory.php?message=deleted');
            exit();

        } elseif ($action === 'toggle_hidden') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id) {
                $stmt = $db->prepare("UPDATE directory_businesses SET is_hidden = NOT is_hidden, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$id]);
            }
            header('Location: manage_directory.php?message=toggled');
            exit();

        } elseif ($action === 'toggle_active') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id) {
                $stmt = $db->prepare("UPDATE directory_businesses SET is_active = NOT is_active, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$id]);
            }
            header('Location: manage_directory.php?message=toggled');
            exit();

        } elseif ($action === 'toggle_featured') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id) {
                $stmt = $db->prepare("UPDATE directory_businesses SET is_featured = NOT is_featured, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$id]);
            }
            header('Location: manage_directory.php?message=toggled');
            exit();

        } elseif ($action === 'approve') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id) {
                // Get business and owner info before updating
                $bizStmt = $db->prepare("SELECT b.business_name, b.slug, u.email, u.first_name FROM directory_businesses b LEFT JOIN directory_users u ON b.user_id = u.id WHERE b.id = ?");
                $bizStmt->execute([$id]);
                $bizInfo = $bizStmt->fetch(PDO::FETCH_ASSOC);

                $stmt = $db->prepare("UPDATE directory_businesses SET is_verified = 1, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$id]);

                // Send approval email
                if ($bizInfo && !empty($bizInfo['email'])) {
                    try {
                        $body = "Hi " . ($bizInfo['first_name'] ?? '') . ",\n\n";
                        $body .= "Great news! Your business listing for \"" . $bizInfo['business_name'] . "\" has been approved and is now live in the " . SITE_NAME . " directory.\n\n";
                        $body .= "View your listing here:\n";
                        $body .= SITE_URL . "/business/" . $bizInfo['slug'] . "/\n\n";
                        $body .= "You can manage your listing from your dashboard:\n";
                        $body .= SITE_URL . "/dashboard.php\n\n";
                        $body .= "Tips to get the most from your listing:\n";
                        $body .= "- Share your listing link on social media\n";
                        $body .= "- Ask happy customers to check out your page\n";
                        $body .= "- Upgrade to add photos, hours, and special offers\n\n";
                        $body .= "Welcome to the Lowcountry Business Spotlight!\n";
                        $body .= "- The LBS Team\n";
                        $body .= "(843) 212-2969 | " . ADMIN_EMAIL;
                        sendSecureEmail($bizInfo['email'], 'Your Listing is Live: ' . $bizInfo['business_name'], $body, ADMIN_EMAIL);
                    } catch (Exception $e) {
                        error_log("Approval email error: " . $e->getMessage());
                    }
                }
            }
            header('Location: manage_directory.php?message=approved');
            exit();

        } elseif ($action === 'deny') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id) {
                // Get business and owner info before removing
                $bizStmt = $db->prepare("SELECT b.business_name, u.email, u.first_name FROM directory_businesses b LEFT JOIN directory_users u ON b.user_id = u.id WHERE b.id = ?");
                $bizStmt->execute([$id]);
                $bizInfo = $bizStmt->fetch(PDO::FETCH_ASSOC);

                // Deactivate the listing (don't delete — owner may want to fix and resubmit)
                $stmt = $db->prepare("UPDATE directory_businesses SET is_active = 0, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$id]);

                // Send denial email
                if ($bizInfo && !empty($bizInfo['email'])) {
                    try {
                        $body = "Hi " . ($bizInfo['first_name'] ?? '') . ",\n\n";
                        $body .= "Thank you for submitting your business listing for \"" . $bizInfo['business_name'] . "\" to " . SITE_NAME . ".\n\n";
                        $body .= "Unfortunately, we were unable to approve your listing at this time. This may be due to incomplete information, duplicate listings, or content that doesn't meet our guidelines.\n\n";
                        $body .= "If you'd like to update your listing and resubmit, please log in to your dashboard:\n";
                        $body .= SITE_URL . "/dashboard.php\n\n";
                        $body .= "If you have questions, feel free to reach out — we're happy to help.\n\n";
                        $body .= "- The LBS Team\n";
                        $body .= "(843) 212-2969 | " . ADMIN_EMAIL;
                        sendSecureEmail($bizInfo['email'], 'Listing Update: ' . $bizInfo['business_name'], $body, ADMIN_EMAIL);
                    } catch (Exception $e) {
                        error_log("Denial email error: " . $e->getMessage());
                    }
                }
            }
            header('Location: manage_directory.php?message=denied');
            exit();

        } elseif ($action === 'bulk') {
            $ids = array_map('intval', $_POST['ids'] ?? []);
            $bulkAction = $_POST['bulk_action'] ?? '';
            $ids = array_filter($ids, fn($id) => $id > 0);

            if (!empty($ids) && $bulkAction) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                switch ($bulkAction) {
                    case 'approve':
                        // Get owner info for emails before updating
                        $emailStmt = $db->prepare("SELECT b.id, b.business_name, b.slug, u.email, u.first_name FROM directory_businesses b LEFT JOIN directory_users u ON b.user_id = u.id WHERE b.id IN ($placeholders) AND b.is_verified = 0");
                        $emailStmt->execute($ids);
                        $toNotify = $emailStmt->fetchAll(PDO::FETCH_ASSOC);

                        $db->prepare("UPDATE directory_businesses SET is_verified = 1, updated_at = NOW() WHERE id IN ($placeholders)")->execute($ids);

                        // Send approval emails
                        foreach ($toNotify as $bizInfo) {
                            if (empty($bizInfo['email'])) continue;
                            try {
                                $body = "Hi " . ($bizInfo['first_name'] ?? '') . ",\n\n";
                                $body .= "Great news! Your business listing for \"" . $bizInfo['business_name'] . "\" has been approved and is now live in the " . SITE_NAME . " directory.\n\n";
                                $body .= "View your listing: " . SITE_URL . "/business/" . $bizInfo['slug'] . "/\n";
                                $body .= "Manage your listing: " . SITE_URL . "/dashboard.php\n\n";
                                $body .= "Welcome to the Lowcountry Business Spotlight!\n";
                                $body .= "- The LBS Team\n(843) 212-2969 | " . ADMIN_EMAIL;
                                sendSecureEmail($bizInfo['email'], 'Your Listing is Live: ' . $bizInfo['business_name'], $body, ADMIN_EMAIL);
                            } catch (Exception $e) {
                                error_log("Bulk approval email error: " . $e->getMessage());
                            }
                        }
                        break;
                    case 'activate':
                        $db->prepare("UPDATE directory_businesses SET is_active = 1, updated_at = NOW() WHERE id IN ($placeholders)")->execute($ids);
                        break;
                    case 'deactivate':
                        $db->prepare("UPDATE directory_businesses SET is_active = 0, updated_at = NOW() WHERE id IN ($placeholders)")->execute($ids);
                        break;
                    case 'hide':
                        $db->prepare("UPDATE directory_businesses SET is_hidden = 1, updated_at = NOW() WHERE id IN ($placeholders)")->execute($ids);
                        break;
                    case 'unhide':
                        $db->prepare("UPDATE directory_businesses SET is_hidden = 0, updated_at = NOW() WHERE id IN ($placeholders)")->execute($ids);
                        break;
                    case 'delete':
                        $db->prepare("DELETE FROM directory_businesses WHERE id IN ($placeholders)")->execute($ids);
                        break;
                }
            }
            header('Location: manage_directory.php?message=bulk_updated');
            exit();

        } elseif ($action === 'csv_upload') {
            if (empty($_FILES['csv_file']['name']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('Please select a CSV file to upload.');
            }

            $csvExt = strtolower(pathinfo($_FILES['csv_file']['name'], PATHINFO_EXTENSION));
            if ($csvExt !== 'csv') {
                throw new Exception('Invalid file type. Please upload a .csv file.');
            }

            $handle = fopen($_FILES['csv_file']['tmp_name'], 'r');
            if (!$handle) throw new Exception('Could not read CSV file.');

            $header = fgetcsv($handle);
            if (!$header) {
                fclose($handle);
                throw new Exception('CSV file is empty.');
            }

            // Normalize headers
            $header = array_map(function($h) { return strtolower(trim($h)); }, $header);
            $nameIdx = array_search('business_name', $header);
            if ($nameIdx === false) {
                fclose($handle);
                throw new Exception('CSV must have a "business_name" column.');
            }

            $colMap = [
                'category' => array_search('category', $header),
                'location_area' => array_search('location_area', $header),
                'phone' => array_search('phone', $header),
                'email' => array_search('email', $header),
                'website' => array_search('website', $header),
                'address' => array_search('address', $header),
                'city' => array_search('city', $header),
                'zip_code' => array_search('zip_code', $header),
                'description' => array_search('description', $header),
            ];

            $imported = 0;
            $skipped = [];
            $rowNum = 1;

            $insertStmt = $db->prepare("INSERT INTO directory_businesses
                (business_name, slug, category, phone, email, website, address, city, state, zip_code, location_area, description, is_active, is_verified, is_hidden, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SC', ?, ?, ?, 1, 1, 0, NOW())");
            $dupCheckStmt = $db->prepare("SELECT id FROM directory_businesses WHERE business_name = ?");

            while (($row = fgetcsv($handle)) !== false) {
                $rowNum++;
                $bizName = trim($row[$nameIdx] ?? '');
                if (empty($bizName)) {
                    $skipped[] = "Row {$rowNum}: Missing business name";
                    continue;
                }

                $bizName = sanitizeInput($bizName);

                // Check for duplicate business name
                $dupCheckStmt->execute([$bizName]);
                if ($dupCheckStmt->fetchColumn()) {
                    $skipped[] = "Row {$rowNum} ({$bizName}): Duplicate business name — skipped.";
                    continue;
                }
                $slug = generateSlug($bizName);
                $check = $db->prepare("SELECT COUNT(*) FROM directory_businesses WHERE slug = ?");
                $check->execute([$slug]);
                if ($check->fetchColumn() > 0) {
                    $slug .= '-' . time() . '-' . $rowNum;
                }

                $getCol = function($key) use ($colMap, $row) {
                    $idx = $colMap[$key];
                    return ($idx !== false && isset($row[$idx])) ? trim($row[$idx]) : '';
                };

                try {
                    $insertStmt->execute([
                        $bizName,
                        $slug,
                        sanitizeInput($getCol('category')),
                        sanitizePhone($getCol('phone')),
                        sanitizeEmail($getCol('email')) ?: '',
                        sanitizeURL($getCol('website')) ?: '',
                        sanitizeInput($getCol('address')),
                        sanitizeInput($getCol('city')),
                        sanitizeInput($getCol('zip_code')),
                        sanitizeInput($getCol('location_area')),
                        sanitizeInput($getCol('description'))
                    ]);
                    $imported++;
                } catch (Exception $rowEx) {
                    $skipped[] = "Row {$rowNum} ({$bizName}): " . $rowEx->getMessage();
                }
            }
            fclose($handle);

            $csv_results = ['imported' => $imported, 'skipped' => $skipped];
        }

    } catch (Exception $e) {
        if ($e->getMessage() !== '') {
            $error_message = $e->getMessage();
        }
    }
}

// Determine view mode
$view = $_GET['view'] ?? 'list';
$editId = (int)($_GET['edit'] ?? 0);
$editBiz = null;
$editBizLogo = null;

$editBizHours = [];
$editBizPhotos = [];
$editBizBanner = null;
if ($editId) {
    $stmt = $db->prepare("SELECT * FROM directory_businesses WHERE id = ?");
    $stmt->execute([$editId]);
    $editBiz = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($editBiz) {
        $view = 'edit';
        $editBizLogo = getBusinessLogo($db, $editId);
        // Load banner photo
        $bStmt = $db->prepare("SELECT filename FROM directory_business_photos WHERE business_id = ? AND photo_type = 'banner' LIMIT 1");
        $bStmt->execute([$editId]);
        $editBizBanner = $bStmt->fetchColumn() ?: null;
        // Load existing hours
        $hStmt = $db->prepare("SELECT day_of_week, open_time, close_time, is_closed FROM directory_business_hours WHERE business_id = ? ORDER BY day_of_week");
        $hStmt->execute([$editId]);
        foreach ($hStmt->fetchAll(PDO::FETCH_ASSOC) as $h) {
            $editBizHours[(int)$h['day_of_week']] = $h;
        }
        // Load existing tags
        $editBizTags = getBusinessTags($editId);
        $editBizTagSlugs = array_column($editBizTags, 'slug');
        // Load gallery photos (non-primary)
        $pStmt = $db->prepare("SELECT id, filename, alt_text FROM directory_business_photos WHERE business_id = ? AND is_primary = 0 ORDER BY sort_order ASC");
        $pStmt->execute([$editId]);
        $editBizPhotos = $pStmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

// Load all businesses (filtering is done client-side)
$sql = "SELECT * FROM directory_businesses ORDER BY created_at DESC";
$businesses = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

$totalCount   = count($businesses);
$pendingCount = count(array_filter($businesses, fn($b) => !$b['is_verified']));
$activeCount  = count(array_filter($businesses, fn($b) => $b['is_verified'] && $b['is_active'] && !$b['is_hidden']));
$hiddenCount  = count(array_filter($businesses, fn($b) => $b['is_hidden']));

// Analytics
$dirAnalytics = [];
$dirAnalytics['total_views'] = (int)$db->query("SELECT COALESCE(SUM(views_count), 0) FROM " . getTable('businesses'))->fetchColumn();
$dirAnalytics['total_inquiries'] = (int)$db->query("SELECT COALESCE(SUM(inquiries_count), 0) FROM " . getTable('businesses'))->fetchColumn();
$dirAnalytics['views_7d'] = (int)$db->query("SELECT COALESCE(SUM(views_count), 0) FROM " . getTable('business_analytics') . " WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)")->fetchColumn();
$dirAnalytics['inquiries_7d'] = (int)$db->query("SELECT COALESCE(SUM(inquiries_count), 0) FROM " . getTable('business_analytics') . " WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)")->fetchColumn();
$topByViews = $db->query("SELECT id, business_name, slug, views_count, inquiries_count FROM " . getTable('businesses') . " WHERE is_active = 1 ORDER BY views_count DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
$topByInquiries = $db->query("SELECT id, business_name, slug, views_count, inquiries_count FROM " . getTable('businesses') . " WHERE is_active = 1 AND inquiries_count > 0 ORDER BY inquiries_count DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);

$success_message = '';
if (isset($_GET['message'])) {
    $msgs = [
        'added' => 'Business added successfully.',
        'updated' => 'Business updated successfully.',
        'deleted' => 'Business deleted successfully.',
        'toggled' => 'Business status updated.',
        'imported' => 'CSV import completed.',
        'bulk_updated' => 'Bulk action applied successfully.',
        'geocoded' => 'Batch geocoding complete. ' . ((int)($_GET['count'] ?? 0)) . ' businesses geocoded.',
        'inquiries_synced' => 'Inquiry counts synced from inquiry records.'
    ];
    $success_message = $msgs[$_GET['message']] ?? '';
}

// If duplicate warning, force view to 'add'
if ($duplicate_warning) {
    $view = 'add';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Directory | <?php echo SITE_NAME; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #334155; }
        .navbar { background: linear-gradient(135deg, #1f2937, #111827); color: white; padding: 1rem 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .navbar .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; }
        .navbar-brand { font-size: 1.5rem; font-weight: 800; text-decoration: none; color: white; }
        .navbar-nav { display: flex; align-items: center; gap: 1rem; }
        .nav-link { color: white; text-decoration: none; font-weight: 500; padding: .5rem 1rem; border-radius: 8px; transition: background-color .3s ease; }
        .nav-link:hover { background-color: rgba(255,255,255,.1); }
        .container { max-width: 1400px; margin: 0 auto; padding: 0 20px; }
        .main-content { padding: 2rem 0; }

        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .page-title { font-size: 1.75rem; font-weight: 700; color: #1e293b; }
        .page-header-actions { display: flex; gap: .75rem; flex-wrap: wrap; }

        .btn { padding: .75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all .3s ease; border: none; cursor: pointer; display: inline-block; font-size: .875rem; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(56,182,255,.4); }
        .btn-success { background: #10b981; color: white; }
        .btn-warning { background: #f59e0b; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-secondary { background: #64748b; color: white; }
        .btn-sm { padding: .375rem .75rem; font-size: .75rem; }

        .alert { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #d1fae5; border: 1px solid #10b981; color: #065f46; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
        .alert-info { background: #dbeafe; border: 1px solid #3b82f6; color: #1e40af; }

        /* Table */
        .table-wrapper { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: .9rem; }
        th { background: #f8fafc; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: .75rem; letter-spacing: .05em; white-space: nowrap; }
        tr:hover { background: #f8fafc; }
        .status-active { color: #10b981; font-weight: 600; }
        .status-hidden { color: #f59e0b; font-weight: 600; }
        .status-inactive { color: #ef4444; font-weight: 600; }
        .status-pending { color: #c2410c; font-weight: 600; }
        .actions-cell { white-space: nowrap; display: flex; gap: .375rem; align-items: center; }

        .biz-name-cell { display: flex; align-items: center; gap: .75rem; }
        .biz-logo-thumb { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; border: 1px solid #e2e8f0; flex-shrink: 0; }
        .biz-logo-placeholder { width: 36px; height: 36px; border-radius: 6px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: .75rem; flex-shrink: 0; }

        /* Form */
        .form-card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; max-width: 800px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .form-group { display: flex; flex-direction: column; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label { font-weight: 600; margin-bottom: 6px; color: #334155; font-size: .875rem; }
        .form-group input, .form-group select, .form-group textarea {
            padding: 10px 12px; border: 2px solid #e2e8f0; border-radius: 8px;
            font-size: .95rem; font-family: inherit; transition: border-color .2s;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #38b6ff; }
        .form-group textarea { resize: vertical; min-height: 100px; }
        .form-actions { margin-top: 1.5rem; display: flex; gap: .75rem; }

        .current-logo { margin-top: 8px; }
        .current-logo img { max-width: 120px; max-height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .current-logo-label { font-size: .8rem; color: #64748b; margin-top: 4px; }

        .empty-state { text-align: center; padding: 3rem; color: #64748b; background: white; border-radius: 12px; border: 1px solid #e2e8f0; }
        .empty-state-icon { font-size: 3rem; margin-bottom: .75rem; }

        .stats-bar { display: flex; gap: 2rem; margin-bottom: 2rem; padding: 1rem 1.5rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0; flex-wrap: wrap; }
        .stat-item { display: flex; align-items: center; gap: .5rem; }
        .stat-number { font-size: 1.5rem; font-weight: 700; color: #38b6ff; }
        .stat-label { color: #64748b; font-size: .875rem; }

        /* CSV Upload */
        .upload-card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; max-width: 700px; }
        .upload-zone { border: 2px dashed #cbd5e1; border-radius: 12px; padding: 2rem; text-align: center; margin: 1.5rem 0; transition: border-color .2s; }
        .upload-zone:hover { border-color: #38b6ff; }
        .upload-zone input[type="file"] { margin-top: .75rem; }
        .csv-results { margin-top: 1.5rem; }
        .csv-results .skipped-list { margin-top: .75rem; max-height: 200px; overflow-y: auto; background: #fef2f2; border-radius: 8px; padding: 1rem; font-size: .85rem; }
        .csv-results .skipped-list li { margin-bottom: .25rem; color: #991b1b; }
        .csv-instructions { font-size: .875rem; color: #64748b; line-height: 1.6; }
        .csv-instructions code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: .8rem; }

        /* Filter bar */
        .filter-bar { display: flex; gap: .75rem; margin-bottom: 1.5rem; padding: 1rem 1.5rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0; flex-wrap: wrap; align-items: center; }
        .filter-bar input[type="text"], .filter-bar select { padding: 8px 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: .875rem; font-family: inherit; }
        .filter-bar input[type="text"]:focus, .filter-bar select:focus { outline: none; border-color: #38b6ff; }
        .filter-bar input[type="text"] { min-width: 200px; }
        .filter-bar select { min-width: 140px; }
        .filter-bar .btn { padding: .5rem 1rem; }
        .clear-filters { color: #64748b; text-decoration: none; font-size: .875rem; font-weight: 500; }
        .clear-filters:hover { color: #334155; }

        /* Bulk action bar */
        .bulk-bar { display: flex; gap: .75rem; margin-bottom: 1rem; padding: .75rem 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; align-items: center; }
        .bulk-bar select { padding: 6px 10px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: .85rem; font-family: inherit; }
        .bulk-bar .btn { padding: .4rem .75rem; font-size: .8rem; }
        .bulk-bar label { font-size: .85rem; color: #64748b; font-weight: 500; }

        /* Checkbox column */
        .cb-col { width: 40px; text-align: center; }
        .cb-col input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: #38b6ff; }

        /* Tag chips */
        .tag-chip {
            display: inline-block; padding: 6px 14px; border-radius: 20px;
            font-size: .8rem; font-weight: 600; cursor: pointer; user-select: none;
            background: #e2e8f0; color: #475569; border: 2px solid transparent;
            transition: all .15s ease;
        }
        .tag-chip:hover { background: #cbd5e1; }
        .tag-chip.active { background: #dbeafe; color: #1d4ed8; border-color: #60a5fa; }
        .tag-chip.hidden-tag { display: none; }

        @media (max-width: 768px) {
            .form-grid { grid-template-columns: 1fr; }
            .page-header { flex-direction: column; align-items: flex-start; }
            .navbar .container { flex-direction: column; gap: 1rem; }
            .navbar-nav { flex-wrap: wrap; justify-content: center; }
            .actions-cell { flex-wrap: wrap; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'directory'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="main-content">
            <?php if ($success_message): ?>
                <div class="alert alert-success"><?php echo $success_message; ?></div>
            <?php endif; ?>
            <?php if (isset($error_message)): ?>
                <div class="alert alert-danger"><?php echo htmlspecialchars($error_message); ?></div>
            <?php endif; ?>

<?php if ($view === 'upload'): ?>
            <!-- CSV BULK UPLOAD VIEW -->
            <div class="page-header">
                <h1 class="page-title">Bulk Import CSV</h1>
                <a href="manage_directory.php" class="btn btn-secondary">Back to List</a>
            </div>

            <?php if ($csv_results): ?>
                <div class="csv-results">
                    <div class="alert alert-success">
                        Successfully imported <strong><?= (int)$csv_results['imported'] ?></strong> business<?= $csv_results['imported'] !== 1 ? 'es' : '' ?>.
                        <?php if (!empty($csv_results['skipped'])): ?>
                            <strong><?= count($csv_results['skipped']) ?></strong> row<?= count($csv_results['skipped']) !== 1 ? 's' : '' ?> skipped.
                        <?php endif; ?>
                    </div>
                    <?php if (!empty($csv_results['skipped'])): ?>
                        <div class="skipped-list">
                            <strong>Skipped rows:</strong>
                            <ul>
                                <?php foreach ($csv_results['skipped'] as $skip): ?>
                                    <li><?= htmlspecialchars($skip) ?></li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endif; ?>

            <div class="upload-card">
                <h3 style="margin-bottom: .5rem;">Upload CSV File</h3>
                <div class="csv-instructions">
                    <p>Your CSV file should include the following columns:</p>
                    <p style="margin-top: .5rem;">
                        <code>business_name</code>, <code>category</code>, <code>location_area</code>,
                        <code>phone</code>, <code>email</code>, <code>website</code>,
                        <code>address</code>, <code>city</code>, <code>zip_code</code>, <code>description</code>
                    </p>
                    <p style="margin-top: .5rem;">Only <code>business_name</code> is required. Rows missing it will be skipped.</p>
                    <p style="margin-top: .75rem;">
                        <a href="manage_directory.php?download_template=1" class="btn btn-secondary btn-sm">Download Template CSV</a>
                        <a href="manage_directory.php?batch_geocode=1" class="btn btn-secondary btn-sm" style="margin-left: 8px;" onclick="return confirm('Geocode all businesses with missing coordinates? This may take a moment.')">Batch Geocode Addresses</a>
                    </p>
                </div>

                <form method="POST" enctype="multipart/form-data">
                    <input type="hidden" name="action" value="csv_upload">
                    <div class="upload-zone">
                        <p style="font-weight: 600; color: #334155;">Select your CSV file</p>
                        <p style="font-size: .85rem; color: #64748b;">CSV format, max 500 rows recommended</p>
                        <input type="file" name="csv_file" accept=".csv,text/csv" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Import Businesses</button>
                </form>
            </div>

<?php elseif ($view === 'add' || $view === 'edit'): ?>
            <!-- ADD / EDIT FORM -->
            <div class="page-header">
                <h1 class="page-title"><?= $editBiz ? 'Edit Business' : 'Add Business' ?></h1>
                <a href="manage_directory.php" class="btn btn-secondary">Back to List</a>
            </div>

            <?php if ($duplicate_warning): ?>
                <div class="alert alert-danger" style="max-width: 800px;">
                    A business named "<strong><?= htmlspecialchars($duplicate_warning) ?></strong>" already exists. Submit again to add anyway.
                </div>
            <?php endif; ?>

            <div class="form-card">
                <form method="POST" enctype="multipart/form-data">
                    <input type="hidden" name="action" value="<?= $editBiz ? 'edit' : 'add' ?>">
                    <?php if ($editBiz): ?>
                        <input type="hidden" name="id" value="<?= (int)$editBiz['id'] ?>">
                    <?php endif; ?>
                    <?php if ($duplicate_warning): ?>
                        <input type="hidden" name="confirm_duplicate" value="1">
                    <?php endif; ?>

                    <?php
                        // Use prefill data (from duplicate warning redirect) or editBiz data
                        $f = $editBiz ?: $prefill;
                    ?>
                    <div class="form-grid">
                        <div class="form-group full-width">
                            <label for="business_name">Business Name *</label>
                            <input type="text" id="business_name" name="business_name" required
                                   value="<?= htmlspecialchars($f['business_name'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="category">Category</label>
                            <select id="category" name="category">
                                <option value="">Select Category</option>
                                <?php foreach ($categories as $key => $catName): ?>
                                    <option value="<?= $key ?>" <?= ($f['category'] ?? '') === $key ? 'selected' : '' ?>><?= htmlspecialchars($catName) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="location_area">Location Area</label>
                            <select id="location_area" name="location_area">
                                <option value="">Select Area</option>
                                <?php
                                    $currentLoc = $f['location_area'] ?? '';
                                    $locFound = false;
                                    foreach ($locations as $key => $locName):
                                        if ($currentLoc === $key) $locFound = true;
                                ?>
                                    <option value="<?= $key ?>" <?= $currentLoc === $key ? 'selected' : '' ?>><?= htmlspecialchars($locName) ?></option>
                                <?php endforeach; ?>
                                <?php if ($currentLoc !== '' && !$locFound): ?>
                                    <option value="<?= htmlspecialchars($currentLoc) ?>" selected><?= htmlspecialchars(ucwords(str_replace('-', ' ', $currentLoc))) ?></option>
                                <?php endif; ?>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="phone">Phone</label>
                            <input type="tel" id="phone" name="phone"
                                   value="<?= htmlspecialchars($f['phone'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email"
                                   value="<?= htmlspecialchars($f['email'] ?? '') ?>">
                        </div>
                        <div class="form-group full-width">
                            <label for="website">Website</label>
                            <input type="url" id="website" name="website" placeholder="https://..."
                                   value="<?= htmlspecialchars($f['website'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="facebook_url">Facebook URL</label>
                            <input type="url" id="facebook_url" name="facebook_url" placeholder="https://facebook.com/..."
                                   value="<?= htmlspecialchars($f['facebook_url'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="instagram_url">Instagram URL</label>
                            <input type="url" id="instagram_url" name="instagram_url" placeholder="https://instagram.com/..."
                                   value="<?= htmlspecialchars($f['instagram_url'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="tiktok_url">TikTok URL</label>
                            <input type="url" id="tiktok_url" name="tiktok_url" placeholder="https://tiktok.com/@..."
                                   value="<?= htmlspecialchars($f['tiktok_url'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="youtube_url">YouTube URL</label>
                            <input type="url" id="youtube_url" name="youtube_url" placeholder="https://youtube.com/..."
                                   value="<?= htmlspecialchars($f['youtube_url'] ?? '') ?>">
                        </div>
                        <div class="form-group full-width">
                            <label for="address">Street Address</label>
                            <input type="text" id="address" name="address"
                                   value="<?= htmlspecialchars($f['address'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="city">City</label>
                            <input type="text" id="city" name="city"
                                   value="<?= htmlspecialchars($f['city'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="zip_code">Zip Code</label>
                            <input type="text" id="zip_code" name="zip_code"
                                   value="<?= htmlspecialchars($f['zip_code'] ?? '') ?>">
                        </div>
                        <div class="form-group full-width">
                            <label for="description">Description</label>
                            <textarea id="description" name="description"><?= htmlspecialchars($f['description'] ?? '') ?></textarea>
                        </div>
                        <div class="form-group full-width">
                            <label>Tags <small style="font-weight:400; color:#64748b;">(click to toggle)</small></label>
                            <div id="tag-chips" style="display:flex; flex-wrap:wrap; gap:8px; padding:12px; background:#f8fafc; border:2px solid #e2e8f0; border-radius:8px; min-height:48px;">
                                <?php
                                $selectedTags = $editBizTagSlugs ?? ($f['tags'] ?? []);
                                $grouped = [];
                                foreach ($allTags as $t) {
                                    $g = $t['category_slug'] ?: '__cross__';
                                    $grouped[$g][] = $t;
                                }
                                foreach ($grouped as $gSlug => $gTags):
                                    foreach ($gTags as $t):
                                        $isSelected = in_array($t['slug'], $selectedTags);
                                ?>
                                    <label class="tag-chip <?= $isSelected ? 'active' : '' ?>"
                                           data-category="<?= htmlspecialchars($t['category_slug'] ?? '') ?>">
                                        <input type="checkbox" name="tags[]"
                                               value="<?= htmlspecialchars($t['slug']) ?>"
                                               <?= $isSelected ? 'checked' : '' ?>
                                               style="display:none;">
                                        <?= htmlspecialchars($t['display_name']) ?>
                                    </label>
                                <?php
                                    endforeach;
                                endforeach;
                                ?>
                            </div>
                        </div>
                        <div class="form-group full-width">
                            <label for="logo">Business Logo</label>
                            <input type="file" id="logo" name="logo" accept="image/jpeg,image/png,image/webp">
                            <?php if ($editBiz && $editBizLogo): ?>
                                <div class="current-logo">
                                    <img src="../uploads/business_photos/<?= htmlspecialchars($editBizLogo) ?>" alt="Current logo">
                                    <div class="current-logo-label">Current logo - upload a new file to replace</div>
                                </div>
                            <?php endif; ?>
                        </div>

                        <!-- Banner Photo -->
                        <div class="form-group full-width">
                            <label for="banner">Banner Photo <span style="font-weight:normal;color:#64748b;">(wide image, recommended 1200x400, JPG/PNG/WebP)</span></label>
                            <input type="file" id="banner" name="banner" accept="image/jpeg,image/png,image/webp">
                            <?php if ($editBiz && $editBizBanner): ?>
                                <div style="margin-top:8px; position:relative; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#f8fafc;">
                                    <img src="../uploads/business_photos/<?= htmlspecialchars($editBizBanner) ?>" alt="Current banner" style="width:100%; height:120px; object-fit:cover; display:block;">
                                    <label style="display:flex; align-items:center; gap:4px; padding:6px 8px; font-size:0.8rem; cursor:pointer; color:#dc2626;">
                                        <input type="checkbox" name="delete_banner" value="1">
                                        Delete banner
                                    </label>
                                </div>
                            <?php endif; ?>
                        </div>

                        <!-- Gallery Photos -->
                        <div class="form-group full-width">
                            <label>Gallery Photos <span style="font-weight:normal;color:#64748b;">(up to 6, JPG/PNG/WebP, max 5MB each)</span></label>
                            <?php if ($editBiz && !empty($editBizPhotos)): ?>
                                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(120px,1fr)); gap:12px; margin-bottom:12px;">
                                    <?php foreach ($editBizPhotos as $gp): ?>
                                        <div style="position:relative; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#f8fafc;">
                                            <img src="../uploads/business_photos/<?= htmlspecialchars($gp['filename']) ?>" alt="<?= htmlspecialchars($gp['alt_text'] ?? '') ?>" style="width:100%; height:100px; object-fit:cover; display:block;">
                                            <label style="display:flex; align-items:center; gap:4px; padding:6px 8px; font-size:0.8rem; cursor:pointer; color:#dc2626;">
                                                <input type="checkbox" name="delete_photos[]" value="<?= (int)$gp['id'] ?>">
                                                Delete
                                            </label>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                            <input type="file" id="gallery" name="gallery[]" multiple accept="image/jpeg,image/png,image/webp">
                            <div id="gallery-preview" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(120px,1fr)); gap:12px; margin-top:12px;"></div>
                        </div>
                    </div>

                    <?php if ($editBiz): ?>
                    <!-- Featured Placement -->
                    <div style="margin-top: 24px; padding: 20px; background: <?= !empty($editBiz['is_featured']) ? '#fffbeb' : '#f8fafc' ?>; border-radius: 8px; border: 1px solid <?= !empty($editBiz['is_featured']) ? '#fde68a' : '#e2e8f0' ?>;">
                        <div class="form-group" style="margin: 0;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" name="is_featured" value="1" <?= !empty($editBiz['is_featured']) ? 'checked' : '' ?>>
                                <strong>&#9733; Featured Listing</strong>
                                <span style="font-size: 0.85rem; color: #64748b;">- Appears in the Featured section at the top of the directory</span>
                            </label>
                        </div>
                    </div>

                    <!-- Business Hours -->
                    <div style="margin-top: 24px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <h3 style="margin-bottom: 16px; font-size: 1.1rem; color: #1e293b;">Business Hours</h3>
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" name="show_hours" value="1" <?= !empty($editBiz['show_hours']) ? 'checked' : '' ?>>
                                <strong>Show Hours on Public Listing</strong>
                            </label>
                        </div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="text-align: left;">
                                    <th style="padding: 8px;">Day</th>
                                    <th style="padding: 8px;">Open</th>
                                    <th style="padding: 8px;">Close</th>
                                    <th style="padding: 8px;">Closed</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                $dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                                for ($d = 0; $d < 7; $d++):
                                    $h = $editBizHours[$d] ?? null;
                                    $isClosed = $h ? (int)$h['is_closed'] : 1;
                                    $openTime = $h['open_time'] ?? '';
                                    $closeTime = $h['close_time'] ?? '';
                                ?>
                                <tr>
                                    <td style="padding: 8px; font-weight: 600;"><?= $dayNames[$d] ?></td>
                                    <td style="padding: 8px;"><input type="time" name="hours[<?= $d ?>][open]" value="<?= htmlspecialchars($openTime) ?>" style="padding: 4px 8px;"></td>
                                    <td style="padding: 8px;"><input type="time" name="hours[<?= $d ?>][close]" value="<?= htmlspecialchars($closeTime) ?>" style="padding: 4px 8px;"></td>
                                    <td style="padding: 8px; text-align: center;"><input type="checkbox" name="hours[<?= $d ?>][closed]" value="1" <?= $isClosed ? 'checked' : '' ?>></td>
                                </tr>
                                <?php endfor; ?>
                            </tbody>
                        </table>
                    </div>
                    <?php endif; ?>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary"><?= $editBiz ? 'Update Business' : 'Add Business' ?></button>
                        <a href="manage_directory.php" class="btn btn-secondary">Cancel</a>
                    </div>
                </form>
            </div>

<?php else: ?>
            <!-- LIST VIEW -->
            <div class="page-header">
                <h1 class="page-title">Manage Directory</h1>
                <div class="page-header-actions">
                    <a href="manage_directory.php?view=upload" class="btn btn-success">Bulk Import CSV</a>
                    <a href="manage_directory.php?view=add" class="btn btn-primary">+ Add Business</a>
                </div>
            </div>

            <div class="stats-bar">
                <div class="stat-item">
                    <span class="stat-number"><?= $totalCount ?></span>
                    <span class="stat-label">Total Businesses</span>
                </div>
                <?php if ($pendingCount > 0): ?>
                <div class="stat-item" style="cursor:pointer;" onclick="document.getElementById('filterStatus').value='pending';document.getElementById('filterStatus').dispatchEvent(new Event('change'));">
                    <span class="stat-number" style="color:#c2410c;"><?= $pendingCount ?></span>
                    <span class="stat-label">Pending Review</span>
                </div>
                <?php endif; ?>
                <div class="stat-item">
                    <span class="stat-number"><?= $activeCount ?></span>
                    <span class="stat-label">Active</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number"><?= $hiddenCount ?></span>
                    <span class="stat-label">Hidden</span>
                </div>
            </div>

            <!-- Analytics Summary -->
            <details style="margin-bottom: 1.5rem;">
                <summary style="cursor:pointer; font-weight:700; font-size:.95rem; color:#1e293b; padding:12px 16px; background:white; border:1px solid #e2e8f0; border-radius:10px; list-style:none; display:flex; align-items:center; gap:8px; user-select:none;">
                    <span style="transition:transform .2s; display:inline-block;">&#9654;</span> Directory Analytics
                    <span style="margin-left:auto; font-size:.8rem; font-weight:500; color:#64748b;">
                        <?= number_format($dirAnalytics['views_7d']) ?> views &middot; <?= number_format($dirAnalytics['inquiries_7d']) ?> inquiries (7d)
                    </span>
                </summary>
                <div style="padding:16px 0 0;">
                    <div class="stats-bar" style="margin-bottom:16px;">
                        <div class="stat-item"><span class="stat-number"><?= number_format($dirAnalytics['total_views']) ?></span><span class="stat-label">Total Views</span></div>
                        <div class="stat-item"><span class="stat-number"><?= number_format($dirAnalytics['total_inquiries']) ?></span><span class="stat-label"><a href="inquiries.php" style="color:#64748b; text-decoration:underline;">Total Inquiries</a></span></div>
                        <div class="stat-item"><span class="stat-number"><?= number_format($dirAnalytics['views_7d']) ?></span><span class="stat-label">Views (7d)</span></div>
                        <div class="stat-item"><span class="stat-number"><?= number_format($dirAnalytics['inquiries_7d']) ?></span><span class="stat-label">Inquiries (7d)</span></div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                        <div style="background:white; border-radius:10px; padding:16px; border:1px solid #e2e8f0;">
                            <h4 style="font-size:.85rem; font-weight:700; color:#334155; margin-bottom:10px;">Top by Views</h4>
                            <?php if (!empty($topByViews)): ?>
                            <table style="width:100%; border-collapse:collapse; font-size:.8rem;">
                                <?php foreach ($topByViews as $i => $biz): ?>
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:6px 4px; color:#94a3b8; width:20px;"><?= $i+1 ?></td>
                                    <td style="padding:6px 4px;"><a href="/business/<?= htmlspecialchars($biz['slug']) ?>" target="_blank" style="color:#1e293b; text-decoration:none; font-weight:500;"><?= htmlspecialchars($biz['business_name']) ?></a></td>
                                    <td style="padding:6px 4px; text-align:right; font-weight:700; color:#38b6ff;"><?= number_format($biz['views_count']) ?></td>
                                    <td style="padding:6px 4px; text-align:right; color:#64748b;"><?= number_format($biz['inquiries_count']) ?> inq</td>
                                </tr>
                                <?php endforeach; ?>
                            </table>
                            <?php else: ?>
                            <p style="color:#94a3b8; text-align:center; padding:12px 0; font-size:.8rem;">No data yet.</p>
                            <?php endif; ?>
                        </div>
                        <div style="background:white; border-radius:10px; padding:16px; border:1px solid #e2e8f0;">
                            <h4 style="font-size:.85rem; font-weight:700; color:#334155; margin-bottom:10px;"><a href="inquiries.php" style="color:#334155; text-decoration:none;">Top by Inquiries</a> <a href="inquiries.php" style="font-size:.7rem; color:#0ea5e9; font-weight:500;">View All &rarr;</a></h4>
                            <?php if (!empty($topByInquiries)): ?>
                            <table style="width:100%; border-collapse:collapse; font-size:.8rem;">
                                <?php foreach ($topByInquiries as $i => $biz): ?>
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:6px 4px; color:#94a3b8; width:20px;"><?= $i+1 ?></td>
                                    <td style="padding:6px 4px;"><a href="/business/<?= htmlspecialchars($biz['slug']) ?>" target="_blank" style="color:#1e293b; text-decoration:none; font-weight:500;"><?= htmlspecialchars($biz['business_name']) ?></a></td>
                                    <td style="padding:6px 4px; text-align:right; font-weight:700; color:#10b981;"><?= number_format($biz['inquiries_count']) ?></td>
                                    <td style="padding:6px 4px; text-align:right; color:#64748b;"><?= number_format($biz['views_count']) ?> views</td>
                                </tr>
                                <?php endforeach; ?>
                            </table>
                            <?php else: ?>
                            <p style="color:#94a3b8; text-align:center; padding:12px 0; font-size:.8rem;">No inquiries yet.</p>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </details>
            <script>
            document.querySelector('details summary').addEventListener('click', function() {
                var arrow = this.querySelector('span');
                setTimeout(function(){ arrow.style.transform = arrow.closest('details').open ? '' : 'rotate(90deg)'; }, 10);
            });
            </script>

            <!-- Filter Bar -->
            <div class="filter-bar">
                <input type="text" id="filterSearch" placeholder="Search business name..." autocomplete="off">
                <select id="filterCategory">
                    <option value="">All Categories</option>
                    <?php foreach ($categories as $key => $catName): ?>
                        <option value="<?= $key ?>"><?= htmlspecialchars($catName) ?></option>
                    <?php endforeach; ?>
                </select>
                <select id="filterLocation">
                    <option value="">All Locations</option>
                    <?php foreach ($locations as $key => $locName): ?>
                        <option value="<?= $key ?>"><?= htmlspecialchars($locName) ?></option>
                    <?php endforeach; ?>
                </select>
                <select id="filterStatus">
                    <option value="">All Statuses</option>
                    <option value="pending">Pending Review</option>
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                    <option value="inactive">Inactive</option>
                </select>
                <a href="#" id="clearFilters" class="clear-filters" style="display:none;">Clear Filters</a>
            </div>
            <p id="filterCount" style="display:none; margin-bottom: 1rem; color: #64748b; font-size: .875rem;"></p>

            <?php if (empty($businesses)): ?>
                <div class="empty-state">
                    <div class="empty-state-icon">📂</div>
                    <h3>No businesses yet</h3>
                    <p>Add your first business listing to get started.</p>
                    <a href="manage_directory.php?view=add" class="btn btn-primary" style="margin-top: 1rem;">Add First Business</a>
                </div>
            <?php else: ?>
                <form method="POST" id="bulkForm">
                    <input type="hidden" name="action" value="bulk">
                    <div class="bulk-bar">
                        <label>Bulk Actions:</label>
                        <select name="bulk_action" id="bulkActionSelect">
                            <option value="">-- Select Action --</option>
                            <option value="approve">Approve</option>
                            <option value="activate">Activate</option>
                            <option value="deactivate">Deactivate</option>
                            <option value="hide">Hide</option>
                            <option value="unhide">Unhide</option>
                            <option value="delete">Delete</option>
                        </select>
                        <button type="submit" class="btn btn-primary" onclick="return handleBulkSubmit()">Apply</button>
                        <span id="selectedCount" style="font-size: .85rem; color: #64748b;">0 selected</span>
                    </div>

                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th class="cb-col"><input type="checkbox" id="selectAll" title="Select all"></th>
                                    <th>Business Name</th>
                                    <th>Category</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>Added</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($businesses as $biz):
                                    $logo = getBusinessLogo($db, $biz['id']);
                                    $bizStatus = !$biz['is_verified'] ? 'pending' : ($biz['is_hidden'] ? 'hidden' : ($biz['is_active'] ? 'active' : 'inactive'));
                                ?>
                                    <tr data-name="<?= htmlspecialchars(strtolower($biz['business_name'])) ?>" data-category="<?= htmlspecialchars($biz['category'] ?? '') ?>" data-location="<?= htmlspecialchars($biz['location_area'] ?? '') ?>" data-status="<?= $bizStatus ?>">
                                        <td class="cb-col"><input type="checkbox" name="ids[]" value="<?= (int)$biz['id'] ?>" class="row-cb"></td>
                                        <td>
                                            <div class="biz-name-cell">
                                                <?php if ($logo): ?>
                                                    <img src="../uploads/business_photos/<?= htmlspecialchars($logo) ?>" alt="" class="biz-logo-thumb">
                                                <?php else: ?>
                                                    <div class="biz-logo-placeholder">--</div>
                                                <?php endif; ?>
                                                <strong><?= htmlspecialchars($biz['business_name']) ?></strong>
                                            </div>
                                        </td>
                                        <td><?= htmlspecialchars($categories[$biz['category']] ?? $biz['category']) ?></td>
                                        <td><?= htmlspecialchars($locations[$biz['location_area'] ?? ''] ?? $biz['location_area'] ?? '-') ?></td>
                                        <td>
                                            <?php if (!$biz['is_verified']): ?>
                                                <span class="status-pending">Pending</span>
                                            <?php elseif ($biz['is_hidden']): ?>
                                                <span class="status-hidden">Hidden</span>
                                            <?php elseif ($biz['is_active']): ?>
                                                <span class="status-active">Active</span>
                                            <?php else: ?>
                                                <span class="status-inactive">Inactive</span>
                                            <?php endif; ?>
                                        </td>
                                        <td><?= date('M j, Y', strtotime($biz['created_at'])) ?></td>
                                        <td>
                                            <div class="actions-cell">
                                                <?php if (!$biz['is_verified']): ?>
                                                    <button type="button" onclick="rowAction('approve', <?= (int)$biz['id'] ?>)" class="btn btn-success btn-sm">Approve</button>
                                                    <button type="button" onclick="if(confirm('Deny this listing? The business owner will be notified.')) rowAction('deny', <?= (int)$biz['id'] ?>)" class="btn btn-danger btn-sm">Deny</button>
                                                <?php endif; ?>
                                                <a href="manage_directory.php?edit=<?= (int)$biz['id'] ?>" class="btn btn-primary btn-sm">Edit</a>
                                                <button type="button" onclick="rowAction('toggle_active', <?= (int)$biz['id'] ?>)" class="btn <?= $biz['is_active'] ? 'btn-warning' : 'btn-success' ?> btn-sm">
                                                    <?= $biz['is_active'] ? 'Deactivate' : 'Activate' ?>
                                                </button>
                                                <button type="button" onclick="rowAction('toggle_hidden', <?= (int)$biz['id'] ?>)" class="btn btn-secondary btn-sm">
                                                    <?= $biz['is_hidden'] ? 'Unhide' : 'Hide' ?>
                                                </button>
                                                <button type="button" onclick="rowAction('toggle_featured', <?= (int)$biz['id'] ?>)" class="btn btn-sm" style="background: <?= !empty($biz['is_featured']) ? '#f59e0b' : '#e2e8f0' ?>; color: <?= !empty($biz['is_featured']) ? 'white' : '#64748b' ?>;">
                                                    <?= !empty($biz['is_featured']) ? '&#9733; Featured' : '&#9734; Feature' ?>
                                                </button>
                                                <button type="button" onclick="rowAction('delete', <?= (int)$biz['id'] ?>)" class="btn btn-danger btn-sm">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                        <div id="noFilterResults" style="display:none; text-align:center; padding:3rem 1rem; color:#64748b;">
                            <h3>No businesses match your filters</h3>
                            <p>Try adjusting your search or <a href="#" onclick="clearAllFilters(); return false;">clear all filters</a>.</p>
                        </div>
                    </div>
                </form>
            <?php endif; ?>
<?php endif; ?>

        </div>
    </div>

    <script>
        // Live filter-as-you-type
        (function() {
            var search = document.getElementById('filterSearch');
            var category = document.getElementById('filterCategory');
            var location = document.getElementById('filterLocation');
            var status = document.getElementById('filterStatus');
            var clearBtn = document.getElementById('clearFilters');
            var countEl = document.getElementById('filterCount');
            var noResults = document.getElementById('noFilterResults');
            var rows = document.querySelectorAll('tbody tr[data-name]');
            var totalRows = rows.length;

            if (!search || !rows.length) return;

            function filterRows() {
                var q = search.value.toLowerCase().trim();
                var cat = category.value;
                var loc = location.value;
                var stat = status.value;
                var visible = 0;
                var hasFilter = (q !== '' || cat !== '' || loc !== '' || stat !== '');

                rows.forEach(function(row) {
                    var show = true;
                    if (q && row.getAttribute('data-name').indexOf(q) === -1) show = false;
                    if (cat && row.getAttribute('data-category') !== cat) show = false;
                    if (loc && row.getAttribute('data-location') !== loc) show = false;
                    if (stat && row.getAttribute('data-status') !== stat) show = false;
                    row.style.display = show ? '' : 'none';
                    if (show) visible++;
                });

                clearBtn.style.display = hasFilter ? '' : 'none';
                if (hasFilter) {
                    countEl.style.display = '';
                    countEl.textContent = 'Showing ' + visible + ' of ' + totalRows + ' businesses';
                } else {
                    countEl.style.display = 'none';
                }
                if (noResults) noResults.style.display = (visible === 0 && hasFilter) ? '' : 'none';
            }

            search.addEventListener('input', filterRows);
            category.addEventListener('change', filterRows);
            location.addEventListener('change', filterRows);
            status.addEventListener('change', filterRows);

            clearBtn.addEventListener('click', function(e) {
                e.preventDefault();
                clearAllFilters();
            });

            window.clearAllFilters = function() {
                search.value = '';
                category.value = '';
                location.value = '';
                status.value = '';
                filterRows();
            };
        })();

        // Auto-dismiss alerts
        setTimeout(function() {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach(function(alert) {
                alert.style.opacity = '0';
                alert.style.transition = 'opacity 0.3s ease';
                setTimeout(() => alert.remove(), 300);
            });
        }, 5000);

        // Per-row action via dynamic hidden form (avoids nested form issue)
        function rowAction(action, id) {
            if (action === 'delete' && !confirm('Are you sure you want to delete this business?')) return;
            var form = document.createElement('form');
            form.method = 'POST';
            form.style.display = 'none';
            form.innerHTML = '<input name="action" value="' + action + '"><input name="id" value="' + id + '">';
            document.body.appendChild(form);
            form.submit();
        }

        // Select-all checkbox
        var selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', function() {
                var cbs = document.querySelectorAll('.row-cb');
                cbs.forEach(function(cb) { cb.checked = selectAll.checked; });
                updateSelectedCount();
            });
        }

        // Update selected count
        document.addEventListener('change', function(e) {
            if (e.target.classList.contains('row-cb')) updateSelectedCount();
        });
        function updateSelectedCount() {
            var n = document.querySelectorAll('.row-cb:checked').length;
            var el = document.getElementById('selectedCount');
            if (el) el.textContent = n + ' selected';
        }

        // Tag chip toggle + category filtering
        (function() {
            var chips = document.querySelectorAll('.tag-chip');
            chips.forEach(function(chip) {
                chip.addEventListener('click', function(e) {
                    e.preventDefault();
                    var cb = this.querySelector('input[type="checkbox"]');
                    cb.checked = !cb.checked;
                    this.classList.toggle('active', cb.checked);
                });
            });

            var catSelect = document.getElementById('category');
            if (catSelect && chips.length) {
                catSelect.addEventListener('change', function() {
                    var cat = this.value;
                    chips.forEach(function(chip) {
                        var chipCat = chip.getAttribute('data-category');
                        // Show if: no category filter, or chip is cross-category, or chip matches
                        var show = !cat || !chipCat || chipCat === cat;
                        chip.classList.toggle('hidden-tag', !show);
                    });
                });
                // Trigger on load to reflect pre-selected category
                catSelect.dispatchEvent(new Event('change'));
            }
        })();

        // Bulk submit validation
        function handleBulkSubmit() {
            var action = document.getElementById('bulkActionSelect').value;
            if (!action) { alert('Please select a bulk action.'); return false; }
            var checked = document.querySelectorAll('.row-cb:checked');
            if (checked.length === 0) { alert('Please select at least one business.'); return false; }
            if (action === 'delete') {
                return confirm('Are you sure you want to delete ' + checked.length + ' business(es)? This cannot be undone.');
            }
            return true;
        }

        // Gallery photo preview
        var galleryInput = document.getElementById('gallery');
        if (galleryInput) {
            galleryInput.addEventListener('change', function() {
                var preview = document.getElementById('gallery-preview');
                preview.innerHTML = '';
                var files = this.files;
                for (var i = 0; i < files.length && i < 6; i++) {
                    (function(file) {
                        var reader = new FileReader();
                        reader.onload = function(e) {
                            var div = document.createElement('div');
                            div.style.cssText = 'border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#f8fafc;';
                            div.innerHTML = '<img src="' + e.target.result + '" style="width:100%; height:100px; object-fit:cover; display:block;">' +
                                '<div style="padding:6px 8px; font-size:0.75rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + file.name + '</div>';
                            preview.appendChild(div);
                        };
                        reader.readAsDataURL(file);
                    })(files[i]);
                }
                if (files.length > 6) {
                    var warn = document.createElement('div');
                    warn.style.cssText = 'grid-column:1/-1; color:#dc2626; font-size:0.85rem;';
                    warn.textContent = 'Only the first 6 files will be uploaded.';
                    preview.appendChild(warn);
                }
            });
        }
    </script>
</body>
</html>
