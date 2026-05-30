import { BaseRepository, BaseMetadata } from './BaseRepository';

export interface PriceTierOffline extends BaseMetadata {
  shop_id: string;
  name: string;
  isDefault: number;
}

export class PriceTierRepository extends BaseRepository<PriceTierOffline> {
  constructor() {
    super('price_tiers');
  }

  async getDefault(shopId: string): Promise<PriceTierOffline | null> {
    const db = await this.db();
    return await db.getFirstAsync<PriceTierOffline>(
      'SELECT * FROM price_tiers WHERE shop_id = ? AND isDefault = 1',
      [shopId]
    );
  }
}

export const priceTierRepo = new PriceTierRepository();
