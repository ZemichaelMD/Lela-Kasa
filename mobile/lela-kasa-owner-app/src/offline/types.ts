export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed' | 'conflicted' | 'deleted';

export type NetworkState = 'online' | 'offline' | 'degraded' | 'syncing';

export type OutboxStatus = 'pending' | 'syncing' | 'done' | 'failed' | 'conflicted';

export interface OutboxOperation {
  id: string;
  shopId: string;
  actorUserId: string;
  entityType?: string;
  entityId?: string;
  clientMutationId: string;
  idempotencyKey: string;
  operation: string;
  method: string;
  path: string;
  bodyJson?: string;
  dependsOnJson?: string;
  status: OutboxStatus;
  attemptCount: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncState {
  cursor?: string;
  lastBootstrapAt?: string;
  lastPullAt?: string;
  lastSuccessfulSyncAt?: string;
  isSyncing: boolean;
}

export interface SyncSummary {
  pendingCount: number;
  failedCount: number;
  conflictedCount: number;
  lastSyncedAt?: string;
  networkState: NetworkState;
}

export interface PushResult {
  operationId: string;
  status: 'success' | 'failed' | 'conflicted';
  serverResponse?: unknown;
  errorCode?: string;
  errorMessage?: string;
}
