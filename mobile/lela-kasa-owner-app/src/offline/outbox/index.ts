import { getDb } from '../db/database';
import type { OutboxOperation, OutboxStatus } from '../types';

let _counter = 0;

function generateId(): string {
  _counter++;
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 8);
  return `out_${ts}_${r}_${_counter}`;
}

function generateClientMutationId(): string {
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 12);
  return `cm_${ts}_${r}`;
}

function generateIdempotencyKey(): string {
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 16);
  return `ik_${ts}_${r}`;
}

export { generateClientMutationId, generateIdempotencyKey };

export interface EnqueueParams {
  shopId: string;
  actorUserId: string;
  entityType?: string;
  entityId?: string;
  operation: string;
  method: string;
  path: string;
  body?: unknown;
  dependsOn?: string[];
}

export async function enqueueOperation(params: EnqueueParams): Promise<OutboxOperation> {
  const db = await getDb();
  const id = generateId();
  const clientMutationId = generateClientMutationId();
  const idempotencyKey = generateIdempotencyKey();
  const now = new Date().toISOString();

  const op: OutboxOperation = {
    id,
    shopId: params.shopId,
    actorUserId: params.actorUserId,
    entityType: params.entityType,
    entityId: params.entityId,
    clientMutationId,
    idempotencyKey,
    operation: params.operation,
    method: params.method,
    path: params.path,
    bodyJson: params.body ? JSON.stringify(params.body) : undefined,
    dependsOnJson: params.dependsOn?.length ? JSON.stringify(params.dependsOn) : undefined,
    status: 'pending',
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO outbox (id, shop_id, actor_user_id, entity_type, entity_id,
      client_mutation_id, idempotency_key, operation, method, path,
      body_json, depends_on_json, status, attempt_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      op.id, op.shopId, op.actorUserId, op.entityType ?? null, op.entityId ?? null,
      op.clientMutationId, op.idempotencyKey, op.operation, op.method, op.path,
      op.bodyJson ?? null, op.dependsOnJson ?? null, op.status, op.attemptCount,
      op.createdAt, op.updatedAt,
    ],
  );

  return op;
}

export async function getPendingOperations(shopId: string): Promise<OutboxOperation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM outbox
     WHERE shop_id = ? AND status IN ('pending', 'failed', 'conflicted')
     ORDER BY created_at ASC`,
    [shopId],
  );
  return rows.map(mapRow);
}

export async function getFailedOperations(shopId: string): Promise<OutboxOperation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM outbox WHERE shop_id = ? AND status = 'failed' ORDER BY created_at ASC`,
    [shopId],
  );
  return rows.map(mapRow);
}

export async function getOutboxCounts(shopId: string): Promise<{
  pending: number;
  failed: number;
  conflicted: number;
}> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT status, COUNT(*) as cnt FROM outbox
     WHERE shop_id = ? AND status IN ('pending', 'failed', 'conflicted')
     GROUP BY status`,
    [shopId],
  );
  const counts = { pending: 0, failed: 0, conflicted: 0 };
  for (const r of rows) {
    if (r.status === 'pending') counts.pending = r.cnt;
    else if (r.status === 'failed') counts.failed = r.cnt;
    else if (r.status === 'conflicted') counts.conflicted = r.cnt;
  }
  return counts;
}

export async function updateOperationStatus(
  id: string,
  status: OutboxStatus,
  error?: { code: string; message: string },
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  if (status === 'failed' || status === 'conflicted') {
    await db.runAsync(
      `UPDATE outbox SET status = ?, attempt_count = attempt_count + 1,
        last_error_code = ?, last_error_message = ?, updated_at = ?
       WHERE id = ?`,
      [status, error?.code ?? null, error?.message ?? null, now, id],
    );
  } else {
    await db.runAsync(
      `UPDATE outbox SET status = ?, updated_at = ? WHERE id = ?`,
      [status, now, id],
    );
  }
}

export async function markOperationSynced(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE outbox SET status = 'done', updated_at = ? WHERE id = ?`,
    [now, id],
  );
}

export async function resetStaleSyncingOperations(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE outbox SET status = 'pending', updated_at = datetime('now')
     WHERE status = 'syncing'`,
  );
}

function mapRow(row: any): OutboxOperation {
  return {
    id: row.id,
    shopId: row.shop_id,
    actorUserId: row.actor_user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    clientMutationId: row.client_mutation_id,
    idempotencyKey: row.idempotency_key,
    operation: row.operation,
    method: row.method,
    path: row.path,
    bodyJson: row.body_json,
    dependsOnJson: row.depends_on_json,
    status: row.status,
    attemptCount: row.attempt_count,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
