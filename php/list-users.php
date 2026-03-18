<?php
/**
 * Database User Check
 * Lists all users in the system for testing
 */

header('Content-Type: application/json');

try {
    require_once 'database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    // Get all users
    $stmt = $db->prepare("SELECT user_id, user_name, role, status FROM user ORDER BY user_id");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'users' => $users,
        'count' => count($users)
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
