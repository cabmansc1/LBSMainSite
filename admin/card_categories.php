<?php
// admin/card_categories.php - Manage business categories for neighborhood card exclusivity
require_once '../config.php';
require_once 'campaign_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();

try {
    $db = getDB();
    $message = '';
    $messageType = '';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';

        if ($action === 'add_category') {
            $catName = sanitizeInput($_POST['category_name'] ?? '');
            if ($catName) {
                $db->prepare("INSERT INTO " . getTable('card_categories') . " (name, display_order) VALUES (?, ?)")
                   ->execute([$catName, (int)($_POST['cat_display_order'] ?: 0)]);
                $message = 'Category added.';
                $messageType = 'success';
            }
        }

        if ($action === 'update_category') {
            $catName = sanitizeInput($_POST['category_name'] ?? '');
            if ($catName) {
                $db->prepare("UPDATE " . getTable('card_categories') . " SET name = ?, display_order = ? WHERE id = ?")
                   ->execute([$catName, (int)($_POST['cat_display_order'] ?: 0), (int)$_POST['cat_id']]);
                $message = 'Category updated.';
                $messageType = 'success';
            }
        }

        if ($action === 'delete_category') {
            $catId = (int)$_POST['cat_id'];
            $usedCheck = $db->prepare("SELECT COUNT(*) FROM " . getTable('card_orders') . " WHERE card_category_id = ? AND status IN ('paid','pending')");
            $usedCheck->execute([$catId]);
            if ((int)$usedCheck->fetchColumn() > 0) {
                $message = 'Cannot delete — this category is used by active orders.';
                $messageType = 'danger';
            } else {
                $db->prepare("DELETE FROM " . getTable('card_categories') . " WHERE id = ?")->execute([$catId]);
                $message = 'Category deleted.';
                $messageType = 'success';
            }
        }

        if ($action === 'toggle_category') {
            $db->prepare("UPDATE " . getTable('card_categories') . " SET is_active = NOT is_active WHERE id = ?")->execute([(int)$_POST['cat_id']]);
            $message = 'Category visibility toggled.';
            $messageType = 'success';
        }
    }

    // Fetch categories with usage counts
    $cardCategories = $db->query("
        SELECT cc.*, COUNT(o.id) as order_count
        FROM " . getTable('card_categories') . " cc
        LEFT JOIN " . getTable('card_orders') . " o ON o.card_category_id = cc.id AND o.status IN ('paid','pending')
        GROUP BY cc.id
        ORDER BY cc.display_order, cc.name
    ")->fetchAll(PDO::FETCH_ASSOC);

    $activeCount = 0;
    $inactiveCount = 0;
    foreach ($cardCategories as $c) {
        if ($c['is_active']) $activeCount++; else $inactiveCount++;
    }

} catch (Exception $e) {
    $error_message = "Database error: " . $e->getMessage();
    error_log("Card categories error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Categories | <?= SITE_NAME ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #334155; }
        .container { max-width: 900px; margin: 0 auto; padding: 2rem 20px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .page-title { font-size: 1.75rem; font-weight: 800; color: #1e293b; }
        .page-sub { color: #64748b; font-size: 0.92rem; margin-top: 4px; }
        .btn { padding: 0.6rem 1.2rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s; border: none; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-secondary { background: #64748b; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
        .btn-sm { padding: 0.35rem 0.7rem; font-size: 0.78rem; }
        .alert { padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        .stats-bar { display: flex; gap: 16px; margin-bottom: 1.5rem; }
        .stat-pill { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 20px; text-align: center; }
        .stat-pill-num { font-size: 1.3rem; font-weight: 800; color: #38b6ff; }
        .stat-pill-label { font-size: 0.78rem; color: #64748b; margin-top: 2px; }

        .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; margin-bottom: 1.5rem; overflow: hidden; }
        .card-header { background: #f8fafc; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }

        .add-form { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .add-form form { display: flex; gap: 10px; align-items: end; flex-wrap: wrap; }
        .add-form .field { flex: 1; min-width: 200px; }
        .add-form .field-sm { width: 80px; }
        .add-form label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; color: #374151; }
        .add-form input { width: 100%; padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.9rem; font-family: inherit; }
        .add-form input:focus { outline: none; border-color: #38b6ff; }

        .cat-table { width: 100%; border-collapse: collapse; }
        .cat-table th, .cat-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 0.88rem; }
        .cat-table th { background: #f8fafc; font-weight: 600; color: #374151; font-size: 0.8rem; text-transform: uppercase; }
        .cat-table tr:hover { background: #f9fafb; }

        .status-active { color: #166534; }
        .status-inactive { color: #94a3b8; }

        .usage-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 600; background: #f1f5f9; color: #64748b; }
        .usage-badge.used { background: #dbeafe; color: #1e40af; }

        .action-btns { display: flex; gap: 0.4rem; }

        .inline-edit { display: flex; gap: 6px; align-items: center; }
        .inline-edit input { padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 0.85rem; font-family: inherit; }
        .inline-edit input[name="category_name"] { width: 180px; }
        .inline-edit input[name="cat_display_order"] { width: 50px; text-align: center; }

        @media (max-width: 640px) {
            .add-form form { flex-direction: column; }
            .add-form .field, .add-form .field-sm { width: 100%; }
            .stats-bar { flex-wrap: wrap; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'cards'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="page-header">
            <div>
                <h1 class="page-title">Business Categories</h1>
                <p class="page-sub">Each category is exclusive to one advertiser per neighborhood card.</p>
            </div>
            <a href="manage_cards.php" class="btn btn-secondary">Back to Cards</a>
        </div>

        <?php if (!empty($message)): ?>
            <div class="alert alert-<?= $messageType ?>"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>
        <?php if (isset($error_message)): ?>
            <div class="alert alert-danger"><?= htmlspecialchars($error_message) ?></div>
        <?php endif; ?>

        <div class="stats-bar">
            <div class="stat-pill">
                <div class="stat-pill-num"><?= count($cardCategories ?? []) ?></div>
                <div class="stat-pill-label">Total</div>
            </div>
            <div class="stat-pill">
                <div class="stat-pill-num" style="color: #10b981;"><?= $activeCount ?></div>
                <div class="stat-pill-label">Active</div>
            </div>
            <div class="stat-pill">
                <div class="stat-pill-num" style="color: #94a3b8;"><?= $inactiveCount ?></div>
                <div class="stat-pill-label">Hidden</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <span>All Categories</span>
            </div>

            <div class="add-form">
                <form method="POST">
                    <input type="hidden" name="action" value="add_category">
                    <div class="field">
                        <label>New Category</label>
                        <input type="text" name="category_name" required placeholder="e.g., Pool Service">
                    </div>
                    <div class="field-sm">
                        <label>Order</label>
                        <input type="number" name="cat_display_order" value="0" min="0">
                    </div>
                    <button type="submit" class="btn btn-primary">Add</button>
                </form>
            </div>

            <?php if (empty($cardCategories)): ?>
                <div style="text-align: center; padding: 3rem; color: #64748b;">No categories yet. Add one above.</div>
            <?php else: ?>
                <div style="overflow-x: auto;">
                    <table class="cat-table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Category Name</th>
                                <th>Status</th>
                                <th>Active Orders</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($cardCategories as $cat): ?>
                            <tr style="<?= !$cat['is_active'] ? 'opacity: 0.55;' : '' ?>">
                                <td><?= $cat['display_order'] ?></td>
                                <td><strong><?= htmlspecialchars($cat['name']) ?></strong></td>
                                <td>
                                    <?php if ($cat['is_active']): ?>
                                        <span class="status-active" style="font-weight: 600; font-size: 0.85rem;">Active</span>
                                    <?php else: ?>
                                        <span class="status-inactive" style="font-weight: 600; font-size: 0.85rem;">Hidden</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ((int)$cat['order_count'] > 0): ?>
                                        <span class="usage-badge used"><?= $cat['order_count'] ?> order<?= $cat['order_count'] > 1 ? 's' : '' ?></span>
                                    <?php else: ?>
                                        <span class="usage-badge">None</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <div class="action-btns">
                                        <form method="POST" class="inline-edit">
                                            <input type="hidden" name="action" value="update_category">
                                            <input type="hidden" name="cat_id" value="<?= $cat['id'] ?>">
                                            <input type="text" name="category_name" value="<?= htmlspecialchars($cat['name']) ?>">
                                            <input type="number" name="cat_display_order" value="<?= $cat['display_order'] ?>" min="0">
                                            <button type="submit" class="btn btn-secondary btn-sm">Save</button>
                                        </form>
                                        <form method="POST" style="display: inline;">
                                            <input type="hidden" name="action" value="toggle_category">
                                            <input type="hidden" name="cat_id" value="<?= $cat['id'] ?>">
                                            <button type="submit" class="btn btn-sm" style="background: <?= $cat['is_active'] ? '#f59e0b' : '#10b981' ?>; color: white;">
                                                <?= $cat['is_active'] ? 'Hide' : 'Show' ?>
                                            </button>
                                        </form>
                                        <?php if ((int)$cat['order_count'] === 0): ?>
                                        <form method="POST" style="display: inline;" onsubmit="return confirm('Delete this category?');">
                                            <input type="hidden" name="action" value="delete_category">
                                            <input type="hidden" name="cat_id" value="<?= $cat['id'] ?>">
                                            <button type="submit" class="btn btn-danger btn-sm">Del</button>
                                        </form>
                                        <?php endif; ?>
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
</body>
</html>
