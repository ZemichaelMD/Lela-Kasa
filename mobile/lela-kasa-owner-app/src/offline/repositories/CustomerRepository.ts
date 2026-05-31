import { BaseRepository, BaseMetadata } from "./BaseRepository";

export interface CustomerOffline extends BaseMetadata {
  shop_id: string;
  name: string;
  phone?: string | null;
  credit_balance_cents: number;
  outstanding_boxes: number;
  outstanding_bottles: number;
  price_tier_id?: string | null;
}

export class CustomerRepository extends BaseRepository<CustomerOffline> {
  constructor() {
    super("customers");
  }

  async createOffline(data: {
    shop_id: string;
    actor_user_id: string;
    name: string;
    phone?: string;
    price_tier_id?: string;
  }): Promise<string> {
    const id = this.generateLocalId();
    const now = new Date().toISOString();

    const customer: CustomerOffline = {
      id,
      shop_id: data.shop_id,
      name: data.name,
      phone: data.phone || null,
      price_tier_id: data.price_tier_id || null,
      credit_balance_cents: 0,
      outstanding_boxes: 0,
      outstanding_bottles: 0,
      sync_status: "pending",
      server_version: 0,
      last_synced_at: now,
    };

    const db = await this.db();
    await db.withTransactionAsync(async () => {
      await this.upsert(customer);
      await this.enqueueOutbox({
        shopId: data.shop_id,
        actorUserId: data.actor_user_id,
        entityType: "customers",
        entityId: id,
        operation: "create_customer",
        method: "POST",
        path: "/api/v1/customers",
        body: {
          name: data.name,
          phone: data.phone,
          priceTierId: data.price_tier_id,
        },
      });
    });

    return id;
  }

  async recordPayment(params: {
    customerId: string;
    shopId: string;
    actorUserId: string;
    amountCents: number;
    paymentAccountId: string;
    method: string;
    reference?: string;
    notes?: string;
  }): Promise<void> {
    const db = await this.db();
    const now = new Date().toISOString();
    const paymentId = this.generateLocalId();

    await db.withTransactionAsync(async () => {
      // 1. Update customer credit balance
      await db.runAsync(
        `UPDATE customers SET credit_balance_cents = credit_balance_cents - ?, local_updated_at = ? WHERE id = ?`,
        [params.amountCents, now, params.customerId],
      );

      // 2. Insert into payments table (standalone payment)
      await db.runAsync(
        `INSERT INTO payments (id, shop_id, customer_id, payment_account_id, amount_cents, method, reference, notes, paid_at, local_updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentId,
          params.shopId,
          params.customerId,
          params.paymentAccountId,
          params.amountCents,
          params.method,
          params.reference || null,
          params.notes || null,
          now,
          now,
          "pending",
        ],
      );

      // 3. Enqueue outbox
      await this.enqueueOutbox({
        shopId: params.shopId,
        actorUserId: params.actorUserId,
        entityType: "payment",
        entityId: paymentId,
        operation: "record_customer_payment",
        method: "POST",
        path: `/api/v1/customers/${params.customerId}/payments`,
        body: {
          amountCents: params.amountCents,
          paymentAccountId: params.paymentAccountId,
          method: params.method,
          reference: params.reference,
          notes: params.notes,
        },
      });
    });
  }

  async recordReturn(params: {
    customerId: string;
    shopId: string;
    actorUserId: string;
    beverageId: string;
    boxes: number;
    bottles: number;
    notes?: string;
  }): Promise<void> {
    const db = await this.db();
    const now = new Date().toISOString();
    const returnId = this.generateLocalId();

    await db.withTransactionAsync(async () => {
      // 1. Update customer container balance
      await db.runAsync(
        `UPDATE customers SET
          outstanding_boxes = MAX(0, outstanding_boxes - ?),
          outstanding_bottles = MAX(0, outstanding_bottles - ?),
          local_updated_at = ?
         WHERE id = ?`,
        [params.boxes, params.bottles, now, params.customerId],
      );

      // 2. Insert into stock movements? Or a dedicated returns table?
      // For simplicity, we'll use a generic outbox entry for now
      // as our schema doesn't have a standalone 'returns' table besides the sale-linked one.

      // 3. Enqueue outbox
      await this.enqueueOutbox({
        shopId: params.shopId,
        actorUserId: params.actorUserId,
        entityType: "customer",
        entityId: params.customerId,
        operation: "record_return",
        method: "POST",
        path: `/api/v1/customers/${params.customerId}/returns`,
        body: {
          beverageId: params.beverageId,
          boxes: params.boxes,
          bottles: params.bottles,
          notes: params.notes,
        },
      });
    });
  }

  async search(query: string): Promise<CustomerOffline[]> {
    const db = await this.db();
    return await db.getAllAsync<CustomerOffline>(
      `SELECT * FROM customers WHERE (name LIKE ? OR phone LIKE ?) AND deleted_at IS NULL`,
      [`%${query}%`, `%${query}%`],
    );
  }
}

export const customerRepo = new CustomerRepository();
