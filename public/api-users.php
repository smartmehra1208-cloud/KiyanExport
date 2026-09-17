<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$usersFile = __DIR__ . '/users_data.json';
if (file_exists($usersFile)) {
    $raw = file_get_contents($usersFile);
    $users = json_decode($raw, true);
    if (is_array($users)) {
        echo json_encode(['success' => true, 'users' => $users]);
        exit;
    }
}

echo json_encode(['success' => true, 'users' => []]);
?>
