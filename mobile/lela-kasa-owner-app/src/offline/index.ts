export { getDb, resetDb, closeDatabase } from "./db/database";
export {
  enqueueOperation,
  getPendingOperations,
  getFailedOperations,
  getOutboxCounts,
  updateOperationStatus,
  markOperationSynced,
  resetStaleSyncingOperations,
  generateClientMutationId,
  generateIdempotencyKey,
} from "./outbox";
export { syncCoordinator } from "./sync/SyncCoordinator";
export { isOnline } from "./network/netinfo";

export { customerRepo } from "./repositories/CustomerRepository";
export { saleRepo } from "./repositories/SaleRepository";
export { beverageRepo } from "./repositories/BeverageRepository";
export { shopRepo } from "./repositories/ShopRepository";
export { priceTierRepo } from "./repositories/PriceTierRepository";
export { paymentAccountRepo } from "./repositories/PaymentAccountRepository";
export { beveragePriceRepo } from "./repositories/BeveragePriceRepository";
export { syncStateRepo } from "./repositories/SyncStateRepository";

export type {
  SyncStatus,
  NetworkState,
  OutboxStatus,
  OutboxOperation,
  SyncState,
  SyncSummary,
  PushResult,
} from "./types";
