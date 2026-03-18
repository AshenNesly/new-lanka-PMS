<?php
/**
 * Session Check API
 * New Lanka Pharmacy Management System
 * 
 * Provides session status and user information for AJAX requests
 */

require_once 'auth-middleware.php';

header('Content-Type: application/json');

try {
    $action = $_GET['action'] ?? 'check_session';
    
    switch ($action) {
        case 'check_session':
            if (AuthMiddleware::isLoggedIn()) {
                $currentUser = AuthMiddleware::getCurrentUser();
                echo json_encode([
                    'success' => true,
                    'logged_in' => true,
                    'user' => [
                        'user_id' => $currentUser['user_id'],
                        'username' => $currentUser['username'],
                        'role' => $currentUser['role'],
                        'status' => $currentUser['status']
                    ]
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'logged_in' => false,
                    'message' => 'User not logged in'
                ]);
            }
            break;
            
        case 'get_user_info':
            AuthMiddleware::requireAuth(null, false);
            
            if (!AuthMiddleware::isLoggedIn()) {
                throw new Exception('User not authenticated');
            }
            
            $currentUser = AuthMiddleware::getCurrentUser();
            
            // Get additional user data from database
            require_once 'database.php';
            $database = new Database();
            $db = $database->getConnection();
            
            $stmt = $db->prepare("SELECT user_id, user_name, role, profile_img, status FROM user WHERE user_id = ?");
            $stmt->execute([$currentUser['user_id']]);
            $userData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($userData) {
                // Set default profile image if none exists
                if (empty($userData['profile_img'])) {
                    $userData['profile_img'] = 'img/default-profile.png';
                }
                
                // Ensure we have both username and user_name for compatibility
                $userData['username'] = $userData['user_name'];
                
                echo json_encode([
                    'success' => true,
                    'user' => $userData
                ]);
            } else {
                throw new Exception('User data not found');
            }
            break;
            
        case 'check_page_access':
            $page = $_GET['page'] ?? '';
            
            if (empty($page)) {
                throw new Exception('Page parameter required');
            }
            
            $hasAccess = AuthMiddleware::isPageAllowed($page);
            $isLoggedIn = AuthMiddleware::isLoggedIn();
            
            echo json_encode([
                'success' => true,
                'has_access' => $hasAccess,
                'logged_in' => $isLoggedIn,
                'redirect_url' => $hasAccess ? null : ($isLoggedIn ? 'dashboard' : 'index.html')
            ]);
            break;
            
        default:
            throw new Exception('Invalid action specified');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
