<?php
/**
 * Database Connection Class
 * New Lanka Pharmacy Management System
 */

class Database {
    private $host = "localhost";
    private $db_name = "newlankapms";
    private $username = "root";
    private $password = "";
    public $conn;

    /**
     * Get database connection
     * @return PDO|null
     */
    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4", 
                $this->username, 
                $this->password
            );
            
            // Set PDO attributes
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
            
        } catch(PDOException $exception) {
            error_log("Database connection error: " . $exception->getMessage());
            return null;
        }
        
        return $this->conn;
    }

    /**
     * Close database connection
     */
    public function closeConnection() {
        $this->conn = null;
    }

    /**
     * Test database connection
     * @return bool
     */
    public function testConnection() {
        try {
            $conn = $this->getConnection();
            if ($conn) {
                $stmt = $conn->query("SELECT 1");
                return true;
            }
            return false;
        } catch(Exception $e) {
            return false;
        }
    }
}

/**
 * Get a database connection instance
 * @return PDO|null
 */
function getDatabaseConnection() {
    $database = new Database();
    return $database->getConnection();
}
?>
