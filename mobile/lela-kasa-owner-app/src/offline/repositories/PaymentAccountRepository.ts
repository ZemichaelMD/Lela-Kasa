import { BaseRepository, BaseMetadata } from './BaseRepository';

export interface PaymentAccountOffline extends BaseMetadata {
  shop_id: string;
  name: string;
  kind: string;
  account_number?: string | null;
  isActive: number;
}

export class PaymentAccountRepository extends BaseRepository<PaymentAccountOffline> {
  constructor() {
    super('payment_accounts');
  }

  async listActive(shopId: string): Promise<PaymentAccountOffline[]> {
    const db = await this.db();
    return await db.getAllAsync<PaymentAccountOffline>(
      'SELECT * FROM payment_accounts WHERE shop_id = ? AND isActive = 1',
      [shopId]
    );
  }
}

export const paymentAccountRepo = new PaymentAccountRepository();
