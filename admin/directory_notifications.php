<?php
// --- Strict, private, no-cache for admin pages ---
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Vary: Cookie, Authorization');

// admin/directory_notifications.php - Directory Notifications Management
require_once '../config.php';
require_once 'campaign_functions.php';

// Check admin authentication
requireCampaignAdminLogin();

$currentAdmin = getCurrentCampaignAdmin();

try {
    $db = getDB();

    // Handle mark as notified
    if ($_POST && isset($_POST['action']) && $_POST['action'] === 'mark_notified' && isset($_POST['notification_id'])) {
        $notification_id = (int)$_POST['notification_id'];
        $stmt = $db->prepare("UPDATE directory_notifications SET notified = 1 WHERE id = ?");
        $stmt->execute([$notification_id]);
        header('Location: directory_notifications.php?message=marked');
        exit();
    }

    // Handle delete action
    if ($_POST && isset($_POST['action']) && $_POST['action'] === 'delete' && isset($_POST['notification_id'])) {
        $notification_id = (int)$_POST['notification_id'];
        $stmt = $db->prepare("DELETE FROM directory_notifications WHERE id = ?");
        $stmt->execute([$notification_id]);
        header('Location: directory_notifications.php?message=deleted');
        exit();
    }

    // Handle bulk mark as notified
    if ($_POST && isset($_POST['action']) && $_POST['action'] === 'mark_all_notified') {
        $db->exec("UPDATE directory_notifications SET notified = 1 WHERE notified = 0");
        header('Location: directory_notifications.php?message=all_marked');
        exit();
    }

    // Get all notifications
    $notifications = $db->query("SELECT * FROM directory_notifications ORDER BY signup_date DESC")->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    $error_message = "Database error: " . $e->getMessage();
    error_log("Directory notifications page error: " . $e->getMessage());
}

$success_message = '';
if (isset($_GET['message'])) {
    switch ($_GET['message']) {
        case 'deleted':
            $success_message = 'Notification deleted successfully.';
            break;
        case 'marked':
            $success_message = 'Marked as notified.';
            break;
        case 'all_marked':
            $success_message = 'All notifications marked as sent.';
            break;
    }
}

$pending_count = count(array_filter($notifications ?? [], fn($n) => $n['notified'] == 0));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Directory Notifications | <?php echo SITE_NAME; ?></title>
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

        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .page-title { font-size: 1.75rem; font-weight: 700; color: #1e293b; }
        .header-actions { display: flex; gap: 1rem; }
        .btn { padding: .75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all .3s ease; border: none; cursor: pointer; display: inline-block; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(56,182,255,.4); }
        .btn-success { background: #10b981; color: white; }
        .btn-success:hover { background: #059669; }
        .btn-danger { background: #ef4444; color: white; padding: .5rem .75rem; font-size: .875rem; }
        .btn-danger:hover { background: #ff6b00; }
        .btn-sm { padding: .5rem .75rem; font-size: .875rem; }

        .alert { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #d1fae5; border: 1px solid #10b981; color: #065f46; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        .table-container { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; padding: 1rem; text-align: left; font-weight: 600; }
        td { padding: 1rem; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
        tr:hover { background-color: #f8fafc; }
        tr:last-child td { border-bottom: none; }
        tr.pending { background-color: #fffbeb; }
        tr.pending:hover { background-color: #fef3c7; }

        .email-link { color: #38b6ff; text-decoration: none; font-weight: 500; }
        .email-link:hover { text-decoration: underline; }

        .status-badge { padding: .375rem .75rem; border-radius: 20px; font-size: .75rem; font-weight: 600; text-transform: uppercase; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-sent { background: #d1fae5; color: #065f46; }

        .empty-state { text-align: center; padding: 3rem; color: #64748b; }
        .empty-state-icon { font-size: 4rem; margin-bottom: 1rem; }

        .stats-bar { display: flex; gap: 2rem; margin-bottom: 2rem; padding: 1rem 1.5rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0; }
        .stat-item { display: flex; align-items: center; gap: .5rem; }
        .stat-number { font-size: 1.5rem; font-weight: 700; color: #38b6ff; }
        .stat-number.warning { color: #f59e0b; }
        .stat-label { color: #64748b; font-size: .875rem; }

        .date-cell { color: #64748b; font-size: .875rem; }
        .actions-cell { display: flex; gap: .5rem; }

        @media (max-width: 768px) {
            .table-container { overflow-x: auto; }
            table { min-width: 600px; }
            .page-header { flex-direction: column; align-items: flex-start; }
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
                <h1 class="page-title">Directory Notifications</h1>
                <div class="header-actions">
                    <?php if ($pending_count > 0): ?>
                        <form method="POST" style="display:inline;" onsubmit="return confirm('Mark all as notified?');">
                            <input type="hidden" name="action" value="mark_all_notified">
                            <button type="submit" class="btn btn-success">Mark All Sent</button>
                        </form>
                    <?php endif; ?>
                    <a href="dashboard.php" class="btn btn-primary">Back to Dashboard</a>
                </div>
            </div>

            <div class="stats-bar">
                <div class="stat-item">
                    <span class="stat-number"><?php echo count($notifications ?? []); ?></span>
                    <span class="stat-label">Total Subscribed</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number warning"><?php echo $pending_count; ?></span>
                    <span class="stat-label">Pending Notification</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number"><?php echo count($notifications ?? []) - $pending_count; ?></span>
                    <span class="stat-label">Already Notified</span>
                </div>
            </div>

            <?php if (empty($notifications)): ?>
                <div class="table-container">
                    <div class="empty-state">
                        <div class="empty-state-icon">📧</div>
                        <h3>No notification signups yet</h3>
                        <p>People who sign up for directory notifications will appear here.</p>
                    </div>
                </div>
            <?php else: ?>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Signup Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($notifications as $notification): ?>
                                <tr class="<?php echo $notification['notified'] == 0 ? 'pending' : ''; ?>">
                                    <td>
                                        <a href="mailto:<?php echo htmlspecialchars($notification['email']); ?>" class="email-link">
                                            <?php echo htmlspecialchars($notification['email']); ?>
                                        </a>
                                    </td>
                                    <td class="date-cell">
                                        <?php echo date('M j, Y', strtotime($notification['signup_date'])); ?>
                                        <br>
                                        <?php echo date('g:i A', strtotime($notification['signup_date'])); ?>
                                    </td>
                                    <td>
                                        <?php if ($notification['notified'] == 0): ?>
                                            <span class="status-badge status-pending">Pending</span>
                                        <?php else: ?>
                                            <span class="status-badge status-sent">Notified</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <div class="actions-cell">
                                            <?php if ($notification['notified'] == 0): ?>
                                                <form method="POST" style="display:inline;">
                                                    <input type="hidden" name="action" value="mark_notified">
                                                    <input type="hidden" name="notification_id" value="<?php echo (int)$notification['id']; ?>">
                                                    <button type="submit" class="btn btn-success btn-sm">Mark Sent</button>
                                                </form>
                                            <?php endif; ?>
                                            <form method="POST" style="display:inline;" onsubmit="return confirm('Delete this notification signup?');">
                                                <input type="hidden" name="action" value="delete">
                                                <input type="hidden" name="notification_id" value="<?php echo (int)$notification['id']; ?>">
                                                <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                                            </form>
                                        </div>
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
