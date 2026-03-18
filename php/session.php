<?php
/**
 * Session Management Class
 * New Lanka Pharmacy Management System
 */

class SessionManager {
    
    /**
     * Initialize session
     */
    public static function init() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    /**
     * Set session data
     * @param string $key
     * @param mixed $value
     */
    public static function set($key, $value) {
        self::init();
        $_SESSION[$key] = $value;
    }

    /**
     * Get session data
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function get($key, $default = null) {
        self::init();
        return isset($_SESSION[$key]) ? $_SESSION[$key] : $default;
    }

    /**
     * Check if session key exists
     * @param string $key
     * @return bool
     */
    public static function has($key) {
        self::init();
        return isset($_SESSION[$key]);
    }

    /**
     * Remove session key
     * @param string $key
     */
    public static function remove($key) {
        self::init();
        if (isset($_SESSION[$key])) {
            unset($_SESSION[$key]);
        }
    }

    /**
     * Clear all session data
     */
    public static function clear() {
        self::init();
        session_unset();
    }

    /**
     * Destroy session
     */
    public static function destroy() {
        self::init();
        session_destroy();
    }

    /**
     * Check if user is logged in
     * @return bool
     */
    public static function isLoggedIn() {
        return self::has('user_id') && self::has('role');
    }

    /**
     * Check if current user is admin
     * @return bool
     */
    public static function isAdmin() {
        return self::get('role') === 'admin';
    }

    /**
     * Check if current user is pharmacist
     * @return bool
     */
    public static function isPharmacist() {
        return self::get('role') === 'pharmacist';
    }

    /**
     * Get current user information
     * @return array|null
     */
    public static function getCurrentUser() {
        if (self::isLoggedIn()) {
            return [
                'user_id' => self::get('user_id'),
                'username' => self::get('username'),
                'role' => self::get('role'),
                'status' => self::get('status', 'active')
            ];
        }
        return null;
    }

    /**
     * Set user login session
     * @param array $user
     */
    public static function setUserLogin($user) {
        self::set('user_id', $user['user_id']);
        self::set('username', $user['user_name']);
        self::set('role', $user['role']);
        self::set('status', $user['status']);
        self::set('login_time', time());
    }

    /**
     * Logout user
     */
    public static function logout() {
        self::clear();
        self::destroy();
    }

    /**
     * Regenerate session ID for security
     */
    public static function regenerateId() {
        self::init();
        session_regenerate_id(true);
    }

    /**
     * Set flash message
     * @param string $type (success, error, warning, info)
     * @param string $message
     */
    public static function setFlash($type, $message) {
        self::set('flash_' . $type, $message);
    }

    /**
     * Get and remove flash message
     * @param string $type
     * @return string|null
     */
    public static function getFlash($type) {
        $message = self::get('flash_' . $type);
        if ($message) {
            self::remove('flash_' . $type);
        }
        return $message;
    }

    /**
     * Get all flash messages and clear them
     * @return array
     */
    public static function getAllFlashes() {
        $flashes = [];
        $types = ['success', 'error', 'warning', 'info'];
        
        foreach ($types as $type) {
            $message = self::getFlash($type);
            if ($message) {
                $flashes[$type] = $message;
            }
        }
        
        return $flashes;
    }
}
?>
