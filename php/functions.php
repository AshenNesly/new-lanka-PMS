<?php
/**
 * Utility Functions
 * New Lanka Pharmacy Management System
 */

/**
 * Format price with currency
 * @param float $amount
 * @return string
 */
function formatPrice($amount) {
    return "Rs. " . number_format($amount, 2);
}

/**
 * Format date
 * @param string $date
 * @param string $format
 * @return string
 */
function formatDate($date, $format = 'Y-m-d') {
    return date($format, strtotime($date));
}

/**
 * Format datetime
 * @param string $datetime
 * @param string $format
 * @return string
 */
function formatDateTime($datetime, $format = 'Y-m-d H:i:s') {
    return date($format, strtotime($datetime));
}

/**
 * Generate unique ID with prefix
 * @param string $prefix
 * @return string
 */
function generateUniqueId($prefix = '') {
    return $prefix . date('YmdHis') . rand(1000, 9999);
}

/**
 * Sanitize input data
 * @param string $data
 * @return string
 */
function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

/**
 * Validate email
 * @param string $email
 * @return bool
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate phone number (Sri Lankan format)
 * @param string $phone
 * @return bool
 */
function isValidPhone($phone) {
    // Remove any spaces or dashes
    $phone = preg_replace('/[\s\-]/', '', $phone);
    // Check if it's 10 digits starting with 0
    return preg_match('/^0[0-9]{9}$/', $phone);
}

/**
 * Calculate age from date of birth
 * @param string $date_of_birth
 * @return int
 */
function calculateAge($date_of_birth) {
    $dob = new DateTime($date_of_birth);
    $now = new DateTime();
    return $now->diff($dob)->y;
}

/**
 * Get greeting based on time
 * @return string
 */
function getGreeting() {
    $hour = date('H');
    if ($hour < 12) {
        return 'Good Morning';
    } elseif ($hour < 17) {
        return 'Good Afternoon';
    } else {
        return 'Good Evening';
    }
}

/**
 * Generate pagination links
 * @param int $current_page
 * @param int $total_pages
 * @param string $base_url
 * @return array
 */
function generatePagination($current_page, $total_pages, $base_url) {
    $pagination = [];
    
    // Previous page
    if ($current_page > 1) {
        $pagination['prev'] = $base_url . '?page=' . ($current_page - 1);
    }
    
    // Page numbers
    $start = max(1, $current_page - 2);
    $end = min($total_pages, $current_page + 2);
    
    for ($i = $start; $i <= $end; $i++) {
        $pagination['pages'][] = [
            'number' => $i,
            'url' => $base_url . '?page=' . $i,
            'current' => $i == $current_page
        ];
    }
    
    // Next page
    if ($current_page < $total_pages) {
        $pagination['next'] = $base_url . '?page=' . ($current_page + 1);
    }
    
    return $pagination;
}

/**
 * Redirect with message
 * @param string $url
 * @param string $message
 * @param string $type
 */
function redirectWithMessage($url, $message = '', $type = 'info') {
    if (!empty($message)) {
        SessionManager::setFlash($type, $message);
    }
    header("Location: $url");
    exit();
}

/**
 * Send JSON response
 * @param array $data
 * @param int $status_code
 */
function sendJsonResponse($data, $status_code = 200) {
    http_response_code($status_code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

/**
 * Log application error
 * @param string $message
 * @param string $file
 * @param int $line
 */
function logError($message, $file = '', $line = 0) {
    $log_message = "Error: $message";
    if ($file) {
        $log_message .= " in $file";
    }
    if ($line) {
        $log_message .= " on line $line";
    }
    error_log($log_message);
}

/**
 * Check if request is AJAX
 * @return bool
 */
function isAjaxRequest() {
    return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
           strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest';
}

/**
 * Get client IP address
 * @return string
 */
function getClientIP() {
    $ip_keys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
    
    foreach ($ip_keys as $key) {
        if (array_key_exists($key, $_SERVER) === true) {
            foreach (explode(',', $_SERVER[$key]) as $ip) {
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                    return $ip;
                }
            }
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

/**
 * Generate CSRF token
 * @return string
 */
function generateCSRFToken() {
    if (!SessionManager::has('csrf_token')) {
        SessionManager::set('csrf_token', bin2hex(random_bytes(32)));
    }
    return SessionManager::get('csrf_token');
}

/**
 * Verify CSRF token
 * @param string $token
 * @return bool
 */
function verifyCSRFToken($token) {
    return hash_equals(SessionManager::get('csrf_token', ''), $token);
}
?>
