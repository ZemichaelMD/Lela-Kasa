import React, { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { OfflineContext } from './OfflineContext';
import {
  getCurrentNetworkState,
  subscribeToNetwork,
  startNetworkMonitoring,
} from '../network';
import { getSyncSummary, subscribeToSync, syncNow, setCurrentShopId } from '../sync/sync-coordinator';
import { resetStaleSyncingOperations } from '../outbox';
import { useAuth } from '../../context/AuthContext';
import type { NetworkState, SyncSummary } from '../types';

interface Props {
  children: React.ReactNode;
}

export function OfflineProvider({ children }: Props) {
  const { user } = useAuth();
  const [networkState, setNetworkState] = useState<NetworkState>(getCurrentNetworkState());
  const [summary, setSummary] = useState<SyncSummary>({
    pendingCount: 0,
    failedCount: 0,
    conflictedCount: 0,
    networkState: 'offline',
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync shop ID to the sync coordinator whenever auth user changes
  useEffect(() => {
    setCurrentShopId(user?.shopId ?? null);
  }, [user?.shopId]);

  useEffect(() => {
    const unsubNetwork = subscribeToNetwork(setNetworkState);
    const unsubSync = subscribeToSync(setSummary);
    const stopMonitoring = startNetworkMonitoring();

    resetStaleSyncingOperations();

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        syncNow('app_foreground');
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);

    if (user) {
      syncNow('app_launch');
    }

    return () => {
      unsubNetwork();
      unsubSync();
      stopMonitoring();
      sub.remove();
    };
  }, [user]);

  const handleSyncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncNow('manual');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const value = {
    networkState,
    isOnline: networkState === 'online',
    pendingCount: summary.pendingCount,
    failedCount: summary.failedCount,
    conflictedCount: summary.conflictedCount,
    lastSyncedAt: summary.lastSyncedAt,
    isSyncing: isSyncing || networkState === 'syncing',
    syncNow: handleSyncNow,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}
