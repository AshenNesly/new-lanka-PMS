<?php
/**
 * Admin Customers Backend API
 * New Lanka Pharmacy Management System
 * 
 * Handles all customer management operations including search, add, edit, delete,
 * and customer statistics
 */

// Include required files
require_once 'database.php';
require_once 'session.php';
require_once 'functions.php';

// Set JSON header
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
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
    // Check if user is logged in and has appropriate permissions
    SessionManager::startSession();
    
    if (!SessionManager::isLoggedIn()) {
        throw new Exception('User not authenticated');
    }
    
    $currentUser = SessionManager::getCurrentUser();
    if (!in_array($currentUser['role'], ['admin', 'manager'])) {
        throw new Exception('Access denied. Admin or Manager privileges required.');
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
    
    // Get request method and action
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    // Route requests based on action
    switch ($action) {
        case 'get_all_customers':
            getAllCustomers($db, $_GET);
            break;
            
        case 'search_customers':
            searchCustomers($db, $_GET);
            break;
            
        case 'get_customer_details':
            getCustomerDetails($db, $_GET);
            break;
            
        case 'add_customer':
            addCustomer($db, $_POST);
            break;
            
        case 'update_customer':
            updateCustomer($db, $_POST);
            break;
            
        case 'delete_customer':
            deleteCustomer($db, $_POST);
            break;
            
        case 'get_customer_stats':
            getCustomerStats($db);
            break;
            
        case 'get_customer_purchases':
            getCustomerPurchases($db, $_GET);
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
 * Get all customers with pagination and sorting
 */
function getAllCustomers($db, $params) {
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $limit = isset($params['limit']) ? (int)$params['limit'] : 20;
    $sortBy = $params['sort_by'] ?? 'customer_name';
    $sortOrder = $params['sort_order'] ?? 'ASC';
    $offset = ($page - 1) * $limit;
    
    // Validate sort column
    $allowedSorts = ['full_name', 'phone_number', 'reg_date', 'total_purchases'];
    if (!in_array($sortBy, $allowedSorts)) {
        $sortBy = 'full_name';
    }
    
    // Validate sort order
    $sortOrder = strtoupper($sortOrder) === 'DESC' ? 'DESC' : 'ASC';
    
    try {
        // Get total count
        $countStmt = $db->prepare("SELECT COUNT(*) as total FROM customer");
        $countStmt->execute();
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get customers with purchase count
        $sql = "
            SELECT c.*, 
                   COALESCE(purchase_stats.total_purchases, 0) as total_purchases,
                   COALESCE(purchase_stats.total_amount, 0) as total_spent
            FROM customer c
            LEFT JOIN (
                SELECT customer_id, 
                       COUNT(*) as total_purchases,
                       SUM(total_amount) as total_amount
                FROM sale 
                GROUP BY customer_id
            ) purchase_stats ON c.customer_id = purchase_stats.customer_id
            ORDER BY {$sortBy} {$sortOrder}
            LIMIT ? OFFSET ?
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$limit, $offset]);
        $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format the results - age will be calculated on frontend
        $formattedCustomers = array_map(function($customer) {
            return [
                'customer_id' => $customer['customer_id'],
                'full_name' => $customer['full_name'],
                'phone_number' => $customer['phone_number'],
                'email' => $customer['email'] ?? '',
                'address' => $customer['address'] ?? '',
                'date_of_birth' => $customer['date_of_birth'],
                'reg_date' => $customer['reg_date'],
                'total_purchases' => (int)$customer['total_purchases'],
                'total_spent' => (float)($customer['total_amount'] ?? 0)
            ];
        }, $customers);
        
        // Calculate pagination
        $totalPages = ceil($totalCount / $limit);
        
        echo json_encode([
            'success' => true,
            'customers' => $formattedCustomers,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'total_count' => (int)$totalCount,
                'per_page' => $limit,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to fetch customers: ' . $e->getMessage());
    }
}

/**
 * Search customers based on search term
 */
function searchCustomers($db, $params) {
    $searchTerm = $params['search'] ?? '';
    $limit = isset($params['limit']) ? (int)$params['limit'] : 20;
    
    try {
        if (empty($searchTerm)) {
            // If no search term, return all customers
            getAllCustomers($db, $params);
            return;
        }
        
        // Search customers by name, phone, or address
        $searchPattern = '%' . $searchTerm . '%';
        $sql = "
            SELECT c.*, 
                   COALESCE(purchase_stats.total_purchases, 0) as total_purchases,
                   COALESCE(purchase_stats.total_amount, 0) as total_spent
            FROM customer c
            LEFT JOIN (
                SELECT customer_id, 
                       COUNT(*) as total_purchases,
                       SUM(total_amount) as total_amount
                FROM sale 
                GROUP BY customer_id
            ) purchase_stats ON c.customer_id = purchase_stats.customer_id
            WHERE c.full_name LIKE ? 
               OR c.phone_number LIKE ? 
               OR c.address LIKE ?
               OR c.email LIKE ?
            ORDER BY c.full_name ASC 
            LIMIT ?
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$searchPattern, $searchPattern, $searchPattern, $searchPattern, $limit]);
        $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format the results - age will be calculated on frontend
        $formattedCustomers = array_map(function($customer) {
            return [
                'customer_id' => $customer['customer_id'],
                'full_name' => $customer['full_name'],
                'phone_number' => $customer['phone_number'],
                'email' => $customer['email'] ?? '',
                'address' => $customer['address'] ?? '',
                'date_of_birth' => $customer['date_of_birth'],
                'reg_date' => $customer['reg_date'],
                'total_purchases' => (int)$customer['total_purchases'],
                'total_spent' => (float)($customer['total_amount'] ?? 0)
            ];
        }, $customers);
        
        echo json_encode([
            'success' => true,
            'customers' => $formattedCustomers,
            'total_found' => count($formattedCustomers),
            'search_term' => $searchTerm
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to search customers: ' . $e->getMessage());
    }
}

/**
 * Get detailed information about a specific customer
 */
function getCustomerDetails($db, $params) {
    $customerId = $params['customer_id'] ?? '';
    
    if (empty($customerId)) {
        throw new Exception('Customer ID is required');
    }
    
    try {
        // Get customer details with purchase statistics
        $stmt = $db->prepare("
            SELECT c.*, 
                   COALESCE(purchase_stats.total_purchases, 0) as total_purchases,
                   COALESCE(purchase_stats.total_amount, 0) as total_spent,
                   COALESCE(purchase_stats.last_purchase, NULL) as last_purchase_date
            FROM customer c
            LEFT JOIN (
                SELECT customer_id, 
                       COUNT(*) as total_purchases,
                       SUM(total_amount) as total_amount,
                       MAX(sale_date) as last_purchase
                FROM sale 
                GROUP BY customer_id
            ) purchase_stats ON c.customer_id = purchase_stats.customer_id
            WHERE c.customer_id = ?
        ");
        $stmt->execute([$customerId]);
        $customer = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$customer) {
            throw new Exception('Customer not found');
        }
        
        // Calculate age
        $age = null;
        if ($customer['date_of_birth']) {
            $birthDate = new DateTime($customer['date_of_birth']);
            $today = new DateTime();
            $age = $today->diff($birthDate)->y;
        }
        
        echo json_encode([
            'success' => true,
            'customer' => [
                'id' => $customer['customer_id'],
                'name' => $customer['full_name'],
                'phone' => $customer['phone_number'],
                'email' => $customer['email'] ?? '',
                'address' => $customer['address'] ?? '',
                'date_of_birth' => $customer['date_of_birth'],
                'age' => $age,
                'created_at' => $customer['reg_date'],
                'total_purchases' => (int)$customer['total_purchases'],
                'total_spent' => (float)$customer['total_spent'],
                'last_purchase_date' => $customer['last_purchase_date'],
                'registered_date' => $customer['reg_date']
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get customer details: ' . $e->getMessage());
    }
}

/**
 * Add new customer
 */
function addCustomer($db, $data) {
    $name = sanitizeInput($data['name'] ?? '');
    $phone = sanitizeInput($data['phone'] ?? '');
    $email = sanitizeInput($data['email'] ?? '');
    $address = sanitizeInput($data['address'] ?? '');
    $dateOfBirth = $data['date_of_birth'] ?? null;
    
    // Validation
    if (empty($name)) {
        throw new Exception('Customer name is required');
    }
    
    if (empty($phone)) {
        throw new Exception('Contact number is required');
    }
    
    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }
    
    if (empty($address)) {
        throw new Exception('Address is required');
    }
    
    if (empty($dateOfBirth)) {
        throw new Exception('Date of birth is required');
    }
    
    // Validate date of birth is not in future
    if (strtotime($dateOfBirth) > time()) {
        throw new Exception('Date of birth cannot be in the future');
    }
    
    // Check if phone number already exists
    try {
        $stmt = $db->prepare("SELECT customer_id FROM customer WHERE phone_number = ?");
        $stmt->execute([$phone]);
        if ($stmt->fetch()) {
            throw new Exception('Customer with this phone number already exists');
        }
        
        // Insert new customer (customer_id is auto-increment)
        $stmt = $db->prepare("
            INSERT INTO customer (full_name, phone_number, email, address, date_of_birth, reg_date) 
            VALUES (?, ?, ?, ?, ?, CURDATE())
        ");
        $stmt->execute([$name, $phone, $email, $address, $dateOfBirth]);
        
        // Get the last inserted ID
        $customerId = $db->lastInsertId();
        
        // Calculate age
        $birthDate = new DateTime($dateOfBirth);
        $today = new DateTime();
        $age = $today->diff($birthDate)->y;
        
        echo json_encode([
            'success' => true,
            'message' => 'Customer added successfully',
            'customer' => [
                'id' => $customerId,
                'name' => $name,
                'phone' => $phone,
                'email' => $email,
                'address' => $address,
                'date_of_birth' => $dateOfBirth,
                'age' => $age,
                'created_at' => date('Y-m-d'),
                'total_purchases' => 0,
                'total_spent' => 0.0,
                'registered_date' => date('Y-m-d')
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to add customer: ' . $e->getMessage());
    }
}

/**
 * Update existing customer
 */
function updateCustomer($db, $data) {
    $customerId = $data['customer_id'] ?? '';
    $name = sanitizeInput($data['name'] ?? '');
    $phone = sanitizeInput($data['phone'] ?? '');
    $email = sanitizeInput($data['email'] ?? '');
    $address = sanitizeInput($data['address'] ?? '');
    $dateOfBirth = $data['date_of_birth'] ?? null;
    
    // Validation
    if (empty($customerId)) {
        throw new Exception('Customer ID is required');
    }
    
    if (empty($name)) {
        throw new Exception('Customer name is required');
    }
    
    if (empty($phone)) {
        throw new Exception('Contact number is required');
    }
    
    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }
    
    if (empty($address)) {
        throw new Exception('Address is required');
    }
    
    if (empty($dateOfBirth)) {
        throw new Exception('Date of birth is required');
    }
    
    // Validate date of birth is not in future
    if (strtotime($dateOfBirth) > time()) {
        throw new Exception('Date of birth cannot be in the future');
    }
    
    try {
        // Check if customer exists
        $stmt = $db->prepare("SELECT customer_id FROM customer WHERE customer_id = ?");
        $stmt->execute([$customerId]);
        if (!$stmt->fetch()) {
            throw new Exception('Customer not found');
        }
        
        // Check if phone number already exists for another customer
        $stmt = $db->prepare("SELECT customer_id FROM customer WHERE phone_number = ? AND customer_id != ?");
        $stmt->execute([$phone, $customerId]);
        if ($stmt->fetch()) {
            throw new Exception('Another customer with this phone number already exists');
        }
        
        // Update customer
        $stmt = $db->prepare("
            UPDATE customer 
            SET full_name = ?, phone_number = ?, email = ?, address = ?, date_of_birth = ?
            WHERE customer_id = ?
        ");
        $stmt->execute([$name, $phone, $email, $address, $dateOfBirth, $customerId]);
        
        // Calculate age
        $birthDate = new DateTime($dateOfBirth);
        $today = new DateTime();
        $age = $today->diff($birthDate)->y;
        
        echo json_encode([
            'success' => true,
            'message' => 'Customer updated successfully',
            'customer' => [
                'id' => $customerId,
                'name' => $name,
                'phone' => $phone,
                'email' => $email,
                'address' => $address,
                'date_of_birth' => $dateOfBirth,
                'age' => $age
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to update customer: ' . $e->getMessage());
    }
}

/**
 * Delete customer (soft delete - mark as inactive)
 */
function deleteCustomer($db, $data) {
    $customerId = $data['customer_id'] ?? '';
    
    if (empty($customerId)) {
        throw new Exception('Customer ID is required');
    }
    
    try {
        // Check if customer exists
        $stmt = $db->prepare("SELECT customer_id FROM customer WHERE customer_id = ?");
        $stmt->execute([$customerId]);
        if (!$stmt->fetch()) {
            throw new Exception('Customer not found');
        }
        
        // Check if customer has any purchases
        $stmt = $db->prepare("SELECT COUNT(*) as purchase_count FROM sale WHERE customer_id = ?");
        $stmt->execute([$customerId]);
        $purchaseCount = $stmt->fetch(PDO::FETCH_ASSOC)['purchase_count'];
        
        if ($purchaseCount > 0) {
            // Soft delete - add 'DELETED_' prefix to avoid constraint issues
            $stmt = $db->prepare("
                UPDATE customer 
                SET full_name = CONCAT('DELETED_', full_name),
                    phone_number = CONCAT('DELETED_', phone_number),
                    email = CONCAT('DELETED_', COALESCE(email, '')),
                    address = CONCAT('DELETED - ', address)
                WHERE customer_id = ?
            ");
            $stmt->execute([$customerId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Customer marked as deleted (has purchase history)',
                'deleted_type' => 'soft'
            ], JSON_PRETTY_PRINT);
        } else {
            // Hard delete if no purchases
            $stmt = $db->prepare("DELETE FROM customer WHERE customer_id = ?");
            $stmt->execute([$customerId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Customer deleted successfully',
                'deleted_type' => 'hard'
            ], JSON_PRETTY_PRINT);
        }
        
    } catch (PDOException $e) {
        throw new Exception('Failed to delete customer: ' . $e->getMessage());
    }
}

/**
 * Get customer statistics
 */
function getCustomerStats($db) {
    try {
        // Get various customer statistics
        $stats = [];
        
        // Total customers
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM customer WHERE full_name NOT LIKE 'DELETED_%'");
        $stmt->execute();
        $stats['total_customers'] = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // New customers this month
        $stmt = $db->prepare("
            SELECT COUNT(*) as new_this_month 
            FROM customer 
            WHERE DATE_FORMAT(reg_date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
            AND full_name NOT LIKE 'DELETED_%'
        ");
        $stmt->execute();
        $stats['new_this_month'] = (int)$stmt->fetch(PDO::FETCH_ASSOC)['new_this_month'];
        
        // Active customers (with purchases)
        $stmt = $db->prepare("
            SELECT COUNT(DISTINCT customer_id) as active_customers 
            FROM sale
        ");
        $stmt->execute();
        $stats['active_customers'] = (int)$stmt->fetch(PDO::FETCH_ASSOC)['active_customers'];
        
        // Top customer by purchases
        $stmt = $db->prepare("
            SELECT c.full_name as customer_name, COUNT(s.sale_id) as purchase_count
            FROM customer c
            JOIN sale s ON c.customer_id = s.customer_id
            WHERE c.full_name NOT LIKE 'DELETED_%'
            GROUP BY c.customer_id, c.full_name
            ORDER BY purchase_count DESC
            LIMIT 1
        ");
        $stmt->execute();
        $topCustomer = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['top_customer'] = $topCustomer ? $topCustomer : null;
        
        // Average age
        $stmt = $db->prepare("
            SELECT AVG(TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE())) as avg_age
            FROM customer 
            WHERE date_of_birth IS NOT NULL AND full_name NOT LIKE 'DELETED_%'
        ");
        $stmt->execute();
        $avgAge = $stmt->fetch(PDO::FETCH_ASSOC)['avg_age'];
        $stats['average_age'] = $avgAge ? round($avgAge, 1) : null;
        
        echo json_encode([
            'success' => true,
            'stats' => $stats
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get customer statistics: ' . $e->getMessage());
    }
}

/**
 * Get customer purchase history
 */
function getCustomerPurchases($db, $params) {
    $customerId = $params['customer_id'] ?? '';
    $limit = isset($params['limit']) ? (int)$params['limit'] : 10;
    
    if (empty($customerId)) {
        throw new Exception('Customer ID is required');
    }
    
    try {
        // Get customer purchase history
        $stmt = $db->prepare("
            SELECT s.*, 
                   COUNT(sml.sale_med_list_id) as item_count
            FROM sale s
            LEFT JOIN sale_med_list sml ON s.sale_id = sml.sale_id
            WHERE s.customer_id = ?
            GROUP BY s.sale_id
            ORDER BY s.sale_date DESC
            LIMIT ?
        ");
        $stmt->execute([$customerId, $limit]);
        $purchases = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format the results
        $formattedPurchases = array_map(function($purchase) {
            return [
                'sale_id' => $purchase['sale_id'],
                'sale_date' => $purchase['sale_date'],
                'total_amount' => (float)$purchase['total_amount'],
                'payment_method' => $purchase['payment_type'],
                'item_count' => (int)$purchase['item_count'],
                'discount_amount' => (float)$purchase['discount']
            ];
        }, $purchases);
        
        echo json_encode([
            'success' => true,
            'purchases' => $formattedPurchases,
            'customer_id' => $customerId
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get customer purchases: ' . $e->getMessage());
    }
}
?>
