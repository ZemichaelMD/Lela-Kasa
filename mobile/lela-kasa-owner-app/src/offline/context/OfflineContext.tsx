import React, { createContext, useContext } from 'react';
import type { NetworkState } from '../types';

export interface OfflineContextValue {
  networkState: NetworkState;
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  conflictedCount: number;
  lastSyncedAt?: string;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
}

export const OfflineContext = createContext<OfflineContextValue>({
  networkState: 'offline',
  isOnline: false,
  pendingCount: 0,
  failedCount: 0,
  conflictedCount: 0,
  isSyncing: false,
  syncNow: async () => {},
});

export function useOffline() {
  return useContext(OfflineContext);
}
