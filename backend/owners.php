<?php
/**
 * REST API Endpoint: Owners Management
 * Supports: GET, POST, PUT, DELETE
 */
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handle_get($pdo);
        break;
    case 'POST':
        handle_post($pdo);
        break;
    case 'PUT':
        handle_put($pdo);
        break;
    case 'DELETE':
        handle_delete($pdo);
        break;
    default:
        send_error('Method Not Allowed', 405);
}

function handle_get($pdo) {
    $owner_id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    if ($owner_id) {
        $stmt = $pdo->prepare("
            SELECT o.*, 
                   COUNT(p.property_id) AS properties_count
            FROM owners o
            LEFT JOIN properties p ON o.owner_id = p.owner_id
            WHERE o.owner_id = ?
            GROUP BY o.owner_id
        ");
        $stmt->execute([$owner_id]);
        $owner = $stmt->fetch();

        if (!$owner) {
            send_error('Owner not found', 404);
        }
        send_json(['success' => true, 'data' => $owner]);
    } else {
        $stmt = $pdo->query("
            SELECT o.*, 
                   COUNT(p.property_id) AS properties_count
            FROM owners o
            LEFT JOIN properties p ON o.owner_id = p.owner_id
            GROUP BY o.owner_id
            ORDER BY o.owner_id DESC
        ");
        $owners = $stmt->fetchAll();
        send_json(['success' => true, 'data' => $owners]);
    }
}

function handle_post($pdo) {
    $input = get_json_input();

    $full_name  = sanitize_input($input['full_name'] ?? '');
    $phone      = sanitize_input($input['phone'] ?? '');
    $nic_number = sanitize_input($input['nic_number'] ?? '');

    if (empty($full_name) || empty($phone) || empty($nic_number)) {
        send_error('All fields (full_name, phone, nic_number) are required');
    }

    // Check unique NIC
    $check_stmt = $pdo->prepare("SELECT owner_id FROM owners WHERE nic_number = ?");
    $check_stmt->execute([$nic_number]);
    if ($check_stmt->fetch()) {
        send_error('An owner with this NIC number already exists', 409);
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO owners (full_name, phone, nic_number) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$full_name, $phone, $nic_number]);
        $new_id = (int)$pdo->lastInsertId();

        send_success(['owner_id' => $new_id], 'Owner registered successfully', 201);
    } catch (PDOException $e) {
        send_error('Failed to create owner: ' . $e->getMessage(), 500);
    }
}

function handle_put($pdo) {
    $input = get_json_input();

    $owner_id   = isset($input['owner_id']) ? (int)$input['owner_id'] : 0;
    $full_name  = sanitize_input($input['full_name'] ?? '');
    $phone      = sanitize_input($input['phone'] ?? '');
    $nic_number = sanitize_input($input['nic_number'] ?? '');

    if ($owner_id <= 0 || empty($full_name) || empty($phone) || empty($nic_number)) {
        send_error('Valid owner_id, full_name, phone, and nic_number are required');
    }

    // Check if owner exists
    $stmt = $pdo->prepare("SELECT owner_id FROM owners WHERE owner_id = ?");
    $stmt->execute([$owner_id]);
    if (!$stmt->fetch()) {
        send_error('Owner not found', 404);
    }

    // Check unique NIC conflict with other owners
    $check_stmt = $pdo->prepare("SELECT owner_id FROM owners WHERE nic_number = ? AND owner_id != ?");
    $check_stmt->execute([$nic_number, $owner_id]);
    if ($check_stmt->fetch()) {
        send_error('Another owner is already registered with this NIC number', 409);
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE owners 
            SET full_name = ?, phone = ?, nic_number = ? 
            WHERE owner_id = ?
        ");
        $stmt->execute([$full_name, $phone, $nic_number, $owner_id]);

        send_success(['owner_id' => $owner_id], 'Owner updated successfully');
    } catch (PDOException $e) {
        send_error('Failed to update owner: ' . $e->getMessage(), 500);
    }
}

function handle_delete($pdo) {
    $input = get_json_input();
    $owner_id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['owner_id']) ? (int)$input['owner_id'] : 0);

    if ($owner_id <= 0) {
        send_error('Valid owner ID is required');
    }

    // Check if owner has properties (FK ON DELETE RESTRICT)
    $prop_check = $pdo->prepare("SELECT COUNT(*) AS total FROM properties WHERE owner_id = ?");
    $prop_check->execute([$owner_id]);
    $count = (int)$prop_check->fetchColumn();

    if ($count > 0) {
        send_error("Cannot delete owner: This owner has {$count} registered property/properties. Remove or reassign them first.", 400);
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM owners WHERE owner_id = ?");
        $stmt->execute([$owner_id]);

        if ($stmt->rowCount() === 0) {
            send_error('Owner not found or already deleted', 404);
        }

        send_success(['owner_id' => $owner_id], 'Owner deleted successfully');
    } catch (PDOException $e) {
        send_error('Failed to delete owner: ' . $e->getMessage(), 500);
    }
}
