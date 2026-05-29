import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  getCurrentNetworkState,
  subscribeToNetwork,
  startNetworkMonitoring,
} from '../network';
import { getSyncSummary, subscribeToSync, syncNow } from '../sync/sync-coordinator';
import { resetStaleSyncingOperations } from '../outbox';
import type { NetworkState, SyncSummary } from '../types';

export function useOfflineStatus() {
  const [networkState, setNetworkState] = useState<NetworkState>(getCurrentNetworkState());
  const [summary, setSummary] = useState<SyncSummary>({
    pendingCount: 0,
    failedCount: 0,
    conflictedCount: 0,
    networkState: 'offline',
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubNetwork = subscribeToNetwork(setNetworkState);
    const unsubSync = subscribeToSync(setSummary);

    resetStaleSyncingOperations();

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        syncNow('app_foreground');
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);

    syncNow('app_launch');

    return () => {
      unsubNetwork();
      unsubSync();
      sub.remove();
    };
  }, []);

  const handleSyncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncNow('manual');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    networkState,
    isOnline: networkState === 'online',
    pendingCount: summary.pendingCount,
    failedCount: summary.failedCount,
    conflictedCount: summary.conflictedCount,
    lastSyncedAt: summary.lastSyncedAt,
    isSyncing,
    syncNow: handleSyncNow,
  };
}
