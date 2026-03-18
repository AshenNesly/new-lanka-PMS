<?php
/**
 * Logout Handler
 * New Lanka Pharmacy Management System
 */

require_once 'auth.php';

// Logout the user
$auth = getAuth();
$auth->logout();

// Redirect to login page
header("Location: ../index.html");
exit();
?>
