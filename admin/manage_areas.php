<?php
// admin/manage_areas.php - Manage Campaign Areas
require_once '../config.php';
require_once 'campaign_functions.php';

// Check admin authentication
requireCampaignAdminLogin();

$currentAdmin = getCurrentCampaignAdmin();

try {
    $db = getDB();

    // Ensure table exists
    ensureAreasTable();

    // Handle form submissions
    $message = '';
    $messageType = '';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';

        if ($action === 'add') {
            $stmt = $db->prepare("
                INSERT INTO campaign_areas (area_name, area_code, display_order, is_active)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                trim($_POST['area_name']),
                strtoupper(trim($_POST['area_code'])),
                (int)($_POST['display_order'] ?: 0),
                isset($_POST['is_active']) ? 1 : 0
            ]);
            $message = 'Area added successfully!';
            $messageType = 'success';
        }

        if ($action === 'update') {
            $stmt = $db->prepare("
                UPDATE campaign_areas
                SET area_name = ?, area_code = ?, display_order = ?, is_active = ?
                WHERE id = ?
            ");
            $stmt->execute([
                trim($_POST['area_name']),
                strtoupper(trim($_POST['area_code'])),
                (int)($_POST['display_order'] ?: 0),
                isset($_POST['is_active']) ? 1 : 0,
                $_POST['id']
            ]);
            $message = 'Area updated successfully!';
            $messageType = 'success';
        }

        if ($action === 'delete') {
            $areaId = (int)$_POST['id'];
            // Check if area is used by any campaigns
            $stmt = $db->prepare("SELECT area_name FROM campaign_areas WHERE id = ?");
            $stmt->execute([$areaId]);
            $areaRow = $stmt->fetch();

            if ($areaRow) {
                $stmt = $db->prepare("SELECT COUNT(*) FROM campaigns WHERE area = ?");
                $stmt->execute([$areaRow['area_name']]);
                $usageCount = (int)$stmt->fetchColumn();

                if ($usageCount > 0) {
                    $message = 'Cannot delete this area - it is used by ' . $usageCount . ' campaign(s). Deactivate it instead.';
                    $messageType = 'danger';
                } else {
                    $stmt = $db->prepare("DELETE FROM campaign_areas WHERE id = ?");
                    $stmt->execute([$areaId]);
                    $message = 'Area deleted!';
                    $messageType = 'success';
                }
            }
        }
    }

    // Get all areas
    $areas = $db->query("SELECT * FROM campaign_areas ORDER BY display_order ASC, area_name ASC")->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    $error_message = "Database error: " . $e->getMessage();
    error_log("Manage areas error: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Areas | <?php echo SITE_NAME; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #334155; }

        .navbar {
            background: linear-gradient(135deg, #1f2937, #111827);
            color: white;
            padding: 1rem 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .navbar .container {
            max-width: 1400px;
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

        .nav-link:hover { background-color: rgba(255, 255, 255, 0.1); }

        .container { max-width: 1400px; margin: 0 auto; padding: 2rem 20px; }

        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .page-title { font-size: 2rem; font-weight: 800; color: #1e293b; }

        .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            font-size: 0.9rem;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-success { background: #10b981; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-secondary { background: #64748b; color: white; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }

        .alert {
            padding: 1rem 1.5rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            font-weight: 500;
        }

        .alert-success { background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            margin-bottom: 1.5rem;
            overflow: hidden;
        }

        .card-header {
            background: #f8fafc;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 700;
            font-size: 1.1rem;
        }

        .card-body { padding: 1.5rem; }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .form-group { margin-bottom: 1rem; }
        .form-group label {
            display: block;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #374151;
            font-size: 0.9rem;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 0.95rem;
            font-family: inherit;
            transition: border-color 0.3s;
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #38b6ff;
        }

        .areas-table {
            width: 100%;
            border-collapse: collapse;
        }

        .areas-table th,
        .areas-table td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }

        .areas-table th {
            background: #f8fafc;
            font-weight: 600;
            color: #374151;
            font-size: 0.85rem;
            text-transform: uppercase;
        }

        .areas-table tr:hover { background: #f9fafb; }

        .status-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-active { background: #dcfce7; color: #166534; }
        .status-inactive { background: #fef3c7; color: #92400e; }

        .action-btns {
            display: flex;
            gap: 0.5rem;
        }

        .btn-sm {
            padding: 0.4rem 0.8rem;
            font-size: 0.8rem;
        }

        .code-badge {
            display: inline-block;
            background: #f1f5f9;
            color: #334155;
            padding: 0.2rem 0.6rem;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            font-weight: 600;
        }

        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .modal-overlay.show { display: flex; }

        .modal {
            background: white;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }

        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-header h3 { font-size: 1.25rem; font-weight: 700; }

        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #64748b;
        }

        .modal-body { padding: 1.5rem; }
        .modal-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .checkbox-group input[type="checkbox"] {
            width: 18px;
            height: 18px;
        }

        @media (max-width: 768px) {
            .navbar .container { flex-direction: column; gap: 1rem; }
            .page-header { flex-direction: column; align-items: stretch; }
            .areas-table { font-size: 0.85rem; }
            .areas-table th, .areas-table td { padding: 0.75rem 0.5rem; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'pipeline'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="page-header">
            <h1 class="page-title">Manage Areas</h1>
            <button class="btn btn-primary" onclick="openAddModal()">+ Add New Area</button>
        </div>

        <?php if (!empty($message)): ?>
            <div class="alert alert-<?php echo $messageType; ?>">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>

        <?php if (isset($error_message)): ?>
            <div class="alert alert-danger"><?php echo htmlspecialchars($error_message); ?></div>
        <?php endif; ?>

        <div class="card">
            <div class="card-header">All Campaign Areas</div>

            <?php if (empty($areas)): ?>
                <div class="card-body" style="text-align: center; padding: 3rem;">
                    <p style="color: #64748b; margin-bottom: 1rem;">No areas yet. Add your first area!</p>
                    <button class="btn btn-primary" onclick="openAddModal()">+ Add Area</button>
                </div>
            <?php else: ?>
                <div style="overflow-x: auto;">
                    <table class="areas-table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Area Name</th>
                                <th>Code</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($areas as $areaRow): ?>
                                <tr>
                                    <td><?php echo (int)$areaRow['display_order']; ?></td>
                                    <td><strong><?php echo htmlspecialchars($areaRow['area_name']); ?></strong></td>
                                    <td><span class="code-badge"><?php echo htmlspecialchars($areaRow['area_code']); ?></span></td>
                                    <td>
                                        <span class="status-badge status-<?php echo $areaRow['is_active'] ? 'active' : 'inactive'; ?>">
                                            <?php echo $areaRow['is_active'] ? 'Active' : 'Inactive'; ?>
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-btns">
                                            <button class="btn btn-secondary btn-sm" onclick="openEditModal(<?php echo htmlspecialchars(json_encode($areaRow)); ?>)">Edit</button>
                                            <form method="POST" style="display: inline;" onsubmit="return confirm('Delete this area? This cannot be undone.');">
                                                <input type="hidden" name="action" value="delete">
                                                <input type="hidden" name="id" value="<?php echo $areaRow['id']; ?>">
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

    <!-- Add/Edit Modal -->
    <div class="modal-overlay" id="areaModal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="modalTitle">Add New Area</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <form method="POST" id="areaForm">
                <div class="modal-body">
                    <input type="hidden" name="action" id="formAction" value="add">
                    <input type="hidden" name="id" id="formId" value="">

                    <div class="form-group">
                        <label>Area Name *</label>
                        <input type="text" name="area_name" id="formAreaName" required placeholder="e.g., Mount Pleasant">
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label>Area Code *</label>
                            <input type="text" name="area_code" id="formAreaCode" required placeholder="e.g., MP" maxlength="10" style="text-transform: uppercase;">
                        </div>

                        <div class="form-group">
                            <label>Display Order</label>
                            <input type="number" name="display_order" id="formOrder" value="0" min="0">
                        </div>
                    </div>

                    <div class="form-group">
                        <div class="checkbox-group">
                            <input type="checkbox" name="is_active" id="formActive" checked>
                            <label for="formActive" style="margin-bottom: 0;">Active</label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Area</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function openAddModal() {
            document.getElementById('modalTitle').textContent = 'Add New Area';
            document.getElementById('formAction').value = 'add';
            document.getElementById('formId').value = '';
            document.getElementById('areaForm').reset();
            document.getElementById('formActive').checked = true;
            document.getElementById('formOrder').value = '0';
            document.getElementById('areaModal').classList.add('show');
        }

        function openEditModal(area) {
            document.getElementById('modalTitle').textContent = 'Edit Area';
            document.getElementById('formAction').value = 'update';
            document.getElementById('formId').value = area.id;
            document.getElementById('formAreaName').value = area.area_name;
            document.getElementById('formAreaCode').value = area.area_code;
            document.getElementById('formOrder').value = area.display_order;
            document.getElementById('formActive').checked = area.is_active == 1;
            document.getElementById('areaModal').classList.add('show');
        }

        function closeModal() {
            document.getElementById('areaModal').classList.remove('show');
        }

        // Close modal on outside click
        document.getElementById('areaModal').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal();
        });
    </script>
</body>
</html>
