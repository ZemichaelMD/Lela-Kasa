# Local Database Schema (SQLite)

## Base Metadata
Every domain table MUST include these columns to support syncing:
- `local_id`: STRING (CUID/UUID generated on mobile)
- `server_id`: STRING (NULL if not yet synced)
- `sync_status`: STRING (`'synced'`, `'pending'`, `'failed'`, `'conflicted'`)
- `last_synced_at`: DATETIME
- `server_version`: INTEGER (For optimistic locking/conflicts)

## Tables

### 1. System & Sync
- **`sync_state`**: Stores `last_sync_cursor`, `last_sync_at`, `shop_id`.
- **`outbox`**: 
    - `id`, `entity_type`, `entity_id`, `operation` (CREATE/UPDATE), `payload_json`, `status`, `attempts`, `error_message`, `created_at`.

### 2. Shop Identity (Read-only Offline)
- **`users`**: Current user profile.
- **`shops`**: Current shop details, settings, currency.
- **`permissions`**: Cached user permissions.

### 3. Core Domain (Read/Write)
- **`customers`**: `name`, `phone`, `credit_balance`, `outstanding_boxes`, `price_tier_id`.
- **`beverages`**: `name`, `brand`, `stock_bottles`, `bottles_per_box`, `isActive`.
- **`price_tiers`**: `name`, `isDefault`.
- **`beverage_prices`**: `beverage_id`, `price_tier_id`, `price_per_box`, `price_per_bottle`.
- **`payment_accounts`**: `name`, `kind`, `account_number`, `isActive`.

### 4. Transactions (Write Heavy)
- **`sales`**: 
    - `customer_id`, `sale_date`, `subtotal`, `paid`, `status`, `price_tier_id`, `notes`.
- **`sale_lines`**: 
    - `sale_id`, `beverage_id`, `boxes`, `bottles`, `price_per_box`, `price_per_bottle`, `total`.
- **`payments`**: 
    - `sale_id` (optional), `customer_id`, `amount`, `method`, `payment_account_id`, `reference`, `paid_at`.
- **`sale_container_kasas`**: `sale_id`, `beverage_id`, `count`.
- **`sale_returned_containers`**: `sale_id`, `beverage_id`, `boxes`, `bottles`.
- **`stock_movements`**: `beverage_id`, `reason`, `bottles_delta`, `sale_id`.

## Projections (Derived State)
The mobile app must update these fields locally *before* sync to keep the UI accurate:
- `beverages.stock_bottles`: Updated after Sale or Stock Adjustment.
- `customers.credit_balance`: Updated after Sale or Payment.
- `customers.outstanding_boxes/bottles`: Updated after Sale or Return.

## Indexes
- All tables: Index on `local_id`, `server_id`, `sync_status`.
- `customers`: Index on `name` (for search).
- `sales`: Index on `sale_date`, `customer_id`.
- `beverage_prices`: Compound index on `(beverage_id, price_tier_id)`.
