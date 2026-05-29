import { getDb } from '../db/database';

export interface LocalPaymentAccount {
  id: string;
  shopId: string;
  name: string;
  kind: string;
  holderName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  isActive: boolean;
  notes?: string | null;
}

export const paymentAccountRepository = {
  async getAll(): Promise<LocalPaymentAccount[]> {
    const db = await getDb();
    return db.getAllAsync<any>(
      'SELECT * FROM payment_accounts WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name ASC',
    );
  },
};
