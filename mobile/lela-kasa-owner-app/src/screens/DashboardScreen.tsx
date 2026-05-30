import React, { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { RootStackParamList } from "../navigation/types";
import { useOfflineQuery } from "../offline/hooks/useOfflineQuery";
import { dashboardRepo } from "../offline/repositories/DashboardRepository";
import { useOffline } from "../providers/OfflineProvider";
import { StatCard } from "../components/StatCard";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { t } from "../lib/i18n";
import { radius, spacing, type, layout } from "../theme";

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 0,
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("goodMorning");
  if (hour < 17) return t("goodAfternoon");
  return t("goodEvening");
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isOnline, isSyncing, triggerSync, pendingCount } = useOffline();

  const { data, refetch } = useOfflineQuery(
    ["dashboard-summary", user?.shopId],
    () => dashboardRepo.getSummary(user?.shopId || ""),
    { enabled: !!user?.shopId },
  );

  const onRefresh = async () => {
    if (isOnline) {
      await triggerSync();
    }
    refetch();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Modern Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {getGreeting()}, {user?.name?.split(" ")[0]}
          </Text>
          <View style={styles.syncStatusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? colors.success : colors.warning },
              ]}
            />
            <Text
              style={[styles.syncStatusText, { color: colors.textSecondary }]}
            >
              {isOnline ? "Online" : "Offline Mode"} •{" "}
              {isSyncing
                ? "Syncing..."
                : pendingCount > 0
                  ? `${pendingCount} pending`
                  : "Synced"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.profileButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate("Settings")}
        >
          <Ionicons name="person-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Main Sales Card (Large) */}
        <View style={[styles.mainCard, { backgroundColor: colors.primary }]}>
          <Text
            style={[
              styles.mainCardLabel,
              { color: colors.textInverse, opacity: 0.8 },
            ]}
          >
            {t("todaysSales")}
          </Text>
          <Text style={[styles.mainCardValue, { color: colors.textInverse }]}>
            {formatCurrency(data?.todaySalesCents || 0)}
          </Text>
          <View style={styles.mainCardFooter}>
            <Ionicons name="trending-up" size={16} color={colors.textInverse} />
            <Text style={[styles.mainCardTrend, { color: colors.textInverse }]}>
              +12% from yesterday
            </Text>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate("NewSale", {})}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="cart" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
              New Sale
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate("Customers")}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: colors.successLight },
              ]}
            >
              <Ionicons name="people" size={24} color={colors.success} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
              Customers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate("BeveragesManagement")}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: colors.warningLight },
              ]}
            >
              <Ionicons name="beaker" size={24} color={colors.warning} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
              Inventory
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate("Reports")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E0E7FF" }]}>
              <Ionicons name="bar-chart" size={24} color="#4F46E5" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
              Reports
            </Text>
          </TouchableOpacity>
        </View>

        {/* Secondary Stats Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Financial Overview
          </Text>
          <View style={styles.statsRow}>
            <StatCard
              label={t("outstandingCredit")}
              value={formatCurrency(data?.totalOutstandingCreditCents || 0)}
              icon="card-outline"
              // color={colors.danger}
            />
            <StatCard
              label={t("customersWithCredit")}
              value={String(data?.customersWithCreditCount || 0)}
              icon="people-outline"
              // color={colors.primary}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label="Boxes Out"
              value={String(data?.outstandingBoxes || 0)}
              icon="cube-outline"
              // color={colors.warning}
            />
            <StatCard
              label="Bottles Out"
              value={String(data?.outstandingBottles || 0)}
              icon="flask-outline"
              // color={colors.success}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    ...type.h2,
    fontSize: 22,
  },
  syncStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncStatusText: {
    ...type.caption,
    fontSize: 12,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  scrollContent: {
    paddingBottom: layout.screenPaddingBottom,
  },
  mainCard: {
    marginHorizontal: spacing[5],
    padding: spacing[6],
    borderRadius: radius.xl,
    marginTop: spacing[2],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  mainCardLabel: {
    ...type.bodyMedium,
    fontSize: 14,
    marginBottom: 8,
  },
  mainCardValue: {
    ...type.h1,
    fontSize: 36,
  },
  mainCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  mainCardTrend: {
    ...type.caption,
    fontSize: 12,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing[4],
    marginTop: spacing[6],
  },
  actionCard: {
    width: "45%",
    aspectRatio: 1,
    margin: "2.5%",
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionLabel: {
    ...type.bodyBold,
    fontSize: 14,
  },
  section: {
    marginTop: spacing[8],
    paddingHorizontal: spacing[5],
  },
  sectionTitle: {
    ...type.h4,
    marginBottom: spacing[4],
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing[4],
    marginBottom: spacing[4],
  },
});
