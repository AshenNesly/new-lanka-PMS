<?php
/**
 * Admin Inside Med Group Data Provider
 * New Lanka Pharmacy Management System
 * 
 * Provides JSON data for the admin inside med group HTML page
 */

// Include required files
require_once 'database.php';
require_once 'session.php';
require_once 'functions.php';

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
    
    // Handle different API endpoints
    $action = '';
    $params = [];
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? 'get_group_medicines';
        $params = $_GET;
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get JSON input for POST requests
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? 'add_medicine_to_group';
        $params = $input;
    }
    
    switch ($action) {
        case 'get_group_medicines':
            $data = getGroupMedicines($db, $params);
            break;
            
        case 'search_group_medicines':
            $data = searchGroupMedicines($db, $params);
            break;
            
        case 'add_medicine_to_group':
            $data = addMedicineToGroup($db, $params);
            break;
            
        case 'get_group_info':
            $data = getGroupInfo($db, $params);
            break;
            
        case 'get_group_statistics':
            $data = getGroupStatistics($db, $params);
            break;
            
        default:
            throw new Exception('Invalid action specified');
    }
    
    // Return successful response
    echo json_encode([
        'success' => true,
        'data' => $data,
        'user' => [
            'username' => $currentUser['username'],
            'role' => $currentUser['role']
        ]
    ]);
    
} catch (Exception $e) {
    // Log the error for debugging
    error_log("Admin Inside Med Group Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Return error response
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]
    ]);
}

/**
 * Get medicines for a specific group with pagination and filters
 * @param PDO $db Database connection
 * @param array $params Request parameters
 * @return array Medicines list with pagination
 */
function getGroupMedicines($db, $params = []) {
    try {
        $groupId = $params['group_id'] ?? '';
        $page = (int)($params['page'] ?? 1);
        $limit = (int)($params['limit'] ?? 20);
        $search = $params['search'] ?? '';
        
        error_log("getGroupMedicines called with groupId: '$groupId', page: $page, search: '$search'");
        
        if (empty($groupId)) {
            throw new Exception('Group ID is required');
        }
        
        $offset = ($page - 1) * $limit;
        
        // First, let's check if the group exists (handle both numeric and string IDs)
        $groupCheckQuery = "SELECT med_group_id, med_group_name FROM med_group WHERE med_group_id = ? OR med_group_id = ?";
        $stmt = $db->prepare($groupCheckQuery);
        $stmt->execute([$groupId, intval($groupId)]);
        $groupExists = $stmt->fetch();
        
        if (!$groupExists) {
            // If group doesn't exist, let's see what groups are available
            $availableGroupsQuery = "SELECT med_group_id, med_group_name FROM med_group LIMIT 5";
            $stmt = $db->prepare($availableGroupsQuery);
            $stmt->execute();
            $availableGroups = $stmt->fetchAll();
            
            error_log("Group '$groupId' not found. Available groups: " . json_encode($availableGroups));
            throw new Exception("Medicine group not found. Group ID: '$groupId'. Available groups: " . json_encode($availableGroups));
        }
        
        // Use the actual group_id from the database
        $actualGroupId = $groupExists['med_group_id'];
        error_log("Found group: ID=$actualGroupId, Name=" . $groupExists['med_group_name']);
        
        // Build query based on search
        if (!empty($search)) {
            // Search query
            $countQuery = "
                SELECT COUNT(*) as total 
                FROM medicine m 
                LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id 
                WHERE mg.med_group_id = ? 
                AND (m.medicine_name LIKE ? OR m.medicine_brand LIKE ?)
            ";
            
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
                    mg.med_group_name as category,
                    mg.med_group_id,
                    CASE 
                        WHEN m.stock_left = 0 THEN 'out_of_stock'
                        WHEN m.stock_left <= 10 THEN 'low_stock'
                        ELSE 'in_stock'
                    END as status,
                    CASE 
                        WHEN m.stock_left = 0 THEN 'Out of Stock'
                        WHEN m.stock_left <= 10 THEN 'Low Stock'
                        ELSE 'In Stock'
                    END as status_text,
                    CASE 
                        WHEN m.stock_left = 0 THEN 'danger'
                        WHEN m.stock_left <= 10 THEN 'warning'
                        ELSE 'good'
                    END as status_class
                FROM medicine m 
                LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id 
                WHERE mg.med_group_id = ? 
                AND (m.medicine_name LIKE ? OR m.medicine_brand LIKE ?)
                ORDER BY m.medicine_name ASC 
                LIMIT ? OFFSET ?
            ";
            
            $searchTerm = "%$search%";
            
            // Get count
            $stmt = $db->prepare($countQuery);
            $stmt->execute([$actualGroupId, $searchTerm, $searchTerm]);
            $totalRecords = $stmt->fetch()['total'];
            
            // Get medicines
            $stmt = $db->prepare($medicinesQuery);
            $stmt->execute([$actualGroupId, $searchTerm, $searchTerm, $limit, $offset]);
            $medicines = $stmt->fetchAll();
            
        } else {
            // No search - get all medicines in group
            $countQuery = "
                SELECT COUNT(*) as total 
                FROM medicine m 
                LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id 
                WHERE mg.med_group_id = ?
            ";
            
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
                    mg.med_group_name as category,
                    mg.med_group_id,
                    CASE 
                        WHEN m.stock_left = 0 THEN 'out_of_stock'
                        WHEN m.stock_left <= 10 THEN 'low_stock'
                        ELSE 'in_stock'
                    END as status,
                    CASE 
                        WHEN m.stock_left = 0 THEN 'Out of Stock'
                        WHEN m.stock_left <= 10 THEN 'Low Stock'
                        ELSE 'In Stock'
                    END as status_text,
                    CASE 
                        WHEN m.stock_left = 0 THEN 'danger'
                        WHEN m.stock_left <= 10 THEN 'warning'
                        ELSE 'good'
                    END as status_class
                FROM medicine m 
                LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id 
                WHERE mg.med_group_id = ?
                ORDER BY m.medicine_name ASC 
                LIMIT ? OFFSET ?
            ";
            
            // Get count
            $stmt = $db->prepare($countQuery);
            $stmt->execute([$actualGroupId]);
            $totalRecords = $stmt->fetch()['total'];
            
            // Get medicines
            $stmt = $db->prepare($medicinesQuery);
            $stmt->execute([$actualGroupId, $limit, $offset]);
            $medicines = $stmt->fetchAll();
        }
        
        error_log("Found $totalRecords total medicines in group $actualGroupId, returning " . count($medicines) . " medicines");
        
        // Get group info
        $groupInfo = getGroupInfo($db, ['group_id' => $actualGroupId]);
        
        return [
            'medicines' => $medicines,
            'group_info' => $groupInfo,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => ceil($totalRecords / $limit),
                'total_records' => $totalRecords,
                'per_page' => $limit,
                'has_prev' => $page > 1,
                'has_next' => $page < ceil($totalRecords / $limit)
            ]
        ];
        
    } catch (PDOException $e) {
        error_log("PDO Error in getGroupMedicines: " . $e->getMessage());
        throw new Exception('Failed to fetch group medicines: ' . $e->getMessage());
    }
}

/**
 * Search medicines within a specific group
 * @param PDO $db Database connection
 * @param array $params Request parameters
 * @return array Search results
 */
function searchGroupMedicines($db, $params = []) {
    try {
        $groupId = $params['group_id'] ?? '';
        $search = $params['search'] ?? '';
        $limit = (int)($params['limit'] ?? 50);
        
        if (empty($groupId)) {
            throw new Exception('Group ID is required');
        }
        
        if (empty($search)) {
            return ['medicines' => [], 'search_term' => $search, 'count' => 0];
        }
        
        $stmt = $db->prepare("
            SELECT 
                m.medicine_id,
                m.medicine_name,
                m.medicine_brand,
                m.stock_left,
                m.medicine_price,
                m.lifetime_supply,
                m.how_to_use,
                m.side_effects,
                mg.med_group_name as category,
                mg.med_group_id,
                CASE 
                    WHEN m.stock_left = 0 THEN 'out_of_stock'
                    WHEN m.stock_left <= 10 THEN 'low_stock'
                    ELSE 'in_stock'
                END as status,
                CASE 
                    WHEN m.stock_left = 0 THEN 'Out of Stock'
                    WHEN m.stock_left <= 10 THEN 'Low Stock'
                    ELSE 'In Stock'
                END as status_text,
                CASE 
                    WHEN m.stock_left = 0 THEN 'danger'
                    WHEN m.stock_left <= 10 THEN 'warning'
                    ELSE 'good'
                END as status_class
            FROM medicine m 
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id 
            WHERE mg.med_group_id = ? 
            AND (m.medicine_name LIKE ? OR m.medicine_brand LIKE ?)
            ORDER BY m.medicine_name ASC 
            LIMIT ?
        ");
        
        $searchTerm = "%$search%";
        $stmt->execute([$groupId, $searchTerm, $searchTerm, $limit]);
        $medicines = $stmt->fetchAll();
        
        return [
            'medicines' => $medicines,
            'search_term' => $search,
            'count' => count($medicines)
        ];
        
    } catch (PDOException $e) {
        error_log("PDO Error in searchGroupMedicines: " . $e->getMessage());
        throw new Exception('Failed to search group medicines: ' . $e->getMessage());
    }
}

/**
 * Add new medicine to a specific group
 * @param PDO $db Database connection
 * @param array $params Request parameters
 * @return array Success message and new medicine data
 */
function addMedicineToGroup($db, $params = []) {
    try {
        $groupId = $params['group_id'] ?? '';
        $medicine_name = trim($params['medicine_name'] ?? '');
        $medicine_brand = trim($params['medicine_brand'] ?? '');
        $stock_left = (int)($params['stock_left'] ?? 0);
        $medicine_price = (float)($params['medicine_price'] ?? 0);
        $how_to_use = trim($params['how_to_use'] ?? '');
        $side_effects = trim($params['side_effects'] ?? '');
        $lifetime_supply = (int)($params['lifetime_supply'] ?? $stock_left);
        
        // Validation
        if (empty($groupId)) {
            throw new Exception('Group ID is required');
        }
        
        if (empty($medicine_name)) {
            throw new Exception('Medicine name is required');
        }
        
        if (empty($medicine_brand)) {
            throw new Exception('Medicine brand is required');
        }
        
        if ($stock_left < 0) {
            throw new Exception('Stock quantity cannot be negative');
        }
        
        if ($medicine_price <= 0) {
            throw new Exception('Price must be greater than 0');
        }
        
        if (empty($how_to_use)) {
            throw new Exception('Usage instructions are required');
        }
        
        if (empty($side_effects)) {
            throw new Exception('Side effects information are required');
        }
        
        // Verify group exists
        $stmt = $db->prepare("SELECT med_group_id, med_group_name FROM med_group WHERE med_group_id = ?");
        $stmt->execute([$groupId]);
        $group = $stmt->fetch();
        
        if (!$group) {
            throw new Exception('Medicine group not found');
        }
        
        // Insert new medicine
        $stmt = $db->prepare("
            INSERT INTO medicine (
                medicine_name, medicine_brand, med_group_id, stock_left, 
                medicine_price, lifetime_supply, how_to_use, side_effects
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?
            )
        ");
        
        $stmt->execute([
            $medicine_name, 
            $medicine_brand, 
            $groupId, 
            $stock_left,
            $medicine_price, 
            $lifetime_supply, 
            $how_to_use, 
            $side_effects
        ]);
        
        $medicine_id = $db->lastInsertId();
        
        // Get the newly created medicine with status
        $stmt = $db->prepare("
            SELECT 
                m.medicine_id,
                m.medicine_name,
                m.medicine_brand,
                m.stock_left,
                m.medicine_price,
                m.lifetime_supply,
                m.how_to_use,
                m.side_effects,
                mg.med_group_name as category,
                mg.med_group_id,
                CASE 
                    WHEN m.stock_left = 0 THEN 'out_of_stock'
                    WHEN m.stock_left <= 10 THEN 'low_stock'
                    ELSE 'in_stock'
                END as status,
                CASE 
                    WHEN m.stock_left = 0 THEN 'Out of Stock'
                    WHEN m.stock_left <= 10 THEN 'Low Stock'
                    ELSE 'In Stock'
                END as status_text,
                CASE 
                    WHEN m.stock_left = 0 THEN 'danger'
                    WHEN m.stock_left <= 10 THEN 'warning'
                    ELSE 'good'
                END as status_class
            FROM medicine m
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
            WHERE m.medicine_id = ?
        ");
        
        $stmt->execute([$medicine_id]);
        $newMedicine = $stmt->fetch();
        
        return [
            'message' => 'Medicine added to group successfully',
            'medicine' => $newMedicine
        ];
        
    } catch (PDOException $e) {
        error_log("PDO Error in addMedicineToGroup: " . $e->getMessage());
        throw new Exception('Failed to add medicine to group: ' . $e->getMessage());
    }
}

/**
 * Get group information
 * @param PDO $db Database connection
 * @param array $params Request parameters
 * @return array Group information
 */
function getGroupInfo($db, $params = []) {
    try {
        $groupId = $params['group_id'] ?? '';
        
        if (empty($groupId)) {
            throw new Exception('Group ID is required');
        }
        
        // Get group basic info (handle both numeric and string IDs)
        $stmt = $db->prepare("
            SELECT 
                med_group_id,
                med_group_name,
                description
            FROM med_group 
            WHERE med_group_id = ? OR med_group_id = ?
        ");
        $stmt->execute([$groupId, intval($groupId)]);
        $groupInfo = $stmt->fetch();
        
        if (!$groupInfo) {
            throw new Exception('Medicine group not found');
        }
        
        // Use the actual group_id from database
        $actualGroupId = $groupInfo['med_group_id'];
        
        // Get medicine count and stock totals for this group
        $stmt = $db->prepare("
            SELECT 
                COUNT(*) as medicine_count,
                COALESCE(SUM(stock_left), 0) as total_stock,
                COUNT(CASE WHEN stock_left = 0 THEN 1 END) as out_of_stock_count,
                COUNT(CASE WHEN stock_left <= 10 AND stock_left > 0 THEN 1 END) as low_stock_count
            FROM medicine 
            WHERE med_group_id = ?
        ");
        $stmt->execute([$actualGroupId]);
        $stats = $stmt->fetch();
        
        // Determine overall status
        $status = 'good';
        $status_text = 'Good Stock';
        
        if ($stats['out_of_stock_count'] > 0) {
            $status = 'danger';
            $status_text = 'Some Out of Stock';
        } elseif ($stats['low_stock_count'] > 0) {
            $status = 'warning';
            $status_text = 'Some Low Stock';
        }
        
        return [
            'group_id' => $groupInfo['med_group_id'],
            'group_name' => $groupInfo['med_group_name'],
            'description' => $groupInfo['description'],
            'medicine_count' => $stats['medicine_count'],
            'total_stock' => $stats['total_stock'],
            'formatted_stock' => number_format($stats['total_stock']),
            'out_of_stock_count' => $stats['out_of_stock_count'],
            'low_stock_count' => $stats['low_stock_count'],
            'status' => $status,
            'status_text' => $status_text
        ];
        
    } catch (PDOException $e) {
        error_log("PDO Error in getGroupInfo: " . $e->getMessage());
        throw new Exception('Failed to fetch group information: ' . $e->getMessage());
    }
}

/**
 * Get group statistics
 * @param PDO $db Database connection
 * @param array $params Request parameters
 * @return array Group statistics
 */
function getGroupStatistics($db, $params = []) {
    try {
        $groupId = $params['group_id'] ?? '';
        
        if (empty($groupId)) {
            throw new Exception('Group ID is required');
        }
        
        // Get detailed statistics
        $stmt = $db->prepare("
            SELECT 
                COUNT(*) as total_medicines,
                COALESCE(SUM(stock_left), 0) as total_stock,
                COALESCE(AVG(medicine_price), 0) as average_price,
                COUNT(CASE WHEN stock_left = 0 THEN 1 END) as out_of_stock_count,
                COUNT(CASE WHEN stock_left <= 10 AND stock_left > 0 THEN 1 END) as low_stock_count,
                COUNT(CASE WHEN stock_left > 10 THEN 1 END) as good_stock_count,
                MIN(medicine_price) as lowest_price,
                MAX(medicine_price) as highest_price
            FROM medicine 
            WHERE med_group_id = ?
        ");
        $stmt->execute([$groupId]);
        $stats = $stmt->fetch();
        
        return [
            'total_medicines' => $stats['total_medicines'],
            'total_stock' => $stats['total_stock'],
            'average_price' => round($stats['average_price'], 2),
            'out_of_stock_count' => $stats['out_of_stock_count'],
            'low_stock_count' => $stats['low_stock_count'],
            'good_stock_count' => $stats['good_stock_count'],
            'lowest_price' => $stats['lowest_price'],
            'highest_price' => $stats['highest_price']
        ];
        
    } catch (PDOException $e) {
        error_log("PDO Error in getGroupStatistics: " . $e->getMessage());
        throw new Exception('Failed to fetch group statistics: ' . $e->getMessage());
    }
}
?>
