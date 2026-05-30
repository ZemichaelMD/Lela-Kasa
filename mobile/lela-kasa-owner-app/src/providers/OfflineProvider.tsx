import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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
  syncVersion: number;
}

interface OfflineContextType extends SyncStatus {
  triggerSync: () => Promise<void>;
  syncNow: () => Promise<void>;
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
  const [syncVersion, setSyncVersion] = useState(0);
  const [showSyncErrorModal, setShowSyncErrorModal] = useState(false);

  const updatePendingCount = async () => {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM outbox WHERE status = "pending"',
    );
    setPendingCount(result?.count || 0);
  };

  const handleLogout = useCallback(async () => {
    setShowSyncErrorModal(false);
    await logout();
  }, [logout]);

  const handleReset = useCallback(async () => {
    setShowSyncErrorModal(false);
    try {
      await resetDatabase();
      setPendingCount(0);
      setLastSyncAt(null);
    } catch (e) {
      console.error("Failed to reset database", e);
    }
  }, []);

  const triggerSync = async () => {
    if (!user?.shopId || !isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncCoordinator.sync(user.shopId);
      setLastSyncAt(new Date().toISOString());
      await updatePendingCount();
      setSyncVersion((v) => v + 1);
    } catch (error: any) {
      const msg = error?.message ?? "";
      if (msg.includes("no such column")) {
        setShowSyncErrorModal(true);
      } else {
        console.error("Manual sync failed", error);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // 1. Monitor Network
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable can be null (unknown). Assume online if isConnected is true and reachable is not false.
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online) triggerSync();
    });

    // 2. Initial state check
    NetInfo.fetch().then((state) => {
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

    // 3. Initial Count
    updatePendingCount();

    // 4. Poll for pending count (or use an event emitter in a real app)
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      unsubscribe();
      appStateSub.remove();
      clearInterval(interval);
    };
  }, [user?.shopId, isOnline]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        lastSyncAt,
        pendingCount,
        syncVersion,
        triggerSync,
        syncNow: triggerSync,
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
