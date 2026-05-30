import { BaseRepository, BaseMetadata } from './BaseRepository';

export interface BeverageOffline extends BaseMetadata {
  shop_id: string;
  name: string;
  brand?: string | null;
  bottles_per_box: number;
  stock_bottles: number;
  isActive: number;
}

export class BeverageRepository extends BaseRepository<BeverageOffline> {
  constructor() {
    super('beverages');
  }

  async adjustStock(local_id: string, deltaBottles: number, reason: string): Promise<void> {
    const beverage = await this.findById(local_id);
    if (!beverage) throw new Error('Beverage not found');

    const client_mutation_id = this.generateLocalId();
    const db = await this.db();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE beverages SET stock_bottles = stock_bottles + ? WHERE local_id = ?`,
        [deltaBottles, local_id]
      );

      await db.runAsync(
        `INSERT INTO stock_movements (local_id, shop_id, beverage_id, reason, bottles_delta, sync_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          this.generateLocalId(),
          beverage.shop_id,
          beverage.server_id || local_id,
          reason,
          deltaBottles,
          'pending'
        ]
      );

      await this.enqueueOutbox(local_id, 'UPDATE', { deltaBottles, reason }, client_mutation_id);
    });
  }
}

export const beverageRepo = new BeverageRepository();
