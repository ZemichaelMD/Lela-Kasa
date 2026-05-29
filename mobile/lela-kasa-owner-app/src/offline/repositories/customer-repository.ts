import { getDb } from '../db/database';

export interface LocalCustomer {
  id: string;
  shopId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  emailVerified: boolean;
  notes?: string | null;
  creditBalanceCents: number;
  outstandingBoxes: number;
  outstandingBottles: number;
  priceTierId?: string | null;
  priceTierLocked: boolean;
  username?: string | null;
  syncStatus: string;
  deletedAt?: string | null;
}

export interface LedgerEntryRow {
  id: string;
  customerId: string;
  type: string;
  date: string;
  dataJson: string;
  syncStatus: string;
}

export const customerRepository = {
  async getAll(shopId: string): Promise<LocalCustomer[]> {
    const db = await getDb();
    return db.getAllAsync<any>(
      `SELECT * FROM customers WHERE shop_id = ? AND deleted_at IS NULL
       ORDER BY name ASC`,
      [shopId],
    );
  },

  async search(shopId: string, query: string): Promise<LocalCustomer[]> {
    const db = await getDb();
    return db.getAllAsync<any>(
      `SELECT * FROM customers WHERE shop_id = ? AND deleted_at IS NULL
       AND (name LIKE ? OR phone LIKE ?)
       ORDER BY name ASC
       LIMIT 50`,
      [shopId, `%${query}%`, `%${query}%`],
    );
  },

  async getById(id: string): Promise<LocalCustomer | null> {
    const db = await getDb();
    return db.getFirstAsync<any>(
      'SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
  },

  async getLedger(customerId: string): Promise<LedgerEntryRow[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM customer_ledger_entries
       WHERE customer_id = ? AND deleted_at IS NULL
       ORDER BY date DESC`,
      [customerId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      customerId: r.customer_id,
      type: r.type,
      date: r.date,
      dataJson: r.data_json,
      syncStatus: r.sync_status,
    }));
  },

  async upsert(customer: any): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO customers (id, shop_id, name, phone, email, notes,
        credit_balance_cents, outstanding_boxes, outstanding_bottles,
        price_tier_id, price_tier_locked, username,
        server_version, server_updated_at, local_updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), 'synced', datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
        name = ?, phone = ?, email = ?, notes = ?,
        credit_balance_cents = ?, outstanding_boxes = ?, outstanding_bottles = ?,
        price_tier_id = ?, price_tier_locked = ?, username = ?,
        server_updated_at = ?, sync_status = 'synced', last_synced_at = datetime('now')`,
      [
        customer.id, customer.shopId, customer.name, customer.phone ?? null, customer.email ?? null,
        customer.notes ?? null, customer.creditBalanceCents ?? 0,
        customer.outstandingBoxes ?? 0, customer.outstandingBottles ?? 0,
        customer.priceTierId ?? null, customer.priceTierLocked ? 1 : 0, customer.username ?? null,
        customer.updatedAt ?? null,
        customer.name, customer.phone ?? null, customer.email ?? null, customer.notes ?? null,
        customer.creditBalanceCents ?? 0,
        customer.outstandingBoxes ?? 0, customer.outstandingBottles ?? 0,
        customer.priceTierId ?? null, customer.priceTierLocked ? 1 : 0, customer.username ?? null,
        customer.updatedAt ?? null,
      ],
    );
  },
};
