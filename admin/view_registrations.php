<?php
// admin/view_registrations.php - View All Campaign Registrations
require_once '../config.php';
require_once 'campaign_functions.php';

// Check admin authentication
requireCampaignAdminLogin();

$currentAdmin = getCurrentCampaignAdmin();

try {
    $db = getDB();
    
    // Get filter parameters
    $campaign_filter = $_GET['campaign'] ?? '';
    $search_filter = $_GET['search'] ?? '';
    $date_from = $_GET['date_from'] ?? '';
    $date_to = $_GET['date_to'] ?? '';
    $page = max(1, intval($_GET['page'] ?? 1));
    $per_page = 50;
    $offset = ($page - 1) * $per_page;
    
    // Build query based on filters
    $where_conditions = [];
    $params = [];
    
    if (!empty($campaign_filter)) {
        $where_conditions[] = "r.campaign_id = ?";
        $params[] = $campaign_filter;
    }
    
    if (!empty($search_filter)) {
        $where_conditions[] = "(r.name LIKE ? OR r.email LIKE ? OR r.phone LIKE ?)";
        $search_param = "%{$search_filter}%";
        $params[] = $search_param;
        $params[] = $search_param;
        $params[] = $search_param;
    }
    
    if (!empty($date_from)) {
        $where_conditions[] = "DATE(r.registration_date) >= ?";
        $params[] = $date_from;
    }
    
    if (!empty($date_to)) {
        $where_conditions[] = "DATE(r.registration_date) <= ?";
        $params[] = $date_to;
    }
    
    $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';
    
    // Get total count for pagination
    $count_sql = "
        SELECT COUNT(*) 
        FROM campaign_registrations r 
        LEFT JOIN campaigns c ON r.campaign_id = c.id 
        {$where_clause}
    ";
    $stmt = $db->prepare($count_sql);
    $stmt->execute($params);
    $total_registrations = $stmt->fetchColumn();
    $total_pages = ceil($total_registrations / $per_page);
    
    // Get registrations with pagination
    $sql = "
        SELECT r.*, c.campaign_name, c.campaign_code, c.area 
        FROM campaign_registrations r 
        LEFT JOIN campaigns c ON r.campaign_id = c.id 
        {$where_clause}
        ORDER BY r.registration_date DESC 
        LIMIT {$per_page} OFFSET {$offset}
    ";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $registrations = $stmt->fetchAll();
    
    // Get all campaigns for filter dropdown
    $campaigns_stmt = $db->query("SELECT id, campaign_name, campaign_code FROM campaigns ORDER BY campaign_name");
    $all_campaigns = $campaigns_stmt->fetchAll();
    
    // Get registration statistics
    $stats = [];
    $stats['total_registrations'] = $total_registrations;
    $stats['today'] = $db->query("SELECT COUNT(*) FROM campaign_registrations WHERE DATE(registration_date) = CURDATE()")->fetchColumn();
    $stats['this_week'] = $db->query("SELECT COUNT(*) FROM campaign_registrations WHERE registration_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();
    $stats['this_month'] = $db->query("SELECT COUNT(*) FROM campaign_registrations WHERE registration_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
    
} catch (Exception $e) {
    $error_message = "Database error: " . $e->getMessage();
    error_log("View registrations error: " . $e->getMessage());
}

// Handle export request
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    try {
        // Get all registrations for export (no pagination)
        $export_sql = "
            SELECT r.*, c.campaign_name, c.campaign_code, c.area 
            FROM campaign_registrations r 
            LEFT JOIN campaigns c ON r.campaign_id = c.id 
            {$where_clause}
            ORDER BY r.registration_date DESC
        ";
        $stmt = $db->prepare($export_sql);
        $stmt->execute($params);
        $export_data = $stmt->fetchAll();
        
        // Set headers for CSV download
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="registrations_' . date('Y-m-d') . '.csv"');
        
        $output = fopen('php://output', 'w');
        
        // CSV headers
        fputcsv($output, [
            'Registration ID',
            'Campaign Name',
            'Campaign Code',
            'Area',
            'Full Name',
            'Email',
            'Phone',
            'Opted In',
            'Registration Date',
            'IP Address'
        ]);
        
        // CSV data
        foreach ($export_data as $row) {
            fputcsv($output, [
                $row['id'],
                $row['campaign_name'],
                $row['campaign_code'],
                $row['area'],
                $row['name'],
                $row['email'],
                $row['phone'],
                $row['email_opt_in'] ? 'Yes' : 'No',
                $row['registration_date'],
                $row['ip_address']
            ]);
        }
        
        fclose($output);
        exit();
        
    } catch (Exception $e) {
        $export_error = "Export failed: " . $e->getMessage();
        error_log("Export error: " . $e->getMessage());
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>View Registrations | <?php echo SITE_NAME; ?></title>
    
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: #f8fafc;
            color: #334155;
        }
        
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
        
        .nav-link:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem 20px;
        }
        
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        
        .page-title {
            font-size: 2rem;
            font-weight: 800;
            color: #1e293b;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .stats-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            text-align: center;
        }
        
        .stats-number {
            font-size: 2rem;
            font-weight: 800;
            color: #38b6ff;
            margin-bottom: 0.5rem;
        }
        
        .stats-label {
            color: #64748b;
            font-weight: 600;
            font-size: 0.875rem;
        }
        
        .filters-container {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            margin-bottom: 2rem;
            position: relative;
            z-index: 10;
            overflow: visible;
        }
        
        .filters-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .filter-group {
            display: flex;
            flex-direction: column;
            position: relative;
            z-index: 1;
        }
        
        .filter-group label {
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #374151;
            font-size: 0.875rem;
        }
        
        .filter-group input,
        .filter-group select {
            padding: 0.5rem;
            border: 2px solid #e5e7eb;
            border-radius: 6px;
            font-size: 0.875rem;
            background-color: white;
            min-height: 38px;
        }

        .filter-group select {
            cursor: pointer;
            appearance: auto;
            -webkit-appearance: menulist;
            -moz-appearance: menulist;
        }

        .filter-group input:focus,
        .filter-group select:focus {
            outline: none;
            border-color: #38b6ff;
        }
        
        .filter-actions {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 0.5rem 1rem;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            font-size: 0.875rem;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #38b6ff, #0ea5e9);
            color: white;
        }
        
        .btn-success {
            background: #10b981;
            color: white;
        }
        
        .btn-secondary {
            background: #64748b;
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .registrations-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }
        
        .registrations-header {
            background: #f8fafc;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .registrations-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1e293b;
        }
        
        .table-container {
            overflow-x: auto;
        }
        
        .registrations-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .registrations-table th,
        .registrations-table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .registrations-table th {
            background: #f8fafc;
            font-weight: 600;
            color: #374151;
            font-size: 0.875rem;
        }
        
        .registrations-table td {
            font-size: 0.875rem;
            color: #1f2937;
        }
        
        .registrations-table tr:hover {
            background: #f9fafb;
        }
        
        .campaign-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            background: #38b6ff;
            color: white;
        }
        
        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.5rem;
            padding: 1.5rem;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }
        
        .pagination a,
        .pagination span {
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
        }
        
        .pagination a {
            color: #374151;
            border: 1px solid #d1d5db;
        }
        
        .pagination a:hover {
            background: #f3f4f6;
        }
        
        .pagination .current {
            background: #38b6ff;
            color: white;
            border: 1px solid #38b6ff;
        }
        
        .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            color: #64748b;
        }
        
        .empty-state-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            font-weight: 500;
        }
        
        .alert-danger {
            background: #fee2e2;
            border: 1px solid #ef4444;
            color: #991b1b;
        }
        
        @media (max-width: 768px) {
            .page-header {
                flex-direction: column;
                gap: 1rem;
                align-items: stretch;
            }
            
            .filters-grid {
                grid-template-columns: 1fr;
            }
            
            .filter-actions {
                justify-content: center;
            }
            
            .navbar .container {
                flex-direction: column;
                gap: 1rem;
            }
            
            .registrations-table {
                font-size: 0.75rem;
            }
            
            .registrations-table th,
            .registrations-table td {
                padding: 0.5rem 0.25rem;
            }
        }
    </style>
</head>
<body>
    <?php $currentPage = 'campaigns'; require_once __DIR__ . '/includes/nav.php'; ?>
    
    <div class="container">
        <div class="page-header">
            <h1 class="page-title">Campaign Registrations</h1>
        </div>
        
        <?php if (isset($error_message)): ?>
            <div class="alert alert-danger">
                <?php echo $error_message; ?>
            </div>
        <?php endif; ?>
        
        <?php if (isset($export_error)): ?>
            <div class="alert alert-danger">
                <?php echo $export_error; ?>
            </div>
        <?php endif; ?>
        
        <!-- Statistics -->
        <div class="stats-grid">
            <div class="stats-card">
                <div class="stats-number"><?php echo number_format($stats['total_registrations'] ?? 0); ?></div>
                <div class="stats-label">Total Registrations</div>
            </div>
            <div class="stats-card">
                <div class="stats-number"><?php echo number_format($stats['today'] ?? 0); ?></div>
                <div class="stats-label">Today</div>
            </div>
            <div class="stats-card">
                <div class="stats-number"><?php echo number_format($stats['this_week'] ?? 0); ?></div>
                <div class="stats-label">This Week</div>
            </div>
            <div class="stats-card">
                <div class="stats-number"><?php echo number_format($stats['this_month'] ?? 0); ?></div>
                <div class="stats-label">This Month</div>
            </div>
        </div>
        
        <!-- Filters -->
        <div class="filters-container">
            <form method="GET" action="">
                <div class="filters-grid">
                    <div class="filter-group">
                        <label for="campaign">Campaign</label>
                        <select id="campaign" name="campaign">
                            <option value="">All Campaigns</option>
                            <?php foreach ($all_campaigns as $campaign): ?>
                                <option value="<?php echo $campaign['id']; ?>" 
                                        <?php echo $campaign_filter == $campaign['id'] ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars($campaign['campaign_name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="search">Search</label>
                        <input type="text" id="search" name="search" 
                               value="<?php echo htmlspecialchars($search_filter); ?>"
                               placeholder="Name, email, phone...">
                    </div>
                    
                    <div class="filter-group">
                        <label for="date_from">Date From</label>
                        <input type="date" id="date_from" name="date_from" 
                               value="<?php echo htmlspecialchars($date_from); ?>">
                    </div>
                    
                    <div class="filter-group">
                        <label for="date_to">Date To</label>
                        <input type="date" id="date_to" name="date_to" 
                               value="<?php echo htmlspecialchars($date_to); ?>">
                    </div>
                </div>
                
                <div class="filter-actions">
                    <button type="submit" class="btn btn-primary">Apply Filters</button>
                    <a href="?" class="btn btn-secondary">Clear Filters</a>
                    <a href="?<?php echo http_build_query(array_merge($_GET, ['export' => 'csv'])); ?>" 
                       class="btn btn-success">Export CSV</a>
                </div>
            </form>
        </div>
        
        <!-- Registrations Table -->
        <div class="registrations-container">
            <div class="registrations-header">
                <div class="registrations-title">
                    <?php echo number_format($total_registrations); ?> Registration<?php echo $total_registrations != 1 ? 's' : ''; ?>
                    <?php if (!empty($campaign_filter) || !empty($search_filter) || !empty($date_from) || !empty($date_to)): ?>
                        (Filtered)
                    <?php endif; ?>
                </div>
            </div>
            
            <?php if (empty($registrations)): ?>
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>No registrations found</h3>
                    <p>
                        <?php if (!empty($campaign_filter) || !empty($search_filter) || !empty($date_from) || !empty($date_to)): ?>
                            Try adjusting your filters or <a href="?">clear all filters</a> to see more results.
                        <?php else: ?>
                            No one has registered for campaigns yet.
                        <?php endif; ?>
                    </p>
                </div>
            <?php else: ?>
                <div class="table-container">
                    <table class="registrations-table">
                        <thead>
                            <tr>
                                <th>Campaign</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Opted In</th>
                                <th>Registration Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($registrations as $registration): ?>
                                <tr>
                                    <td>
                                        <div class="campaign-badge">
                                            <?php echo htmlspecialchars($registration['campaign_code']); ?>
                                        </div>
                                        <div style="margin-top: 0.25rem; font-size: 0.75rem; color: #64748b;">
                                            <?php echo htmlspecialchars($registration['area']); ?>
                                        </div>
                                    </td>
                                    <td><?php echo htmlspecialchars($registration['name']); ?></td>
                                    <td>
                                        <a href="mailto:<?php echo htmlspecialchars($registration['email']); ?>" 
                                           style="color: #38b6ff; text-decoration: none;">
                                            <?php echo htmlspecialchars($registration['email']); ?>
                                        </a>
                                    </td>
                                    <td>
                                        <?php if ($registration['phone']): ?>
                                            <a href="tel:<?php echo htmlspecialchars($registration['phone']); ?>"
                                               style="color: #38b6ff; text-decoration: none;">
                                                <?php echo htmlspecialchars($registration['phone']); ?>
                                            </a>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; 
                                                     background: <?php echo $registration['email_opt_in'] ? '#dcfce7' : '#fee2e2'; ?>; 
                                                     color: <?php echo $registration['email_opt_in'] ? '#166534' : '#ff6b00'; ?>;">
                                            <?php echo $registration['email_opt_in'] ? 'Yes' : 'No'; ?>
                                        </span>
                                    </td>
                                    <td>
                                        <?php echo date('M j, Y g:i A', strtotime($registration['registration_date'])); ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                
                <!-- Pagination -->
                <?php if ($total_pages > 1): ?>
                    <div class="pagination">
                        <?php if ($page > 1): ?>
                            <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $page - 1])); ?>">← Previous</a>
                        <?php endif; ?>
                        
                        <?php for ($i = max(1, $page - 2); $i <= min($total_pages, $page + 2); $i++): ?>
                            <?php if ($i == $page): ?>
                                <span class="current"><?php echo $i; ?></span>
                            <?php else: ?>
                                <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $i])); ?>"><?php echo $i; ?></a>
                            <?php endif; ?>
                        <?php endfor; ?>
                        
                        <?php if ($page < $total_pages): ?>
                            <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $page + 1])); ?>">Next →</a>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>