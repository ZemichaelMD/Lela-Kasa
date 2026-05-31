import { useEffect, useState } from "react";
import { useOffline } from "../../providers/OfflineProvider";

export function useOfflineStatus() {
  const { isOnline, isSyncing, lastSyncAt, pendingCount, syncNow } =
    useOffline();

  return {
    isOnline,
    isSyncing,
    lastSyncAt,
    pendingCount,
    syncNow,
  };
}
