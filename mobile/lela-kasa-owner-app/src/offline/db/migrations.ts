import { SQLiteDatabase } from "expo-sqlite";

export async function migrate(db: SQLiteDatabase) {
  const { user_version } = (await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  )) || { user_version: 0 };

  if (user_version >= 2) return;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    -- Sync State
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shop_id TEXT,
      last_sync_cursor TEXT,
      last_sync_at DATETIME
    );

    -- Outbox
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      error_message TEXT,
      client_mutation_id TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- System Tables
    CREATE TABLE IF NOT EXISTS users (
      local_id TEXT PRIMARY KEY,
      server_id TEXT UNIQUE,
      email TEXT,
      name TEXT,
      role TEXT,
      shop_id TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_synced_at DATETIME,
      server_version INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shops (
      local_id TEXT PRIMARY KEY,
      server_id TEXT UNIQUE,
      name TEXT,
      currency TEXT DEFAULT 'ETB',
      owner_id TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_synced_at DATETIME,
      server_version INTEGER DEFAULT 0
    );

    -- Domain Tables
    CREATE TABLE IF NOT EXISTS customers (
      local_id TEXT PRIMARY KEY,
      server_id TEXT UNIQUE,
      shop_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      credit_balance_cents INTEGER DEFAULT 0,
      outstanding_boxes INTEGER DEFAULT 0,
      outstanding_bottles INTEGER DEFAULT 0,
      price_tier_id TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_synced_at DATETIME,
      server_version INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS beverages (
      local_id TEXT PRIMARY KEY,
      server_id TEXT UNIQUE,
      shop_id TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      bottles_per_box INTEGER DEFAULT 24,
      stock_bottles INTEGER DEFAULT 0,
      isActive INTEGER DEFAULT 1,
      sync_status TEXT DEFAULT 'synced',
      last_synced_at DATETIME,
      server_version INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS price_tiers (
      local_id TEXT PRIMARY KEY,
      server_id TEXT UNIQUE,
      shop_id TEXT NOT NULL,
      name TEXT NOT NULL,
      isDefault INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'synced',
      last_synced_at DATETIME,
      server_version INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS beverage_prices (
      local_id TEXT PRIMARY KEY,
      server_id TEXT UNIQUE,
      beverage_id TEXT NOT NULL,
      price_tier_id TEXT NOT NULL,
      price_per_box_cents INTEGER NOT NULL,
      price_per_bottle_cents INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'synced',
      last_synced_at DATETIME,
      server_version INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS payment_accounts (
      local_id TEXT PRIMARY KEY,
      server_id TEXT UNIQUE,
      shop_id TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      account_number TEXT,
      isActive INTEGER DEFAULT 1,
      sync_status TEXT DEFAULT 'synced',
      last_synced_at DATETIME,
      server_version INTEGER DEFAULT 0
    );

    -- Transaction Tables
    CREATE TABLE IF NOT EXISTS sales (
      local_id TEXT PRIMARY KEY,
      server_id TEXT UNIQUE,
      shop_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      sale_date DATETIME NOT NULL,
      subtotal_cents INTEGER DEFAULT 0,
      paid_cents INTEGER DEFAULT 0,
      status TEXT DEFAULT 'CONFIRMED',
      price_tier_id TEXT NOT NULL,
      notes TEXT,
      sync_status TEXT DEFAULT 'pending',
      last_synced_at DATETIME,
      server_version INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sale_lines (
      local_id TEXT PRIMARY KEY,
      server_id TEXT UNIQUE,
      sale_id TEXT NOT NULL,
      beverage_id TEXT NOT NULL,
      boxes INTEGER DEFAULT 0,
      bottles INTEGER DEFAULT 0,
      price_per_box_cents INTEGER NOT NULL,
      price_per_bottle_cents INTEGER NOT NULL,
      line_total_cents INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'pending',
      last_synced_at DATETIME,
      server_version INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS payments (
      local_id TEXT PRIMARY KEY,
      server_id TEXT UNIQUE,
      shop_id TEXT NOT NULL,
      sale_id TEXT,
      customer_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      method TEXT NOT NULL,
      payment_account_id TEXT NOT NULL,
      reference TEXT,
      paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      last_synced_at DATETIME,
      server_version INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sale_container_kasas (
      local_id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      beverage_id TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      sync_status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS sale_returned_containers (
      local_id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      beverage_id TEXT NOT NULL,
      boxes INTEGER DEFAULT 0,
      bottles INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      local_id TEXT PRIMARY KEY,
      server_id TEXT UNIQUE,
      shop_id TEXT NOT NULL,
      beverage_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      bottles_delta INTEGER NOT NULL,
      sale_id TEXT,
      sync_status TEXT DEFAULT 'pending',
      last_synced_at DATETIME,
      server_version INTEGER DEFAULT 0
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
    CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status);
    CREATE INDEX IF NOT EXISTS idx_beverage_prices_lookup ON beverage_prices(beverage_id, price_tier_id);

    PRAGMA user_version = 1;
  `);

  if (user_version < 2) {
    const columns = (await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(outbox)",
    )).map((c) => c.name);

    if (!columns.includes("error_message")) {
      await db.execAsync(`ALTER TABLE outbox ADD COLUMN error_message TEXT;`);
    }

    await db.execAsync(`PRAGMA user_version = 2;`);
  }
}
