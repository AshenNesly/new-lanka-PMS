<?php
echo "<h2>🕐 Timezone Debugging</h2>";

// Current PHP timezone
echo "<h3>PHP Server Timezone:</h3>";
echo "Default timezone: " . date_default_timezone_get() . "<br>";
echo "Current server time: " . date('Y-m-d H:i:s') . "<br>";
echo "Current server date only: " . date('Y-m-d') . "<br>";

// Different timezone formats
echo "<h3>Different Date Formats:</h3>";
echo "ISO format: " . date('c') . "<br>";
echo "Unix timestamp: " . time() . "<br>";
echo "GMT time: " . gmdate('Y-m-d H:i:s') . "<br>";

// MySQL timezone
echo "<h3>MySQL Database Timezone:</h3>";
try {
    $conn = new mysqli("localhost", "root", "", "newlankapms");
    if ($conn->connect_error) {
        echo "Connection failed: " . $conn->connect_error;
    } else {
        // Check MySQL timezone
        $result = $conn->query("SELECT @@global.time_zone as global_tz, @@session.time_zone as session_tz, NOW() as mysql_now, CURDATE() as mysql_date");
        if ($result) {
            $row = $result->fetch_assoc();
            echo "MySQL Global TZ: " . $row['global_tz'] . "<br>";
            echo "MySQL Session TZ: " . $row['session_tz'] . "<br>";
            echo "MySQL NOW(): " . $row['mysql_now'] . "<br>";
            echo "MySQL CURDATE(): " . $row['mysql_date'] . "<br>";
        }
        
        // Check what's actually in sales table for today
        echo "<h3>Sales Data for Today (Different Date Formats):</h3>";
        $dates_to_check = [
            date('Y-m-d'),  // PHP server date
            gmdate('Y-m-d'), // GMT date
            '2025-08-01'    // Expected IST date
        ];
        
        foreach($dates_to_check as $check_date) {
            $stmt = $conn->prepare("SELECT COUNT(*) as cnt, SUM(total_amount) as total FROM sales WHERE DATE(created_at) = ?");
            $stmt->bind_param("s", $check_date);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            echo "Date {$check_date}: {$row['cnt']} sales, Total: Rs. {$row['total']}<br>";
        }
        
        // Show recent sales with their actual created_at timestamps
        echo "<h3>Recent Sales (Last 3 days with timestamps):</h3>";
        $result = $conn->query("SELECT id, total_amount, created_at, DATE(created_at) as sale_date FROM sales ORDER BY created_at DESC LIMIT 10");
        if ($result) {
            while($row = $result->fetch_assoc()) {
                echo "Sale ID: {$row['id']}, Amount: Rs. {$row['total_amount']}, Full Timestamp: {$row['created_at']}, Date Only: {$row['sale_date']}<br>";
            }
        }
        
        $conn->close();
    }
} catch(Exception $e) {
    echo "Database error: " . $e->getMessage();
}

// JavaScript will show client timezone
echo "<h3>Client (JavaScript) Timezone:</h3>";
echo "<script>
document.write('Client timezone: ' + Intl.DateTimeFormat().resolvedOptions().timeZone + '<br>');
document.write('Client current time: ' + new Date().toString() + '<br>');
document.write('Client current date: ' + new Date().toISOString().split('T')[0] + '<br>');
document.write('Client IST time: ' + new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}) + '<br>');
</script>";

?>
