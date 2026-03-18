<?php
/**
 * Check user passwords for testing
 */

require_once 'database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $stmt = $db->query("SELECT user_id, user_name, password, role FROM user LIMIT 5");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "User passwords:\n";
    foreach ($users as $user) {
        echo "User: {$user['user_name']}, Role: {$user['role']}\n";
        echo "Password length: " . strlen($user['password']) . "\n";
        echo "First 20 chars: " . substr($user['password'], 0, 20) . "\n\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
