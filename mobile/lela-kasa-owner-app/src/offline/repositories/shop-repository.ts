import { getDb } from '../db/database';

export interface LocalShop {
  id: string;
  ownerId: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  currency: string;
  timezone: string;
  lowStockThreshold: number;
  defaultPriceTierId?: string | null;
}

export const shopRepository = {
  async get(): Promise<LocalShop | null> {
    const db = await getDb();
    return db.getFirstAsync<any>(
      'SELECT * FROM shops WHERE deleted_at IS NULL LIMIT 1',
    );
  },
};
