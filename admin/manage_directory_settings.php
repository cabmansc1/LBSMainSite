<?php
// --- Strict, private, no-cache for admin pages ---
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Vary: Cookie, Authorization');

// admin/manage_directory_settings.php - Directory Categories & Locations Management
require_once '../config.php';
require_once 'campaign_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();

$db = getDB();
ensureDirectoryTaxonomyTables();

$success_message = '';
$error_message = '';

// Handle POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $csrf = $_POST['csrf_token'] ?? '';

    if (!validateCSRFToken($csrf)) {
        $error_message = 'Invalid security token. Please try again.';
    } else {
        try {
            // --- CATEGORY ACTIONS ---
            if ($action === 'add_category') {
                $name = trim(sanitizeInput($_POST['display_name'] ?? ''));
                if (empty($name)) throw new Exception('Category name is required.');
                $slug = generateSlug($name);
                $order = (int)($_POST['display_order'] ?? 0);

                // Ensure unique slug
                $check = $db->prepare("SELECT COUNT(*) FROM directory_categories WHERE slug = ?");
                $check->execute([$slug]);
                if ($check->fetchColumn() > 0) throw new Exception('A category with a similar name already exists.');

                $stmt = $db->prepare("INSERT INTO directory_categories (slug, display_name, display_order) VALUES (?, ?, ?)");
                $stmt->execute([$slug, $name, $order]);
                $success_message = 'Category added successfully.';

            } elseif ($action === 'edit_category') {
                $id = (int)($_POST['id'] ?? 0);
                if (!$id) throw new Exception('Invalid category ID.');
                $name = trim(sanitizeInput($_POST['display_name'] ?? ''));
                if (empty($name)) throw new Exception('Category name is required.');
                $order = (int)($_POST['display_order'] ?? 0);
                $isActive = isset($_POST['is_active']) ? 1 : 0;

                $stmt = $db->prepare("UPDATE directory_categories SET display_name = ?, display_order = ?, is_active = ? WHERE id = ?");
                $stmt->execute([$name, $order, $isActive, $id]);
                $success_message = 'Category updated successfully.';

            } elseif ($action === 'delete_category') {
                $id = (int)($_POST['id'] ?? 0);
                if (!$id) throw new Exception('Invalid category ID.');

                // Check usage
                $row = $db->prepare("SELECT slug FROM directory_categories WHERE id = ?");
                $row->execute([$id]);
                $slug = $row->fetchColumn();
                if ($slug) {
                    $usage = $db->prepare("SELECT COUNT(*) FROM directory_businesses WHERE category = ?");
                    $usage->execute([$slug]);
                    if ($usage->fetchColumn() > 0) {
                        throw new Exception('Cannot delete this category — it is assigned to existing businesses. Deactivate it instead.');
                    }
                }

                $db->prepare("DELETE FROM directory_categories WHERE id = ?")->execute([$id]);
                $success_message = 'Category deleted successfully.';

            // --- TAG ACTIONS ---
            } elseif ($action === 'add_tag') {
                $name = trim(sanitizeInput($_POST['display_name'] ?? ''));
                if (empty($name)) throw new Exception('Tag name is required.');
                $slug = generateSlug($name);
                $order = (int)($_POST['display_order'] ?? 0);
                $catSlug = trim($_POST['category_slug'] ?? '');
                $catSlug = $catSlug === '' ? null : $catSlug;

                $check = $db->prepare("SELECT COUNT(*) FROM directory_tags WHERE slug = ?");
                $check->execute([$slug]);
                if ($check->fetchColumn() > 0) throw new Exception('A tag with a similar name already exists.');

                $stmt = $db->prepare("INSERT INTO directory_tags (slug, display_name, category_slug, display_order) VALUES (?, ?, ?, ?)");
                $stmt->execute([$slug, $name, $catSlug, $order]);
                $success_message = 'Tag added successfully.';

            } elseif ($action === 'edit_tag') {
                $id = (int)($_POST['id'] ?? 0);
                if (!$id) throw new Exception('Invalid tag ID.');
                $name = trim(sanitizeInput($_POST['display_name'] ?? ''));
                if (empty($name)) throw new Exception('Tag name is required.');
                $order = (int)($_POST['display_order'] ?? 0);
                $isActive = isset($_POST['is_active']) ? 1 : 0;
                $catSlug = trim($_POST['category_slug'] ?? '');
                $catSlug = $catSlug === '' ? null : $catSlug;

                $stmt = $db->prepare("UPDATE directory_tags SET display_name = ?, category_slug = ?, display_order = ?, is_active = ? WHERE id = ?");
                $stmt->execute([$name, $catSlug, $order, $isActive, $id]);
                $success_message = 'Tag updated successfully.';

            } elseif ($action === 'delete_tag') {
                $id = (int)($_POST['id'] ?? 0);
                if (!$id) throw new Exception('Invalid tag ID.');

                $usage = $db->prepare("SELECT COUNT(*) FROM directory_business_tags WHERE tag_id = ?");
                $usage->execute([$id]);
                if ($usage->fetchColumn() > 0) {
                    throw new Exception('Cannot delete this tag — it is assigned to existing businesses. Deactivate it instead.');
                }

                $db->prepare("DELETE FROM directory_tags WHERE id = ?")->execute([$id]);
                $success_message = 'Tag deleted successfully.';

            // --- LOCATION ACTIONS ---
            } elseif ($action === 'add_location') {
                $name = trim(sanitizeInput($_POST['display_name'] ?? ''));
                if (empty($name)) throw new Exception('Location name is required.');
                $slug = generateSlug($name);
                $order = (int)($_POST['display_order'] ?? 0);

                $check = $db->prepare("SELECT COUNT(*) FROM directory_locations WHERE slug = ?");
                $check->execute([$slug]);
                if ($check->fetchColumn() > 0) throw new Exception('A location with a similar name already exists.');

                $stmt = $db->prepare("INSERT INTO directory_locations (slug, display_name, display_order) VALUES (?, ?, ?)");
                $stmt->execute([$slug, $name, $order]);
                $success_message = 'Location added successfully.';

            } elseif ($action === 'edit_location') {
                $id = (int)($_POST['id'] ?? 0);
                if (!$id) throw new Exception('Invalid location ID.');
                $name = trim(sanitizeInput($_POST['display_name'] ?? ''));
                if (empty($name)) throw new Exception('Location name is required.');
                $order = (int)($_POST['display_order'] ?? 0);
                $isActive = isset($_POST['is_active']) ? 1 : 0;

                $stmt = $db->prepare("UPDATE directory_locations SET display_name = ?, display_order = ?, is_active = ? WHERE id = ?");
                $stmt->execute([$name, $order, $isActive, $id]);
                $success_message = 'Location updated successfully.';

            } elseif ($action === 'delete_location') {
                $id = (int)($_POST['id'] ?? 0);
                if (!$id) throw new Exception('Invalid location ID.');

                $row = $db->prepare("SELECT slug FROM directory_locations WHERE id = ?");
                $row->execute([$id]);
                $slug = $row->fetchColumn();
                if ($slug) {
                    $usage = $db->prepare("SELECT COUNT(*) FROM directory_businesses WHERE location_area = ?");
                    $usage->execute([$slug]);
                    if ($usage->fetchColumn() > 0) {
                        throw new Exception('Cannot delete this location — it is assigned to existing businesses. Deactivate it instead.');
                    }
                }

                $db->prepare("DELETE FROM directory_locations WHERE id = ?")->execute([$id]);
                $success_message = 'Location deleted successfully.';
            }
        } catch (Exception $e) {
            $error_message = $e->getMessage();
        }
    }
}

// Fetch all entries for display
$categories = $db->query("SELECT * FROM directory_categories ORDER BY display_order, display_name")->fetchAll(PDO::FETCH_ASSOC);
$locations = $db->query("SELECT * FROM directory_locations ORDER BY display_order, display_name")->fetchAll(PDO::FETCH_ASSOC);
$tags = $db->query("SELECT * FROM directory_tags ORDER BY display_order, display_name")->fetchAll(PDO::FETCH_ASSOC);

// Get usage counts
$catUsage = [];
$locUsage = [];
$tagUsage = [];
try {
    foreach ($db->query("SELECT category, COUNT(*) as cnt FROM directory_businesses GROUP BY category")->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $catUsage[$r['category']] = (int)$r['cnt'];
    }
    foreach ($db->query("SELECT location_area, COUNT(*) as cnt FROM directory_businesses GROUP BY location_area")->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $locUsage[$r['location_area']] = (int)$r['cnt'];
    }
    foreach ($db->query("SELECT tag_id, COUNT(*) as cnt FROM directory_business_tags GROUP BY tag_id")->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $tagUsage[$r['tag_id']] = (int)$r['cnt'];
    }
} catch (Exception $e) {}

// Build category name lookup for tags display
$catNameLookup = [];
foreach ($categories as $cat) {
    $catNameLookup[$cat['slug']] = $cat['display_name'];
}

$csrf_token = generateCSRFToken();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Directory Settings - <?php echo SITE_NAME; ?></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
        .navbar { background: linear-gradient(135deg, #1f2937, #111827); padding: 1rem 0; }
        .container { max-width: 1400px; margin: 0 auto; padding: 0 20px; }
        .navbar .container { display: flex; align-items: center; justify-content: space-between; }
        .navbar-brand { color: white; text-decoration: none; font-size: 1.25rem; font-weight: 700; }
        .navbar-nav { display: flex; align-items: center; gap: 0.5rem; }
        .nav-link { color: rgba(255,255,255,.7); text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; transition: all 0.2s; }
        .nav-link:hover { color: white; background: rgba(255,255,255,.1); }
        .nav-link.active { color: white; background: rgba(255,255,255,.1); }

        .main-content { padding: 2rem 0; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .page-title { font-size: 1.75rem; font-weight: 700; }

        .alert { padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        .section { margin-bottom: 3rem; }
        .section h2 { font-size: 1.35rem; font-weight: 700; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; }

        .add-form { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; padding: 1.25rem; margin-bottom: 1.5rem; }
        .add-form .form-row { display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { font-size: 0.8rem; font-weight: 600; color: #64748b; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .form-group input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; }
        .form-group input:focus { outline: none; border-color: #38b6ff; box-shadow: 0 0 0 3px rgba(56,182,255,.15); }

        .btn { padding: 0.5rem 1.25rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(56,182,255,.3); }
        .btn-success { background: #10b981; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-danger:hover { background: #dc2626; }
        .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
        .btn-secondary { background: #6b7280; color: white; }

        .table-wrapper { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
        td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
        tr:last-child td { border-bottom: none; }
        tr:hover { background: #f8fafc; }

        .status-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
        .status-active { background: #dcfce7; color: #166534; }
        .status-inactive { background: #fef3c7; color: #92400e; }

        .usage-count { font-size: 0.8rem; color: #64748b; }

        .actions { display: flex; gap: 0.5rem; }

        /* Modal */
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.5); z-index: 1000; align-items: center; justify-content: center; }
        .modal-overlay.show { display: flex; }
        .modal { background: white; border-radius: 16px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .modal-header h3 { font-size: 1.1rem; }
        .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; padding: 0; line-height: 1; }
        .modal-body { padding: 1.5rem; }
        .modal-body .form-group { margin-bottom: 1rem; }
        .modal-body .form-group input { width: 100%; }
        .modal-body .form-group .checkbox-row { display: flex; align-items: center; gap: 0.5rem; }
        .modal-body .form-group .checkbox-row input { width: auto; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; }
        .slug-display { font-size: 0.8rem; color: #64748b; font-family: monospace; margin-top: 0.25rem; }

        /* Tag groups */
        .tag-group { margin-bottom: 1.5rem; }
        .tag-group-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 0.6rem 1rem; background: #f1f5f9; border-radius: 8px 8px 0 0;
            border: 1px solid #e2e8f0; border-bottom: none;
        }
        .tag-group-label { font-weight: 700; font-size: 0.95rem; color: #1e293b; }
        .tag-group-count { font-size: 0.8rem; color: #64748b; font-weight: 500; }
        .tag-group .table-wrapper { border-radius: 0 0 12px 12px; }

        /* Filter tabs */
        .tag-filter-btn {
            padding: 0.4rem 0.9rem; border-radius: 20px; border: 2px solid #e2e8f0;
            background: white; color: #64748b; font-size: 0.8rem; font-weight: 600;
            cursor: pointer; transition: all 0.15s;
        }
        .tag-filter-btn:hover { border-color: #38b6ff; color: #0284c7; }
        .tag-filter-btn.active { background: #0ea5e9; color: white; border-color: #0ea5e9; }

        @media (max-width: 768px) {
            .add-form .form-row { flex-direction: column; }
            .page-header { flex-direction: column; gap: 1rem; align-items: flex-start; }
            .navbar-nav { flex-wrap: wrap; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'directory'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="main-content">
            <div class="page-header">
                <h1 class="page-title">Directory Settings</h1>
                <a href="manage_directory.php" class="btn btn-secondary">&larr; Back to Directory</a>
            </div>

            <?php if ($success_message): ?>
                <div class="alert alert-success"><?php echo htmlspecialchars($success_message); ?></div>
            <?php endif; ?>
            <?php if ($error_message): ?>
                <div class="alert alert-danger"><?php echo htmlspecialchars($error_message); ?></div>
            <?php endif; ?>

            <!-- CATEGORIES SECTION -->
            <div class="section">
                <h2>Categories</h2>

                <div class="add-form">
                    <form method="POST">
                        <input type="hidden" name="action" value="add_category">
                        <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Display Name</label>
                                <input type="text" name="display_name" required placeholder="e.g. Pet Services">
                            </div>
                            <div class="form-group" style="flex:0 0 100px;">
                                <label>Order</label>
                                <input type="number" name="display_order" value="0" min="0">
                            </div>
                            <div class="form-group">
                                <button type="submit" class="btn btn-primary">+ Add Category</button>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Display Name</th>
                                <th>Slug</th>
                                <th>Order</th>
                                <th>Status</th>
                                <th>Businesses</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($categories)): ?>
                                <tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">No categories found.</td></tr>
                            <?php else: ?>
                                <?php foreach ($categories as $cat): ?>
                                <tr>
                                    <td><strong><?php echo htmlspecialchars($cat['display_name']); ?></strong></td>
                                    <td><code style="font-size:.8rem; background:#f1f5f9; padding:2px 6px; border-radius:4px;"><?php echo htmlspecialchars($cat['slug']); ?></code></td>
                                    <td><?php echo (int)$cat['display_order']; ?></td>
                                    <td>
                                        <?php if ($cat['is_active']): ?>
                                            <span class="status-badge status-active">Active</span>
                                        <?php else: ?>
                                            <span class="status-badge status-inactive">Inactive</span>
                                        <?php endif; ?>
                                    </td>
                                    <td><span class="usage-count"><?php echo $catUsage[$cat['slug']] ?? 0; ?></span></td>
                                    <td>
                                        <div class="actions">
                                            <button class="btn btn-sm btn-primary" onclick="openEditModal('category', <?php echo htmlspecialchars(json_encode($cat)); ?>)">Edit</button>
                                            <form method="POST" style="display:inline;" onsubmit="return confirm('Delete this category?');">
                                                <input type="hidden" name="action" value="delete_category">
                                                <input type="hidden" name="id" value="<?php echo $cat['id']; ?>">
                                                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                                <button type="submit" class="btn btn-sm btn-danger">Delete</button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- LOCATIONS SECTION -->
            <div class="section">
                <h2>Locations</h2>

                <div class="add-form">
                    <form method="POST">
                        <input type="hidden" name="action" value="add_location">
                        <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Display Name</label>
                                <input type="text" name="display_name" required placeholder="e.g. West Ashley">
                            </div>
                            <div class="form-group" style="flex:0 0 100px;">
                                <label>Order</label>
                                <input type="number" name="display_order" value="0" min="0">
                            </div>
                            <div class="form-group">
                                <button type="submit" class="btn btn-primary">+ Add Location</button>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Display Name</th>
                                <th>Slug</th>
                                <th>Order</th>
                                <th>Status</th>
                                <th>Businesses</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($locations)): ?>
                                <tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">No locations found.</td></tr>
                            <?php else: ?>
                                <?php foreach ($locations as $loc): ?>
                                <tr>
                                    <td><strong><?php echo htmlspecialchars($loc['display_name']); ?></strong></td>
                                    <td><code style="font-size:.8rem; background:#f1f5f9; padding:2px 6px; border-radius:4px;"><?php echo htmlspecialchars($loc['slug']); ?></code></td>
                                    <td><?php echo (int)$loc['display_order']; ?></td>
                                    <td>
                                        <?php if ($loc['is_active']): ?>
                                            <span class="status-badge status-active">Active</span>
                                        <?php else: ?>
                                            <span class="status-badge status-inactive">Inactive</span>
                                        <?php endif; ?>
                                    </td>
                                    <td><span class="usage-count"><?php echo $locUsage[$loc['slug']] ?? 0; ?></span></td>
                                    <td>
                                        <div class="actions">
                                            <button class="btn btn-sm btn-primary" onclick="openEditModal('location', <?php echo htmlspecialchars(json_encode($loc)); ?>)">Edit</button>
                                            <form method="POST" style="display:inline;" onsubmit="return confirm('Delete this location?');">
                                                <input type="hidden" name="action" value="delete_location">
                                                <input type="hidden" name="id" value="<?php echo $loc['id']; ?>">
                                                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                                <button type="submit" class="btn btn-sm btn-danger">Delete</button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
            <!-- TAGS SECTION -->
            <div class="section">
                <h2>Tags</h2>

                <div class="add-form">
                    <form method="POST">
                        <input type="hidden" name="action" value="add_tag">
                        <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Display Name</label>
                                <input type="text" name="display_name" required placeholder="e.g. HVAC">
                            </div>
                            <div class="form-group" style="flex:1.5;">
                                <label>Category</label>
                                <select name="category_slug" style="padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem;">
                                    <option value="">Cross-Category (applies to all)</option>
                                    <?php foreach ($categories as $cat): ?>
                                        <option value="<?php echo htmlspecialchars($cat['slug']); ?>"><?php echo htmlspecialchars($cat['display_name']); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group" style="flex:0 0 100px;">
                                <label>Order</label>
                                <input type="number" name="display_order" value="0" min="0">
                            </div>
                            <div class="form-group">
                                <button type="submit" class="btn btn-primary">+ Add Tag</button>
                            </div>
                        </div>
                    </form>
                </div>

                <!-- Filter tabs -->
                <div style="display:flex; gap:6px; margin-bottom:1rem; flex-wrap:wrap;">
                    <button class="tag-filter-btn active" data-filter="all" onclick="filterTagGroup('all', this)">All</button>
                    <button class="tag-filter-btn" data-filter="__cross__" onclick="filterTagGroup('__cross__', this)">Cross-Category</button>
                    <?php foreach ($categories as $cat): ?>
                        <button class="tag-filter-btn" data-filter="<?php echo htmlspecialchars($cat['slug']); ?>" onclick="filterTagGroup('<?php echo htmlspecialchars($cat['slug']); ?>', this)"><?php echo htmlspecialchars($cat['display_name']); ?></button>
                    <?php endforeach; ?>
                </div>

                <?php
                // Group tags by category
                $tagGroups = ['__cross__' => []];
                foreach ($categories as $cat) {
                    $tagGroups[$cat['slug']] = [];
                }
                foreach ($tags as $tag) {
                    $g = $tag['category_slug'] ?: '__cross__';
                    $tagGroups[$g][] = $tag;
                }
                ?>

                <!-- Cross-Category tags -->
                <div class="tag-group" data-group="__cross__">
                    <div class="tag-group-header">
                        <span class="tag-group-label">Cross-Category Tags</span>
                        <span class="tag-group-count"><?php echo count($tagGroups['__cross__']); ?> tag<?php echo count($tagGroups['__cross__']) !== 1 ? 's' : ''; ?></span>
                    </div>
                    <?php if (empty($tagGroups['__cross__'])): ?>
                        <p style="padding:1rem; color:#94a3b8; font-size:.875rem;">No cross-category tags yet. These apply to all categories (e.g. Veteran-Owned, Women-Owned).</p>
                    <?php else: ?>
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th>Tag Name</th><th>Slug</th><th>Order</th><th>Status</th><th>Used</th><th>Actions</th></tr></thead>
                            <tbody>
                                <?php foreach ($tagGroups['__cross__'] as $tag): ?>
                                <tr>
                                    <td><strong><?php echo htmlspecialchars($tag['display_name']); ?></strong></td>
                                    <td><code style="font-size:.8rem; background:#f1f5f9; padding:2px 6px; border-radius:4px;"><?php echo htmlspecialchars($tag['slug']); ?></code></td>
                                    <td><?php echo (int)$tag['display_order']; ?></td>
                                    <td><?php echo $tag['is_active'] ? '<span class="status-badge status-active">Active</span>' : '<span class="status-badge status-inactive">Inactive</span>'; ?></td>
                                    <td><span class="usage-count"><?php echo $tagUsage[$tag['id']] ?? 0; ?></span></td>
                                    <td>
                                        <div class="actions">
                                            <button class="btn btn-sm btn-primary" onclick="openEditModal('tag', <?php echo htmlspecialchars(json_encode($tag)); ?>)">Edit</button>
                                            <form method="POST" style="display:inline;" onsubmit="return confirm('Delete this tag?');">
                                                <input type="hidden" name="action" value="delete_tag">
                                                <input type="hidden" name="id" value="<?php echo $tag['id']; ?>">
                                                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                                <button type="submit" class="btn btn-sm btn-danger">Delete</button>
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

                <!-- Category-specific tag groups -->
                <?php foreach ($categories as $cat):
                    $catTags = $tagGroups[$cat['slug']] ?? [];
                ?>
                <div class="tag-group" data-group="<?php echo htmlspecialchars($cat['slug']); ?>">
                    <div class="tag-group-header">
                        <span class="tag-group-label"><?php echo htmlspecialchars($cat['display_name']); ?></span>
                        <span class="tag-group-count"><?php echo count($catTags); ?> tag<?php echo count($catTags) !== 1 ? 's' : ''; ?></span>
                    </div>
                    <?php if (empty($catTags)): ?>
                        <p style="padding:1rem; color:#94a3b8; font-size:.875rem;">No tags for this category yet.</p>
                    <?php else: ?>
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th>Tag Name</th><th>Slug</th><th>Order</th><th>Status</th><th>Used</th><th>Actions</th></tr></thead>
                            <tbody>
                                <?php foreach ($catTags as $tag): ?>
                                <tr>
                                    <td><strong><?php echo htmlspecialchars($tag['display_name']); ?></strong></td>
                                    <td><code style="font-size:.8rem; background:#f1f5f9; padding:2px 6px; border-radius:4px;"><?php echo htmlspecialchars($tag['slug']); ?></code></td>
                                    <td><?php echo (int)$tag['display_order']; ?></td>
                                    <td><?php echo $tag['is_active'] ? '<span class="status-badge status-active">Active</span>' : '<span class="status-badge status-inactive">Inactive</span>'; ?></td>
                                    <td><span class="usage-count"><?php echo $tagUsage[$tag['id']] ?? 0; ?></span></td>
                                    <td>
                                        <div class="actions">
                                            <button class="btn btn-sm btn-primary" onclick="openEditModal('tag', <?php echo htmlspecialchars(json_encode($tag)); ?>)">Edit</button>
                                            <form method="POST" style="display:inline;" onsubmit="return confirm('Delete this tag?');">
                                                <input type="hidden" name="action" value="delete_tag">
                                                <input type="hidden" name="id" value="<?php echo $tag['id']; ?>">
                                                <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">
                                                <button type="submit" class="btn btn-sm btn-danger">Delete</button>
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
                <?php endforeach; ?>
            </div>

        </div>
    </div>

    <!-- Edit Modal -->
    <div class="modal-overlay" id="editModal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="modalTitle">Edit Item</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <form method="POST" id="editForm">
                <div class="modal-body">
                    <input type="hidden" name="action" id="editAction" value="">
                    <input type="hidden" name="id" id="editId" value="">
                    <input type="hidden" name="csrf_token" value="<?php echo $csrf_token; ?>">

                    <div class="form-group">
                        <label>Display Name</label>
                        <input type="text" name="display_name" id="editDisplayName" required>
                    </div>
                    <div class="form-group">
                        <label>Slug (read-only)</label>
                        <input type="text" id="editSlug" readonly style="background:#f1f5f9; color:#64748b;">
                    </div>
                    <div class="form-group" id="editCategorySlugGroup" style="display:none;">
                        <label>Category</label>
                        <select name="category_slug" id="editCategorySlug" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #d1d5db; border-radius:6px; font-size:0.9rem;">
                            <option value="">Cross-Category</option>
                            <?php foreach ($categories as $cat): ?>
                                <option value="<?php echo htmlspecialchars($cat['slug']); ?>"><?php echo htmlspecialchars($cat['display_name']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Display Order</label>
                        <input type="number" name="display_order" id="editDisplayOrder" min="0">
                    </div>
                    <div class="form-group">
                        <div class="checkbox-row">
                            <input type="checkbox" name="is_active" id="editIsActive" value="1">
                            <label for="editIsActive" style="text-transform:none; font-size:.9rem; color:#1e293b;">Active</label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>

    <script>
    function openEditModal(type, item) {
        var labels = {category: 'Category', location: 'Location', tag: 'Tag'};
        document.getElementById('modalTitle').textContent = 'Edit ' + (labels[type] || type);
        document.getElementById('editAction').value = 'edit_' + type;
        document.getElementById('editId').value = item.id;
        document.getElementById('editDisplayName').value = item.display_name;
        document.getElementById('editSlug').value = item.slug;
        document.getElementById('editDisplayOrder').value = item.display_order;
        document.getElementById('editIsActive').checked = item.is_active == 1;

        var catGroup = document.getElementById('editCategorySlugGroup');
        var catSelect = document.getElementById('editCategorySlug');
        if (type === 'tag') {
            catGroup.style.display = '';
            catSelect.value = item.category_slug || '';
        } else {
            catGroup.style.display = 'none';
            catSelect.value = '';
        }

        document.getElementById('editModal').classList.add('show');
    }

    function closeModal() {
        document.getElementById('editModal').classList.remove('show');
    }

    function filterTagGroup(filter, btn) {
        // Update active button
        document.querySelectorAll('.tag-filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');

        // Show/hide groups
        document.querySelectorAll('.tag-group').forEach(function(group) {
            var groupKey = group.getAttribute('data-group');
            if (filter === 'all') {
                group.style.display = '';
            } else {
                group.style.display = (groupKey === filter) ? '' : 'none';
            }
        });
    }

    document.getElementById('editModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });
    </script>
</body>
</html>
