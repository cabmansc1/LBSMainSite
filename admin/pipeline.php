<?php
// admin/pipeline.php - Postcard Pipeline Dashboard (Self-Contained Tabbed Cards)
require_once '../config.php';
require_once 'campaign_functions.php';
require_once 'pipeline_functions.php';

requireCampaignAdminLogin();
$currentAdmin = getCurrentCampaignAdmin();

// Ensure tables exist
ensurePipelineTables();

// Handle AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ajax_action'])) {
    header('Content-Type: application/json');
    $ajaxAction = $_POST['ajax_action'];

    if ($ajaxAction === 'update_status') {
        $ok = updatePipelineCardStatus((int)$_POST['card_id'], $_POST['status']);
        echo json_encode(['success' => $ok]);
        exit();
    }

    if ($ajaxAction === 'search_profiles') {
        $term = trim($_POST['term'] ?? '');
        $results = $term !== '' ? searchAdvertiserProfiles($term) : [];
        echo json_encode(['success' => true, 'profiles' => $results]);
        exit();
    }

    if ($ajaxAction === 'add_advertiser') {
        $errors = validateAdvertiser($_POST);
        if (!empty($errors)) {
            echo json_encode(['success' => false, 'errors' => $errors]);
            exit();
        }
        $id = createAdvertiser($_POST);
        $adv = getPipelineAdvertiser($id);
        echo json_encode(['success' => true, 'advertiser' => $adv]);
        exit();
    }

    if ($ajaxAction === 'update_advertiser') {
        $errors = validateAdvertiser($_POST);
        if (!empty($errors)) {
            echo json_encode(['success' => false, 'errors' => $errors]);
            exit();
        }
        updateAdvertiser((int)$_POST['id'], $_POST);
        $adv = getPipelineAdvertiser((int)$_POST['id']);
        echo json_encode(['success' => true, 'advertiser' => $adv]);
        exit();
    }

    if ($ajaxAction === 'delete_advertiser') {
        $ok = deleteAdvertiser((int)$_POST['id']);
        echo json_encode(['success' => $ok]);
        exit();
    }

    echo json_encode(['success' => false, 'error' => 'Unknown action']);
    exit();
}

// CSV Export
if (isset($_GET['action']) && $_GET['action'] === 'export_csv') {
    $db = getDB();
    $sql = "SELECT c.card_name, c.area, a.business_name, a.ad_size, a.total_amount, a.amount_paid, a.payment_status
            FROM pipeline_advertisers a
            JOIN pipeline_cards c ON a.card_id = c.id
            ORDER BY c.card_name, a.business_name";
    $rows = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="pipeline_export_' . date('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Card Name', 'Area', 'Business Name', 'Ad Size', 'Amount', 'Paid', 'Payment Status']);
    foreach ($rows as $r) {
        fputcsv($out, [
            $r['card_name'],
            $r['area'],
            $r['business_name'],
            ucfirst($r['ad_size']),
            number_format((float)$r['total_amount'], 2),
            number_format((float)$r['amount_paid'], 2),
            ucfirst($r['payment_status'])
        ]);
    }
    fclose($out);
    exit();
}

// Handle form submissions (POST-Redirect-GET)
$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'create_card') {
        $errors = validatePipelineCard($_POST);
        if (empty($errors)) {
            createPipelineCard($_POST);
            header('Location: pipeline.php?message=card_created');
            exit();
        } else {
            $message = implode(' ', $errors);
            $messageType = 'danger';
        }
    }

    if ($action === 'update_card') {
        $errors = validatePipelineCard($_POST);
        if (empty($errors)) {
            updatePipelineCard((int)$_POST['id'], $_POST);
            header('Location: pipeline.php?message=card_updated');
            exit();
        } else {
            $message = implode(' ', $errors);
            $messageType = 'danger';
        }
    }

    if ($action === 'delete_card') {
        deletePipelineCard((int)$_POST['id']);
        header('Location: pipeline.php?message=card_deleted');
        exit();
    }

    if ($action === 'clone_card') {
        $cloneAdvs = !empty($_POST['clone_advertisers']);
        $newId = clonePipelineCard((int)$_POST['id'], $cloneAdvs);
        if ($newId) {
            header('Location: pipeline.php?message=card_cloned');
        } else {
            header('Location: pipeline.php?message=clone_failed');
        }
        exit();
    }
}

// Handle GET messages
if (isset($_GET['message'])) {
    $messageType = 'success';
    switch ($_GET['message']) {
        case 'card_created': $message = 'Card created successfully!'; break;
        case 'card_updated': $message = 'Card updated successfully!'; break;
        case 'card_deleted': $message = 'Card deleted successfully!'; break;
        case 'card_cloned': $message = 'Card cloned successfully!'; break;
        case 'clone_failed': $message = 'Failed to clone card.'; $messageType = 'danger'; break;
    }
}

// Fetch data
$stats = getPipelineStats();
$cards = getAllPipelineCards();
$almostFull = getAlmostFullCards();

// Pre-fetch advertisers for all cards
$cardAdvertisers = [];
foreach ($cards as $card) {
    $cardAdvertisers[$card['id']] = getCardAdvertisers($card['id']);
}

// Prepare chart data
$chartCards = [];
$paymentCounts = ['paid' => 0, 'partial' => 0, 'unpaid' => 0];
$revenueByMonth = [];

foreach ($cards as $card) {
    $prodCost = (float)$card['production_cost'];
    $mailingCost = (float)$card['postage_per_card'] * (int)$card['cards_mailed'];
    $totalCost = $prodCost + $mailingCost;
    $chartCards[] = [
        'name' => $card['card_name'],
        'revenue' => (float)$card['card_revenue'],
        'cost' => $totalCost,
        'profit' => (float)$card['card_revenue'] - $totalCost,
    ];

    // Revenue by mail date month
    $monthKey = !empty($card['mail_date']) ? date('Y-m', strtotime($card['mail_date'])) : null;
    if ($monthKey) {
        if (!isset($revenueByMonth[$monthKey])) {
            $revenueByMonth[$monthKey] = ['revenue' => 0, 'cost' => 0];
        }
        $revenueByMonth[$monthKey]['revenue'] += (float)$card['card_revenue'];
        $revenueByMonth[$monthKey]['cost'] += $totalCost;
    }

    // Payment status counts from advertisers
    foreach ($cardAdvertisers[$card['id']] as $adv) {
        $ps = $adv['payment_status'] ?? 'unpaid';
        if (isset($paymentCounts[$ps])) $paymentCounts[$ps]++;
    }
}

ksort($revenueByMonth);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Postcard Pipeline | <?php echo SITE_NAME; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
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
        .page-actions { display: flex; gap: .75rem; align-items: center; }

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
        .alert-warning { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px solid #f59e0b; color: #92400e; border-radius: 12px; padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; animation: pulse-border 2s infinite; }
        .alert-warning a { color: #b45309; font-weight: 600; text-decoration: underline; }
        .alert-warning a:hover { color: #92400e; }
        @keyframes pulse-border { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,.4); } 50% { box-shadow: 0 0 0 8px rgba(245,158,11,0); } }

        /* Stats row */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stats-card { background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; text-align: center; transition: transform .3s ease; }
        .stats-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,.1); }
        .stats-number { font-size: 2rem; font-weight: 800; color: #38b6ff; margin-bottom: .25rem; }
        .stats-number.green { color: #10b981; }
        .stats-number.orange { color: #f59e0b; }
        .stats-label { color: #64748b; font-weight: 600; font-size: .85rem; }

        /* Card grid */
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
        .pipeline-card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; overflow: hidden; transition: box-shadow .3s, transform .3s; }
        .pipeline-card:hover { box-shadow: 0 8px 25px rgba(0,0,0,.1); transform: translateY(-2px); }
        .pipeline-card.overdue { border-left: 4px solid #ef4444; }
        .overdue-badge { display:inline-flex;align-items:center;gap:.25rem;background:#fee2e2;color:#991b1b;font-size:.7rem;font-weight:600;padding:.15rem .5rem;border-radius:20px; }
        .payment-summary { display:flex;gap:.35rem;margin-top:.35rem; }
        .payment-summary .ps-badge { font-size:.7rem;font-weight:600;padding:.15rem .5rem;border-radius:20px;display:inline-block; }
        .payment-summary .ps-paid { background:#dcfce7;color:#166534; }
        .payment-summary .ps-partial { background:#fef3c7;color:#92400e; }
        .payment-summary .ps-unpaid { background:#fee2e2;color:#991b1b; }
        .pipeline-card-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem .5rem; }
        .pipeline-card-title { font-weight: 700; font-size: 1.05rem; }
        .pipeline-card-title a { color: #1e293b; text-decoration: none; }
        .pipeline-card-title a:hover { color: #38b6ff; }

        /* Tabs */
        .card-tabs { display: flex; border-bottom: 2px solid #e2e8f0; margin: 0 1.25rem; }
        .card-tab { padding: .5rem 1rem; font-size: .8rem; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all .2s; user-select: none; }
        .card-tab:hover { color: #334155; }
        .card-tab.active { color: #0ea5e9; border-bottom-color: #0ea5e9; }
        .card-tab-content { display: none; padding: 1rem 1.25rem 1.25rem; }
        .card-tab-content.active { display: block; }

        /* Overview tab details */
        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: .35rem 0; font-size: .85rem; }
        .detail-label { color: #64748b; font-weight: 500; }
        .detail-value { font-weight: 600; color: #1e293b; }
        .detail-value.green { color: #10b981; }
        .detail-value.orange { color: #f59e0b; }
        .spots-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-bottom: .35rem; }
        .spots-fill { height: 100%; border-radius: 4px; transition: width .3s; }
        .spots-fill.green { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .spots-fill.yellow { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .spots-fill.red { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .pipeline-card-footer { display: flex; justify-content: space-between; align-items: center; gap: .5rem; margin-top: .75rem; padding-top: .75rem; border-top: 1px solid #f1f5f9; }
        .status-select { padding: .4rem .6rem; border-radius: 8px; border: 2px solid #e5e7eb; font-size: .8rem; font-weight: 600; font-family: inherit; cursor: pointer; transition: border-color .3s; background: white; }
        .status-select:focus { outline: none; border-color: #38b6ff; }
        .status-select.filling { border-color: #93c5fd; color: #1e40af; background: #eff6ff; }
        .status-select.full { border-color: #86efac; color: #166534; background: #f0fdf4; }
        .status-select.in_production { border-color: #fcd34d; color: #92400e; background: #fffbeb; }
        .status-select.mailed { border-color: #d1d5db; color: #374151; background: #f9fafb; }

        /* Advertisers tab */
        .adv-table { width: 100%; border-collapse: collapse; font-size: .8rem; }
        .adv-table th { text-align: left; padding: .4rem .5rem; color: #64748b; font-weight: 600; border-bottom: 2px solid #e2e8f0; font-size: .75rem; text-transform: uppercase; letter-spacing: .5px; }
        .adv-table td { padding: .5rem .5rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .adv-table tr:last-child td { border-bottom: none; }
        .payment-badge { padding: .15rem .5rem; border-radius: 20px; font-size: .7rem; font-weight: 600; display: inline-block; }
        .payment-badge.unpaid { background: #fee2e2; color: #991b1b; }
        .payment-badge.partial { background: #fef3c7; color: #92400e; }
        .payment-badge.paid { background: #dcfce7; color: #166534; }
        .size-badge { padding: .15rem .5rem; border-radius: 20px; font-size: .7rem; font-weight: 600; display: inline-block; }
        .size-badge.small { background: #f0fdf4; color: #166534; }
        .size-badge.medium { background: #eff6ff; color: #1e40af; }
        .size-badge.large { background: #fef3c7; color: #92400e; }
        .adv-actions { display: flex; gap: .25rem; }
        .adv-empty { text-align: center; padding: 1.5rem; color: #94a3b8; font-size: .85rem; }

        /* Modals */
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.5); z-index: 1000; align-items: center; justify-content: center; }
        .modal-overlay.show { display: flex; }
        .modal { background: white; border-radius: 16px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; }
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
        .ad-size-group { display: flex; gap: .5rem; margin-bottom: 1rem; }
        .ad-size-option { flex: 1; text-align: center; padding: .75rem .5rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all .2s; }
        .ad-size-option:hover { border-color: #38b6ff; }
        .ad-size-option.selected { border-color: #0ea5e9; background: #f0f9ff; }
        .ad-size-option input { display: none; }
        .ad-size-option .size-name { font-weight: 700; font-size: .9rem; color: #1e293b; }
        .ad-size-option .size-spots { font-size: .75rem; color: #64748b; }

        .balance-info { background: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: .75rem; margin-bottom: 1rem; font-size: .85rem; color: #1e40af; }

        /* Analytics section */
        /* Area Summary */
        .area-summary-table { width:100%;border-collapse:collapse;font-size:.85rem; }
        .area-summary-table th { text-align:left;padding:.6rem .75rem;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;font-size:.75rem;text-transform:uppercase;letter-spacing:.5px; }
        .area-summary-table th.num { text-align:right; }
        .area-summary-table td { padding:.6rem .75rem;border-bottom:1px solid #f1f5f9;font-weight:500; }
        .area-summary-table td.num { text-align:right;font-variant-numeric:tabular-nums; }
        .area-summary-table tr:last-child td { border-bottom:none; }
        .area-summary-table tr:hover td { background:#f8fafc; }
        .area-summary-table tfoot td { border-top:2px solid #e2e8f0;font-weight:700;background:#f8fafc; }
        .area-summary-table .rate-bar { display:inline-block;height:6px;border-radius:3px;background:#e5e7eb;width:60px;vertical-align:middle;margin-left:.5rem; }
        .area-summary-table .rate-fill { display:block;height:100%;border-radius:3px;background:linear-gradient(135deg,#3b82f6,#0ea5e9); }

        .analytics-toggle { display: flex; align-items: center; gap: .75rem; cursor: pointer; padding: .75rem 1.25rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 1rem; transition: all .3s; user-select: none; }
        .analytics-toggle:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); }
        .analytics-toggle .toggle-arrow { font-size: 1rem; transition: transform .3s; color: #64748b; }
        .analytics-toggle .toggle-arrow.open { transform: rotate(90deg); }
        .analytics-toggle .toggle-label { font-weight: 700; font-size: 1rem; color: #1e293b; }
        .analytics-panel { display: none; margin-bottom: 2rem; }
        .analytics-panel.open { display: block; }
        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .chart-card { background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 4px 6px rgba(0,0,0,.05); border: 1px solid #e2e8f0; }
        .chart-card h4 { font-size: .9rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem; }
        .chart-card canvas { max-height: 280px; }

        @media (max-width: 768px) {
            .card-grid { grid-template-columns: 1fr; }
            .navbar .container { flex-direction: column; gap: 1rem; }
            .page-header { flex-direction: column; align-items: stretch; }
            .form-grid { grid-template-columns: 1fr; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .ad-size-group { flex-direction: column; }
            .charts-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'pipeline'; require_once __DIR__ . '/includes/nav.php'; ?>

    <div class="container">
        <div class="main-content">
            <div class="page-header">
                <h1 class="page-title">Postcard Pipeline</h1>
                <div class="page-actions">
                    <a href="pipeline.php?action=export_csv" class="btn btn-secondary">Export CSV</a>
                    <button class="btn btn-primary" onclick="openCardModal()">+ New Card</button>
                </div>
            </div>

            <?php if ($message): ?>
                <div class="alert alert-<?php echo $messageType; ?>"><?php echo htmlspecialchars($message); ?></div>
            <?php endif; ?>

            <?php if (!empty($almostFull)): ?>
                <div class="alert alert-warning">
                    <span style="font-size:1.5rem;">&#x1f514;</span>
                    <div>
                        <strong>Almost Full!</strong>
                        <?php foreach ($almostFull as $af):
                            $remaining = $af['total_spots'] - $af['spots_filled'];
                        ?>
                            <a href="card_detail.php?id=<?php echo $af['id']; ?>"><?php echo htmlspecialchars($af['card_name']); ?></a>
                            (<?php echo $remaining == intval($remaining) ? intval($remaining) : $remaining; ?> spot<?php echo $remaining != 1 ? 's' : ''; ?> left)
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endif; ?>

            <!-- Card Stats Row -->
            <div class="stats-grid">
                <div class="stats-card">
                    <div class="stats-number" id="statTotalCards"><?php echo $stats['total_cards']; ?></div>
                    <div class="stats-label">Total Cards</div>
                </div>
                <div class="stats-card">
                    <div class="stats-number" id="statFilling"><?php echo $stats['filling']; ?></div>
                    <div class="stats-label">Filling</div>
                </div>
                <div class="stats-card">
                    <div class="stats-number green" id="statFull"><?php echo $stats['full']; ?></div>
                    <div class="stats-label">Full</div>
                </div>
                <div class="stats-card">
                    <div class="stats-number orange" id="statInProduction"><?php echo $stats['in_production']; ?></div>
                    <div class="stats-label">In Production</div>
                </div>
                <div class="stats-card">
                    <div class="stats-number" id="statMailed"><?php echo $stats['mailed']; ?></div>
                    <div class="stats-label">Mailed</div>
                </div>
            </div>

            <!-- Financial Stats Row -->
            <div class="stats-grid">
                <div class="stats-card">
                    <div class="stats-number green" id="statRevenue">$<?php echo number_format($stats['total_revenue'], 0); ?></div>
                    <div class="stats-label">Total Revenue</div>
                </div>
                <div class="stats-card">
                    <div class="stats-number" style="color:#3b82f6;" id="statCollected">$<?php echo number_format($stats['total_collected'], 0); ?></div>
                    <div class="stats-label">Collected <span id="statCollectionRate" style="font-size:.75rem;color:#94a3b8;">(<?php echo $stats['total_revenue'] > 0 ? round($stats['total_collected'] / $stats['total_revenue'] * 100) : 0; ?>%)</span></div>
                </div>
                <div class="stats-card">
                    <div class="stats-number orange" id="statOutstanding">$<?php echo number_format($stats['outstanding'], 0); ?></div>
                    <div class="stats-label">Outstanding</div>
                </div>
                <div class="stats-card">
                    <div class="stats-number" style="color:#ef4444;" id="statCosts">$<?php echo number_format($stats['total_cost'], 0); ?></div>
                    <div class="stats-label">Total Costs</div>
                </div>
                <div class="stats-card">
                    <div class="stats-number" id="statProfit" style="color:<?php echo $stats['total_profit'] >= 0 ? '#10b981' : '#ef4444'; ?>;">$<?php echo number_format($stats['total_profit'], 0); ?></div>
                    <div class="stats-label">Net Profit</div>
                </div>
            </div>

            <!-- Analytics Toggle -->
            <div class="analytics-toggle" onclick="toggleAnalytics()">
                <span class="toggle-arrow" id="analyticsArrow">&#x25B6;</span>
                <span class="toggle-label">Analytics</span>
            </div>
            <div class="analytics-panel" id="analyticsPanel">
                <div class="charts-grid">
                    <div class="chart-card">
                        <h4>Revenue vs Costs vs Profit by Card</h4>
                        <canvas id="revenueChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h4>Payment Status</h4>
                        <canvas id="paymentChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h4>Pipeline Status</h4>
                        <canvas id="statusChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h4>Revenue Trend by Mail Date</h4>
                        <canvas id="trendChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Area Summary Toggle -->
            <div class="analytics-toggle" onclick="toggleAreaSummary()">
                <span class="toggle-arrow" id="areaSummaryArrow">&#x25B6;</span>
                <span class="toggle-label">Summary by Area</span>
            </div>
            <div class="analytics-panel" id="areaSummaryPanel">
                <div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 4px 6px rgba(0,0,0,.05);border:1px solid #e2e8f0;overflow-x:auto;">
                    <table class="area-summary-table" id="areaSummaryTable">
                        <thead>
                            <tr>
                                <th>Area</th>
                                <th class="num">Cards</th>
                                <th class="num">Revenue</th>
                                <th class="num">Collected</th>
                                <th class="num">Outstanding</th>
                                <th class="num">Costs</th>
                                <th class="num">Profit</th>
                                <th class="num">Collection Rate</th>
                            </tr>
                        </thead>
                        <tbody id="areaSummaryBody"></tbody>
                        <tfoot id="areaSummaryFoot"></tfoot>
                    </table>
                </div>
            </div>

            <!-- Filter Bar -->
            <?php
                $areas = [];
                foreach ($cards as $c) {
                    $a = trim($c['area']);
                    if ($a !== '' && !in_array($a, $areas)) $areas[] = $a;
                }
                sort($areas);
            ?>
            <div class="filter-bar" style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;align-items:center;">
                <input type="text" id="filterSearch" placeholder="Search card name..." style="padding:.6rem 1rem;border:2px solid #e5e7eb;border-radius:8px;font-size:.9rem;font-family:inherit;min-width:220px;transition:border-color .3s;" oninput="applyFilters()">
                <select id="filterArea" style="padding:.6rem 1rem;border:2px solid #e5e7eb;border-radius:8px;font-size:.9rem;font-family:inherit;transition:border-color .3s;" onchange="applyFilters()">
                    <option value="">All Locations</option>
                    <?php foreach ($areas as $a): ?>
                        <option value="<?php echo htmlspecialchars($a); ?>"><?php echo htmlspecialchars($a); ?></option>
                    <?php endforeach; ?>
                </select>
                <select id="filterStatus" style="padding:.6rem 1rem;border:2px solid #e5e7eb;border-radius:8px;font-size:.9rem;font-family:inherit;transition:border-color .3s;" onchange="applyFilters()">
                    <option value="">All Statuses</option>
                    <option value="filling" selected>Filling</option>
                    <option value="full">Full</option>
                    <option value="in_production">In Production</option>
                    <option value="mailed">Mailed</option>
                </select>
                <select id="sortBy" style="padding:.6rem 1rem;border:2px solid #e5e7eb;border-radius:8px;font-size:.9rem;font-family:inherit;transition:border-color .3s;" onchange="applyFilters()">
                    <option value="">Default Order</option>
                    <option value="revenue_desc">Revenue (High to Low)</option>
                    <option value="revenue_asc">Revenue (Low to High)</option>
                    <option value="outstanding_desc">Outstanding (High to Low)</option>
                    <option value="outstanding_asc">Outstanding (Low to High)</option>
                    <option value="fill_desc">% Filled (High to Low)</option>
                    <option value="fill_asc">% Filled (Low to High)</option>
                    <option value="mail_date_asc">Mail Date (Earliest)</option>
                    <option value="mail_date_desc">Mail Date (Latest)</option>
                </select>
                <span id="filterCount" style="font-size:.85rem;color:#64748b;font-weight:500;"></span>
            </div>

            <!-- Card Grid -->
            <?php if (empty($cards)): ?>
                <div style="text-align:center;padding:3rem;background:white;border-radius:12px;border:1px solid #e2e8f0;color:#64748b;">
                    <p style="font-size:2rem;margin-bottom:.5rem;">&#x1f4ed;</p>
                    <p>No cards yet. Create your first postcard!</p>
                    <button class="btn btn-primary" style="margin-top:1rem;" onclick="openCardModal()">+ New Card</button>
                </div>
            <?php else: ?>
            <div class="card-grid">
                <?php foreach ($cards as $card):
                    $spotsFilled = (float)$card['spots_filled'];
                    $pct = $card['total_spots'] > 0 ? ($spotsFilled / $card['total_spots']) * 100 : 0;
                    $barClass = $pct >= 100 ? 'red' : ($pct >= 75 ? 'yellow' : 'green');
                    $outstanding = $card['card_revenue'] - $card['card_collected'];
                    $advertisers = $cardAdvertisers[$card['id']] ?? [];
                    $spotsDisplay = $spotsFilled == intval($spotsFilled) ? intval($spotsFilled) : $spotsFilled;
                ?>
                <?php
                    $cardProdCost = (float)$card['production_cost'];
                    $cardMailingCost = (float)$card['postage_per_card'] * (int)$card['cards_mailed'];
                    $cardTotalCost = $cardProdCost + $cardMailingCost;
                    $cardOutstanding = (float)$card['card_revenue'] - (float)$card['card_collected'];
                    $advPayments = ['paid' => 0, 'partial' => 0, 'unpaid' => 0];
                    foreach ($cardAdvertisers[$card['id']] as $adv) {
                        $ps = $adv['payment_status'] ?? 'unpaid';
                        if (isset($advPayments[$ps])) $advPayments[$ps]++;
                    }
                    $isOverdue = !empty($card['mail_date']) && strtotime($card['mail_date']) < time() && $cardOutstanding > 0;
                ?>
                <div class="pipeline-card<?php if ($isOverdue) echo ' overdue'; ?>" id="card-<?php echo $card['id']; ?>" data-name="<?php echo htmlspecialchars(strtolower($card['card_name'])); ?>" data-card-name="<?php echo htmlspecialchars($card['card_name']); ?>" data-area="<?php echo htmlspecialchars($card['area']); ?>" data-status="<?php echo $card['status']; ?>" data-revenue="<?php echo (float)$card['card_revenue']; ?>" data-cost="<?php echo $cardTotalCost; ?>" data-outstanding="<?php echo $cardOutstanding; ?>" data-collected="<?php echo (float)$card['card_collected']; ?>" data-fill-pct="<?php echo round($pct, 2); ?>" data-mail-date="<?php echo $card['mail_date'] ?? ''; ?>" data-paid="<?php echo $advPayments['paid']; ?>" data-partial="<?php echo $advPayments['partial']; ?>" data-unpaid="<?php echo $advPayments['unpaid']; ?>">
                    <div class="pipeline-card-header">
                        <div class="pipeline-card-title"><a href="card_detail.php?id=<?php echo $card['id']; ?>"><?php echo htmlspecialchars($card['card_name']); ?></a></div>
                        <div style="display:flex;align-items:center;gap:.5rem;">
                            <?php if ($isOverdue): ?><span class="overdue-badge">OVERDUE</span><?php endif; ?>
                            <span style="font-size:.75rem;color:#94a3b8;">&#x1f4cd; <?php echo htmlspecialchars($card['area']); ?></span>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="card-tabs">
                        <div class="card-tab active" onclick="switchTab(this, 'overview-<?php echo $card['id']; ?>')">Overview</div>
                        <div class="card-tab" onclick="switchTab(this, 'advertisers-<?php echo $card['id']; ?>')">Advertisers (<?php echo count($advertisers); ?>)</div>
                    </div>

                    <!-- Overview Tab -->
                    <div class="card-tab-content active" id="overview-<?php echo $card['id']; ?>">
                        <div class="detail-row">
                            <span class="detail-label">Stage</span>
                            <select class="status-select <?php echo $card['status']; ?>" data-card-id="<?php echo $card['id']; ?>" onchange="updateStatus(this)">
                                <option value="filling" <?php echo $card['status'] === 'filling' ? 'selected' : ''; ?>>Filling</option>
                                <option value="full" <?php echo $card['status'] === 'full' ? 'selected' : ''; ?>>Full</option>
                                <option value="in_production" <?php echo $card['status'] === 'in_production' ? 'selected' : ''; ?>>In Production</option>
                                <option value="mailed" <?php echo $card['status'] === 'mailed' ? 'selected' : ''; ?>>Mailed</option>
                            </select>
                        </div>

                        <div style="margin: .5rem 0;">
                            <div class="detail-row" style="margin-bottom:.25rem;">
                                <span class="detail-label">Fill Progress</span>
                                <span class="detail-value"><?php echo $spotsDisplay; ?> / <?php echo $card['total_spots']; ?> spots</span>
                            </div>
                            <div class="spots-bar"><div class="spots-fill <?php echo $barClass; ?>" style="width:<?php echo min($pct, 100); ?>%"></div></div>
                        </div>

                        <div class="detail-row">
                            <span class="detail-label">Revenue</span>
                            <span class="detail-value green">$<?php echo number_format($card['card_revenue'], 0); ?></span>
                        </div>
                        <?php
                            $prodCost = (float)$card['production_cost'];
                            $postagePerCard = (float)$card['postage_per_card'];
                            $cardsMailed = (int)$card['cards_mailed'];
                            $mailingCost = $postagePerCard * $cardsMailed;
                            $totalCost = $prodCost + $mailingCost;
                        ?>
                        <?php if ($prodCost > 0): ?>
                        <div class="detail-row">
                            <span class="detail-label">Production Cost</span>
                            <span class="detail-value" style="color:#ef4444;">$<?php echo number_format($prodCost, 2); ?></span>
                        </div>
                        <?php endif; ?>
                        <?php if ($mailingCost > 0): ?>
                        <div class="detail-row">
                            <span class="detail-label">Mailing Cost</span>
                            <span class="detail-value" style="color:#ef4444;">$<?php echo number_format($mailingCost, 2); ?></span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label" style="font-size:.75rem;color:#94a3b8;">&nbsp;&nbsp;<?php echo number_format($cardsMailed); ?> cards @ $<?php echo number_format($postagePerCard, 4); ?> ea</span>
                            <span></span>
                        </div>
                        <?php endif; ?>
                        <?php if ($totalCost > 0): ?>
                        <div class="detail-row" style="border-top:1px solid #f1f5f9;padding-top:.35rem;margin-top:.25rem;">
                            <span class="detail-label">Profit</span>
                            <?php $profit = $card['card_revenue'] - $totalCost; ?>
                            <span class="detail-value <?php echo $profit >= 0 ? 'green' : ''; ?>" <?php if ($profit < 0): ?>style="color:#ef4444;"<?php endif; ?>>$<?php echo number_format($profit, 2); ?></span>
                        </div>
                        <?php endif; ?>
                        <?php if ($outstanding > 0): ?>
                        <div class="detail-row">
                            <span class="detail-label">Outstanding</span>
                            <span class="detail-value orange">$<?php echo number_format($outstanding, 0); ?></span>
                        </div>
                        <?php endif; ?>
                        <?php if ($advPayments['paid'] + $advPayments['partial'] + $advPayments['unpaid'] > 0): ?>
                        <div class="detail-row">
                            <span class="detail-label">Payments</span>
                            <div class="payment-summary">
                                <?php if ($advPayments['paid'] > 0): ?><span class="ps-badge ps-paid"><?php echo $advPayments['paid']; ?> paid</span><?php endif; ?>
                                <?php if ($advPayments['partial'] > 0): ?><span class="ps-badge ps-partial"><?php echo $advPayments['partial']; ?> partial</span><?php endif; ?>
                                <?php if ($advPayments['unpaid'] > 0): ?><span class="ps-badge ps-unpaid"><?php echo $advPayments['unpaid']; ?> unpaid</span><?php endif; ?>
                            </div>
                        </div>
                        <?php endif; ?>
                        <?php if (!empty($card['distribution'])): ?>
                        <div class="detail-row">
                            <span class="detail-label">Distribution</span>
                            <span class="detail-value"><?php echo number_format($card['distribution']); ?> households</span>
                        </div>
                        <?php endif; ?>
                        <?php if (!empty($card['start_date'])): ?>
                        <div class="detail-row">
                            <span class="detail-label">Start Date</span>
                            <span class="detail-value"><?php echo date('M j, Y', strtotime($card['start_date'])); ?></span>
                        </div>
                        <?php endif; ?>
                        <?php if (!empty($card['mail_date'])): ?>
                        <div class="detail-row">
                            <span class="detail-label">Target Mail Date</span>
                            <span class="detail-value"><?php echo date('M j, Y', strtotime($card['mail_date'])); ?></span>
                        </div>
                        <?php endif; ?>

                        <div class="pipeline-card-footer">
                            <a href="card_detail.php?id=<?php echo $card['id']; ?>" class="btn btn-primary btn-sm">Full Details</a>
                            <div style="display:flex;gap:.5rem;">
                                <button class="btn btn-secondary btn-sm" onclick="openEditCardModal(<?php echo htmlspecialchars(json_encode($card)); ?>)">Edit</button>
                                <button class="btn btn-sm" style="background:#8b5cf6;color:white;" onclick="openCloneModal(<?php echo $card['id']; ?>, <?php echo htmlspecialchars(json_encode($card['card_name'])); ?>)">Clone</button>
                                <form method="POST" style="display:inline;" onsubmit="return confirm('Delete this card and all its advertisers?');">
                                    <input type="hidden" name="action" value="delete_card">
                                    <input type="hidden" name="id" value="<?php echo $card['id']; ?>">
                                    <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Advertisers Tab -->
                    <div class="card-tab-content" id="advertisers-<?php echo $card['id']; ?>">
                        <div id="adv-list-<?php echo $card['id']; ?>">
                        <?php if (empty($advertisers)): ?>
                            <div class="adv-empty">No advertisers yet</div>
                        <?php else: ?>
                            <table class="adv-table">
                                <thead>
                                    <tr>
                                        <th>Business</th>
                                        <th>Size</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                <?php foreach ($advertisers as $adv):
                                    $adSize = $adv['ad_size'] ?? 'medium';
                                ?>
                                    <tr id="adv-row-<?php echo $adv['id']; ?>">
                                        <td style="font-weight:600;">
                                            <?php echo htmlspecialchars($adv['business_name']); ?>
                                            <?php if (!empty($adv['repeat_customer'])): ?><span class="payment-badge paid" style="font-size:.6rem;">R</span><?php endif; ?>
                                            <?php if (!empty($adv['lowcodeals_subscriber'])): ?><span class="payment-badge" style="background:#dbeafe;color:#1e40af;font-size:.6rem;">LC</span><?php endif; ?>
                                        </td>
                                        <td><span class="size-badge <?php echo $adSize === 'custom' ? 'medium' : $adSize; ?>"><?php echo $adSize === 'custom' ? $adv['spots_consumed'] . ' spots' : ucfirst($adSize); ?></span></td>
                                        <td>$<?php echo number_format($adv['total_amount'], 0); ?></td>
                                        <td><span class="payment-badge <?php echo $adv['payment_status']; ?>"><?php echo ucfirst($adv['payment_status']); ?></span></td>
                                        <td>
                                            <div class="adv-actions">
                                                <button class="btn btn-secondary btn-xs" onclick="openEditAdvModal(<?php echo htmlspecialchars(json_encode($adv)); ?>)">Edit</button>
                                                <button class="btn btn-danger btn-xs" onclick="deleteAdv(<?php echo $adv['id']; ?>, <?php echo $card['id']; ?>)">Del</button>
                                            </div>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                                </tbody>
                            </table>
                            <div style="margin-top:.5rem;font-size:.8rem;color:#64748b;">
                                <?php echo $spotsDisplay; ?> / <?php echo $card['total_spots']; ?> spots filled
                            </div>
                        <?php endif; ?>
                        </div>
                        <div style="margin-top:.75rem;">
                            <button class="btn btn-success btn-sm" onclick="openAddAdvModal(<?php echo $card['id']; ?>, <?php echo (int)$card['distribution']; ?>, <?php echo (int)$card['total_spots']; ?>, <?php echo (float)$card['spots_filled']; ?>)">+ Add Advertiser</button>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Card Modal (Add/Edit) -->
    <div class="modal-overlay" id="cardModal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="cardModalTitle">New Card</h3>
                <button class="modal-close" onclick="closeCardModal()">&times;</button>
            </div>
            <form method="POST" id="cardForm">
                <div class="modal-body">
                    <input type="hidden" name="action" id="cardAction" value="create_card">
                    <input type="hidden" name="id" id="cardId" value="">

                    <div class="form-group">
                        <label>Card Name *</label>
                        <input type="text" name="card_name" id="cardName" required placeholder="e.g., March 2026 - Mt Pleasant">
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label>Area *</label>
                            <input type="text" name="area" id="cardArea" required placeholder="e.g., Mount Pleasant">
                        </div>
                        <div class="form-group">
                            <label>Mail Date</label>
                            <input type="date" name="mail_date" id="cardMailDate">
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label>Total Spots</label>
                            <input type="number" name="total_spots" id="cardTotalSpots" value="8" min="1">
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select name="status" id="cardStatus">
                                <option value="filling">Filling</option>
                                <option value="full">Full</option>
                                <option value="in_production">In Production</option>
                                <option value="mailed">Mailed</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label>Distribution (households)</label>
                            <input type="number" name="distribution" id="cardDistribution" value="0" min="0">
                        </div>
                        <div class="form-group">
                            <label>Start Date</label>
                            <input type="date" name="start_date" id="cardStartDate">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Production Cost ($)</label>
                        <input type="number" name="production_cost" id="cardProductionCost" value="0" min="0" step="0.01">
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label>Postage Per Card ($)</label>
                            <input type="number" name="postage_per_card" id="cardPostagePerCard" value="0" min="0" step="0.0001">
                        </div>
                        <div class="form-group">
                            <label>Cards Mailed</label>
                            <input type="number" name="cards_mailed" id="cardCardsMailed" value="0" min="0" oninput="updateMailingCostPreview()">
                        </div>
                    </div>
                    <div id="mailingCostPreview" style="font-size:.85rem;color:#64748b;margin-bottom:1rem;display:none;"></div>

                    <div class="form-group">
                        <label>Display Order</label>
                        <input type="number" name="display_order" id="cardOrder" value="0" min="0">
                    </div>

                    <div class="form-group">
                        <label>Notes</label>
                        <textarea name="notes" id="cardNotes" placeholder="Optional notes..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeCardModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Card</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Advertiser Modal (Add/Edit) -->
    <div class="modal-overlay" id="advModal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="advModalTitle">Add Advertiser</h3>
                <button class="modal-close" onclick="closeAdvModal()">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="advId" value="">
                <input type="hidden" id="advCardId" value="">
                <input type="hidden" id="advProfileId" value="">
                <input type="hidden" id="advCardDist" value="0">
                <input type="hidden" id="advCardTotalSpots" value="8">
                <input type="hidden" id="advCardSpotsFilled" value="0">

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
                    <input type="text" id="advBusinessName" required placeholder="Business name">
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Contact Name</label>
                        <input type="text" id="advContactName" placeholder="Contact name">
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="text" id="advPhone" placeholder="Phone number">
                    </div>
                </div>

                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="advEmail" placeholder="Email address">
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
                    <input type="number" id="advPrice" value="0" min="0" step="0.01">
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Payment Status</label>
                        <select id="advPaymentStatus">
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Amount Paid ($)</label>
                        <input type="number" id="advAmountPaid" value="0" min="0" step="0.01">
                    </div>
                </div>

                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="advNotes" placeholder="Optional notes..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeAdvModal()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="saveAdvertiser()">Save Advertiser</button>
            </div>
        </div>
    </div>

    <!-- Clone Card Modal -->
    <div class="modal-overlay" id="cloneModal">
        <div class="modal" style="max-width:450px;">
            <div class="modal-header">
                <h3 id="cloneModalTitle">Clone Card</h3>
                <button class="modal-close" onclick="closeCloneModal()">&times;</button>
            </div>
            <form method="POST" id="cloneForm">
                <input type="hidden" name="action" value="clone_card">
                <input type="hidden" name="id" id="cloneCardId" value="">
                <div class="modal-body">
                    <p style="margin-bottom:1rem;color:#475569;">This will create a copy of the card with status reset to <strong>Filling</strong> and dates cleared.</p>
                    <label style="display:flex;align-items:center;gap:.75rem;cursor:pointer;">
                        <input type="checkbox" name="clone_advertisers" value="1" style="width:18px;height:18px;accent-color:#8b5cf6;">
                        <span style="font-weight:600;color:#374151;font-size:.9rem;">Also clone advertisers (payment reset to unpaid)</span>
                    </label>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeCloneModal()">Cancel</button>
                    <button type="submit" class="btn" style="background:#8b5cf6;color:white;">Clone Card</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        var currentAdSize = 'medium';
        var searchTimer = null;

        // Mailing cost preview in card modal
        function updateMailingCostPreview() {
            var postage = parseFloat(document.getElementById('cardPostagePerCard').value) || 0;
            var cards = parseInt(document.getElementById('cardCardsMailed').value) || 0;
            var preview = document.getElementById('mailingCostPreview');
            if (postage > 0 && cards > 0) {
                var total = postage * cards;
                preview.textContent = 'Total mailing cost: $' + total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        }
        document.getElementById('cardPostagePerCard').addEventListener('input', updateMailingCostPreview);

        // Card filters
        function applyFilters() {
            var search = document.getElementById('filterSearch').value.trim().toLowerCase();
            var area = document.getElementById('filterArea').value;
            var status = document.getElementById('filterStatus').value;
            var sortBy = document.getElementById('sortBy').value;
            var cards = document.querySelectorAll('.pipeline-card');
            var shown = 0;
            var total = cards.length;

            // Stats accumulators
            var counts = { filling: 0, full: 0, in_production: 0, mailed: 0 };
            var totalRevenue = 0, totalCost = 0, totalOutstanding = 0, totalCollected = 0;

            cards.forEach(function(card) {
                var nameMatch = !search || card.dataset.name.indexOf(search) !== -1;
                var areaMatch = !area || card.dataset.area === area;
                var statusMatch = !status || card.dataset.status === status;
                var visible = nameMatch && areaMatch && statusMatch;
                card.style.display = visible ? '' : 'none';
                if (visible) {
                    shown++;
                    var s = card.dataset.status;
                    if (counts.hasOwnProperty(s)) counts[s]++;
                    totalRevenue += parseFloat(card.dataset.revenue) || 0;
                    totalCost += parseFloat(card.dataset.cost) || 0;
                    totalOutstanding += parseFloat(card.dataset.outstanding) || 0;
                    totalCollected += parseFloat(card.dataset.collected) || 0;
                }
            });

            // Sort visible cards
            if (sortBy) {
                var grid = document.querySelector('.card-grid');
                if (grid) {
                    var cardArr = Array.from(cards);
                    cardArr.sort(function(a, b) {
                        var va, vb;
                        switch (sortBy) {
                            case 'revenue_desc': return (parseFloat(b.dataset.revenue) || 0) - (parseFloat(a.dataset.revenue) || 0);
                            case 'revenue_asc': return (parseFloat(a.dataset.revenue) || 0) - (parseFloat(b.dataset.revenue) || 0);
                            case 'outstanding_desc': return (parseFloat(b.dataset.outstanding) || 0) - (parseFloat(a.dataset.outstanding) || 0);
                            case 'outstanding_asc': return (parseFloat(a.dataset.outstanding) || 0) - (parseFloat(b.dataset.outstanding) || 0);
                            case 'fill_desc': return (parseFloat(b.dataset.fillPct) || 0) - (parseFloat(a.dataset.fillPct) || 0);
                            case 'fill_asc': return (parseFloat(a.dataset.fillPct) || 0) - (parseFloat(b.dataset.fillPct) || 0);
                            case 'mail_date_asc':
                                va = a.dataset.mailDate || '9999-12-31';
                                vb = b.dataset.mailDate || '9999-12-31';
                                return va.localeCompare(vb);
                            case 'mail_date_desc':
                                va = a.dataset.mailDate || '0000-01-01';
                                vb = b.dataset.mailDate || '0000-01-01';
                                return vb.localeCompare(va);
                            default: return 0;
                        }
                    });
                    cardArr.forEach(function(card) { grid.appendChild(card); });
                }
            }

            // Update card stats
            document.getElementById('statTotalCards').textContent = shown;
            document.getElementById('statFilling').textContent = counts.filling;
            document.getElementById('statFull').textContent = counts.full;
            document.getElementById('statInProduction').textContent = counts.in_production;
            document.getElementById('statMailed').textContent = counts.mailed;

            // Update financial stats
            var totalProfit = totalRevenue - totalCost;
            document.getElementById('statRevenue').textContent = '$' + Math.round(totalRevenue).toLocaleString();
            document.getElementById('statCosts').textContent = '$' + Math.round(totalCost).toLocaleString();
            document.getElementById('statProfit').textContent = '$' + Math.round(totalProfit).toLocaleString();
            document.getElementById('statProfit').style.color = totalProfit >= 0 ? '#10b981' : '#ef4444';
            document.getElementById('statCollected').textContent = '$' + Math.round(totalCollected).toLocaleString();
            var collectionRate = totalRevenue > 0 ? Math.round(totalCollected / totalRevenue * 100) : 0;
            document.getElementById('statCollectionRate').textContent = '(' + collectionRate + '%)';
            document.getElementById('statOutstanding').textContent = '$' + Math.round(totalOutstanding).toLocaleString();

            // Update area summary if open
            if (document.getElementById('areaSummaryPanel').classList.contains('open')) {
                updateAreaSummary();
            }

            // Update charts if open
            if (window._chartsInitialized) {
                updateChartsFromVisible();
            }

            var countEl = document.getElementById('filterCount');
            if (search || area || status) {
                countEl.textContent = 'Showing ' + shown + ' of ' + total + ' cards';
            } else {
                countEl.textContent = '';
            }
        }

        // Tab switching
        function switchTab(tabEl, contentId) {
            var card = tabEl.closest('.pipeline-card');
            card.querySelectorAll('.card-tab').forEach(function(t) { t.classList.remove('active'); });
            card.querySelectorAll('.card-tab-content').forEach(function(c) { c.classList.remove('active'); });
            tabEl.classList.add('active');
            document.getElementById(contentId).classList.add('active');
        }

        // AJAX status update from dropdown
        function updateStatus(el) {
            var cardId = el.dataset.cardId;
            var newStatus = el.value;
            el.className = 'status-select ' + newStatus;

            var fd = new FormData();
            fd.append('ajax_action', 'update_status');
            fd.append('card_id', cardId);
            fd.append('status', newStatus);

            fetch('pipeline.php', { method: 'POST', body: fd })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (!data.success) {
                        alert('Failed to update status.');
                        location.reload();
                    }
                });
        }

        // Card Modal
        function openCardModal() {
            document.getElementById('cardModalTitle').textContent = 'New Card';
            document.getElementById('cardAction').value = 'create_card';
            document.getElementById('cardForm').reset();
            document.getElementById('cardId').value = '';
            document.getElementById('cardTotalSpots').value = '8';
            document.getElementById('cardOrder').value = '0';
            document.getElementById('cardDistribution').value = '0';
            document.getElementById('cardStartDate').value = '';
            document.getElementById('cardProductionCost').value = '0';
            document.getElementById('cardPostagePerCard').value = '0';
            document.getElementById('cardCardsMailed').value = '0';
            document.getElementById('mailingCostPreview').style.display = 'none';
            document.getElementById('cardModal').classList.add('show');
        }

        function openEditCardModal(card) {
            document.getElementById('cardModalTitle').textContent = 'Edit Card';
            document.getElementById('cardAction').value = 'update_card';
            document.getElementById('cardId').value = card.id;
            document.getElementById('cardName').value = card.card_name;
            document.getElementById('cardArea').value = card.area;
            document.getElementById('cardMailDate').value = card.mail_date || '';
            document.getElementById('cardTotalSpots').value = card.total_spots;
            document.getElementById('cardStatus').value = card.status;
            document.getElementById('cardOrder').value = card.display_order;
            document.getElementById('cardDistribution').value = card.distribution || 0;
            document.getElementById('cardStartDate').value = card.start_date || '';
            document.getElementById('cardNotes').value = card.notes || '';
            document.getElementById('cardProductionCost').value = card.production_cost || 0;
            document.getElementById('cardPostagePerCard').value = card.postage_per_card || 0;
            document.getElementById('cardCardsMailed').value = card.cards_mailed || 0;
            updateMailingCostPreview();
            document.getElementById('cardModal').classList.add('show');
        }

        function closeCardModal() {
            document.getElementById('cardModal').classList.remove('show');
        }

        // Ad Size
        function adSizeToSpots(size) {
            if (size === 'custom') return parseFloat(document.getElementById('advCustomSpots').value) || 1.0;
            return size === 'small' ? 0.5 : (size === 'large' ? 2.0 : 1.0);
        }

        function selectAdSize(size) {
            currentAdSize = size;
            document.querySelectorAll('#adSizeGroup .ad-size-option').forEach(function(opt) {
                opt.classList.remove('selected');
                if (opt.querySelector('input').value === size) opt.classList.add('selected');
            });
            document.getElementById('customSpotsWrap').style.display = (size === 'custom') ? 'block' : 'none';
            updateSpotsPreview();
            updateBalanceInfo();
        }

        function updateSpotsPreview() {
            var totalSpots = parseFloat(document.getElementById('advCardTotalSpots').value) || 8;
            var filled = parseFloat(document.getElementById('advCardSpotsFilled').value) || 0;
            var consume = adSizeToSpots(currentAdSize);
            var remaining = totalSpots - filled;
            document.getElementById('spotsPreview').textContent = 'Consumes ' + consume + ' of ' + remaining + ' remaining spots';
        }

        function updateBalanceInfo() {
            var profileId = document.getElementById('advProfileId').value;
            var dist = parseInt(document.getElementById('advCardDist').value) || 0;
            var el = document.getElementById('balanceInfo');

            if (profileId && dist > 0) {
                var bizName = document.getElementById('linkedBizName').textContent;
                var remaining = document.getElementById('linkedBizRemaining').dataset.remaining || 0;
                el.innerHTML = 'Card distribution (' + Number(dist).toLocaleString() + ') will be deducted from <strong>' + bizName + '</strong>\'s balance (' + Number(remaining).toLocaleString() + ' remaining)';
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

                fetch('pipeline.php', { method: 'POST', body: fd })
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
            document.getElementById('advBusinessName').value = profile.business_name;
            document.getElementById('advContactName').value = profile.contact_name || '';
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

        // Close search results when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.profile-search-wrap')) {
                document.getElementById('profileResults').classList.remove('show');
            }
        });

        // Advertiser Modal
        function openAddAdvModal(cardId, dist, totalSpots, spotsFilled) {
            document.getElementById('advModalTitle').textContent = 'Add Advertiser';
            document.getElementById('advId').value = '';
            document.getElementById('advCardId').value = cardId;
            document.getElementById('advProfileId').value = '';
            document.getElementById('advCardDist').value = dist;
            document.getElementById('advCardTotalSpots').value = totalSpots;
            document.getElementById('advCardSpotsFilled').value = spotsFilled;
            document.getElementById('advProfileSearch').value = '';
            document.getElementById('advBusinessName').value = '';
            document.getElementById('advContactName').value = '';
            document.getElementById('advPhone').value = '';
            document.getElementById('advEmail').value = '';
            document.getElementById('advPrice').value = '0';
            document.getElementById('advPaymentStatus').value = 'unpaid';
            document.getElementById('advAmountPaid').value = '0';
            document.getElementById('advNotes').value = '';
            document.getElementById('profileLinkedInfo').style.display = 'none';
            document.getElementById('balanceInfo').style.display = 'none';
            document.getElementById('profileResults').classList.remove('show');
            selectAdSize('medium');
            document.getElementById('advModal').classList.add('show');
        }

        function openEditAdvModal(adv) {
            document.getElementById('advModalTitle').textContent = 'Edit Advertiser';
            document.getElementById('advId').value = adv.id;
            document.getElementById('advCardId').value = adv.card_id;
            document.getElementById('advProfileId').value = adv.profile_id || '';
            document.getElementById('advProfileSearch').value = '';
            document.getElementById('advBusinessName').value = adv.business_name;
            document.getElementById('advContactName').value = adv.contact_name || '';
            document.getElementById('advPhone').value = adv.phone || '';
            document.getElementById('advEmail').value = adv.email || '';
            document.getElementById('advPrice').value = adv.total_amount || 0;
            document.getElementById('advPaymentStatus').value = adv.payment_status;
            document.getElementById('advAmountPaid').value = adv.amount_paid;
            document.getElementById('advNotes').value = adv.notes || '';

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
            document.getElementById('advModal').classList.add('show');
        }

        function closeAdvModal() {
            document.getElementById('advModal').classList.remove('show');
        }

        function saveAdvertiser() {
            var advId = document.getElementById('advId').value;
            var cardId = document.getElementById('advCardId').value;
            var businessName = document.getElementById('advBusinessName').value.trim();

            if (!businessName) {
                alert('Business name is required.');
                return;
            }

            var fd = new FormData();
            fd.append('ajax_action', advId ? 'update_advertiser' : 'add_advertiser');
            if (advId) fd.append('id', advId);
            fd.append('card_id', cardId);
            fd.append('profile_id', document.getElementById('advProfileId').value);
            fd.append('business_name', businessName);
            fd.append('contact_name', document.getElementById('advContactName').value);
            fd.append('phone', document.getElementById('advPhone').value);
            fd.append('email', document.getElementById('advEmail').value);
            fd.append('ad_size', currentAdSize);
            if (currentAdSize === 'custom') {
                fd.append('spots_consumed', document.getElementById('advCustomSpots').value);
            }
            fd.append('total_amount', document.getElementById('advPrice').value);
            fd.append('payment_status', document.getElementById('advPaymentStatus').value);
            fd.append('amount_paid', document.getElementById('advAmountPaid').value);
            fd.append('notes', document.getElementById('advNotes').value);

            fetch('pipeline.php', { method: 'POST', body: fd })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.success) {
                        closeAdvModal();
                        location.reload();
                    } else {
                        alert(data.errors ? data.errors.join('\n') : 'Failed to save advertiser.');
                    }
                })
                .catch(function() {
                    alert('Network error. Please try again.');
                });
        }

        function deleteAdv(advId, cardId) {
            if (!confirm('Delete this advertiser?')) return;

            var fd = new FormData();
            fd.append('ajax_action', 'delete_advertiser');
            fd.append('id', advId);

            fetch('pipeline.php', { method: 'POST', body: fd })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert('Failed to delete advertiser.');
                    }
                })
                .catch(function() {
                    alert('Network error. Please try again.');
                });
        }

        function escHtml(str) {
            var div = document.createElement('div');
            div.textContent = str || '';
            return div.innerHTML;
        }

        // Clone modal
        function openCloneModal(cardId, cardName) {
            document.getElementById('cloneModalTitle').textContent = 'Clone: ' + cardName;
            document.getElementById('cloneCardId').value = cardId;
            var cb = document.querySelector('#cloneForm input[name="clone_advertisers"]');
            cb.checked = false;
            document.getElementById('cloneModal').classList.add('show');
        }

        function closeCloneModal() {
            document.getElementById('cloneModal').classList.remove('show');
        }

        // Auto-sync amount_paid when payment status changes to "paid"
        document.getElementById('advPaymentStatus').addEventListener('change', function() {
            if (this.value === 'paid') {
                var price = parseFloat(document.getElementById('advPrice').value) || 0;
                document.getElementById('advAmountPaid').value = price;
            } else if (this.value === 'unpaid') {
                document.getElementById('advAmountPaid').value = '0';
            }
        });

        // Modal close handlers
        document.getElementById('cardModal').addEventListener('click', function(e) { if (e.target === this) closeCardModal(); });
        document.getElementById('advModal').addEventListener('click', function(e) { if (e.target === this) closeAdvModal(); });
        document.getElementById('cloneModal').addEventListener('click', function(e) { if (e.target === this) closeCloneModal(); });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeCardModal();
                closeAdvModal();
                closeCloneModal();
            }
        });

        // Auto-hide alerts
        setTimeout(function() {
            document.querySelectorAll('.alert-success, .alert-danger').forEach(function(el) {
                el.style.transition = 'opacity .3s, transform .3s';
                el.style.opacity = '0';
                el.style.transform = 'translateY(-10px)';
                setTimeout(function() { el.remove(); }, 300);
            });
        }, 5000);

        // Analytics toggle
        function toggleAreaSummary() {
            var panel = document.getElementById('areaSummaryPanel');
            var arrow = document.getElementById('areaSummaryArrow');
            var isOpen = panel.classList.toggle('open');
            arrow.classList.toggle('open', isOpen);
            if (isOpen) updateAreaSummary();
        }

        function updateAreaSummary() {
            var cards = document.querySelectorAll('.pipeline-card');
            var areas = {};
            cards.forEach(function(card) {
                if (card.style.display === 'none') return;
                var area = card.dataset.area || 'Unknown';
                if (!areas[area]) areas[area] = { cards: 0, revenue: 0, collected: 0, outstanding: 0, cost: 0 };
                areas[area].cards++;
                areas[area].revenue += parseFloat(card.dataset.revenue) || 0;
                areas[area].collected += parseFloat(card.dataset.collected) || 0;
                areas[area].outstanding += parseFloat(card.dataset.outstanding) || 0;
                areas[area].cost += parseFloat(card.dataset.cost) || 0;
            });

            var keys = Object.keys(areas).sort();
            var tbody = document.getElementById('areaSummaryBody');
            var tfoot = document.getElementById('areaSummaryFoot');
            var html = '';
            var totals = { cards: 0, revenue: 0, collected: 0, outstanding: 0, cost: 0 };

            keys.forEach(function(area) {
                var a = areas[area];
                var profit = a.revenue - a.cost;
                var rate = a.revenue > 0 ? Math.round(a.collected / a.revenue * 100) : 0;
                totals.cards += a.cards;
                totals.revenue += a.revenue;
                totals.collected += a.collected;
                totals.outstanding += a.outstanding;
                totals.cost += a.cost;
                html += '<tr>'
                    + '<td style="font-weight:600;">' + area + '</td>'
                    + '<td class="num">' + a.cards + '</td>'
                    + '<td class="num" style="color:#10b981;">$' + Math.round(a.revenue).toLocaleString() + '</td>'
                    + '<td class="num" style="color:#3b82f6;">$' + Math.round(a.collected).toLocaleString() + '</td>'
                    + '<td class="num" style="color:#f59e0b;">$' + Math.round(a.outstanding).toLocaleString() + '</td>'
                    + '<td class="num" style="color:#ef4444;">$' + Math.round(a.cost).toLocaleString() + '</td>'
                    + '<td class="num" style="color:' + (profit >= 0 ? '#10b981' : '#ef4444') + ';">$' + Math.round(profit).toLocaleString() + '</td>'
                    + '<td class="num">' + rate + '%<span class="rate-bar"><span class="rate-fill" style="width:' + rate + '%;"></span></span></td>'
                    + '</tr>';
            });
            tbody.innerHTML = html;

            var tProfit = totals.revenue - totals.cost;
            var tRate = totals.revenue > 0 ? Math.round(totals.collected / totals.revenue * 100) : 0;
            tfoot.innerHTML = '<tr>'
                + '<td>Total</td>'
                + '<td class="num">' + totals.cards + '</td>'
                + '<td class="num" style="color:#10b981;">$' + Math.round(totals.revenue).toLocaleString() + '</td>'
                + '<td class="num" style="color:#3b82f6;">$' + Math.round(totals.collected).toLocaleString() + '</td>'
                + '<td class="num" style="color:#f59e0b;">$' + Math.round(totals.outstanding).toLocaleString() + '</td>'
                + '<td class="num" style="color:#ef4444;">$' + Math.round(totals.cost).toLocaleString() + '</td>'
                + '<td class="num" style="color:' + (tProfit >= 0 ? '#10b981' : '#ef4444') + ';">$' + Math.round(tProfit).toLocaleString() + '</td>'
                + '<td class="num">' + tRate + '%<span class="rate-bar"><span class="rate-fill" style="width:' + tRate + '%;"></span></span></td>'
                + '</tr>';
        }

        function toggleAnalytics() {
            var panel = document.getElementById('analyticsPanel');
            var arrow = document.getElementById('analyticsArrow');
            var isOpen = panel.classList.toggle('open');
            arrow.classList.toggle('open', isOpen);
            if (isOpen && !window._chartsInitialized) {
                initCharts();
                window._chartsInitialized = true;
            }
        }

        // Chart instances (stored so we can update them)
        var chartInstances = { revenue: null, payment: null, status: null, trend: null };

        // Gather visible card data for charts
        function getVisibleCardData() {
            var cards = document.querySelectorAll('.pipeline-card');
            var result = { cards: [], counts: { filling: 0, full: 0, in_production: 0, mailed: 0 }, payments: { paid: 0, partial: 0, unpaid: 0 }, revenueByMonth: {} };

            cards.forEach(function(card) {
                if (card.style.display === 'none') return;
                var revenue = parseFloat(card.dataset.revenue) || 0;
                var cost = parseFloat(card.dataset.cost) || 0;
                result.cards.push({ name: card.dataset.cardName, revenue: revenue, cost: cost, profit: revenue - cost });

                var s = card.dataset.status;
                if (result.counts.hasOwnProperty(s)) result.counts[s]++;

                result.payments.paid += parseInt(card.dataset.paid) || 0;
                result.payments.partial += parseInt(card.dataset.partial) || 0;
                result.payments.unpaid += parseInt(card.dataset.unpaid) || 0;

                var mailDate = card.dataset.mailDate;
                if (mailDate) {
                    var monthKey = mailDate.substring(0, 7);
                    if (!result.revenueByMonth[monthKey]) result.revenueByMonth[monthKey] = { revenue: 0, cost: 0 };
                    result.revenueByMonth[monthKey].revenue += revenue;
                    result.revenueByMonth[monthKey].cost += cost;
                }
            });

            return result;
        }

        function monthKeyToLabel(k) {
            var parts = k.split('-');
            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return months[parseInt(parts[1]) - 1] + ' ' + parts[0];
        }

        // Chart initialization (lazy - only when panel opens)
        function initCharts() {
            Chart.defaults.font.family = "'Inter', sans-serif";
            var data = getVisibleCardData();

            // 1. Revenue vs Costs vs Profit bar chart
            chartInstances.revenue = new Chart(document.getElementById('revenueChart'), {
                type: 'bar',
                data: {
                    labels: data.cards.map(function(c) { return c.name; }),
                    datasets: [
                        { label: 'Revenue', data: data.cards.map(function(c) { return c.revenue; }), backgroundColor: 'rgba(16,185,129,.7)', borderRadius: 4 },
                        { label: 'Costs', data: data.cards.map(function(c) { return c.cost; }), backgroundColor: 'rgba(239,68,68,.7)', borderRadius: 4 },
                        { label: 'Profit', data: data.cards.map(function(c) { return c.profit; }), backgroundColor: 'rgba(56,182,255,.7)', borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true } },
                        tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString(); } } }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { callback: function(v) { return '$' + v.toLocaleString(); } } },
                        x: { ticks: { maxRotation: 45, minRotation: 0, font: { size: 11 } } }
                    }
                }
            });

            // 2. Payment status donut
            chartInstances.payment = new Chart(document.getElementById('paymentChart'), {
                type: 'doughnut',
                data: {
                    labels: ['Paid', 'Partial', 'Unpaid'],
                    datasets: [{
                        data: [data.payments.paid, data.payments.partial, data.payments.unpaid],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        borderWidth: 0,
                        spacing: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true } },
                        tooltip: { callbacks: { label: function(ctx) { return ctx.label + ': ' + ctx.parsed + ' advertiser' + (ctx.parsed !== 1 ? 's' : ''); } } }
                    }
                }
            });

            // 3. Pipeline status donut
            chartInstances.status = new Chart(document.getElementById('statusChart'), {
                type: 'doughnut',
                data: {
                    labels: ['Filling', 'Full', 'In Production', 'Mailed'],
                    datasets: [{
                        data: [data.counts.filling, data.counts.full, data.counts.in_production, data.counts.mailed],
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6b7280'],
                        borderWidth: 0,
                        spacing: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true } },
                        tooltip: { callbacks: { label: function(ctx) { return ctx.label + ': ' + ctx.parsed + ' card' + (ctx.parsed !== 1 ? 's' : ''); } } }
                    }
                }
            });

            // 4. Revenue trend line chart
            var trendKeys = Object.keys(data.revenueByMonth).sort();
            chartInstances.trend = new Chart(document.getElementById('trendChart'), {
                type: 'line',
                data: {
                    labels: trendKeys.map(monthKeyToLabel),
                    datasets: [
                        { label: 'Revenue', data: trendKeys.map(function(k) { return data.revenueByMonth[k].revenue; }), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.1)', fill: true, tension: .3, pointRadius: 4, pointBackgroundColor: '#10b981' },
                        { label: 'Costs', data: trendKeys.map(function(k) { return data.revenueByMonth[k].cost; }), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.1)', fill: true, tension: .3, pointRadius: 4, pointBackgroundColor: '#ef4444' },
                        { label: 'Profit', data: trendKeys.map(function(k) { return data.revenueByMonth[k].revenue - data.revenueByMonth[k].cost; }), borderColor: '#38b6ff', backgroundColor: 'rgba(56,182,255,.1)', fill: true, tension: .3, pointRadius: 4, pointBackgroundColor: '#38b6ff' }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true } },
                        tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString(); } } }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { callback: function(v) { return '$' + v.toLocaleString(); } } }
                    }
                }
            });
        }

        // Update all charts from currently visible cards
        function updateChartsFromVisible() {
            var data = getVisibleCardData();

            // Revenue bar chart
            if (chartInstances.revenue) {
                chartInstances.revenue.data.labels = data.cards.map(function(c) { return c.name; });
                chartInstances.revenue.data.datasets[0].data = data.cards.map(function(c) { return c.revenue; });
                chartInstances.revenue.data.datasets[1].data = data.cards.map(function(c) { return c.cost; });
                chartInstances.revenue.data.datasets[2].data = data.cards.map(function(c) { return c.profit; });
                chartInstances.revenue.update();
            }

            // Payment donut
            if (chartInstances.payment) {
                chartInstances.payment.data.datasets[0].data = [data.payments.paid, data.payments.partial, data.payments.unpaid];
                chartInstances.payment.update();
            }

            // Status donut
            if (chartInstances.status) {
                chartInstances.status.data.datasets[0].data = [data.counts.filling, data.counts.full, data.counts.in_production, data.counts.mailed];
                chartInstances.status.update();
            }

            // Trend line chart
            if (chartInstances.trend) {
                var trendKeys = Object.keys(data.revenueByMonth).sort();
                chartInstances.trend.data.labels = trendKeys.map(monthKeyToLabel);
                chartInstances.trend.data.datasets[0].data = trendKeys.map(function(k) { return data.revenueByMonth[k].revenue; });
                chartInstances.trend.data.datasets[1].data = trendKeys.map(function(k) { return data.revenueByMonth[k].cost; });
                chartInstances.trend.data.datasets[2].data = trendKeys.map(function(k) { return data.revenueByMonth[k].revenue - data.revenueByMonth[k].cost; });
                chartInstances.trend.update();
            }
        }
        // Apply default filter on page load
        applyFilters();
    </script>
</body>
</html>
