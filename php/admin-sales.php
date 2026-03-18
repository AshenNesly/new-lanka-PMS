<?php
/**
 * Admin Sales Backend
 * New Lanka Pharmacy Management System
 * 
 * Handles sales data retrieval and processing for admin sales page
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once 'database.php';

class AdminSales {
    private $conn;
    private $db;

    public function __construct() {
        try {
            $this->db = new Database();
            $this->conn = $this->db->getConnection();
            
            if (!$this->conn) {
                throw new Exception("Database connection failed");
            }
        } catch (Exception $e) {
            $this->sendError("Database connection error: " . $e->getMessage());
            exit();
        }
    }

    /**
     * Main request handler
     */
    public function handleRequest() {
        try {
            $action = $_GET['action'] ?? $_POST['action'] ?? 'get_sales';
            
            switch ($action) {
                case 'get_sales':
                    $this->getAllSales();
                    break;
                case 'search_sales':
                    $this->searchSales();
                    break;
                case 'filter_sales':
                    $this->filterSales();
                    break;
                case 'get_sale_details':
                    $this->getSaleDetails();
                    break;
                default:
                    $this->sendError("Invalid action: " . $action);
            }
        } catch (Exception $e) {
            $this->sendError("Server error: " . $e->getMessage());
        }
    }

    /**
     * Get all sales with pagination
     */
    private function getAllSales() {
        try {
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, intval($_GET['limit'] ?? 1000)); // Get more records for client-side filtering
            $offset = ($page - 1) * $limit;

            // Check if tables exist and have data
            $testQuery = "SHOW TABLES LIKE 'sale'";
            $testStmt = $this->conn->prepare($testQuery);
            $testStmt->execute();
            if ($testStmt->rowCount() === 0) {
                $this->sendResponse([
                    'sales' => [],
                    'pagination' => [
                        'current_page' => 1,
                        'total_pages' => 1,
                        'total_records' => 0,
                        'records_per_page' => $limit
                    ]
                ]);
                return;
            }

            // Get total count
            $countQuery = "
                SELECT COUNT(DISTINCT s.sale_id) as total 
                FROM sale s 
                LEFT JOIN customer c ON s.customer_id = c.customer_id 
                LEFT JOIN user u ON s.user_id = u.user_id
            ";
            $countStmt = $this->conn->prepare($countQuery);
            $countStmt->execute();
            $totalRecords = $countStmt->fetch()['total'];

            // Get sales data
            $query = "
                SELECT 
                    s.sale_id,
                    s.sale_date,
                    s.sale_time,
                    s.total_amount,
                    COALESCE(c.full_name, 'Walk-in Customer') as customer_name,
                    c.customer_id,
                    u.user_name,
                    (SELECT COUNT(*) FROM sale_med_list sml WHERE sml.sale_id = s.sale_id) as total_medicines
                FROM sale s
                LEFT JOIN customer c ON s.customer_id = c.customer_id
                LEFT JOIN user u ON s.user_id = u.user_id
                ORDER BY s.sale_date DESC, s.sale_time DESC
                LIMIT :limit OFFSET :offset
            ";

            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $sales = $stmt->fetchAll();
            
            // Format the data
            $formattedSales = [];
            foreach ($sales as $sale) {
                $formattedSales[] = $this->formatSaleData($sale);
            }
            
            $this->sendResponse([
                'sales' => $formattedSales,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => ceil($totalRecords / $limit),
                    'total_records' => $totalRecords,
                    'records_per_page' => $limit
                ]
            ]);

        } catch (PDOException $e) {
            $this->sendError("Database error: " . $e->getMessage());
        } catch (Exception $e) {
            $this->sendError("Error: " . $e->getMessage());
        }
    }

    /**
     * Search sales
     */
    private function searchSales() {
        try {
            $searchTerm = trim($_GET['search'] ?? '');
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, intval($_GET['limit'] ?? 1000));
            $offset = ($page - 1) * $limit;

            if (empty($searchTerm)) {
                $this->getAllSales();
                return;
            }

            // Count query for search
            $countQuery = "
                SELECT COUNT(DISTINCT s.sale_id) as total 
                FROM sale s 
                LEFT JOIN customer c ON s.customer_id = c.customer_id 
                LEFT JOIN user u ON s.user_id = u.user_id
                WHERE 
                    CONCAT('SAL', LPAD(s.sale_id, 3, '0')) LIKE :search OR
                    COALESCE(c.full_name, 'Walk-in Customer') LIKE :search OR
                    u.user_name LIKE :search OR
                    s.total_amount LIKE :search
            ";
            
            $countStmt = $this->conn->prepare($countQuery);
            $searchParam = '%' . $searchTerm . '%';
            $countStmt->bindValue(':search', $searchParam);
            $countStmt->execute();
            $totalRecords = $countStmt->fetch()['total'];

            // Search query
            $query = "
                SELECT 
                    s.sale_id,
                    s.sale_date,
                    s.sale_time,
                    s.total_amount,
                    COALESCE(c.full_name, 'Walk-in Customer') as customer_name,
                    c.customer_id,
                    u.user_name,
                    (SELECT COUNT(*) FROM sale_med_list sml WHERE sml.sale_id = s.sale_id) as total_medicines
                FROM sale s
                LEFT JOIN customer c ON s.customer_id = c.customer_id
                LEFT JOIN user u ON s.user_id = u.user_id
                WHERE 
                    CONCAT('SAL', LPAD(s.sale_id, 3, '0')) LIKE :search OR
                    COALESCE(c.full_name, 'Walk-in Customer') LIKE :search OR
                    u.user_name LIKE :search OR
                    s.total_amount LIKE :search
                ORDER BY s.sale_date DESC, s.sale_time DESC
                LIMIT :limit OFFSET :offset
            ";

            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':search', $searchParam);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $sales = $stmt->fetchAll();
            $formattedSales = [];
            foreach ($sales as $sale) {
                $formattedSales[] = $this->formatSaleData($sale);
            }
            
            $this->sendResponse([
                'sales' => $formattedSales,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => ceil($totalRecords / $limit),
                    'total_records' => $totalRecords,
                    'records_per_page' => $limit
                ]
            ]);

        } catch (PDOException $e) {
            $this->sendError("Database error: " . $e->getMessage());
        } catch (Exception $e) {
            $this->sendError("Error: " . $e->getMessage());
        }
    }

    /**
     * Filter sales by user and date range
     */
    private function filterSales() {
        try {
            $userFilter = trim($_GET['user_filter'] ?? '');
            $startDate = trim($_GET['start_date'] ?? '');
            $endDate = trim($_GET['end_date'] ?? '');
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, intval($_GET['limit'] ?? 1000));
            $offset = ($page - 1) * $limit;

            $whereConditions = [];
            $params = [];

            // User filter
            if (!empty($userFilter)) {
                $whereConditions[] = "u.user_name = :user_filter";
                $params[':user_filter'] = $userFilter;
            }

            // Date range filter
            if (!empty($startDate)) {
                $whereConditions[] = "s.sale_date >= :start_date";
                $params[':start_date'] = $startDate;
            }
            if (!empty($endDate)) {
                $whereConditions[] = "s.sale_date <= :end_date";
                $params[':end_date'] = $endDate;
            }

            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

            // Count query
            $countQuery = "
                SELECT COUNT(DISTINCT s.sale_id) as total 
                FROM sale s 
                LEFT JOIN customer c ON s.customer_id = c.customer_id 
                LEFT JOIN user u ON s.user_id = u.user_id
                $whereClause
            ";
            
            $countStmt = $this->conn->prepare($countQuery);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $totalRecords = $countStmt->fetch()['total'];

            // Main query
            $query = "
                SELECT 
                    s.sale_id,
                    s.sale_date,
                    s.sale_time,
                    s.total_amount,
                    COALESCE(c.full_name, 'Walk-in Customer') as customer_name,
                    c.customer_id,
                    u.user_name,
                    (SELECT COUNT(*) FROM sale_med_list sml WHERE sml.sale_id = s.sale_id) as total_medicines
                FROM sale s
                LEFT JOIN customer c ON s.customer_id = c.customer_id
                LEFT JOIN user u ON s.user_id = u.user_id
                $whereClause
                ORDER BY s.sale_date DESC, s.sale_time DESC
                LIMIT :limit OFFSET :offset
            ";

            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $sales = $stmt->fetchAll();
            $formattedSales = [];
            foreach ($sales as $sale) {
                $formattedSales[] = $this->formatSaleData($sale);
            }
            
            $this->sendResponse([
                'sales' => $formattedSales,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => ceil($totalRecords / $limit),
                    'total_records' => $totalRecords,
                    'records_per_page' => $limit
                ]
            ]);

        } catch (PDOException $e) {
            $this->sendError("Database error: " . $e->getMessage());
        } catch (Exception $e) {
            $this->sendError("Error: " . $e->getMessage());
        }
    }

    /**
     * Get detailed information for a specific sale
     */
    private function getSaleDetails() {
        try {
            $saleId = intval($_GET['sale_id'] ?? 0);
            
            if ($saleId <= 0) {
                $this->sendError("Invalid sale ID");
                return;
            }

            $query = "
                SELECT 
                    s.*,
                    COALESCE(c.full_name, 'Walk-in Customer') as customer_name,
                    c.phone_number,
                    c.address,
                    u.user_name
                FROM sale s
                LEFT JOIN customer c ON s.customer_id = c.customer_id
                LEFT JOIN user u ON s.user_id = u.user_id
                WHERE s.sale_id = :sale_id
            ";

            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':sale_id', $saleId, PDO::PARAM_INT);
            $stmt->execute();
            
            $sale = $stmt->fetch();
            
            if (!$sale) {
                $this->sendError("Sale not found");
                return;
            }

            // Get medicines for this sale
            $medicineQuery = "
                SELECT 
                    m.medicine_name,
                    m.medicine_brand,
                    sml.quantity,
                    m.medicine_price
                FROM sale_med_list sml
                LEFT JOIN medicine m ON sml.med_id = m.medicine_id
                WHERE sml.sale_id = :sale_id
            ";

            $medicineStmt = $this->conn->prepare($medicineQuery);
            $medicineStmt->bindValue(':sale_id', $saleId, PDO::PARAM_INT);
            $medicineStmt->execute();
            $medicines = $medicineStmt->fetchAll();

            $saleDetails = [
                'sale_id' => $sale['sale_id'],
                'formatted_sale_id' => 'SAL' . str_pad($sale['sale_id'], 3, '0', STR_PAD_LEFT),
                'sale_date' => $sale['sale_date'],
                'sale_time' => $sale['sale_time'],
                'customer_name' => $sale['customer_name'],
                'customer_phone' => $sale['phone_number'] ?? '',
                'customer_address' => $sale['address'] ?? '',
                'user_name' => $sale['user_name'],
                'sub_total' => number_format($sale['sub_total'], 2),
                'discount' => $sale['discount'],
                'total_amount' => number_format($sale['total_amount'], 2),
                'amount_received' => number_format($sale['amount_recieved'], 2),
                'change_given' => number_format($sale['change_given'], 2),
                'payment_type' => ucfirst($sale['payment_type']),
                'medicines' => $medicines,
                'total_medicines' => count($medicines)
            ];
            
            $this->sendResponse(['sale' => $saleDetails]);

        } catch (PDOException $e) {
            $this->sendError("Database error: " . $e->getMessage());
        } catch (Exception $e) {
            $this->sendError("Error: " . $e->getMessage());
        }
    }

    /**
     * Format sale data for display
     */
    private function formatSaleData($sale) {
        return [
            'sale_id' => $sale['sale_id'],
            'formatted_sale_id' => 'SAL' . str_pad($sale['sale_id'], 3, '0', STR_PAD_LEFT),
            'sale_date' => $sale['sale_date'],
            'sale_time' => $sale['sale_time'],
            'customer_name' => $sale['customer_name'],
            'customer_id' => $sale['customer_id'] ?? '',
            'user_name' => $sale['user_name'] ?? 'Unknown',
            'total_medicines' => intval($sale['total_medicines']),
            'total_amount' => floatval($sale['total_amount']),
            'formatted_amount' => 'Rs. ' . number_format($sale['total_amount'], 2)
        ];
    }

    /**
     * Send successful response
     */
    private function sendResponse($data) {
        echo json_encode([
            'success' => true
        ] + $data);
    }

    /**
     * Send error response
     */
    private function sendError($message) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $message
        ]);
    }
}

// Initialize and handle request
try {
    $adminSales = new AdminSales();
    $adminSales->handleRequest();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Fatal error: ' . $e->getMessage()
    ]);
}
?>
