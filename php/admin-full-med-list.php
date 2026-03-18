<?php
/**
 * Admin Full Medicine List Data Provider
 * New Lanka Pharmacy Management System
 * 
 * Provides JSON data for the admin full medicine list HTML page
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
        $action = $_GET['action'] ?? 'get_medicines_list';
        $params = $_GET;
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get JSON input for POST requests
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? 'get_medicines_list';
        $params = $input;
    }
    
    switch ($action) {
        case 'get_medicines_list':
            $medicineData = getMedicinesList($db, $params);
            break;
            
        case 'add_medicine':
            $medicineData = addMedicine($db);
            break;
            
        case 'update_medicine':
            $medicineData = updateMedicine($db);
            break;
            
        case 'delete_medicine':
            $medicineData = deleteMedicine($db);
            break;
            
        case 'search_medicines':
            $medicineData = searchMedicines($db);
            break;
            
        case 'get_medicine_stats':
            $medicineData = getMedicineStats($db);
            break;
            
        case 'get_medicine_groups':
            $medicineData = getMedicineGroups($db);
            break;
            
        default:
            throw new Exception('Invalid action specified');
    }
    
    // Return successful response
    echo json_encode([
        'success' => true,
        'data' => $medicineData,
        'user' => [
            'username' => $currentUser['username'],
            'role' => $currentUser['role']
        ]
    ]);
    
} catch (Exception $e) {
    // Log the error for debugging
    error_log("Admin Full Med List Error: " . $e->getMessage());
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
 * Get paginated medicines list with search and filters
 * @param PDO $db Database connection
 * @param array $params Request parameters
 * @return array Medicines list with pagination
 */
function getMedicinesList($db, $params = []) {
    try {
        error_log("getMedicinesList called with params: " . json_encode($params));
        
        $page = (int)($params['page'] ?? 1);
        $limit = (int)($params['limit'] ?? 20);
        $search = $params['search'] ?? '';
        
        error_log("Parsed params - page: $page, limit: $limit, search: '$search'");
        
        $offset = ($page - 1) * $limit;
        
        // Simple query without complex conditions first
        if (!empty($search)) {
            // Search query
            $countQuery = "
                SELECT COUNT(*) as total 
                FROM medicine m 
                LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id 
                WHERE m.medicine_name LIKE ? OR m.medicine_brand LIKE ?
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
                WHERE m.medicine_name LIKE ? OR m.medicine_brand LIKE ?
                ORDER BY m.medicine_name ASC 
                LIMIT ? OFFSET ?
            ";
            
            $searchTerm = "%$search%";
            
            // Get count
            $stmt = $db->prepare($countQuery);
            $stmt->execute([$searchTerm, $searchTerm]);
            $totalRecords = $stmt->fetch()['total'];
            
            // Get medicines
            $stmt = $db->prepare($medicinesQuery);
            $stmt->execute([$searchTerm, $searchTerm, $limit, $offset]);
            $medicines = $stmt->fetchAll();
            
        } else {
            // No search - get all
            $countQuery = "
                SELECT COUNT(*) as total 
                FROM medicine m 
                LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
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
                ORDER BY m.medicine_name ASC 
                LIMIT ? OFFSET ?
            ";
            
            // Get count
            $stmt = $db->prepare($countQuery);
            $stmt->execute();
            $totalRecords = $stmt->fetch()['total'];
            
            // Get medicines
            $stmt = $db->prepare($medicinesQuery);
            $stmt->execute([$limit, $offset]);
            $medicines = $stmt->fetchAll();
        }
        
        error_log("Found $totalRecords total records, returning " . count($medicines) . " medicines");
        
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
        error_log("PDO Error in getMedicinesList: " . $e->getMessage());
        throw new Exception('Failed to fetch medicines list: ' . $e->getMessage());
    } catch (Exception $e) {
        error_log("General Error in getMedicinesList: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Add new medicine
 * @param PDO $db Database connection
 * @return array Success message and new medicine data
 */
function addMedicine($db) {
    try {
        // Get POST data
        $input = json_decode(file_get_contents('php://input'), true);
        
        $medicine_name = trim($input['medicine_name'] ?? '');
        $medicine_brand = trim($input['medicine_brand'] ?? '');
        $category = trim($input['category'] ?? '');
        $stock_left = (int)($input['stock_left'] ?? 0);
        $medicine_price = (float)($input['medicine_price'] ?? 0);
        $how_to_use = trim($input['how_to_use'] ?? '');
        $side_effects = trim($input['side_effects'] ?? '');
        $lifetime_supply = (int)($input['lifetime_supply'] ?? $stock_left);
        
        // Validation
        if (empty($medicine_name)) {
            throw new Exception('Medicine name is required');
        }
        
        if (empty($medicine_brand)) {
            throw new Exception('Medicine brand is required');
        }
        
        if (empty($category)) {
            throw new Exception('Category is required');
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
            throw new Exception('Side effects information is required');
        }
        
        // Get or create medicine group
        $stmt = $db->prepare("SELECT med_group_id FROM med_group WHERE med_group_name = :category");
        $stmt->bindParam(':category', $category);
        $stmt->execute();
        $group = $stmt->fetch();
        
        if (!$group) {
            // Create new medicine group
            $stmt = $db->prepare("INSERT INTO med_group (med_group_name, description) VALUES (:category, :description)");
            $description = $category . " medicines";
            $stmt->bindParam(':category', $category);
            $stmt->bindParam(':description', $description);
            $stmt->execute();
            $med_group_id = $db->lastInsertId();
        } else {
            $med_group_id = $group['med_group_id'];
        }
        
        // Insert new medicine
        $stmt = $db->prepare("
            INSERT INTO medicine (
                medicine_name, medicine_brand, med_group_id, stock_left, 
                medicine_price, lifetime_supply, how_to_use, side_effects
            ) VALUES (
                :medicine_name, :medicine_brand, :med_group_id, :stock_left,
                :medicine_price, :lifetime_supply, :how_to_use, :side_effects
            )
        ");
        
        $stmt->bindParam(':medicine_name', $medicine_name);
        $stmt->bindParam(':medicine_brand', $medicine_brand);
        $stmt->bindParam(':med_group_id', $med_group_id, PDO::PARAM_INT);
        $stmt->bindParam(':stock_left', $stock_left, PDO::PARAM_INT);
        $stmt->bindParam(':medicine_price', $medicine_price);
        $stmt->bindParam(':lifetime_supply', $lifetime_supply, PDO::PARAM_INT);
        $stmt->bindParam(':how_to_use', $how_to_use);
        $stmt->bindParam(':side_effects', $side_effects);
        
        $stmt->execute();
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
            WHERE m.medicine_id = :medicine_id
        ");
        
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->execute();
        $newMedicine = $stmt->fetch();
        
        return [
            'message' => 'Medicine added successfully',
            'medicine' => $newMedicine
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to add medicine: ' . $e->getMessage());
    }
}

/**
 * Update medicine
 * @param PDO $db Database connection
 * @return array Success message
 */
function updateMedicine($db) {
    try {
        // Get POST data
        $input = json_decode(file_get_contents('php://input'), true);
        
        $medicine_id = (int)($input['medicine_id'] ?? 0);
        $medicine_name = trim($input['medicine_name'] ?? '');
        $medicine_brand = trim($input['medicine_brand'] ?? '');
        $category = trim($input['category'] ?? '');
        $stock_left = (int)($input['stock_left'] ?? 0);
        $medicine_price = (float)($input['medicine_price'] ?? 0);
        $how_to_use = trim($input['how_to_use'] ?? '');
        $side_effects = trim($input['side_effects'] ?? '');
        $lifetime_supply = (int)($input['lifetime_supply'] ?? $stock_left);
        
        // Validation
        if ($medicine_id <= 0) {
            throw new Exception('Invalid medicine ID');
        }
        
        if (empty($medicine_name)) {
            throw new Exception('Medicine name is required');
        }
        
        if (empty($medicine_brand)) {
            throw new Exception('Medicine brand is required');
        }
        
        if (empty($category)) {
            throw new Exception('Category is required');
        }
        
        if ($stock_left < 0) {
            throw new Exception('Stock quantity cannot be negative');
        }
        
        if ($medicine_price <= 0) {
            throw new Exception('Price must be greater than 0');
        }
        
        // Get or create medicine group
        $stmt = $db->prepare("SELECT med_group_id FROM med_group WHERE med_group_name = :category");
        $stmt->bindParam(':category', $category);
        $stmt->execute();
        $group = $stmt->fetch();
        
        if (!$group) {
            // Create new medicine group
            $stmt = $db->prepare("INSERT INTO med_group (med_group_name, description) VALUES (:category, :description)");
            $description = $category . " medicines";
            $stmt->bindParam(':category', $category);
            $stmt->bindParam(':description', $description);
            $stmt->execute();
            $med_group_id = $db->lastInsertId();
        } else {
            $med_group_id = $group['med_group_id'];
        }
        
        // Update medicine
        $stmt = $db->prepare("
            UPDATE medicine SET 
                medicine_name = :medicine_name,
                medicine_brand = :medicine_brand,
                med_group_id = :med_group_id,
                stock_left = :stock_left,
                medicine_price = :medicine_price,
                lifetime_supply = :lifetime_supply,
                how_to_use = :how_to_use,
                side_effects = :side_effects
            WHERE medicine_id = :medicine_id
        ");
        
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->bindParam(':medicine_name', $medicine_name);
        $stmt->bindParam(':medicine_brand', $medicine_brand);
        $stmt->bindParam(':med_group_id', $med_group_id, PDO::PARAM_INT);
        $stmt->bindParam(':stock_left', $stock_left, PDO::PARAM_INT);
        $stmt->bindParam(':medicine_price', $medicine_price);
        $stmt->bindParam(':lifetime_supply', $lifetime_supply, PDO::PARAM_INT);
        $stmt->bindParam(':how_to_use', $how_to_use);
        $stmt->bindParam(':side_effects', $side_effects);
        
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Medicine not found or no changes made');
        }
        
        return [
            'message' => 'Medicine updated successfully'
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to update medicine: ' . $e->getMessage());
    }
}

/**
 * Delete medicine
 * @param PDO $db Database connection
 * @return array Success message
 */
function deleteMedicine($db) {
    try {
        $medicine_id = (int)($_GET['medicine_id'] ?? $_POST['medicine_id'] ?? 0);
        
        if ($medicine_id <= 0) {
            throw new Exception('Invalid medicine ID');
        }
        
        // Check if medicine exists
        $stmt = $db->prepare("SELECT medicine_name FROM medicine WHERE medicine_id = :medicine_id");
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->execute();
        
        if (!$stmt->fetch()) {
            throw new Exception('Medicine not found');
        }
        
        // Delete medicine
        $stmt = $db->prepare("DELETE FROM medicine WHERE medicine_id = :medicine_id");
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->execute();
        
        return [
            'message' => 'Medicine deleted successfully'
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to delete medicine: ' . $e->getMessage());
    }
}

/**
 * Search medicines
 * @param PDO $db Database connection
 * @return array Search results
 */
function searchMedicines($db) {
    try {
        $search = $_GET['search'] ?? '';
        $limit = (int)($_GET['limit'] ?? 50);
        
        if (empty($search)) {
            return ['medicines' => []];
        }
        
        $stmt = $db->prepare("
            SELECT 
                m.medicine_id,
                m.medicine_name,
                m.medicine_brand,
                m.stock_left,
                m.medicine_price,
                mg.med_group_name as category,
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
            WHERE m.medicine_name LIKE :search 
               OR m.medicine_brand LIKE :search 
               OR mg.med_group_name LIKE :search
            ORDER BY m.medicine_name ASC 
            LIMIT :limit
        ");
        
        $searchTerm = "%$search%";
        $stmt->bindParam(':search', $searchTerm);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $medicines = $stmt->fetchAll();
        
        return [
            'medicines' => $medicines,
            'search_term' => $search,
            'count' => count($medicines)
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to search medicines: ' . $e->getMessage());
    }
}

/**
 * Get medicine statistics
 * @param PDO $db Database connection
 * @return array Medicine statistics
 */
function getMedicineStats($db) {
    try {
        // Get total medicines count
        $stmt = $db->query("SELECT COUNT(*) as total_medicines FROM medicine");
        $totalMedicines = $stmt->fetch()['total_medicines'];
        
        // Get categories count
        $stmt = $db->query("SELECT COUNT(*) as total_categories FROM med_group");
        $totalCategories = $stmt->fetch()['total_categories'];
        
        // Get low stock count
        $stmt = $db->query("SELECT COUNT(*) as low_stock_count FROM medicine WHERE stock_left <= 10 AND stock_left > 0");
        $lowStockCount = $stmt->fetch()['low_stock_count'];
        
        // Get out of stock count
        $stmt = $db->query("SELECT COUNT(*) as out_of_stock_count FROM medicine WHERE stock_left = 0");
        $outOfStockCount = $stmt->fetch()['out_of_stock_count'];
        
        // Get categories with medicine counts
        $stmt = $db->query("
            SELECT 
                mg.med_group_name as category,
                COUNT(m.medicine_id) as medicine_count
            FROM med_group mg
            LEFT JOIN medicine m ON mg.med_group_id = m.med_group_id
            GROUP BY mg.med_group_id, mg.med_group_name
            ORDER BY medicine_count DESC
        ");
        $categories = $stmt->fetchAll();
        
        return [
            'total_medicines' => $totalMedicines,
            'total_categories' => $totalCategories,
            'low_stock_count' => $lowStockCount,
            'out_of_stock_count' => $outOfStockCount,
            'categories' => $categories
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch medicine statistics: ' . $e->getMessage());
    }
}

/**
 * Get all medicine groups/categories from the database
 * @param PDO $db Database connection
 * @return array List of medicine groups
 */
function getMedicineGroups($db) {
    try {
        $sql = "
            SELECT 
                med_group_id,
                med_group_name,
                description
            FROM med_group 
            ORDER BY med_group_name ASC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'groups' => $groups,
            'total_count' => count($groups)
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch medicine groups: ' . $e->getMessage());
    }
}
?>
