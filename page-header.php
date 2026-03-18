<?php
/**
 * Page Header Include
 * New Lanka Pharmacy Management System
 * 
 * Include this at the top of every HTML page to enable authentication
 */

// Include authentication middleware
require_once 'php/auth-middleware.php';

// Get current user for use in the page
$currentUser = AuthMiddleware::getCurrentUser();
$userRole = $currentUser ? $currentUser['role'] : null;
$isLoggedIn = AuthMiddleware::isLoggedIn();
?>
