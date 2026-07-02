<?php
// bulk_import.php - Script to bulk import business listings
require_once 'config.php';

// Simple admin check
if (!isLoggedIn() || !in_array($_SESSION['user_email'], ['hello@lbspotlight.com', 'admin@lbspotlight.com', 'exumandrew@gmail.com'])) {
    header('Location: login.php');
    exit;
}

$success = '';
$error = '';
$importCount = 0;

// Sample data structure for bulk import
$sampleBusinesses = [
    [
        'business_name' => 'Sample Restaurant',
        'description' => 'A great local restaurant serving delicious food.',
        'category' => 'restaurant',
        'address' => '123 Main St, Long Beach, CA 90801',
        'phone' => '(562) 555-0123',
        'email' => 'info@samplerestaurant.com',
        'website' => 'https://samplerestaurant.com',
        'plan_type' => 'basic',
        'is_hidden' => 1, // Hidden by default
    ],
    [
        'business_name' => 'Local Auto Repair',
        'description' => 'Professional auto repair services with 20+ years experience.',
        'category' => 'automotive',
        'address' => '456 Atlantic Ave, Long Beach, CA 90802',
        'phone' => '(562) 555-0456',
        'email' => 'service@localautorepair.com',
        'website' => 'https://localautorepair.com',
        'plan_type' => 'basic',
        'is_hidden' => 1,
    ],
    [
        'business_name' => 'Beach Fitness Gym',
        'description' => 'State-of-the-art fitness facility with personal training.',
        'category' => 'fitness',
        'address' => '789 Ocean Blvd, Long Beach, CA 90803',
        'phone' => '(562) 555-0789',
        'email' => 'info@beachfitness.com',
        'website' => 'https://beachfitness.com',
        'plan_type' => 'featured',
        'is_hidden' => 1,
    ],
    [
        'business_name' => 'Downtown Dental',
        'description' => 'Complete dental care for the whole family.',
        'category' => 'healthcare',
        'address' => '321 Pine Ave, Long Beach, CA 90802',
        'phone' => '(562) 555-0321',
        'email' => 'appointments@downtowndental.com',
        'website' => 'https://downtowndental.com',
        'plan_type' => 'elite',
        'is_hidden' => 1,
    ],
    [
        'business_name' => 'Creative Hair Salon',
        'description' => 'Professional hair styling and beauty services.',
        'category' => 'beauty',
        'address' => '654 2nd St, Long Beach, CA 90802',
        'phone' => '(562) 555-0654',
        'email' => 'book@creativehair.com',
        'website' => 'https://creativehair.com',
        'plan_type' => 'basic',
        'is_hidden' => 1,
    ]
];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    try {
        $db = getDB();
        
        if ($_POST['action'] === 'bulk_import') {
            // Create a default user for bulk imported businesses (or use admin user)
            $adminUserId = 1; // You might want to create a specific "bulk import" user
            
            $stmt = $db->prepare("
                INSERT INTO " . getTable('businesses') . " 
                (user_id, business_name, description, category, address, phone, email, website, plan_type, is_hidden, is_active, is_verified, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW())
            ");
            
            foreach ($sampleBusinesses as $business) {
                $result = $stmt->execute([
                    $adminUserId,
                    $business['business_name'],
                    $business['description'],
                    $business['category'],
                    $business['address'],
                    $business['phone'],
                    $business['email'],
                    $business['website'],
                    $business['plan_type'],
                    $business['is_hidden']
                ]);
                
                if ($result) {
                    $importCount++;
                }
            }
            
            $success = "Successfully imported $importCount businesses!";
        }
        
        if ($_POST['action'] === 'toggle_hidden') {
            $businessId = intval($_POST['business_id']);
            $isHidden = intval($_POST['is_hidden']);
            
            $stmt = $db->prepare("UPDATE " . getTable('businesses') . " SET is_hidden = ? WHERE id = ?");
            if ($stmt->execute([$isHidden, $businessId])) {
                $success = "Business visibility updated!";
            }
        }
        
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

// Get current businesses
$db = getDB();
$stmt = $db->query("
    SELECT id, business_name, category, plan_type, is_hidden, is_active, created_at 
    FROM " . getTable('businesses') . " 
    ORDER BY created_at DESC 
    LIMIT 50
");
$businesses = $stmt->fetchAll();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bulk Import - <?= SITE_NAME ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: #f8fafc;
            color: #333;
        }

        .header {
            background: white;
            border-bottom: 1px solid #e2e8f0;
            padding: 20px 0;
        }

        .header-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .brand-wordmark {
            font-size: 1.5rem;
            font-weight: 800;
            color: #38b6ff;
        }

        .header-nav {
            display: flex;
            gap: 20px;
            align-items: center;
        }

        .header-nav a {
            color: #64748b;
            text-decoration: none;
            font-weight: 500;
        }

        .header-nav a:hover {
            color: #38b6ff;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px;
        }

        .page-title {
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 30px;
            color: #333;
        }

        .card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            margin-bottom: 30px;
        }

        .section-title {
            font-size: 1.3rem;
            font-weight: 700;
            margin-bottom: 20px;
            color: #333;
        }

        .alert {
            padding: 15px 20px;
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

        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
        }

        .btn-primary {
            background: #38b6ff;
            color: white;
        }

        .btn-primary:hover {
            background: #0ea5e9;
        }

        .btn-success {
            background: #10b981;
            color: white;
        }

        .btn-success:hover {
            background: #059669;
        }

        .btn-warning {
            background: #f59e0b;
            color: white;
        }

        .btn-warning:hover {
            background: #d97706;
        }

        .btn-small {
            padding: 4px 8px;
            font-size: 12px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
        }

        th {
            background: #f8fafc;
            font-weight: 600;
        }

        tr:hover {
            background: #f8fafc;
        }

        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-hidden {
            background: #fef3c7;
            color: #92400e;
        }

        .status-visible {
            background: #d1fae5;
            color: #065f46;
        }

        .status-basic {
            background: #f1f5f9;
            color: #475569;
        }

        .status-featured {
            background: #dbeafe;
            color: #1e40af;
        }

        .status-elite {
            background: #fed7aa;
            color: #9a3412;
        }

        .import-info {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .import-info h3 {
            color: #0ea5e9;
            margin-bottom: 10px;
        }

        .import-info ul {
            margin-left: 20px;
            color: #64748b;
        }
    </style>
</head>

<body>
    <header class="header">
        <div class="header-container">
            <div class="brand-wordmark">Bulk Import Tool</div>
            <nav class="header-nav">
                <a href="admin.php">Admin Panel</a>
                <a href="directory.php">View Directory</a>
                <a href="logout.php">Logout</a>
            </nav>
        </div>
    </header>

    <div class="container">
        <?php if ($success): ?>
            <div class="alert success"><?= htmlspecialchars($success) ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="alert error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <h1 class="page-title">Bulk Import Business Listings</h1>

        <!-- Import Section -->
        <div class="card">
            <h2 class="section-title">Import Sample Businesses</h2>
            
            <div class="import-info">
                <h3>What this import will do:</h3>
                <ul>
                    <li>Import <?= count($sampleBusinesses) ?> sample business listings</li>
                    <li>All listings will be marked as <strong>HIDDEN</strong> by default</li>
                    <li>You can manually show/hide individual listings below</li>
                    <li>Listings include: Restaurant, Auto Repair, Gym, Dental, Hair Salon</li>
                    <li>Mix of Basic, Featured, and Elite plans</li>
                </ul>
            </div>

            <form method="POST">
                <input type="hidden" name="action" value="bulk_import">
                <button type="submit" class="btn btn-primary" onclick="return confirm('Import <?= count($sampleBusinesses) ?> sample businesses? They will be hidden by default.')">
                    Import <?= count($sampleBusinesses) ?> Sample Businesses
                </button>
            </form>
        </div>

        <!-- Current Businesses -->
        <div class="card">
            <h2 class="section-title">Current Businesses (Recent 50)</h2>
            
            <?php if (!empty($businesses)): ?>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Business Name</th>
                            <th>Category</th>
                            <th>Plan</th>
                            <th>Visibility</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($businesses as $business): ?>
                            <tr>
                                <td>#<?= $business['id'] ?></td>
                                <td><strong><?= htmlspecialchars($business['business_name']) ?></strong></td>
                                <td><?= htmlspecialchars(ucfirst($business['category'])) ?></td>
                                <td>
                                    <span class="status-badge status-<?= $business['plan_type'] ?>">
                                        <?= ucfirst($business['plan_type']) ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="status-badge <?= $business['is_hidden'] ? 'status-hidden' : 'status-visible' ?>">
                                        <?= $business['is_hidden'] ? 'Hidden' : 'Visible' ?>
                                    </span>
                                </td>
                                <td><?= date('M j, Y', strtotime($business['created_at'])) ?></td>
                                <td>
                                    <form method="POST" style="display: inline;">
                                        <input type="hidden" name="action" value="toggle_hidden">
                                        <input type="hidden" name="business_id" value="<?= $business['id'] ?>">
                                        <input type="hidden" name="is_hidden" value="<?= $business['is_hidden'] ? 0 : 1 ?>">
                                        <button type="submit" class="btn btn-small <?= $business['is_hidden'] ? 'btn-success' : 'btn-warning' ?>">
                                            <?= $business['is_hidden'] ? 'Show' : 'Hide' ?>
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <p style="color: #64748b; text-align: center; padding: 20px;">No businesses found</p>
            <?php endif; ?>
        </div>
    </div>

    <script>
        // Auto-refresh after import
        if (window.location.search.includes('imported=1')) {
            setTimeout(() => {
                window.location.href = window.location.pathname;
            }, 2000);
        }
    </script>
</body>
</html>