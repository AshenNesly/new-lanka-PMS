<?php
/**
 * Test the admin reports API directly
 */

require_once 'php/database.php';
require_once 'php/functions.php';

header('Content-Type: application/json');

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    echo "Testing getSalesReport function...\n\n";
    
    // Test date range calculation
    $today = new DateTime();
    $startDate = new DateTime($today->format('Y-m-01')); // First day of month
    $endDate = clone $today;
    
    echo "Date range: {$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')}\n\n";
    
    // Get sales data with customer and user information
    $stmt = $conn->prepare("
        SELECT s.sale_id, s.sale_date, s.sale_time, s.sub_total, 
               s.discount, s.total_amount, s.amount_recieved, 
               s.change_given, s.payment_type,
               c.full_name as customer_name, c.phone_number as customer_phone,
               u.user_name as cashier_name
        FROM sale s
        LEFT JOIN customer c ON s.customer_id = c.customer_id
        LEFT JOIN user u ON s.user_id = u.user_id
        WHERE s.sale_date BETWEEN ? AND ?
        ORDER BY s.sale_date DESC, s.sale_time DESC
        LIMIT 1000
    ");
    
    $stmt->execute([$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);
    $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($sales) . " sales records\n\n";
    
    if (!empty($sales)) {
        echo "Sample sales data:\n";
        foreach (array_slice($sales, 0, 3) as $sale) {
            echo "- Sale #{$sale['sale_id']}: {$sale['sale_date']} {$sale['sale_time']}\n";
            echo "  Customer: " . ($sale['customer_name'] ?: 'Walk-in') . "\n";
            echo "  Cashier: " . ($sale['cashier_name'] ?: 'Unknown') . "\n";
            echo "  Total: Rs.{$sale['total_amount']}\n\n";
        }
    }
    
    // Get summary
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total_transactions,
               COALESCE(SUM(total_amount), 0) as total_sales,
               COALESCE(SUM(discount), 0) as total_discounts,
               COALESCE(AVG(total_amount), 0) as average_sale
        FROM sale
        WHERE sale_date BETWEEN ? AND ?
    ");
    $stmt->execute([$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Summary data:\n";
    echo "- Total transactions: {$summary['total_transactions']}\n";
    echo "- Total sales: Rs.{$summary['total_sales']}\n";
    echo "- Total discounts: Rs.{$summary['total_discounts']}\n";
    echo "- Average sale: Rs." . number_format($summary['average_sale'], 2) . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>
