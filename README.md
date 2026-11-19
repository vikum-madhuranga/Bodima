# Bodima (බෝඩිම) - Boarding House Finder & Tenant Manager
**Course Module:** ICT 2308 - Database Systems  
**Faculty / University:** Rajarata University of Sri Lanka  

Bodima is a full-stack property and university student accommodation management system. It replaces manual logbooks by managing landlords, boarding houses, room capacities, tenant assignments, and monthly rent collection with relational database integrity (3NF).

---

## 1. System Architecture & Tech Stack

```
Bodima_system/
│
├── database/
│   └── bodima_db.sql           # MySQL 3NF relational schema + demo data
│
├── backend/                    # Pure PHP REST API (PDO, Prepared Statements)
│   ├── db.php                  # Database connection, CORS, & input sanitizer
│   ├── dashboard.php           # Aggregated KPI metrics & analytics
│   ├── owners.php              # Full CRUD for landlords
│   ├── properties.php          # Full CRUD for boarding houses (INNER JOIN owners)
│   ├── rooms.php               # Full CRUD for rooms & live occupancy calculation
│   ├── tenants.php             # Full CRUD for student tenants (capacity validation)
│   └── payments.php            # Full CRUD for monthly rent tracking
│
├── frontend/                   # React.js (Vite) Single-Page Application
│   ├── src/
│   │   ├── components/         # Dashboard, Properties, Rooms, Tenants, Payments
│   │   ├── api.js              # Centralized API service (calls http://localhost:8000)
│   │   ├── App.jsx             # Main application layout & global state
│   │   ├── index.css           # Sleek dark theme with emerald-green accents
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 2. Database Design (3rd Normal Form - 3NF)

The database schema is strictly designed in **3NF** with the `InnoDB` storage engine to guarantee ACID compliance and relational integrity:

1. **`owners`** (`owner_id` PK, `full_name`, `phone`, `nic_number` UNIQUE)
   - Stores landlord information. Identifiable by unique National Identity Card (NIC).
2. **`properties`** (`property_id` PK, `owner_id` FK, `property_name`, `address`, `gender_type`, `utility_notes`)
   - Normalization: Avoids redundant owner contact data inside property records.
3. **`rooms`** (`room_id` PK, `property_id` FK, `room_number`, `capacity`, `monthly_rent`)
   - Normalization: `capacity` and `monthly_rent` depend strictly on `room_id`. Composite uniqueness on `(property_id, room_number)`.
4. **`tenants`** (`tenant_id` PK, `room_id` FK, `full_name`, `nic_or_reg_no` UNIQUE, `phone`, `check_in_date`)
   - Normalization: Foreign key points directly to `room_id`. Eliminates transitive functional dependencies (`tenant -> room -> property`).
5. **`monthly_payments`** (`payment_id` PK, `tenant_id` FK, `billing_month`, `amount_paid`, `payment_date`, `status`)
   - Logs monthly rent transactions (`Paid`, `Pending`, `Partial`).

---

## 3. Quick Start & Setup Guide

### Step 1: Import Database into phpMyAdmin (WampServer)
1. Ensure **WampServer** is running (green icon in Windows taskbar).
2. Open your web browser and navigate to `http://localhost/phpmyadmin`.
3. Log in (default username: `root`, password: *(leave blank)*).
4. Click on the **Import** tab at the top.
5. Click **Choose File** and select:
   ```
   E:\VIKUM\uni docs\2.2\Bodima_system\database\bodima_db.sql
   ```
6. Click **Import** (or **Go**) at the bottom.
   > The database `bodima_db` will be created with all 5 normalized tables and realistic sample records around Mihintale / Rajarata University.

---

### Step 2: Start the PHP Backend REST API
Open a terminal (PowerShell or Command Prompt) and run:
```powershell
cd "E:\VIKUM\uni docs\2.2\Bodima_system\backend"
php -S localhost:8000
```
*(If `php` is not registered in your Windows PATH, you can run WampServer's PHP directly):*
```powershell
& "C:\wamp64\bin\php\php8.2.26\php.exe" -S localhost:8000
```
The REST API will now be listening at `http://localhost:8000`.

---

### Step 3: Start the React Frontend Application
Open a second terminal window and run:
```powershell
cd "E:\VIKUM\uni docs\2.2\Bodima_system\frontend"
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 4. Key Highlights & Integrity Features
- **Strict Overbooking Prevention:** Neither the frontend dropdown nor the backend API allows assigning a tenant to a room whose current occupancy has reached its capacity limit.
- **SQL Injection Prevention:** All PHP API endpoints use PDO Prepared Statements.
- **Foreign Key Safety:** `ON DELETE RESTRICT` constraints ensure rooms or properties with active dependencies cannot be deleted accidentally.
- **Sri Lankan Validations:** 10-digit Sri Lankan phone number format verification (`07XXXXXXXX`) and student registration / NIC checks.
