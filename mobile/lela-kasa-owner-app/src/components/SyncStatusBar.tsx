import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOffline } from "../providers/OfflineProvider";
import { useTheme } from "../context/ThemeContext";
import { spacing, type, radius } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function SyncStatusBar() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isOnline, pendingCount, isSyncing, syncNow } = useOffline();

  if (isOnline && !isSyncing && pendingCount === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + 5 }]}>
      <TouchableOpacity
        style={[
          styles.pill,
          {
            backgroundColor: isDark
              ? "rgba(30, 41, 59, 0.9)"
              : "rgba(255, 255, 255, 0.9)",
            borderColor: isSyncing
              ? colors.primary
              : !isOnline
                ? colors.warning
                : colors.border,
          },
        ]}
        onPress={syncNow}
        activeOpacity={0.8}
      >
        <Ionicons
          name={
            isSyncing ? "sync" : !isOnline ? "cloud-offline" : "cloud-upload"
          }
          size={14}
          color={
            isSyncing
              ? colors.primary
              : !isOnline
                ? colors.warning
                : colors.textSecondary
          }
        />
        <Text
          style={[
            styles.text,
            {
              color: isSyncing
                ? colors.primary
                : !isOnline
                  ? colors.warning
                  : colors.textSecondary,
            },
          ]}
        >
          {isSyncing
            ? "Syncing..."
            : !isOnline
              ? "Offline"
              : `${pendingCount} pending`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  text: {
    ...type.micro,
    fontWeight: "700",
  },
});
