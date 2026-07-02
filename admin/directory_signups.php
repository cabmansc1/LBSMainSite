<?php
// --- Strict, private, no-cache for admin pages ---
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Vary: Cookie, Authorization');

// admin/directory_signups.php - Directory Signups Management
require_once '../config.php';
require_once 'campaign_functions.php';
require_once '../User.php';
require_once '../Business.php';

// Check admin authentication
requireCampaignAdminLogin();

$currentAdmin = getCurrentCampaignAdmin();

try {
    $db = getDB();

    // Handle status update
    if ($_POST && isset($_POST['action']) && $_POST['action'] === 'update_status' && isset($_POST['signup_id'])) {
        $signup_id = (int)$_POST['signup_id'];
        $new_status = $_POST['new_status'] ?? 'pending';
        $allowed_statuses = ['pending', 'approved', 'rejected'];
        if (in_array($new_status, $allowed_statuses)) {
            $stmt = $db->prepare("UPDATE directory_signups SET status = ? WHERE id = ?");
            $stmt->execute([$new_status, $signup_id]);
            header('Location: directory_signups.php?message=status_updated');
            exit();
        }
    }

    // Handle convert-to-listing action: auto-create the owner account and a PENDING
    // directory listing from the signup. The listing still goes through the normal
    // Approve step in manage_directory.php before it is published.
    if ($_POST && isset($_POST['action']) && $_POST['action'] === 'convert' && isset($_POST['signup_id'])) {
        $signup_id = (int)$_POST['signup_id'];
        $stmt = $db->prepare("SELECT * FROM directory_signups WHERE id = ?");
        $stmt->execute([$signup_id]);
        $signup = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$signup) {
            header('Location: directory_signups.php?message=convert_failed');
            exit();
        }
        if ($signup['status'] === 'converted') {
            header('Location: directory_signups.php?message=already_converted');
            exit();
        }

        try {
            // Split contact name into first / last (best-effort), dropping a leading title
            $nameClean = trim(preg_replace('/^(dr|mr|mrs|ms|miss|prof)\.?\s+/i', '', trim($signup['contact_name'] ?? '')));
            $nameParts = preg_split('/\s+/', $nameClean, 2);
            $firstName = $nameParts[0] ?? '';
            $lastName  = $nameParts[1] ?? '';

            // Normalize phone: keep digits, drop an erroneous leading 0 or US country code 1,
            // then format as (xxx) xxx-xxxx when we have 10 digits; otherwise leave as entered.
            $digits = preg_replace('/\D+/', '', $signup['phone'] ?? '');
            if (strlen($digits) === 11 && ($digits[0] === '0' || $digits[0] === '1')) {
                $digits = substr($digits, 1);
            }
            $cleanPhone = (strlen($digits) === 10)
                ? '(' . substr($digits, 0, 3) . ') ' . substr($digits, 3, 3) . '-' . substr($digits, 6)
                : trim($signup['phone'] ?? '');

            // Create (or link) the owner account; emails temporary login credentials.
            $userObj = new User();
            $userId = $userObj->createAutoAccount(
                $signup['email'],
                $firstName,
                $lastName,
                $cleanPhone ?: null,
                'directory'
            );

            // The signup form and the directory use different category vocabularies,
            // so translate, then validate against the live category list (fallback: other).
            $categoryMap = [
                'restaurants'      => 'restaurant',
                'retail'           => 'retail',
                'services'         => 'services',
                'healthcare'       => 'health-wellness',
                'automotive'       => 'automotive',
                'home-garden'      => 'home-garden',
                'beauty-wellness'  => 'beauty',
                'fitness-recreation' => 'fitness-recreation',
                'education'        => 'other',
                'real-estate'      => 'services',
                'technology'       => 'services',
                'construction'     => 'home-services',
                'legal'            => 'legal',
                'financial'        => 'legal',
                'entertainment'    => 'other',
                'non-profit'       => 'other',
                'other'            => 'other',
            ];
            $rawCat = strtolower(trim($signup['business_category'] ?? ''));
            $category = $categoryMap[$rawCat] ?? 'other';
            $validCats = array_keys(getCategories());
            if (!in_array($category, $validCats, true)) {
                $category = 'other';
            }

            // Map signup -> business listing. createBusiness() leaves is_verified at its
            // column default of 0, so the listing is created PENDING.
            $city = strtolower(trim($signup['city'] ?? ''));
            $businessData = [
                'business_name' => $signup['business_name'],
                'category'      => $category,
                'phone'         => $cleanPhone,
                'email'         => $signup['email'],
                'website'       => $signup['website'] ?? '',
                'address'       => $signup['street_address'] ?? '',
                'city'          => $signup['city'] ?? '',
                'zip_code'      => $signup['zip_code'] ?? '',
                'location_area' => $city !== '' ? $city : 'charleston',
                'description'   => $signup['business_description'] ?? '',
            ];

            $businessObj = new Business();
            $businessId = $businessObj->createBusiness($businessData, $userId);
            if (!$businessId) {
                throw new Exception('createBusiness returned no id');
            }

            // Mark the signup converted so it can't be turned into a duplicate listing.
            $db->prepare("UPDATE directory_signups SET status = 'converted' WHERE id = ?")->execute([$signup_id]);

            header('Location: directory_signups.php?message=converted');
            exit();
        } catch (Exception $e) {
            error_log('Directory signup convert error (#' . $signup_id . '): ' . $e->getMessage());
            header('Location: directory_signups.php?message=convert_failed');
            exit();
        }
    }

    // Handle delete action
    if ($_POST && isset($_POST['action']) && $_POST['action'] === 'delete' && isset($_POST['signup_id'])) {
        $signup_id = (int)$_POST['signup_id'];
        $stmt = $db->prepare("DELETE FROM directory_signups WHERE id = ?");
        $stmt->execute([$signup_id]);
        header('Location: directory_signups.php?message=deleted');
        exit();
    }

    // Get all signups
    $signups = $db->query("SELECT * FROM directory_signups ORDER BY signup_date DESC")->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    $error_message = "Database error: " . $e->getMessage();
    error_log("Directory signups page error: " . $e->getMessage());
}

$success_message = '';
if (isset($_GET['message'])) {
    switch ($_GET['message']) {
        case 'deleted':
            $success_message = 'Signup deleted successfully.';
            break;
        case 'status_updated':
            $success_message = 'Status updated successfully.';
            break;
        case 'converted':
            $success_message = 'Listing created (pending) and owner account set up. Approve it in Manage Directory to publish. The owner was emailed temporary login credentials — tell them to check their spam folder if it doesn\'t arrive, or to use "Forgot your password?" on the login page.';
            break;
        case 'already_converted':
            $error_message = 'This signup has already been converted to a listing.';
            break;
        case 'convert_failed':
            $error_message = 'Could not convert this signup to a listing. Check the error log for details.';
            break;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Directory Signups | <?php echo SITE_NAME; ?></title>
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

        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .page-title { font-size: 1.75rem; font-weight: 700; color: #1e293b; }
        .btn { padding: .75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all .3s ease; border: none; cursor: pointer; display: inline-block; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(56,182,255,.4); }
        .btn-danger { background: #ef4444; color: white; padding: .5rem .75rem; font-size: .875rem; }
        .btn-danger:hover { background: #ff6b00; }
        .btn-success { background: linear-gradient(135deg, #10b981, #059669); color: white; }
        .btn-success:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16,185,129,.4); }
        .btn-sm { padding: .375rem .75rem; font-size: .75rem; }

        .alert { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #d1fae5; border: 1px solid #10b981; color: #065f46; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        .signup-grid { display: grid; gap: 1.5rem; }
        .signup-card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; overflow: hidden; }
        .signup-header { background: linear-gradient(135deg, #64748b, #475569); color: white; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; }
        .signup-header.pending { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .signup-header.approved { background: linear-gradient(135deg, #10b981, #059669); }
        .signup-header.rejected { background: linear-gradient(135deg, #ef4444, #ff6b00); }
        .signup-title { font-size: 1.125rem; font-weight: 700; }
        .signup-category { opacity: .9; font-size: .875rem; }
        .signup-body { padding: 1.5rem; }
        .signup-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
        .info-group { margin-bottom: 1rem; }
        .info-label { font-size: .75rem; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .25rem; }
        .info-value { color: #1e293b; }
        .info-value a { color: #38b6ff; text-decoration: none; }
        .info-value a:hover { text-decoration: underline; }

        .status-badge { padding: .375rem .75rem; border-radius: 20px; font-size: .75rem; font-weight: 600; text-transform: uppercase; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-approved { background: #d1fae5; color: #065f46; }
        .status-rejected { background: #fee2e2; color: #991b1b; }

        .signup-actions { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; }
        .status-select { padding: .5rem; border-radius: 6px; border: 1px solid #e2e8f0; font-size: .875rem; }

        .empty-state { text-align: center; padding: 3rem; color: #64748b; background: white; border-radius: 12px; border: 1px solid #e2e8f0; }
        .empty-state-icon { font-size: 4rem; margin-bottom: 1rem; }

        .stats-bar { display: flex; gap: 2rem; margin-bottom: 2rem; padding: 1rem 1.5rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0; flex-wrap: wrap; }
        .stat-item { display: flex; align-items: center; gap: .5rem; }
        .stat-number { font-size: 1.5rem; font-weight: 700; color: #38b6ff; }
        .stat-label { color: #64748b; font-size: .875rem; }

        .service-areas { display: flex; flex-wrap: wrap; gap: .5rem; }
        .area-tag { background: #e0f2fe; color: #0369a1; padding: .25rem .5rem; border-radius: 4px; font-size: .75rem; }

        @media (max-width: 768px) {
            .page-header { flex-direction: column; gap: 1rem; align-items: flex-start; }
            .stats-bar { flex-direction: column; gap: 1rem; }
            .navbar .container { flex-direction: column; gap: 1rem; }
            .navbar-nav { flex-wrap: wrap; justify-content: center; }
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
                <div class="alert alert-danger"><?php echo $error_message; ?></div>
            <?php endif; ?>

            <div class="page-header">
                <h1 class="page-title">Directory Signups</h1>
                <a href="dashboard.php" class="btn btn-primary">Back to Dashboard</a>
            </div>

            <div class="stats-bar">
                <div class="stat-item">
                    <span class="stat-number"><?php echo count($signups ?? []); ?></span>
                    <span class="stat-label">Total Signups</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number"><?php echo count(array_filter($signups ?? [], fn($s) => $s['status'] === 'pending')); ?></span>
                    <span class="stat-label">Pending</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number"><?php echo count(array_filter($signups ?? [], fn($s) => $s['status'] === 'approved')); ?></span>
                    <span class="stat-label">Approved</span>
                </div>
            </div>

            <?php if (empty($signups)): ?>
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>No directory signups yet</h3>
                    <p>Business signups will appear here.</p>
                </div>
            <?php else: ?>
                <div class="signup-grid">
                    <?php foreach ($signups as $signup): ?>
                        <div class="signup-card">
                            <div class="signup-header <?php echo htmlspecialchars($signup['status']); ?>">
                                <div>
                                    <div class="signup-title"><?php echo htmlspecialchars($signup['business_name']); ?></div>
                                    <div class="signup-category"><?php echo htmlspecialchars(ucwords(str_replace('-', ' ', $signup['business_category']))); ?></div>
                                </div>
                                <span class="status-badge status-<?php echo htmlspecialchars($signup['status']); ?>">
                                    <?php echo ucfirst($signup['status']); ?>
                                </span>
                            </div>
                            <div class="signup-body">
                                <div class="signup-info">
                                    <div>
                                        <div class="info-group">
                                            <div class="info-label">Contact</div>
                                            <div class="info-value"><?php echo htmlspecialchars($signup['contact_name']); ?></div>
                                        </div>
                                        <div class="info-group">
                                            <div class="info-label">Email</div>
                                            <div class="info-value">
                                                <a href="mailto:<?php echo htmlspecialchars($signup['email']); ?>">
                                                    <?php echo htmlspecialchars($signup['email']); ?>
                                                </a>
                                            </div>
                                        </div>
                                        <div class="info-group">
                                            <div class="info-label">Phone</div>
                                            <div class="info-value"><?php echo htmlspecialchars($signup['phone']); ?></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="info-group">
                                            <div class="info-label">Address</div>
                                            <div class="info-value">
                                                <?php echo htmlspecialchars($signup['street_address'] ?? ''); ?><br>
                                                <?php echo htmlspecialchars(ucwords(str_replace('-', ' ', $signup['city'] ?? ''))); ?>, <?php echo htmlspecialchars($signup['zip_code'] ?? ''); ?>
                                            </div>
                                        </div>
                                        <div class="info-group">
                                            <div class="info-label">Preferred Plan</div>
                                            <div class="info-value"><?php echo htmlspecialchars(ucfirst($signup['preferred_plan'] ?? 'N/A')); ?></div>
                                        </div>
                                        <div class="info-group">
                                            <div class="info-label">Signup Date</div>
                                            <div class="info-value"><?php echo date('M j, Y g:i A', strtotime($signup['signup_date'])); ?></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="info-group">
                                            <div class="info-label">Description</div>
                                            <div class="info-value"><?php echo htmlspecialchars($signup['business_description'] ?? 'N/A'); ?></div>
                                        </div>
                                        <div class="info-group">
                                            <div class="info-label">Service Areas</div>
                                            <div class="service-areas">
                                                <?php
                                                $areas = explode(', ', $signup['service_areas'] ?? '');
                                                foreach ($areas as $area):
                                                    if (!empty($area)):
                                                ?>
                                                    <span class="area-tag"><?php echo htmlspecialchars(ucwords(str_replace('-', ' ', $area))); ?></span>
                                                <?php
                                                    endif;
                                                endforeach;
                                                ?>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="signup-actions">
                                    <form method="POST" style="display:inline-flex; align-items: center; gap: .5rem;">
                                        <input type="hidden" name="action" value="update_status">
                                        <input type="hidden" name="signup_id" value="<?php echo (int)$signup['id']; ?>">
                                        <label style="font-size: .875rem; color: #64748b; font-weight: 500;">Status:</label>
                                        <select name="new_status" class="status-select">
                                            <option value="pending" <?php echo $signup['status'] === 'pending' ? 'selected' : ''; ?>>Pending</option>
                                            <option value="approved" <?php echo $signup['status'] === 'approved' ? 'selected' : ''; ?>>Approved</option>
                                            <option value="rejected" <?php echo $signup['status'] === 'rejected' ? 'selected' : ''; ?>>Rejected</option>
                                            <option value="converted" <?php echo $signup['status'] === 'converted' ? 'selected' : ''; ?> disabled>Converted</option>
                                        </select>
                                        <button type="submit" class="btn btn-primary btn-sm">Update</button>
                                    </form>

                                    <?php if ($signup['status'] === 'converted'): ?>
                                        <span class="btn btn-sm" style="background:#d1fae5; color:#065f46; cursor:default;">&#10003; Converted to listing</span>
                                    <?php else: ?>
                                        <form method="POST" style="display:inline-flex; align-items: center;" onsubmit="return confirm('Create a pending directory listing and owner account from this signup? It will still need to be approved in Manage Directory.');">
                                            <input type="hidden" name="action" value="convert">
                                            <input type="hidden" name="signup_id" value="<?php echo (int)$signup['id']; ?>">
                                            <button type="submit" class="btn btn-success btn-sm">Convert to Listing</button>
                                        </form>
                                    <?php endif; ?>

                                    <form method="POST" style="display:inline-flex; align-items: center;" onsubmit="return confirm('Are you sure you want to delete this signup?');">
                                        <input type="hidden" name="action" value="delete">
                                        <input type="hidden" name="signup_id" value="<?php echo (int)$signup['id']; ?>">
                                        <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <script>
        setTimeout(function() {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach(function(alert) {
                alert.style.opacity = '0';
                alert.style.transition = 'opacity 0.3s ease';
                setTimeout(() => alert.remove(), 300);
            });
        }, 5000);
    </script>
</body>
</html>
