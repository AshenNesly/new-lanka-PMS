<?php
/**
 * Login Handler
 * New Lanka Pharmacy Management System
 */

require_once 'auth.php';

// Enable error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get POST data
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    // Validate input
    if (empty($username) || empty($password)) {
        echo json_encode([
            'success' => false, 
            'message' => 'Please fill in all fields'
        ]);
        exit();
    }

    // Attempt login
    $auth = getAuth();
    $result = $auth->login($username, $password);

    if ($result['success']) {
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'redirect' => $result['redirect'],
            'user' => [
                'username' => $result['user']['user_name'],
                'role' => $result['user']['role']
            ]
        ]);
    } else {
        echo json_encode($result);
    }

} catch (Exception $e) {
    error_log("Login handler error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred during login. Please try again.'
    ]);
}
?>
