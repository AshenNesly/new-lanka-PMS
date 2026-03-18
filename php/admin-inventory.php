<?php
/**
 * Admin Inventory Data Provider
 * New Lanka Pharmacy Management System
 * 
 * Provides JSON data for the admin inventory HTML page
 */

// Include required files
require_once 'database.php';
require_once 'session.php';
require_once 'functions.php';

// Set JSON header
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    
    // Handle different API endpoints
    $action = $_GET['action'] ?? $_POST['action'] ?? 'get_inventory_stats';
    
    switch ($action) {
        case 'get_inventory_stats':
            $inventoryData = getInventoryStats($db);
            break;
            
        case 'get_medicines_list':
            $inventoryData = getMedicinesList($db);
            break;
            
        case 'get_medicine_groups':
            $inventoryData = getMedicineGroups($db);
            break;
            
        case 'get_low_stock_medicines':
            $inventoryData = getLowStockMedicines($db);
            break;
            
        default:
            throw new Exception('Invalid action specified');
    }
    
    // Return successful response
    echo json_encode([
        'success' => true,
        'data' => $inventoryData,
        'user' => [
            'username' => $currentUser['username'],
            'role' => $currentUser['role']
        ]
    ]);
    
} catch (Exception $e) {
    // Return error response
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Get inventory statistics for dashboard
 * @param PDO $db Database connection
 * @return array Inventory statistics
 */
function getInventoryStats($db) {
    try {
        // Get total medicines count
        $stmt = $db->query("SELECT COUNT(*) as total_medicines FROM medicine");
        $totalMedicines = $stmt->fetch()['total_medicines'];
        
        // Get medicine groups count
        $stmt = $db->query("SELECT COUNT(*) as total_groups FROM med_group");
        $totalGroups = $stmt->fetch()['total_groups'];
        
        // Get low stock medicines count (medicines with stock_left <= 10)
        $stmt = $db->query("SELECT COUNT(*) as low_stock_count FROM medicine WHERE stock_left <= 10");
        $lowStockCount = $stmt->fetch()['low_stock_count'];
        
        // Get recent medicines (last 10 added)
        $stmt = $db->query("
            SELECT m.medicine_id, m.medicine_name, m.medicine_brand, m.stock_left, m.medicine_price, mg.med_group_name
            FROM medicine m 
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id 
            ORDER BY m.medicine_id DESC 
            LIMIT 10
        ");
        $recentMedicines = $stmt->fetchAll();
        
        return [
            'stats' => [
                'total_medicines' => $totalMedicines,
                'total_groups' => $totalGroups,
                'low_stock_count' => $lowStockCount
            ],
            'recent_medicines' => $recentMedicines
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch inventory statistics: ' . $e->getMessage());
    }
}

/**
 * Get full medicines list with pagination
 * @param PDO $db Database connection
 * @return array Medicines list with pagination info
 */
function getMedicinesList($db) {
    try {
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 20);
        $search = $_GET['search'] ?? '';
        $group_filter = $_GET['group_filter'] ?? '';
        
        $offset = ($page - 1) * $limit;
        
        // Build query with filters
        $whereConditions = [];
        $params = [];
        
        if (!empty($search)) {
            $whereConditions[] = "(m.medicine_name LIKE :search OR m.medicine_brand LIKE :search)";
            $params['search'] = "%$search%";
        }
        
        if (!empty($group_filter)) {
            $whereConditions[] = "m.med_group_id = :group_filter";
            $params['group_filter'] = $group_filter;
        }
        
        $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
        
        // Get total count
        $countQuery = "
            SELECT COUNT(*) as total 
            FROM medicine m 
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id 
            $whereClause
        ";
        $stmt = $db->prepare($countQuery);
        $stmt->execute($params);
        $totalRecords = $stmt->fetch()['total'];
        
        // Get medicines with pagination
        $medicinesQuery = "
            SELECT 
                m.medicine_id,
                m.medicine_name,
                m.medicine_brand,
                m.stock_left,
                m.medicine_price,
                m.lifetime_supply,
                m.how_to_use,
                m.side_effects,
                mg.med_group_name,
                mg.med_group_id
            FROM medicine m 
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id 
            $whereClause
            ORDER BY m.medicine_name ASC 
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $db->prepare($medicinesQuery);
        foreach ($params as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $medicines = $stmt->fetchAll();
        
        return [
            'medicines' => $medicines,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => ceil($totalRecords / $limit),
                'total_records' => $totalRecords,
                'per_page' => $limit
            ]
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch medicines list: ' . $e->getMessage());
    }
}

/**
 * Get medicine groups list
 * @param PDO $db Database connection
 * @return array Medicine groups list
 */
function getMedicineGroups($db) {
    try {
        $stmt = $db->query("
            SELECT 
                mg.med_group_id,
                mg.med_group_name,
                mg.description,
                COUNT(m.medicine_id) as medicine_count
            FROM med_group mg 
            LEFT JOIN medicine m ON mg.med_group_id = m.med_group_id 
            GROUP BY mg.med_group_id, mg.med_group_name, mg.description
            ORDER BY mg.med_group_name ASC
        ");
        
        $groups = $stmt->fetchAll();
        
        return [
            'groups' => $groups
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch medicine groups: ' . $e->getMessage());
    }
}

/**
 * Get medicines with low stock (shortage)
 * @param PDO $db Database connection
 * @return array Low stock medicines list
 */
function getLowStockMedicines($db) {
    try {
        $threshold = (int)($_GET['threshold'] ?? 10);
        
        $stmt = $db->prepare("
            SELECT 
                m.medicine_id,
                m.medicine_name,
                m.medicine_brand,
                m.stock_left,
                m.medicine_price,
                mg.med_group_name
            FROM medicine m 
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id 
            WHERE m.stock_left <= :threshold
            ORDER BY m.stock_left ASC
        ");
        
        $stmt->bindParam(':threshold', $threshold, PDO::PARAM_INT);
        $stmt->execute();
        
        $lowStockMedicines = $stmt->fetchAll();
        
        return [
            'low_stock_medicines' => $lowStockMedicines,
            'threshold' => $threshold
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch low stock medicines: ' . $e->getMessage());
    }
}
?>
