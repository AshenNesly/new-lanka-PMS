<?php
/**
 * Admin Inside Medicine Data Provider
 * New Lanka Pharmacy Management System
 * 
 * Provides JSON data for the admin inside medicine HTML page
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
    $debugInfo = [];
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $action = $_GET['action'] ?? 'get_medicine_details';
        $debugInfo['source'] = 'GET';
    } else {
        // For POST requests, try to get from JSON body first
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        $debugInfo['raw_input'] = $rawInput;
        $debugInfo['parsed_input'] = $input;
        $debugInfo['post_data'] = $_POST;
        
        if ($input && isset($input['action'])) {
            $action = $input['action'];
            $debugInfo['source'] = 'JSON';
        } else {
            $action = $_POST['action'] ?? 'get_medicine_details';
            $debugInfo['source'] = 'POST';
        } 
    }
    
    $debugInfo['final_action'] = $action;
    
    // Log debug info
    error_log('Action routing debug: ' . json_encode($debugInfo));
    
    switch ($action) {
        case 'get_medicine_details':
            $medicineData = getMedicineDetails($db);
            break;
            
        case 'update_medicine':
            error_log('Calling updateMedicine function');
            $medicineData = updateMedicine($db);
            break;
            
        case 'restock_medicine':
            $medicineData = restockMedicine($db);
            break;
            
        case 'delete_medicine':
            $medicineData = deleteMedicine($db);
            break;
            
        case 'get_medicine_sales_history':
            $medicineData = getMedicineSalesHistory($db);
            break;
            
        case 'get_medicine_groups':
            $medicineData = getMedicineGroups($db);
            break;
            
        case 'test':
            $medicineData = ['message' => 'API is working', 'debug' => $debugInfo];
            break;
            
        default:
            throw new Exception('Invalid action specified: ' . $action);
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
    // Return error response
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Get detailed medicine information including sales data
 * @param PDO $db Database connection
 * @return array Medicine details with calculated statistics
 */
function getMedicineDetails($db) {
    try {
        $medicine_id = (int)($_GET['medicine_id'] ?? $_POST['medicine_id'] ?? 0);
        
        if ($medicine_id <= 0) {
            throw new Exception('Invalid medicine ID');
        }
        
        // Get medicine details with group information
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
            WHERE m.medicine_id = :medicine_id
        ");
        
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $medicine = $stmt->fetch();
        
        if (!$medicine) {
            throw new Exception('Medicine not found');
        }
        
        // Calculate lifetime sales from sales data
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(sml.quantity), 0) as lifetime_sales
            FROM sale_med_list sml
            WHERE sml.med_id = :medicine_id
        ");
        
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->execute();
        $salesData = $stmt->fetch();
        $lifetime_sales = $salesData['lifetime_sales'] ?? 0;
        
        // Get recent sales history (last 10 sales)
        $stmt = $db->prepare("
            SELECT 
                s.sale_date,
                s.sale_time,
                sml.quantity,
                s.total_amount,
                c.full_name as customer_name,
                u.user_name as sold_by
            FROM sale_med_list sml
            JOIN sale s ON sml.sale_id = s.sale_id
            LEFT JOIN customer c ON s.customer_id = c.customer_id
            LEFT JOIN user u ON s.user_id = u.user_id
            WHERE sml.med_id = :medicine_id
            ORDER BY s.sale_date DESC, s.sale_time DESC
            LIMIT 10
        ");
        
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->execute();
        $recent_sales = $stmt->fetchAll();
        
        // Calculate total revenue from this medicine
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(sml.quantity * :price), 0) as total_revenue
            FROM sale_med_list sml
            WHERE sml.med_id = :medicine_id
        ");
        
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->bindParam(':price', $medicine['medicine_price']);
        $stmt->execute();
        $revenueData = $stmt->fetch();
        $total_revenue = $revenueData['total_revenue'] ?? 0;
        
        return [
            'medicine' => $medicine,
            'lifetime_sales' => $lifetime_sales,
            'recent_sales' => $recent_sales,
            'total_revenue' => $total_revenue,
            'formatted_price' => 'Rs. ' . number_format($medicine['medicine_price'], 2),
            'formatted_revenue' => 'Rs. ' . number_format($total_revenue, 2)
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch medicine details: ' . $e->getMessage());
    }
}

/**
 * Update medicine information
 * @param PDO $db Database connection
 * @return array Success message and updated medicine data
 */
function updateMedicine($db) {
    try {
        // Get POST data from JSON input or regular POST  
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        if (!$input) {
            $input = $_POST;
        }
        
        $medicine_id = (int)($input['medicine_id'] ?? 0);
        $medicine_name = trim($input['medicine_name'] ?? '');
        $medicine_brand = trim($input['medicine_brand'] ?? '');
        $category = trim($input['category'] ?? '');
        
        // Handle price with comma/dot conversion
        $medicine_price = 0;
        if (isset($input['medicine_price'])) {
            $price_str = str_replace(',', '.', (string)$input['medicine_price']);
            $medicine_price = (float)$price_str;
        }
        
        $how_to_use = trim($input['how_to_use'] ?? '');
        $side_effects = trim($input['side_effects'] ?? '');
        
        // Validation
        if ($medicine_id <= 0) {
            throw new Exception('Invalid medicine ID. Must be a positive integer.');
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
        
        // First check if medicine exists
        $checkStmt = $db->prepare("SELECT medicine_id FROM medicine WHERE medicine_id = :medicine_id");
        $checkStmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $checkStmt->execute();
        
        if ($checkStmt->rowCount() === 0) {
            throw new Exception('Medicine not found with ID: ' . $medicine_id);
        }
        
        // Update medicine
        $stmt = $db->prepare("
            UPDATE medicine SET 
                medicine_name = :medicine_name,
                medicine_brand = :medicine_brand,
                med_group_id = :med_group_id,
                medicine_price = :medicine_price,
                how_to_use = :how_to_use,
                side_effects = :side_effects
            WHERE medicine_id = :medicine_id
        ");
        
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->bindParam(':medicine_name', $medicine_name);
        $stmt->bindParam(':medicine_brand', $medicine_brand);
        $stmt->bindParam(':med_group_id', $med_group_id, PDO::PARAM_INT);
        $stmt->bindParam(':medicine_price', $medicine_price);
        $stmt->bindParam(':how_to_use', $how_to_use);
        $stmt->bindParam(':side_effects', $side_effects);
        
        $stmt->execute();
        
        // Get updated medicine details by temporarily setting $_GET
        $_GET['medicine_id'] = $medicine_id;
        $updatedMedicine = getMedicineDetails($db);
        
        return [
            'message' => 'Medicine updated successfully',
            'medicine' => $updatedMedicine['medicine']
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to update medicine: ' . $e->getMessage());
    }
}

/**
 * Restock medicine (increase stock quantity)
 * @param PDO $db Database connection
 * @return array Success message and updated stock information
 */
function restockMedicine($db) {
    try {
        // Get POST data from JSON input or regular POST
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }
        
        $medicine_id = (int)($input['medicine_id'] ?? 0);
        $add_quantity = (int)($input['add_quantity'] ?? 0);
        
        // Validation
        if ($medicine_id <= 0) {
            throw new Exception('Invalid medicine ID');
        }
        
        if ($add_quantity <= 0) {
            throw new Exception('Add quantity must be greater than 0');
        }
        
        // Get current stock and lifetime supply
        $stmt = $db->prepare("SELECT stock_left, lifetime_supply FROM medicine WHERE medicine_id = :medicine_id");
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $current = $stmt->fetch();
        if (!$current) {
            throw new Exception('Medicine not found');
        }
        
        $new_stock = $current['stock_left'] + $add_quantity;
        $new_lifetime_supply = $current['lifetime_supply'] + $add_quantity;
        
        // Update stock and lifetime supply
        $stmt = $db->prepare("
            UPDATE medicine SET 
                stock_left = :new_stock,
                lifetime_supply = :new_lifetime_supply
            WHERE medicine_id = :medicine_id
        ");
        
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->bindParam(':new_stock', $new_stock, PDO::PARAM_INT);
        $stmt->bindParam(':new_lifetime_supply', $new_lifetime_supply, PDO::PARAM_INT);
        
        $stmt->execute();
        
        return [
            'message' => 'Medicine restocked successfully',
            'previous_stock' => $current['stock_left'],
            'added_quantity' => $add_quantity,
            'new_stock' => $new_stock,
            'new_lifetime_supply' => $new_lifetime_supply
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to restock medicine: ' . $e->getMessage());
    }
}

/**
 * Delete medicine
 * @param PDO $db Database connection
 * @return array Success message
 */
function deleteMedicine($db) {
    try {
        // Get POST data from JSON input or regular POST  
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        if (!$input) {
            $input = $_POST;
        }
        
        $medicine_id = (int)($input['medicine_id'] ?? $_GET['medicine_id'] ?? 0);
        
        if ($medicine_id <= 0) {
            throw new Exception('Invalid medicine ID');
        }
        
        // Check if medicine exists and get its name for confirmation
        $stmt = $db->prepare("SELECT medicine_name FROM medicine WHERE medicine_id = :medicine_id");
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $medicine = $stmt->fetch();
        if (!$medicine) {
            throw new Exception('Medicine not found');
        }
        
        // Check if medicine has been sold (has sales records)
        $stmt = $db->prepare("SELECT COUNT(*) as sales_count FROM sale_med_list WHERE med_id = :medicine_id");
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $salesData = $stmt->fetch();
        if ($salesData['sales_count'] > 0) {
            throw new Exception('Cannot delete medicine that has sales history. Consider marking it as discontinued instead.');
        }
        
        // Delete medicine
        $stmt = $db->prepare("DELETE FROM medicine WHERE medicine_id = :medicine_id");
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->execute();
        
        return [
            'message' => 'Medicine deleted successfully',
            'deleted_medicine' => $medicine['medicine_name']
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to delete medicine: ' . $e->getMessage());
    }
}

/**
 * Get medicine sales history
 * @param PDO $db Database connection
 * @return array Sales history data
 */
function getMedicineSalesHistory($db) {
    try {
        // Get POST data from JSON input or regular POST  
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        if (!$input) {
            $input = $_POST;
        }
        
        $medicine_id = (int)($input['medicine_id'] ?? $_GET['medicine_id'] ?? 0);
        $page = (int)($input['page'] ?? $_GET['page'] ?? 1);
        $limit = (int)($input['limit'] ?? $_GET['limit'] ?? 20);
        
        if ($medicine_id <= 0) {
            throw new Exception('Invalid medicine ID');
        }
        
        $offset = ($page - 1) * $limit;
        
        // Get total sales count
        $stmt = $db->prepare("
            SELECT COUNT(*) as total_sales
            FROM sale_med_list sml
            JOIN sale s ON sml.sale_id = s.sale_id
            WHERE sml.med_id = :medicine_id
        ");
        
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->execute();
        $totalSales = $stmt->fetch()['total_sales'];
        
        // Get sales history with pagination
        $stmt = $db->prepare("
            SELECT 
                s.sale_id,
                s.sale_date,
                s.sale_time,
                sml.quantity,
                (sml.quantity * m.medicine_price) as sale_amount,
                s.total_amount as total_sale_amount,
                c.full_name as customer_name,
                c.phone_number as customer_phone,
                u.user_name as sold_by,
                s.payment_type
            FROM sale_med_list sml
            JOIN sale s ON sml.sale_id = s.sale_id
            JOIN medicine m ON sml.med_id = m.medicine_id
            LEFT JOIN customer c ON s.customer_id = c.customer_id
            LEFT JOIN user u ON s.user_id = u.user_id
            WHERE sml.med_id = :medicine_id
            ORDER BY s.sale_date DESC, s.sale_time DESC
            LIMIT :limit OFFSET :offset
        ");
        
        $stmt->bindParam(':medicine_id', $medicine_id, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $sales_history = $stmt->fetchAll();
        
        return [
            'sales_history' => $sales_history,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => ceil($totalSales / $limit),
                'total_records' => $totalSales,
                'per_page' => $limit
            ]
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch sales history: ' . $e->getMessage());
    }
}

/**
 * Get all available medicine groups from database
 * @param PDO $db Database connection
 * @return array List of medicine groups
 */
function getMedicineGroups($db) {
    try {
        $stmt = $db->prepare("
            SELECT 
                med_group_id,
                med_group_name,
                description
            FROM med_group 
            ORDER BY med_group_name ASC
        ");
        
        $stmt->execute();
        $groups = $stmt->fetchAll();
        
        return [
            'groups' => $groups,
            'count' => count($groups)
        ];
        
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch medicine groups: ' . $e->getMessage());
    }
}
?>
