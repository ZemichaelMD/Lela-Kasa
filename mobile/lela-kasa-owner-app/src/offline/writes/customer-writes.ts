import { getDb } from '../db/database';
import { enqueueOperation } from '../outbox';
import { isOnline } from '../network';
import { syncNow } from '../sync/sync-coordinator';

function generateLocalId(): string {
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `loc_${ts}_${r}`;
}

export async function createCustomerOffline(input: {
  shopId: string;
  actorUserId: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  priceTierId?: string;
}): Promise<string> {
  const db = await getDb();
  const customerId = generateLocalId();
  const now = new Date().toISOString();

  await db.execAsync('BEGIN TRANSACTION');
  try {
    await db.runAsync(
      `INSERT INTO customers (id, shop_id, name, phone, email, notes,
        price_tier_id, credit_balance_cents, outstanding_boxes, outstanding_bottles,
        local_updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 'pending', ?)`,
      [
        customerId, input.shopId, input.name, input.phone ?? null,
        input.email ?? null, input.notes ?? null, input.priceTierId ?? null,
        now, now,
      ],
    );

    await enqueueOperation({
      shopId: input.shopId,
      actorUserId: input.actorUserId,
      entityType: 'customer',
      entityId: customerId,
      operation: 'create_customer',
      method: 'POST',
      path: '/api/v1/customers',
      body: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        notes: input.notes,
        priceTierId: input.priceTierId,
      },
    });

    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }

  if (isOnline()) syncNow('after_write');
  return customerId;
}

export async function updateCustomerOffline(input: {
  shopId: string;
  actorUserId: string;
  customerId: string;
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  priceTierId?: string;
}): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const customer = await db.getFirstAsync<any>(
    'SELECT * FROM customers WHERE id = ?', [input.customerId],
  );
  if (!customer) throw new Error('Customer not found');

  const serverVersion = (customer.server_version ?? 0) + 1;

  await db.runAsync(
    `UPDATE customers SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      notes = COALESCE(?, notes),
      price_tier_id = COALESCE(?, price_tier_id),
      server_version = ?,
      local_updated_at = ?,
      sync_status = 'pending',
      last_synced_at = ?
     WHERE id = ?`,
    [
      input.name ?? null, input.phone ?? null, input.email ?? null,
      input.notes ?? null, input.priceTierId ?? null,
      serverVersion, now, now, input.customerId,
    ],
  );

  await enqueueOperation({
    shopId: input.shopId,
    actorUserId: input.actorUserId,
    entityType: 'customer',
    entityId: input.customerId,
    operation: 'update_customer',
    method: 'PATCH',
    path: `/api/v1/customers/${input.customerId}`,
    body: {
      name: input.name,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
      priceTierId: input.priceTierId,
    },
  });

  if (isOnline()) syncNow('after_write');
}

export async function recordCustomerPaymentOffline(input: {
  shopId: string;
  actorUserId: string;
  customerId: string;
  amountCents: number;
  method: string;
  paymentAccountId: string;
  reference?: string;
  notes?: string;
}): Promise<string> {
  const db = await getDb();
  const paymentId = generateLocalId();
  const now = new Date().toISOString();

  await db.execAsync('BEGIN TRANSACTION');
  try {
    await db.runAsync(
      `INSERT INTO payments (id, shop_id, customer_id, payment_account_id,
        amount_cents, method, reference, notes, paid_at,
        local_updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        paymentId, input.shopId, input.customerId, input.paymentAccountId,
        input.amountCents, input.method, input.reference ?? null, input.notes ?? null, now,
        now, now,
      ],
    );

    // Reduce projected customer credit balance
    await db.runAsync(
      `UPDATE customers SET credit_balance_cents = MAX(0, credit_balance_cents - ?)
       WHERE id = ?`,
      [input.amountCents, input.customerId],
    );

    // Add ledger entry
    const ledgerId = generateLocalId();
    await db.runAsync(
      `INSERT INTO customer_ledger_entries (id, customer_id, type, date, data_json,
        local_updated_at, sync_status, last_synced_at)
       VALUES (?, ?, 'payment', ?, ?, ?, 'pending', ?)`,
      [
        ledgerId, input.customerId, now,
        JSON.stringify({
          id: paymentId,
          amountCents: input.amountCents,
          method: input.method,
          paymentAccountId: input.paymentAccountId,
          reference: input.reference,
          notes: input.notes,
          paidAt: now,
        }),
        now, now,
      ],
    );

    await enqueueOperation({
      shopId: input.shopId,
      actorUserId: input.actorUserId,
      entityType: 'customer',
      entityId: input.customerId,
      operation: 'record_customer_payment',
      method: 'POST',
      path: `/api/v1/customers/${input.customerId}/payments`,
      body: {
        amountCents: input.amountCents,
        method: input.method,
        paymentAccountId: input.paymentAccountId,
        reference: input.reference,
        notes: input.notes,
      },
    });

    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }

  if (isOnline()) syncNow('after_write');
  return paymentId;
}

export async function recordReturnOffline(input: {
  shopId: string;
  actorUserId: string;
  customerId: string;
  boxes: number;
  bottles: number;
  notes?: string;
}): Promise<string> {
  const db = await getDb();
  const ledgerId = generateLocalId();
  const now = new Date().toISOString();

  await db.execAsync('BEGIN TRANSACTION');
  try {
    await db.runAsync(
      `INSERT INTO customer_ledger_entries (id, customer_id, type, date, data_json,
        local_updated_at, sync_status, last_synced_at)
       VALUES (?, ?, 'return', ?, ?, ?, 'pending', ?)`,
      [
        ledgerId, input.customerId, now,
        JSON.stringify({
          id: ledgerId,
          customerId: input.customerId,
          boxes: input.boxes,
          bottles: input.bottles,
          notes: input.notes,
        }),
        now, now,
      ],
    );

    // Reduce projected outstanding containers
    await db.runAsync(
      `UPDATE customers SET
        outstanding_boxes = MAX(0, outstanding_boxes - ?),
        outstanding_bottles = MAX(0, outstanding_bottles - ?)
       WHERE id = ?`,
      [input.boxes, input.bottles, input.customerId],
    );

    await enqueueOperation({
      shopId: input.shopId,
      actorUserId: input.actorUserId,
      entityType: 'customer',
      entityId: input.customerId,
      operation: 'record_return',
      method: 'POST',
      path: `/api/v1/customers/${input.customerId}/returns`,
      body: {
        boxes: input.boxes,
        bottles: input.bottles,
        notes: input.notes,
      },
    });

    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }

  if (isOnline()) syncNow('after_write');
  return ledgerId;
}
