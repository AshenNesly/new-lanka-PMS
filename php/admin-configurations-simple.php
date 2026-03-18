<?php
/**
 * Simple Admin Configurations API
 * Testing version without complex dependencies
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
    
    // For now, just find the admin user without session checks
    $stmt = $db->prepare("SELECT user_id, user_name, role, profile_img FROM user WHERE role = 'admin' LIMIT 1");
    $stmt->execute();
    $adminUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$adminUser) {
        throw new Exception('No admin user found in database');
    }
    
    $currentUser = $adminUser;
    
    // Handle different actions
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'get_admin_profile':
            // Set default profile image if none exists
            if (empty($currentUser['profile_img'])) {
                $currentUser['profile_img'] = 'img/default-profile.png';
            }
            
            echo json_encode([
                'success' => true,
                'data' => $currentUser
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'get_users':
            $stmt = $db->prepare("
                SELECT user_id, user_name, role, status, profile_img
                FROM user 
                WHERE role = 'pharmacist' 
                ORDER BY user_id DESC
            ");
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Set default profile image for users without one
            foreach ($users as &$user) {
                if (empty($user['profile_img'])) {
                    $user['profile_img'] = 'img/default-profile.png';
                }
            }
            
            echo json_encode([
                'success' => true,
                'data' => $users
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'upload_admin_photo':
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
            $filename = 'admin_profile_' . $currentUser['user_id'] . '_' . time() . '.' . $extension;
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
            
        case 'update_admin_profile':
            $user_name = sanitizeInput($_POST['user_name'] ?? '');
            $current_password = $_POST['current_password'] ?? '';
            $new_password = $_POST['new_password'] ?? '';
            
            if (empty($user_name)) {
                throw new Exception('Admin name is required');
            }
            
            if (!empty($new_password)) {
                // Verify current password if changing password
                if (empty($current_password)) {
                    throw new Exception('Current password is required when setting new password');
                }
                
                $stmt = $db->prepare("SELECT password FROM user WHERE user_id = ? AND role = 'admin'");
                $stmt->execute([$currentUser['user_id']]);
                $adminData = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$adminData || !password_verify($current_password, $adminData['password'])) {
                    throw new Exception('Current password is incorrect');
                }
                
                // Update with new password
                $hashedPassword = password_hash($new_password, PASSWORD_DEFAULT);
                $stmt = $db->prepare("UPDATE user SET user_name = ?, password = ? WHERE user_id = ? AND role = 'admin'");
                $stmt->execute([$user_name, $hashedPassword, $currentUser['user_id']]);
            } else {
                // Update only username
                $stmt = $db->prepare("UPDATE user SET user_name = ? WHERE user_id = ? AND role = 'admin'");
                $stmt->execute([$user_name, $currentUser['user_id']]);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Admin profile updated successfully'
            ], JSON_PRETTY_PRINT);
            break;

        case 'add_user':
            $user_name = sanitizeInput($_POST['user_name'] ?? '');
            $password = $_POST['password'] ?? '';
            $status = $_POST['status'] ?? 'active';
            
            if (empty($user_name) || empty($password)) {
                throw new Exception('Username and password are required');
            }
            
            // Check if username already exists
            $stmt = $db->prepare("SELECT user_id FROM user WHERE user_name = ?");
            $stmt->execute([$user_name]);
            if ($stmt->fetch()) {
                throw new Exception('Username already exists');
            }
            
            // Hash password and insert user
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $db->prepare("INSERT INTO user (user_name, password, role, status, profile_img) VALUES (?, ?, 'pharmacist', ?, 'img/default-profile.png')");
            $stmt->execute([$user_name, $hashedPassword, $status]);
            
            echo json_encode([
                'success' => true,
                'message' => 'User added successfully',
                'user_id' => $db->lastInsertId()
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'update_user':
            $user_id = $_POST['user_id'] ?? '';
            $user_name = sanitizeInput($_POST['user_name'] ?? '');
            $password = $_POST['password'] ?? '';
            $status = $_POST['status'] ?? 'active';
            
            if (empty($user_id) || empty($user_name)) {
                throw new Exception('User ID and username are required');
            }
            
            if (!empty($password)) {
                // Update with new password
                $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $db->prepare("UPDATE user SET user_name = ?, password = ?, status = ? WHERE user_id = ? AND role = 'pharmacist'");
                $stmt->execute([$user_name, $hashedPassword, $status, $user_id]);
            } else {
                // Update without changing password
                $stmt = $db->prepare("UPDATE user SET user_name = ?, status = ? WHERE user_id = ? AND role = 'pharmacist'");
                $stmt->execute([$user_name, $status, $user_id]);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'User updated successfully'
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'delete_user':
            $user_id = $_GET['user_id'] ?? '';
            
            if (empty($user_id)) {
                throw new Exception('User ID is required');
            }
            
            $stmt = $db->prepare("DELETE FROM user WHERE user_id = ? AND role = 'pharmacist'");
            $stmt->execute([$user_id]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception('User not found or cannot be deleted');
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'User deleted successfully'
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
            'admin_user_found' => isset($adminUser) ? 'yes' : 'no'
        ]
    ], JSON_PRETTY_PRINT);
}
?>
