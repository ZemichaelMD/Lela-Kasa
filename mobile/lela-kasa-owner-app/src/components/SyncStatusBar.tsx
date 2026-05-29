import React from "react";
import { TouchableOpacity, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOffline } from "../offline/context";
import { useTheme } from "../context/ThemeContext";
import { spacing, type, radius } from "../theme";

export function SyncStatusBar() {
  const { colors } = useTheme();
  const {
    networkState,
    pendingCount,
    failedCount,
    conflictedCount,
    lastSyncedAt,
    isSyncing,
    syncNow,
  } = useOffline();

  const isOffline = networkState === "offline";
  const isDegraded = networkState === "degraded";

  if (isSyncing) {
    return (
      <View style={[styles.bar, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="sync-outline" size={14} color={colors.primary} />
        <Text style={[styles.text, { color: colors.primary }]}>Syncing...</Text>
      </View>
    );
  }

  if (pendingCount > 0 || failedCount > 0 || conflictedCount > 0) {
    return (
      <TouchableOpacity
        style={[
          styles.bar,
          {
            backgroundColor: isOffline
              ? colors.warningLight
              : colors.surfaceMuted,
          },
        ]}
        onPress={syncNow}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isOffline ? "cloud-offline-outline" : "cloud-upload-outline"}
          size={14}
          color={isOffline ? colors.warning : colors.textSecondary}
        />
        <Text
          style={[
            styles.text,
            { color: isOffline ? colors.warning : colors.textSecondary },
          ]}
        >
          {isOffline ? "Offline - " : ""}
          {pendingCount} pending
          {failedCount > 0 ? `, ${failedCount} failed` : ""}
          {conflictedCount > 0 ? `, ${conflictedCount} conflicts` : ""}
        </Text>
        <Ionicons name="refresh-outline" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  if (isDegraded) {
    return (
      <View style={[styles.bar, { backgroundColor: colors.warningLight }]}>
        <Ionicons name="warning-outline" size={14} color={colors.warning} />
        <Text style={[styles.text, { color: colors.warning }]}>
          Limited connectivity
        </Text>
      </View>
    );
  }

  if (isOffline) {
    return (
      <View style={[styles.bar, { backgroundColor: colors.warningLight }]}>
        <Ionicons
          name="cloud-offline-outline"
          size={14}
          color={colors.warning}
        />
        <Text style={[styles.text, { color: colors.warning }]}>Offline</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  bar: {
    marginTop: spacing[8],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[1],
    // paddingHorizontal: spacing[4],
  },
  text: {
    ...type.micro,
  },
});
