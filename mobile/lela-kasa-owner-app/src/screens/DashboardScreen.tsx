import React, { useState, useEffect } from "react";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import type { RootStackParamList } from "../navigation/types";
import { getSdk } from "../lib/sdk";
import { QK } from "../lib/query-keys";
import { getDb } from "../offline";
import { useOffline } from "../offline/context";
import { SyncStatusBar } from "../components/SyncStatusBar";
import { StatCard } from "../components/StatCard";
import { Skeleton } from "../components/Skeleton";
import { AreaChart } from "../components/AreaChart";
import { DateFilter, type DatePreset } from "../components/DateFilter";
import { useTheme } from "../context/ThemeContext";
import { t } from "../lib/i18n";
import { radius, spacing, type } from "../theme";

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("goodMorning");
  if (hour < 17) return t("goodAfternoon");
  return t("goodEvening");
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getDateRange(preset: DatePreset): {
  from: string;
  to: string;
  label: string;
} {
  const now = new Date();
  let from: Date;
  let to = now;
  let label = "";

  switch (preset) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      label = t("today");
      break;
    case "week":
      from = new Date(now);
      from.setDate(now.getDate() - 7);
      label = t("thisWeek");
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      label = t("thisMonth");
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      label = t("thisMonth");
  }

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
    label,
  };
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const { isOnline } = useOffline();
  const [localSnapshot, setLocalSnapshot] = useState<any>(null);

  const range = getDateRange(datePreset);

  useEffect(() => {
    if (!isOnline) {
      getDb()
        .then((db) =>
          db.getFirstAsync<any>(
            "SELECT snapshot_json FROM dashboard_snapshots WHERE id = 'default'",
          ),
        )
        .then((row) => {
          if (row?.snapshot_json)
            setLocalSnapshot(JSON.parse(row.snapshot_json));
        });
    }
  }, [isOnline]);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QK.dashboard,
    queryFn: () => getSdk().dashboard.getSummary(),
    staleTime: 1000 * 60,
    enabled: isOnline,
  });

  const { data: salesData } = useQuery({
    queryKey: ["dashboard-sales", range.from, range.to],
    queryFn: () =>
      getSdk().reports.salesSummary({ dateFrom: range.from, dateTo: range.to }),
    enabled: isOnline && datePreset !== "today",
  });

  const displayData = data ?? localSnapshot;

  const periodSales =
    datePreset === "today"
      ? (displayData?.todaySalesCents ?? 0)
      : ((salesData as any)?.totalCents ?? 0);

  const periodSalesCount =
    datePreset === "today" ? 0 : ((salesData as any)?.saleCount ?? 0);

  const recentVoids = displayData?.recentVoids ?? [];
  const topBeverages = displayData?.topBeverages ?? [];
  const lowStock = displayData?.lowStockBeverages ?? [];

  const showStale = !data && !!localSnapshot;
  const { lastSyncedAt } = useOffline();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {showStale && (
        <View
          style={[styles.staleBanner, { backgroundColor: colors.warningLight }]}
        >
          <Ionicons name="time-outline" size={14} color={colors.warning} />
          <Text style={[styles.staleText, { color: colors.warning }]}>
            Cached data{" "}
            {lastSyncedAt
              ? `from ${new Date(lastSyncedAt).toLocaleString()}`
              : ""}
          </Text>
        </View>
      )}
      <View style={[styles.header]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatDate()}
          </Text>
        </View>
        <DateFilter
          visible={showDateFilter}
          selected={datePreset}
          onSelect={setDatePreset}
          onClose={() => setShowDateFilter(false)}
          label={range.label}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <>
            <View style={styles.statsRow}>
              <Skeleton
                height={100}
                style={{ flex: 1, marginRight: spacing[3] }}
              />
              <Skeleton height={100} style={{ flex: 1 }} />
            </View>
            <View style={styles.statsRow}>
              <Skeleton
                height={100}
                style={{ flex: 1, marginRight: spacing[3] }}
              />
              <Skeleton height={100} style={{ flex: 1 }} />
            </View>
          </>
        ) : data ? (
          <>
            {/* Main stats */}
            <View style={styles.statsRow}>
              <StatCard
                label={
                  datePreset === "today" ? t("todaysSales") : t("periodSales")
                }
                value={formatCurrency(periodSales)}
                icon="cash-outline"
              />
              <StatCard
                label={t("outstandingCredit")}
                value={formatCurrency(data.totalOutstandingCreditCents)}
                icon="card-outline"
              />
            </View>

            <View style={styles.statsRow}>
              <StatCard
                label={t("customersWithCredit")}
                value={String(data.customersWithCreditCount)}
                icon="people-outline"
              />
              <StatCard
                label={t("containersOut")}
                value={`${data.outstandingBoxes}B / ${data.outstandingBottles}b`}
                icon="cube-outline"
              />
            </View>

            {/* Period stats */}
            {datePreset !== "today" && (
              <View style={styles.statsRow}>
                <StatCard
                  label={t("salesCount")}
                  value={String(periodSalesCount)}
                  icon="receipt-outline"
                />
                <StatCard
                  label={t("avgSale")}
                  value={
                    periodSalesCount > 0
                      ? formatCurrency(
                          Math.round(periodSales / periodSalesCount),
                        )
                      : "0.00"
                  }
                  icon="trending-up-outline"
                />
              </View>
            )}

            {/* Sales trend chart */}
            <View
              style={[styles.chartCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.chartHeader}>
                <Text
                  style={[styles.chartTitle, { color: colors.textPrimary }]}
                >
                  {t("salesTrend")}
                </Text>
                <Text
                  style={[styles.chartSubtitle, { color: colors.textMuted }]}
                >
                  {range.label}
                </Text>
              </View>
              <AreaChart
                data={
                  data.weekSalesCents > 0
                    ? [
                        data.todaySalesCents,
                        data.weekSalesCents / 7,
                        data.weekSalesCents / 7,
                        data.weekSalesCents / 7,
                        data.weekSalesCents / 7,
                        data.weekSalesCents / 7,
                        data.weekSalesCents / 7,
                      ]
                    : [
                        data.todaySalesCents,
                        data.todaySalesCents * 0.8,
                        data.todaySalesCents * 0.6,
                        data.todaySalesCents * 0.9,
                        data.todaySalesCents * 0.7,
                        data.todaySalesCents * 1.1,
                        data.todaySalesCents,
                      ]
                }
                labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                height={100}
              />
            </View>

            {/* Top beverages mini chart */}
            {topBeverages.length > 0 && (
              <View
                style={[styles.chartCard, { backgroundColor: colors.surface }]}
              >
                <Text
                  style={[styles.chartTitle, { color: colors.textPrimary }]}
                >
                  {t("topBeverages")}
                </Text>
                <View style={styles.chartBars}>
                  {topBeverages.slice(0, 7).map((bev: any, i: number) => {
                    const maxBev = Math.max(
                      ...topBeverages.map((b: any) => b.totalBoxes),
                      1,
                    );
                    const height = Math.max(
                      ((bev.totalBoxes ?? 0) / maxBev) * 60,
                      4,
                    );
                    return (
                      <View key={i} style={styles.chartBarContainer}>
                        <View
                          style={[
                            styles.chartBar,
                            {
                              height,
                              backgroundColor: colors.primary,
                              opacity: 0.3 + (i / 7) * 0.7,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.chartBarLabel,
                            { color: colors.textMuted },
                          ]}
                        >
                          {bev.name?.slice(0, 3)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Quick actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => navigation.navigate("NewSale", {})}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={colors.textInverse}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: colors.textInverse },
                  ]}
                >
                  {t("newSale.title")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  const parent = navigation.getParent();
                  if (parent) {
                    parent.navigate("MainTabs", { screen: "Customers" });
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={colors.textPrimary}
                />
                <Text
                  style={[
                    styles.actionButtonSecondaryText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t("collectPayment")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Top customers preview */}
            {data.topCustomers?.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary }]}
                  >
                    {t("topCustomers")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const parent = navigation.getParent();
                      if (parent) {
                        parent.navigate("MainTabs", { screen: "Reports" });
                      }
                    }}
                  >
                    <Text
                      style={[styles.seeAllText, { color: colors.primary }]}
                    >
                      {t("seeAll")}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={[styles.listCard, { backgroundColor: colors.surface }]}
                >
                  {data.topCustomers.slice(0, 3).map((c: any, i: number) => (
                    <View
                      key={i}
                      style={[
                        styles.listRow,
                        i > 0 && {
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.rankBadge,
                          { backgroundColor: colors.primaryLight },
                        ]}
                      >
                        <Text
                          style={[styles.rankText, { color: colors.primary }]}
                        >
                          {i + 1}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.listName,
                          { color: colors.textPrimary, flex: 1 },
                        ]}
                      >
                        {c.name}
                      </Text>
                      <Text
                        style={[
                          styles.listAmount,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {formatCurrency(c.totalCents)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: spacing[4],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: { ...type.h2 },
  date: { ...type.body, marginTop: 2 },

  scrollContent: { paddingVertical: spacing[3] },
  statsRow: {
    flexDirection: "row",
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  chartCard: {
    marginHorizontal: spacing[5],
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  chartTitle: { ...type.bodyBold },
  chartSubtitle: { ...type.micro },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 80,
  },
  chartBarContainer: { alignItems: "center", flex: 1 },
  chartBar: { width: 12, borderRadius: 6, marginBottom: spacing[1] },
  chartBarLabel: { ...type.micro },
  quickActions: {
    flexDirection: "row",
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    borderRadius: radius.md,
    paddingVertical: spacing[4],
  },
  actionButtonText: { ...type.bodyBold, fontSize: 16 },
  actionButtonSecondaryText: { ...type.bodyBold, fontSize: 16 },
  section: { paddingHorizontal: spacing[5], marginBottom: spacing[4] },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  sectionTitle: { ...type.h4 },
  seeAllText: { ...type.caption },
  listCard: { borderRadius: radius.md, overflow: "hidden" },
  listRow: { flexDirection: "row", alignItems: "center", padding: spacing[4] },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[3],
  },
  rankText: { ...type.micro },
  listName: { ...type.bodyMedium },
  listAmount: { ...type.bodyBold },
  staleBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[4],
  },
  staleText: { ...type.micro },
});
