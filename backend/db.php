<?php
/**
 * Database Connection & Global Utilities
 * Bodima Finder & Tenant Manager (ICT 2308)
 */

// Enable error reporting during development (in production, log to file)
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Set Global CORS Headers to allow Vite frontend to access API
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight OPTIONS requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json; charset=UTF-8");

// Database credentials for WampServer MySQL default setup
$db_host = '127.0.0.1';
$db_name = 'bodima_db';
$db_user = 'root';
$db_pass = '';
$db_charset = 'utf8mb4';

$dsn = "mysql:host={$db_host};dbname={$db_name};charset={$db_charset}";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Database connection failed: ' . $e->getMessage(),
        'hint'    => 'Ensure WampServer / MySQL is running and bodima_db database is imported.'
    ]);
    exit();
}

/**
 * Reusable input sanitization function
 * Strips tags, trims whitespace, and converts special characters
 */
function sanitize_input($data) {
    if ($data === null) {
        return null;
    }
    if (is_array($data)) {
        return array_map('sanitize_input', $data);
    }
    return htmlspecialchars(strip_tags(trim((string)$data)), ENT_QUOTES, 'UTF-8');
}

/**
 * Parse incoming JSON request body
 */
function get_json_input() {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Send JSON response and exit
 */
function send_json($data, $status_code = 200) {
    http_response_code($status_code);
    echo json_encode($data);
    exit();
}

/**
 * Send standard error response
 */
function send_error($message, $status_code = 400, $details = null) {
    $payload = [
        'success' => false,
        'error'   => $message
    ];
    if ($details !== null) {
        $payload['details'] = $details;
    }
    send_json($payload, $status_code);
}

/**
 * Send standard success response
 */
function send_success($data = [], $message = 'Success', $status_code = 200) {
    $payload = array_merge([
        'success' => true,
        'message' => $message
    ], $data);
    send_json($payload, $status_code);
}
