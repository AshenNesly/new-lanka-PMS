<?php
/**
 * Pharmacist Configurations Backend API
 * New Lanka Pharmacy Management System
 * 
 * Handles pharmacist profile management and settings
 */

// Prevent any output before JSON
ob_start();

// Include required files
require_once 'database.php';
require_once 'session.php';

// Clean any previous output
ob_clean();

// Set JSON header
header('Content-Type: application/json');

// Simple sanitize function
function sanitizeInput($data) {
    return trim(htmlspecialchars(strip_tags($data)));
}

try {
    // Get database connection first
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    // Check if user is logged in and is a pharmacist
    SessionManager::init();
    
    $currentUser = null;
    if (SessionManager::isLoggedIn()) {
        $currentUser = SessionManager::getCurrentUser();
        if ($currentUser['role'] !== 'pharmacist') {
            throw new Exception('Access denied. Pharmacist privileges required.');
        }
    } else {
        throw new Exception('User not authenticated. Please login to continue.');
    }
    
    // Handle different actions
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'get_pharmacist_profile':
            // Set default profile image if none exists
            if (empty($currentUser['profile_img'])) {
                $currentUser['profile_img'] = 'img/default-profile.png';
            }
            
            echo json_encode([
                'success' => true,
                'data' => $currentUser
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'update_pharmacist_profile':
            // Pharmacists are not allowed to update their profile information
            // Only profile picture updates are permitted through the upload_pharmacist_photo action
            throw new Exception('Profile information updates are not permitted for pharmacist users. Only profile picture updates are allowed.');
            break;
            
        case 'upload_pharmacist_photo':
            if (!isset($_FILES['profile_photo'])) {
                throw new Exception('No file uploaded');
            }
            
            $file = $_FILES['profile_photo'];
            
            // Validate file
            if ($file['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('File upload error');
            }
            
            // Check file type
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!in_array($file['type'], $allowedTypes)) {
                throw new Exception('Only JPEG, PNG, and GIF images are allowed');
            }
            
            // Check file size (max 5MB)
            if ($file['size'] > 5 * 1024 * 1024) {
                throw new Exception('File size must be less than 5MB');
            }
            
            // Create img directory if it doesn't exist (relative to document root)
            $uploadDir = '../img/';
            $webPath = 'img/'; // Path for web access
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            // Generate unique filename
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'pharmacist_profile_' . $currentUser['user_id'] . '_' . time() . '.' . $extension;
            $filepath = $uploadDir . $filename;
            $webFilePath = $webPath . $filename;
            
            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                throw new Exception('Failed to upload file');
            }
            
            // Update database
            $stmt = $db->prepare("UPDATE user SET profile_img = ? WHERE user_id = ?");
            $stmt->execute([$webFilePath, $currentUser['user_id']]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Profile photo updated successfully',
                'image_path' => $webFilePath
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'get_user_stats':
            // Get some basic stats for the pharmacist dashboard
            $stats = [];
            
            // Count total medicines (if tables exist)
            try {
                $stmt = $db->query("SELECT COUNT(*) as total FROM medicine");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $stats['total_medicines'] = $result['total'] ?? 0;
            } catch (Exception $e) {
                $stats['total_medicines'] = 0;
            }
            
            // Count sales today (if tables exist)
            try {
                $stmt = $db->prepare("SELECT COUNT(*) as total FROM sales WHERE DATE(sale_date) = CURDATE()");
                $stmt->execute();
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $stats['sales_today'] = $result['total'] ?? 0;
            } catch (Exception $e) {
                $stats['sales_today'] = 0;
            }
            
            // Get user info
            $stats['user_info'] = [
                'name' => $currentUser['user_name'],
                'role' => $currentUser['role'],
                'profile_img' => $currentUser['profile_img'] ?? 'img/default-profile.png'
            ];
            
            echo json_encode([
                'success' => true,
                'data' => $stats
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
            'method' => $_SERVER['REQUEST_METHOD'],
            'user_found' => isset($currentUser) ? 'yes' : 'no'
        ]
    ], JSON_PRETTY_PRINT);
}
?>
