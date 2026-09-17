<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$ordersFile = __DIR__ . '/orders_data.json';
if (file_exists($ordersFile)) {
    $raw = file_get_contents($ordersFile);
    $orders = json_decode($raw, true);
    if (is_array($orders)) {
        echo json_encode(['success' => true, 'orders' => $orders]);
        exit;
    }
}

echo json_encode(['success' => true, 'orders' => []]);
?>
