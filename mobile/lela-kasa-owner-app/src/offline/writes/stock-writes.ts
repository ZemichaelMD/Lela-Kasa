import { getDb } from '../db/database';
import { enqueueOperation } from '../outbox';
import { isOnline } from '../network';
import { syncNow } from '../sync/sync-coordinator';

function generateLocalId(): string {
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `loc_${ts}_${r}`;
}

export async function adjustStockOffline(input: {
  shopId: string;
  actorUserId: string;
  beverageId: string;
  deltaBottles: number;
  reason: string;
  notes?: string;
}): Promise<string> {
  const db = await getDb();
  const movementId = generateLocalId();
  const now = new Date().toISOString();

  await db.execAsync('BEGIN TRANSACTION');
  try {
    await db.runAsync(
      `INSERT INTO stock_movements (id, shop_id, beverage_id, delta_bottles,
        reason, notes, recorded_by_id,
        local_updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        movementId, input.shopId, input.beverageId, input.deltaBottles,
        input.reason, input.notes ?? null, input.actorUserId,
        now, now,
      ],
    );

    // Update projected beverage stock
    await db.runAsync(
      `UPDATE beverages SET stock_bottles = MAX(0, stock_bottles + ?)
       WHERE id = ?`,
      [input.deltaBottles, input.beverageId],
    );

    await enqueueOperation({
      shopId: input.shopId,
      actorUserId: input.actorUserId,
      entityType: 'stock_movement',
      entityId: movementId,
      operation: 'adjust_stock',
      method: 'POST',
      path: '/api/v1/stock-movements',
      body: {
        beverageId: input.beverageId,
        deltaBottles: input.deltaBottles,
        reason: input.reason,
        notes: input.notes,
      },
    });

    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }

  if (isOnline()) syncNow('after_write');
  return movementId;
}
