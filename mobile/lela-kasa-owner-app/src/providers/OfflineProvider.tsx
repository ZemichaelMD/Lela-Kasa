import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState, AppStateStatus } from "react-native";
import { syncCoordinator } from "../offline/sync/SyncCoordinator";
import { getDatabase, resetDatabase } from "../offline/db/database";
import { useAuth } from "../context/AuthContext";
import { SyncErrorModal } from "../components/SyncErrorModal";

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  failedCount: number;
  conflictedCount: number;
  syncVersion: number;
}

interface OfflineContextType extends SyncStatus {
  triggerSync: () => Promise<void>;
  syncNow: () => Promise<void>;
  resetOfflineData: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [conflictedCount, setConflictedCount] = useState(0);
  const [syncVersion, setSyncVersion] = useState(0);
  const [showSyncErrorModal, setShowSyncErrorModal] = useState(false);

  const isOnlineRef = useRef(isOnline);
  const isSyncingRef = useRef(isSyncing);
  const shopIdRef = useRef(user?.shopId);

  isOnlineRef.current = isOnline;
  isSyncingRef.current = isSyncing;
  shopIdRef.current = user?.shopId;

  const updateSummary = useCallback(async () => {
    try {
      const db = await getDatabase();

      // Get counts for different outbox statuses
      const counts = await db.getAllAsync<{ status: string; cnt: number }>(
        `SELECT status, COUNT(*) as cnt FROM outbox
         WHERE status IN ('pending', 'failed', 'conflicted')
         GROUP BY status`,
      );

      let pCount = 0;
      let fCount = 0;
      let cCount = 0;

      for (const row of counts) {
        if (row.status === "pending") pCount = row.cnt;
        else if (row.status === "failed") fCount = row.cnt;
        else if (row.status === "conflicted") cCount = row.cnt;
      }

      setPendingCount(pCount);
      setFailedCount(fCount);
      setConflictedCount(cCount);

      // Get last sync info
      const state = await db.getFirstAsync<{ last_sync_at: string | null }>(
        "SELECT last_sync_at FROM sync_state WHERE id = 1",
      );
      setLastSyncAt(state?.last_sync_at || null);
    } catch (e) {
      console.error("Failed to update summary", e);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setShowSyncErrorModal(false);
    await logout();
  }, [logout]);

  const triggerSync = useCallback(async () => {
    const shopId = shopIdRef.current;
    if (!shopId || !isOnlineRef.current || isSyncingRef.current) return;
    setIsSyncing(true);
    try {
      await syncCoordinator.sync(shopId);
      await updateSummary();
      setSyncVersion((v) => v + 1);
    } catch (error: any) {
      console.error("Sync failed", error);
      const msg = error?.message ?? "";
      if (msg.includes("no such column") || msg.includes("no such table")) {
        setShowSyncErrorModal(true);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [updateSummary]);

  const resetOfflineData = useCallback(async () => {
    setShowSyncErrorModal(false);
    try {
      await resetDatabase();
      await updateSummary();
      setSyncVersion((v) => v + 1);
      await triggerSync();
    } catch (e) {
      console.error("Failed to reset offline data", e);
      throw e;
    }
  }, [triggerSync, updateSummary]);

  const handleReset = useCallback(async () => {
    try {
      await resetOfflineData();
    } catch {
      // resetOfflineData already logs the error
    }
  }, [resetOfflineData]);

  useEffect(() => {
    const unsubSync = syncCoordinator.subscribe(() => {
      updateSummary();
    });

    const unsubNet = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online) triggerSync();
    });

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        triggerSync();
      }
    };
    const appStateSub = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    updateSummary();
    const interval = setInterval(updateSummary, 10000);

    return () => {
      unsubSync();
      unsubNet();
      appStateSub.remove();
      clearInterval(interval);
    };
  }, []);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        lastSyncAt,
        pendingCount,
        failedCount,
        conflictedCount,
        syncVersion,
        triggerSync,
        syncNow: triggerSync,
        resetOfflineData,
      }}
    >
      {children}
      <SyncErrorModal
        visible={showSyncErrorModal}
        onLogout={handleLogout}
        onReset={handleReset}
      />
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context)
    throw new Error("useOffline must be used within an OfflineProvider");
  return context;
};
