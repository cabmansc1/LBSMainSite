<?php
// admin/edit_campaign.php - Edit Existing Campaign
require_once '../config.php';
require_once 'campaign_functions.php';

// Check admin authentication
requireCampaignAdminLogin();

$campaign_id = $_GET['id'] ?? null;
$error_message = '';
$success_message = '';

if (!$campaign_id) {
    header('Location: dashboard.php');
    exit();
}

try {
    $db = getDB();
    
    // Get existing campaign data
    $stmt = $db->prepare("SELECT * FROM campaigns WHERE id = ?");
    $stmt->execute([$campaign_id]);
    $campaign = $stmt->fetch();
    
    if (!$campaign) {
        header('Location: dashboard.php?message=campaign_not_found');
        exit();
    }
    
} catch (Exception $e) {
    $error_message = 'Error loading campaign: ' . $e->getMessage();
}

// Handle form submission
if ($_POST && $campaign) {
    try {
        $campaign_name = sanitizeInput($_POST['campaign_name'] ?? '');
        $area = sanitizeInput($_POST['area'] ?? '');
        $zip_code = sanitizeInput($_POST['zip_code'] ?? '');
        $registration_start = $_POST['registration_start'] ?? '';
        $registration_end = $_POST['registration_end'] ?? '';
        $status = $_POST['status'] ?? 'active';
        $notes = sanitizeInput($_POST['notes'] ?? '');
        
        // Use custom code if provided, otherwise keep existing
        $campaign_code = !empty($_POST['campaign_code']) ? sanitizeInput($_POST['campaign_code']) : $campaign['campaign_code'];
        
        // Validation
        $errors = [];
        
        if (empty($campaign_name)) {
            $errors[] = 'Campaign name is required.';
        }
        
        if (empty($area)) {
            $errors[] = 'Area is required.';
        }
        
        if (empty($registration_start)) {
            $errors[] = 'Registration start date is required.';
        }
        
        if (empty($registration_end)) {
            $errors[] = 'Registration end date is required.';
        }
        
        if (!empty($registration_start) && !empty($registration_end)) {
            if (strtotime($registration_start) >= strtotime($registration_end)) {
                $errors[] = 'Registration end date must be after start date.';
            }
        }
        
        // Check if campaign code already exists (but allow keeping the same code)
        if ($campaign_code !== $campaign['campaign_code'] && empty($errors)) {
            $stmt = $db->prepare("SELECT id FROM campaigns WHERE campaign_code = ? AND id != ?");
            $stmt->execute([$campaign_code, $campaign_id]);
            if ($stmt->fetch()) {
                $errors[] = 'Campaign code already exists: ' . $campaign_code;
            }
        }
        
        // Handle image upload
        $postcard_image = $campaign['postcard_image']; // keep existing by default
        if (!empty($_FILES['postcard_image']['name']) && $_FILES['postcard_image']['error'] === UPLOAD_ERR_OK) {
            try {
                $postcard_image = uploadPostcardImage($_FILES['postcard_image']);
                // Delete old image if a new one was uploaded successfully
                if (!empty($campaign['postcard_image'])) {
                    $oldPath = UPLOAD_DIR . 'postcards/' . $campaign['postcard_image'];
                    if (file_exists($oldPath)) {
                        unlink($oldPath);
                    }
                }
            } catch (Exception $e) {
                $errors[] = $e->getMessage();
            }
        }

        // Update campaign if no errors
        if (empty($errors)) {
            $stmt = $db->prepare("
                UPDATE campaigns
                SET campaign_code = ?, campaign_name = ?, area = ?, zip_code = ?, postcard_image = ?,
                    registration_start = ?, registration_end = ?, status = ?, notes = ?, updated_date = CURRENT_TIMESTAMP
                WHERE id = ?
            ");

            $stmt->execute([
                $campaign_code,
                $campaign_name,
                $area,
                $zip_code,
                $postcard_image,
                $registration_start,
                $registration_end,
                $status,
                $notes,
                $campaign_id
            ]);
            
            logCampaignActivity('Campaign Updated', [
                'campaign_id' => $campaign_id,
                'campaign_code' => $campaign_code,
                'campaign_name' => $campaign_name
            ]);
            
            $success_message = 'Campaign updated successfully!';
            
            // Refresh campaign data
            $stmt = $db->prepare("SELECT * FROM campaigns WHERE id = ?");
            $stmt->execute([$campaign_id]);
            $campaign = $stmt->fetch();
        } else {
            $error_message = implode('<br>', $errors);
        }
        
    } catch (Exception $e) {
        $error_message = 'Error updating campaign: ' . $e->getMessage();
        error_log("Edit campaign error: " . $e->getMessage());
    }
}

$currentAdmin = getCurrentCampaignAdmin();
$availableAreas = getAvailableAreas();
$areaCodes = getAreasWithCodes();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Campaign | <?php echo SITE_NAME; ?></title>
    
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: #f8fafc;
            color: #334155;
        }
        
       .navbar {
            background: linear-gradient(135deg, #1f2937, #111827);
            color: white;
            padding: 1rem 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .navbar .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .navbar-brand {
            font-size: 1.5rem;
            font-weight: 800;
            text-decoration: none;
            color: white;
        }
        
        .navbar-nav {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .nav-link {
            color: white;
            text-decoration: none;
            font-weight: 500;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            transition: background-color 0.3s ease;
        }
        
        .nav-link:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 20px;
        }
        
        .page-title {
            font-size: 2rem;
            font-weight: 800;
            color: #1e293b;
            margin-bottom: 2rem;
            text-align: center;
        }
        
        .form-container {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .form-group.full-width {
            grid-column: 1 / -1;
        }
        
        .form-group label {
            display: block;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #374151;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #38b6ff;
            box-shadow: 0 0 0 3px rgba(56, 182, 255, 0.1);
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 100px;
        }
        
        .form-help {
            font-size: 0.875rem;
            color: #6b7280;
            margin-top: 0.25rem;
        }
        
        .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            display: inline-block;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(56, 182, 255, 0.4);
        }
        
        .btn-secondary {
            background: #64748b;
            color: white;
        }
        
        .btn-group {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-top: 2rem;
        }
        
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            font-weight: 500;
        }
        
        .alert-success {
            background: #d1fae5;
            border: 1px solid #10b981;
            color: #065f46;
        }
        
        .alert-danger {
            background: #fee2e2;
            border: 1px solid #ef4444;
            color: #991b1b;
        }
        
        @media (max-width: 768px) {
            .form-grid {
                grid-template-columns: 1fr;
            }
            
            .btn-group {
                flex-direction: column;
            }
            
            .navbar .container {
                flex-direction: column;
                gap: 1rem;
            }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'campaigns'; require_once __DIR__ . '/includes/nav.php'; ?>
    
    <div class="container">
        <h1 class="page-title">Edit Campaign</h1>
        
        <?php if ($campaign): ?>
            <div class="form-container">
                <?php if ($success_message): ?>
                    <div class="alert alert-success">
                        <?php echo $success_message; ?>
                    </div>
                <?php endif; ?>
                
                <?php if ($error_message): ?>
                    <div class="alert alert-danger">
                        <?php echo $error_message; ?>
                    </div>
                <?php endif; ?>
                
                <form method="POST" enctype="multipart/form-data">
                    <div class="form-grid">
                        <div class="form-group full-width">
                            <label for="campaign_name">Campaign Name *</label>
                            <input type="text" id="campaign_name" name="campaign_name" 
                                   value="<?php echo htmlspecialchars($campaign['campaign_name']); ?>" required>
                            <div class="form-help">This is what users will see in the dropdown</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="area">Area *</label>
                            <select id="area" name="area" required>
                                <?php foreach ($availableAreas as $key => $areaName): ?>
                                    <option value="<?php echo htmlspecialchars($areaName); ?>" 
                                            <?php echo $campaign['area'] === $areaName ? 'selected' : ''; ?>>
                                        <?php echo htmlspecialchars($areaName); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="zip_code">ZIP Code</label>
                            <input type="text" id="zip_code" name="zip_code" 
                                   value="<?php echo htmlspecialchars($campaign['zip_code']); ?>">
                        </div>
                        
                        <div class="form-group">
                            <label for="registration_start">Registration Start Date *</label>
                            <input type="date" id="registration_start" name="registration_start" 
                                   value="<?php echo $campaign['registration_start']; ?>" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="registration_end">Registration End Date *</label>
                            <input type="date" id="registration_end" name="registration_end" 
                                   value="<?php echo $campaign['registration_end']; ?>" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="status">Status *</label>
                            <select id="status" name="status" required>
                                <option value="active" <?php echo $campaign['status'] === 'active' ? 'selected' : ''; ?>>Active</option>
                                <option value="inactive" <?php echo $campaign['status'] === 'inactive' ? 'selected' : ''; ?>>Inactive</option>
                                <option value="ended" <?php echo $campaign['status'] === 'ended' ? 'selected' : ''; ?>>Ended</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="campaign_code">Campaign Code *</label>
                            <input type="text" id="campaign_code" name="campaign_code" 
                                   value="<?php echo htmlspecialchars($campaign['campaign_code']); ?>" required>
                            <div class="form-help">Be careful changing this - existing registrations use this code</div>
                        </div>
                        
                        <!-- Image upload disabled for now -->

                        <div class="form-group full-width">
                            <label for="notes">Internal Notes</label>
                            <textarea id="notes" name="notes"><?php echo htmlspecialchars($campaign['notes']); ?></textarea>
                            <div class="form-help">Internal notes about advertisers, prizes, etc.</div>
                        </div>
                    </div>
                    
                    <div class="btn-group">
                        <button type="submit" class="btn btn-primary">Update Campaign</button>
                        <a href="dashboard.php" class="btn btn-secondary">Cancel</a>
                    </div>
                </form>
            </div>
            
        <?php else: ?>
            <div class="alert alert-danger">
                Campaign not found or access denied.
            </div>
        <?php endif; ?>
    </div>
    
    <script>
        const areaCodes = <?php echo json_encode($areaCodes); ?>;

        // Form validation
        document.querySelector('form').addEventListener('submit', function(e) {
            const startDate = new Date(document.getElementById('registration_start').value);
            const endDate = new Date(document.getElementById('registration_end').value);
            
            if (startDate >= endDate) {
                e.preventDefault();
                alert('Registration end date must be after start date.');
            }
        });
    </script>
</body>
</html>