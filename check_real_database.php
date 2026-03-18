<?php
/**
 * Check what's actually in the real database
 */

require_once 'php/database.php';

header('Content-Type: text/plain; charset=utf-8');

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    if (!$conn) {
        echo "❌ Database connection failed\n";
        exit;
    }
    
    echo "✅ Connected to database: newlankapms\n\n";
    
    // Check all tables for data
    $tables = ['sale', 'customer', 'user', 'medicine', 'med_group', 'sale_med_list'];
    
    echo "=== TABLE COUNTS ===\n";
    foreach ($tables as $table) {
        try {
            $stmt = $conn->query("SELECT COUNT(*) as count FROM $table");
            $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            echo sprintf("%-15s: %d records\n", $table, $count);
        } catch (Exception $e) {
            echo sprintf("%-15s: ERROR - %s\n", $table, $e->getMessage());
        }
    }
    
    // Show sample sale data if exists
    echo "\n=== SAMPLE SALES DATA ===\n";
    try {
        $stmt = $conn->query("SELECT sale_id, sale_date, sale_time, total_amount, payment_type FROM sale ORDER BY sale_date DESC, sale_time DESC LIMIT 10");
        $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($sales)) {
            echo "No sales records found\n";
        } else {
            echo "Found " . count($sales) . " sales records:\n";
            foreach ($sales as $sale) {
                echo "  #{$sale['sale_id']}: {$sale['sale_date']} {$sale['sale_time']} - Rs.{$sale['total_amount']} ({$sale['payment_type']})\n";
            }
        }
    } catch (Exception $e) {
        echo "Error getting sales: " . $e->getMessage() . "\n";
    }
    
    // Test the exact query used by the API
    echo "\n=== API QUERY TEST ===\n";
    try {
        $today = new DateTime();
        $startDate = new DateTime($today->format('Y-m-01')); // First day of month
        $endDate = clone $today;
        
        echo "Testing date range: {$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')}\n";
        
        $stmt = $conn->prepare("
            SELECT s.sale_id, s.sale_date, s.sale_time, s.total_amount, s.payment_type,
                   c.full_name as customer_name, u.user_name as cashier_name
            FROM sale s
            LEFT JOIN customer c ON s.customer_id = c.customer_id
            LEFT JOIN user u ON s.user_id = u.user_id
            WHERE s.sale_date BETWEEN ? AND ?
            ORDER BY s.sale_date DESC, s.sale_time DESC
            LIMIT 5
        ");
        $stmt->execute([$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);
        $apiSales = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "API query returned " . count($apiSales) . " records\n";
        if (!empty($apiSales)) {
            foreach ($apiSales as $sale) {
                $customer = $sale['customer_name'] ?: 'Walk-in';
                $cashier = $sale['cashier_name'] ?: 'Unknown';
                echo "  #{$sale['sale_id']}: {$sale['sale_date']} - Rs.{$sale['total_amount']} - Customer: $customer - Cashier: $cashier\n";
            }
        }
        
    } catch (Exception $e) {
        echo "Error in API query test: " . $e->getMessage() . "\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
