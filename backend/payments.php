<?php
/**
 * REST API Endpoint: Rent & Monthly Payments Management
 * Supports: GET (with INNER JOIN on tenants, rooms, & properties), POST, PUT, DELETE
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
    $payment_id    = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $tenant_id     = isset($_GET['tenant_id']) ? (int)$_GET['tenant_id'] : null;
    $billing_month = isset($_GET['billing_month']) ? sanitize_input($_GET['billing_month']) : null;
    $status        = isset($_GET['status']) ? sanitize_input($_GET['status']) : null;

    $sql = "
        SELECT 
            mp.payment_id,
            mp.tenant_id,
            mp.billing_month,
            mp.amount_paid,
            mp.payment_date,
            mp.status,
            mp.created_at,
            t.full_name AS tenant_name,
            t.nic_or_reg_no,
            t.phone AS tenant_phone,
            r.room_id,
            r.room_number,
            r.monthly_rent,
            p.property_id,
            p.property_name,
            p.gender_type,
            o.full_name AS owner_name
        FROM monthly_payments mp
        INNER JOIN tenants t ON mp.tenant_id = t.tenant_id
        INNER JOIN rooms r ON t.room_id = r.room_id
        INNER JOIN properties p ON r.property_id = p.property_id
        INNER JOIN owners o ON p.owner_id = o.owner_id
        WHERE 1=1
    ";

    $params = [];

    if ($payment_id) {
        $sql .= " AND mp.payment_id = ?";
        $params[] = $payment_id;
    }
    if ($tenant_id) {
        $sql .= " AND mp.tenant_id = ?";
        $params[] = $tenant_id;
    }
    if ($billing_month) {
        $sql .= " AND mp.billing_month = ?";
        $params[] = $billing_month;
    }
    if ($status && in_array($status, ['Paid', 'Pending', 'Partial'])) {
        $sql .= " AND mp.status = ?";
        $params[] = $status;
    }

    $sql .= " ORDER BY mp.billing_month DESC, mp.payment_date DESC, mp.payment_id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    if ($payment_id) {
        $payment = $stmt->fetch();
        if (!$payment) {
            send_error('Payment record not found', 404);
        }
        send_json(['success' => true, 'data' => $payment]);
    } else {
        $payments = $stmt->fetchAll();
        send_json(['success' => true, 'data' => $payments]);
    }
}

function handle_post($pdo) {
    $input = get_json_input();

    $tenant_id     = isset($input['tenant_id']) ? (int)$input['tenant_id'] : 0;
    $billing_month = sanitize_input($input['billing_month'] ?? date('Y-m'));
    $amount_paid   = isset($input['amount_paid']) ? (float)$input['amount_paid'] : -1.0;
    $payment_date  = sanitize_input($input['payment_date'] ?? date('Y-m-d'));
    $status        = sanitize_input($input['status'] ?? 'Paid');

    if ($tenant_id <= 0 || empty($billing_month) || empty($payment_date)) {
        send_error('tenant_id, billing_month, and payment_date are required');
    }

    if ($amount_paid < 0) {
        send_error('amount_paid cannot be negative');
    }

    if (!in_array($status, ['Paid', 'Pending', 'Partial'])) {
        send_error('status must be Paid, Pending, or Partial');
    }

    // Verify tenant exists and fetch expected monthly rent
    $t_stmt = $pdo->prepare("
        SELECT t.tenant_id, r.monthly_rent 
        FROM tenants t 
        INNER JOIN rooms r ON t.room_id = r.room_id 
        WHERE t.tenant_id = ?
    ");
    $t_stmt->execute([$tenant_id]);
    $tenant_data = $t_stmt->fetch();

    if (!$tenant_data) {
        send_error('Selected tenant does not exist', 404);
    }

    // Auto-adjust status if pending or partial based on amount paid vs room monthly_rent
    if ($status === 'Paid' && $amount_paid < (float)$tenant_data['monthly_rent'] && $amount_paid > 0) {
        $status = 'Partial';
    } elseif ($status === 'Paid' && $amount_paid == 0) {
        $status = 'Pending';
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO monthly_payments (tenant_id, billing_month, amount_paid, payment_date, status)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$tenant_id, $billing_month, $amount_paid, $payment_date, $status]);
        $new_id = (int)$pdo->lastInsertId();

        send_success(['payment_id' => $new_id], 'Payment record logged successfully', 201);
    } catch (PDOException $e) {
        send_error('Failed to log payment: ' . $e->getMessage(), 500);
    }
}

function handle_put($pdo) {
    $input = get_json_input();

    $payment_id    = isset($input['payment_id']) ? (int)$input['payment_id'] : 0;
    $tenant_id     = isset($input['tenant_id']) ? (int)$input['tenant_id'] : 0;
    $billing_month = sanitize_input($input['billing_month'] ?? '');
    $amount_paid   = isset($input['amount_paid']) ? (float)$input['amount_paid'] : -1.0;
    $payment_date  = sanitize_input($input['payment_date'] ?? '');
    $status        = sanitize_input($input['status'] ?? 'Paid');

    if ($payment_id <= 0 || $tenant_id <= 0 || empty($billing_month) || empty($payment_date)) {
        send_error('Valid payment_id, tenant_id, billing_month, and payment_date are required');
    }

    if ($amount_paid < 0) {
        send_error('amount_paid cannot be negative');
    }

    if (!in_array($status, ['Paid', 'Pending', 'Partial'])) {
        send_error('status must be Paid, Pending, or Partial');
    }

    // Verify payment exists
    $check_stmt = $pdo->prepare("SELECT payment_id FROM monthly_payments WHERE payment_id = ?");
    $check_stmt->execute([$payment_id]);
    if (!$check_stmt->fetch()) {
        send_error('Payment record not found', 404);
    }

    // Verify tenant exists
    $t_stmt = $pdo->prepare("SELECT tenant_id FROM tenants WHERE tenant_id = ?");
    $t_stmt->execute([$tenant_id]);
    if (!$t_stmt->fetch()) {
        send_error('Selected tenant does not exist', 404);
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE monthly_payments 
            SET tenant_id = ?, billing_month = ?, amount_paid = ?, payment_date = ?, status = ?
            WHERE payment_id = ?
        ");
        $stmt->execute([$tenant_id, $billing_month, $amount_paid, $payment_date, $status, $payment_id]);

        send_success(['payment_id' => $payment_id], 'Payment record updated successfully');
    } catch (PDOException $e) {
        send_error('Failed to update payment: ' . $e->getMessage(), 500);
    }
}

function handle_delete($pdo) {
    $input = get_json_input();
    $payment_id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['payment_id']) ? (int)$input['payment_id'] : 0);

    if ($payment_id <= 0) {
        send_error('Valid payment ID is required');
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM monthly_payments WHERE payment_id = ?");
        $stmt->execute([$payment_id]);

        if ($stmt->rowCount() === 0) {
            send_error('Payment record not found or already deleted', 404);
        }

        send_success(['payment_id' => $payment_id], 'Payment record deleted successfully');
    } catch (PDOException $e) {
        send_error('Failed to delete payment record: ' . $e->getMessage(), 500);
    }
}
