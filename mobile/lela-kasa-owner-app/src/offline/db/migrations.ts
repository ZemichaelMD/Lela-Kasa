import type { SQLiteDatabase } from 'expo-sqlite';

const MIGRATIONS: string[] = [
  // V1: Core tables
  `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    cursor TEXT,
    last_bootstrap_at TEXT,
    last_pull_at TEXT,
    last_successful_sync_at TEXT,
    is_syncing INTEGER DEFAULT 0
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    client_mutation_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    operation TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    body_json TEXT,
    depends_on_json TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    attempt_count INTEGER DEFAULT 0,
    last_error_code TEXT,
    last_error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_outbox_shop_status
    ON outbox(shop_id, status, created_at);
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_outbox_client_mutation
    ON outbox(client_mutation_id);
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_outbox_idempotency
    ON outbox(idempotency_key);
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_outbox_entity
    ON outbox(entity_type, entity_id);
  `,
  `
  CREATE TABLE IF NOT EXISTS conflicts (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    local_version INTEGER,
    server_version INTEGER,
    local_body_json TEXT,
    server_body_json TEXT,
    status TEXT NOT NULL DEFAULT 'unresolved',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_conflicts_shop
    ON conflicts(shop_id, status);
  `,
  `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    description TEXT,
    email TEXT,
    website TEXT,
    currency TEXT DEFAULT 'ETB',
    timezone TEXT DEFAULT 'Africa/Addis_Ababa',
    low_stock_threshold INTEGER DEFAULT 10,
    default_price_tier_id TEXT,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    granted INTEGER NOT NULL DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    UNIQUE(shop_id, slug)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    email_verified INTEGER DEFAULT 0,
    notes TEXT,
    credit_balance_cents INTEGER DEFAULT 0,
    outstanding_boxes INTEGER DEFAULT 0,
    outstanding_bottles INTEGER DEFAULT 0,
    price_tier_id TEXT,
    price_tier_locked INTEGER DEFAULT 0,
    username TEXT,
    must_change_password INTEGER DEFAULT 0,
    password_changed_at TEXT,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_customers_shop
    ON customers(shop_id, sync_status);
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_customers_search
    ON customers(name, phone);
  `,
  `
  CREATE TABLE IF NOT EXISTS customer_ledger_entries (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    data_json TEXT NOT NULL,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_ledger_customer
    ON customer_ledger_entries(customer_id, date);
  `,
  `
  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    customer_id TEXT,
    price_tier_id TEXT NOT NULL,
    sale_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    subtotal_cents INTEGER DEFAULT 0,
    paid_cents INTEGER DEFAULT 0,
    credit_delta_cents INTEGER DEFAULT 0,
    boxes_out_delta INTEGER DEFAULT 0,
    bottles_out_delta INTEGER DEFAULT 0,
    boxes_returned_on_sale INTEGER DEFAULT 0,
    bottles_returned_on_sale INTEGER DEFAULT 0,
    notes TEXT,
    voided_at TEXT,
    void_reason TEXT,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_sales_shop
    ON sales(shop_id, sale_date, status);
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_sales_customer
    ON sales(customer_id);
  `,
  `
  CREATE TABLE IF NOT EXISTS sale_lines (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    sale_id TEXT NOT NULL,
    beverage_id TEXT NOT NULL,
    boxes INTEGER DEFAULT 0,
    bottles INTEGER DEFAULT 0,
    price_per_box_cents INTEGER DEFAULT 0,
    price_per_bottle_cents INTEGER DEFAULT 0,
    line_total_cents INTEGER DEFAULT 0,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_sale_lines_sale
    ON sale_lines(sale_id);
  `,
  `
  CREATE TABLE IF NOT EXISTS sale_container_kasas (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    sale_id TEXT NOT NULL,
    beverage_id TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_kasas_sale
    ON sale_container_kasas(sale_id);
  `,
  `
  CREATE TABLE IF NOT EXISTS sale_returned_containers (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    sale_id TEXT NOT NULL,
    beverage_id TEXT NOT NULL,
    boxes INTEGER DEFAULT 0,
    bottles INTEGER DEFAULT 0,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_returned_containers_sale
    ON sale_returned_containers(sale_id);
  `,
  `
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    sale_id TEXT,
    customer_id TEXT,
    payment_account_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    method TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    paid_at TEXT,
    voided_at TEXT,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_payments_sale
    ON payments(sale_id);
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_payments_customer
    ON payments(customer_id);
  `,
  `
  CREATE TABLE IF NOT EXISTS beverages (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    size_ml INTEGER,
    bottles_per_box INTEGER DEFAULT 24,
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    stock_bottles INTEGER DEFAULT 0,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_beverages_shop
    ON beverages(shop_id, is_active);
  `,
  `
  CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    beverage_id TEXT NOT NULL,
    delta_bottles INTEGER NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    recorded_by_id TEXT,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_stock_movements_beverage
    ON stock_movements(beverage_id);
  `,
  `
  CREATE TABLE IF NOT EXISTS price_tiers (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT DEFAULT 'standard',
    is_default INTEGER DEFAULT 0,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS tier_prices (
    id TEXT PRIMARY KEY,
    price_tier_id TEXT NOT NULL,
    beverage_id TEXT NOT NULL,
    price_per_box_cents INTEGER NOT NULL DEFAULT 0,
    price_per_bottle_cents INTEGER NOT NULL DEFAULT 0,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_tier_prices_tier
    ON tier_prices(price_tier_id);
  `,
  `
  CREATE TABLE IF NOT EXISTS payment_accounts (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    holder_name TEXT,
    bank_name TEXT,
    account_number TEXT,
    is_active INTEGER DEFAULT 1,
    notes TEXT,
    server_version INTEGER DEFAULT 1,
    server_updated_at TEXT,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    deleted_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_payment_accounts_shop
    ON payment_accounts(shop_id, is_active);
  `,
  `
  CREATE TABLE IF NOT EXISTS dashboard_snapshots (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS report_snapshots (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    report_type TEXT NOT NULL,
    filter_json TEXT,
    snapshot_json TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_report_snapshots_type
    ON report_snapshots(shop_id, report_type);
  `,
  // Insert initial sync state
  `
  INSERT OR IGNORE INTO sync_state (id) VALUES (1);
  `,
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  for (const sql of MIGRATIONS) {
    await db.execAsync(sql);
  }
}
