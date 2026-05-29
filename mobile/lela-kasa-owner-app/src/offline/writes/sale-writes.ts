import { getDb } from '../db/database';
import { enqueueOperation } from '../outbox';
import { isOnline } from '../network';
import { syncNow } from '../sync/sync-coordinator';

export interface OfflineSaleInput {
  shopId: string;
  actorUserId: string;
  saleDate: string;
  customerId?: string;
  priceTierId: string;
  lines: Array<{
    id: string;
    beverageId: string;
    boxes: number;
    bottles: number;
    pricePerBoxCents: number;
    pricePerBottleCents: number;
  }>;
  payments?: Array<{
    id: string;
    paymentAccountId: string;
    amountCents: number;
    method: string;
  }>;
  containerKasas?: Array<{
    id: string;
    beverageId: string;
    count: number;
  }>;
  returnedContainers?: Array<{
    id: string;
    beverageId: string;
    boxes: number;
    bottles: number;
  }>;
  notes?: string;
}

function generateLocalId(): string {
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `loc_${ts}_${r}`;
}

export async function createSaleOffline(input: OfflineSaleInput): Promise<string> {
  const db = await getDb();
  const saleId = generateLocalId();
  const now = new Date().toISOString();

  const subtotalCents = input.lines.reduce(
    (sum, l) => sum + l.boxes * l.pricePerBoxCents + l.bottles * l.pricePerBottleCents,
    0,
  );
  const paidCents = input.payments
    ? input.payments.reduce((sum, p) => sum + p.amountCents, 0)
    : 0;
  const creditDeltaCents = subtotalCents - paidCents;

  const boxesOutDelta = input.lines.reduce((sum, l) => sum + l.boxes, 0);
  const bottlesOutDelta = input.lines.reduce((sum, l) => sum + l.bottles, 0);

  await db.execAsync('BEGIN TRANSACTION');
  try {
    // Insert sale
    await db.runAsync(
      `INSERT INTO sales (id, shop_id, customer_id, price_tier_id, sale_date,
        status, subtotal_cents, paid_cents, credit_delta_cents,
        boxes_out_delta, bottles_out_delta, notes,
        local_updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?,
        ?, 'pending', ?)`,
      [
        saleId, input.shopId, input.customerId ?? null, input.priceTierId,
        input.saleDate,
        subtotalCents, paidCents, creditDeltaCents,
        boxesOutDelta, bottlesOutDelta,
        input.notes ?? null,
        now, now,
      ],
    );

    // Insert sale lines
    for (const line of input.lines) {
      const lineId = line.id || generateLocalId();
      const lineTotal = line.boxes * line.pricePerBoxCents + line.bottles * line.pricePerBottleCents;
      await db.runAsync(
        `INSERT INTO sale_lines (id, shop_id, sale_id, beverage_id, boxes, bottles,
          price_per_box_cents, price_per_bottle_cents, line_total_cents,
          local_updated_at, sync_status, last_synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          lineId, input.shopId, saleId, line.beverageId,
          line.boxes, line.bottles,
          line.pricePerBoxCents, line.pricePerBottleCents, lineTotal,
          now, now,
        ],
      );
    }

    // Insert payments
    if (input.payments) {
      for (const payment of input.payments) {
        const paymentId = payment.id || generateLocalId();
        await db.runAsync(
          `INSERT INTO payments (id, shop_id, sale_id, payment_account_id,
            amount_cents, method, paid_at,
            local_updated_at, sync_status, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [
            paymentId, input.shopId, saleId, payment.paymentAccountId,
            payment.amountCents, payment.method, now,
            now, now,
          ],
        );
      }
    }

    // Insert container kasas
    if (input.containerKasas) {
      for (const kasa of input.containerKasas) {
        const kasaId = kasa.id || generateLocalId();
        await db.runAsync(
          `INSERT INTO sale_container_kasas (id, shop_id, sale_id, beverage_id, count,
            local_updated_at, sync_status, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [kasaId, input.shopId, saleId, kasa.beverageId, kasa.count, now, now],
        );
      }
    }

    // Insert returned containers
    if (input.returnedContainers) {
      for (const ret of input.returnedContainers) {
        const retId = ret.id || generateLocalId();
        await db.runAsync(
          `INSERT INTO sale_returned_containers (id, shop_id, sale_id, beverage_id,
            boxes, bottles, local_updated_at, sync_status, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [retId, input.shopId, saleId, ret.beverageId, ret.boxes, ret.bottles, now, now],
        );
      }
    }

    // Update projected beverage stock
    for (const line of input.lines) {
      const totalBottles = line.boxes * 24 + line.bottles; // using 24 as default bottlesPerBox
      await db.runAsync(
        `UPDATE beverages SET stock_bottles = MAX(0, stock_bottles - ?)
         WHERE id = ?`,
        [totalBottles, line.beverageId],
      );
    }

    // Update projected customer credit balance
    if (input.customerId && creditDeltaCents > 0) {
      await db.runAsync(
        `UPDATE customers SET credit_balance_cents = credit_balance_cents + ?
         WHERE id = ?`,
        [creditDeltaCents, input.customerId],
      );
    }

    // Update projected customer container balance
    if (input.customerId) {
      await db.runAsync(
        `UPDATE customers SET
          outstanding_boxes = outstanding_boxes + ?,
          outstanding_bottles = outstanding_bottles + ?
         WHERE id = ?`,
        [boxesOutDelta, bottlesOutDelta, input.customerId],
      );
    }

    // Enqueue outbox operation
    const saleBody = {
      saleDate: input.saleDate,
      customerId: input.customerId,
      priceTierId: input.priceTierId,
      notes: input.notes,
      lines: input.lines.map(l => ({
        beverageId: l.beverageId,
        boxes: l.boxes,
        bottles: l.bottles,
      })),
      payments: input.payments?.map(p => ({
        paymentAccountId: p.paymentAccountId,
        amountCents: p.amountCents,
        method: p.method,
      })),
      containerKasas: input.containerKasas?.map(k => ({
        beverageId: k.beverageId,
        count: k.count,
      })),
      returnedContainers: input.returnedContainers?.map(r => ({
        beverageId: r.beverageId,
        boxes: r.boxes,
        bottles: r.bottles,
      })),
    };

    await enqueueOperation({
      shopId: input.shopId,
      actorUserId: input.actorUserId,
      entityType: 'sale',
      entityId: saleId,
      operation: 'create_sale',
      method: 'POST',
      path: '/api/v1/sales',
      body: saleBody,
    });

    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }

  // Try to sync if online
  if (isOnline()) {
    syncNow('after_write');
  }

  return saleId;
}

export async function addPaymentOffline(input: {
  shopId: string;
  actorUserId: string;
  saleId: string;
  paymentAccountId: string;
  amountCents: number;
  method: string;
  reference?: string;
  notes?: string;
}): Promise<string> {
  const db = await getDb();
  const paymentId = generateLocalId();
  const now = new Date().toISOString();

  await db.execAsync('BEGIN TRANSACTION');
  try {
    await db.runAsync(
      `INSERT INTO payments (id, shop_id, sale_id, payment_account_id,
        amount_cents, method, reference, notes, paid_at,
        local_updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        paymentId, input.shopId, input.saleId, input.paymentAccountId,
        input.amountCents, input.method, input.reference ?? null, input.notes ?? null, now,
        now, now,
      ],
    );

    // Update sale paid amount
    await db.runAsync(
      `UPDATE sales SET paid_cents = paid_cents + ?, credit_delta_cents = subtotal_cents - paid_cents
       WHERE id = ?`,
      [input.amountCents, input.saleId],
    );

    // Reduce customer credit balance if applicable
    const sale = await db.getFirstAsync<any>('SELECT customer_id FROM sales WHERE id = ?', [input.saleId]);
    if (sale?.customer_id) {
      await db.runAsync(
        `UPDATE customers SET credit_balance_cents = MAX(0, credit_balance_cents - ?)
         WHERE id = ?`,
        [input.amountCents, sale.customer_id],
      );
    }

    await enqueueOperation({
      shopId: input.shopId,
      actorUserId: input.actorUserId,
      entityType: 'payment',
      entityId: paymentId,
      operation: 'add_payment',
      method: 'POST',
      path: `/api/v1/sales/${input.saleId}/payments`,
      body: {
        paymentAccountId: input.paymentAccountId,
        amountCents: input.amountCents,
        method: input.method,
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
