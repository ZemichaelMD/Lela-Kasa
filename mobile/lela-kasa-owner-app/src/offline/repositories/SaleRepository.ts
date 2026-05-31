import { BaseRepository, BaseMetadata } from "./BaseRepository";
import type { Sale } from "../../lib/sdk/resources/sales";

export interface SaleOffline extends BaseMetadata {
  shop_id: string;
  customer_id: string | null;
  sale_date: string;
  subtotal_cents: number;
  paid_cents: number;
  credit_delta_cents: number;
  boxes_out_delta: number;
  bottles_out_delta: number;
  boxes_returned_on_sale: number;
  bottles_returned_on_sale: number;
  status: string;
  price_tier_id: string;
  notes?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
  created_at: string;
  updated_at: string;
  server_updated_at?: string | null;
  local_updated_at: string;
  deleted_at?: string | null;
}

export interface SaleLineOffline {
  id: string;
  shop_id: string;
  sale_id: string;
  beverage_id: string;
  boxes: number;
  bottles: number;
  price_per_box_cents: number;
  price_per_bottle_cents: number;
  line_total_cents: number;
}

export interface SaleCreatePayload {
  shop_id: string;
  actor_user_id: string;
  customer_id: string | null;
  sale_date: string;
  price_tier_id: string;
  notes?: string;
  apply_credit?: boolean;
  lines: Array<{
    beverage_id: string;
    boxes: number;
    bottles: number;
    price_per_box_cents: number;
    price_per_bottle_cents: number;
  }>;
  payments?: Array<{
    amount_cents: number;
    method: string;
    payment_account_id: string;
    reference?: string;
  }>;
  returned_containers?: Array<{
    beverage_id: string;
    boxes: number;
    bottles: number;
  }>;
  container_kasas?: Array<{
    beverage_id: string;
    count: number;
  }>;
}

export class SaleRepository extends BaseRepository<SaleOffline> {
  constructor() {
    super("sales");
  }

  async createOffline(payload: SaleCreatePayload): Promise<string> {
    const sale_id = this.generateLocalId();
    const db = await this.db();
    const now = new Date().toISOString();

    // 1. Calculate totals and prepare lines
    let subtotal_cents = 0;
    const lines = payload.lines.map((l) => {
      const line_total =
        l.boxes * l.price_per_box_cents + l.bottles * l.price_per_bottle_cents;
      subtotal_cents += line_total;
      return {
        id: this.generateLocalId(),
        shop_id: payload.shop_id,
        sale_id,
        beverage_id: l.beverage_id,
        boxes: l.boxes,
        bottles: l.bottles,
        price_per_box_cents: l.price_per_box_cents,
        price_per_bottle_cents: l.price_per_bottle_cents,
        line_total_cents: line_total,
      };
    });

    const paid_cents = (payload.payments || []).reduce(
      (sum, p) => sum + (p.amount_cents || 0),
      0,
    );
    const credit_delta_cents = subtotal_cents - paid_cents;
    const boxes_out_delta = payload.lines.reduce((s, l) => s + l.boxes, 0);
    const bottles_out_delta = payload.lines.reduce((s, l) => s + l.bottles, 0);

    // 2. Fetch beverage info needed for stock adjustment (OUTSIDE transaction)
    const beverageIds = [...new Set(payload.lines.map((l) => l.beverage_id))];
    const beveragesInfo: Record<string, { bottles_per_box: number }> = {};

    if (beverageIds.length > 0) {
      const placeholders = beverageIds.map(() => "?").join(",");
      const rows = await db.getAllAsync<{
        id: string;
        bottles_per_box: number;
      }>(
        `SELECT id, bottles_per_box FROM beverages WHERE id IN (${placeholders})`,
        beverageIds,
      );
      rows.forEach((r) => {
        beveragesInfo[r.id] = { bottles_per_box: r.bottles_per_box };
      });
    }

    // 3. Execute all DB writes in a transaction
    await db.withTransactionAsync(async () => {
      // 3.1 Insert Sale
      await db.runAsync(
        `INSERT INTO sales (
          id, shop_id, customer_id, sale_date, status,
          subtotal_cents, paid_cents, credit_delta_cents,
          boxes_out_delta, bottles_out_delta,
          price_tier_id, notes,
          local_updated_at, sync_status, last_synced_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          sale_id,
          payload.shop_id,
          payload.customer_id,
          payload.sale_date,
          subtotal_cents,
          paid_cents,
          credit_delta_cents,
          boxes_out_delta,
          bottles_out_delta,
          payload.price_tier_id,
          payload.notes ?? null,
          now,
          now,
          now,
          now,
        ],
      );

      // 3.2 Insert Lines & Update Stock
      for (const line of lines) {
        await db.runAsync(
          `INSERT INTO sale_lines (
            id, shop_id, sale_id, beverage_id, boxes, bottles,
            price_per_box_cents, price_per_bottle_cents, line_total_cents,
            local_updated_at, sync_status, last_synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [
            line.id,
            line.shop_id,
            line.sale_id,
            line.beverage_id,
            line.boxes,
            line.bottles,
            line.price_per_box_cents,
            line.price_per_bottle_cents,
            line.line_total_cents,
            now,
            now,
          ],
        );

        const bpb = beveragesInfo[line.beverage_id]?.bottles_per_box ?? 24;
        const totalBottles = line.boxes * bpb + line.bottles;
        await db.runAsync(
          `UPDATE beverages SET stock_bottles = MAX(0, stock_bottles - ?), local_updated_at = ? WHERE id = ?`,
          [totalBottles, now, line.beverage_id],
        );
      }

      // 3.3 Insert Payments
      if (payload.payments) {
        for (const pmt of payload.payments) {
          await db.runAsync(
            `INSERT INTO payments (
              id, shop_id, sale_id, customer_id, amount_cents, method,
              payment_account_id, reference, paid_at,
              local_updated_at, sync_status, last_synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [
              this.generateLocalId(),
              payload.shop_id,
              sale_id,
              payload.customer_id,
              pmt.amount_cents,
              pmt.method,
              pmt.payment_account_id,
              pmt.reference || null,
              now,
              now,
              now,
            ],
          );
        }
      }

      // 3.4 Update Customer Balances
      if (payload.customer_id) {
        await db.runAsync(
          `UPDATE customers SET
            credit_balance_cents = credit_balance_cents + ?,
            outstanding_boxes = outstanding_boxes + ?,
            outstanding_bottles = outstanding_bottles + ?,
            local_updated_at = ?
           WHERE id = ?`,
          [
            credit_delta_cents,
            boxes_out_delta,
            bottles_out_delta,
            now,
            payload.customer_id,
          ],
        );
      }

      // 3.5 Handle Returned Containers
      if (payload.returned_containers) {
        for (const ret of payload.returned_containers) {
          await db.runAsync(
            `INSERT INTO sale_returned_containers (
              id, shop_id, sale_id, beverage_id, boxes, bottles,
              local_updated_at, sync_status, last_synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [
              this.generateLocalId(),
              payload.shop_id,
              sale_id,
              ret.beverage_id,
              ret.boxes,
              ret.bottles,
              now,
              now,
            ],
          );

          if (payload.customer_id) {
            await db.runAsync(
              `UPDATE customers SET
                outstanding_boxes = MAX(0, outstanding_boxes - ?),
                outstanding_bottles = MAX(0, outstanding_bottles - ?),
                local_updated_at = ?
               WHERE id = ?`,
              [ret.boxes, ret.bottles, now, payload.customer_id],
            );
          }
        }
      }

      // 3.6 Handle Container Kasas
      if (payload.container_kasas) {
        for (const kasa of payload.container_kasas) {
          await db.runAsync(
            `INSERT INTO sale_container_kasas (
              id, shop_id, sale_id, beverage_id, count,
              local_updated_at, sync_status, last_synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [
              this.generateLocalId(),
              payload.shop_id,
              sale_id,
              kasa.beverage_id,
              kasa.count,
              now,
              now,
            ],
          );

          if (payload.customer_id) {
            await db.runAsync(
              `UPDATE customers SET outstanding_boxes = outstanding_boxes + ?, local_updated_at = ? WHERE id = ?`,
              [kasa.count, now, payload.customer_id],
            );
          }
        }
      }

      // 3.7 Enqueue Outbox
      const outboxPayload = {
        sale_date: payload.sale_date,
        customer_id: payload.customer_id,
        price_tier_id: payload.price_tier_id,
        subtotal_cents,
        paid_cents,
        notes: payload.notes,
        lines: payload.lines.map((l) => ({
          beverage_id: l.beverage_id,
          boxes: l.boxes,
          bottles: l.bottles,
          price_per_box_cents: l.price_per_box_cents,
          price_per_bottle_cents: l.price_per_bottle_cents,
        })),
        payments: payload.payments?.map((p) => ({
          payment_account_id: p.payment_account_id,
          amount_cents: p.amount_cents,
          method: p.method,
          reference: p.reference,
        })),
        container_kasas: payload.container_kasas?.map((k) => ({
          beverage_id: k.beverage_id,
          count: k.count,
        })),
        returned_containers: payload.returned_containers?.map((r) => ({
          beverage_id: r.beverage_id,
          boxes: r.boxes,
          bottles: r.bottles,
        })),
      };

      await this.enqueueOutbox({
        shopId: payload.shop_id,
        actorUserId: payload.actor_user_id,
        entityType: "sales",
        entityId: sale_id,
        operation: "create_sale",
        method: "POST",
        path: "/api/v1/sales",
        body: outboxPayload,
      });
    });

    return sale_id;
  }

  async applyRemoteSale(sale: Sale): Promise<void> {
    const db = await this.db();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await this.upsert({
        id: sale.id,
        shop_id: sale.shopId,
        customer_id: sale.customerId ?? null,
        sale_date: sale.saleDate,
        subtotal_cents: sale.subtotalCents,
        paid_cents: sale.paidCents,
        credit_delta_cents: sale.creditDeltaCents,
        boxes_out_delta: sale.boxesOutDelta,
        bottles_out_delta: sale.bottlesOutDelta,
        boxes_returned_on_sale: sale.boxesReturnedOnSale,
        bottles_returned_on_sale: sale.bottlesReturnedOnSale,
        status: sale.status,
        price_tier_id: sale.priceTierId,
        notes: sale.notes ?? null,
        voided_at: sale.voidedAt ?? null,
        void_reason: sale.voidReason ?? null,
        created_at: sale.createdAt,
        updated_at: sale.updatedAt,
        server_updated_at: sale.updatedAt,
        local_updated_at: now,
        sync_status: "synced",
        last_synced_at: now,
        deleted_at: null,
      });
    });
  }

  async addPayment(params: {
    saleId: string;
    shopId: string;
    actorUserId: string;
    amountCents: number;
    paymentAccountId: string;
    method: string;
    reference?: string;
  }): Promise<void> {
    const db = await this.db();
    const now = new Date().toISOString();
    const paymentId = this.generateLocalId();

    await db.withTransactionAsync(async () => {
      // 1. Fetch sale to get customer_id
      const sale = await db.getFirstAsync<{ customer_id: string | null }>(
        "SELECT customer_id FROM sales WHERE id = ?",
        [params.saleId],
      );

      // 2. Update sale paid amount
      await db.runAsync(
        `UPDATE sales SET paid_cents = paid_cents + ?, credit_delta_cents = subtotal_cents - (paid_cents + ?), local_updated_at = ? WHERE id = ?`,
        [params.amountCents, params.amountCents, now, params.saleId],
      );

      // 3. Update customer credit if applicable
      if (sale?.customer_id) {
        await db.runAsync(
          `UPDATE customers SET credit_balance_cents = MAX(0, credit_balance_cents - ?), local_updated_at = ? WHERE id = ?`,
          [params.amountCents, now, sale.customer_id],
        );
      }

      // 4. Insert payment
      await db.runAsync(
        `INSERT INTO payments (id, shop_id, sale_id, customer_id, payment_account_id, amount_cents, method, reference, paid_at, local_updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentId,
          params.shopId,
          params.saleId,
          sale?.customer_id || null,
          params.paymentAccountId,
          params.amountCents,
          params.method,
          params.reference || null,
          now,
          now,
          "pending",
        ],
      );

      // 5. Enqueue outbox
      await this.enqueueOutbox({
        shopId: params.shopId,
        actorUserId: params.actorUserId,
        entityType: "payment",
        entityId: paymentId,
        operation: "add_payment",
        method: "POST",
        path: `/api/v1/sales/${params.saleId}/payments`,
        body: {
          payment_account_id: params.paymentAccountId,
          amount_cents: params.amountCents,
          method: params.method,
          reference: params.reference,
        },
      });
    });
  }
}

export const saleRepo = new SaleRepository();
