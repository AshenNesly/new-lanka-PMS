<?php
/**
 * Admin Medicine Groups Backend API
 * New Lanka Pharmacy Management System
 */

// Disable authentication for testing - ENABLE THIS IN PRODUCTION
// session_start();
// if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'admin') {
//     http_response_code(401);
//     echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
//     exit;
// }

require_once 'database.php';
// require_once 'functions.php'; // Not needed for this module

// Set content type to JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
 
try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    // Get action from different sources
    $action = '';
    $debugInfo = [];
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $action = $_GET['action'] ?? '';
        $debugInfo['source'] = 'GET';
    } else {
        // For POST/PUT requests, try to get from JSON body first
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        $debugInfo['raw_input'] = $rawInput;
        $debugInfo['parsed_input'] = $input;
        $debugInfo['post_data'] = $_POST;
        
        if ($input && isset($input['action'])) {
            $action = $input['action'];
            $debugInfo['source'] = 'JSON';
        } else {
            $action = $_POST['action'] ?? '';
            $debugInfo['source'] = 'POST';
        }
    }
    
    $debugInfo['final_action'] = $action;
    $debugInfo['method'] = $_SERVER['REQUEST_METHOD'];
    
    switch ($action) {
        case 'get_groups':
            handleGetGroups($conn);
            break;
            
        case 'add_group':
            handleAddGroup($conn);
            break;
            
        case 'update_group':
            handleUpdateGroup($conn);
            break;
            
        case 'delete_group':
            handleDeleteGroup($conn);
            break;
            
        case 'search_groups':
            handleSearchGroups($conn);
            break;
            
        case 'get_group_statistics':
            handleGetGroupStatistics($conn);
            break;
            
        default:
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'message' => 'Invalid action specified. Received: ' . $action,
                'debug' => $debugInfo
            ]);
            break;
    }
    
} catch (Exception $e) {
    error_log('Admin Med Groups API Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Internal server error']);
}

/**
 * Get all medicine groups with statistics
 */
function handleGetGroups($conn) {
    try {
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(100, intval($_GET['limit']))) : 10;
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM med_group";
        $countStmt = $conn->prepare($countQuery);
        $countStmt->execute();
        $totalGroups = $countStmt->fetch()['total'];
        
        // Get groups with medicine statistics
        $query = "
            SELECT 
                mg.med_group_id,
                mg.med_group_name,
                mg.description,
                COUNT(m.medicine_id) as medicine_count,
                COALESCE(SUM(m.stock_left), 0) as total_stock,
                CASE 
                    WHEN COALESCE(SUM(m.stock_left), 0) = 0 THEN 'out_of_stock'
                    WHEN COALESCE(SUM(m.stock_left), 0) < 100 THEN 'low_stock'
                    ELSE 'good'
                END as stock_status,
                CASE 
                    WHEN COALESCE(SUM(m.stock_left), 0) = 0 THEN 'Out of Stock'
                    WHEN COALESCE(SUM(m.stock_left), 0) < 100 THEN 'Low Stock'
                    ELSE 'Active'
                END as status_text
            FROM med_group mg
            LEFT JOIN medicine m ON mg.med_group_id = m.med_group_id
            GROUP BY mg.med_group_id, mg.med_group_name, mg.description
            ORDER BY mg.med_group_name ASC
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $groups = $stmt->fetchAll();
        
        // Format the groups data
        $formattedGroups = array_map(function($group) {
            return [
                'med_group_id' => $group['med_group_id'],
                'group_id' => 'GRP' . str_pad($group['med_group_id'], 3, '0', STR_PAD_LEFT),
                'med_group_name' => $group['med_group_name'],
                'description' => $group['description'] ?: 'No description available',
                'medicine_count' => intval($group['medicine_count']),
                'total_stock' => intval($group['total_stock']),
                'stock_status' => $group['stock_status'],
                'status_text' => $group['status_text'],
                'formatted_stock' => number_format($group['total_stock'])
            ];
        }, $groups);
        
        $totalPages = ceil($totalGroups / $limit);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'groups' => $formattedGroups,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_groups' => intval($totalGroups),
                    'limit' => $limit,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1
                ]
            ]
        ]);
        
    } catch (Exception $e) {
        error_log('Get Groups Error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to fetch medicine groups']);
    }
}

/**
 * Add new medicine group
 */
function handleAddGroup($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            $input = $_POST;
        }
        
        $groupName = trim($input['group_name'] ?? '');
        $description = trim($input['description'] ?? '');
        $status = $input['status'] ?? 'active';
        
        // Validation
        if (empty($groupName)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Group name is required']);
            return;
        }
        
        if (strlen($groupName) > 50) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Group name must be 50 characters or less']);
            return;
        }
        
        if (strlen($description) > 100) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Description must be 100 characters or less']);
            return;
        }
        
        // Check if group name already exists
        $checkQuery = "SELECT med_group_id FROM med_group WHERE med_group_name = :group_name";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bindParam(':group_name', $groupName);
        $checkStmt->execute();
        
        if ($checkStmt->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'A group with this name already exists']);
            return;
        }
        
        // Insert new group
        $insertQuery = "
            INSERT INTO med_group (med_group_name, description) 
            VALUES (:group_name, :description)
        ";
        
        $insertStmt = $conn->prepare($insertQuery);
        $insertStmt->bindParam(':group_name', $groupName);
        $insertStmt->bindParam(':description', $description);
        
        if ($insertStmt->execute()) {
            $newGroupId = $conn->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'message' => 'Medicine group added successfully',
                'data' => [
                    'med_group_id' => $newGroupId,
                    'group_id' => 'GRP' . str_pad($newGroupId, 3, '0', STR_PAD_LEFT),
                    'group_name' => $groupName,
                    'description' => $description
                ]
            ]);
        } else {
            throw new Exception('Failed to insert medicine group');
        }
        
    } catch (Exception $e) {
        error_log('Add Group Error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to add medicine group']);
    }
}

/**
 * Update medicine group
 */
function handleUpdateGroup($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            $input = $_POST;
        }
        
        $groupId = intval($input['med_group_id'] ?? 0);
        $groupName = trim($input['group_name'] ?? '');
        $description = trim($input['description'] ?? '');
        
        // Validation
        if ($groupId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Valid group ID is required']);
            return;
        }
        
        if (empty($groupName)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Group name is required']);
            return;
        }
        
        // Check if group exists
        $checkQuery = "SELECT med_group_id FROM med_group WHERE med_group_id = :group_id";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bindParam(':group_id', $groupId, PDO::PARAM_INT);
        $checkStmt->execute();
        
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Medicine group not found']);
            return;
        }
        
        // Check if name already exists for different group
        $nameCheckQuery = "SELECT med_group_id FROM med_group WHERE med_group_name = :group_name AND med_group_id != :group_id";
        $nameCheckStmt = $conn->prepare($nameCheckQuery);
        $nameCheckStmt->bindParam(':group_name', $groupName);
        $nameCheckStmt->bindParam(':group_id', $groupId, PDO::PARAM_INT);
        $nameCheckStmt->execute();
        
        if ($nameCheckStmt->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'A group with this name already exists']);
            return;
        }
        
        // Update group
        $updateQuery = "
            UPDATE med_group 
            SET med_group_name = :group_name, description = :description 
            WHERE med_group_id = :group_id
        ";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bindParam(':group_name', $groupName);
        $updateStmt->bindParam(':description', $description);
        $updateStmt->bindParam(':group_id', $groupId, PDO::PARAM_INT);
        
        if ($updateStmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Medicine group updated successfully',
                'data' => [
                    'med_group_id' => $groupId,
                    'group_name' => $groupName,
                    'description' => $description
                ]
            ]);
        } else {
            throw new Exception('Failed to update medicine group');
        }
        
    } catch (Exception $e) {
        error_log('Update Group Error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update medicine group']);
    }
}

/**
 * Delete medicine group
 */
function handleDeleteGroup($conn) {
    try {
        $groupId = intval($_GET['med_group_id'] ?? $_POST['med_group_id'] ?? 0);
        
        if ($groupId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Valid group ID is required']);
            return;
        }
        
        // Check if group exists
        $checkQuery = "SELECT med_group_name FROM med_group WHERE med_group_id = :group_id";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bindParam(':group_id', $groupId, PDO::PARAM_INT);
        $checkStmt->execute();
        $group = $checkStmt->fetch();
        
        if (!$group) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Medicine group not found']);
            return;
        }
        
        // Check if group has medicines
        $medicineCheckQuery = "SELECT COUNT(*) as medicine_count FROM medicine WHERE med_group_id = :group_id";
        $medicineCheckStmt = $conn->prepare($medicineCheckQuery);
        $medicineCheckStmt->bindParam(':group_id', $groupId, PDO::PARAM_INT);
        $medicineCheckStmt->execute();
        $medicineCount = $medicineCheckStmt->fetch()['medicine_count'];
        
        if ($medicineCount > 0) {
            http_response_code(409);
            echo json_encode([
                'success' => false, 
                'message' => "Cannot delete this group. It contains {$medicineCount} medicine(s). Please reassign or remove the medicines first."
            ]);
            return;
        }
        
        // Delete group
        $deleteQuery = "DELETE FROM med_group WHERE med_group_id = :group_id";
        $deleteStmt = $conn->prepare($deleteQuery);
        $deleteStmt->bindParam(':group_id', $groupId, PDO::PARAM_INT);
        
        if ($deleteStmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => "Medicine group '{$group['med_group_name']}' deleted successfully"
            ]);
        } else {
            throw new Exception('Failed to delete medicine group');
        }
        
    } catch (Exception $e) {
        error_log('Delete Group Error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete medicine group']);
    }
}

/**
 * Search medicine groups
 */
function handleSearchGroups($conn) {
    try {
        $searchTerm = trim($_GET['search'] ?? '');
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(100, intval($_GET['limit']))) : 10;
        $offset = ($page - 1) * $limit;
        
        if (empty($searchTerm)) {
            handleGetGroups($conn);
            return;
        }
        
        $searchPattern = "%{$searchTerm}%";
        
        // Get total count for search
        $countQuery = "
            SELECT COUNT(*) as total FROM med_group 
            WHERE med_group_name LIKE ? 
            OR description LIKE ?
        ";
        $countStmt = $conn->prepare($countQuery);
        $countStmt->execute([$searchPattern, $searchPattern]);
        $totalGroups = $countStmt->fetch()['total'];
        
        // Search groups with statistics
        $query = "
            SELECT 
                mg.med_group_id,
                mg.med_group_name,
                mg.description,
                COUNT(m.medicine_id) as medicine_count,
                COALESCE(SUM(m.stock_left), 0) as total_stock,
                CASE 
                    WHEN COALESCE(SUM(m.stock_left), 0) = 0 THEN 'out_of_stock'
                    WHEN COALESCE(SUM(m.stock_left), 0) < 100 THEN 'low_stock'
                    ELSE 'good'
                END as stock_status,
                CASE 
                    WHEN COALESCE(SUM(m.stock_left), 0) = 0 THEN 'Out of Stock'
                    WHEN COALESCE(SUM(m.stock_left), 0) < 100 THEN 'Low Stock'
                    ELSE 'Active'
                END as status_text
            FROM med_group mg
            LEFT JOIN medicine m ON mg.med_group_id = m.med_group_id
            WHERE mg.med_group_name LIKE ? 
            OR mg.description LIKE ?
            GROUP BY mg.med_group_id, mg.med_group_name, mg.description
            ORDER BY mg.med_group_name ASC
            LIMIT ? OFFSET ?
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([$searchPattern, $searchPattern, $limit, $offset]);
        
        $groups = $stmt->fetchAll();
        
        // Format the groups data
        $formattedGroups = array_map(function($group) {
            return [
                'med_group_id' => $group['med_group_id'],
                'group_id' => 'GRP' . str_pad($group['med_group_id'], 3, '0', STR_PAD_LEFT),
                'med_group_name' => $group['med_group_name'],
                'description' => $group['description'] ?: 'No description available',
                'medicine_count' => intval($group['medicine_count']),
                'total_stock' => intval($group['total_stock']),
                'stock_status' => $group['stock_status'],
                'status_text' => $group['status_text'],
                'formatted_stock' => number_format($group['total_stock'])
            ];
        }, $groups);
        
        $totalPages = ceil($totalGroups / $limit);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'groups' => $formattedGroups,
                'search_term' => $searchTerm,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_groups' => intval($totalGroups),
                    'limit' => $limit,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1
                ]
            ]
        ]);
        
    } catch (Exception $e) {
        error_log('Search Groups Error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Failed to search medicine groups',
            'error' => $e->getMessage(),
            'line' => $e->getLine(),
            'file' => $e->getFile()
        ]);
    }
}

/**
 * Get medicine group statistics
 */
function handleGetGroupStatistics($conn) {
    try {
        // Get overall statistics - simplified queries
        $statsQuery = "
            SELECT 
                COUNT(*) as total_groups
            FROM med_group
        ";
        
        $statsStmt = $conn->prepare($statsQuery);
        $statsStmt->execute();
        $groupStats = $statsStmt->fetch();
        
        // Get medicine statistics
        $medicineStatsQuery = "
            SELECT 
                COUNT(*) as total_medicines,
                COALESCE(SUM(stock_left), 0) as total_stock
            FROM medicine
        ";
        
        $medicineStatsStmt = $conn->prepare($medicineStatsQuery);
        $medicineStatsStmt->execute();
        $medicineStats = $medicineStatsStmt->fetch();
        
        // Get group stock status counts
        $stockStatusQuery = "
            SELECT 
                mg.med_group_id,
                mg.med_group_name,
                COALESCE(SUM(m.stock_left), 0) as group_stock
            FROM med_group mg
            LEFT JOIN medicine m ON mg.med_group_id = m.med_group_id
            GROUP BY mg.med_group_id, mg.med_group_name
        ";
        
        $stockStatusStmt = $conn->prepare($stockStatusQuery);
        $stockStatusStmt->execute();
        $groupStockData = $stockStatusStmt->fetchAll();
        
        $outOfStockGroups = 0;
        $lowStockGroups = 0;
        
        foreach ($groupStockData as $group) {
            if ($group['group_stock'] == 0) {
                $outOfStockGroups++;
            } elseif ($group['group_stock'] < 100) {
                $lowStockGroups++;
            }
        }
        
        // Calculate average medicines per group
        $avgMedicinesPerGroup = $groupStats['total_groups'] > 0 ? 
            round($medicineStats['total_medicines'] / $groupStats['total_groups'], 1) : 0;
        
        // Get top groups by medicine count
        $topGroupsQuery = "
            SELECT 
                mg.med_group_name,
                COUNT(m.medicine_id) as medicine_count,
                COALESCE(SUM(m.stock_left), 0) as total_stock
            FROM med_group mg
            LEFT JOIN medicine m ON mg.med_group_id = m.med_group_id
            GROUP BY mg.med_group_id, mg.med_group_name
            ORDER BY medicine_count DESC
            LIMIT 5
        ";
        
        $topGroupsStmt = $conn->prepare($topGroupsQuery);
        $topGroupsStmt->execute();
        $topGroups = $topGroupsStmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'data' => [
                'overview' => [
                    'total_groups' => intval($groupStats['total_groups']),
                    'total_medicines' => intval($medicineStats['total_medicines']),
                    'total_stock' => intval($medicineStats['total_stock']),
                    'out_of_stock_groups' => $outOfStockGroups,
                    'low_stock_groups' => $lowStockGroups,
                    'avg_medicines_per_group' => $avgMedicinesPerGroup,
                    'formatted_total_stock' => number_format($medicineStats['total_stock'])
                ],
                'top_groups' => array_map(function($group) {
                    return [
                        'group_name' => $group['med_group_name'],
                        'medicine_count' => intval($group['medicine_count']),
                        'total_stock' => intval($group['total_stock']),
                        'formatted_stock' => number_format($group['total_stock'])
                    ];
                }, $topGroups)
            ]
        ]);
        
    } catch (Exception $e) {
        error_log('Get Group Statistics Error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Failed to fetch group statistics',
            'error' => $e->getMessage()
        ]);
    }
}

?>
