<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'success' => true,
    'message' => 'Backend is working!',
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT);
?>
