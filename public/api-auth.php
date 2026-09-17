<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data) {
    $data = $_POST;
}
$action = isset($_GET['action']) ? $_GET['action'] : '';

$usersFile = __DIR__ . '/users_data.json';
$users = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : [];
if (!is_array($users)) $users = [];

$isRegister = ($action === 'register') || (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'register') !== false);
$isLogin = ($action === 'login') || (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'login') !== false);

if ($isRegister) {
    $fullName = isset($data['fullName']) ? trim($data['fullName']) : 'Customer';
    $email = isset($data['email']) ? trim($data['email']) : '';
    $phone = isset($data['phone']) ? trim($data['phone']) : '';
    $password = isset($data['password']) ? trim($data['password']) : '';
    $address = isset($data['address']) ? trim($data['address']) : '';
    $city = isset($data['city']) ? trim($data['city']) : '';
    $pin = isset($data['pin']) ? trim($data['pin']) : '';

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Please provide a valid email address.']);
        exit;
    }

    $existing = false;
    foreach ($users as $u) {
        if (isset($u['email']) && strtolower($u['email']) === strtolower($email)) {
            $existing = true;
            break;
        }
    }

    $newUser = [
        'id' => 'cust_' . time(),
        'fullName' => $fullName,
        'email' => $email,
        'phone' => $phone,
        'address' => $address,
        'city' => $city,
        'pin' => $pin,
        'password' => $password,
        'role' => 'user',
        'createdAt' => date('c')
    ];

    if (!$existing) {
        array_unshift($users, $newUser);
        @file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
    }

    echo json_encode(['success' => true, 'message' => 'Registration successful!', 'user' => $newUser]);
    exit;
}

if ($isLogin) {
    $email = isset($data['email']) ? strtolower(trim($data['email'])) : '';
    $password = isset($data['password']) ? trim($data['password']) : '';

    $adminEmails = ['admin@kiyanwellness.com', 'info@kiyanexports.com', 'sales@kiyanexports.com', 'admin@kiyanexports.com', 'kiyanexports.express@gmail.com'];
    $adminPasswords = ['Admin@12345', 'admin123', 'Kiyan@2026'];
    if (in_array($email, $adminEmails) && in_array($password, $adminPasswords)) {
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => 'admin-master',
                'fullName' => 'Kiyan Administrator',
                'email' => $email,
                'role' => 'admin'
            ]
        ]);
        exit;
    }

    foreach ($users as $u) {
        if (isset($u['email']) && strtolower($u['email']) === $email) {
            if (!isset($u['password']) || $u['password'] === $password) {
                echo json_encode(['success' => true, 'user' => $u]);
                exit;
            }
        }
    }

    echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid action']);
?>
