<?php
/**
 * REST API Endpoint: Tenants Directory & Management
 * Supports: GET (with INNER JOIN on rooms & properties), POST (with capacity validation), PUT, DELETE
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
    $tenant_id   = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $room_id     = isset($_GET['room_id']) ? (int)$_GET['room_id'] : null;
    $property_id = isset($_GET['property_id']) ? (int)$_GET['property_id'] : null;
    $search      = isset($_GET['search']) ? sanitize_input($_GET['search']) : null;

    $sql = "
        SELECT 
            t.tenant_id,
            t.room_id,
            t.full_name,
            t.nic_or_reg_no,
            t.phone,
            t.check_in_date,
            t.created_at,
            r.room_number,
            r.capacity,
            r.monthly_rent,
            p.property_id,
            p.property_name,
            p.gender_type,
            p.address AS property_address,
            o.owner_id,
            o.full_name AS owner_name,
            (SELECT COUNT(*) FROM monthly_payments mp WHERE mp.tenant_id = t.tenant_id) AS total_payments_count,
            (SELECT COALESCE(SUM(mp.amount_paid), 0) FROM monthly_payments mp WHERE mp.tenant_id = t.tenant_id) AS total_paid_sum
        FROM tenants t
        INNER JOIN rooms r ON t.room_id = r.room_id
        INNER JOIN properties p ON r.property_id = p.property_id
        INNER JOIN owners o ON p.owner_id = o.owner_id
        WHERE 1=1
    ";

    $params = [];

    if ($tenant_id) {
        $sql .= " AND t.tenant_id = ?";
        $params[] = $tenant_id;
    }
    if ($room_id) {
        $sql .= " AND t.room_id = ?";
        $params[] = $room_id;
    }
    if ($property_id) {
        $sql .= " AND p.property_id = ?";
        $params[] = $property_id;
    }
    if ($search) {
        $sql .= " AND (t.full_name LIKE ? OR t.nic_or_reg_no LIKE ? OR t.phone LIKE ?)";
        $wildcard = "%{$search}%";
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
    }

    $sql .= " ORDER BY t.tenant_id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    if ($tenant_id) {
        $tenant = $stmt->fetch();
        if (!$tenant) {
            send_error('Tenant not found', 404);
        }
        send_json(['success' => true, 'data' => $tenant]);
    } else {
        $tenants = $stmt->fetchAll();
        send_json(['success' => true, 'data' => $tenants]);
    }
}

function handle_post($pdo) {
    $input = get_json_input();

    $room_id       = isset($input['room_id']) ? (int)$input['room_id'] : 0;
    $full_name     = sanitize_input($input['full_name'] ?? '');
    $nic_or_reg_no = sanitize_input($input['nic_or_reg_no'] ?? '');
    $phone         = sanitize_input($input['phone'] ?? '');
    $check_in_date = sanitize_input($input['check_in_date'] ?? date('Y-m-d'));

    if ($room_id <= 0 || empty($full_name) || empty($nic_or_reg_no) || empty($phone)) {
        send_error('All fields (room_id, full_name, nic_or_reg_no, phone) are required');
    }

    // Validate phone number format (Sri Lankan format: 10 digits starting with 07, or standard)
    if (!preg_match('/^0[0-9]{9}$/', $phone)) {
        send_error('Invalid phone number. Must be a 10-digit number (e.g. 0771234567)');
    }

    // Check unique NIC / Reg No
    $dup_stmt = $pdo->prepare("SELECT tenant_id FROM tenants WHERE nic_or_reg_no = ?");
    $dup_stmt->execute([$nic_or_reg_no]);
    if ($dup_stmt->fetch()) {
        send_error("A tenant with NIC or Student Reg No '{$nic_or_reg_no}' already exists", 409);
    }

    // STRICT OCCUPANCY CHECK: validate room occupancy does not exceed room capacity
    $room_stmt = $pdo->prepare("
        SELECT r.capacity, 
               r.room_number,
               p.property_name,
               (SELECT COUNT(*) FROM tenants t WHERE t.room_id = r.room_id) AS current_occupants
        FROM rooms r
        INNER JOIN properties p ON r.property_id = p.property_id
        WHERE r.room_id = ?
    ");
    $room_stmt->execute([$room_id]);
    $room_info = $room_stmt->fetch();

    if (!$room_info) {
        send_error('Selected room does not exist', 404);
    }

    if ($room_info['current_occupants'] >= $room_info['capacity']) {
        send_error("Cannot assign tenant: {$room_info['property_name']} - {$room_info['room_number']} is already full ({$room_info['current_occupants']} / {$room_info['capacity']} beds occupied).", 400);
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO tenants (room_id, full_name, nic_or_reg_no, phone, check_in_date)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$room_id, $full_name, $nic_or_reg_no, $phone, $check_in_date]);
        $new_id = (int)$pdo->lastInsertId();

        send_success(['tenant_id' => $new_id], 'Tenant registered and assigned to room successfully', 201);
    } catch (PDOException $e) {
        send_error('Failed to register tenant: ' . $e->getMessage(), 500);
    }
}

function handle_put($pdo) {
    $input = get_json_input();

    $tenant_id     = isset($input['tenant_id']) ? (int)$input['tenant_id'] : 0;
    $room_id       = isset($input['room_id']) ? (int)$input['room_id'] : 0;
    $full_name     = sanitize_input($input['full_name'] ?? '');
    $nic_or_reg_no = sanitize_input($input['nic_or_reg_no'] ?? '');
    $phone         = sanitize_input($input['phone'] ?? '');
    $check_in_date = sanitize_input($input['check_in_date'] ?? '');

    if ($tenant_id <= 0 || $room_id <= 0 || empty($full_name) || empty($nic_or_reg_no) || empty($phone)) {
        send_error('Valid tenant_id, room_id, full_name, nic_or_reg_no, and phone are required');
    }

    if (!preg_match('/^0[0-9]{9}$/', $phone)) {
        send_error('Invalid phone number. Must be a 10-digit number (e.g. 0771234567)');
    }

    // Verify tenant exists
    $t_stmt = $pdo->prepare("SELECT * FROM tenants WHERE tenant_id = ?");
    $t_stmt->execute([$tenant_id]);
    $current_tenant = $t_stmt->fetch();
    if (!$current_tenant) {
        send_error('Tenant not found', 404);
    }

    // Check unique NIC conflict
    $dup_stmt = $pdo->prepare("SELECT tenant_id FROM tenants WHERE nic_or_reg_no = ? AND tenant_id != ?");
    $dup_stmt->execute([$nic_or_reg_no, $tenant_id]);
    if ($dup_stmt->fetch()) {
        send_error("Another tenant already uses NIC / Reg No '{$nic_or_reg_no}'", 409);
    }

    // If changing room, validate capacity of the new room
    if ((int)$current_tenant['room_id'] !== $room_id) {
        $room_stmt = $pdo->prepare("
            SELECT r.capacity, 
                   r.room_number,
                   p.property_name,
                   (SELECT COUNT(*) FROM tenants t WHERE t.room_id = r.room_id) AS current_occupants
            FROM rooms r
            INNER JOIN properties p ON r.property_id = p.property_id
            WHERE r.room_id = ?
        ");
        $room_stmt->execute([$room_id]);
        $room_info = $room_stmt->fetch();

        if (!$room_info) {
            send_error('New destination room does not exist', 404);
        }

        if ($room_info['current_occupants'] >= $room_info['capacity']) {
            send_error("Cannot reassign tenant: Target room {$room_info['property_name']} - {$room_info['room_number']} is at full capacity ({$room_info['capacity']} beds).", 400);
        }
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE tenants 
            SET room_id = ?, full_name = ?, nic_or_reg_no = ?, phone = ?, check_in_date = ?
            WHERE tenant_id = ?
        ");
        $stmt->execute([$room_id, $full_name, $nic_or_reg_no, $phone, $check_in_date, $tenant_id]);

        send_success(['tenant_id' => $tenant_id], 'Tenant updated successfully');
    } catch (PDOException $e) {
        send_error('Failed to update tenant: ' . $e->getMessage(), 500);
    }
}

function handle_delete($pdo) {
    $input = get_json_input();
    $tenant_id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['tenant_id']) ? (int)$input['tenant_id'] : 0);

    if ($tenant_id <= 0) {
        send_error('Valid tenant ID is required');
    }

    // Check if payments exist (FK ON DELETE RESTRICT)
    $pay_check = $pdo->prepare("SELECT COUNT(*) AS total FROM monthly_payments WHERE tenant_id = ?");
    $pay_check->execute([$tenant_id]);
    $count = (int)$pay_check->fetchColumn();

    if ($count > 0) {
        send_error("Cannot delete tenant: {$count} rent payment log(s) exist for this tenant. Delete or archive payment history first.", 400);
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM tenants WHERE tenant_id = ?");
        $stmt->execute([$tenant_id]);

        if ($stmt->rowCount() === 0) {
            send_error('Tenant not found or already deleted', 404);
        }

        send_success(['tenant_id' => $tenant_id], 'Tenant deleted successfully');
    } catch (PDOException $e) {
        send_error('Failed to delete tenant: ' . $e->getMessage(), 500);
    }
}
