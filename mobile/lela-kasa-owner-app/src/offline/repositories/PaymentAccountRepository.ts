import { BaseRepository, BaseMetadata } from './BaseRepository';

export interface PaymentAccountOffline extends BaseMetadata {
  shop_id: string;
  name: string;
  kind: string;
  account_number?: string | null;
  is_active: number;
}

export class PaymentAccountRepository extends BaseRepository<PaymentAccountOffline> {
  constructor() {
    super('payment_accounts');
  }

  async listActive(shopId: string): Promise<PaymentAccountOffline[]> {
    const db = await this.db();
    return await db.getAllAsync<PaymentAccountOffline>(
      'SELECT * FROM payment_accounts WHERE shop_id = ? AND is_active = 1 AND deleted_at IS NULL',
      [shopId],
    );
  }
}

export const paymentAccountRepo = new PaymentAccountRepository();
