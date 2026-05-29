import { getDb } from '../db/database';

export interface LocalBeverage {
  id: string;
  shopId: string;
  name: string;
  brand?: string | null;
  sizeMl?: number | null;
  bottlesPerBox: number;
  imageUrl?: string | null;
  isActive: boolean;
  stockBottles: number;
  syncStatus: string;
}

export const beverageRepository = {
  async getAll(shopId: string, includeInactive = false): Promise<LocalBeverage[]> {
    const db = await getDb();
    if (includeInactive) {
      return db.getAllAsync<any>(
        'SELECT * FROM beverages WHERE shop_id = ? AND deleted_at IS NULL ORDER BY name ASC',
        [shopId],
      );
    }
    return db.getAllAsync<any>(
      'SELECT * FROM beverages WHERE shop_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY name ASC',
      [shopId],
    );
  },

  async getById(id: string): Promise<LocalBeverage | null> {
    const db = await getDb();
    return db.getFirstAsync<any>(
      'SELECT * FROM beverages WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
  },

  async getStockMovements(beverageId: string): Promise<any[]> {
    const db = await getDb();
    return db.getAllAsync<any>(
      `SELECT * FROM stock_movements
       WHERE beverage_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 50`,
      [beverageId],
    );
  },
};
