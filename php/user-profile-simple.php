<?php
/**
 * Simple User Profile API
 * Testing version without complex session dependencies
 */

// Prevent any HTML output
ob_start();

// Include required files
require_once 'database.php';

// Clean any previous output
ob_clean();

// Set JSON header
header('Content-Type: application/json');

try {
    // Get database connection
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    // Handle different actions
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'get_current_user':
            // For development: just return the admin user
            $stmt = $db->prepare("SELECT user_id, user_name, role, profile_img FROM user WHERE role = 'admin' LIMIT 1");
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                throw new Exception('No admin user found');
            }
            
            // Set default profile image if none exists
            if (empty($user['profile_img'])) {
                $user['profile_img'] = 'img/default-profile.png';
            }
            
            echo json_encode([
                'success' => true,
                'data' => $user
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'logout':
            // Simple logout response
            echo json_encode([
                'success' => true,
                'message' => 'Logged out successfully'
            ], JSON_PRETTY_PRINT);
            break;
            
        default:
            throw new Exception('Invalid action specified: ' . $action);
    }
    
} catch (Exception $e) {
    // Return error response
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'action' => $_GET['action'] ?? $_POST['action'] ?? 'none',
            'method' => $_SERVER['REQUEST_METHOD']
        ]
    ], JSON_PRETTY_PRINT);
}
?>
