import { BaseRepository, BaseMetadata } from "./BaseRepository";

export interface BeverageOffline extends BaseMetadata {
  shop_id: string;
  name: string;
  brand?: string | null;
  bottles_per_box: number;
  stock_bottles: number;
  is_active: number;
}

export class BeverageRepository extends BaseRepository<BeverageOffline> {
  constructor() {
    super("beverages");
  }

  async adjustStock(params: {
    id: string;
    shopId: string;
    actorUserId: string;
    deltaBottles: number;
    reason: string;
    notes?: string;
  }): Promise<void> {
    const beverage = await this.findById(params.id);
    if (!beverage) throw new Error("Beverage not found");

    const db = await this.db();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE beverages SET stock_bottles = stock_bottles + ?, local_updated_at = ? WHERE id = ?`,
        [params.deltaBottles, now, params.id],
      );

      await db.runAsync(
        `INSERT INTO stock_movements (id, shop_id, beverage_id, reason, bottles_delta, notes, recorded_by_id, sync_status, local_updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          this.generateLocalId(),
          params.shopId,
          params.id,
          params.reason,
          params.deltaBottles,
          params.notes || null,
          params.actorUserId,
          "pending",
          now,
        ],
      );

      await this.enqueueOutbox({
        shopId: params.shopId,
        actorUserId: params.actorUserId,
        entityType: "beverage",
        entityId: params.id,
        operation: "adjust_stock",
        method: "POST",
        path: `/api/v1/beverages/${params.id}/stock`,
        body: {
          deltaBottles: params.deltaBottles,
          reason: params.reason,
          notes: params.notes,
        },
      });
    });
  }
}

export const beverageRepo = new BeverageRepository();
