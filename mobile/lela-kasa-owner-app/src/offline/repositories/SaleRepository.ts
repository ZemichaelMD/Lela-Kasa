import { BaseRepository, BaseMetadata } from "./BaseRepository";

export interface SaleOffline extends BaseMetadata {
  shop_id: string;
  customer_id: string;
  sale_date: string;
  subtotal_cents: number;
  paid_cents: number;
  status: string;
  price_tier_id: string;
  notes?: string | null;
}

export interface SaleLineOffline {
  local_id: string;
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
  customer_id: string;
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
  payment?: {
    amount_cents: number;
    method: string;
    payment_account_id: string;
    reference?: string;
  };
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
    const client_mutation_id = this.generateLocalId();
    const db = await this.db();

    let subtotal_cents = 0;
    const lines: SaleLineOffline[] = payload.lines.map((l) => {
      const line_total =
        l.boxes * l.price_per_box_cents + l.bottles * l.price_per_bottle_cents;
      subtotal_cents += line_total;
      return {
        local_id: this.generateLocalId(),
        sale_id,
        beverage_id: l.beverage_id,
        boxes: l.boxes,
        bottles: l.bottles,
        price_per_box_cents: l.price_per_box_cents,
        price_per_bottle_cents: l.price_per_bottle_cents,
        line_total_cents: line_total,
      };
    });

    const allPayments = payload.payments?.length
      ? payload.payments
      : payload.payment
        ? [payload.payment]
        : [];
    const paid_cents = allPayments.reduce((sum, p) => sum + (p.amount_cents || 0), 0);

    await db.withTransactionAsync(async () => {
      // 1. Insert Sale
      await this.upsert({
        local_id: sale_id,
        shop_id: payload.shop_id,
        customer_id: payload.customer_id,
        sale_date: payload.sale_date,
        subtotal_cents,
        paid_cents,
        status: "CONFIRMED",
        price_tier_id: payload.price_tier_id,
        notes: payload.notes,
        sync_status: "pending",
        server_version: 0,
      });

      // 2. Insert Lines
      for (const line of lines) {
        await db.runAsync(
          `INSERT INTO sale_lines (local_id, sale_id, beverage_id, boxes, bottles, price_per_box_cents, price_per_bottle_cents, line_total_cents, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            line.local_id,
            line.sale_id,
            line.beverage_id,
            line.boxes,
            line.bottles,
            line.price_per_box_cents,
            line.price_per_bottle_cents,
            line.line_total_cents,
            "pending",
          ],
        );

        const totalBottles = line.boxes * 24 + line.bottles;
        await db.runAsync(
          `UPDATE beverages SET stock_bottles = stock_bottles - ? WHERE local_id = ? OR server_id = ?`,
          [totalBottles, line.beverage_id, line.beverage_id],
        );
      }

      // 3. Handle Payments
      for (const pmt of allPayments) {
        await db.runAsync(
          `INSERT INTO payments (local_id, shop_id, sale_id, customer_id, amount_cents, method, payment_account_id, reference, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            this.generateLocalId(),
            payload.shop_id,
            sale_id,
            payload.customer_id,
            pmt.amount_cents,
            pmt.method,
            pmt.payment_account_id,
            pmt.reference || null,
            "pending",
          ],
        );
      }

      // 4. Update Customer Credit Projection
      const creditDelta = subtotal_cents - paid_cents;
      await db.runAsync(
        `UPDATE customers SET credit_balance_cents = credit_balance_cents + ? WHERE local_id = ? OR server_id = ?`,
        [creditDelta, payload.customer_id, payload.customer_id],
      );

      // 5. Handle Returned Containers
      if (payload.returned_containers) {
        for (const ret of payload.returned_containers) {
          await db.runAsync(
            `INSERT INTO sale_returned_containers (local_id, sale_id, beverage_id, boxes, bottles, sync_status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              this.generateLocalId(),
              sale_id,
              ret.beverage_id,
              ret.boxes,
              ret.bottles,
              "pending",
            ],
          );

          await db.runAsync(
            `UPDATE customers SET outstanding_boxes = outstanding_boxes - ?, outstanding_bottles = outstanding_bottles - ? WHERE local_id = ? OR server_id = ?`,
            [ret.boxes, ret.bottles, payload.customer_id, payload.customer_id],
          );
        }
      }

      // 6. Handle Container Kasas (new empty containers given to customer)
      if (payload.container_kasas) {
        for (const kasa of payload.container_kasas) {
          await db.runAsync(
            `INSERT INTO sale_container_kasas (local_id, sale_id, beverage_id, count, sync_status)
             VALUES (?, ?, ?, ?, ?)`,
            [
              this.generateLocalId(),
              sale_id,
              kasa.beverage_id,
              kasa.count,
              "pending",
            ],
          );

          await db.runAsync(
            `UPDATE customers SET outstanding_boxes = outstanding_boxes + ? WHERE local_id = ? OR server_id = ?`,
            [kasa.count, payload.customer_id, payload.customer_id],
          );
        }
      }

      // 7. Enqueue Outbox
      await this.enqueueOutbox(sale_id, "CREATE", payload, client_mutation_id);
    });

    return sale_id;
  }
}

export const saleRepo = new SaleRepository();
