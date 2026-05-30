import { getDatabase } from '../db/database';

export interface BeveragePriceOffline {
  local_id: string;
  server_id: string;
  beverage_id: string;
  price_tier_id: string;
  price_per_box_cents: number;
  price_per_bottle_cents: number;
}

export class BeveragePriceRepository {
  async getPricesByTier(tierId: string): Promise<BeveragePriceOffline[]> {
    const db = await getDatabase();
    return await db.getAllAsync<BeveragePriceOffline>(
      'SELECT * FROM beverage_prices WHERE price_tier_id = ?',
      [tierId]
    );
  }

  async getPrice(beverageId: string, tierId: string): Promise<BeveragePriceOffline | null> {
    const db = await getDatabase();
    return await db.getFirstAsync<BeveragePriceOffline>(
      'SELECT * FROM beverage_prices WHERE beverage_id = ? AND price_tier_id = ?',
      [beverageId, tierId]
    );
  }
}

export const beveragePriceRepo = new BeveragePriceRepository();
