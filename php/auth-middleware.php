<?php
/**
 * Authentication Middleware
 * New Lanka Pharmacy Management System
 * 
 * This file should be included at the top of every protected page
 * to ensure proper authentication and role-based access control
 */

require_once 'session.php';
require_once 'auth.php';

class AuthMiddleware {
    
    /**
     * Check if user is authenticated and has proper role access
     * @param string|array $allowedRoles - Single role or array of allowed roles
     * @param bool $redirect - Whether to redirect or return boolean
     * @return bool|void
     */
    public static function requireAuth($allowedRoles = null, $redirect = true) {
        SessionManager::init();
        
        // Check if user is logged in
        if (!SessionManager::isLoggedIn()) {
            if ($redirect) {
                self::redirectToLogin('You must be logged in to access this page');
            }
            return false;
        }
        
        // Check role-based access if specified
        if ($allowedRoles !== null) {
            $userRole = SessionManager::get('role');
            $allowedRoles = is_array($allowedRoles) ? $allowedRoles : [$allowedRoles];
            
            if (!in_array($userRole, $allowedRoles)) {
                if ($redirect) {
                    self::redirectToUnauthorized('You do not have permission to access this page');
                }
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Require admin role
     * @param bool $redirect
     * @return bool|void
     */
    public static function requireAdmin($redirect = true) {
        return self::requireAuth('admin', $redirect);
    }
    
    /**
     * Require pharmacist role
     * @param bool $redirect
     * @return bool|void
     */
    public static function requirePharmacist($redirect = true) {
        return self::requireAuth('pharmacist', $redirect);
    }
    
    /**
     * Allow both admin and pharmacist roles
     * @param bool $redirect
     * @return bool|void
     */
    public static function requireAdminOrPharmacist($redirect = true) {
        return self::requireAuth(['admin', 'pharmacist'], $redirect);
    }
    
    /**
     * Check if current page is accessible for current user role
     * @param string $currentPage
     * @return bool
     */
    public static function isPageAllowed($currentPage) {
        $userRole = SessionManager::get('role');
        
        // Define page access rules
        $pageRules = [
            // Admin pages
            'admin-dashboard.html' => ['admin'],
            'admin-point-of-sales.html' => ['admin'],
            'admin-inventory.html' => ['admin'],
            'admin-sales.html' => ['admin'],
            'admin-reports.html' => ['admin'],
            'admin-customers.html' => ['admin'],
            'admin-configurations.html' => ['admin'],
            
            // Pharmacist pages
            'pharmacist-cashier.html' => ['pharmacist'],
            'pharmacist-inventory.html' => ['pharmacist'],
            'pharmacist-sales.html' => ['pharmacist'],
            'pharmacist-customers.html' => ['pharmacist'],
            'pharmacist-configurations.html' => ['pharmacist'],
            
            // Public pages
            'index.html' => ['guest'],
        ];
        
        $pageName = basename($currentPage);
        
        if (!isset($pageRules[$pageName])) {
            return true; // Allow access to undefined pages
        }
        
        $allowedRoles = $pageRules[$pageName];
        
        // If page allows guest access, allow it
        if (in_array('guest', $allowedRoles)) {
            return true;
        }
        
        // Check if user has required role
        return in_array($userRole, $allowedRoles);
    }
    
    /**
     * Redirect user to appropriate dashboard based on role
     */
    public static function redirectToDashboard() {
        $userRole = SessionManager::get('role');
        
        switch ($userRole) {
            case 'admin':
                header('Location: admin-dashboard.html');
                break;
            case 'pharmacist':
                header('Location: pharmacist-cashier.html');
                break;
            default:
                self::redirectToLogin('Invalid user role');
        }
        exit();
    }
    
    /**
     * Redirect to login page with message
     * @param string $message
     */
    private static function redirectToLogin($message = '') {
        SessionManager::setFlash('error', $message);
        header('Location: index.html');
        exit();
    }
    
    /**
     * Redirect to unauthorized page or dashboard
     * @param string $message
     */
    private static function redirectToUnauthorized($message = '') {
        SessionManager::setFlash('error', $message);
        self::redirectToDashboard();
    }
    
    /**
     * Get current authenticated user data
     * @return array|null
     */
    public static function getCurrentUser() {
        return SessionManager::getCurrentUser();
    }
    
    /**
     * Check if user is logged in (for AJAX requests)
     * @return bool
     */
    public static function isLoggedIn() {
        SessionManager::init();
        return SessionManager::isLoggedIn();
    }
    
    /**
     * Handle logout
     */
    public static function logout() {
        $auth = new Auth();
        $auth->logout();
        header('Location: index.html');
        exit();
    }
}

// Auto-protect pages based on current URL (only for HTML requests)
if (!isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
    isset($_SERVER['REQUEST_URI']) && 
    strpos($_SERVER['REQUEST_URI'], '.html') !== false) {
    
    $currentPage = basename($_SERVER['REQUEST_URI']);
    
    // Skip protection for login page
    if ($currentPage !== 'index.html') {
        // Check if user should have access to current page
        if (!AuthMiddleware::isPageAllowed($currentPage)) {
            // Redirect based on login status
            if (SessionManager::isLoggedIn()) {
                AuthMiddleware::redirectToDashboard();
            } else {
                AuthMiddleware::redirectToLogin('Please login to access this page');
            }
        }
        
        // If user is logged in but on wrong page type, redirect to correct dashboard
        if (SessionManager::isLoggedIn()) {
            $userRole = SessionManager::get('role');
            
            if ($userRole === 'admin' && strpos($currentPage, 'pharmacist-') === 0) {
                header('Location: admin-dashboard.html');
                exit();
            } elseif ($userRole === 'pharmacist' && strpos($currentPage, 'admin-') === 0) {
                header('Location: pharmacist-cashier.html');
                exit();
            }
        }
    }
}
?>
