<?php
/**
 * Admin Inside Customer Backend API
 * New Lanka Pharmacy Management System
 * 
 * Handles customer detail view operations including getting customer details,
 * purchase history, updating customer information, and deletion
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
        case 'get_customer_details':
            getCustomerDetails($db, $_GET);
            break;
            
        case 'get_purchase_history':
            getPurchaseHistory($db, $_GET);
            break;
            
        case 'update_customer':
            updateCustomer($db, $_POST);
            break;
            
        case 'delete_customer':
            deleteCustomer($db, $_POST);
            break;
            
        case 'get_customer_stats':
            getCustomerStats($db, $_GET);
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
            WHERE c.customer_id = ? AND c.full_name NOT LIKE 'DELETED_%'
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
        
        // Calculate customer since duration
        $customerSince = '';
        if ($customer['reg_date']) {
            $regDate = new DateTime($customer['reg_date']);
            $today = new DateTime();
            $diff = $today->diff($regDate);
            
            if ($diff->y > 0) {
                $customerSince = $diff->y . ' year' . ($diff->y > 1 ? 's' : '');
                if ($diff->m > 0) {
                    $customerSince .= ' ' . $diff->m . ' month' . ($diff->m > 1 ? 's' : '');
                }
            } elseif ($diff->m > 0) {
                $customerSince = $diff->m . ' month' . ($diff->m > 1 ? 's' : '');
            } else {
                $customerSince = $diff->d . ' day' . ($diff->d > 1 ? 's' : '');
            }
        }
        
        echo json_encode([
            'success' => true,
            'customer' => [
                'id' => $customer['customer_id'],
                'full_name' => $customer['full_name'],
                'phone_number' => $customer['phone_number'],
                'email' => $customer['email'] ?? '',
                'address' => $customer['address'] ?? '',
                'date_of_birth' => $customer['date_of_birth'],
                'age' => $age,
                'reg_date' => $customer['reg_date'],
                'customer_since' => $customerSince,
                'total_purchases' => (int)$customer['total_purchases'],
                'total_spent' => (float)$customer['total_spent'],
                'last_purchase_date' => $customer['last_purchase_date']
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get customer details: ' . $e->getMessage());
    }
}

/**
 * Get customer purchase history with detailed information
 */
function getPurchaseHistory($db, $params) {
    $customerId = $params['customer_id'] ?? '';
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $offset = ($page - 1) * $limit;
    
    if (empty($customerId)) {
        throw new Exception('Customer ID is required');
    }
    
    try {
        // Get customer purchase history with user information
        $stmt = $db->prepare("
            SELECT s.sale_id,
                   s.sale_date,
                   s.sale_time,
                   s.total_amount,
                   u.user_name,
                   COUNT(sml.sale_med_list_id) as item_count
            FROM sale s
            LEFT JOIN user u ON s.user_id = u.user_id
            LEFT JOIN sale_med_list sml ON s.sale_id = sml.sale_id
            WHERE s.customer_id = ?
            GROUP BY s.sale_id, s.sale_date, s.sale_time, s.total_amount, u.user_name
            ORDER BY s.sale_date DESC, s.sale_time DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$customerId, $limit, $offset]);
        $purchases = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get total count for pagination
        $countStmt = $db->prepare("
            SELECT COUNT(*) as total 
            FROM sale 
            WHERE customer_id = ?
        ");
        $countStmt->execute([$customerId]);
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Format the results
        $formattedPurchases = array_map(function($purchase) {
            return [
                'sale_id' => $purchase['sale_id'],
                'date' => $purchase['sale_date'],
                'time' => $purchase['sale_time'],
                'items' => (int)($purchase['item_count'] ?? 0),
                'amount' => (float)$purchase['total_amount'],
                'user' => $purchase['user_name'] ?? 'Unknown'
            ];
        }, $purchases);
        
        // Calculate pagination
        $totalPages = ceil($totalCount / $limit);
        
        echo json_encode([
            'success' => true,
            'purchases' => $formattedPurchases,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'total_count' => (int)$totalCount,
                'per_page' => $limit,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1
            ],
            'customer_id' => $customerId
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get purchase history: ' . $e->getMessage());
    }
}

/**
 * Update customer information
 */
function updateCustomer($db, $data) {
    $customerId = $data['customer_id'] ?? '';
    $fullName = sanitizeInput($data['full_name'] ?? '');
    $phoneNumber = sanitizeInput($data['phone_number'] ?? '');
    $email = sanitizeInput($data['email'] ?? '');
    $address = sanitizeInput($data['address'] ?? '');
    $dateOfBirth = $data['date_of_birth'] ?? null;
    
    // Validation
    if (empty($customerId)) {
        throw new Exception('Customer ID is required');
    }
    
    if (empty($fullName)) {
        throw new Exception('Customer name is required');
    }
    
    if (empty($phoneNumber)) {
        throw new Exception('Phone number is required');
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
        $stmt = $db->prepare("SELECT customer_id FROM customer WHERE customer_id = ? AND full_name NOT LIKE 'DELETED_%'");
        $stmt->execute([$customerId]);
        if (!$stmt->fetch()) {
            throw new Exception('Customer not found');
        }
        
        // Check if phone number already exists for another customer
        $stmt = $db->prepare("SELECT customer_id FROM customer WHERE phone_number = ? AND customer_id != ? AND full_name NOT LIKE 'DELETED_%'");
        $stmt->execute([$phoneNumber, $customerId]);
        if ($stmt->fetch()) {
            throw new Exception('Another customer with this phone number already exists');
        }
        
        // Update customer
        $stmt = $db->prepare("
            UPDATE customer 
            SET full_name = ?, phone_number = ?, email = ?, address = ?, date_of_birth = ?
            WHERE customer_id = ?
        ");
        $stmt->execute([$fullName, $phoneNumber, $email, $address, $dateOfBirth, $customerId]);
        
        // Calculate age
        $age = null;
        if ($dateOfBirth) {
            $birthDate = new DateTime($dateOfBirth);
            $today = new DateTime();
            $age = $today->diff($birthDate)->y;
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Customer updated successfully',
            'customer' => [
                'id' => $customerId,
                'full_name' => $fullName,
                'phone_number' => $phoneNumber,
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
        $stmt = $db->prepare("SELECT customer_id FROM customer WHERE customer_id = ? AND full_name NOT LIKE 'DELETED_%'");
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
 * Get customer statistics (for dashboard widgets)
 */
function getCustomerStats($db, $params) {
    $customerId = $params['customer_id'] ?? '';
    
    if (empty($customerId)) {
        throw new Exception('Customer ID is required');
    }
    
    try {
        // Get customer specific statistics
        $stats = [];
        
        // Total purchases
        $stmt = $db->prepare("SELECT COUNT(*) as total FROM sale WHERE customer_id = ?");
        $stmt->execute([$customerId]);
        $stats['total_purchases'] = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Total amount spent
        $stmt = $db->prepare("SELECT SUM(total_amount) as total_spent FROM sale WHERE customer_id = ?");
        $stmt->execute([$customerId]);
        $totalSpent = $stmt->fetch(PDO::FETCH_ASSOC)['total_spent'];
        $stats['total_spent'] = $totalSpent ? (float)$totalSpent : 0.0;
        
        // Average purchase amount
        if ($stats['total_purchases'] > 0) {
            $stats['average_purchase'] = $stats['total_spent'] / $stats['total_purchases'];
        } else {
            $stats['average_purchase'] = 0.0;
        }
        
        // Last purchase date
        $stmt = $db->prepare("SELECT MAX(sale_date) as last_purchase FROM sale WHERE customer_id = ?");
        $stmt->execute([$customerId]);
        $lastPurchase = $stmt->fetch(PDO::FETCH_ASSOC)['last_purchase'];
        $stats['last_purchase'] = $lastPurchase;
        
        // Most purchased medicine
        $stmt = $db->prepare("
            SELECT m.medicine_name, SUM(sml.quantity) as total_quantity
            FROM sale s
            JOIN sale_med_list sml ON s.sale_id = sml.sale_id
            JOIN medicine m ON sml.med_id = m.medicine_id
            WHERE s.customer_id = ?
            GROUP BY m.medicine_id, m.medicine_name
            ORDER BY total_quantity DESC
            LIMIT 1
        ");
        $stmt->execute([$customerId]);
        $mostPurchased = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['most_purchased_medicine'] = $mostPurchased ? $mostPurchased : null;
        
        echo json_encode([
            'success' => true,
            'stats' => $stats,
            'customer_id' => $customerId
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get customer statistics: ' . $e->getMessage());
    }
}
?>
