import { getDb } from '../db/database';

export interface LocalPriceTier {
  id: string;
  shopId: string;
  name: string;
  kind: string;
  isDefault: boolean;
}

export interface LocalTierPrice {
  id: string;
  priceTierId: string;
  beverageId: string;
  pricePerBoxCents: number;
  pricePerBottleCents: number;
}

export const priceTierRepository = {
  async getAll(): Promise<LocalPriceTier[]> {
    const db = await getDb();
    return db.getAllAsync<any>(
      'SELECT * FROM price_tiers WHERE deleted_at IS NULL ORDER BY name ASC',
    );
  },

  async getPrices(tierId: string): Promise<LocalTierPrice[]> {
    const db = await getDb();
    return db.getAllAsync<any>(
      'SELECT * FROM tier_prices WHERE price_tier_id = ? AND deleted_at IS NULL',
      [tierId],
    );
  },
};
