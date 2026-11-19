<?php
/**
 * REST API Endpoint: Properties Management
 * Supports: GET (with INNER JOIN on owners), POST, PUT, DELETE
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
    $property_id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $gender = isset($_GET['gender_type']) ? sanitize_input($_GET['gender_type']) : null;
    $owner_id = isset($_GET['owner_id']) ? (int)$_GET['owner_id'] : null;

    $sql = "
        SELECT 
            p.property_id,
            p.owner_id,
            p.property_name,
            p.address,
            p.gender_type,
            p.utility_notes,
            p.created_at,
            o.full_name AS owner_name,
            o.phone AS owner_phone,
            o.nic_number AS owner_nic,
            (SELECT COUNT(*) FROM rooms r WHERE r.property_id = p.property_id) AS total_rooms,
            (SELECT COALESCE(SUM(r.capacity), 0) FROM rooms r WHERE r.property_id = p.property_id) AS total_capacity,
            (SELECT COUNT(t.tenant_id) 
             FROM rooms r 
             JOIN tenants t ON r.room_id = t.room_id 
             WHERE r.property_id = p.property_id) AS occupied_beds
        FROM properties p
        INNER JOIN owners o ON p.owner_id = o.owner_id
        WHERE 1=1
    ";

    $params = [];

    if ($property_id) {
        $sql .= " AND p.property_id = ?";
        $params[] = $property_id;
    }
    if ($gender && in_array($gender, ['Boys', 'Girls', 'Mixed'])) {
        $sql .= " AND p.gender_type = ?";
        $params[] = $gender;
    }
    if ($owner_id) {
        $sql .= " AND p.owner_id = ?";
        $params[] = $owner_id;
    }

    $sql .= " ORDER BY p.property_id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    if ($property_id) {
        $property = $stmt->fetch();
        if (!$property) {
            send_error('Property not found', 404);
        }
        send_json(['success' => true, 'data' => $property]);
    } else {
        $properties = $stmt->fetchAll();
        send_json(['success' => true, 'data' => $properties]);
    }
}

function handle_post($pdo) {
    $input = get_json_input();

    $owner_id      = isset($input['owner_id']) ? (int)$input['owner_id'] : 0;
    $property_name = sanitize_input($input['property_name'] ?? '');
    $address       = sanitize_input($input['address'] ?? '');
    $gender_type   = sanitize_input($input['gender_type'] ?? 'Boys');
    $utility_notes = sanitize_input($input['utility_notes'] ?? '');

    if ($owner_id <= 0 || empty($property_name) || empty($address)) {
        send_error('Valid owner_id, property_name, and address are required');
    }

    if (!in_array($gender_type, ['Boys', 'Girls', 'Mixed'])) {
        send_error('gender_type must be Boys, Girls, or Mixed');
    }

    // Verify owner exists
    $owner_stmt = $pdo->prepare("SELECT owner_id FROM owners WHERE owner_id = ?");
    $owner_stmt->execute([$owner_id]);
    if (!$owner_stmt->fetch()) {
        send_error('Selected owner does not exist', 404);
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO properties (owner_id, property_name, address, gender_type, utility_notes)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$owner_id, $property_name, $address, $gender_type, $utility_notes]);
        $new_id = (int)$pdo->lastInsertId();

        send_success(['property_id' => $new_id], 'Property created successfully', 201);
    } catch (PDOException $e) {
        send_error('Failed to create property: ' . $e->getMessage(), 500);
    }
}

function handle_put($pdo) {
    $input = get_json_input();

    $property_id   = isset($input['property_id']) ? (int)$input['property_id'] : 0;
    $owner_id      = isset($input['owner_id']) ? (int)$input['owner_id'] : 0;
    $property_name = sanitize_input($input['property_name'] ?? '');
    $address       = sanitize_input($input['address'] ?? '');
    $gender_type   = sanitize_input($input['gender_type'] ?? 'Boys');
    $utility_notes = sanitize_input($input['utility_notes'] ?? '');

    if ($property_id <= 0 || $owner_id <= 0 || empty($property_name) || empty($address)) {
        send_error('Valid property_id, owner_id, property_name, and address are required');
    }

    if (!in_array($gender_type, ['Boys', 'Girls', 'Mixed'])) {
        send_error('gender_type must be Boys, Girls, or Mixed');
    }

    // Verify property exists
    $check_stmt = $pdo->prepare("SELECT property_id FROM properties WHERE property_id = ?");
    $check_stmt->execute([$property_id]);
    if (!$check_stmt->fetch()) {
        send_error('Property not found', 404);
    }

    // Verify owner exists
    $owner_stmt = $pdo->prepare("SELECT owner_id FROM owners WHERE owner_id = ?");
    $owner_stmt->execute([$owner_id]);
    if (!$owner_stmt->fetch()) {
        send_error('Selected owner does not exist', 404);
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE properties 
            SET owner_id = ?, property_name = ?, address = ?, gender_type = ?, utility_notes = ?
            WHERE property_id = ?
        ");
        $stmt->execute([$owner_id, $property_name, $address, $gender_type, $utility_notes, $property_id]);

        send_success(['property_id' => $property_id], 'Property updated successfully');
    } catch (PDOException $e) {
        send_error('Failed to update property: ' . $e->getMessage(), 500);
    }
}

function handle_delete($pdo) {
    $input = get_json_input();
    $property_id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['property_id']) ? (int)$input['property_id'] : 0);

    if ($property_id <= 0) {
        send_error('Valid property ID is required');
    }

    // Check if property has rooms (FK ON DELETE RESTRICT)
    $room_check = $pdo->prepare("SELECT COUNT(*) AS total FROM rooms WHERE property_id = ?");
    $room_check->execute([$property_id]);
    $count = (int)$room_check->fetchColumn();

    if ($count > 0) {
        send_error("Cannot delete property: {$count} room(s) exist within this property. Delete all rooms first.", 400);
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM properties WHERE property_id = ?");
        $stmt->execute([$property_id]);

        if ($stmt->rowCount() === 0) {
            send_error('Property not found or already deleted', 404);
        }

        send_success(['property_id' => $property_id], 'Property deleted successfully');
    } catch (PDOException $e) {
        send_error('Failed to delete property: ' . $e->getMessage(), 500);
    }
}
