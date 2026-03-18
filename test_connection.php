<?php
/**
 * Simple test to check database connection and data
 */

require_once 'php/database.php';

header('Content-Type: application/json');

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    // Test connection by getting table counts
    $stats = [];
    
    $stmt = $conn->query('SELECT COUNT(*) as count FROM sale');
    $stats['sales_count'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $conn->query('SELECT COUNT(*) as count FROM customer');
    $stats['customers_count'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $conn->query('SELECT COUNT(*) as count FROM medicine');
    $stats['medicines_count'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $conn->query('SELECT COUNT(*) as count FROM user');
    $stats['users_count'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Get sample sale data if exists
    $stmt = $conn->query('SELECT * FROM sale LIMIT 5');
    $sample_sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Database connection successful',
        'stats' => $stats,
        'sample_sales' => $sample_sales
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
