<?php
/**
 * Simple Session Test
 * Debug session and database issues
 */

// Prevent any HTML output
ob_start();
ob_clean();

// Set JSON header first
header('Content-Type: application/json');

try {
    // Include files
    require_once 'database.php';
    require_once 'session.php';

    // Start session
    SessionManager::init();
    
    // Check if user is logged in
    $isLoggedIn = SessionManager::isLoggedIn();
    
    if ($isLoggedIn) {
        $currentUser = SessionManager::getCurrentUser();
        
        // Get database connection
        $database = new Database();
        $db = $database->getConnection();
        
        if ($db) {
            // Get user from database
            $stmt = $db->prepare("SELECT user_id, user_name, role, status, profile_img FROM user WHERE user_id = ?");
            $stmt->execute([$currentUser['user_id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                // Set default profile image if none exists
                if (empty($user['profile_img'])) {
                    $user['profile_img'] = 'img/default-profile.png';
                }
                
                echo json_encode([
                    'success' => true,
                    'session_data' => $currentUser,
                    'database_data' => $user,
                    'message' => 'User is logged in and found in database'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'session_data' => $currentUser,
                    'error' => 'User found in session but not in database'
                ]);
            }
        } else {
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed'
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'User not logged in',
            'session_status' => session_status(),
            'session_id' => session_id()
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Exception: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>
