<?php
/**
 * Insert sample data for testing
 */

require_once 'php/database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    echo "Starting data insertion...\n";
    
    // Insert sample users first
    $conn->exec("INSERT IGNORE INTO user (user_id, user_name, password, role, status, profile_img) VALUES 
        (1, 'admin', 'admin123', 'admin', 'active', 'default.jpg'),
        (2, 'pharmacist1', 'pharma123', 'pharmacist', 'active', 'default.jpg'),
        (3, 'pharmacist2', 'pharma456', 'pharmacist', 'active', 'default.jpg')
    ");
    echo "Users inserted\n";
    
    // Insert sample customers
    $conn->exec("INSERT IGNORE INTO customer (customer_id, full_name, date_of_birth, phone_number, address, email, reg_date) VALUES 
        (1, 'John Silva', '1985-05-15', '0712345678', '123 Galle Road, Colombo', 'john@email.com', '2025-01-15'),
        (2, 'Mary Fernando', '1978-08-22', '0771234567', '456 Kandy Road, Kandy', 'mary@email.com', '2025-02-10'),
        (3, 'David Perera', '1992-12-03', '0701234567', '789 Main Street, Negombo', 'david@email.com', '2025-03-05')
    ");
    echo "Customers inserted\n";
    
    // Insert sample medicine groups
    $conn->exec("INSERT IGNORE INTO med_group (med_group_id, med_group_name, description) VALUES 
        (1, 'Pain Relief', 'Medications for pain management'),
        (2, 'Antibiotics', 'Bacterial infection treatment'),
        (3, 'Cold & Flu', 'Common cold and flu medications'),
        (4, 'Vitamins', 'Vitamin supplements')
    ");
    echo "Medicine groups inserted\n";
    
    // Insert sample medicines
    $conn->exec("INSERT IGNORE INTO medicine (medicine_id, med_group_id, medicine_name, medicine_brand, stock_left, medicine_price, lifetime_supply, how_to_use, side_effects) VALUES 
        (1, 1, 'Paracetamol', 'Panadol', 150, 25.50, 1000, 'Take 1-2 tablets every 4-6 hours', 'Nausea, allergic reactions'),
        (2, 2, 'Amoxicillin', 'Amoxil', 75, 85.00, 500, 'Take 1 capsule 3 times daily', 'Diarrhea, stomach upset'),
        (3, 3, 'Cough Syrup', 'Benadryl', 45, 120.00, 200, '10ml 3 times daily', 'Drowsiness'),
        (4, 4, 'Vitamin C', 'Redoxon', 200, 45.00, 1500, '1 tablet daily', 'None known'),
        (5, 1, 'Ibuprofen', 'Brufen', 80, 35.75, 800, 'Take 1 tablet every 8 hours', 'Stomach irritation')
    ");
    echo "Medicines inserted\n";
    
    // Insert sample sales
    $saleData = [
        ['2025-08-01', '09:30:00', 150.50, 1, 2, 15, 135.50, 140.00, 4.50, 'cash'],
        ['2025-08-01', '11:15:00', 285.00, 2, 1, 0, 285.00, 300.00, 15.00, 'cash'],
        ['2025-08-01', '14:45:00', 120.00, null, 3, 12, 108.00, 108.00, 0.00, 'card'],
        ['2025-07-31', '16:20:00', 95.50, 3, 2, 10, 85.95, 90.00, 4.05, 'cash'],
        ['2025-07-31', '10:10:00', 245.25, 1, 1, 0, 245.25, 250.00, 4.75, 'cash'],
        ['2025-07-30', '13:35:00', 175.00, 2, 3, 18, 157.00, 160.00, 3.00, 'card'],
        ['2025-07-29', '15:50:00', 320.75, null, 2, 32, 288.75, 290.00, 1.25, 'cash'],
        ['2025-07-28', '12:25:00', 65.50, 3, 1, 7, 58.50, 60.00, 1.50, 'cash']
    ];
    
    $saleId = 1;
    foreach ($saleData as $sale) {
        $stmt = $conn->prepare("INSERT IGNORE INTO sale (sale_id, sale_date, sale_time, sub_total, customer_id, user_id, sale_med_list_id, discount, total_amount, amount_recieved, change_given, payment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$saleId, $sale[0], $sale[1], $sale[2], $sale[3], $sale[4], $saleId, $sale[5], $sale[6], $sale[7], $sale[8], $sale[9]]);
        $saleId++;
    }
    echo "Sales inserted\n";
    
    // Insert sample sale_med_list
    $medListData = [
        [1, 1, 1, 3], // Sale 1: Paracetamol x3
        [2, 2, 2, 2], // Sale 2: Amoxicillin x2  
        [3, 3, 3, 1], // Sale 3: Cough Syrup x1
        [4, 4, 4, 2], // Sale 4: Vitamin C x2
        [5, 5, 5, 1], // Sale 5: Ibuprofen x1
        [6, 6, 1, 4], // Sale 6: Paracetamol x4
        [7, 7, 2, 3], // Sale 7: Amoxicillin x3
        [8, 8, 1, 2]  // Sale 8: Paracetamol x2
    ];
    
    foreach ($medListData as $medList) {
        $stmt = $conn->prepare("INSERT IGNORE INTO sale_med_list (sale_med_list_id, sale_id, med_id, quantity) VALUES (?, ?, ?, ?)");
        $stmt->execute($medList);
    }
    echo "Sale medicine list inserted\n";
    
    // Show final counts
    $stmt = $conn->query('SELECT COUNT(*) as count FROM sale');
    $salesCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $conn->query('SELECT COUNT(*) as count FROM customer');
    $customerCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $conn->query('SELECT COUNT(*) as count FROM medicine');
    $medicineCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    echo "\nData insertion completed successfully!\n";
    echo "Sales: $salesCount records\n";
    echo "Customers: $customerCount records\n"; 
    echo "Medicines: $medicineCount records\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
