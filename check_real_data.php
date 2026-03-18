<?php
/**
 * Check actual database contents - no sample data
 */

require_once 'php/database.php';

header('Content-Type: application/json');

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    // Get actual table contents
    echo "=== ACTUAL DATABASE CONTENTS ===\n\n";
    
    // Check sales table
    $stmt = $conn->query('SELECT COUNT(*) as count FROM sale');
    $salesCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "Sales records: $salesCount\n";
    
    if ($salesCount > 0) {
        $stmt = $conn->query('SELECT sale_id, sale_date, sale_time, total_amount FROM sale ORDER BY sale_date DESC, sale_time DESC LIMIT 5');
        $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "Recent sales:\n";
        foreach ($sales as $sale) {
            echo "- Sale #{$sale['sale_id']}: {$sale['sale_date']} {$sale['sale_time']} - Rs.{$sale['total_amount']}\n";
        }
    }
    
    // Check customers table
    $stmt = $conn->query('SELECT COUNT(*) as count FROM customer');
    $customerCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "\nCustomers: $customerCount\n";
    
    // Check medicines table
    $stmt = $conn->query('SELECT COUNT(*) as count FROM medicine');
    $medicineCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "Medicines: $medicineCount\n";
    
    // Check users table
    $stmt = $conn->query('SELECT COUNT(*) as count FROM user');
    $userCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "Users: $userCount\n";
    
    echo "\n=== END DATABASE CHECK ===\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
