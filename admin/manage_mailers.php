<?php
// admin/manage_mailers.php - Manage Upcoming Mailers with Countdown Dates
require_once '../config.php';
require_once 'campaign_functions.php';

// Check admin authentication
requireCampaignAdminLogin();

$currentAdmin = getCurrentCampaignAdmin();

try {
    $db = getDB();

    // Create table if it doesn't exist
    $db->exec("
        CREATE TABLE IF NOT EXISTS upcoming_mailers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            deadline_date DATETIME NOT NULL,
            deadline_label VARCHAR(100) DEFAULT 'Registration Closes',
            mail_date DATE,
            households INT DEFAULT 0,
            spots_total INT DEFAULT 8,
            spots_remaining INT DEFAULT 8,
            price_from DECIMAL(10,2) DEFAULT 99.00,
            status ENUM('active', 'inactive', 'completed') DEFAULT 'active',
            display_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    // Handle form submissions
    $message = '';
    $messageType = '';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';

        if ($action === 'add') {
            $stmt = $db->prepare("
                INSERT INTO upcoming_mailers (title, description, deadline_date, deadline_label, mail_date, households, spots_total, spots_remaining, price_from, status, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $_POST['title'],
                $_POST['description'],
                $_POST['deadline_date'],
                $_POST['deadline_label'] ?: 'Registration Closes',
                $_POST['mail_date'] ?: null,
                $_POST['households'] ?: 0,
                $_POST['spots_total'] ?: 8,
                $_POST['spots_remaining'] ?: 8,
                $_POST['price_from'] ?: 99.00,
                $_POST['status'] ?: 'active',
                $_POST['display_order'] ?: 0
            ]);
            $message = 'Mailer added successfully!';
            $messageType = 'success';
        }

        if ($action === 'update') {
            $stmt = $db->prepare("
                UPDATE upcoming_mailers
                SET title = ?, description = ?, deadline_date = ?, deadline_label = ?, mail_date = ?,
                    households = ?, spots_total = ?, spots_remaining = ?, price_from = ?, status = ?, display_order = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $_POST['title'],
                $_POST['description'],
                $_POST['deadline_date'],
                $_POST['deadline_label'] ?: 'Registration Closes',
                $_POST['mail_date'] ?: null,
                $_POST['households'] ?: 0,
                $_POST['spots_total'] ?: 8,
                $_POST['spots_remaining'] ?: 8,
                $_POST['price_from'] ?: 99.00,
                $_POST['status'] ?: 'active',
                $_POST['display_order'] ?: 0,
                $_POST['id']
            ]);
            $message = 'Mailer updated successfully!';
            $messageType = 'success';
        }

        if ($action === 'delete') {
            $stmt = $db->prepare("DELETE FROM upcoming_mailers WHERE id = ?");
            $stmt->execute([$_POST['id']]);
            $message = 'Mailer deleted!';
            $messageType = 'success';
        }

        if ($action === 'update_spots') {
            $stmt = $db->prepare("UPDATE upcoming_mailers SET spots_remaining = ? WHERE id = ?");
            $stmt->execute([$_POST['spots_remaining'], $_POST['id']]);
            $message = 'Spots updated!';
            $messageType = 'success';
        }
    }

    // Get all mailers
    $mailers = $db->query("SELECT * FROM upcoming_mailers ORDER BY display_order ASC, deadline_date ASC")->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    $error_message = "Database error: " . $e->getMessage();
    error_log("Manage mailers error: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Upcoming Mailers | <?php echo SITE_NAME; ?></title>
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
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .card-body { padding: 1.5rem; }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 0.95rem;
            font-family: inherit;
            transition: border-color 0.3s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #38b6ff;
        }

        .form-group textarea { min-height: 80px; resize: vertical; }

        .mailer-table {
            width: 100%;
            border-collapse: collapse;
        }

        .mailer-table th,
        .mailer-table td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }

        .mailer-table th {
            background: #f8fafc;
            font-weight: 600;
            color: #374151;
            font-size: 0.85rem;
            text-transform: uppercase;
        }

        .mailer-table tr:hover { background: #f9fafb; }

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
        .status-completed { background: #e5e7eb; color: #374151; }

        .countdown-preview {
            font-family: monospace;
            background: #1e293b;
            color: #22c55e;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.9rem;
        }

        .spots-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .spots-bar {
            flex: 1;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            max-width: 100px;
        }

        .spots-fill {
            height: 100%;
            background: linear-gradient(135deg, #22c55e, #16a34a);
            transition: width 0.3s;
        }

        .spots-fill.low { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .spots-fill.critical { background: linear-gradient(135deg, #ef4444, #dc2626); }

        .quick-edit {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .quick-edit input {
            width: 60px;
            padding: 0.25rem 0.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            text-align: center;
        }

        .action-btns {
            display: flex;
            gap: 0.5rem;
        }

        .btn-sm {
            padding: 0.4rem 0.8rem;
            font-size: 0.8rem;
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
            max-width: 600px;
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

        .view-link {
            color: #38b6ff;
            text-decoration: none;
            font-weight: 500;
        }

        .view-link:hover { text-decoration: underline; }

        @media (max-width: 768px) {
            .navbar .container { flex-direction: column; gap: 1rem; }
            .page-header { flex-direction: column; align-items: stretch; }
            .mailer-table { font-size: 0.85rem; }
            .mailer-table th, .mailer-table td { padding: 0.75rem 0.5rem; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'pipeline'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="page-header">
            <h1 class="page-title">Upcoming Mailers</h1>
            <button class="btn btn-primary" onclick="openAddModal()">+ Add New Mailer</button>
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
            <div class="card-header">
                <span>All Mailers</span>
                <a href="../upcoming-mailers.php" class="view-link" target="_blank">View Public Page →</a>
            </div>

            <?php if (empty($mailers)): ?>
                <div class="card-body" style="text-align: center; padding: 3rem;">
                    <p style="color: #64748b; margin-bottom: 1rem;">No mailers yet. Add your first upcoming mailer!</p>
                    <button class="btn btn-primary" onclick="openAddModal()">+ Add Mailer</button>
                </div>
            <?php else: ?>
                <div style="overflow-x: auto;">
                    <table class="mailer-table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Title</th>
                                <th>Deadline</th>
                                <th>Mail Date</th>
                                <th>Spots</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($mailers as $mailer):
                                $deadline = new DateTime($mailer['deadline_date']);
                                $now = new DateTime();
                                $isPast = $deadline < $now;
                                $spotsPercent = $mailer['spots_total'] > 0 ? ($mailer['spots_remaining'] / $mailer['spots_total']) * 100 : 0;
                                $spotsClass = $spotsPercent <= 25 ? 'critical' : ($spotsPercent <= 50 ? 'low' : '');
                            ?>
                                <tr>
                                    <td><?php echo $mailer['display_order']; ?></td>
                                    <td>
                                        <strong><?php echo htmlspecialchars($mailer['title']); ?></strong>
                                        <?php if ($mailer['households']): ?>
                                            <br><small style="color: #64748b;"><?php echo number_format($mailer['households']); ?> households</small>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <div><?php echo $deadline->format('M j, Y'); ?></div>
                                        <div style="font-size: 0.8rem; color: #64748b;"><?php echo $deadline->format('g:i A'); ?></div>
                                        <?php if ($isPast): ?>
                                            <span style="color: #ef4444; font-size: 0.75rem;">PASSED</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <?php echo $mailer['mail_date'] ? date('M j, Y', strtotime($mailer['mail_date'])) : '-'; ?>
                                    </td>
                                    <td>
                                        <div class="spots-indicator">
                                            <span><?php echo $mailer['spots_remaining']; ?>/<?php echo $mailer['spots_total']; ?></span>
                                            <div class="spots-bar">
                                                <div class="spots-fill <?php echo $spotsClass; ?>" style="width: <?php echo $spotsPercent; ?>%"></div>
                                            </div>
                                        </div>
                                        <form method="POST" class="quick-edit" style="margin-top: 0.5rem;">
                                            <input type="hidden" name="action" value="update_spots">
                                            <input type="hidden" name="id" value="<?php echo $mailer['id']; ?>">
                                            <input type="number" name="spots_remaining" value="<?php echo $mailer['spots_remaining']; ?>" min="0" max="<?php echo $mailer['spots_total']; ?>">
                                            <button type="submit" class="btn btn-secondary btn-sm">Update</button>
                                        </form>
                                    </td>
                                    <td>
                                        <span class="status-badge status-<?php echo $mailer['status']; ?>">
                                            <?php echo ucfirst($mailer['status']); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-btns">
                                            <button class="btn btn-secondary btn-sm" onclick="openEditModal(<?php echo htmlspecialchars(json_encode($mailer)); ?>)">Edit</button>
                                            <form method="POST" style="display: inline;" onsubmit="return confirm('Delete this mailer?');">
                                                <input type="hidden" name="action" value="delete">
                                                <input type="hidden" name="id" value="<?php echo $mailer['id']; ?>">
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
    <div class="modal-overlay" id="mailerModal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="modalTitle">Add New Mailer</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <form method="POST" id="mailerForm">
                <div class="modal-body">
                    <input type="hidden" name="action" id="formAction" value="add">
                    <input type="hidden" name="id" id="formId" value="">

                    <div class="form-group">
                        <label>Title *</label>
                        <input type="text" name="title" id="formTitle" required placeholder="e.g., December 2024 Mailing">
                    </div>

                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" id="formDescription" placeholder="Brief description of this mailing..."></textarea>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label>Registration Deadline *</label>
                            <input type="datetime-local" name="deadline_date" id="formDeadline" required>
                        </div>

                        <div class="form-group">
                            <label>Deadline Label</label>
                            <input type="text" name="deadline_label" id="formDeadlineLabel" placeholder="Registration Closes" value="Registration Closes">
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label>Mail Date</label>
                            <input type="date" name="mail_date" id="formMailDate">
                        </div>

                        <div class="form-group">
                            <label>Households</label>
                            <input type="number" name="households" id="formHouseholds" placeholder="10000">
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label>Total Spots</label>
                            <input type="number" name="spots_total" id="formSpotsTotal" value="8" min="1">
                        </div>

                        <div class="form-group">
                            <label>Spots Remaining</label>
                            <input type="number" name="spots_remaining" id="formSpotsRemaining" value="8" min="0">
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label>Starting Price ($)</label>
                            <input type="number" name="price_from" id="formPrice" value="99" step="0.01" min="0">
                        </div>

                        <div class="form-group">
                            <label>Display Order</label>
                            <input type="number" name="display_order" id="formOrder" value="0" min="0">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Status</label>
                        <select name="status" id="formStatus">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Mailer</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function openAddModal() {
            document.getElementById('modalTitle').textContent = 'Add New Mailer';
            document.getElementById('formAction').value = 'add';
            document.getElementById('formId').value = '';
            document.getElementById('mailerForm').reset();
            document.getElementById('formSpotsTotal').value = '8';
            document.getElementById('formSpotsRemaining').value = '8';
            document.getElementById('formPrice').value = '99';
            document.getElementById('formOrder').value = '0';
            document.getElementById('formDeadlineLabel').value = 'Registration Closes';
            document.getElementById('mailerModal').classList.add('show');
        }

        function openEditModal(mailer) {
            document.getElementById('modalTitle').textContent = 'Edit Mailer';
            document.getElementById('formAction').value = 'update';
            document.getElementById('formId').value = mailer.id;
            document.getElementById('formTitle').value = mailer.title;
            document.getElementById('formDescription').value = mailer.description || '';
            document.getElementById('formDeadline').value = mailer.deadline_date.replace(' ', 'T');
            document.getElementById('formDeadlineLabel').value = mailer.deadline_label || 'Registration Closes';
            document.getElementById('formMailDate').value = mailer.mail_date || '';
            document.getElementById('formHouseholds').value = mailer.households || '';
            document.getElementById('formSpotsTotal').value = mailer.spots_total;
            document.getElementById('formSpotsRemaining').value = mailer.spots_remaining;
            document.getElementById('formPrice').value = mailer.price_from;
            document.getElementById('formOrder').value = mailer.display_order;
            document.getElementById('formStatus').value = mailer.status;
            document.getElementById('mailerModal').classList.add('show');
        }

        function closeModal() {
            document.getElementById('mailerModal').classList.remove('show');
        }

        // Close modal on outside click
        document.getElementById('mailerModal').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal();
        });
    </script>
</body>
</html>
