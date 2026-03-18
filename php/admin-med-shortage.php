<?php
/**
 * Admin Medicine Shortage Data Provider
 * New Lanka Pharmacy Management System
 * 
 * Provides JSON data for the admin medicine shortage HTML page
 */

// Include required files
require_once 'database.php';
require_once 'session.php';
require_once 'functions.php';

/**
 * Calculate estimated days of supply left
 * @param int $currentStock Current stock level
 * @param int $lifetimeSupply Lifetime supply used
 * @return int Estimated days left
 */
function calculateDaysSupplyLeft($currentStock, $lifetimeSupply) {
    if ($lifetimeSupply <= 0) {
        return -1; // Unknown
    }
    
    $dailyUsage = $lifetimeSupply / 365; // Assume lifetime is over a year
    if ($dailyUsage <= 0) {
        return -1;
    }
    
    return max(0, round($currentStock / $dailyUsage));
}

/**
 * Get reorder priority based on stock and usage
 * @param int $currentStock Current stock level
 * @param int $lifetimeSupply Lifetime supply used
 * @return string Priority level
 */
function getReorderPriority($currentStock, $lifetimeSupply) {
    if ($currentStock == 0) {
        return 'urgent';
    } elseif ($currentStock <= 5) {
        return 'high';
    } elseif ($currentStock <= 10) {
        return 'medium';
    } else {
        return 'low';
    }
}

// Set JSON header
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // For now, let's make it work without authentication for testing
    // TODO: Re-enable authentication later
    /*
    // Check if user is logged in and is admin
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
    
    // Get action parameter from JSON POST data or fallback to GET/POST
    $rawInput = file_get_contents('php://input');
    $jsonInput = json_decode($rawInput, true);
    
    // Get and parse input data ONCE at the beginning
    $rawInput = file_get_contents('php://input');
    $jsonInput = json_decode($rawInput, true);
    
    // Merge all possible input sources with JSON taking priority
    $allInput = array_merge($_GET, $_POST, $jsonInput ?: []);
    
    $action = $allInput['action'] ?? 'get_shortage_medicines';
    
    // Debug information for development
    $debugInfo = [
        'method' => $_SERVER['REQUEST_METHOD'],
        'action' => $action,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    // Route to appropriate function based on action
    switch ($action) {
        case 'get_shortage_medicines':
            $data = getShortageMedicines($db, $allInput);
            break;
            
        case 'get_shortage_statistics':
            $data = getShortageStatistics($db, $allInput);
            break;
            
        case 'search_shortage_medicines':
            $data = searchShortageMedicines($db, $allInput);
            break;
            
        case 'generate_shortage_report':
            $data = generateShortageReport($db, $allInput);
            break;
            
        default:
            throw new Exception('Invalid action specified: ' . $action);
    }
    
    // Return successful response
    echo json_encode([
        'success' => true,
        'data' => $data,
        'user' => [
            'username' => $currentUser['username'],
            'role' => $currentUser['role']
        ],
        'debug' => $debugInfo
    ]);
    
} catch (Exception $e) {
    // Return error response
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => $debugInfo ?? ['error' => 'Failed before debug info initialization']
    ]);
}

/**
 * Get medicines with low stock or out of stock
 * @param PDO $db Database connection
 * @return array Array of shortage medicines with pagination
 */
function getShortageMedicines($db, $input = []) {
    try {
        // Get pagination parameters from unified input
        $page = (int)($input['page'] ?? 1);
        $limit = (int)($input['limit'] ?? 20);
        $searchTerm = $input['search'] ?? '';
        $stockThreshold = (int)($input['threshold'] ?? 10);
        
        $offset = ($page - 1) * $limit;
        
        // Build WHERE clause for shortage medicines
        $whereClause = "WHERE m.stock_left <= ?";
        $params = [$stockThreshold];
        
        // Add search functionality
        if (!empty($searchTerm)) {
            $whereClause .= " AND (m.medicine_name LIKE ? 
                              OR m.medicine_brand LIKE ? 
                              OR mg.med_group_name LIKE ?)";
            $searchParam = '%' . $searchTerm . '%';
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        // Get total count
        $countSql = "
            SELECT COUNT(*) as total
            FROM medicine m
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
            $whereClause
        ";
        
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $totalCount = $countStmt->fetch()['total'];
        
        // If no results found, return empty result set
        if ($totalCount == 0) {
            return [
                'medicines' => [],
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => 0,
                    'total_records' => 0,
                    'per_page' => $limit,
                    'has_next' => false,
                    'has_previous' => false
                ],
                'search' => [
                    'term' => $searchTerm,
                    'threshold' => $stockThreshold
                ]
            ];
        }
        
        // Get shortage medicines with details
        $sql = "
            SELECT 
                m.medicine_id,
                m.medicine_name,
                m.medicine_brand,
                m.stock_left,
                m.medicine_price,
                m.lifetime_supply,
                mg.med_group_name as category,
                mg.med_group_id,
                CASE 
                    WHEN m.stock_left = 0 THEN 'out_of_stock'
                    WHEN m.stock_left <= 5 THEN 'critical_stock'
                    WHEN m.stock_left <= 10 THEN 'low_stock'
                    ELSE 'normal_stock'
                END as stock_status,
                CASE 
                    WHEN m.stock_left = 0 THEN 'Out of Stock'
                    WHEN m.stock_left <= 5 THEN 'Critical Stock'
                    WHEN m.stock_left <= 10 THEN 'Low Stock'
                    ELSE 'Normal Stock'
                END as stock_status_text,
                CASE 
                    WHEN m.stock_left = 0 THEN 'danger'
                    WHEN m.stock_left <= 5 THEN 'critical'
                    WHEN m.stock_left <= 10 THEN 'warning'
                    ELSE 'good'
                END as status_class
            FROM medicine m
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
            $whereClause
            ORDER BY 
                CASE 
                    WHEN m.stock_left = 0 THEN 1
                    WHEN m.stock_left <= 5 THEN 2
                    WHEN m.stock_left <= 10 THEN 3
                    ELSE 4
                END,
                m.medicine_name ASC
            LIMIT ? OFFSET ?
        ";
        
        // Add pagination parameters to the params array
        $sqlParams = array_merge($params, [$limit, $offset]);
        
        $stmt = $db->prepare($sql);
        $stmt->execute($sqlParams);
        
        $medicines = $stmt->fetchAll();
        
        // Format medicine data
        $formattedMedicines = [];
        foreach ($medicines as $medicine) {
            $formattedMedicines[] = [
                'medicine_id' => $medicine['medicine_id'],
                'medicine_name' => $medicine['medicine_name'],
                'medicine_brand' => $medicine['medicine_brand'],
                'category' => $medicine['category'] ?: 'Uncategorized',
                'stock_left' => (int)$medicine['stock_left'],
                'medicine_price' => number_format((float)$medicine['medicine_price'], 2),
                'price_numeric' => (float)$medicine['medicine_price'],
                'stock_status' => $medicine['stock_status'],
                'stock_status_text' => $medicine['stock_status_text'],
                'status_class' => $medicine['status_class'],
                'lifetime_supply' => (int)$medicine['lifetime_supply'],
                'days_supply_left' => calculateDaysSupplyLeft($medicine['stock_left'], $medicine['lifetime_supply']),
                'reorder_priority' => getReorderPriority($medicine['stock_left'], $medicine['lifetime_supply'])
            ];
        }
        
        // Calculate pagination info
        $totalPages = ceil($totalCount / $limit);
        
        return [
            'medicines' => $formattedMedicines,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'total_records' => (int)$totalCount,
                'per_page' => $limit,
                'has_next' => $page < $totalPages,
                'has_previous' => $page > 1
            ],
            'search' => [
                'term' => $searchTerm,
                'threshold' => $stockThreshold
            ]
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to retrieve shortage medicines: ' . $e->getMessage());
    }
}

/**
 * Get shortage statistics and summary
 * @param PDO $db Database connection
 * @return array Statistics about medicine shortages
 */
function getShortageStatistics($db, $input = []) {
    try {
        $stockThreshold = (int)($_GET['threshold'] ?? 10);
        
        // Get shortage counts by category
        $sql = "
            SELECT 
                COUNT(CASE WHEN m.stock_left = 0 THEN 1 END) as out_of_stock_count,
                COUNT(CASE WHEN m.stock_left > 0 AND m.stock_left <= 5 THEN 1 END) as critical_stock_count,
                COUNT(CASE WHEN m.stock_left > 5 AND m.stock_left <= 10 THEN 1 END) as low_stock_count,
                COUNT(CASE WHEN m.stock_left <= :threshold THEN 1 END) as total_shortage_count,
                COUNT(*) as total_medicines,
                AVG(m.stock_left) as average_stock,
                SUM(CASE WHEN m.stock_left = 0 THEN m.medicine_price * 10 ELSE 0 END) as potential_revenue_loss,
                COUNT(DISTINCT mg.med_group_id) as affected_categories
            FROM medicine m
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':threshold', $stockThreshold, PDO::PARAM_INT);
        $stmt->execute();
        $stats = $stmt->fetch();
        
        // Get shortage by category  
        $categorySql = "
            SELECT 
                mg.med_group_name as category,
                COUNT(CASE WHEN m.stock_left = 0 THEN 1 END) as out_of_stock,
                COUNT(CASE WHEN m.stock_left > 0 AND m.stock_left <= ? THEN 1 END) as low_stock,
                COUNT(*) as total_in_category
            FROM medicine m
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
            WHERE m.stock_left <= ?
            GROUP BY mg.med_group_id, mg.med_group_name
            ORDER BY (COUNT(CASE WHEN m.stock_left = 0 THEN 1 END) + 
                     COUNT(CASE WHEN m.stock_left > 0 AND m.stock_left <= ? THEN 1 END)) DESC
        ";
        
        $stmt = $db->prepare($categorySql);
        $stmt->execute([$stockThreshold, $stockThreshold, $stockThreshold]);
        $categoryStats = $stmt->fetchAll();
        
        // Get most critical medicines
        $criticalSql = "
            SELECT 
                m.medicine_id,
                m.medicine_name,
                m.stock_left,
                mg.med_group_name as category
            FROM medicine m
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
            WHERE m.stock_left <= 5
            ORDER BY m.stock_left ASC, m.medicine_name ASC
            LIMIT 10
        ";
        
        $stmt = $db->prepare($criticalSql);
        $stmt->execute();
        $criticalMedicines = $stmt->fetchAll();
        
        return [
            'summary' => [
                'out_of_stock_count' => (int)$stats['out_of_stock_count'],
                'critical_stock_count' => (int)$stats['critical_stock_count'],
                'low_stock_count' => (int)$stats['low_stock_count'],
                'total_shortage_count' => (int)$stats['total_shortage_count'],
                'total_medicines' => (int)$stats['total_medicines'],
                'average_stock' => round((float)$stats['average_stock'], 1),
                'potential_revenue_loss' => number_format((float)$stats['potential_revenue_loss'], 2),
                'affected_categories' => (int)$stats['affected_categories'],
                'shortage_percentage' => round(($stats['total_shortage_count'] / $stats['total_medicines']) * 100, 1)
            ],
            'category_breakdown' => $categoryStats,
            'critical_medicines' => $criticalMedicines,
            'threshold' => $stockThreshold
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to retrieve shortage statistics: ' . $e->getMessage());
    }
}

/**
 * Search shortage medicines with advanced filters
 * @param PDO $db Database connection
 * @return array Filtered shortage medicines
 */
function searchShortageMedicines($db, $input = []) {
    try {
        $searchTerm = trim($input['search'] ?? '');
        $category = trim($input['category'] ?? '');
        $stockStatus = trim($input['stock_status'] ?? '');
        $sortBy = trim($input['sort_by'] ?? 'priority');
        $sortOrder = trim($input['sort_order'] ?? 'ASC');
        $page = (int)($input['page'] ?? 1);
        $limit = (int)($input['limit'] ?? 20);
        
        $offset = ($page - 1) * $limit;
        $params = [];
        $whereConditions = ["m.stock_left <= 10"]; // Base condition for shortage
        
        // Add search term filter
        if (!empty($searchTerm)) {
            $whereConditions[] = "(m.medicine_name LIKE :search 
                                  OR m.medicine_brand LIKE :search 
                                  OR mg.med_group_name LIKE :search)";
            $params[':search'] = '%' . $searchTerm . '%';
        }
        
        // Add category filter
        if (!empty($category)) {
            $whereConditions[] = "mg.med_group_name = :category";
            $params[':category'] = $category;
        }
        
        // Add stock status filter
        if (!empty($stockStatus)) {
            switch ($stockStatus) {
                case 'out_of_stock':
                    $whereConditions[] = "m.stock_left = 0";
                    break;
                case 'critical_stock':
                    $whereConditions[] = "m.stock_left > 0 AND m.stock_left <= 5";
                    break;
                case 'low_stock':
                    $whereConditions[] = "m.stock_left > 5 AND m.stock_left <= 10";
                    break;
            }
        }
        
        $whereClause = "WHERE " . implode(" AND ", $whereConditions);
        
        // Build ORDER BY clause
        $orderClause = "ORDER BY ";
        switch ($sortBy) {
            case 'priority':
                $orderClause .= "CASE WHEN m.stock_left = 0 THEN 1 WHEN m.stock_left <= 5 THEN 2 ELSE 3 END ASC, m.medicine_name ASC";
                break;
            case 'name':
                $orderClause .= "m.medicine_name " . $sortOrder;
                break;
            case 'stock':
                $orderClause .= "m.stock_left " . $sortOrder;
                break;
            case 'category':
                $orderClause .= "mg.med_group_name " . $sortOrder . ", m.medicine_name ASC";
                break;
            case 'price':
                $orderClause .= "m.medicine_price " . $sortOrder;
                break;
            default:
                $orderClause .= "m.medicine_name ASC";
        }
        
        // Get total count
        $countSql = "
            SELECT COUNT(*) as total
            FROM medicine m
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
            $whereClause
        ";
        
        $stmt = $db->prepare($countSql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        $totalCount = $stmt->fetch()['total'];
        
        // Get filtered results
        $sql = "
            SELECT 
                m.medicine_id,
                m.medicine_name,
                m.medicine_brand,
                m.stock_left,
                m.medicine_price,
                mg.med_group_name as category,
                CASE 
                    WHEN m.stock_left = 0 THEN 'Out of Stock'
                    WHEN m.stock_left <= 5 THEN 'Critical Stock'
                    WHEN m.stock_left <= 10 THEN 'Low Stock'
                    ELSE 'Normal Stock'
                END as stock_status_text,
                CASE 
                    WHEN m.stock_left = 0 THEN 'danger'
                    WHEN m.stock_left <= 5 THEN 'critical'
                    WHEN m.stock_left <= 10 THEN 'warning'
                    ELSE 'good'
                END as status_class
            FROM medicine m
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
            $whereClause
            $orderClause
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $medicines = $stmt->fetchAll();
        
        return [
            'medicines' => $medicines,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => ceil($totalCount / $limit),
                'total_records' => (int)$totalCount,
                'per_page' => $limit
            ],
            'filters' => [
                'search' => $searchTerm,
                'category' => $category,
                'stock_status' => $stockStatus,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder
            ]
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to search shortage medicines: ' . $e->getMessage());
    }
}

/**
 * Generate shortage report data
 * @param PDO $db Database connection
 * @return array Report data for shortage medicines
 */
function generateShortageReport($db, $input = []) {
    try {
        $reportType = $input['type'] ?? 'summary';
        
        // Get comprehensive shortage data
        $sql = "
            SELECT 
                m.medicine_id,
                m.medicine_name,
                m.medicine_brand,
                m.stock_left,
                m.medicine_price,
                m.lifetime_supply,
                mg.med_group_name as category,
                CASE 
                    WHEN m.stock_left = 0 THEN 'Out of Stock'
                    WHEN m.stock_left <= 5 THEN 'Critical Stock'
                    WHEN m.stock_left <= 10 THEN 'Low Stock'
                END as stock_status,
                ROUND((m.stock_left / NULLIF(m.lifetime_supply, 0)) * 365, 0) as estimated_days_left,
                m.medicine_price * (10 - m.stock_left) as estimated_reorder_cost
            FROM medicine m
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
            WHERE m.stock_left <= 10
            ORDER BY 
                CASE 
                    WHEN m.stock_left = 0 THEN 1
                    WHEN m.stock_left <= 5 THEN 2
                    ELSE 3
                END,
                mg.med_group_name,
                m.medicine_name
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $shortageData = $stmt->fetchAll();
        
        // Calculate report summary
        $summary = [
            'total_shortage_items' => count($shortageData),
            'out_of_stock' => 0,
            'critical_stock' => 0,
            'low_stock' => 0,
            'total_estimated_cost' => 0,
            'categories_affected' => [],
            'brands_affected' => []
        ];
        
        foreach ($shortageData as $item) {
            if ($item['stock_left'] == 0) $summary['out_of_stock']++;
            elseif ($item['stock_left'] <= 5) $summary['critical_stock']++;
            else $summary['low_stock']++;
            
            $summary['total_estimated_cost'] += (float)$item['estimated_reorder_cost'];
            
            if (!empty($item['category']) && !in_array($item['category'], $summary['categories_affected'])) {
                $summary['categories_affected'][] = $item['category'];
            }
            
            if (!empty($item['medicine_brand']) && !in_array($item['medicine_brand'], $summary['brands_affected'])) {
                $summary['brands_affected'][] = $item['medicine_brand'];
            }
        }
        
        return [
            'report_data' => $shortageData,
            'summary' => $summary,
            'generated_at' => date('Y-m-d H:i:s'),
            'report_type' => $reportType
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to generate shortage report: ' . $e->getMessage());
    }
}

// End of file
?>
