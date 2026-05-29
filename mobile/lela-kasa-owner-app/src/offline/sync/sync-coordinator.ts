import { type SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../db/database';
import { isOnline, probeApiHealth } from '../network/netinfo';
import { API_URL, tokenStore } from '../../lib/sdk';
import {
  getPendingOperations,
  updateOperationStatus,
  markOperationSynced,
  getOutboxCounts,
} from '../outbox';
import type { PushResult, SyncSummary } from '../types';

type SyncListener = (summary: SyncSummary) => void;

const listeners = new Set<SyncListener>();

let _isSyncing = false;

let _currentShopId: string | null = null;

export function setCurrentShopId(shopId: string | null) {
  _currentShopId = shopId;
}

export function subscribeToSync(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notifyListeners(summary: SyncSummary) {
  listeners.forEach(fn => fn(summary));
}

export async function getSyncSummary(): Promise<SyncSummary> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ last_successful_sync_at: string | null }>(
    'SELECT last_successful_sync_at FROM sync_state WHERE id = 1',
  );
  const shopId = _currentShopId;

  let pendingCount = 0;
  let failedCount = 0;
  let conflictedCount = 0;
  if (shopId) {
    const counts = await getOutboxCounts(shopId);
    pendingCount = counts.pending;
    failedCount = counts.failed;
    conflictedCount = counts.conflicted;
  }

  return {
    pendingCount,
    failedCount,
    conflictedCount,
    lastSyncedAt: row?.last_successful_sync_at ?? undefined,
    networkState: isOnline() ? 'online' : 'offline',
  };
}

async function authFetch(path: string, options: RequestInit & { idempotencyKey?: string } = {}): Promise<any> {
  const token = await tokenStore.getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = (body as any)?.error ?? {};
    throw Object.assign(new Error(err.message ?? `HTTP ${res.status}`), {
      code: err.code ?? 'UNKNOWN',
      status: res.status,
      details: err.details,
    });
  }

  const body = await res.json();
  return (body as any)?.data ?? body;
}

export async function bootstrapIfNeeded(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ cursor: string | null; last_bootstrap_at: string | null }>(
    'SELECT cursor, last_bootstrap_at FROM sync_state WHERE id = 1',
  );
  if (row?.last_bootstrap_at) return false;
  return doBootstrap();
}

export async function doBootstrap(): Promise<boolean> {
  const online = isOnline() || await probeApiHealth();
  if (!online) return false;

  try {
    const data: any = await authFetch('/api/v1/sync/bootstrap');
    if (!data) return false;

    const db = await getDb();
    await db.execAsync('BEGIN TRANSACTION');
    try {
      if (data.user) await upsertUser(db, data.user);
      if (data.shop) await upsertShop(db, data.shop);
      if (data.permissions) await upsertPermissions(db, data.permissions);
      if (data.customers) await upsertBatch(db, 'customers', data.customers, CUSTOMER_COLS, customerMap);
      if (data.beverages) await upsertBatch(db, 'beverages', data.beverages, BEVERAGE_COLS, beverageMap);
      if (data.priceTiers) await upsertBatch(db, 'price_tiers', data.priceTiers, TIER_COLS, tierMap);
      if (data.tierPrices) await upsertBatch(db, 'tier_prices', data.tierPrices, TIER_PRICE_COLS, tierPriceMap);
      if (data.paymentAccounts) await upsertBatch(db, 'payment_accounts', data.paymentAccounts, ACCOUNT_COLS, accountMap);
      if (data.sales) await upsertBatch(db, 'sales', data.sales, SALE_COLS, saleMap);
      if (data.saleLines) await upsertBatch(db, 'sale_lines', data.saleLines, SALE_LINE_COLS, saleLineMap);
      if (data.payments) await upsertBatch(db, 'payments', data.payments, PAYMENT_COLS, paymentMap);
      if (data.dashboardSnapshot) await upsertDashboardSnapshot(db, data.dashboardSnapshot);

      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE sync_state SET cursor = ?, last_bootstrap_at = ?, last_pull_at = ?,
         last_successful_sync_at = ? WHERE id = 1`,
        [data.cursor ?? null, now, now, now],
      );

      await db.execAsync('COMMIT');
      return true;
    } catch (e) {
      await db.execAsync('ROLLBACK');
      throw e;
    }
  } catch {
    return false;
  }
}

export async function pullChanges(): Promise<boolean> {
  const online = isOnline() || await probeApiHealth();
  if (!online) return false;

  const db = await getDb();
  const row = await db.getFirstAsync<{ cursor: string | null }>(
    'SELECT cursor FROM sync_state WHERE id = 1',
  );

  try {
    const qs = row?.cursor ? `?since=${encodeURIComponent(row.cursor)}` : '';
    const data: any = await authFetch(`/api/v1/sync/changes${qs}`);
    if (!data) return true;

    await db.execAsync('BEGIN TRANSACTION');
    try {
      if (data.customers) await upsertBatch(db, 'customers', data.customers, CUSTOMER_COLS, customerMap);
      if (data.beverages) await upsertBatch(db, 'beverages', data.beverages, BEVERAGE_COLS, beverageMap);
      if (data.priceTiers) await upsertBatch(db, 'price_tiers', data.priceTiers, TIER_COLS, tierMap);
      if (data.tierPrices) await upsertBatch(db, 'tier_prices', data.tierPrices, TIER_PRICE_COLS, tierPriceMap);
      if (data.paymentAccounts) await upsertBatch(db, 'payment_accounts', data.paymentAccounts, ACCOUNT_COLS, accountMap);
      if (data.sales) await upsertBatch(db, 'sales', data.sales, SALE_COLS, saleMap);
      if (data.saleLines) await upsertBatch(db, 'sale_lines', data.saleLines, SALE_LINE_COLS, saleLineMap);
      if (data.payments) await upsertBatch(db, 'payments', data.payments, PAYMENT_COLS, paymentMap);
      if (data.stockMovements) await upsertBatch(db, 'stock_movements', data.stockMovements, STOCK_COLS, stockMap);
      if (data.customerLedgerEntries) await upsertBatch(db, 'customer_ledger_entries', data.customerLedgerEntries, LEDGER_COLS, ledgerMap);
      if (data.user) await upsertUser(db, data.user);
      if (data.shop) await upsertShop(db, data.shop);
      if (data.permissions) await upsertPermissions(db, data.permissions);

      if (data.tombstones) {
        for (const t of (data.tombstones as any[])) {
          await db.runAsync(
            `UPDATE ${t.table} SET deleted_at = ?, sync_status = 'deleted' WHERE id = ?`,
            [new Date().toISOString(), t.id],
          );
        }
      }

      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE sync_state SET cursor = ?, last_pull_at = ?,
         last_successful_sync_at = ? WHERE id = 1`,
        [data.nextCursor ?? null, now, now],
      );

      await db.execAsync('COMMIT');
      return true;
    } catch (e) {
      await db.execAsync('ROLLBACK');
      throw e;
    }
  } catch {
    return false;
  }
}

export async function pushOutbox(): Promise<PushResult[]> {
  const online = isOnline() || await probeApiHealth();
  if (!online) return [];

  const shopId = _currentShopId;
  if (!shopId) return [];

  const operations = await getPendingOperations(shopId);
  if (operations.length === 0) return [];

  const results: PushResult[] = [];

  for (const op of operations) {
    if (op.status === 'failed' && op.attemptCount >= 5) continue;

    if (op.dependsOnJson) {
      const deps: string[] = JSON.parse(op.dependsOnJson);
      const unresolved = deps.filter(d => !operations.find(o => o.id === d && o.status === 'done'));
      if (unresolved.length > 0) continue;
    }

    try {
      await updateOperationStatus(op.id, 'syncing');

      const body = op.bodyJson ? JSON.parse(op.bodyJson) : undefined;
      const fetchOptions: RequestInit & { idempotencyKey?: string } = {
        method: op.method,
      };
      if (body) fetchOptions.body = JSON.stringify(body);
      if (op.idempotencyKey) fetchOptions.idempotencyKey = op.idempotencyKey;

      const response = await authFetch(op.path, fetchOptions);
      await markOperationSynced(op.id);
      results.push({ operationId: op.id, status: 'success', serverResponse: response });
    } catch (err: any) {
      const errorCode = err?.code ?? 'UNKNOWN';
      const errorMessage = err?.message ?? 'Unknown error';

      if (errorCode === 'CONFLICT' || err?.status === 409) {
        await updateOperationStatus(op.id, 'conflicted', { code: errorCode, message: errorMessage });
        results.push({ operationId: op.id, status: 'conflicted', errorCode, errorMessage });
      } else if (err?.status === 400 || err?.status === 422) {
        await updateOperationStatus(op.id, 'failed', { code: errorCode, message: errorMessage });
        results.push({ operationId: op.id, status: 'failed', errorCode, errorMessage });
      } else if (err?.status === 401 || err?.status === 403) {
        await updateOperationStatus(op.id, 'failed', { code: 'AUTH_ERROR', message: 'Permission changed or auth expired. Review required.' });
        results.push({ operationId: op.id, status: 'failed', errorCode: 'AUTH_ERROR', errorMessage: 'Permission changed or auth expired.' });
      } else {
        await updateOperationStatus(op.id, 'failed', { code: errorCode, message: errorMessage });
        results.push({ operationId: op.id, status: 'failed', errorCode, errorMessage });
      }
    }
  }

  return results;
}

export async function syncNow(reason: string): Promise<SyncSummary> {
  if (_isSyncing) return await getSyncSummary();
  _isSyncing = true;

  try {
    notifyListeners(await getSyncSummary());
    await pullChanges();
    await pushOutbox();
    await pullChanges();
    const summary = await getSyncSummary();
    notifyListeners(summary);
    return summary;
  } finally {
    _isSyncing = false;
  }
}

// Column definitions per table
const CUSTOMER_COLS = ['id', 'shop_id', 'name', 'phone', 'email', 'notes', 'credit_balance_cents', 'outstanding_boxes', 'outstanding_bottles', 'price_tier_id', 'price_tier_locked', 'username', 'created_at', 'updated_at', 'deleted_at'];
const BEVERAGE_COLS = ['id', 'shop_id', 'name', 'brand', 'size_ml', 'bottles_per_box', 'image_url', 'is_active', 'stock_bottles', 'created_at', 'updated_at'];
const TIER_COLS = ['id', 'shop_id', 'name', 'kind', 'is_default', 'created_at'];
const TIER_PRICE_COLS = ['id', 'price_tier_id', 'beverage_id', 'price_per_box_cents', 'price_per_bottle_cents'];
const ACCOUNT_COLS = ['id', 'shop_id', 'name', 'kind', 'holder_name', 'bank_name', 'account_number', 'is_active', 'notes'];
const SALE_COLS = ['id', 'shop_id', 'customer_id', 'price_tier_id', 'sale_date', 'status', 'subtotal_cents', 'paid_cents', 'credit_delta_cents', 'boxes_out_delta', 'bottles_out_delta', 'boxes_returned_on_sale', 'bottles_returned_on_sale', 'notes', 'voided_at', 'void_reason', 'created_at', 'updated_at'];
const SALE_LINE_COLS = ['id', 'shop_id', 'sale_id', 'beverage_id', 'boxes', 'bottles', 'price_per_box_cents', 'price_per_bottle_cents', 'line_total_cents'];
const PAYMENT_COLS = ['id', 'shop_id', 'sale_id', 'customer_id', 'payment_account_id', 'amount_cents', 'method', 'reference', 'notes', 'paid_at', 'voided_at', 'created_at'];
const STOCK_COLS = ['id', 'shop_id', 'beverage_id', 'delta_bottles', 'reason', 'notes', 'recorded_by_id', 'created_at', 'updated_at'];
const LEDGER_COLS = ['id', 'customer_id', 'type', 'date', 'data_json'];

// CamelCase to snake_case field mappers per table
const customerMap: Record<string, string> = { shopId: 'shop_id', priceTierId: 'price_tier_id', priceTierLocked: 'price_tier_locked', creditBalanceCents: 'credit_balance_cents', outstandingBoxes: 'outstanding_boxes', outstandingBottles: 'outstanding_bottles', deletedAt: 'deleted_at' };
const beverageMap: Record<string, string> = { shopId: 'shop_id', sizeMl: 'size_ml', bottlesPerBox: 'bottles_per_box', imageUrl: 'image_url', isActive: 'is_active', stockBottles: 'stock_bottles' };
const tierMap: Record<string, string> = { shopId: 'shop_id', isDefault: 'is_default' };
const tierPriceMap: Record<string, string> = { priceTierId: 'price_tier_id', beverageId: 'beverage_id', pricePerBoxCents: 'price_per_box_cents', pricePerBottleCents: 'price_per_bottle_cents' };
const accountMap: Record<string, string> = { shopId: 'shop_id', holderName: 'holder_name', bankName: 'bank_name', accountNumber: 'account_number', isActive: 'is_active' };
const saleMap: Record<string, string> = { shopId: 'shop_id', customerId: 'customer_id', priceTierId: 'price_tier_id', saleDate: 'sale_date', subtotalCents: 'subtotal_cents', paidCents: 'paid_cents', creditDeltaCents: 'credit_delta_cents', boxesOutDelta: 'boxes_out_delta', bottlesOutDelta: 'bottles_out_delta', boxesReturnedOnSale: 'boxes_returned_on_sale', bottlesReturnedOnSale: 'bottles_returned_on_sale', voidedAt: 'voided_at', voidReason: 'void_reason' };
const saleLineMap: Record<string, string> = { shopId: 'shop_id', saleId: 'sale_id', beverageId: 'beverage_id', pricePerBoxCents: 'price_per_box_cents', pricePerBottleCents: 'price_per_bottle_cents', lineTotalCents: 'line_total_cents' };
const paymentMap: Record<string, string> = { shopId: 'shop_id', saleId: 'sale_id', customerId: 'customer_id', paymentAccountId: 'payment_account_id', amountCents: 'amount_cents', paidAt: 'paid_at', voidedAt: 'voided_at' };
const stockMap: Record<string, string> = { shopId: 'shop_id', beverageId: 'beverage_id', deltaBottles: 'delta_bottles', recordedById: 'recorded_by_id' };
const ledgerMap: Record<string, string> = { customerId: 'customer_id', dataJson: 'data_json' };

function buildRow(item: any, columns: string[], fieldMap: Record<string, string>): Record<string, any> {
  const row: Record<string, any> = {};
  for (const col of columns) {
    if (col in item) {
      row[col] = item[col];
    } else {
      const srcKey = Object.entries(fieldMap).find(([, v]) => v === col)?.[0];
      if (srcKey && srcKey in item && item[srcKey] !== undefined) {
        row[col] = item[srcKey];
      } else {
        // Check direct camelCase match
        const directKey = Object.entries(fieldMap).find(([k]) => k === col)?.[0];
        if (directKey && directKey in item) {
          row[col] = item[directKey];
        }
      }
    }
  }
  return row;
}

async function upsertBatch(
  db: SQLiteDatabase,
  table: string,
  items: any[],
  columns: string[],
  fieldMap: Record<string, string>,
): Promise<void> {
  if (items.length === 0) return;

  const metaCols = ['sync_status', 'last_synced_at', 'server_updated_at', 'local_updated_at'];
  const allCols = [...columns, ...metaCols];

  for (const item of items) {
    const row = buildRow(item, columns, fieldMap);
    const now = new Date().toISOString();
    const rowWithMeta: Record<string, any> = {
      ...row,
      sync_status: 'synced',
      last_synced_at: now,
      server_updated_at: item.updatedAt ?? item.server_updated_at ?? null,
      local_updated_at: now,
    };

    const colList = allCols.join(', ');
    const placeholders = allCols.map(() => '?').join(', ');
    const values = allCols.map(c => rowWithMeta[c] ?? null);

    await db.runAsync(
      `INSERT OR REPLACE INTO ${table} (${colList}) VALUES (${placeholders})`,
      values,
    );
  }
}

async function upsertUser(db: SQLiteDatabase, user: any): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO users (id, shop_id, name, email, role, phone, avatar_url,
      server_version, server_updated_at, local_updated_at, sync_status, last_synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'synced', ?)`,
    [user.id, user.shopId, user.name, user.email, user.role, user.phone ?? null, user.avatarUrl ?? null,
      user.updatedAt ?? null, now, now],
  );
}

async function upsertShop(db: SQLiteDatabase, shop: any): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO shops (id, owner_id, name, phone, address, description, email,
      website, currency, timezone, low_stock_threshold, default_price_tier_id,
      server_version, server_updated_at, local_updated_at, sync_status, last_synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'synced', ?)`,
    [
      shop.id, shop.ownerId, shop.name, shop.phone ?? null, shop.address ?? null,
      shop.description ?? null, shop.email ?? null, shop.website ?? null,
      shop.currency ?? 'ETB', shop.timezone ?? 'Africa/Addis_Ababa',
      shop.lowStockThreshold ?? 10, shop.defaultPriceTierId ?? null,
      shop.updatedAt ?? null, now, now,
    ],
  );
}

async function upsertPermissions(db: SQLiteDatabase, permissions: { granted: string[] }): Promise<void> {
  const shopRow = await db.getFirstAsync<{ id: string }>('SELECT id FROM shops LIMIT 1');
  if (!shopRow) return;
  const now = new Date().toISOString();
  await db.runAsync('DELETE FROM permissions WHERE shop_id = ?', [shopRow.id]);
  for (const slug of permissions.granted ?? []) {
    await db.runAsync(
      `INSERT INTO permissions (shop_id, slug, granted, server_updated_at, local_updated_at, sync_status, last_synced_at)
       VALUES (?, ?, 1, ?, ?, 'synced', ?)`,
      [shopRow.id, slug, now, now, now],
    );
  }
}

async function upsertDashboardSnapshot(db: SQLiteDatabase, snapshot: any): Promise<void> {
  const shopRow = await db.getFirstAsync<{ id: string }>('SELECT id FROM shops LIMIT 1');
  if (!shopRow) return;
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO dashboard_snapshots (id, shop_id, snapshot_json, captured_at, local_updated_at, sync_status, last_synced_at)
     VALUES ('default', ?, ?, ?, ?, 'synced', ?)`,
    [shopRow.id, JSON.stringify(snapshot), now, now, now],
  );
}
