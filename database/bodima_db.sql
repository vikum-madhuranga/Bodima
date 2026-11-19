-- ============================================================================
-- Bodima Finder & Tenant Manager Database Schema
-- University of Rajarata - ICT 2308 Database Systems Module
-- Normalization Level: 3rd Normal Form (3NF)
-- Storage Engine: InnoDB
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `bodima_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `bodima_db`;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS `monthly_payments`;
DROP TABLE IF EXISTS `tenants`;
DROP TABLE IF EXISTS `rooms`;
DROP TABLE IF EXISTS `properties`;
DROP TABLE IF EXISTS `owners`;

-- ============================================================================
-- Table 1: owners
-- 3NF: Stores landlord personal info; unique NIC identifies each owner.
-- ============================================================================
CREATE TABLE `owners` (
    `owner_id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(15) NOT NULL,
    `nic_number` VARCHAR(20) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `uq_owner_nic` UNIQUE (`nic_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Table 2: properties
-- 3NF: Represents each boarding house. Foreign key to owners table.
-- Does not duplicate owner information.
-- ============================================================================
CREATE TABLE `properties` (
    `property_id` INT AUTO_INCREMENT PRIMARY KEY,
    `owner_id` INT NOT NULL,
    `property_name` VARCHAR(120) NOT NULL,
    `address` TEXT NOT NULL,
    `gender_type` ENUM('Boys', 'Girls', 'Mixed') NOT NULL DEFAULT 'Boys',
    `utility_notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_properties_owner` FOREIGN KEY (`owner_id`) 
        REFERENCES `owners` (`owner_id`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Table 3: rooms
-- 3NF: Rooms inside a boarding property.
-- Capacity and monthly rent are strictly attributes of the room.
-- ============================================================================
CREATE TABLE `rooms` (
    `room_id` INT AUTO_INCREMENT PRIMARY KEY,
    `property_id` INT NOT NULL,
    `room_number` VARCHAR(30) NOT NULL,
    `capacity` INT NOT NULL,
    `monthly_rent` DECIMAL(10,2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_rooms_property` FOREIGN KEY (`property_id`) 
        REFERENCES `properties` (`property_id`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT `uq_property_room_number` UNIQUE (`property_id`, `room_number`),
    CONSTRAINT `chk_room_capacity` CHECK (`capacity` > 0),
    CONSTRAINT `chk_room_rent` CHECK (`monthly_rent` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Table 4: tenants
-- 3NF: Student tenants residing in a room.
-- References room_id only (property is transitively accessed via rooms).
-- ============================================================================
CREATE TABLE `tenants` (
    `tenant_id` INT AUTO_INCREMENT PRIMARY KEY,
    `room_id` INT NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `nic_or_reg_no` VARCHAR(40) NOT NULL,
    `phone` VARCHAR(15) NOT NULL,
    `check_in_date` DATE NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_tenants_room` FOREIGN KEY (`room_id`) 
        REFERENCES `rooms` (`room_id`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT `uq_tenant_reg_no` UNIQUE (`nic_or_reg_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Table 5: monthly_payments
-- 3NF: Rent payment records per tenant per billing month.
-- ============================================================================
CREATE TABLE `monthly_payments` (
    `payment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `billing_month` VARCHAR(7) NOT NULL, -- Format 'YYYY-MM'
    `amount_paid` DECIMAL(10,2) NOT NULL,
    `payment_date` DATE NOT NULL,
    `status` ENUM('Paid', 'Pending', 'Partial') NOT NULL DEFAULT 'Paid',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_payments_tenant` FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`tenant_id`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT `chk_payment_amount` CHECK (`amount_paid` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Sample Demo Data (Realistic Rajarata / Mihintale Student Area)
-- ============================================================================

-- 1. Owners
INSERT INTO `owners` (`owner_id`, `full_name`, `phone`, `nic_number`) VALUES
(1, 'Bandara Dissanayake', '0771234567', '721893450V'),
(2, 'Kanthi Jayasinghe', '0719876543', '685412980V'),
(3, 'Gamini Senanayake', '0763456789', '810982341V');

-- 2. Properties
INSERT INTO `properties` (`property_id`, `owner_id`, `property_name`, `address`, `gender_type`, `utility_notes`) VALUES
(1, 1, 'Rajarata Royal Mansion', 'No. 42, Kandy Road, Mihintale', 'Boys', 'High-speed fiber Wi-Fi included. Water bill free. Shared electricity split equally.'),
(2, 2, 'Sarasavi Villa', 'Lake View Road, Mihintale', 'Girls', 'Separate electricity sub-meters per room. Filtered drinking water & CCTV security.'),
(3, 3, 'Green Shade Lodge', 'Near Faculty of Applied Sciences, Mihintale', 'Mixed', 'Study desks in each room. Solar hot water showers and bike parking available.');

-- 3. Rooms
INSERT INTO `rooms` (`room_id`, `property_id`, `room_number`, `capacity`, `monthly_rent`) VALUES
-- Rajarata Royal Mansion (Boys)
(1, 1, 'Room A-101', 2, 7500.00),
(2, 1, 'Room A-102', 3, 6500.00),
(3, 1, 'Room A-103 (Single)', 1, 11000.00),
-- Sarasavi Villa (Girls)
(4, 2, 'Room B-201', 2, 8500.00),
(5, 2, 'Room B-202', 2, 8500.00),
(6, 2, 'Room B-203 (Dorm)', 4, 6000.00),
-- Green Shade Lodge (Mixed)
(7, 3, 'Room C-301', 2, 7000.00),
(8, 3, 'Room C-302', 3, 6000.00);

-- 4. Tenants
INSERT INTO `tenants` (`tenant_id`, `room_id`, `full_name`, `nic_or_reg_no`, `phone`, `check_in_date`) VALUES
-- In Room A-101 (Capacity 2 -> now full: 2/2)
(1, 1, 'Kasun Wickramasinghe', 'RJT/2022/ICT/012', '0778901234', '2026-01-10'),
(2, 1, 'Charith Madushanka', 'RJT/2022/ICT/045', '0714567890', '2026-01-15'),
-- In Room A-102 (Capacity 3 -> 1/3 occupied)
(3, 2, 'Nimal Siriwardena', 'RJT/2023/BS/089', '0761122334', '2026-02-01'),
-- In Room B-201 (Capacity 2 -> now full: 2/2)
(4, 4, 'Dinithi Fernando', 'RJT/2022/MGT/102', '0723456781', '2026-01-20'),
(5, 4, 'Oshadi Senarath', 'RJT/2022/AS/088', '0756789012', '2026-02-05'),
-- In Room B-203 (Capacity 4 -> 1/4 occupied)
(6, 6, 'Thilini Rathnayake', 'RJT/2023/ICT/034', '0701234567', '2026-02-10'),
-- In Room C-301 (Capacity 2 -> 1/2 occupied)
(7, 7, 'Malith Perera', 'RJT/2021/ICT/078', '0789012345', '2026-01-05');

-- 5. Monthly Payments
INSERT INTO `monthly_payments` (`payment_id`, `tenant_id`, `billing_month`, `amount_paid`, `payment_date`, `status`) VALUES
(1, 1, '2026-02', 7500.00, '2026-02-02', 'Paid'),
(2, 2, '2026-02', 7500.00, '2026-02-04', 'Paid'),
(3, 3, '2026-02', 6500.00, '2026-02-06', 'Paid'),
(4, 4, '2026-02', 8500.00, '2026-02-01', 'Paid'),
(5, 5, '2026-02', 8500.00, '2026-02-05', 'Paid'),
(6, 6, '2026-02', 3000.00, '2026-02-10', 'Partial'),
(7, 7, '2026-02', 7000.00, '2026-02-03', 'Paid'),
(8, 1, '2026-03', 7500.00, '2026-03-02', 'Paid'),
(9, 2, '2026-03', 7500.00, '2026-03-03', 'Paid'),
(10, 3, '2026-03', 0.00, '2026-03-01', 'Pending'),
(11, 4, '2026-03', 8500.00, '2026-03-01', 'Paid'),
(12, 5, '2026-03', 8500.00, '2026-03-04', 'Paid'),
(13, 6, '2026-03', 6000.00, '2026-03-08', 'Paid'),
(14, 7, '2026-03', 4000.00, '2026-03-05', 'Partial');
