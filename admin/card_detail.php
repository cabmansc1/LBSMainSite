<?php
// admin/card_detail.php - Single Card View: Advertisers, Payments, Revenue
require_once '../config.php';
require_once 'campaign_functions.php';
require_once 'pipeline_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();

ensurePipelineTables();

// Get card ID
$cardId = (int)($_GET['id'] ?? 0);
if (!$cardId) {
    header('Location: pipeline.php');
    exit();
}

// Handle AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ajax_action'])) {
    header('Content-Type: application/json');

    if ($_POST['ajax_action'] === 'search_profiles') {
        $term = trim($_POST['term'] ?? '');
        $results = $term !== '' ? searchAdvertiserProfiles($term) : [];
        echo json_encode(['success' => true, 'profiles' => $results]);
        exit();
    }

    echo json_encode(['success' => false, 'error' => 'Unknown action']);
    exit();
}

// Handle form submissions (POST-Redirect-GET)
$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add_advertiser') {
        $errors = validateAdvertiser($_POST);
        if (empty($errors)) {
            $_POST['card_id'] = $cardId;
            createAdvertiser($_POST);
            header("Location: card_detail.php?id=$cardId&message=advertiser_added");
            exit();
        } else {
            $message = implode(' ', $errors);
            $messageType = 'danger';
        }
    }

    if ($action === 'update_advertiser') {
        $errors = validateAdvertiser($_POST);
        if (empty($errors)) {
            updateAdvertiser((int)$_POST['advertiser_id'], $_POST);
            header("Location: card_detail.php?id=$cardId&message=advertiser_updated");
            exit();
        } else {
            $message = implode(' ', $errors);
            $messageType = 'danger';
        }
    }

    if ($action === 'delete_advertiser') {
        deleteAdvertiser((int)$_POST['advertiser_id']);
        header("Location: card_detail.php?id=$cardId&message=advertiser_deleted");
        exit();
    }

    if ($action === 'update_card_status') {
        updatePipelineCardStatus($cardId, $_POST['status']);
        header("Location: card_detail.php?id=$cardId&message=status_updated");
        exit();
    }
}

// Handle GET messages
if (isset($_GET['message'])) {
    $messageType = 'success';
    switch ($_GET['message']) {
        case 'advertiser_added': $message = 'Advertiser added successfully!'; break;
        case 'advertiser_updated': $message = 'Advertiser updated successfully!'; break;
        case 'advertiser_deleted': $message = 'Advertiser removed successfully!'; break;
        case 'status_updated': $message = 'Card status updated!'; break;
    }
}

// Fetch card and advertisers
$card = getPipelineCard($cardId);
if (!$card) {
    header('Location: pipeline.php');
    exit();
}

$advertisers = getCardAdvertisers($cardId);
$outstanding = $card['card_revenue'] - $card['card_collected'];
$spotsFilled = (float)$card['spots_filled'];
$spotsPct = $card['total_spots'] > 0 ? ($spotsFilled / $card['total_spots']) * 100 : 0;
$barClass = $spotsPct >= 100 ? 'red' : ($spotsPct >= 75 ? 'yellow' : 'green');
$spotsDisplay = $spotsFilled == intval($spotsFilled) ? intval($spotsFilled) : $spotsFilled;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($card['card_name']); ?> | Pipeline | <?php echo SITE_NAME; ?></title>
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

        .btn { padding: .75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all .3s ease; border: none; cursor: pointer; font-size: .9rem; display: inline-flex; align-items: center; gap: .5rem; }
        .btn-primary { background: linear-gradient(135deg, #38b6ff, #0ea5e9); color: white; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(56,182,255,.4); }
        .btn-secondary { background: #64748b; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-sm { padding: .4rem .8rem; font-size: .8rem; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }

        .alert { padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500; }
        .alert-success { background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
        .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        .back-link { display: inline-flex; align-items: center; gap: .5rem; color: #64748b; text-decoration: none; font-weight: 500; margin-bottom: 1.5rem; font-size: .9rem; }
        .back-link:hover { color: #38b6ff; }

        /* Hero header */
        .card-hero { background: linear-gradient(135deg, #38b6ff, #0ea5e9); border-radius: 16px; padding: 2rem; color: white; margin-bottom: 2rem; }
        .card-hero-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
        .card-hero h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: .25rem; }
        .card-hero-meta { display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: .9rem; opacity: .9; }
        .card-hero-meta span { display: flex; align-items: center; gap: .35rem; }
        .status-dropdown { padding: .5rem 1rem; border-radius: 8px; border: 2px solid rgba(255,255,255,.3); background: rgba(255,255,255,.15); color: white; font-weight: 600; font-size: .9rem; font-family: inherit; cursor: pointer; }
        .status-dropdown option { color: #334155; background: white; }
        .spots-progress { margin-top: .5rem; }
        .spots-progress-bar { height: 10px; background: rgba(255,255,255,.3); border-radius: 5px; overflow: hidden; margin-bottom: .5rem; }
        .spots-progress-fill { height: 100%; border-radius: 5px; background: white; transition: width .3s; }
        .spots-progress-text { font-size: .9rem; font-weight: 600; }

        /* Revenue cards */
        .revenue-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .revenue-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; text-align: center; }
        .revenue-card .number { font-size: 2rem; font-weight: 800; margin-bottom: .25rem; }
        .revenue-card .label { color: #64748b; font-weight: 600; font-size: .85rem; }
        .rev-total { color: #38b6ff; }
        .rev-collected { color: #10b981; }
        .rev-outstanding { color: #f59e0b; }

        /* Advertiser table */
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .section-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; }
        .data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; }
        .data-table th, .data-table td { padding: .85rem 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .data-table th { background: #f8fafc; font-weight: 600; color: #374151; font-size: .8rem; text-transform: uppercase; }
        .data-table tr:hover { background: #f9fafb; }

        .status-badge { display: inline-block; padding: .25rem .75rem; border-radius: 20px; font-size: .75rem; font-weight: 600; text-transform: uppercase; }
        .payment-unpaid { background: #fee2e2; color: #991b1b; }
        .payment-partial { background: #fef3c7; color: #92400e; }
        .payment-paid { background: #dcfce7; color: #166534; }

        .size-badge { display: inline-block; padding: .2rem .6rem; border-radius: 20px; font-size: .7rem; font-weight: 600; }
        .size-badge.small { background: #f0fdf4; color: #166534; }
        .size-badge.medium { background: #eff6ff; color: #1e40af; }
        .size-badge.large { background: #fef3c7; color: #92400e; }

        .badge { display: inline-block; padding: .1rem .4rem; border-radius: 12px; font-size: .65rem; font-weight: 600; margin-left: .25rem; }
        .badge-repeat { background: #dcfce7; color: #166534; }
        .badge-lowcodeals { background: #dbeafe; color: #1e40af; }
        .badge-category { background: #f1f5f9; color: #475569; }

        .empty-state { text-align: center; padding: 3rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0; color: #64748b; }

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

        /* Profile search typeahead */
        .profile-search-wrap { position: relative; }
        .profile-results { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 2px solid #38b6ff; border-top: none; border-radius: 0 0 8px 8px; max-height: 200px; overflow-y: auto; z-index: 10; display: none; }
        .profile-results.show { display: block; }
        .profile-result-item { padding: .6rem .75rem; cursor: pointer; font-size: .85rem; border-bottom: 1px solid #f1f5f9; }
        .profile-result-item:hover { background: #f0f9ff; }
        .profile-result-item .biz-name { font-weight: 600; color: #1e293b; }
        .profile-result-item .biz-meta { font-size: .75rem; color: #64748b; }
        .profile-linked-info { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: .75rem; margin-bottom: 1rem; font-size: .85rem; }
        .profile-linked-info .biz-title { font-weight: 700; color: #166534; }
        .profile-linked-info .unlink { color: #64748b; cursor: pointer; font-size: .8rem; text-decoration: underline; margin-left: .5rem; }

        /* Ad size selector */
        .ad-size-group { display: flex; gap: .5rem; margin-bottom: .5rem; }
        .ad-size-option { flex: 1; text-align: center; padding: .75rem .5rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all .2s; }
        .ad-size-option:hover { border-color: #38b6ff; }
        .ad-size-option.selected { border-color: #0ea5e9; background: #f0f9ff; }
        .ad-size-option input { display: none; }
        .ad-size-option .size-name { font-weight: 700; font-size: .9rem; color: #1e293b; }
        .ad-size-option .size-spots { font-size: .75rem; color: #64748b; }

        .balance-info { background: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: .75rem; margin-bottom: 1rem; font-size: .85rem; color: #1e40af; }

        @media (max-width: 768px) {
            .navbar .container { flex-direction: column; gap: 1rem; }
            .revenue-grid { grid-template-columns: 1fr; }
            .form-grid { grid-template-columns: 1fr; }
            .card-hero-top { flex-direction: column; }
            .ad-size-group { flex-direction: column; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'pipeline'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="main-content">
            <a href="pipeline.php" class="back-link">&larr; Back to Pipeline</a>

            <?php if ($message): ?>
                <div class="alert alert-<?php echo $messageType; ?>"><?php echo htmlspecialchars($message); ?></div>
            <?php endif; ?>

            <!-- Hero Header -->
            <div class="card-hero">
                <div class="card-hero-top">
                    <div>
                        <h1><?php echo htmlspecialchars($card['card_name']); ?></h1>
                        <div class="card-hero-meta">
                            <span>&#x1f4cd; <?php echo htmlspecialchars($card['area']); ?></span>
                            <?php if ($card['mail_date']): ?>
                                <span>&#x1f4e8; Mail: <?php echo date('M j, Y', strtotime($card['mail_date'])); ?></span>
                            <?php endif; ?>
                            <?php if (!empty($card['distribution'])): ?>
                                <span>&#x1f4e6; <?php echo number_format($card['distribution']); ?> households</span>
                            <?php endif; ?>
                        </div>
                    </div>
                    <form method="POST" id="statusForm">
                        <input type="hidden" name="action" value="update_card_status">
                        <select name="status" class="status-dropdown" onchange="this.form.submit()">
                            <option value="filling" <?php echo $card['status'] === 'filling' ? 'selected' : ''; ?>>Filling</option>
                            <option value="full" <?php echo $card['status'] === 'full' ? 'selected' : ''; ?>>Full</option>
                            <option value="in_production" <?php echo $card['status'] === 'in_production' ? 'selected' : ''; ?>>In Production</option>
                            <option value="mailed" <?php echo $card['status'] === 'mailed' ? 'selected' : ''; ?>>Mailed</option>
                        </select>
                    </form>
                </div>
                <div class="spots-progress">
                    <div class="spots-progress-bar">
                        <div class="spots-progress-fill" style="width:<?php echo min($spotsPct, 100); ?>%"></div>
                    </div>
                    <div class="spots-progress-text"><?php echo $spotsDisplay; ?> / <?php echo $card['total_spots']; ?> spots filled</div>
                </div>
            </div>

            <!-- Revenue Summary -->
            <div class="revenue-grid">
                <div class="revenue-card">
                    <div class="number rev-total">$<?php echo number_format($card['card_revenue'], 2); ?></div>
                    <div class="label">Total Revenue</div>
                </div>
                <div class="revenue-card">
                    <div class="number rev-collected">$<?php echo number_format($card['card_collected'], 2); ?></div>
                    <div class="label">Collected</div>
                </div>
                <div class="revenue-card">
                    <div class="number rev-outstanding">$<?php echo number_format($outstanding, 2); ?></div>
                    <div class="label">Outstanding</div>
                </div>
            </div>

            <!-- Advertiser Table -->
            <div class="section-header">
                <h2 class="section-title">Advertisers</h2>
                <button class="btn btn-primary" onclick="openAdvModal()">+ Add Advertiser</button>
            </div>

            <?php if (empty($advertisers)): ?>
                <div class="empty-state">
                    <p style="font-size:2rem;margin-bottom:.5rem;">&#x1f4cb;</p>
                    <p>No advertisers yet. Add your first advertiser to this card.</p>
                </div>
            <?php else: ?>
            <div style="overflow-x:auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Business</th>
                            <th>Category</th>
                            <th>Contact</th>
                            <th>Phone</th>
                            <th>Ad Size</th>
                            <th>Amount</th>
                            <th>Paid</th>
                            <th>Payment</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($advertisers as $adv):
                            $adSize = $adv['ad_size'] ?? 'medium';
                        ?>
                        <tr>
                            <td>
                                <strong><?php echo htmlspecialchars($adv['business_name']); ?></strong>
                                <?php if (!empty($adv['repeat_customer'])): ?><span class="badge badge-repeat">Repeat</span><?php endif; ?>
                                <?php if (!empty($adv['lowcodeals_subscriber'])): ?><span class="badge badge-lowcodeals">LowCoDeals</span><?php endif; ?>
                            </td>
                            <td><?php if (!empty($adv['category'])): ?><span class="badge badge-category"><?php echo htmlspecialchars($adv['category']); ?></span><?php endif; ?></td>
                            <td><?php echo htmlspecialchars($adv['contact_name']); ?></td>
                            <td><?php echo htmlspecialchars($adv['phone']); ?></td>
                            <td><span class="size-badge <?php echo $adSize === 'custom' ? 'medium' : $adSize; ?>"><?php echo $adSize === 'custom' ? $adv['spots_consumed'] . ' spots' : ucfirst($adSize); ?></span></td>
                            <td>$<?php echo number_format($adv['total_amount'], 2); ?></td>
                            <td>$<?php echo number_format($adv['amount_paid'], 2); ?></td>
                            <td><span class="status-badge payment-<?php echo $adv['payment_status']; ?>"><?php echo ucfirst($adv['payment_status']); ?></span></td>
                            <td>
                                <div style="display:flex;gap:.5rem;">
                                    <button class="btn btn-secondary btn-sm" onclick="openEditAdvModal(<?php echo htmlspecialchars(json_encode($adv)); ?>)">Edit</button>
                                    <form method="POST" style="display:inline;" onsubmit="return confirm('Remove this advertiser?');">
                                        <input type="hidden" name="action" value="delete_advertiser">
                                        <input type="hidden" name="advertiser_id" value="<?php echo $adv['id']; ?>">
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

            <?php if ($card['notes']): ?>
                <div style="margin-top:2rem;background:white;border-radius:12px;padding:1.5rem;border:1px solid #e2e8f0;">
                    <h3 style="font-size:1rem;font-weight:700;margin-bottom:.5rem;color:#374151;">Card Notes</h3>
                    <p style="color:#64748b;white-space:pre-wrap;"><?php echo htmlspecialchars($card['notes']); ?></p>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Advertiser Modal -->
    <div class="modal-overlay" id="advModal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="advModalTitle">Add Advertiser</h3>
                <button class="modal-close" onclick="closeAdvModal()">&times;</button>
            </div>
            <form method="POST" id="advForm">
                <div class="modal-body">
                    <input type="hidden" name="action" id="advAction" value="add_advertiser">
                    <input type="hidden" name="advertiser_id" id="advId" value="">
                    <input type="hidden" name="profile_id" id="advProfileId" value="">
                    <input type="hidden" name="ad_size" id="advAdSize" value="medium">
                    <input type="hidden" name="spots_consumed" id="advSpotsConsumed" value="1">

                    <!-- Profile Search -->
                    <div class="form-group">
                        <label>Search Advertiser Profile</label>
                        <div class="profile-search-wrap">
                            <input type="text" id="advProfileSearch" placeholder="Type to search profiles..." autocomplete="off">
                            <div class="profile-results" id="profileResults"></div>
                        </div>
                    </div>

                    <div id="profileLinkedInfo" style="display:none;" class="profile-linked-info">
                        <span class="biz-title" id="linkedBizName"></span>
                        <span id="linkedBizRemaining" style="margin-left:.5rem;font-size:.8rem;"></span>
                        <span class="unlink" onclick="unlinkProfile()">or add manually</span>
                    </div>

                    <div class="form-group">
                        <label>Business Name *</label>
                        <input type="text" name="business_name" id="advBusiness" required placeholder="Business name">
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label>Contact Name</label>
                            <input type="text" name="contact_name" id="advContact" placeholder="Contact person">
                        </div>
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="text" name="phone" id="advPhone" placeholder="(555) 555-5555">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" id="advEmail" placeholder="email@example.com">
                    </div>

                    <!-- Ad Size Selector -->
                    <div class="form-group">
                        <label>Ad Size</label>
                        <div class="ad-size-group" id="adSizeGroup">
                            <label class="ad-size-option" onclick="selectAdSize('small')">
                                <input type="radio" name="ad_size_radio" value="small">
                                <div class="size-name">Small</div>
                                <div class="size-spots">0.5 spots</div>
                            </label>
                            <label class="ad-size-option selected" onclick="selectAdSize('medium')">
                                <input type="radio" name="ad_size_radio" value="medium" checked>
                                <div class="size-name">Medium</div>
                                <div class="size-spots">1 spot</div>
                            </label>
                            <label class="ad-size-option" onclick="selectAdSize('large')">
                                <input type="radio" name="ad_size_radio" value="large">
                                <div class="size-name">Large</div>
                                <div class="size-spots">2 spots</div>
                            </label>
                            <label class="ad-size-option" onclick="selectAdSize('custom')">
                                <input type="radio" name="ad_size_radio" value="custom">
                                <div class="size-name">Custom</div>
                                <div class="size-spots">Enter spots</div>
                            </label>
                        </div>
                        <div id="customSpotsWrap" style="display:none;margin-bottom:.75rem;">
                            <label style="font-weight:600;font-size:.85rem;color:#374151;display:block;margin-bottom:.4rem;">Spots Consumed</label>
                            <input type="number" id="advCustomSpots" value="1" min="0.5" step="0.5" style="width:120px;padding:.5rem;border:2px solid #e5e7eb;border-radius:8px;font-size:.9rem;" oninput="updateSpotsPreview()">
                        </div>
                        <div id="spotsPreview" style="font-size:.8rem;color:#64748b;"></div>
                    </div>

                    <div id="balanceInfo" class="balance-info" style="display:none;"></div>

                    <div class="form-group">
                        <label>Price ($)</label>
                        <input type="number" name="total_amount" id="advTotalAmount" value="0" step="0.01" min="0">
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label>Payment Status</label>
                            <select name="payment_status" id="advPayStatus">
                                <option value="unpaid">Unpaid</option>
                                <option value="partial">Partial</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Amount Paid ($)</label>
                            <input type="number" name="amount_paid" id="advAmountPaid" value="0" step="0.01" min="0">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Notes</label>
                        <textarea name="notes" id="advNotes" placeholder="Optional notes..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeAdvModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Advertiser</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        var currentAdSize = 'medium';
        var cardDist = <?php echo (int)$card['distribution']; ?>;
        var cardTotalSpots = <?php echo (int)$card['total_spots']; ?>;
        var cardSpotsFilled = <?php echo (float)$card['spots_filled']; ?>;
        var searchTimer = null;

        function adSizeToSpots(size) {
            if (size === 'custom') return parseFloat(document.getElementById('advCustomSpots').value) || 1.0;
            return size === 'small' ? 0.5 : (size === 'large' ? 2.0 : 1.0);
        }

        function selectAdSize(size) {
            currentAdSize = size;
            document.getElementById('advAdSize').value = size;
            document.getElementById('customSpotsWrap').style.display = (size === 'custom') ? 'block' : 'none';
            document.querySelectorAll('#adSizeGroup .ad-size-option').forEach(function(opt) {
                opt.classList.remove('selected');
                if (opt.querySelector('input').value === size) opt.classList.add('selected');
            });
            updateSpotsPreview();
            updateBalanceInfo();
        }

        function updateSpotsPreview() {
            var consume = adSizeToSpots(currentAdSize);
            document.getElementById('advSpotsConsumed').value = consume;
            var remaining = cardTotalSpots - cardSpotsFilled;
            document.getElementById('spotsPreview').textContent = 'Consumes ' + consume + ' of ' + remaining + ' remaining spots';
        }

        function updateBalanceInfo() {
            var profileId = document.getElementById('advProfileId').value;
            var el = document.getElementById('balanceInfo');

            if (profileId && cardDist > 0) {
                var bizName = document.getElementById('linkedBizName').textContent;
                var remaining = document.getElementById('linkedBizRemaining').dataset.remaining || 0;
                el.innerHTML = 'Card distribution (' + Number(cardDist).toLocaleString() + ') will be deducted from <strong>' + escHtml(bizName) + '</strong>\'s balance (' + Number(remaining).toLocaleString() + ' remaining)';
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        }

        // Profile Search Typeahead
        var _searchResults = [];

        document.getElementById('advProfileSearch').addEventListener('input', function() {
            var term = this.value.trim();
            clearTimeout(searchTimer);
            if (term.length < 2) {
                document.getElementById('profileResults').classList.remove('show');
                return;
            }
            searchTimer = setTimeout(function() {
                var fd = new FormData();
                fd.append('ajax_action', 'search_profiles');
                fd.append('term', term);

                fetch('card_detail.php?id=<?php echo $cardId; ?>', { method: 'POST', body: fd })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        var container = document.getElementById('profileResults');
                        if (!data.success || !data.profiles.length) {
                            _searchResults = [];
                            container.innerHTML = '<div class="profile-result-item" style="color:#94a3b8;">No profiles found</div>';
                            container.classList.add('show');
                            return;
                        }
                        _searchResults = data.profiles;
                        var html = '';
                        data.profiles.forEach(function(p, idx) {
                            html += '<div class="profile-result-item" data-profile-idx="' + idx + '">';
                            html += '<div class="biz-name">' + escHtml(p.business_name) + '</div>';
                            html += '<div class="biz-meta">' + escHtml(p.contact_name || '') + (p.cards_remaining !== undefined ? ' &bull; ' + Number(p.cards_remaining).toLocaleString() + ' cards remaining' : '') + '</div>';
                            html += '</div>';
                        });
                        container.innerHTML = html;
                        container.classList.add('show');
                    });
            }, 300);
        });

        document.getElementById('profileResults').addEventListener('click', function(e) {
            var item = e.target.closest('.profile-result-item');
            if (!item || !item.dataset.profileIdx) return;
            var profile = _searchResults[parseInt(item.dataset.profileIdx)];
            if (profile) selectProfile(profile);
        });

        function selectProfile(profile) {
            document.getElementById('advProfileId').value = profile.id;
            document.getElementById('advBusiness').value = profile.business_name;
            document.getElementById('advContact').value = profile.contact_name || '';
            document.getElementById('advPhone').value = profile.phone || '';
            document.getElementById('advEmail').value = profile.email || '';
            document.getElementById('advProfileSearch').value = '';
            document.getElementById('profileResults').classList.remove('show');

            document.getElementById('linkedBizName').textContent = profile.business_name;
            var remEl = document.getElementById('linkedBizRemaining');
            remEl.textContent = '(' + Number(profile.cards_remaining || 0).toLocaleString() + ' cards remaining)';
            remEl.dataset.remaining = profile.cards_remaining || 0;
            document.getElementById('profileLinkedInfo').style.display = 'block';

            updateBalanceInfo();
        }

        function unlinkProfile() {
            document.getElementById('advProfileId').value = '';
            document.getElementById('profileLinkedInfo').style.display = 'none';
            document.getElementById('balanceInfo').style.display = 'none';
        }

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.profile-search-wrap')) {
                document.getElementById('profileResults').classList.remove('show');
            }
        });

        function escHtml(str) {
            var div = document.createElement('div');
            div.textContent = str || '';
            return div.innerHTML;
        }

        function openAdvModal() {
            document.getElementById('advModalTitle').textContent = 'Add Advertiser';
            document.getElementById('advAction').value = 'add_advertiser';
            document.getElementById('advForm').reset();
            document.getElementById('advId').value = '';
            document.getElementById('advProfileId').value = '';
            document.getElementById('advAdSize').value = 'medium';
            document.getElementById('advTotalAmount').value = '0';
            document.getElementById('advAmountPaid').value = '0';
            document.getElementById('profileLinkedInfo').style.display = 'none';
            document.getElementById('balanceInfo').style.display = 'none';
            document.getElementById('profileResults').classList.remove('show');
            document.getElementById('advProfileSearch').value = '';
            document.getElementById('advCustomSpots').value = '1';
            selectAdSize('medium');
            updateSpotsPreview();
            document.getElementById('advModal').classList.add('show');
        }

        function openEditAdvModal(adv) {
            document.getElementById('advModalTitle').textContent = 'Edit Advertiser';
            document.getElementById('advAction').value = 'update_advertiser';
            document.getElementById('advId').value = adv.id;
            document.getElementById('advProfileId').value = adv.profile_id || '';
            document.getElementById('advAdSize').value = adv.ad_size || 'medium';
            document.getElementById('advBusiness').value = adv.business_name;
            document.getElementById('advContact').value = adv.contact_name || '';
            document.getElementById('advPhone').value = adv.phone || '';
            document.getElementById('advEmail').value = adv.email || '';
            document.getElementById('advTotalAmount').value = adv.total_amount || 0;
            document.getElementById('advPayStatus').value = adv.payment_status;
            document.getElementById('advAmountPaid').value = adv.amount_paid;
            document.getElementById('advNotes').value = adv.notes || '';
            document.getElementById('advProfileSearch').value = '';

            if (adv.profile_id) {
                document.getElementById('linkedBizName').textContent = adv.business_name;
                document.getElementById('linkedBizRemaining').textContent = '';
                document.getElementById('linkedBizRemaining').dataset.remaining = 0;
                document.getElementById('profileLinkedInfo').style.display = 'block';
            } else {
                document.getElementById('profileLinkedInfo').style.display = 'none';
            }

            var advSize = adv.ad_size || 'medium';
            if (advSize === 'custom') {
                document.getElementById('advCustomSpots').value = adv.spots_consumed || 1;
            }
            selectAdSize(advSize);
            updateSpotsPreview();
            document.getElementById('advModal').classList.add('show');
        }

        function closeAdvModal() {
            document.getElementById('advModal').classList.remove('show');
        }

        // Auto-sync amount_paid when payment status changes
        document.getElementById('advPayStatus').addEventListener('change', function() {
            if (this.value === 'paid') {
                var price = parseFloat(document.getElementById('advTotalAmount').value) || 0;
                document.getElementById('advAmountPaid').value = price;
            } else if (this.value === 'unpaid') {
                document.getElementById('advAmountPaid').value = '0';
            }
        });

        document.getElementById('advModal').addEventListener('click', function(e) { if (e.target === this) closeAdvModal(); });
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeAdvModal(); });

        // Auto-hide alerts
        setTimeout(function() {
            document.querySelectorAll('.alert-success, .alert-danger').forEach(function(el) {
                el.style.transition = 'opacity .3s, transform .3s';
                el.style.opacity = '0';
                el.style.transform = 'translateY(-10px)';
                setTimeout(function() { el.remove(); }, 300);
            });
        }, 5000);

        // Initial preview
        updateSpotsPreview();
    </script>
</body>
</html>
