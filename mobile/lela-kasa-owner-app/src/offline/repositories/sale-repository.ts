import { getDb } from '../db/database';

export interface LocalSale {
  id: string;
  shopId: string;
  customerId?: string | null;
  priceTierId: string;
  saleDate: string;
  status: string;
  subtotalCents: number;
  paidCents: number;
  creditDeltaCents: number;
  boxesOutDelta: number;
  bottlesOutDelta: number;
  boxesReturnedOnSale: number;
  bottlesReturnedOnSale: number;
  notes?: string | null;
  syncStatus: string;
  deletedAt?: string | null;
}

export interface LocalSaleLine {
  id: string;
  saleId: string;
  beverageId: string;
  boxes: number;
  bottles: number;
  pricePerBoxCents: number;
  pricePerBottleCents: number;
  lineTotalCents: number;
}

export interface LocalPayment {
  id: string;
  saleId: string;
  customerId?: string | null;
  paymentAccountId: string;
  amountCents: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
  paidAt?: string | null;
  voidedAt?: string | null;
  syncStatus: string;
}

export interface LocalContainerKasa {
  id: string;
  saleId: string;
  beverageId: string;
  count: number;
}

export interface LocalReturnedContainer {
  id: string;
  saleId: string;
  beverageId: string;
  boxes: number;
  bottles: number;
}

export const saleRepository = {
  async getAll(shopId: string, options?: {
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
    status?: string;
    search?: string;
  }): Promise<LocalSale[]> {
    const db = await getDb();
    let sql = 'SELECT * FROM sales WHERE shop_id = ? AND deleted_at IS NULL';
    const params: any[] = [shopId];

    if (options?.dateFrom) {
      sql += ' AND sale_date >= ?';
      params.push(options.dateFrom);
    }
    if (options?.dateTo) {
      sql += ' AND sale_date <= ?';
      params.push(options.dateTo);
    }
    if (options?.customerId) {
      sql += ' AND customer_id = ?';
      params.push(options.customerId);
    }
    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    sql += ' ORDER BY sale_date DESC, created_at DESC LIMIT 100';

    return db.getAllAsync<any>(sql, params);
  },

  async getById(id: string): Promise<LocalSale | null> {
    const db = await getDb();
    return db.getFirstAsync<any>(
      'SELECT * FROM sales WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
  },

  async getLines(saleId: string): Promise<LocalSaleLine[]> {
    const db = await getDb();
    return db.getAllAsync<any>(
      'SELECT * FROM sale_lines WHERE sale_id = ? AND deleted_at IS NULL',
      [saleId],
    );
  },

  async getPayments(saleId: string): Promise<LocalPayment[]> {
    const db = await getDb();
    return db.getAllAsync<any>(
      'SELECT * FROM payments WHERE sale_id = ? AND deleted_at IS NULL',
      [saleId],
    );
  },

  async getContainerKasas(saleId: string): Promise<LocalContainerKasa[]> {
    const db = await getDb();
    return db.getAllAsync<any>(
      'SELECT * FROM sale_container_kasas WHERE sale_id = ? AND deleted_at IS NULL',
      [saleId],
    );
  },

  async getReturnedContainers(saleId: string): Promise<LocalReturnedContainer[]> {
    const db = await getDb();
    return db.getAllAsync<any>(
      'SELECT * FROM sale_returned_containers WHERE sale_id = ? AND deleted_at IS NULL',
      [saleId],
    );
  },

  async upsert(sale: any): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO sales (id, shop_id, customer_id, price_tier_id, sale_date,
        status, subtotal_cents, paid_cents, credit_delta_cents,
        boxes_out_delta, bottles_out_delta, boxes_returned_on_sale, bottles_returned_on_sale,
        notes, voided_at, void_reason,
        server_version, server_updated_at, local_updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), 'synced', datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
        customer_id = ?, price_tier_id = ?, sale_date = ?,
        status = ?, subtotal_cents = ?, paid_cents = ?, credit_delta_cents = ?,
        boxes_out_delta = ?, bottles_out_delta = ?,
        boxes_returned_on_sale = ?, bottles_returned_on_sale = ?,
        notes = ?, voided_at = ?, void_reason = ?,
        server_updated_at = ?, sync_status = 'synced', last_synced_at = datetime('now')`,
      [
        sale.id, sale.shopId, sale.customerId ?? null, sale.priceTierId, sale.saleDate,
        sale.status ?? 'active', sale.subtotalCents ?? 0, sale.paidCents ?? 0, sale.creditDeltaCents ?? 0,
        sale.boxesOutDelta ?? 0, sale.bottlesOutDelta ?? 0,
        sale.boxesReturnedOnSale ?? 0, sale.bottlesReturnedOnSale ?? 0,
        sale.notes ?? null, sale.voidedAt ?? null, sale.voidReason ?? null,
        sale.updatedAt ?? null,
        sale.customerId ?? null, sale.priceTierId, sale.saleDate,
        sale.status ?? 'active', sale.subtotalCents ?? 0, sale.paidCents ?? 0, sale.creditDeltaCents ?? 0,
        sale.boxesOutDelta ?? 0, sale.bottlesOutDelta ?? 0,
        sale.boxesReturnedOnSale ?? 0, sale.bottlesReturnedOnSale ?? 0,
        sale.notes ?? null, sale.voidedAt ?? null, sale.voidReason ?? null,
        sale.updatedAt ?? null,
      ],
    );
  },
};
