import { BaseRepository, BaseMetadata } from './BaseRepository';

export interface PriceTierOffline extends BaseMetadata {
  shop_id: string;
  name: string;
  is_default: number;
}

export class PriceTierRepository extends BaseRepository<PriceTierOffline> {
  constructor() {
    super('price_tiers');
  }

  async getDefault(shopId: string): Promise<PriceTierOffline | null> {
    const db = await this.db();
    return await db.getFirstAsync<PriceTierOffline>(
      'SELECT * FROM price_tiers WHERE shop_id = ? AND is_default = 1 AND deleted_at IS NULL',
      [shopId],
    );
  }
}

export const priceTierRepo = new PriceTierRepository();
