<?php
// admin/add_campaign.php - Add New Campaign
require_once '../config.php';
require_once 'campaign_functions.php';

// Check admin authentication
requireCampaignAdminLogin();

$error_message = '';
$success_message = '';

// Handle form submission
if ($_POST) {
    try {
        $campaign_name = sanitizeInput($_POST['campaign_name'] ?? '');
        $area = sanitizeInput($_POST['area'] ?? '');
        $zip_code = sanitizeInput($_POST['zip_code'] ?? '');
        $registration_start = $_POST['registration_start'] ?? '';
        $registration_end = $_POST['registration_end'] ?? '';
        $notes = sanitizeInput($_POST['notes'] ?? '');
        
        // Auto-generate campaign code or use custom one
        if (!empty($_POST['custom_code'])) {
            $campaign_code = sanitizeInput($_POST['custom_code']);
        } else {
            $campaign_code = generateCampaignCode($area, $zip_code, date('MY'));
        }
        
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
        
        // Check if campaign code already exists
        if (empty($errors)) {
            $db = getDB();
            $stmt = $db->prepare("SELECT id FROM campaigns WHERE campaign_code = ?");
            $stmt->execute([$campaign_code]);
            if ($stmt->fetch()) {
                $errors[] = 'Campaign code already exists: ' . $campaign_code;
            }
        }
        
        // Handle image upload
        $postcard_image = null;
        if (!empty($_FILES['postcard_image']['name'])) {
            try {
                $postcard_image = uploadPostcardImage($_FILES['postcard_image']);
            } catch (Exception $e) {
                $errors[] = $e->getMessage();
            }
        }
        
        // Save campaign if no errors
        if (empty($errors)) {
            $stmt = $db->prepare("
                INSERT INTO campaigns (campaign_code, campaign_name, area, zip_code, postcard_image, registration_start, registration_end, notes, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
            ");
            
            $stmt->execute([
                $campaign_code,
                $campaign_name,
                $area,
                $zip_code,
                $postcard_image,
                $registration_start,
                $registration_end,
                $notes
            ]);
            
            logCampaignActivity('Campaign Created', [
                'campaign_code' => $campaign_code,
                'campaign_name' => $campaign_name
            ]);
            
            $success_message = 'Campaign created successfully! Campaign Code: ' . $campaign_code;
            
            // Clear form
            $campaign_name = $area = $zip_code = $registration_start = $registration_end = $notes = '';
        } else {
            $error_message = implode('<br>', $errors);
        }
        
    } catch (Exception $e) {
        $error_message = 'Error creating campaign: ' . $e->getMessage();
        error_log("Add campaign error: " . $e->getMessage());
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
    <title>Add Campaign | <?php echo SITE_NAME; ?></title>
    
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
        
        .code-preview {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1rem;
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
            color: #374151;
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
        <h1 class="page-title">Add New Campaign</h1>
        
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
                               value="<?php echo htmlspecialchars($campaign_name ?? ''); ?>" 
                               placeholder="e.g., Summerville Nexton 29486" required>
                        <div class="form-help">This is what users will see in the dropdown</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="area">Area *</label>
                        <select id="area" name="area" required onchange="updateCampaignCode()">
                            <option value="">Select area...</option>
                            <?php foreach ($availableAreas as $key => $areaName): ?>
                                <option value="<?php echo htmlspecialchars($areaName); ?>" 
                                        <?php echo ($area ?? '') === $areaName ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars($areaName); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="zip_code">ZIP Code</label>
                        <input type="text" id="zip_code" name="zip_code" 
                               value="<?php echo htmlspecialchars($zip_code ?? ''); ?>" 
                               placeholder="29486" onchange="updateCampaignCode()">
                        <div class="form-help">Optional - helps with targeting</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="registration_start">Registration Start Date *</label>
                        <input type="date" id="registration_start" name="registration_start" 
                               value="<?php echo htmlspecialchars($registration_start ?? ''); ?>" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="registration_end">Registration End Date *</label>
                        <input type="date" id="registration_end" name="registration_end" 
                               value="<?php echo htmlspecialchars($registration_end ?? ''); ?>" required>
                    </div>
                    
                    <!-- Image upload disabled for now -->
                    
                    <div class="form-group full-width">
                        <label for="custom_code">Campaign Code</label>
                        <input type="text" id="custom_code" name="custom_code" 
                               value="<?php echo htmlspecialchars($custom_code ?? ''); ?>" 
                               placeholder="Auto-generated if left empty">
                        <div class="form-help">Leave empty to auto-generate, or enter custom code</div>
                        <div class="code-preview" id="code_preview">
                            Auto-generated code will appear here
                        </div>
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="notes">Internal Notes</label>
                        <textarea id="notes" name="notes" 
                                  placeholder="Internal notes about advertisers, prizes, etc."><?php echo htmlspecialchars($notes ?? ''); ?></textarea>
                        <div class="form-help">These notes are only visible in the admin dashboard</div>
                    </div>
                </div>
                
                <div class="btn-group">
                    <button type="submit" class="btn btn-primary">Create Campaign</button>
                    <a href="dashboard.php" class="btn btn-secondary">Cancel</a>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        const areaCodes = <?php echo json_encode($areaCodes); ?>;

        function updateCampaignCode() {
            const area = document.getElementById('area').value;
            const zipCode = document.getElementById('zip_code').value;
            const customCode = document.getElementById('custom_code').value;
            const preview = document.getElementById('code_preview');

            if (customCode) {
                preview.textContent = 'Using custom code: ' + customCode;
                return;
            }

            if (!area) {
                preview.textContent = 'Auto-generated code will appear here';
                return;
            }

            // Generate preview code from dynamic area codes
            let areaCode = areaCodes[area] || area.substring(0, 3).toUpperCase();
            
            const date = new Date();
            const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
            const year = date.getFullYear().toString().slice(-2);
            
            let code = areaCode + '-' + month + year;
            if (zipCode) {
                code = areaCode + '-' + zipCode + '-' + month + year;
            }
            
            preview.textContent = 'Auto-generated: ' + code;
        }
        
        // Update code preview on page load
        document.addEventListener('DOMContentLoaded', function() {
            updateCampaignCode();
            
            // Update preview when custom code changes
            document.getElementById('custom_code').addEventListener('input', updateCampaignCode);
        });
        
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