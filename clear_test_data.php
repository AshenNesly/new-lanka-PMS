<?php
/**
 * Clear any test/sample data - keep only real production data
 */

require_once 'php/database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    echo "Clearing any test/sample data...\n\n";
    
    // Clear tables in correct order due to foreign key constraints
    $conn->exec("SET FOREIGN_KEY_CHECKS = 0");
    
    $conn->exec("DELETE FROM sale_med_list");
    echo "Cleared sale_med_list table\n";
    
    $conn->exec("DELETE FROM sale");
    echo "Cleared sale table\n";
    
    $conn->exec("DELETE FROM customer");
    echo "Cleared customer table\n";
    
    $conn->exec("DELETE FROM medicine");
    echo "Cleared medicine table\n";
    
    $conn->exec("DELETE FROM med_group");
    echo "Cleared med_group table\n";
    
    $conn->exec("DELETE FROM user");
    echo "Cleared user table\n";
    
    // Reset auto increment
    $conn->exec("ALTER TABLE sale AUTO_INCREMENT = 1");
    $conn->exec("ALTER TABLE customer AUTO_INCREMENT = 1");
    $conn->exec("ALTER TABLE medicine AUTO_INCREMENT = 1");
    $conn->exec("ALTER TABLE med_group AUTO_INCREMENT = 1");
    $conn->exec("ALTER TABLE user AUTO_INCREMENT = 1");
    $conn->exec("ALTER TABLE sale_med_list AUTO_INCREMENT = 1");
    
    $conn->exec("SET FOREIGN_KEY_CHECKS = 1");
    
    echo "\nAll tables cleared. Database now contains only real production data.\n";
    echo "Tables are ready for your actual business data entry.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
