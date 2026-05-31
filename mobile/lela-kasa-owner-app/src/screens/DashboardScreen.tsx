import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { getSdk } from "../lib/sdk";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { t } from "../lib/i18n";
import { formatMoneyCents } from "../lib/util/money";
import { radius, spacing, type, shadow } from "../theme";

import {
  KpiCard,
  RangeSelector,
  TopCustomersList,
  LowStockWidget,
  RecentVoidsWidget,
} from "../components/DashboardWidgets";
import type { RangeMode } from "../components/DashboardWidgets";
import {
  SalesTrendChart,
  TopBeveragesDonut,
} from "../components/DashboardCharts";
import { CalendarSheet } from "../components/CalendarSheet";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("goodMorning");
  if (hour < 17) return t("goodAfternoon");
  return t("goodEvening");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getRangeDates(mode: Exclude<RangeMode, "custom">) {
  const today = todayIso();
  if (mode === "today") return { dateFrom: today, dateTo: today };
  if (mode === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return { dateFrom: d.toISOString().slice(0, 10), dateTo: today };
  }
  return { dateFrom: firstDayOfMonth(), dateTo: today };
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const sdk = useMemo(() => getSdk(), []);

  const [mode, setMode] = useState<RangeMode>("month");
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(todayIso);
  const [filterCreatedById, setFilterCreatedById] = useState("");
  const [employees, setEmployees] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [showFilter, setShowFilter] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Sync dates when preset mode changes
  useEffect(() => {
    if (mode !== "custom") {
      const r = getRangeDates(mode);
      setDateFrom(r.dateFrom);
      setDateTo(r.dateTo);
    }
  }, [mode]);

  // Main dashboard data
  const {
    data: dashData,
    isLoading: dashLoading,
    refetch: refetchDash,
  } = useQuery({
    queryKey: ["dashboard", filterCreatedById],
    queryFn: () =>
      sdk.dashboard.getDashboard("month", filterCreatedById || undefined),
    staleTime: 30_000,
  });

  // Sales trend data
  const { data: summaryData, isLoading: trendLoading } = useQuery({
    queryKey: ["dashboard-trend", dateFrom, dateTo, filterCreatedById],
    queryFn: () =>
      sdk.reports.salesSummary({
        dateFrom,
        dateTo,
        createdById: filterCreatedById || undefined,
      }),
    enabled: !!dateFrom && !!dateTo,
    staleTime: 30_000,
  });

  // Employees for filter
  useEffect(() => {
    sdk.employees
      .list()
      .then(setEmployees)
      .catch(() => {});
  }, [sdk]);

  const loading = dashLoading;
  const refreshing = dashLoading || trendLoading;

  const salesValue =
    mode === "custom"
      ? (summaryData?.totalAmountCents ?? 0)
      : mode === "today"
        ? (dashData?.todaySalesCents ?? 0)
        : mode === "week"
          ? (dashData?.weekSalesCents ?? 0)
          : (dashData?.monthSalesCents ?? 0);

  const trendLabel =
    mode === "today"
      ? "Today"
      : mode === "week"
        ? "Week"
        : mode === "month"
          ? "Month"
          : `${dateFrom} – ${dateTo}`;

  const lowStockCount = dashData?.lowStockBeverages?.length ?? 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {getGreeting()}, {user?.name?.split(" ")[0]}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t("overview")}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.profileBtn, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate("Settings")}
        >
          <Ionicons name="person-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refetchDash()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Range Selector + Employee Filter */}
        <View style={styles.toolbar}>
          <RangeSelector mode={mode} onModeChange={setMode} />
          <View style={{ flexDirection: "row", gap: 6 }}>
            {mode === "custom" ? (
              <TouchableOpacity
                style={[styles.filterBtn, { backgroundColor: colors.surface }]}
                onPress={() => setShowCalendar(true)}
              >
                <Ionicons name="calendar" size={16} color={colors.primary} />
              </TouchableOpacity>
            ) : null}
            {employees.length > 0 && (
              <TouchableOpacity
                style={[styles.filterBtn, { backgroundColor: colors.surface }]}
                onPress={() => setShowFilter(!showFilter)}
              >
                <Ionicons
                  name={
                    showFilter || filterCreatedById
                      ? "funnel"
                      : "funnel-outline"
                  }
                  size={16}
                  color={
                    filterCreatedById ? colors.primary : colors.textSecondary
                  }
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Custom range label */}
        {mode === "custom" && dateFrom && dateTo && (
          <TouchableOpacity
            style={[
              styles.customRangeBadge,
              { backgroundColor: colors.primary + "15" },
            ]}
            onPress={() => setShowCalendar(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={13}
              color={colors.primary}
            />
            <Text style={[styles.customRangeText, { color: colors.primary }]}>
              {dateFrom} – {dateTo}
            </Text>
          </TouchableOpacity>
        )}

        {/* Employee filter bar */}
        {showFilter && employees.length > 0 && (
          <View style={[styles.filterBar, { backgroundColor: colors.surface }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filterCreatedById && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setFilterCreatedById("")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: !filterCreatedById
                        ? colors.textInverse
                        : colors.textSecondary,
                    },
                  ]}
                >
                  All Employees
                </Text>
              </TouchableOpacity>
              {employees.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={[
                    styles.filterChip,
                    filterCreatedById === e.id && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setFilterCreatedById(e.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          filterCreatedById === e.id
                            ? colors.textInverse
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {e.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* KPI Cards — full-width rows */}
        <KpiCard
          label={`Total Sales · ${trendLabel}`}
          value={formatMoneyCents(salesValue)}
          sub={
            mode === "custom" && summaryData
              ? `${summaryData.totalCount} orders`
              : undefined
          }
          icon="cash-outline"
          color="primary"
          fullWidth
          loading={loading || (mode === "custom" && trendLoading)}
          onPress={() => navigation.navigate("Sales")}
        />

        <KpiCard
          label="Outstanding Credit"
          value={formatMoneyCents(dashData?.totalOutstandingCreditCents ?? 0)}
          sub={`${dashData?.customersWithCreditCount ?? 0} customers with credit`}
          icon="card-outline"
          color="warning"
          fullWidth
          loading={loading}
          onPress={() => navigation.navigate("Customers")}
        />

        <KpiCard
          label="Containers Out"
          value={(dashData?.outstandingBoxes ?? 0).toLocaleString()}
          sub={`${(dashData?.outstandingBottles ?? 0).toLocaleString()} bottles`}
          icon="cube-outline"
          color="primary"
          loading={loading}
        />
        <KpiCard
          label="Low Stock Alert"
          value={lowStockCount.toLocaleString()}
          sub="below threshold"
          icon="warning-outline"
          color={lowStockCount > 0 ? "danger" : "success"}
          loading={loading}
        />

        {/* Sales Trend + Top Beverages */}
        <View style={styles.chartSection}>
          <View style={{ flex: 2, minWidth: 280 }}>
            <SalesTrendChart
              data={summaryData?.byDay ?? []}
              title={`Sales Trend · ${trendLabel}`}
              total={
                summaryData?.byDay?.length
                  ? formatMoneyCents(
                      summaryData.byDay.reduce((s, d) => s + d.amountCents, 0),
                    )
                  : undefined
              }
            />
          </View>
          <View style={{ flex: 1, minWidth: 240 }}>
            <TopBeveragesDonut
              data={dashData?.topBeverages ?? []}
              title="Top Beverages"
            />
          </View>
        </View>

        {/* Top Customers — full width */}
        <TopCustomersList
          loading={dashLoading}
          data={dashData?.topCustomers ?? []}
        />

        {/* Low Stock — full width */}
        <LowStockWidget
          loading={dashLoading}
          data={dashData?.lowStockBeverages ?? []}
        />

        {/* Recent Voids */}
        <RecentVoidsWidget
          loading={dashLoading}
          data={dashData?.recentVoids ?? []}
          onPressSale={(id) =>
            navigation.navigate("SaleDetail", { saleId: id })
          }
        />

        {/* Note */}
        <View style={[styles.note, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={colors.textMuted}
          />
          <Text style={[styles.noteText, { color: colors.textMuted }]}>
            Sales KPIs are for the selected range. Switch the selector above to
            change the window.
          </Text>
        </View>
      </ScrollView>

      {/* Calendar Sheet for custom range */}
      <CalendarSheet
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        rangeFrom={dateFrom}
        rangeTo={dateTo}
        onApply={(from, to) => {
          setDateFrom(from);
          setDateTo(to);
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    ...type.h2,
    fontSize: 22,
  },
  subtitle: {
    ...type.caption,
    fontSize: 12,
    marginTop: 1,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.md,
  },
  scrollContent: {
    padding: spacing[5],
    paddingBottom: 100,
    gap: spacing[4],
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  customRangeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  customRangeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterBar: {
    borderRadius: radius.md,
    padding: spacing[3],
    ...shadow.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  kpiRow: {
    flexDirection: "row",
    gap: spacing[3],
  },
  chartSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[4],
  },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: spacing[4],
    borderRadius: radius.md,
  },
  noteText: {
    ...type.caption,
    fontSize: 11,
    flex: 1,
  },
});
