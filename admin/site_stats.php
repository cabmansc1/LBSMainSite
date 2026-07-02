<?php
// --- Strict, private, no-cache for admin pages ---
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Vary: Cookie, Authorization');

// admin/site_stats.php - Manage homepage stats bar
require_once '../config.php';
require_once 'campaign_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();

$db = getDB();

// Ensure site_stats table exists (use utf8mb4 for emoji support)
$db->exec("CREATE TABLE IF NOT EXISTS site_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_key VARCHAR(50) NOT NULL UNIQUE,
    stat_value VARCHAR(100) NOT NULL DEFAULT '',
    stat_label VARCHAR(100) NOT NULL DEFAULT '',
    stat_icon VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    display_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

// Ensure stat_icon column supports utf8mb4 (fix for existing tables)
try {
    $db->exec("ALTER TABLE site_stats MODIFY stat_icon VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT ''");
} catch (PDOException $e) {
    // Column may already be correct
}

// Seed defaults if empty
$count = (int)$db->query("SELECT COUNT(*) FROM site_stats")->fetchColumn();
if ($count === 0) {
    $db->exec("SET NAMES utf8mb4");
    $defaults = [
        ['postcards_mailed', '50,000+', 'Postcards Mailed', '&#x1F4EC;', 1, 1],
        ['businesses_served', '75+', 'Local Businesses Served', '&#x1F3E2;', 2, 1],
        ['households_reached', '10,000+', 'Households Per Mailing', '&#x1F3E0;', 3, 1],
        ['service_areas', '6', 'Service Areas', '&#x1F4CD;', 4, 1],
    ];
    $stmt = $db->prepare("INSERT INTO site_stats (stat_key, stat_value, stat_label, stat_icon, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?)");
    foreach ($defaults as $row) {
        $stmt->execute($row);
    }
}

$success_message = '';
$error_message = '';

// Handle POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'update_stats') {
        $ids = $_POST['stat_id'] ?? [];
        $values = $_POST['stat_value'] ?? [];
        $labels = $_POST['stat_label'] ?? [];
        $icons = $_POST['stat_icon'] ?? [];
        $orders = $_POST['display_order'] ?? [];
        $actives = $_POST['is_active'] ?? [];

        $stmt = $db->prepare("UPDATE site_stats SET stat_value = ?, stat_label = ?, stat_icon = ?, display_order = ?, is_active = ? WHERE id = ?");
        foreach ($ids as $i => $id) {
            $stmt->execute([
                trim($values[$i] ?? ''),
                trim($labels[$i] ?? ''),
                trim($icons[$i] ?? ''),
                (int)($orders[$i] ?? 0),
                in_array($id, $actives) ? 1 : 0,
                (int)$id
            ]);
        }
        $success_message = 'Stats updated successfully.';
    }

    if ($action === 'add_stat') {
        $key = preg_replace('/[^a-z0-9_]/', '', strtolower(str_replace(' ', '_', trim($_POST['new_key'] ?? ''))));
        $value = trim($_POST['new_value'] ?? '');
        $label = trim($_POST['new_label'] ?? '');
        $icon = trim($_POST['new_icon'] ?? '');

        if (empty($key) || empty($value) || empty($label)) {
            $error_message = 'Key, value, and label are required.';
        } else {
            $maxOrder = (int)$db->query("SELECT COALESCE(MAX(display_order), 0) FROM site_stats")->fetchColumn();
            $stmt = $db->prepare("INSERT INTO site_stats (stat_key, stat_value, stat_label, stat_icon, display_order, is_active) VALUES (?, ?, ?, ?, ?, 1)");
            $stmt->execute([$key, $value, $label, $icon, $maxOrder + 1]);
            $success_message = 'Stat added successfully.';
        }
    }

    if ($action === 'delete_stat' && isset($_POST['stat_id'])) {
        $db->prepare("DELETE FROM site_stats WHERE id = ?")->execute([(int)$_POST['stat_id']]);
        $success_message = 'Stat deleted.';
    }
}

// Load all stats
$stats = $db->query("SELECT * FROM site_stats ORDER BY display_order ASC")->fetchAll(PDO::FETCH_ASSOC);

$currentPage = 'site_stats';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Homepage Stats | <?= SITE_NAME ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; }
        .container { max-width: 900px; margin: 0 auto; padding: 0 20px; }
        .main-content { padding: 2rem 0; }

        .page-header { margin-bottom: 1.5rem; }
        .page-title { font-size: 1.75rem; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
        .page-subtitle { color: #64748b; font-size: .9rem; }

        .alert { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #d1fae5; border: 1px solid #10b981; color: #065f46; }
        .alert-error { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; padding: 24px; margin-bottom: 24px; }
        .card h3 { font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 16px; }

        .stat-row { display: grid; grid-template-columns: 50px 60px 1fr 1fr 60px 50px 40px; gap: 10px; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
        .stat-row:last-child { border-bottom: none; }
        .stat-row label { font-size: .75rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
        .stat-header { font-size: .7rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }

        input[type="text"], input[type="number"] {
            width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px;
            font-size: .85rem; font-family: inherit; transition: border-color .2s;
        }
        input:focus { outline: none; border-color: #38b6ff; }
        input.icon-input { text-align: center; font-size: 1.2rem; }
        input.order-input { text-align: center; }

        .btn { padding: .6rem 1.2rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all .2s; border: none; cursor: pointer; font-size: .85rem; display: inline-flex; align-items: center; gap: 6px; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: #fff; }
        .btn-primary:hover { box-shadow: 0 4px 12px rgba(56,182,255,.4); }
        .btn-danger { background: #ef4444; color: #fff; padding: .4rem .6rem; font-size: .75rem; }
        .btn-danger:hover { background: #dc2626; }
        .btn-outline { background: #fff; color: #475569; border: 1px solid #cbd5e1; }
        .btn-outline:hover { border-color: #94a3b8; }

        .add-row { display: grid; grid-template-columns: 1fr 60px 1fr 1fr auto; gap: 10px; align-items: end; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
        .add-row .form-group label { display: block; font-size: .7rem; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; }

        .preview-section { margin-top: 24px; }
        .preview-bar {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            padding: 24px 40px;
            display: flex;
            justify-content: center;
            gap: 48px;
            flex-wrap: wrap;
            border-radius: 12px;
        }
        .preview-stat { text-align: center; }
        .preview-stat .icon { font-size: 1.5rem; margin-bottom: 4px; }
        .preview-stat .value { font-size: 1.8rem; font-weight: 800; color: #38b6ff; line-height: 1.2; }
        .preview-stat .label { font-size: .8rem; color: #94a3b8; font-weight: 500; margin-top: 2px; }

        .checkbox-cell { display: flex; align-items: center; justify-content: center; }
        .checkbox-cell input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }

        @media (max-width: 768px) {
            .stat-row { grid-template-columns: 1fr; gap: 6px; padding: 16px 0; }
            .stat-header { display: none; }
            .add-row { grid-template-columns: 1fr; }
            .preview-bar { gap: 24px; padding: 20px; }
        }
    </style>
</head>
<body>
<?php require_once __DIR__ . '/includes/nav.php'; ?>

<div class="container main-content">
    <?php if ($success_message): ?>
        <div class="alert alert-success"><?= htmlspecialchars($success_message) ?></div>
    <?php endif; ?>
    <?php if ($error_message): ?>
        <div class="alert alert-error"><?= htmlspecialchars($error_message) ?></div>
    <?php endif; ?>

    <div class="page-header">
        <h1 class="page-title">Homepage Stats Bar</h1>
        <p class="page-subtitle">Manage the statistics displayed on the homepage. Changes appear immediately.</p>
    </div>

    <!-- Edit existing stats -->
    <div class="card">
        <h3>Stats</h3>
        <form method="POST">
            <input type="hidden" name="action" value="update_stats">

            <div class="stat-row stat-header">
                <div>Active</div>
                <div>Icon</div>
                <div>Value</div>
                <div>Label</div>
                <div>Order</div>
                <div></div>
                <div></div>
            </div>

            <?php foreach ($stats as $stat): ?>
            <div class="stat-row">
                <div class="checkbox-cell">
                    <input type="checkbox" name="is_active[]" value="<?= $stat['id'] ?>" <?= $stat['is_active'] ? 'checked' : '' ?>>
                </div>
                <div>
                    <input type="text" name="stat_icon[]" value="<?= htmlspecialchars($stat['stat_icon']) ?>" class="icon-input" maxlength="20">
                </div>
                <div>
                    <input type="text" name="stat_value[]" value="<?= htmlspecialchars($stat['stat_value']) ?>" placeholder="e.g. 50,000+">
                </div>
                <div>
                    <input type="text" name="stat_label[]" value="<?= htmlspecialchars($stat['stat_label']) ?>" placeholder="e.g. Postcards Mailed">
                </div>
                <div>
                    <input type="number" name="display_order[]" value="<?= $stat['display_order'] ?>" class="order-input" min="0">
                </div>
                <div>
                    <input type="hidden" name="stat_id[]" value="<?= $stat['id'] ?>">
                </div>
                <div>
                    <button type="button" class="btn btn-danger" title="Delete" onclick="deleteStat(<?= $stat['id'] ?>)">&times;</button>
                </div>
            </div>
            <?php endforeach; ?>

            <div style="margin-top: 16px; text-align: right;">
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>
    </div>

    <!-- Add new stat -->
    <div class="card">
        <h3>Add New Stat</h3>
        <form method="POST">
            <input type="hidden" name="action" value="add_stat">
            <div class="add-row">
                <div class="form-group">
                    <label>Key (no spaces)</label>
                    <input type="text" name="new_key" placeholder="e.g. years_experience">
                </div>
                <div class="form-group">
                    <label>Icon</label>
                    <input type="text" name="new_icon" placeholder="📊" class="icon-input" maxlength="20">
                </div>
                <div class="form-group">
                    <label>Value</label>
                    <input type="text" name="new_value" placeholder="e.g. 100+">
                </div>
                <div class="form-group">
                    <label>Label</label>
                    <input type="text" name="new_label" placeholder="e.g. Happy Clients">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button type="submit" class="btn btn-outline">Add</button>
                </div>
            </div>
        </form>
    </div>

    <!-- Preview -->
    <div class="card preview-section">
        <h3>Preview</h3>
        <div class="preview-bar">
            <?php foreach ($stats as $stat): ?>
                <?php if ($stat['is_active']): ?>
                <div class="preview-stat">
                    <?php if ($stat['stat_icon']): ?>
                        <div class="icon"><?= $stat['stat_icon'] /* HTML entities render directly */ ?></div>
                    <?php endif; ?>
                    <div class="value"><?= htmlspecialchars($stat['stat_value']) ?></div>
                    <div class="label"><?= htmlspecialchars($stat['stat_label']) ?></div>
                </div>
                <?php endif; ?>
            <?php endforeach; ?>
        </div>
    </div>
</div>

<!-- Hidden delete form (outside main form) -->
<form id="deleteForm" method="POST" style="display:none">
    <input type="hidden" name="action" value="delete_stat">
    <input type="hidden" name="stat_id" id="deleteStatId" value="">
</form>

<script>
function deleteStat(id) {
    if (confirm('Delete this stat?')) {
        document.getElementById('deleteStatId').value = id;
        document.getElementById('deleteForm').submit();
    }
}
</script>
</body>
</html>
