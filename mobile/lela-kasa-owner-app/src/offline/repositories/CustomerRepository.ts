import { BaseRepository, BaseMetadata } from './BaseRepository';

export interface CustomerOffline extends BaseMetadata {
  shop_id: string;
  name: string;
  phone?: string | null;
  credit_balance_cents: number;
  outstanding_boxes: number;
  outstanding_bottles: number;
  price_tier_id?: string | null;
}

export class CustomerRepository extends BaseRepository<CustomerOffline> {
  constructor() {
    super('customers');
  }

  async createOffline(data: {
    shop_id: string;
    name: string;
    phone?: string;
    price_tier_id?: string;
  }): Promise<string> {
    const local_id = this.generateLocalId();
    const client_mutation_id = this.generateLocalId(); // Use same logic for simplicity

    const customer: CustomerOffline = {
      ...data,
      local_id,
      credit_balance_cents: 0,
      outstanding_boxes: 0,
      outstanding_bottles: 0,
      sync_status: 'pending',
      server_version: 0,
    };

    const db = await this.db();
    await db.withTransactionAsync(async () => {
      await this.upsert(customer);
      await this.enqueueOutbox(local_id, 'CREATE', data, client_mutation_id);
    });

    return local_id;
  }

  async search(query: string): Promise<CustomerOffline[]> {
    const db = await this.db();
    return await db.getAllAsync<CustomerOffline>(
      `SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ?`,
      [`%${query}%`, `%${query}%`]
    );
  }
}

export const customerRepo = new CustomerRepository();
