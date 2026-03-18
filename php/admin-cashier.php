<?php
/**
 * Admin Cashier Backend API
 * New Lanka Pharmacy Management System
 * 
 * Handles all cashier operations including medicine search, customer management,
 * cart operations, and sales processing
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
    if (!in_array($currentUser['role'], ['admin', 'pharmacist', 'cashier'])) {
        throw new Exception('Access denied. Admin, Pharmacist or Cashier privileges required.');
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
    
    // Handle JSON input for POST requests
    if ($method === 'POST' && isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
        $rawInput = file_get_contents('php://input');
        $jsonData = json_decode($rawInput, true);
        $action = $jsonData['action'] ?? '';
    } else {
        $action = $_GET['action'] ?? $_POST['action'] ?? '';
        $jsonData = null;
    }
    
    // Route requests based on action
    switch ($action) {
        case 'search_medicines':
            searchMedicines($db, $_GET);
            break;
            
        case 'get_medicine_details':
            getMedicineDetails($db, $_GET);
            break;
            
        case 'search_customers':
            searchCustomers($db, $_GET);
            break;
            
        case 'add_customer':
            addCustomer($db, $_POST);
            break;
            
        case 'add_medicine':
            addMedicine($db, $_POST);
            break;
            
        case 'complete_sale':
            completeSale($db, $jsonData ?? $_POST, $currentUser);
            break;
            
        case 'get_receipt':
            getReceipt($db, $_GET);
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
 * Search medicines based on search term
 */
function searchMedicines($db, $params) {
    $searchTerm = $params['search'] ?? '';
    $limit = isset($params['limit']) ? (int)$params['limit'] : 10;
    
    try {
        if (empty($searchTerm)) {
            // Get all medicines with stock > 0, limited
            $stmt = $db->prepare("
                SELECT m.medicine_id, m.medicine_name, m.medicine_brand, 
                       m.stock_left, m.medicine_price, mg.med_group_name
                FROM medicine m
                LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
                WHERE m.stock_left > 0 
                ORDER BY m.medicine_name ASC 
                LIMIT ?
            ");
            $stmt->execute([$limit]);
        } else {
            // Search medicines by name or brand
            $searchPattern = '%' . $searchTerm . '%';
            $stmt = $db->prepare("
                SELECT m.medicine_id, m.medicine_name, m.medicine_brand, 
                       m.stock_left, m.medicine_price, mg.med_group_name
                FROM medicine m
                LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
                WHERE (m.medicine_name LIKE ? OR m.medicine_brand LIKE ?) 
                AND m.stock_left > 0 
                ORDER BY m.medicine_name ASC 
                LIMIT ?
            ");
            $stmt->execute([$searchPattern, $searchPattern, $limit]);
        }
        
        $medicines = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format the results
        $formattedMedicines = array_map(function($medicine) {
            return [
                'id' => (int)$medicine['medicine_id'],
                'name' => $medicine['medicine_name'],
                'brand' => $medicine['medicine_brand'] ?? 'Unknown Brand',
                'batch' => 'N/A', // Not available in database
                'stock' => (int)$medicine['stock_left'],
                'price' => (float)$medicine['medicine_price'],
                'expiry_date' => null, // Not available in database
                'category' => $medicine['med_group_name'] ?? 'General',
                'is_low_stock' => (int)$medicine['stock_left'] < 20
            ];
        }, $medicines);
        
        echo json_encode([
            'success' => true,
            'medicines' => $formattedMedicines,
            'total_found' => count($formattedMedicines)
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to search medicines: ' . $e->getMessage());
    }
}

/**
 * Get detailed information about a specific medicine
 */
function getMedicineDetails($db, $params) {
    $medicineId = (int)($params['medicine_id'] ?? 0);
    
    if ($medicineId <= 0) {
        throw new Exception('Invalid medicine ID');
    }
    
    try {
        $stmt = $db->prepare("
            SELECT m.medicine_id, m.medicine_name, m.medicine_brand, 
                   m.stock_left, m.medicine_price, m.how_to_use, m.side_effects,
                   mg.med_group_name
            FROM medicine m
            LEFT JOIN med_group mg ON m.med_group_id = mg.med_group_id
            WHERE m.medicine_id = ?
        ");
        $stmt->execute([$medicineId]);
        $medicine = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$medicine) {
            throw new Exception('Medicine not found');
        }
        
        echo json_encode([
            'success' => true,
            'medicine' => [
                'id' => (int)$medicine['medicine_id'],
                'name' => $medicine['medicine_name'],
                'brand' => $medicine['medicine_brand'] ?? 'Unknown Brand',
                'batch' => 'N/A', // Not available in database
                'stock' => (int)$medicine['stock_left'],
                'price' => (float)$medicine['medicine_price'],
                'expiry_date' => null, // Not available in database
                'category' => $medicine['med_group_name'] ?? 'General',
                'description' => $medicine['how_to_use'] ?? '',
                'side_effects' => $medicine['side_effects'] ?? '',
                'is_low_stock' => (int)$medicine['stock_left'] < 20,
                'is_expired' => false // Can't check without expiry date
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get medicine details: ' . $e->getMessage());
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
            // Get all customers, limited
            $stmt = $db->prepare("
                SELECT customer_id, full_name, phone_number, 
                       address, date_of_birth, email
                FROM customer 
                WHERE full_name NOT LIKE 'DELETED_%'
                ORDER BY full_name ASC 
                LIMIT ?
            ");
            $stmt->execute([$limit]);
        } else {
            // Search customers by name or phone
            $searchPattern = '%' . $searchTerm . '%';
            $stmt = $db->prepare("
                SELECT customer_id, full_name, phone_number, 
                       address, date_of_birth, email
                FROM customer 
                WHERE (full_name LIKE ? OR phone_number LIKE ?) 
                AND full_name NOT LIKE 'DELETED_%'
                ORDER BY full_name ASC 
                LIMIT ?
            ");
            $stmt->execute([$searchPattern, $searchPattern, $limit]);
        }
        
        $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format the results
        $formattedCustomers = array_map(function($customer) {
            return [
                'id' => $customer['customer_id'],
                'name' => $customer['full_name'],
                'phone' => $customer['phone_number'],
                'email' => $customer['email'] ?? '',
                'address' => $customer['address'] ?? '',
                'date_of_birth' => $customer['date_of_birth']
            ];
        }, $customers);
        
        echo json_encode([
            'success' => true,
            'customers' => $formattedCustomers,
            'total_found' => count($formattedCustomers)
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to search customers: ' . $e->getMessage());
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
        
        echo json_encode([
            'success' => true,
            'message' => 'Customer added successfully',
            'customer' => [
                'id' => $customerId,
                'name' => $name,
                'phone' => $phone,
                'email' => $email,
                'address' => $address,
                'date_of_birth' => $dateOfBirth
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to add customer: ' . $e->getMessage());
    }
}

/**
 * Add new medicine
 */
function addMedicine($db, $data) {
    $name = sanitizeInput($data['name'] ?? '');
    $brand = sanitizeInput($data['brand'] ?? '');
    $category = sanitizeInput($data['category'] ?? '');
    $stock = (int)($data['stock'] ?? 0);
    $price = (float)($data['price'] ?? 0);
    $expiryDate = $data['expiry_date'] ?? null;
    
    // Validation
    if (empty($name)) {
        throw new Exception('Medicine name is required');
    }
    
    if (empty($brand)) {
        throw new Exception('Brand is required');
    }
    
    if (empty($category)) {
        throw new Exception('Category is required');
    }
    
    if ($stock < 0) {
        throw new Exception('Stock quantity cannot be negative'); 
    }
    
    if ($price <= 0) {
        throw new Exception('Price must be greater than zero');
    }
    
    try {
        // Get or create medicine group
        $stmt = $db->prepare("SELECT med_group_id FROM med_group WHERE med_group_name = ?");
        $stmt->execute([$category]);
        $group = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$group) {
            // Create new medicine group
            $stmt = $db->prepare("INSERT INTO med_group (med_group_name, description) VALUES (?, ?)");
            $description = $category . " medicines";
            $stmt->execute([$category, $description]);
            $medGroupId = $db->lastInsertId();
        } else {
            $medGroupId = $group['med_group_id'];
        }
        
        // Insert new medicine
        $stmt = $db->prepare("
            INSERT INTO medicine (medicine_name, medicine_brand, med_group_id, stock_left, 
                                medicine_price, lifetime_supply, how_to_use, side_effects) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $name, 
            $brand, 
            $medGroupId, 
            $stock, 
            $price, 
            $stock, 
            '', // how_to_use (can be added later)
            ''  // side_effects (can be added later)
        ]);
        
        $medicineId = $db->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'Medicine added successfully',
            'medicine' => [
                'id' => (int)$medicineId,
                'name' => $name,
                'brand' => $brand,
                'category' => $category,
                'med_group_id' => $medGroupId,
                'stock' => $stock,
                'price' => $price,
                'expiry_date' => $expiryDate
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to add medicine: ' . $e->getMessage());
    }
}

/**
 * Complete sale transaction
 */
function completeSale($db, $data, $currentUser) {
    $customerId = $data['customer_id'] ?? null;
    $cartItems = $data['cart_items'] ?? [];
    $paymentMethod = $data['payment_method'] ?? 'cash';
    $discountPercent = (float)($data['discount_percent'] ?? 0);
    $amountPaid = (float)($data['amount_paid'] ?? 0);
    
    // Validation
    if (empty($cartItems)) {
        throw new Exception('Cart is empty');
    }
    
    if ($amountPaid <= 0) {
        throw new Exception('Invalid payment amount');
    }
    
    try {
        // Begin transaction
        $db->beginTransaction();
        
        // Calculate totals
        $subtotal = 0;
        $validatedItems = [];
        
        foreach ($cartItems as $item) {
            $medicineId = (int)$item['id'];
            $quantity = (int)$item['quantity'];
            
            if ($quantity <= 0) {
                throw new Exception('Invalid quantity for medicine ID: ' . $medicineId);
            }
            
            // Get current medicine details and check stock
            $stmt = $db->prepare("
                SELECT medicine_id, medicine_name, medicine_brand, 
                       stock_left, medicine_price 
                FROM medicine 
                WHERE medicine_id = ? AND stock_left >= ?
            ");
            $stmt->execute([$medicineId, $quantity]);
            $medicine = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$medicine) {
                throw new Exception('Insufficient stock for: ' . ($item['name'] ?? 'Medicine ID ' . $medicineId));
            }
            
            $itemTotal = $medicine['medicine_price'] * $quantity;
            $subtotal += $itemTotal;
            
            $validatedItems[] = [
                'medicine_id' => $medicineId,
                'medicine_name' => $medicine['medicine_name'],
                'brand' => $medicine['medicine_brand'],
                'quantity' => $quantity,
                'unit_price' => (float)$medicine['medicine_price'],
                'total_price' => $itemTotal
            ];
        }
        
        // Apply discount
        $discountAmount = ($subtotal * $discountPercent) / 100;
        $totalAmount = $subtotal - $discountAmount;
        
        // Check if payment is sufficient
        if ($amountPaid < $totalAmount) {
            throw new Exception('Insufficient payment amount');
        }
        
        $changeAmount = $amountPaid - $totalAmount;
        
        // Insert sale record first (we'll update sale_med_list_id later)
        $stmt = $db->prepare("
            INSERT INTO sale (sale_date, sale_time, sub_total, customer_id, user_id, 
                            sale_med_list_id, discount, total_amount, 
                            amount_recieved, change_given, payment_type) 
            VALUES (CURDATE(), CURTIME(), ?, ?, ?, 1, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $subtotal, $customerId, $currentUser['user_id'], 
            $discountPercent, $totalAmount, 
            $amountPaid, $changeAmount, $paymentMethod
        ]);
        
        $saleId = $db->lastInsertId();
        
        // Insert sale items and update stock
        $firstSaleMedListId = null;
        foreach ($validatedItems as $item) {
            // Insert sale item into sale_med_list
            $stmt = $db->prepare("
                INSERT INTO sale_med_list (sale_id, med_id, quantity) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([
                $saleId, $item['medicine_id'], $item['quantity']
            ]);
            
            // Get the first sale_med_list_id for updating the sale record
            if ($firstSaleMedListId === null) {
                $firstSaleMedListId = $db->lastInsertId();
            }
            
            // Update medicine stock
            $stmt = $db->prepare("
                UPDATE medicine 
                SET stock_left = stock_left - ? 
                WHERE medicine_id = ?
            ");
            $stmt->execute([$item['quantity'], $item['medicine_id']]);
        }
        
        // Update the sale record with the correct sale_med_list_id
        if ($firstSaleMedListId) {
            $stmt = $db->prepare("
                UPDATE sale SET sale_med_list_id = ? WHERE sale_id = ?
            ");
            $stmt->execute([$firstSaleMedListId, $saleId]);
        }
        
        // Commit transaction
        $db->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Sale completed successfully',
            'sale' => [
                'sale_id' => $saleId,
                'subtotal' => $subtotal,
                'discount_percent' => $discountPercent,
                'total_amount' => $totalAmount,
                'amount_paid' => $amountPaid,
                'change_amount' => $changeAmount,
                'payment_method' => $paymentMethod,
                'items' => $validatedItems,
                'sale_date' => date('Y-m-d'),
                'sale_time' => date('H:i:s')
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $db->rollback();
        throw $e;
    } catch (PDOException $e) {
        // Rollback transaction on database error
        $db->rollback();
        throw new Exception('Failed to complete sale: ' . $e->getMessage());
    }
}

/**
 * Get receipt details for a specific sale
 */
function getReceipt($db, $params) {
    $saleId = $params['sale_id'] ?? '';
    
    if (empty($saleId)) {
        throw new Exception('Sale ID is required');
    }
    
    try {
        // Get sale details
        $stmt = $db->prepare("
            SELECT s.*, c.full_name as customer_name, c.phone_number as contact_number
            FROM sale s
            LEFT JOIN customer c ON s.customer_id = c.customer_id
            WHERE s.sale_id = ?
        ");
        $stmt->execute([$saleId]);
        $sale = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$sale) {
            throw new Exception('Sale not found');
        }
        
        // Get sale items
        $stmt = $db->prepare("
            SELECT sml.*, m.medicine_name, m.medicine_brand
            FROM sale_med_list sml
            JOIN medicine m ON sml.med_id = m.medicine_id
            WHERE sml.sale_id = ?
        ");
        $stmt->execute([$saleId]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'receipt' => [
                'sale_id' => $sale['sale_id'],
                'sale_date' => $sale['sale_date'],
                'customer' => [
                    'name' => $sale['customer_name'] ?? 'Walk-in Customer',
                    'phone' => $sale['contact_number'] ?? ''
                ],
                'cashier' => 'Admin', // Since user table doesn't exist in schema
                'subtotal' => (float)$sale['sub_total'],
                'discount_percent' => (float)$sale['discount'],
                'discount_amount' => (float)$sale['sub_total'] * (float)$sale['discount'] / 100,
                'total_amount' => (float)$sale['total_amount'],
                'amount_paid' => (float)$sale['amount_recieved'],
                'change_amount' => (float)$sale['change_given'],
                'payment_method' => $sale['payment_type'],
                'items' => array_map(function($item) {
                    return [
                        'medicine_name' => $item['medicine_name'],
                        'brand' => $item['medicine_brand'],
                        'quantity' => (int)$item['quantity'],
                        'unit_price' => 0, // Not stored in sale_med_list
                        'total_price' => 0  // Not stored in sale_med_list
                    ];
                }, $items)
            ]
        ], JSON_PRETTY_PRINT);
        
    } catch (PDOException $e) {
        throw new Exception('Failed to get receipt: ' . $e->getMessage());
    }
}
?>
