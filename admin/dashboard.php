<?php
// --- Strict, private, no-cache for admin pages ---
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Vary: Cookie, Authorization');

// admin/dashboard.php - Admin Overview Dashboard
require_once '../config.php';
require_once 'campaign_functions.php';
require_once 'pipeline_functions.php';
require_once 'blog_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();
$currentPage = 'dashboard';

try {
    $db = getDB();

    // Campaign stats
    $campStats = [];
    $campStats['active'] = (int)$db->query("SELECT COUNT(*) FROM campaigns WHERE status = 'active'")->fetchColumn();
    $campStats['registrations_7d'] = (int)$db->query("SELECT COUNT(*) FROM campaign_registrations WHERE registration_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();

    // Leads
    $leadStats = [];
    $leadStats['total'] = (int)$db->query("SELECT COUNT(*) FROM leads")->fetchColumn();
    $leadStats['new_24h'] = (int)$db->query("SELECT COUNT(*) FROM leads WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)")->fetchColumn();

    // Directory
    $dirStats = [];
    $dirStats['listings'] = (int)$db->query("SELECT COUNT(*) FROM " . getTable('businesses') . " WHERE is_active = 1")->fetchColumn();
    $dirStats['views_7d'] = (int)$db->query("SELECT COALESCE(SUM(views_count), 0) FROM " . getTable('business_analytics') . " WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)")->fetchColumn();
    $dirStats['inquiries_7d'] = (int)$db->query("SELECT COALESCE(SUM(inquiries_count), 0) FROM " . getTable('business_analytics') . " WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)")->fetchColumn();
    $dirStats['pending_signups'] = (int)$db->query("SELECT COUNT(*) FROM directory_signups WHERE status = 'pending'")->fetchColumn();

    // Pipeline
    ensurePipelineTables();
    $pipeStats = getPipelineStats();
    $almostFullCards = getAlmostFullCards();

    // Ensure tables
    ensureAreasTable();
    ensureBlogTables();

    // Active campaigns for quick list
    $activeCampaigns = $db->query("
        SELECT c.*, (SELECT COUNT(*) FROM campaign_registrations cr WHERE cr.campaign_id = c.id) as total_registrations
        FROM campaigns c WHERE c.status = 'active' ORDER BY c.registration_end ASC
    ")->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    $error_message = "Database error: " . $e->getMessage();
    error_log("Dashboard error: " . $e->getMessage());
}

// Handle quick actions
if ($_POST) {
    $action = $_POST['action'] ?? '';
    $campaign_id = $_POST['campaign_id'] ?? '';
    if ($action === 'toggle_status' && $campaign_id) {
        try {
            toggleCampaignStatus($campaign_id);
            header('Cache-Control: no-store');
            header('Location: dashboard.php?message=status_updated');
            exit();
        } catch (Exception $e) {
            $error_message = "Error updating campaign status.";
        }
    }
}

$success_message = '';
if (isset($_GET['message'])) {
    $messages = [
        'status_updated' => 'Campaign status updated.',
        'campaign_added' => 'New campaign added.',
        'campaign_updated' => 'Campaign updated.',
        'campaign_deleted' => 'Campaign deleted.',
    ];
    $success_message = $messages[$_GET['message']] ?? '';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard | <?= SITE_NAME ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; }
        .container { max-width: 1400px; margin: 0 auto; padding: 0 20px; }
        .main { padding: 24px 0 60px; }

        /* Alerts */
        .alert { padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-weight: 500; font-size: .9rem; }
        .alert-success { background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
        .alert-warn { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px solid #f59e0b; color: #92400e; display: flex; align-items: center; gap: 10px; }
        .alert-warn a { color: #b45309; font-weight: 700; text-decoration: underline; }

        /* Section panels */
        .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 32px; align-items: stretch; }
        .panel { background: white; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,.04); overflow: hidden; display: flex; flex-direction: column; }
        .panel-header { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .panel-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; }
        .panel-link { font-size: .85rem; font-weight: 600; color: #38b6ff; text-decoration: none; }
        .panel-link:hover { color: #0ea5e9; }
        .panel-body { padding: 28px; flex: 1; display: flex; flex-direction: column; }

        /* Stat rows inside panels */
        .stat-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .stat-box { flex: 1; min-width: 110px; text-align: center; padding: 22px 12px; background: #f8fafc; border-radius: 10px; }
        .stat-num { font-size: 2.1rem; font-weight: 800; color: #38b6ff; line-height: 1.2; }
        .stat-num.green { color: #10b981; }
        .stat-num.orange { color: #f59e0b; }
        .stat-num.red { color: #ef4444; }
        .stat-lbl { font-size: .75rem; color: #64748b; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: .3px; }

        /* Mini list */
        .mini-list { list-style: none; }
        .mini-list li { padding: 10px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: .875rem; }
        .mini-list li:last-child { border-bottom: none; }
        .mini-list .item-name { font-weight: 600; color: #1e293b; }
        .mini-list .item-meta { color: #64748b; font-size: .8rem; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: .75rem; font-weight: 600; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-orange { background: #fef3c7; color: #92400e; }

        /* Quick actions — pinned to bottom of panel */
        .actions-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: auto; padding-top: 20px; }
        .btn { padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: .825rem; border: none; cursor: pointer; transition: all .2s; display: inline-block; }
        .btn-primary { background: #38b6ff; color: white; }
        .btn-primary:hover { background: #0ea5e9; }
        .btn-secondary { background: #f1f5f9; color: #475569; }
        .btn-secondary:hover { background: #e2e8f0; }
        .btn-warn { background: #f59e0b; color: white; }
        .btn-success { background: #10b981; color: white; }

        /* Full-width panel */
        .section-full { margin-bottom: 24px; }

        @media (max-width: 768px) {
            .section-grid { grid-template-columns: 1fr; }
            .stat-row { gap: 8px; }
            .stat-box { min-width: 70px; padding: 14px 6px; }
            .stat-num { font-size: 1.5rem; }
        }
    </style>
</head>
<body>
    <?php require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="main">

            <?php if ($success_message): ?>
                <div class="alert alert-success"><?= htmlspecialchars($success_message) ?></div>
            <?php endif; ?>
            <?php if (isset($error_message)): ?>
                <div class="alert alert-danger"><?= htmlspecialchars($error_message) ?></div>
            <?php endif; ?>

            <!-- Attention alerts -->
            <?php if (($leadStats['new_24h'] ?? 0) > 0 || ($dirStats['pending_signups'] ?? 0) > 0): ?>
                <div class="alert alert-warn">
                    <span>Attention:</span>
                    <?php if ($leadStats['new_24h'] > 0): ?>
                        <a href="leads.php"><?= $leadStats['new_24h'] ?> new lead<?= $leadStats['new_24h'] > 1 ? 's' : '' ?></a>
                    <?php endif; ?>
                    <?php if ($leadStats['new_24h'] > 0 && $dirStats['pending_signups'] > 0): ?> | <?php endif; ?>
                    <?php if ($dirStats['pending_signups'] > 0): ?>
                        <a href="directory_signups.php"><?= $dirStats['pending_signups'] ?> pending signup<?= $dirStats['pending_signups'] > 1 ? 's' : '' ?></a>
                    <?php endif; ?>
                </div>
            <?php endif; ?>

            <?php if (!empty($almostFullCards)): ?>
                <div class="alert alert-warn">
                    <span>Pipeline:</span>
                    <?php foreach ($almostFullCards as $afc): ?>
                        <a href="card_detail.php?id=<?= $afc['id'] ?>"><?= htmlspecialchars($afc['card_name']) ?></a>
                        (<?= $afc['total_spots'] - $afc['spots_filled'] ?> spot<?= ($afc['total_spots'] - $afc['spots_filled']) !== 1 ? 's' : '' ?> left)
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <!-- Top row: Directory + Leads -->
            <div class="section-grid">
                <div class="panel">
                    <div class="panel-header">
                        <span class="panel-title">Directory</span>
                        <a href="manage_directory.php" class="panel-link">Manage &rarr;</a>
                    </div>
                    <div class="panel-body">
                        <div class="stat-row">
                            <div class="stat-box">
                                <div class="stat-num"><?= number_format($dirStats['listings']) ?></div>
                                <div class="stat-lbl">Listings</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-num"><?= number_format($dirStats['views_7d']) ?></div>
                                <div class="stat-lbl">Views (7d)</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-num"><?= number_format($dirStats['inquiries_7d']) ?></div>
                                <div class="stat-lbl">Inquiries (7d)</div>
                            </div>
                        </div>
                        <div class="actions-row">
                            <a href="manage_directory.php" class="btn btn-primary">Listings</a>
                            <a href="directory_signups.php" class="btn btn-secondary">Signups<?php if ($dirStats['pending_signups'] > 0): ?> <span class="badge badge-orange"><?= $dirStats['pending_signups'] ?></span><?php endif; ?></a>
                            <a href="directory_notifications.php" class="btn btn-secondary">Notifications</a>
                            <a href="manage_directory_settings.php" class="btn btn-secondary">Settings</a>
                        </div>
                    </div>
                </div>

                <div class="panel">
                    <div class="panel-header">
                        <span class="panel-title">Leads</span>
                        <a href="leads.php" class="panel-link">View All &rarr;</a>
                    </div>
                    <div class="panel-body">
                        <div class="stat-row">
                            <div class="stat-box">
                                <div class="stat-num"><?= number_format($leadStats['total']) ?></div>
                                <div class="stat-lbl">Total Leads</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-num <?= $leadStats['new_24h'] > 0 ? 'green' : '' ?>"><?= number_format($leadStats['new_24h']) ?></div>
                                <div class="stat-lbl">New (24h)</div>
                            </div>
                        </div>
                        <div class="actions-row">
                            <a href="leads.php" class="btn btn-primary">View Leads</a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Second row: Pipeline + Campaigns -->
            <div class="section-grid">
                <div class="panel">
                    <div class="panel-header">
                        <span class="panel-title">Pipeline</span>
                        <a href="pipeline.php" class="panel-link">Open Pipeline &rarr;</a>
                    </div>
                    <div class="panel-body">
                        <div class="stat-row">
                            <div class="stat-box">
                                <div class="stat-num"><?= $pipeStats['total_cards'] - $pipeStats['mailed'] ?></div>
                                <div class="stat-lbl">Active Cards</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-num"><?= $pipeStats['filling'] ?></div>
                                <div class="stat-lbl">Filling</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-num green">$<?= number_format($pipeStats['total_revenue'], 0) ?></div>
                                <div class="stat-lbl">Revenue</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-num orange">$<?= number_format($pipeStats['outstanding'], 0) ?></div>
                                <div class="stat-lbl">Outstanding</div>
                            </div>
                        </div>
                        <div class="actions-row">
                            <a href="pipeline.php" class="btn btn-primary">Pipeline</a>
                            <a href="advertisers.php" class="btn btn-secondary">Advertisers</a>
                            <a href="manage_mailers.php" class="btn btn-secondary">Mailers</a>
                            <a href="manage_areas.php" class="btn btn-secondary">Areas</a>
                        </div>
                    </div>
                </div>

                <div class="panel">
                    <div class="panel-header">
                        <span class="panel-title">Campaigns</span>
                        <a href="add_campaign.php" class="panel-link">+ New Campaign</a>
                    </div>
                    <div class="panel-body">
                        <div class="stat-row">
                            <div class="stat-box">
                                <div class="stat-num"><?= $campStats['active'] ?></div>
                                <div class="stat-lbl">Active</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-num"><?= number_format($campStats['registrations_7d']) ?></div>
                                <div class="stat-lbl">Registrations (7d)</div>
                            </div>
                        </div>

                        <?php if (!empty($activeCampaigns)): ?>
                            <ul class="mini-list" style="margin-top: 16px;">
                                <?php foreach (array_slice($activeCampaigns, 0, 4) as $c): ?>
                                    <li>
                                        <div>
                                            <a href="edit_campaign.php?id=<?= (int)$c['id'] ?>" class="item-name" style="color:#1e293b;text-decoration:none;" title="Edit campaign"><?= htmlspecialchars($c['campaign_name']) ?></a>
                                            <span class="item-meta"> &mdash; <?= htmlspecialchars($c['area']) ?></span>
                                        </div>
                                        <div>
                                            <span class="badge badge-blue"><?= (int)$c['total_registrations'] ?> reg</span>
                                            <?php
                                            $days_left = max(0, (int)ceil((strtotime($c['registration_end']) - time()) / 86400));
                                            ?>
                                            <span class="badge <?= $days_left <= 7 ? 'badge-orange' : 'badge-green' ?>"><?= $days_left ?>d left</span>
                                            <a href="edit_campaign.php?id=<?= (int)$c['id'] ?>" class="btn btn-secondary" style="padding:3px 10px;font-size:.75rem;margin-left:4px;">Edit</a>
                                        </div>
                                    </li>
                                <?php endforeach; ?>
                            </ul>
                        <?php endif; ?>

                        <div class="actions-row">
                            <a href="add_campaign.php" class="btn btn-primary">New Campaign</a>
                            <a href="view_registrations.php" class="btn btn-secondary">Registrations</a>
                            <a href="export_data.php" class="btn btn-secondary">Export</a>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <script>
    setTimeout(function() {
        document.querySelectorAll('.alert-success, .alert-danger').forEach(function(el) {
            el.style.transition = 'opacity .3s, transform .3s';
            el.style.opacity = '0';
            el.style.transform = 'translateY(-10px)';
            setTimeout(function() { el.remove(); }, 300);
        });
    }, 5000);
    </script>
</body>
</html>
