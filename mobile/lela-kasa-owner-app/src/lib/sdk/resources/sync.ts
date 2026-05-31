import { SdkClient } from "../client";

export interface SyncOutboxItem {
  id: string;
  entityType: string;
  operation: string;
  clientMutationId: string;
  payload: any;
}

export interface SyncRequest {
  shopId: string;
  lastSyncCursor?: string;
  outbox: SyncOutboxItem[];
}

export interface SyncResponse {
  serverTime: string;
  newSyncCursor: string;
  results: Array<{
    outboxId: string;
    status: "SUCCESS" | "ERROR" | "CONFLICT";
    serverId?: string;
    error?: string;
  }>;
  changes: {
    customers: any[];
    beverages: any[];
    sales: any[];
    payments: any[];
    priceTiers: any[];
    beveragePrices: any[];
    paymentAccounts: any[];
    customerLedgerEntries?: any[];
    stockMovements?: any[];
    tombstones: Record<string, string[]>;
  };
}

export class SyncResource {
  constructor(private client: SdkClient) {}

  async sync(data: SyncRequest): Promise<SyncResponse> {
    return this.client.post<SyncResponse>("/api/v1/sync", data);
  }
}
