<?php
/**
 * Authentication Class
 * New Lanka Pharmacy Management System
 */

require_once 'database.php';
require_once 'session.php';

class Auth {
    private $db;

    public function __construct() {
        $this->db = getDatabaseConnection();
    }

    /**
     * Authenticate user login
     * @param string $username
     * @param string $password
     * @return array|false
     */
    public function login($username, $password) {
        try {
            $query = "SELECT user_id, user_name, password, role, status, profile_img 
                     FROM user 
                     WHERE user_name = ? AND status = 'active'";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$username]);
            
            if ($stmt->rowCount() == 1) {
                $user = $stmt->fetch();
                
                // Verify password (supports both hashed and plain text for development)
                if ($this->verifyPassword($password, $user['password'])) {
                    // Set session
                    SessionManager::setUserLogin($user);
                    SessionManager::regenerateId();
                    
                    // Log successful login
                    $this->logActivity($user['user_id'], 'login', 'User logged in successfully');
                    
                    return [
                        'success' => true,
                        'user' => $user,
                        'redirect' => $this->getRedirectUrl($user['role'])
                    ];
                } else {
                    return [
                        'success' => false,
                        'message' => 'Invalid username or password'
                    ];
                }
            } else {
                return [
                    'success' => false,
                    'message' => 'Invalid username or password'
                ];
            }
        } catch(PDOException $e) {
            error_log("Login error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Login failed. Please try again.'
            ];
        }
    }

    /**
     * Logout user
     * @return bool
     */
    public function logout() {
        $user = SessionManager::getCurrentUser();
        if ($user) {
            $this->logActivity($user['user_id'], 'logout', 'User logged out');
        }
        
        SessionManager::logout();
        return true;
    }

    /**
     * Verify password
     * @param string $password
     * @param string $hash
     * @return bool
     */
    private function verifyPassword($password, $hash) {
        // Check if password is hashed
        if (password_get_info($hash)['algo']) {
            return password_verify($password, $hash);
        }
        // For plain text passwords (development only)
        return $password === $hash;
    }

    /**
     * Hash password
     * @param string $password
     * @return string
     */
    public function hashPassword($password) {
        return password_hash($password, PASSWORD_DEFAULT);
    }

    /**
     * Get redirect URL based on user role
     * @param string $role
     * @return string
     */
    private function getRedirectUrl($role) {
        switch ($role) {
            case 'admin':
                return 'admin-dashboard.html';
            case 'pharmacist':
                return 'pharmacist-cashier.html';
            default:
                return 'index.html';
        }
    }

    /**
     * Check if user is authenticated
     * @return bool
     */
    public function isAuthenticated() {
        return SessionManager::isLoggedIn();
    }

    /**
     * Require authentication (redirect if not logged in)
     * @param string $redirect_url
     */
    public function requireAuth($redirect_url = '../index.html') {
        if (!$this->isAuthenticated()) {
            header("Location: $redirect_url");
            exit();
        }
    }

    /**
     * Require admin role
     * @param string $redirect_url
     */
    public function requireAdmin($redirect_url = '../index.html') {
        $this->requireAuth($redirect_url);
        if (!SessionManager::isAdmin()) {
            header("Location: $redirect_url");
            exit();
        }
    }

    /**
     * Require pharmacist role
     * @param string $redirect_url
     */
    public function requirePharmacist($redirect_url = '../index.html') {
        $this->requireAuth($redirect_url);
        if (!SessionManager::isPharmacist()) {
            header("Location: $redirect_url");
            exit();
        }
    }

    /**
     * Check if user has specific permission
     * @param string $permission
     * @return bool
     */
    public function hasPermission($permission) {
        $user = SessionManager::getCurrentUser();
        if (!$user) return false;

        $permissions = [
            'admin' => [
                'manage_users', 'manage_customers', 'manage_inventory', 
                'manage_sales', 'view_reports', 'manage_config'
            ],
            'pharmacist' => [
                'manage_customers', 'manage_inventory', 'process_sales', 'view_basic_reports'
            ]
        ];

        return in_array($permission, $permissions[$user['role']] ?? []);
    }

    /**
     * Get user by ID
     * @param int $user_id
     * @return array|null
     */
    public function getUserById($user_id) {
        try {
            $query = "SELECT user_id, user_name, role, status, profile_img 
                     FROM user 
                     WHERE user_id = ?";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$user_id]);
            
            return $stmt->fetch() ?: null;
        } catch(PDOException $e) {
            error_log("Get user error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Update user password
     * @param int $user_id
     * @param string $new_password
     * @return bool
     */
    public function updatePassword($user_id, $new_password) {
        try {
            $hashed_password = $this->hashPassword($new_password);
            
            $query = "UPDATE user SET password = ? WHERE user_id = ?";
            $stmt = $this->db->prepare($query);
            $result = $stmt->execute([$hashed_password, $user_id]);
            
            if ($result) {
                $this->logActivity($user_id, 'password_change', 'Password updated');
            }
            
            return $result;
        } catch(PDOException $e) {
            error_log("Update password error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Log user activity
     * @param int $user_id
     * @param string $action
     * @param string $description
     */
    private function logActivity($user_id, $action, $description) {
        try {
            // This assumes you might want to add an activity log table later
            // For now, just log to PHP error log
            error_log("User Activity - User ID: $user_id, Action: $action, Description: $description");
        } catch(Exception $e) {
            error_log("Activity log error: " . $e->getMessage());
        }
    }

    /**
     * Validate session and refresh if needed
     * @return bool
     */
    public function validateSession() {
        if (!$this->isAuthenticated()) {
            return false;
        }

        $user = SessionManager::getCurrentUser();
        $dbUser = $this->getUserById($user['user_id']);
        
        // Check if user still exists and is active
        if (!$dbUser || $dbUser['status'] !== 'active') {
            $this->logout();
            return false;
        }

        return true;
    }
}

/**
 * Get authentication instance
 * @return Auth
 */
function getAuth() {
    return new Auth();
}
?>
