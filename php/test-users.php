<?php
/**
 * Simple user check script for testing
 * New Lanka Pharmacy Management System
 */

require_once 'database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    echo "Database connection successful!\n\n";
    
    $stmt = $db->query("SELECT user_id, user_name, role, status FROM user LIMIT 10");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Users in database:\n";
    foreach ($users as $user) {
        echo "ID: {$user['user_id']}, Name: {$user['user_name']}, Role: {$user['role']}, Status: {$user['status']}\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
