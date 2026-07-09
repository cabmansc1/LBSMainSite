<?php
// --- Strict, private, no-cache for admin pages ---
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Vary: Cookie, Authorization');

// admin/inquiries.php - View and manage business inquiries
require_once '../config.php';
require_once 'campaign_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();

$db = getDB();

// Ensure inquiries table exists
$db->exec("CREATE TABLE IF NOT EXISTS " . getTable('business_inquiries') . " (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (business_id)
)");

// Handle actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $action = $_POST['action'];

    if ($action === 'delete' && isset($_POST['inquiry_id'])) {
        $id = (int)$_POST['inquiry_id'];
        // Get business_id before deleting so we can update count
        $bizId = $db->prepare("SELECT business_id FROM " . getTable('business_inquiries') . " WHERE id = ?");
        $bizId->execute([$id]);
        $businessId = $bizId->fetchColumn();

        $stmt = $db->prepare("DELETE FROM " . getTable('business_inquiries') . " WHERE id = ?");
        $stmt->execute([$id]);

        if ($businessId) {
            $db->prepare("UPDATE " . getTable('businesses') . " SET inquiries_count = GREATEST(inquiries_count - 1, 0) WHERE id = ?")
               ->execute([$businessId]);
        }
        header('Location: inquiries.php?message=deleted');
        exit();
    }

    if ($action === 'clear_counters') {
        $db->exec("UPDATE " . getTable('businesses') . " SET inquiries_count = 0");
        $db->exec("UPDATE " . getTable('business_analytics') . " SET inquiries_count = 0");
        header('Location: inquiries.php?message=counters_cleared');
        exit();
    }

    if ($action === 'sync_counters') {
        $db->exec("UPDATE " . getTable('businesses') . " b
            SET inquiries_count = (
                SELECT COUNT(*) FROM " . getTable('business_inquiries') . " i WHERE i.business_id = b.id
            )");
        header('Location: inquiries.php?message=counters_synced');
        exit();
    }
}

// Filters
$filterBusiness = isset($_GET['business_id']) ? (int)$_GET['business_id'] : 0;

// Build query
$where = '';
$params = [];
if ($filterBusiness) {
    $where = ' WHERE i.business_id = ?';
    $params[] = $filterBusiness;
}

$inquiries = $db->prepare("
    SELECT i.*, b.business_name, b.slug
    FROM " . getTable('business_inquiries') . " i
    LEFT JOIN " . getTable('businesses') . " b ON b.id = i.business_id
    {$where}
    ORDER BY i.created_at DESC
");
$inquiries->execute($params);
$inquiries = $inquiries->fetchAll(PDO::FETCH_ASSOC);

// Get businesses that have inquiries (for filter dropdown)
$bizWithInquiries = $db->query("
    SELECT DISTINCT b.id, b.business_name
    FROM " . getTable('business_inquiries') . " i
    JOIN " . getTable('businesses') . " b ON b.id = i.business_id
    ORDER BY b.business_name
")->fetchAll(PDO::FETCH_ASSOC);

$success_message = '';
if (isset($_GET['message'])) {
    $msgs = [
        'deleted' => 'Inquiry deleted.',
        'counters_cleared' => 'All inquiry counters have been reset to zero.',
        'counters_synced' => 'Inquiry counters synced from actual inquiry records.',
    ];
    $success_message = $msgs[$_GET['message']] ?? '';
}

$currentPage = 'inquiries';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inquiries | <?= SITE_NAME ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .main-content { padding: 2rem 0; }

        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 12px; }
        .page-title { font-size: 1.75rem; font-weight: 700; color: #1e293b; }
        .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .btn { padding: .6rem 1.2rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all .2s; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: .85rem; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: #fff; }
        .btn-primary:hover { box-shadow: 0 4px 12px rgba(56,182,255,.4); }
        .btn-outline { background: #fff; color: #475569; border: 1px solid #cbd5e1; }
        .btn-outline:hover { border-color: #94a3b8; background: #f8fafc; }
        .btn-danger { background: #ef4444; color: #fff; padding: .4rem .75rem; font-size: .8rem; }
        .btn-danger:hover { background: #dc2626; }
        .btn-sm { padding: .4rem .75rem; font-size: .8rem; }

        .alert { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #d1fae5; border: 1px solid #10b981; color: #065f46; }

        .filter-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .filter-bar select { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: .85rem; background: #fff; }

        .stats-bar { display: flex; gap: 16px; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .stat-chip { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 20px; display: flex; flex-direction: column; align-items: center; }
        .stat-chip .num { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .stat-chip .label { font-size: .75rem; color: #64748b; font-weight: 500; }

        .table-container { background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: #fff; padding: .75rem 1rem; text-align: left; font-weight: 600; font-size: .85rem; }
        td { padding: .75rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-size: .85rem; }
        tr:hover td { background: #f8fafc; }
        .msg-text { max-width: 350px; line-height: 1.5; }
        .msg-text .full { display: none; }
        .msg-text .preview { cursor: pointer; }
        .msg-text .preview:hover { color: #0ea5e9; }
        .biz-link { color: #0ea5e9; text-decoration: none; font-weight: 600; }
        .biz-link:hover { text-decoration: underline; }
        .contact-info { color: #475569; }
        .contact-info a { color: #0ea5e9; text-decoration: none; }
        .date-cell { color: #64748b; white-space: nowrap; }
        .empty-state { text-align: center; padding: 3rem 1rem; color: #94a3b8; }

        @media (max-width: 768px) {
            table { font-size: .8rem; }
            td, th { padding: .5rem; }
            .page-header { flex-direction: column; align-items: flex-start; }
        }
    </style>
</head>
<body>
<?php require_once __DIR__ . '/includes/nav.php'; ?>

<div class="container main-content">
    <?php if ($success_message): ?>
        <div class="alert alert-success"><?= htmlspecialchars($success_message) ?></div>
    <?php endif; ?>

    <div class="page-header">
        <h1 class="page-title">Inquiries</h1>
        <div class="header-actions">
            <form method="POST" style="display:inline" onsubmit="return confirm('Sync counters from actual inquiry records?')">
                <input type="hidden" name="action" value="sync_counters">
                <button type="submit" class="btn btn-outline btn-sm">Sync Counters</button>
            </form>
            <form method="POST" style="display:inline" onsubmit="return confirm('Reset ALL inquiry counters to zero? This only clears the counters, not the inquiry records.')">
                <input type="hidden" name="action" value="clear_counters">
                <button type="submit" class="btn btn-danger btn-sm">Clear Counters</button>
            </form>
        </div>
    </div>

    <div class="stats-bar">
        <div class="stat-chip">
            <span class="num"><?= count($inquiries) ?></span>
            <span class="label"><?= $filterBusiness ? 'Filtered' : 'Total' ?> Inquiries</span>
        </div>
        <div class="stat-chip">
            <span class="num"><?= count($bizWithInquiries) ?></span>
            <span class="label">Businesses Contacted</span>
        </div>
    </div>

    <div class="filter-bar">
        <label style="font-weight:600; font-size:.85rem; color:#475569;">Filter by business:</label>
        <select onchange="window.location='inquiries.php'+(this.value ? '?business_id='+this.value : '')">
            <option value="">All Businesses</option>
            <?php foreach ($bizWithInquiries as $biz): ?>
                <option value="<?= $biz['id'] ?>" <?= $filterBusiness == $biz['id'] ? 'selected' : '' ?>><?= htmlspecialchars($biz['business_name']) ?></option>
            <?php endforeach; ?>
        </select>
        <?php if ($filterBusiness): ?>
            <a href="inquiries.php" class="btn btn-outline btn-sm">Clear Filter</a>
        <?php endif; ?>
    </div>

    <?php if (empty($inquiries)): ?>
        <div class="table-container">
            <div class="empty-state">
                <p style="font-size:1.1rem; margin-bottom:4px;">No inquiries found.</p>
                <p style="font-size:.85rem;">Inquiries will appear here when visitors use the contact form on business listings.</p>
            </div>
        </div>
    <?php else: ?>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Business</th>
                        <th>From</th>
                        <th>Contact</th>
                        <th>Message</th>
                        <th style="width:60px"></th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($inquiries as $inq): ?>
                    <tr>
                        <td class="date-cell">
                            <?= date('M j, Y', strtotime($inq['created_at'])) ?><br>
                            <small style="color:#94a3b8"><?= date('g:i A', strtotime($inq['created_at'])) ?></small>
                        </td>
                        <td>
                            <?php if ($inq['slug']): ?>
                                <a href="/business/<?= htmlspecialchars($inq['slug']) ?>" class="biz-link" target="_blank"><?= htmlspecialchars($inq['business_name']) ?></a>
                            <?php else: ?>
                                <span style="color:#94a3b8">Deleted business #<?= $inq['business_id'] ?></span>
                            <?php endif; ?>
                        </td>
                        <td style="font-weight:600"><?= htmlspecialchars($inq['name']) ?></td>
                        <td class="contact-info">
                            <?php if ($inq['email']): ?>
                                <a href="mailto:<?= htmlspecialchars($inq['email']) ?>"><?= htmlspecialchars($inq['email']) ?></a><br>
                            <?php endif; ?>
                            <?php if ($inq['phone']): ?>
                                <a href="tel:<?= htmlspecialchars($inq['phone']) ?>"><?= htmlspecialchars($inq['phone']) ?></a>
                            <?php endif; ?>
                        </td>
                        <td class="msg-text">
                            <?php
                            $msg = htmlspecialchars($inq['message']);
                            if (strlen($inq['message']) > 120):
                            ?>
                                <span class="preview" onclick="this.style.display='none';this.nextElementSibling.style.display='inline'"><?= htmlspecialchars(substr($inq['message'], 0, 120)) ?>... <small style="color:#0ea5e9">[more]</small></span>
                                <span class="full"><?= nl2br($msg) ?></span>
                            <?php else: ?>
                                <?= nl2br($msg) ?>
                            <?php endif; ?>
                        </td>
                        <td>
                            <form method="POST" onsubmit="return confirm('Delete this inquiry?')">
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="inquiry_id" value="<?= $inq['id'] ?>">
                                <button type="submit" class="btn btn-danger btn-sm" title="Delete">&#x2715;</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>
</body>
</html>
