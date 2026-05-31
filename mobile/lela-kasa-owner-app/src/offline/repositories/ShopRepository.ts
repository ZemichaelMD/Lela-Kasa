import { BaseRepository, BaseMetadata } from './BaseRepository';

export interface ShopOffline extends BaseMetadata {
  owner_id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  currency: string;
  timezone?: string | null;
  low_stock_threshold: number;
  default_price_tier_id?: string | null;
}

export class ShopRepository extends BaseRepository<ShopOffline> {
  constructor() {
    super('shops');
  }

  async getFirst(): Promise<ShopOffline | null> {
    const db = await this.db();
    return await db.getFirstAsync<ShopOffline>(
      'SELECT * FROM shops LIMIT 1'
    );
  }
}

export const shopRepo = new ShopRepository();
