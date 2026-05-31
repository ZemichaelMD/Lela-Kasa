import { SQLiteDatabase } from "expo-sqlite";

export async function migrate(db: SQLiteDatabase) {
  const { user_version } = (await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  )) || { user_version: 0 };

  console.log(`Current database version: ${user_version}`);

  if (user_version < 6) {
    console.log("Migrating to version 6 (Clean Schema)");
    // We are doing a full reset for version 6 to ensure schema consistency
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      DROP TABLE IF EXISTS sync_state;
      DROP TABLE IF EXISTS outbox;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS shops;
      DROP TABLE IF EXISTS permissions;
      DROP TABLE IF EXISTS customers;
      DROP TABLE IF EXISTS customer_ledger_entries;
      DROP TABLE IF EXISTS beverages;
      DROP TABLE IF EXISTS price_tiers;
      DROP TABLE IF EXISTS beverage_prices;
      DROP TABLE IF EXISTS payment_accounts;
      DROP TABLE IF EXISTS sales;
      DROP TABLE IF EXISTS sale_lines;
      DROP TABLE IF EXISTS payments;
      DROP TABLE IF EXISTS sale_container_kasas;
      DROP TABLE IF EXISTS sale_returned_containers;
      DROP TABLE IF EXISTS stock_movements;
      DROP TABLE IF EXISTS tier_prices;

      -- Sync State
      CREATE TABLE sync_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        shop_id TEXT,
        last_sync_cursor TEXT,
        last_sync_at DATETIME,
        last_bootstrap_at DATETIME
      );

      -- Outbox
      CREATE TABLE outbox (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        actor_user_id TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        client_mutation_id TEXT UNIQUE NOT NULL,
        idempotency_key TEXT UNIQUE NOT NULL,
        operation TEXT NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        body_json TEXT,
        depends_on_json TEXT,
        status TEXT DEFAULT 'pending',
        attempt_count INTEGER DEFAULT 0,
        last_error_code TEXT,
        last_error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_outbox_status ON outbox(status);
      CREATE INDEX idx_outbox_shop ON outbox(shop_id);

      -- Users
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        shop_id TEXT,
        name TEXT,
        email TEXT,
        role TEXT,
        phone TEXT,
        avatar_url TEXT,
        server_version INTEGER DEFAULT 0,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );

      -- Shops
      CREATE TABLE shops (
        id TEXT PRIMARY KEY,
        owner_id TEXT,
        name TEXT,
        phone TEXT,
        address TEXT,
        currency TEXT DEFAULT 'ETB',
        timezone TEXT,
        low_stock_threshold INTEGER DEFAULT 10,
        default_price_tier_id TEXT,
        server_version INTEGER DEFAULT 0,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );

      -- Permissions
      CREATE TABLE permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        granted INTEGER DEFAULT 1,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME
      );

      -- Customers
      CREATE TABLE customers (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        notes TEXT,
        credit_balance_cents INTEGER DEFAULT 0,
        outstanding_boxes INTEGER DEFAULT 0,
        outstanding_bottles INTEGER DEFAULT 0,
        price_tier_id TEXT,
        price_tier_locked INTEGER DEFAULT 0,
        server_version INTEGER DEFAULT 0,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );
      CREATE INDEX idx_customers_shop ON customers(shop_id);

      -- Customer Ledger Entries
      CREATE TABLE customer_ledger_entries (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        type TEXT NOT NULL,
        date DATETIME NOT NULL,
        data_json TEXT,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );
      CREATE INDEX idx_ledger_customer ON customer_ledger_entries(customer_id);

      -- Beverages
      CREATE TABLE beverages (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        name TEXT NOT NULL,
        brand TEXT,
        size_ml INTEGER,
        bottles_per_box INTEGER DEFAULT 24,
        image_url TEXT,
        is_active INTEGER DEFAULT 1,
        stock_bottles INTEGER DEFAULT 0,
        server_version INTEGER DEFAULT 0,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );

      -- Price Tiers
      CREATE TABLE price_tiers (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT DEFAULT 'retail',
        is_default INTEGER DEFAULT 0,
        server_version INTEGER DEFAULT 0,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );

      -- Beverage Prices
      CREATE TABLE beverage_prices (
        id TEXT PRIMARY KEY,
        beverage_id TEXT NOT NULL,
        price_tier_id TEXT NOT NULL,
        price_per_box_cents INTEGER NOT NULL,
        price_per_bottle_cents INTEGER NOT NULL,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME
      );

      -- Payment Accounts
      CREATE TABLE payment_accounts (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        holder_name TEXT,
        bank_name TEXT,
        account_number TEXT,
        is_active INTEGER DEFAULT 1,
        notes TEXT,
        server_version INTEGER DEFAULT 0,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );

      -- Sales
      CREATE TABLE sales (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        customer_id TEXT,
        price_tier_id TEXT NOT NULL,
        sale_date DATETIME NOT NULL,
        status TEXT DEFAULT 'CONFIRMED',
        subtotal_cents INTEGER DEFAULT 0,
        paid_cents INTEGER DEFAULT 0,
        credit_delta_cents INTEGER DEFAULT 0,
        boxes_out_delta INTEGER DEFAULT 0,
        bottles_out_delta INTEGER DEFAULT 0,
        boxes_returned_on_sale INTEGER DEFAULT 0,
        bottles_returned_on_sale INTEGER DEFAULT 0,
        notes TEXT,
        voided_at DATETIME,
        void_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        server_version INTEGER DEFAULT 0,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );
      CREATE INDEX idx_sales_shop ON sales(shop_id);

      -- Sale Lines
      CREATE TABLE sale_lines (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        sale_id TEXT NOT NULL,
        beverage_id TEXT NOT NULL,
        boxes INTEGER DEFAULT 0,
        bottles INTEGER DEFAULT 0,
        price_per_box_cents INTEGER NOT NULL,
        price_per_bottle_cents INTEGER NOT NULL,
        line_total_cents INTEGER NOT NULL,
        server_version INTEGER DEFAULT 0,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );

      -- Payments
      CREATE TABLE payments (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        sale_id TEXT,
        customer_id TEXT,
        payment_account_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        method TEXT NOT NULL,
        reference TEXT,
        notes TEXT,
        paid_at DATETIME,
        voided_at DATETIME,
        server_version INTEGER DEFAULT 0,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );

      -- Sale Container Kasas
      CREATE TABLE sale_container_kasas (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        sale_id TEXT NOT NULL,
        beverage_id TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        local_updated_at DATETIME,
        server_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );

      -- Sale Returned Containers
      CREATE TABLE sale_returned_containers (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        sale_id TEXT NOT NULL,
        beverage_id TEXT NOT NULL,
        boxes INTEGER DEFAULT 0,
        bottles INTEGER DEFAULT 0,
        local_updated_at DATETIME,
        server_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );

      -- Stock Movements
      CREATE TABLE stock_movements (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        beverage_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        bottles_delta INTEGER NOT NULL,
        notes TEXT,
        recorded_by_id TEXT,
        sale_id TEXT,
        server_version INTEGER DEFAULT 0,
        server_updated_at DATETIME,
        local_updated_at DATETIME,
        sync_status TEXT DEFAULT 'synced',
        last_synced_at DATETIME,
        deleted_at DATETIME
      );

      PRAGMA user_version = 6;
    `);
  }
}
