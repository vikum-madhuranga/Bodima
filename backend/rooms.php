<?php
/**
 * REST API Endpoint: Rooms Management
 * Supports: GET (with INNER JOIN on properties & occupied bed calculation), POST, PUT, DELETE
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
    $room_id     = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $property_id = isset($_GET['property_id']) ? (int)$_GET['property_id'] : null;

    $sql = "
        SELECT 
            r.room_id,
            r.property_id,
            r.room_number,
            r.capacity,
            r.monthly_rent,
            r.created_at,
            p.property_name,
            p.address AS property_address,
            p.gender_type,
            p.owner_id,
            o.full_name AS owner_name,
            (SELECT COUNT(*) FROM tenants t WHERE t.room_id = r.room_id) AS occupied_beds,
            (r.capacity - (SELECT COUNT(*) FROM tenants t WHERE t.room_id = r.room_id)) AS vacant_beds
        FROM rooms r
        INNER JOIN properties p ON r.property_id = p.property_id
        INNER JOIN owners o ON p.owner_id = o.owner_id
        WHERE 1=1
    ";

    $params = [];

    if ($room_id) {
        $sql .= " AND r.room_id = ?";
        $params[] = $room_id;
    }
    if ($property_id) {
        $sql .= " AND r.property_id = ?";
        $params[] = $property_id;
    }

    $sql .= " ORDER BY p.property_name ASC, r.room_number ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    if ($room_id) {
        $room = $stmt->fetch();
        if (!$room) {
            send_error('Room not found', 404);
        }
        $room['is_full'] = ($room['vacant_beds'] <= 0);
        send_json(['success' => true, 'data' => $room]);
    } else {
        $rooms = $stmt->fetchAll();
        foreach ($rooms as &$r) {
            $r['is_full'] = ($r['vacant_beds'] <= 0);
        }
        send_json(['success' => true, 'data' => $rooms]);
    }
}

function handle_post($pdo) {
    $input = get_json_input();

    $property_id  = isset($input['property_id']) ? (int)$input['property_id'] : 0;
    $room_number  = sanitize_input($input['room_number'] ?? '');
    $capacity     = isset($input['capacity']) ? (int)$input['capacity'] : 0;
    $monthly_rent = isset($input['monthly_rent']) ? (float)$input['monthly_rent'] : -1.0;

    if ($property_id <= 0 || empty($room_number)) {
        send_error('property_id and room_number are required');
    }
    if ($capacity <= 0) {
        send_error('Room capacity must be greater than 0');
    }
    if ($monthly_rent < 0) {
        send_error('Monthly rent must be greater than or equal to 0');
    }

    // Check if property exists
    $prop_stmt = $pdo->prepare("SELECT property_id FROM properties WHERE property_id = ?");
    $prop_stmt->execute([$property_id]);
    if (!$prop_stmt->fetch()) {
        send_error('Selected property does not exist', 404);
    }

    // Check duplicate room_number in the same property
    $dup_stmt = $pdo->prepare("SELECT room_id FROM rooms WHERE property_id = ? AND room_number = ?");
    $dup_stmt->execute([$property_id, $room_number]);
    if ($dup_stmt->fetch()) {
        send_error("Room number '{$room_number}' already exists in this property", 409);
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO rooms (property_id, room_number, capacity, monthly_rent)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$property_id, $room_number, $capacity, $monthly_rent]);
        $new_id = (int)$pdo->lastInsertId();

        send_success(['room_id' => $new_id], 'Room added successfully', 201);
    } catch (PDOException $e) {
        send_error('Failed to add room: ' . $e->getMessage(), 500);
    }
}

function handle_put($pdo) {
    $input = get_json_input();

    $room_id      = isset($input['room_id']) ? (int)$input['room_id'] : 0;
    $property_id  = isset($input['property_id']) ? (int)$input['property_id'] : 0;
    $room_number  = sanitize_input($input['room_number'] ?? '');
    $capacity     = isset($input['capacity']) ? (int)$input['capacity'] : 0;
    $monthly_rent = isset($input['monthly_rent']) ? (float)$input['monthly_rent'] : -1.0;

    if ($room_id <= 0 || $property_id <= 0 || empty($room_number)) {
        send_error('Valid room_id, property_id, and room_number are required');
    }
    if ($capacity <= 0) {
        send_error('Room capacity must be greater than 0');
    }
    if ($monthly_rent < 0) {
        send_error('Monthly rent cannot be negative');
    }

    // Check room exists
    $check_stmt = $pdo->prepare("SELECT * FROM rooms WHERE room_id = ?");
    $check_stmt->execute([$room_id]);
    $current_room = $check_stmt->fetch();
    if (!$current_room) {
        send_error('Room not found', 404);
    }

    // Check current tenants in room: cannot reduce capacity below occupied count
    $occ_stmt = $pdo->prepare("SELECT COUNT(*) FROM tenants WHERE room_id = ?");
    $occ_stmt->execute([$room_id]);
    $current_tenants = (int)$occ_stmt->fetchColumn();

    if ($capacity < $current_tenants) {
        send_error("Cannot reduce capacity to {$capacity}. Currently {$current_tenants} tenant(s) are assigned to this room.", 400);
    }

    // Check duplicate room_number in property
    $dup_stmt = $pdo->prepare("SELECT room_id FROM rooms WHERE property_id = ? AND room_number = ? AND room_id != ?");
    $dup_stmt->execute([$property_id, $room_number, $room_id]);
    if ($dup_stmt->fetch()) {
        send_error("Room number '{$room_number}' is already used by another room in this property", 409);
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE rooms 
            SET property_id = ?, room_number = ?, capacity = ?, monthly_rent = ?
            WHERE room_id = ?
        ");
        $stmt->execute([$property_id, $room_number, $capacity, $monthly_rent, $room_id]);

        send_success(['room_id' => $room_id], 'Room updated successfully');
    } catch (PDOException $e) {
        send_error('Failed to update room: ' . $e->getMessage(), 500);
    }
}

function handle_delete($pdo) {
    $input = get_json_input();
    $room_id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['room_id']) ? (int)$input['room_id'] : 0);

    if ($room_id <= 0) {
        send_error('Valid room ID is required');
    }

    // Check if tenants are assigned (FK ON DELETE RESTRICT)
    $tenant_check = $pdo->prepare("SELECT COUNT(*) AS total FROM tenants WHERE room_id = ?");
    $tenant_check->execute([$room_id]);
    $count = (int)$tenant_check->fetchColumn();

    if ($count > 0) {
        send_error("Cannot delete room: {$count} tenant(s) are currently assigned to this room. Reassign or remove them first.", 400);
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM rooms WHERE room_id = ?");
        $stmt->execute([$room_id]);

        if ($stmt->rowCount() === 0) {
            send_error('Room not found or already deleted', 404);
        }

        send_success(['room_id' => $room_id], 'Room deleted successfully');
    } catch (PDOException $e) {
        send_error('Failed to delete room: ' . $e->getMessage(), 500);
    }
}
