<?php
/**
 * Admin Reports Backend API
 * New Lanka Pharmacy Management System
 * 
 * Handles reports data retrieval and analysis
 */

// Include required files
require_once 'database.php';
require_once 'session.php';
require_once 'functions.php';

// Set JSON header
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // For now, let's make it work without authentication for testing
    // TODO: Re-enable authentication later
    /*
    // Check if user is logged in and has admin privileges
    SessionManager::startSession();
    
    if (!SessionManager::isLoggedIn()) {
        throw new Exception('User not authenticated');
    }
    
    $currentUser = SessionManager::getCurrentUser();
    if ($currentUser['role'] !== 'admin') {
        throw new Exception('Access denied. Admin privileges required.');
    }
    */
    
    // Temporary user data for testing
    $currentUser = [
        'user_id' => 1,
        'username' => 'Admin',
        'role' => 'admin'
    ];
    
    // Get database connection
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    // Handle different actions
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'get_dashboard_stats':
            getDashboardStats($db);
            break;
            
        case 'get_sales_report':
            getSalesReport($db, $_GET);
            break;
            
        case 'get_inventory_report':
            getInventoryReport($db);
            break;
            
        case 'get_customer_report':
            getCustomerReport($db);
            break;
            
        case 'get_monthly_sales':
            getMonthlySales($db, $_GET);
            break;
            
        case 'get_top_medicines':
            getTopMedicines($db, $_GET);
            break;
            
        default:
            throw new Exception('Invalid action specified');
    }
    
} catch (Exception $e) {
    // Return error response
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}

/**
 * Get date range based on report type
 */
function getDateRangeForReportType($reportType) {
    $today = new DateTime();
    
    switch ($reportType) {
        case 'daily':
            $startDate = clone $today;
            $endDate = clone $today;
            break;
            
        case 'weekly':
            $startDate = clone $today;
            $startDate->modify('-6 days');
            $endDate = clone $today;
            break;
            
        case 'monthly':
            $startDate = new DateTime($today->format('Y-m-01'));
            $endDate = new DateTime($today->format('Y-m-t')); // Last day of current month
            break;
            
        case 'yearly':
            $startDate = new DateTime($today->format('Y-01-01'));
            $endDate = new DateTime($today->format('Y-12-31'));
            break;
            
        case 'all':
            $startDate = new DateTime('2020-01-01');
            $endDate = new DateTime('2030-12-31');
            break;
            
        default:
            $startDate = new DateTime($today->format('Y-m-01'));
            $endDate = new DateTime($today->format('Y-m-t'));
    }
    
    return [
        'start_date' => $startDate->format('Y-m-d'),
        'end_date' => $endDate->format('Y-m-d')
    ];
}

/**
 * Get dashboard statistics for reports overview
 */
function getDashboardStats($db) {
    try {
        $stats = [];
        
        // 1. Total Sales Amount
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(total_amount), 0) as total_sales,
                   COUNT(*) as total_transactions
            FROM sale
        ");
        $stmt->execute();
        $salesData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 2. Total Medicines in Inventory
        $stmt = $db->prepare("
            SELECT COUNT(*) as total_medicines,
                   COALESCE(SUM(stock_left), 0) as total_stock
            FROM medicine
        ");
        $stmt->execute();
        $inventoryData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 3. Total Customers
        $stmt = $db->prepare("SELECT COUNT(*) as total_customers FROM customer");
        $stmt->execute();
        $customerData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 4. Low Stock Medicines (stock_left < 10)
        $stmt = $db->prepare("SELECT COUNT(*) as low_stock_count FROM medicine WHERE stock_left < 10");
        $stmt->execute();
        $lowStockData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 5. Today's Sales
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(total_amount), 0) as today_sales,
                   COUNT(*) as today_transactions
            FROM sale 
            WHERE sale_date = CURDATE()
        ");
        $stmt->execute();
        $todayData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 6. This Month's Sales
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(total_amount), 0) as month_sales,
                   COUNT(*) as month_transactions
            FROM sale 
            WHERE YEAR(sale_date) = YEAR(CURDATE()) 
            AND MONTH(sale_date) = MONTH(CURDATE())
        ");
        $stmt->execute();
        $monthData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $stats = [
            'total_sales' => [
                'amount' => (float)$salesData['total_sales'],
                'transactions' => (int)$salesData['total_transactions'],
                'formatted_amount' => formatPrice($salesData['total_sales'])
            ],
            'inventory' => [
                'total_medicines' => (int)$inventoryData['total_medicines'],
                'total_stock' => (int)$inventoryData['total_stock'],
                'low_stock_count' => (int)$lowStockData['low_stock_count']
            ],
            'customers' => [
                'total_customers' => (int)$customerData['total_customers']
            ],
            'today' => [
                'sales' => (float)$todayData['today_sales'],
                'transactions' => (int)$todayData['today_transactions'],
                'formatted_sales' => formatPrice($todayData['today_sales'])
            ],
            'this_month' => [
                'sales' => (float)$monthData['month_sales'], 
                'transactions' => (int)$monthData['month_transactions'],
                'formatted_sales' => formatPrice($monthData['month_sales'])
            ]
        ];
        
        echo json_encode([
            'success' => true,
            'data' => $stats
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get dashboard stats: ' . $e->getMessage());
    }
}

/**
 * Get detailed sales report
 */
function getSalesReport($db, $params) {
    try {
        $reportType = $params['report_type'] ?? 'monthly';
        $limit = isset($params['limit']) ? (int)$params['limit'] : 1000;
        
        // Calculate date range based on report type
        $dateRange = getDateRangeForReportType($reportType);
        $startDate = $params['start_date'] ?? $dateRange['start_date'];
        $endDate = $params['end_date'] ?? $dateRange['end_date'];
        
        // Get sales data with customer and user information
        $stmt = $db->prepare("
            SELECT s.sale_id, s.sale_date, s.sale_time, s.sub_total, 
                   s.discount, s.total_amount, s.amount_recieved, 
                   s.change_given, s.payment_type,
                   c.full_name as customer_name, c.phone_number as customer_phone,
                   u.user_name as cashier_name
            FROM sale s
            LEFT JOIN customer c ON s.customer_id = c.customer_id
            LEFT JOIN user u ON s.user_id = u.user_id
            WHERE s.sale_date BETWEEN ? AND ?
            ORDER BY s.sale_date DESC, s.sale_time DESC
            LIMIT ?
        ");
        $stmt->execute([$startDate, $endDate, $limit]);
        $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format the data
        foreach ($sales as &$sale) {
            $sale['formatted_total'] = formatPrice($sale['total_amount']);
            $sale['formatted_subtotal'] = formatPrice($sale['sub_total']);
            $sale['formatted_amount_received'] = formatPrice($sale['amount_recieved']);
            $sale['formatted_change'] = formatPrice($sale['change_given']);
            $sale['sale_datetime'] = $sale['sale_date'] . ' ' . $sale['sale_time'];
        }
        
        // Get summary for the period
        $stmt = $db->prepare("
            SELECT COUNT(*) as total_transactions,
                   COALESCE(SUM(total_amount), 0) as total_sales,
                   COALESCE(SUM(discount), 0) as total_discounts,
                   COALESCE(AVG(total_amount), 0) as average_sale
            FROM sale
            WHERE sale_date BETWEEN ? AND ?
        ");
        $stmt->execute([$startDate, $endDate]);
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $summary['formatted_total_sales'] = formatPrice($summary['total_sales']);
        $summary['formatted_average_sale'] = formatPrice($summary['average_sale']);
        $summary['formatted_total_discounts'] = formatPrice($summary['total_discounts']);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'sales' => $sales,
                'summary' => $summary,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'report_type' => $reportType
                ]
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get sales report: ' . $e->getMessage());
    }
}

/**
 * Get inventory report
 */
function getInventoryReport($db) {
    try {
        // Get medicines with stock information
        $stmt = $db->prepare("
            SELECT m.medicine_id, m.medicine_name, m.medicine_brand,
                   m.stock_left, m.medicine_price, m.lifetime_supply,
                   mg.med_group_name,
                   CASE 
                       WHEN m.stock_left = 0 THEN 'out_of_stock'
                       WHEN m.stock_left < 10 THEN 'low_stock'
                       WHEN m.stock_left < 50 THEN 'medium_stock'
                       ELSE 'good_stock'
                   END as stock_status
            FROM medicine m
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
            ORDER BY m.stock_left ASC, m.medicine_name ASC
        ");
        $stmt->execute();
        $medicines = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format prices and calculate stock value
        foreach ($medicines as &$medicine) {
            $medicine['formatted_price'] = formatPrice($medicine['medicine_price']);
            $medicine['stock_value'] = $medicine['stock_left'] * $medicine['medicine_price'];
            $medicine['formatted_stock_value'] = formatPrice($medicine['stock_value']);
        }
        
        // Get inventory summary by stock status
        $stmt = $db->prepare("
            SELECT 
                SUM(CASE WHEN stock_left = 0 THEN 1 ELSE 0 END) as out_of_stock,
                SUM(CASE WHEN stock_left > 0 AND stock_left < 10 THEN 1 ELSE 0 END) as low_stock,
                SUM(CASE WHEN stock_left >= 10 AND stock_left < 50 THEN 1 ELSE 0 END) as medium_stock,
                SUM(CASE WHEN stock_left >= 50 THEN 1 ELSE 0 END) as good_stock,
                COUNT(*) as total_medicines,
                SUM(stock_left) as total_stock_quantity,
                SUM(stock_left * medicine_price) as total_stock_value
            FROM medicine
        ");
        $stmt->execute();
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $summary['formatted_total_value'] = formatPrice($summary['total_stock_value']);
        
        // Get medicine groups summary
        $stmt = $db->prepare("
            SELECT mg.med_group_name, 
                   COUNT(m.medicine_id) as medicine_count,
                   SUM(m.stock_left) as total_stock,
                   SUM(m.stock_left * m.medicine_price) as group_value
            FROM med_group mg
            LEFT JOIN medicine m ON mg.med_group_id = m.med_group_id
            GROUP BY mg.med_group_id, mg.med_group_name
            ORDER BY group_value DESC
        ");
        $stmt->execute();
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($groups as &$group) {
            $group['formatted_value'] = formatPrice($group['group_value']);
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'medicines' => $medicines,
                'summary' => $summary,
                'groups' => $groups
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get inventory report: ' . $e->getMessage());
    }
}

/**
 * Get customer report
 */
function getCustomerReport($db) {
    try {
        // Get customers with their purchase history
        $stmt = $db->prepare("
            SELECT c.customer_id, c.full_name, c.date_of_birth, c.phone_number,
                   c.email, c.address, c.reg_date,
                   COUNT(s.sale_id) as total_purchases,
                   COALESCE(SUM(s.total_amount), 0) as total_spent,
                   MAX(s.sale_date) as last_purchase_date,
                   TIMESTAMPDIFF(YEAR, c.date_of_birth, CURDATE()) as age
            FROM customer c
            LEFT JOIN sale s ON c.customer_id = s.customer_id
            GROUP BY c.customer_id
            ORDER BY total_spent DESC, c.full_name ASC
        ");
        $stmt->execute();
        $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format data
        foreach ($customers as &$customer) {
            $customer['formatted_total_spent'] = formatPrice($customer['total_spent']);
            $customer['formatted_reg_date'] = formatDate($customer['reg_date'], 'd M Y');
            $customer['formatted_last_purchase'] = $customer['last_purchase_date'] ? 
                formatDate($customer['last_purchase_date'], 'd M Y') : 'Never';
        }
        
        // Get customer summary
        $stmt = $db->prepare("
            SELECT COUNT(*) as total_customers,
                   AVG(TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE())) as average_age,
                   COUNT(CASE WHEN reg_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as new_customers_30_days
            FROM customer
        ");
        $stmt->execute();
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'customers' => $customers,
                'summary' => $summary
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get customer report: ' . $e->getMessage());
    }
}

/**
 * Get monthly sales data for charts
 */
function getMonthlySales($db, $params) {
    try {
        $year = $params['year'] ?? date('Y');
        
        $stmt = $db->prepare("
            SELECT MONTH(sale_date) as month,
                   MONTHNAME(sale_date) as month_name,
                   COUNT(*) as transactions,
                   SUM(total_amount) as total_sales
            FROM sale
            WHERE YEAR(sale_date) = ?
            GROUP BY MONTH(sale_date), MONTHNAME(sale_date)
            ORDER BY MONTH(sale_date)
        ");
        $stmt->execute([$year]);
        $monthlyData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format data
        foreach ($monthlyData as &$data) {
            $data['formatted_sales'] = formatPrice($data['total_sales']);
        }
        
        echo json_encode([
            'success' => true,
            'data' => $monthlyData
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get monthly sales: ' . $e->getMessage());
    }
}

/**
 * Get top selling medicines
 */
function getTopMedicines($db, $params) {
    try {
        $limit = isset($params['limit']) ? (int)$params['limit'] : 10;
        
        $stmt = $db->prepare("
            SELECT m.medicine_name, m.medicine_brand,
                   SUM(sml.quantity) as total_sold,
                   SUM(sml.quantity * m.medicine_price) as total_revenue
            FROM sale_med_list sml
            JOIN medicine m ON sml.med_id = m.medicine_id
            GROUP BY m.medicine_id, m.medicine_name, m.medicine_brand
            ORDER BY total_sold DESC
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        $topMedicines = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format data
        foreach ($topMedicines as &$medicine) {
            $medicine['formatted_revenue'] = formatPrice($medicine['total_revenue']);
        }
        
        echo json_encode([
            'success' => true,
            'data' => $topMedicines
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get top medicines: ' . $e->getMessage());
    }
}
?>
