<?php
// admin/advertisers.php - Advertiser Library Management
require_once '../config.php';
require_once 'campaign_functions.php';
require_once 'pipeline_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();

ensurePipelineTables();

// Handle AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ajax_action'])) {
    header('Content-Type: application/json');
    $ajaxAction = $_POST['ajax_action'];

    if ($ajaxAction === 'create_profile') {
        $errors = validateAdvertiserProfile($_POST);
        if (!empty($errors)) {
            echo json_encode(['success' => false, 'errors' => $errors]);
            exit();
        }
        $id = createAdvertiserProfile($_POST);
        $profile = getAdvertiserProfile($id);
        echo json_encode(['success' => true, 'profile' => $profile]);
        exit();
    }

    if ($ajaxAction === 'update_profile') {
        $errors = validateAdvertiserProfile($_POST);
        if (!empty($errors)) {
            echo json_encode(['success' => false, 'errors' => $errors]);
            exit();
        }
        updateAdvertiserProfile((int)$_POST['id'], $_POST);
        $profile = getAdvertiserProfile((int)$_POST['id']);
        echo json_encode(['success' => true, 'profile' => $profile]);
        exit();
    }

    if ($ajaxAction === 'delete_profile') {
        $result = deleteAdvertiserProfile((int)$_POST['id']);
        if ($result === false) {
            echo json_encode(['success' => false, 'errors' => ['Cannot delete: advertiser has active card assignments. Remove assignments first.']]);
        } else {
            echo json_encode(['success' => true]);
        }
        exit();
    }

    if ($ajaxAction === 'get_assignments') {
        $assignments = getAdvertiserCardAssignments((int)$_POST['profile_id']);
        echo json_encode(['success' => true, 'assignments' => $assignments]);
        exit();
    }

    if ($ajaxAction === 'add_transaction') {
        $profileId = (int)($_POST['profile_id'] ?? 0);
        $type = $_POST['type'] ?? 'purchase';
        if (!$profileId || !in_array($type, ['purchase', 'payment'])) {
            echo json_encode(['success' => false, 'errors' => ['Invalid profile or type.']]);
            exit();
        }
        $txnId = addAdvertiserTransaction($_POST);
        $profile = getAdvertiserProfile($profileId);
        echo json_encode(['success' => true, 'txn_id' => $txnId, 'profile' => $profile]);
        exit();
    }

    if ($ajaxAction === 'get_transactions') {
        $transactions = getAdvertiserTransactions((int)$_POST['profile_id']);
        echo json_encode(['success' => true, 'transactions' => $transactions]);
        exit();
    }

    if ($ajaxAction === 'delete_transaction') {
        $result = deleteAdvertiserTransaction((int)$_POST['id']);
        if ($result) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'errors' => ['Transaction not found.']]);
        }
        exit();
    }

    echo json_encode(['success' => false, 'error' => 'Unknown action']);
    exit();
}

// Fetch data
$search = $_GET['search'] ?? '';
$categoryFilter = $_GET['category'] ?? '';
$profiles = getAllAdvertiserProfiles($search, $categoryFilter);
$categories = getAdvertiserCategories();

// CSV Export
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    $filename = 'advertisers_' . date('Y-m-d') . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');

    $out = fopen('php://output', 'w');
    fputcsv($out, [
        'Business Name', 'Category', 'Contact Name', 'Phone', 'Email',
        'Cards Purchased', 'Cards Assigned', 'Cards Remaining',
        'Repeat Customer', 'LowcDeals Subscriber', 'Notes', 'Created'
    ]);

    foreach ($profiles as $p) {
        fputcsv($out, [
            $p['business_name'],
            $p['category'] ?? '',
            $p['contact_name'] ?? '',
            $p['phone'] ?? '',
            $p['email'] ?? '',
            $p['cards_purchased'] ?? 0,
            $p['cards_assigned'] ?? 0,
            $p['cards_remaining'] ?? 0,
            !empty($p['repeat_customer']) ? 'Yes' : 'No',
            !empty($p['lowcodeals_subscriber']) ? 'Yes' : 'No',
            $p['notes'] ?? '',
            $p['created_at'] ?? ''
        ]);
    }

    fclose($out);
    exit();
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advertiser Library | <?php echo SITE_NAME; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #334155; }

        .navbar { background: linear-gradient(135deg, #1f2937, #111827); color: white; padding: 1rem 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .navbar .container { max-width: 1400px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; }
        .navbar-brand { font-size: 1.5rem; font-weight: 800; text-decoration: none; color: white; }
        .navbar-nav { display: flex; align-items: center; gap: 1rem; }
        .nav-link { color: white; text-decoration: none; font-weight: 500; padding: .5rem 1rem; border-radius: 8px; transition: background-color .3s ease; }
        .nav-link:hover { background-color: rgba(255,255,255,.1); }
        .nav-link.active { background-color: rgba(56,182,255,.3); }

        .container { max-width: 1400px; margin: 0 auto; padding: 0 20px; }
        .main-content { padding: 2rem 0; }

        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .page-title { font-size: 2rem; font-weight: 800; color: #1e293b; }

        .btn { padding: .75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all .3s ease; border: none; cursor: pointer; font-size: .9rem; display: inline-flex; align-items: center; gap: .5rem; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(56,182,255,.4); }
        .btn-secondary { background: #64748b; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-success { background: #10b981; color: white; }
        .btn-sm { padding: .4rem .8rem; font-size: .8rem; }
        .btn-xs { padding: .25rem .5rem; font-size: .7rem; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }

        .alert { padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        /* Filter bar */
        .filter-bar { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
        .filter-bar input, .filter-bar select { padding: .6rem 1rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: .9rem; font-family: inherit; transition: border-color .3s; }
        .filter-bar input:focus, .filter-bar select:focus { outline: none; border-color: #38b6ff; }
        .filter-bar input { min-width: 250px; }

        /* Data table */
        .data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; }
        .data-table th, .data-table td { padding: .75rem 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .data-table th { background: #f8fafc; font-weight: 600; color: #374151; font-size: .8rem; text-transform: uppercase; letter-spacing: .5px; }
        .data-table tr:hover { background: #f9fafb; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table .clickable-row { cursor: pointer; }

        .badge { display: inline-block; padding: .15rem .5rem; border-radius: 20px; font-size: .7rem; font-weight: 600; margin-right: .25rem; }
        .badge-repeat { background: #dcfce7; color: #166534; }
        .badge-lowcodeals { background: #dbeafe; color: #1e40af; }
        .badge-category { background: #f1f5f9; color: #475569; }

        .remaining-green { color: #10b981; font-weight: 700; }
        .remaining-orange { color: #f59e0b; font-weight: 700; }
        .remaining-red { color: #ef4444; font-weight: 700; }

        .empty-state { text-align: center; padding: 3rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0; color: #64748b; }

        /* Sub-table for card assignments */
        .assignments-row { display: none; }
        .assignments-row.open { display: table-row; }
        .assignments-row td { padding: 0; background: #f8fafc; }
        .sub-table { width: 100%; border-collapse: collapse; font-size: .8rem; margin: 0; }
        .sub-table th { background: #e2e8f0; padding: .5rem .75rem; font-size: .7rem; text-transform: uppercase; letter-spacing: .5px; color: #475569; }
        .sub-table td { padding: .5rem .75rem; border-bottom: 1px solid #e2e8f0; }
        .sub-table tr:last-child td { border-bottom: none; }

        /* Toggle switches */
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #cbd5e1; border-radius: 24px; transition: .3s; }
        .toggle-slider:before { content: ''; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: .3s; }
        .toggle-switch input:checked + .toggle-slider { background: #10b981; }
        .toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); }

        /* Modals */
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.5); z-index: 1000; align-items: center; justify-content: center; }
        .modal-overlay.show { display: flex; }
        .modal { background: white; border-radius: 16px; max-width: 650px; width: 90%; max-height: 90vh; overflow-y: auto; }
        .modal-header { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h3 { font-size: 1.25rem; font-weight: 700; }
        .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
        .modal-body { padding: 1.5rem; }
        .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; display: flex; gap: 1rem; justify-content: flex-end; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-weight: 600; margin-bottom: .5rem; color: #374151; font-size: .9rem; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: .75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: .95rem; font-family: inherit; transition: border-color .3s; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #38b6ff; }
        .form-group textarea { min-height: 80px; resize: vertical; }
        .toggle-group { display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; }
        .toggle-group label { font-weight: 600; color: #374151; font-size: .9rem; margin: 0; }

        @media (max-width: 768px) {
            .navbar .container { flex-direction: column; gap: 1rem; }
            .page-header { flex-direction: column; align-items: stretch; }
            .form-grid { grid-template-columns: 1fr; }
            .filter-bar { flex-direction: column; }
            .filter-bar input { min-width: auto; width: 100%; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'pipeline'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="main-content">
            <div class="page-header">
                <h1 class="page-title">Advertiser Library</h1>
                <div style="display:flex;gap:.75rem;align-items:center;">
                    <a href="?export=csv<?php echo $search ? '&search=' . urlencode($search) : ''; ?><?php echo $categoryFilter ? '&category=' . urlencode($categoryFilter) : ''; ?>" class="btn btn-secondary">Export CSV</a>
                    <button class="btn btn-primary" onclick="openProfileModal()">+ New Advertiser</button>
                </div>
            </div>

            <div id="alertArea"></div>

            <!-- Filter Bar -->
            <form class="filter-bar" method="GET">
                <input type="text" name="search" placeholder="Search business name, contact, email..." value="<?php echo htmlspecialchars($search); ?>">
                <select name="category" onchange="this.form.submit()">
                    <option value="">All Categories</option>
                    <?php foreach ($categories as $cat): ?>
                        <option value="<?php echo htmlspecialchars($cat); ?>" <?php echo $categoryFilter === $cat ? 'selected' : ''; ?>><?php echo htmlspecialchars($cat); ?></option>
                    <?php endforeach; ?>
                </select>
                <button type="submit" class="btn btn-secondary btn-sm">Search</button>
                <?php if ($search || $categoryFilter): ?>
                    <a href="advertisers.php" class="btn btn-sm" style="background:#e2e8f0;color:#475569;">Clear</a>
                <?php endif; ?>
            </form>

            <!-- Profiles Table -->
            <?php if (empty($profiles)): ?>
                <div class="empty-state">
                    <p style="font-size:2rem;margin-bottom:.5rem;">&#x1f4c7;</p>
                    <p>No advertiser profiles found. Create your first advertiser!</p>
                    <button class="btn btn-primary" style="margin-top:1rem;" onclick="openProfileModal()">+ New Advertiser</button>
                </div>
            <?php else: ?>
            <div style="overflow-x:auto;">
                <table class="data-table" id="profilesTable">
                    <thead>
                        <tr>
                            <th>Business Name</th>
                            <th>Category</th>
                            <th>Contact</th>
                            <th>Phone</th>
                            <th>Cards Purchased</th>
                            <th>Assigned</th>
                            <th>Remaining</th>
                            <th>Badges</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($profiles as $prof):
                            $remaining = (int)$prof['cards_remaining'];
                            $remainClass = $remaining <= 0 ? 'remaining-red' : ($remaining < 10000 ? 'remaining-orange' : 'remaining-green');
                        ?>
                        <tr class="clickable-row" onclick="toggleAssignments(<?php echo $prof['id']; ?>, this)">
                            <td><strong><?php echo htmlspecialchars($prof['business_name']); ?></strong></td>
                            <td><span class="badge badge-category"><?php echo htmlspecialchars($prof['category']); ?></span></td>
                            <td><?php echo htmlspecialchars($prof['contact_name']); ?></td>
                            <td><?php echo htmlspecialchars($prof['phone']); ?></td>
                            <td><?php echo number_format($prof['cards_purchased']); ?></td>
                            <td><?php echo number_format($prof['cards_assigned']); ?></td>
                            <td><span class="<?php echo $remainClass; ?>"><?php echo number_format($remaining); ?></span></td>
                            <td>
                                <?php if ($prof['repeat_customer']): ?><span class="badge badge-repeat">Repeat</span><?php endif; ?>
                                <?php if ($prof['lowcodeals_subscriber']): ?><span class="badge badge-lowcodeals">LowCoDeals</span><?php endif; ?>
                            </td>
                            <td>
                                <div style="display:flex;gap:.5rem;" onclick="event.stopPropagation();">
                                    <button class="btn btn-success btn-xs" onclick="openTransactionModal(<?php echo $prof['id']; ?>, '<?php echo htmlspecialchars(addslashes($prof['business_name'])); ?>')">+ Purchase</button>
                                    <button class="btn btn-secondary btn-xs" onclick="openEditProfileModal(<?php echo htmlspecialchars(json_encode($prof)); ?>)">Edit</button>
                                    <button class="btn btn-danger btn-xs" onclick="deleteProfile(<?php echo $prof['id']; ?>)">Del</button>
                                </div>
                            </td>
                        </tr>
                        <tr class="assignments-row" id="assignments-<?php echo $prof['id']; ?>">
                            <td colspan="9">
                                <div id="assignments-content-<?php echo $prof['id']; ?>" style="padding:.75rem;">
                                    <em style="color:#94a3b8;">Loading...</em>
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

    <!-- Profile Modal (Add/Edit) -->
    <div class="modal-overlay" id="profileModal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="profileModalTitle">New Advertiser</h3>
                <button class="modal-close" onclick="closeProfileModal()">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="profileId" value="">

                <div class="form-group">
                    <label>Business Name *</label>
                    <input type="text" id="profileBusinessName" required placeholder="Business name">
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Category</label>
                        <select id="profileCategory">
                            <?php foreach ($categories as $cat): ?>
                                <option value="<?php echo htmlspecialchars($cat); ?>"><?php echo htmlspecialchars($cat); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Cards Purchased</label>
                        <input type="number" id="profileCardsPurchased" value="0" min="0">
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Contact Name</label>
                        <input type="text" id="profileContactName" placeholder="Contact person">
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="text" id="profilePhone" placeholder="(555) 555-5555">
                    </div>
                </div>

                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="profileEmail" placeholder="email@example.com">
                </div>

                <div class="form-grid">
                    <div class="toggle-group">
                        <label class="toggle-switch">
                            <input type="checkbox" id="profileRepeat">
                            <span class="toggle-slider"></span>
                        </label>
                        <label>Repeat Customer</label>
                    </div>
                    <div class="toggle-group">
                        <label class="toggle-switch">
                            <input type="checkbox" id="profileLowcodeals">
                            <span class="toggle-slider"></span>
                        </label>
                        <label>LowCoDeals Subscriber</label>
                    </div>
                </div>

                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="profileNotes" placeholder="Optional notes..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeProfileModal()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="saveProfile()">Save Advertiser</button>
            </div>
        </div>
    </div>

    <!-- Transaction Modal -->
    <div class="modal-overlay" id="transactionModal">
        <div class="modal" style="max-width:500px;">
            <div class="modal-header">
                <h3 id="txnModalTitle">Add Transaction</h3>
                <button class="modal-close" onclick="closeTransactionModal()">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="txnProfileId" value="">
                <div class="form-group">
                    <label>Type</label>
                    <select id="txnType" onchange="toggleTxnCards()">
                        <option value="purchase">Purchase</option>
                        <option value="payment">Payment</option>
                    </select>
                </div>
                <div class="form-grid">
                    <div class="form-group" id="txnCardsGroup">
                        <label>Cards</label>
                        <input type="number" id="txnCards" value="0" min="0" placeholder="Number of cards">
                    </div>
                    <div class="form-group">
                        <label>Amount ($)</label>
                        <input type="number" id="txnAmount" value="0" min="0" step="0.01" placeholder="Dollar amount">
                    </div>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="txnNotes" placeholder="Optional notes..." style="min-height:60px;"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeTransactionModal()">Cancel</button>
                <button type="button" class="btn btn-success" onclick="saveTransaction()">Save Transaction</button>
            </div>
        </div>
    </div>

    <script>
        function handleFetchResponse(r) {
            if (r.status === 401) {
                alert('Your session has expired. Please log in again.');
                window.location.href = 'login.php';
                return Promise.reject('session_expired');
            }
            return r.json();
        }

        function showAlert(type, msg) {
            var area = document.getElementById('alertArea');
            area.innerHTML = '<div class="alert alert-' + type + '">' + msg + '</div>';
            setTimeout(function() {
                var el = area.querySelector('.alert');
                if (el) {
                    el.style.transition = 'opacity .3s, transform .3s';
                    el.style.opacity = '0';
                    el.style.transform = 'translateY(-10px)';
                    setTimeout(function() { el.remove(); }, 300);
                }
            }, 5000);
        }

        // Profile Modal
        function openProfileModal() {
            document.getElementById('profileModalTitle').textContent = 'New Advertiser';
            document.getElementById('profileId').value = '';
            document.getElementById('profileBusinessName').value = '';
            document.getElementById('profileCategory').value = 'Other';
            document.getElementById('profileCardsPurchased').value = '0';
            document.getElementById('profileContactName').value = '';
            document.getElementById('profilePhone').value = '';
            document.getElementById('profileEmail').value = '';
            document.getElementById('profileRepeat').checked = false;
            document.getElementById('profileLowcodeals').checked = false;
            document.getElementById('profileNotes').value = '';
            document.getElementById('profileModal').classList.add('show');
        }

        function openEditProfileModal(prof) {
            document.getElementById('profileModalTitle').textContent = 'Edit Advertiser';
            document.getElementById('profileId').value = prof.id;
            document.getElementById('profileBusinessName').value = prof.business_name;
            document.getElementById('profileCategory').value = prof.category || 'Other';
            document.getElementById('profileCardsPurchased').value = prof.cards_purchased || 0;
            document.getElementById('profileContactName').value = prof.contact_name || '';
            document.getElementById('profilePhone').value = prof.phone || '';
            document.getElementById('profileEmail').value = prof.email || '';
            document.getElementById('profileRepeat').checked = parseInt(prof.repeat_customer) === 1;
            document.getElementById('profileLowcodeals').checked = parseInt(prof.lowcodeals_subscriber) === 1;
            document.getElementById('profileNotes').value = prof.notes || '';
            document.getElementById('profileModal').classList.add('show');
        }

        function closeProfileModal() {
            document.getElementById('profileModal').classList.remove('show');
        }

        function saveProfile() {
            var bName = document.getElementById('profileBusinessName').value.trim();
            if (!bName) { alert('Business name is required.'); return; }

            var profId = document.getElementById('profileId').value;
            var fd = new FormData();
            fd.append('ajax_action', profId ? 'update_profile' : 'create_profile');
            if (profId) fd.append('id', profId);
            fd.append('business_name', bName);
            fd.append('category', document.getElementById('profileCategory').value);
            fd.append('cards_purchased', document.getElementById('profileCardsPurchased').value);
            fd.append('contact_name', document.getElementById('profileContactName').value);
            fd.append('phone', document.getElementById('profilePhone').value);
            fd.append('email', document.getElementById('profileEmail').value);
            fd.append('repeat_customer', document.getElementById('profileRepeat').checked ? 1 : 0);
            fd.append('lowcodeals_subscriber', document.getElementById('profileLowcodeals').checked ? 1 : 0);
            fd.append('notes', document.getElementById('profileNotes').value);

            fetch('advertisers.php', { method: 'POST', body: fd })
                .then(handleFetchResponse)
                .then(function(data) {
                    if (data.success) {
                        closeProfileModal();
                        location.reload();
                    } else {
                        alert(data.errors ? data.errors.join('\n') : 'Failed to save.');
                    }
                })
                .catch(function() { alert('Network error. Please try again.'); });
        }

        function deleteProfile(id) {
            if (!confirm('Delete this advertiser profile? This will fail if the advertiser has card assignments.')) return;

            var fd = new FormData();
            fd.append('ajax_action', 'delete_profile');
            fd.append('id', id);

            fetch('advertisers.php', { method: 'POST', body: fd })
                .then(handleFetchResponse)
                .then(function(data) {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert(data.errors ? data.errors.join('\n') : 'Failed to delete.');
                    }
                })
                .catch(function() { alert('Network error.'); });
        }

        // Expandable assignments + transactions sub-table
        function toggleAssignments(profileId, rowEl) {
            var aRow = document.getElementById('assignments-' + profileId);
            if (aRow.classList.contains('open')) {
                aRow.classList.remove('open');
                return;
            }
            aRow.classList.add('open');

            var content = document.getElementById('assignments-content-' + profileId);
            content.innerHTML = '<em style="color:#94a3b8;">Loading...</em>';

            // Fetch both assignments and transactions in parallel
            var fdA = new FormData();
            fdA.append('ajax_action', 'get_assignments');
            fdA.append('profile_id', profileId);

            var fdT = new FormData();
            fdT.append('ajax_action', 'get_transactions');
            fdT.append('profile_id', profileId);

            Promise.all([
                fetch('advertisers.php', { method: 'POST', body: fdA }).then(handleFetchResponse),
                fetch('advertisers.php', { method: 'POST', body: fdT }).then(handleFetchResponse)
            ]).then(function(results) {
                var assignData = results[0];
                var txnData = results[1];
                var html = '';

                // Card Assignments section
                html += '<div style="margin-bottom:1rem;"><strong style="font-size:.85rem;color:#374151;">Card Assignments</strong></div>';
                if (assignData.success && assignData.assignments.length) {
                    html += '<table class="sub-table"><thead><tr><th>Card</th><th>Area</th><th>Ad Size</th><th>Amount</th><th>Payment</th><th>Distribution</th><th>Card Status</th></tr></thead><tbody>';
                    assignData.assignments.forEach(function(a) {
                        var sizeLabel = a.ad_size ? (a.ad_size.charAt(0).toUpperCase() + a.ad_size.slice(1)) : 'Medium';
                        var payClass = 'payment-' + (a.payment_status || 'unpaid');
                        html += '<tr>';
                        html += '<td><a href="card_detail.php?id=' + a.card_id + '" style="color:#0ea5e9;font-weight:600;text-decoration:none;">' + escHtml(a.card_name) + '</a></td>';
                        html += '<td>' + escHtml(a.area) + '</td>';
                        html += '<td>' + sizeLabel + '</td>';
                        html += '<td>$' + Number(a.total_amount).toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}) + '</td>';
                        html += '<td><span class="badge ' + payClass + '" style="padding:.15rem .5rem;border-radius:20px;font-size:.7rem;">' + (a.payment_status ? a.payment_status.charAt(0).toUpperCase() + a.payment_status.slice(1) : 'Unpaid') + '</span></td>';
                        html += '<td>' + Number(a.distribution || 0).toLocaleString() + '</td>';
                        html += '<td>' + (a.card_status ? a.card_status.replace('_', ' ') : '') + '</td>';
                        html += '</tr>';
                    });
                    html += '</tbody></table>';
                } else {
                    html += '<em style="color:#94a3b8;font-size:.85rem;">No card assignments found.</em>';
                }

                // Transaction History section
                html += '<div style="margin-top:1.25rem;margin-bottom:.75rem;display:flex;justify-content:space-between;align-items:center;">';
                html += '<strong style="font-size:.85rem;color:#374151;">Transaction History</strong>';
                html += '</div>';
                if (txnData.success && txnData.transactions.length) {
                    html += '<table class="sub-table"><thead><tr><th>Date</th><th>Type</th><th>Cards</th><th>Amount</th><th>Notes</th><th>Actions</th></tr></thead><tbody>';
                    txnData.transactions.forEach(function(t) {
                        var d = new Date(t.created_at);
                        var dateStr = (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
                        var typeBadge = t.type === 'purchase'
                            ? '<span class="badge badge-repeat">Purchase</span>'
                            : '<span class="badge badge-lowcodeals">Payment</span>';
                        html += '<tr>';
                        html += '<td>' + dateStr + '</td>';
                        html += '<td>' + typeBadge + '</td>';
                        html += '<td>' + (t.cards ? Number(t.cards).toLocaleString() : '-') + '</td>';
                        html += '<td>' + (Number(t.amount) > 0 ? '$' + Number(t.amount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '-') + '</td>';
                        html += '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(t.notes || '') + '</td>';
                        html += '<td><button class="btn btn-danger btn-xs" onclick="event.stopPropagation();deleteTransaction(' + t.id + ',' + profileId + ')">Del</button></td>';
                        html += '</tr>';
                    });
                    html += '</tbody></table>';
                } else {
                    html += '<em style="color:#94a3b8;font-size:.85rem;">No transactions yet.</em>';
                }

                content.innerHTML = html;
            }).catch(function() {
                content.innerHTML = '<em style="color:#ef4444;">Error loading data.</em>';
            });
        }

        function escHtml(str) {
            var div = document.createElement('div');
            div.textContent = str || '';
            return div.innerHTML;
        }

        // Transaction Modal
        function openTransactionModal(profileId, businessName) {
            document.getElementById('txnModalTitle').textContent = 'Add Transaction — ' + businessName;
            document.getElementById('txnProfileId').value = profileId;
            document.getElementById('txnType').value = 'purchase';
            document.getElementById('txnCards').value = '0';
            document.getElementById('txnAmount').value = '0';
            document.getElementById('txnNotes').value = '';
            toggleTxnCards();
            document.getElementById('transactionModal').classList.add('show');
        }

        function closeTransactionModal() {
            document.getElementById('transactionModal').classList.remove('show');
        }

        function toggleTxnCards() {
            var type = document.getElementById('txnType').value;
            document.getElementById('txnCardsGroup').style.display = type === 'purchase' ? '' : 'none';
        }

        function saveTransaction() {
            var profileId = document.getElementById('txnProfileId').value;
            var type = document.getElementById('txnType').value;
            var cards = document.getElementById('txnCards').value || 0;
            var amount = document.getElementById('txnAmount').value || 0;

            if (type === 'purchase' && parseInt(cards) <= 0 && parseFloat(amount) <= 0) {
                alert('Please enter a card count or amount.');
                return;
            }
            if (type === 'payment' && parseFloat(amount) <= 0) {
                alert('Please enter a payment amount.');
                return;
            }

            var fd = new FormData();
            fd.append('ajax_action', 'add_transaction');
            fd.append('profile_id', profileId);
            fd.append('type', type);
            fd.append('cards', cards);
            fd.append('amount', amount);
            fd.append('notes', document.getElementById('txnNotes').value);

            fetch('advertisers.php', { method: 'POST', body: fd })
                .then(handleFetchResponse)
                .then(function(data) {
                    if (data.success) {
                        closeTransactionModal();
                        showAlert('success', 'Transaction added successfully.');
                        location.reload();
                    } else {
                        alert(data.errors ? data.errors.join('\n') : 'Failed to save transaction.');
                    }
                })
                .catch(function() { alert('Network error. Please try again.'); });
        }

        function deleteTransaction(txnId, profileId) {
            if (!confirm('Delete this transaction? The cards purchased total will be recalculated.')) return;

            var fd = new FormData();
            fd.append('ajax_action', 'delete_transaction');
            fd.append('id', txnId);

            fetch('advertisers.php', { method: 'POST', body: fd })
                .then(handleFetchResponse)
                .then(function(data) {
                    if (data.success) {
                        showAlert('success', 'Transaction deleted.');
                        location.reload();
                    } else {
                        alert(data.errors ? data.errors.join('\n') : 'Failed to delete.');
                    }
                })
                .catch(function() { alert('Network error.'); });
        }

        // Modal close handlers
        document.getElementById('profileModal').addEventListener('click', function(e) { if (e.target === this) closeProfileModal(); });
        document.getElementById('transactionModal').addEventListener('click', function(e) { if (e.target === this) closeTransactionModal(); });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeProfileModal();
                closeTransactionModal();
            }
        });
    </script>
</body>
</html>
