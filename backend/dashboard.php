<?php
/**
 * REST API Endpoint: Dashboard Analytics & Overview
 * Aggregates statistics for summary cards & quick insights
 */
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_error('Method Not Allowed', 405);
}

try {
    // 1. Total Owners
    $owners_count = (int)$pdo->query("SELECT COUNT(*) FROM owners")->fetchColumn();

    // 2. Total Properties
    $properties_count = (int)$pdo->query("SELECT COUNT(*) FROM properties")->fetchColumn();

    // 3. Total Rooms & Total Capacity
    $rooms_stats = $pdo->query("
        SELECT 
            COUNT(*) AS total_rooms,
            COALESCE(SUM(capacity), 0) AS total_capacity
        FROM rooms
    ")->fetch();
    $total_rooms = (int)$rooms_stats['total_rooms'];
    $total_capacity = (int)$rooms_stats['total_capacity'];

    // 4. Total Active Tenants
    $total_tenants = (int)$pdo->query("SELECT COUNT(*) FROM tenants")->fetchColumn();

    // 5. Vacant Beds
    $vacant_beds = max(0, $total_capacity - $total_tenants);

    // 6. Monthly Revenue (Current Month and All-time)
    $current_month = date('Y-m');
    $revenue_stmt = $pdo->prepare("
        SELECT COALESCE(SUM(amount_paid), 0) 
        FROM monthly_payments 
        WHERE billing_month = ?
    ");
    $revenue_stmt->execute([$current_month]);
    $current_month_revenue = (float)$revenue_stmt->fetchColumn();

    $all_time_revenue = (float)$pdo->query("
        SELECT COALESCE(SUM(amount_paid), 0) FROM monthly_payments
    ")->fetchColumn();

    // 7. Payment status breakdown
    $payment_status_breakdown = $pdo->query("
        SELECT status, COUNT(*) AS count, COALESCE(SUM(amount_paid), 0) AS total_amount
        FROM monthly_payments
        GROUP BY status
    ")->fetchAll();

    // 8. Recent 5 Payments
    $recent_payments = $pdo->query("
        SELECT 
            mp.payment_id,
            mp.billing_month,
            mp.amount_paid,
            mp.payment_date,
            mp.status,
            t.full_name AS tenant_name,
            r.room_number,
            p.property_name
        FROM monthly_payments mp
        INNER JOIN tenants t ON mp.tenant_id = t.tenant_id
        INNER JOIN rooms r ON t.room_id = r.room_id
        INNER JOIN properties p ON r.property_id = p.property_id
        ORDER BY mp.payment_date DESC, mp.payment_id DESC
        LIMIT 6
    ")->fetchAll();

    // 9. Property summary with occupancy
    $property_occupancies = $pdo->query("
        SELECT 
            p.property_id,
            p.property_name,
            p.gender_type,
            COUNT(DISTINCT r.room_id) AS room_count,
            COALESCE(SUM(r.capacity), 0) AS total_capacity,
            (SELECT COUNT(*) FROM tenants t 
             JOIN rooms rm ON t.room_id = rm.room_id 
             WHERE rm.property_id = p.property_id) AS occupied_beds
        FROM properties p
        LEFT JOIN rooms r ON p.property_id = r.property_id
        GROUP BY p.property_id
        ORDER BY p.property_id ASC
    ")->fetchAll();

    send_json([
        'success' => true,
        'data' => [
            'summary' => [
                'total_owners'          => $owners_count,
                'total_properties'      => $properties_count,
                'total_rooms'           => $total_rooms,
                'total_capacity'        => $total_capacity,
                'total_tenants'         => $total_tenants,
                'vacant_beds'           => $vacant_beds,
                'current_month'         => $current_month,
                'current_month_revenue' => $current_month_revenue,
                'all_time_revenue'      => $all_time_revenue
            ],
            'recent_payments'      => $recent_payments,
            'property_occupancies' => $property_occupancies,
            'payment_breakdown'    => $payment_status_breakdown
        ]
    ]);
} catch (PDOException $e) {
    send_error('Failed to load dashboard metrics: ' . $e->getMessage(), 500);
}
