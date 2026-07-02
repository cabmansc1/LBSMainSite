<?php
// --- Strict, private, no-cache for admin pages ---
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Vary: Cookie, Authorization');

// admin/leads.php - Leads Management
require_once '../config.php';
require_once 'campaign_functions.php';

// Check admin authentication
requireCampaignAdminLogin();

$currentAdmin = getCurrentCampaignAdmin();

try {
    $db = getDB();

    // Handle delete action
    if ($_POST && isset($_POST['action']) && $_POST['action'] === 'delete' && isset($_POST['lead_id'])) {
        $lead_id = (int)$_POST['lead_id'];
        $stmt = $db->prepare("DELETE FROM leads WHERE id = ?");
        $stmt->execute([$lead_id]);
        header('Location: leads.php?message=deleted');
        exit();
    }

    // Get all leads
    $leads = $db->query("SELECT * FROM leads ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    $error_message = "Database error: " . $e->getMessage();
    error_log("Leads page error: " . $e->getMessage());
}

$success_message = '';
if (isset($_GET['message'])) {
    switch ($_GET['message']) {
        case 'deleted':
            $success_message = 'Lead deleted successfully.';
            break;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leads | <?php echo SITE_NAME; ?></title>
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
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .main-content { padding: 2rem 0; }

        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .page-title { font-size: 1.75rem; font-weight: 700; color: #1e293b; }
        .btn { padding: .75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all .3s ease; border: none; cursor: pointer; display: inline-block; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(56,182,255,.4); }
        .btn-danger { background: #ef4444; color: white; padding: .5rem .75rem; font-size: .875rem; }
        .btn-danger:hover { background: #ff6b00; }

        .alert { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #d1fae5; border: 1px solid #10b981; color: #065f46; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        .table-container { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; padding: 1rem; text-align: left; font-weight: 600; }
        td { padding: 1rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        tr:hover { background-color: #f8fafc; }
        tr:last-child td { border-bottom: none; }

        .lead-company { font-weight: 600; color: #1e293b; margin-bottom: .25rem; }
        .lead-contact { color: #64748b; font-size: .875rem; }
        .lead-email { color: #38b6ff; text-decoration: none; }
        .lead-email:hover { text-decoration: underline; }
        .lead-date { color: #64748b; font-size: .875rem; }
        .lead-package { background: #f1f5f9; padding: .5rem .75rem; border-radius: 6px; font-size: .875rem; display: inline-block; margin-top: .5rem; }

        .empty-state { text-align: center; padding: 3rem; color: #64748b; }
        .empty-state-icon { font-size: 4rem; margin-bottom: 1rem; }

        .stats-bar { display: flex; gap: 2rem; margin-bottom: 2rem; padding: 1rem 1.5rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0; }
        .stat-item { display: flex; align-items: center; gap: .5rem; }
        .stat-number { font-size: 1.5rem; font-weight: 700; color: #38b6ff; }
        .stat-label { color: #64748b; font-size: .875rem; }

        @media (max-width: 768px) {
            .table-container { overflow-x: auto; }
            table { min-width: 800px; }
            .page-header { flex-direction: column; gap: 1rem; align-items: flex-start; }
            .stats-bar { flex-direction: column; gap: 1rem; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'leads'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="main-content">
            <?php if ($success_message): ?>
                <div class="alert alert-success"><?php echo $success_message; ?></div>
            <?php endif; ?>

            <?php if (isset($error_message)): ?>
                <div class="alert alert-danger"><?php echo $error_message; ?></div>
            <?php endif; ?>

            <div class="page-header">
                <h1 class="page-title">Leads</h1>
                <a href="dashboard.php" class="btn btn-primary">Back to Dashboard</a>
            </div>

            <div class="stats-bar">
                <div class="stat-item">
                    <span class="stat-number"><?php echo count($leads ?? []); ?></span>
                    <span class="stat-label">Total Leads</span>
                </div>
            </div>

            <?php if (empty($leads)): ?>
                <div class="table-container">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <h3>No leads yet</h3>
                        <p>New leads will appear here when forms are submitted.</p>
                    </div>
                </div>
            <?php else: ?>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Company / Contact</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Package</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($leads as $lead): ?>
                                <tr>
                                    <td>
                                        <div class="lead-company"><?php echo htmlspecialchars($lead['company_name']); ?></div>
                                        <div class="lead-contact"><?php echo htmlspecialchars($lead['contact_name']); ?></div>
                                    </td>
                                    <td>
                                        <a href="mailto:<?php echo htmlspecialchars($lead['email']); ?>" class="lead-email">
                                            <?php echo htmlspecialchars($lead['email']); ?>
                                        </a>
                                    </td>
                                    <td><?php echo htmlspecialchars($lead['phone'] ?? '-'); ?></td>
                                    <td>
                                        <?php if (!empty($lead['package_description'])): ?>
                                            <span class="lead-package"><?php echo htmlspecialchars($lead['package_description']); ?></span>
                                        <?php elseif (!empty($lead['location'])): ?>
                                            <span class="lead-package"><?php echo htmlspecialchars($lead['location']); ?></span>
                                        <?php else: ?>
                                            -
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <div class="lead-date">
                                            <?php echo date('M j, Y', strtotime($lead['created_at'])); ?>
                                            <br>
                                            <?php echo date('g:i A', strtotime($lead['created_at'])); ?>
                                        </div>
                                    </td>
                                    <td>
                                        <form method="POST" style="display:inline;" onsubmit="return confirm('Are you sure you want to delete this lead?');">
                                            <input type="hidden" name="action" value="delete">
                                            <input type="hidden" name="lead_id" value="<?php echo (int)$lead['id']; ?>">
                                            <button type="submit" class="btn btn-danger">Delete</button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
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
