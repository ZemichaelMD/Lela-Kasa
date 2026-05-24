import React, { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { EthiopianDatePicker } from "../components/EthiopianDatePicker";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { getSdk } from "../lib/sdk";
import { QK } from "../lib/query-keys";
import { useTheme } from "../context/ThemeContext";
import { t } from "../lib/i18n";
import { Skeleton } from "../components/Skeleton";
import {
  DateFilter,
  type DatePreset as BaseDatePreset,
} from "../components/DateFilter";
import { radius, spacing, type, shadow } from "../theme";

type ReportsDatePreset = BaseDatePreset | "lastMonth" | "custom";

const TABS = [
  { key: "summary", label: "Summary", icon: "bar-chart-outline" },
  { key: "customers", label: "By Customer", icon: "people-outline" },
  { key: "beverages", label: "By Beverage", icon: "wine-outline" },
  { key: "payments", label: "By Payment", icon: "wallet-outline" },
  { key: "credit", label: "Credit", icon: "card-outline" },
  { key: "containers", label: "Containers", icon: "cube-outline" },
  { key: "stock", label: "Stock", icon: "archive-outline" },
] as const;

function getDateRange(
  preset: ReportsDatePreset,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string; label: string } {
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
    case "lastMonth":
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
      label = t("lastMonth");
      break;
    case "custom":
      from = customFrom
        ? new Date(customFrom)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      to = customTo ? new Date(customTo) : now;
      label = t("custom");
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

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.surface, ...shadow.sm },
      ]}
    >
      <View
        style={[
          styles.statIcon,
          { backgroundColor: accent ? accent + "20" : colors.primaryLight },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={20}
          color={accent || colors.primary}
        />
      </View>
      <Text
        style={[styles.statValue, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

export default function ReportsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [preset, setPreset] = useState<ReportsDatePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  const range = getDateRange(preset, customFrom, customTo);
  const reportParams = { dateFrom: range.from, dateTo: range.to };

  const {
    data: summaryData,
    isLoading: loadingSummary,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: QK.reports(reportParams),
    queryFn: () => getSdk().reports.salesSummary(reportParams),
  });

  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ["reports-by-customer", range.from, range.to],
    queryFn: () => getSdk().reports.salesByCustomer(reportParams),
    enabled: activeTab === 1,
  });

  const { data: beveragesData, isLoading: loadingBeverages } = useQuery({
    queryKey: ["reports-by-beverage", range.from, range.to],
    queryFn: () => getSdk().reports.salesByBeverage(reportParams),
    enabled: activeTab === 2,
  });

  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ["reports-by-payment", range.from, range.to],
    queryFn: () => getSdk().reports.salesByPaymentAccount(reportParams),
    enabled: activeTab === 3,
  });

  const { data: creditData, isLoading: loadingCredit } = useQuery({
    queryKey: ["reports-credit-aging", range.from, range.to],
    queryFn: () => getSdk().reports.creditAging(reportParams),
    enabled: activeTab === 4,
  });

  const { data: containersData, isLoading: loadingContainers } = useQuery({
    queryKey: ["reports-container-debt", range.from, range.to],
    queryFn: () => getSdk().reports.containerDebt(reportParams),
    enabled: activeTab === 5,
  });

  const { data: stockData, isLoading: loadingStock } = useQuery({
    queryKey: ["reports-stock-on-hand", range.from, range.to],
    queryFn: () => getSdk().reports.stockOnHand(reportParams),
    enabled: activeTab === 6,
  });

  const handleApplyCustomDate = () => {
    if (customFrom && customTo) {
      setPreset("custom");
      setShowDateFilter(false);
    }
  };

  const isLoading = [
    loadingSummary,
    loadingCustomers,
    loadingBeverages,
    loadingPayments,
    loadingCredit,
    loadingContainers,
    loadingStock,
  ][activeTab];

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <>
          <View style={styles.statsRow}>
            <Skeleton
              height={110}
              style={{ flex: 1, marginRight: spacing[3] }}
            />
            <Skeleton height={110} style={{ flex: 1 }} />
          </View>
          <View style={styles.statsRow}>
            <Skeleton
              height={110}
              style={{ flex: 1, marginRight: spacing[3] }}
            />
            <Skeleton height={110} style={{ flex: 1 }} />
          </View>
        </>
      );
    }

    switch (activeTab) {
      case 0:
        return summaryData ? (
          <>
            <View style={styles.statsRow}>
              <StatCard
                label={t("totalSales")}
                value={formatCurrency(summaryData.totalAmountCents ?? 0)}
                icon="cash-outline"
              />
              <StatCard
                label={t("totalTransactions")}
                value={String(summaryData.totalCount ?? 0)}
                icon="receipt-outline"
              />
            </View>
            {summaryData.byPriceTier?.length > 0 && (
              <>
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  {t("byPriceTier")}
                </Text>
                <View
                  style={[
                    styles.listCard,
                    { backgroundColor: colors.surface, ...shadow.sm },
                  ]}
                >
                  {summaryData.byPriceTier.map((p: any, i: number) => (
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
                      <View style={styles.listInfo}>
                        <Text
                          style={[
                            styles.listName,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {p.tierName ?? "—"}
                        </Text>
                        <Text
                          style={[styles.listSub, { color: colors.textMuted }]}
                        >
                          {p.count ?? 0} sales
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.listAmount,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {formatCurrency(p.amountCents ?? 0)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            {summaryData.byDay?.length > 0 && (
              <>
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  {t("dailyBreakdown")}
                </Text>
                <View
                  style={[
                    styles.listCard,
                    { backgroundColor: colors.surface, ...shadow.sm },
                  ]}
                >
                  {summaryData.byDay
                    .slice(-7)
                    .reverse()
                    .map((d: any, i: number) => (
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
                        <View style={styles.listInfo}>
                          <Text
                            style={[
                              styles.listName,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {d.date}
                          </Text>
                          <Text
                            style={[styles.listSub, { color: colors.textMuted }]}
                          >
                            {d.count ?? 0} sales
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.listAmount,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {formatCurrency(d.amountCents ?? 0)}
                        </Text>
                      </View>
                    ))}
                </View>
              </>
            )}
          </>
        ) : null;

      case 1:
        return (customersData as any[])?.length > 0 ? (
          <View
            style={[
              styles.listCard,
              { backgroundColor: colors.surface, ...shadow.sm },
            ]}
          >
            {(customersData as any[]).map((c: any, i: number) => (
              <View
                key={i}
                style={[
                  styles.listRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <View style={styles.listInfo}>
                  <Text
                    style={[styles.listName, { color: colors.textPrimary }]}
                  >
                    {c.customerName}
                  </Text>
                  <Text style={[styles.listSub, { color: colors.textMuted }]}>
                    {c.salesCount} sales
                  </Text>
                </View>
                <Text
                  style={[styles.listAmount, { color: colors.textPrimary }]}
                >
                  {formatCurrency(c.subtotalCents)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("noResults")}
          </Text>
        );

      case 2:
        return (beveragesData as any[])?.length > 0 ? (
          <View
            style={[
              styles.listCard,
              { backgroundColor: colors.surface, ...shadow.sm },
            ]}
          >
            {(beveragesData as any[]).map((b: any, i: number) => (
              <View
                key={i}
                style={[
                  styles.listRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <View style={styles.listInfo}>
                  <Text
                    style={[styles.listName, { color: colors.textPrimary }]}
                  >
                    {b.beverageName}
                  </Text>
                  <Text style={[styles.listSub, { color: colors.textMuted }]}>
                    {b.boxesSold} boxes, {b.bottlesSold} bottles
                  </Text>
                </View>
                <Text
                  style={[styles.listAmount, { color: colors.textPrimary }]}
                >
                  {formatCurrency(b.totalAmountCents)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("noResults")}
          </Text>
        );

      case 3:
        return (paymentsData as any[])?.length > 0 ? (
          <View
            style={[
              styles.listCard,
              { backgroundColor: colors.surface, ...shadow.sm },
            ]}
          >
            {(paymentsData as any[]).map((p: any, i: number) => (
              <View
                key={i}
                style={[
                  styles.listRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <View style={styles.listInfo}>
                  <Text
                    style={[styles.listName, { color: colors.textPrimary }]}
                  >
                    {p.accountName}
                  </Text>
                  <Text style={[styles.listSub, { color: colors.textMuted }]}>
                    {p.kind} · {p.count} transactions
                  </Text>
                </View>
                <Text
                  style={[styles.listAmount, { color: colors.textPrimary }]}
                >
                  {formatCurrency(p.totalAmountCents)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("noResults")}
          </Text>
        );

      case 4:
        return (creditData as any[])?.length > 0 ? (
          <View
            style={[
              styles.listCard,
              { backgroundColor: colors.surface, ...shadow.sm },
            ]}
          >
            {(creditData as any[]).map((c: any, i: number) => (
              <View
                key={i}
                style={[
                  styles.listRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <View style={styles.listInfo}>
                  <Text
                    style={[styles.listName, { color: colors.textPrimary }]}
                  >
                    {c.customerName}
                  </Text>
                  <Text style={[styles.listSub, { color: colors.textMuted }]}>
                    {c.ageBucket} days
                  </Text>
                </View>
                <Text
                  style={[
                    styles.listAmount,
                    {
                      color:
                        c.ageBucket === "90+"
                          ? colors.danger
                          : colors.textPrimary,
                    },
                  ]}
                >
                  {formatCurrency(c.creditBalanceCents)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("noResults")}
          </Text>
        );

      case 5:
        return (containersData as any[])?.length > 0 ? (
          <View
            style={[
              styles.listCard,
              { backgroundColor: colors.surface, ...shadow.sm },
            ]}
          >
            {(containersData as any[]).map((c: any, i: number) => (
              <View
                key={i}
                style={[
                  styles.listRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.listName,
                    { color: colors.textPrimary, flex: 1 },
                  ]}
                >
                  {c.customerName}
                </Text>
                <Text
                  style={[styles.listAmount, { color: colors.textPrimary }]}
                >
                  {c.outstandingBoxes} boxes
                </Text>
                <Text
                  style={[
                    styles.listAmount,
                    { color: colors.textSecondary, marginLeft: spacing[3] },
                  ]}
                >
                  {c.outstandingBottles} bottles
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("noResults")}
          </Text>
        );

      case 6:
        return (stockData as any[])?.length > 0 ? (
          <View
            style={[
              styles.listCard,
              { backgroundColor: colors.surface, ...shadow.sm },
            ]}
          >
            {(stockData as any[]).map((s: any, i: number) => (
              <View
                key={i}
                style={[
                  styles.listRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <View style={styles.listInfo}>
                  <Text
                    style={[styles.listName, { color: colors.textPrimary }]}
                  >
                    {s.beverageName}
                  </Text>
                  <Text style={[styles.listSub, { color: colors.textMuted }]}>
                    {s.brand ?? ""}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.listAmount,
                    {
                      color: s.isLowStock
                        ? colors.danger
                        : colors.success,
                    },
                  ]}
                >
                  {s.stockBottles} bottles
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("noResults")}
          </Text>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t("reports")}
        </Text>
      </View>

      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabContent}
        >
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor:
                    activeTab === i ? colors.primary : colors.surface,
                  ...shadow.sm,
                },
              ]}
              onPress={() => setActiveTab(i)}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={
                  activeTab === i ? colors.textInverse : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === i
                        ? colors.textInverse
                        : colors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={[
          styles.dateFilterButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...shadow.sm,
          },
        ]}
        onPress={() => setShowDateFilter(true)}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={colors.primary}
        />
        <Text style={[styles.dateFilterText, { color: colors.textPrimary }]}>
          {range.label}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

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
        {renderTabContent()}
      </ScrollView>

      <DateFilter
        visible={showDateFilter}
        selected={
          preset === "lastMonth" || preset === "custom" ? "month" : preset
        }
        onSelect={(p) => setPreset(p)}
        onClose={() => setShowDateFilter(false)}
        showCustom
        customFrom={customFrom}
        customTo={customTo}
        onCustomChange={(from, to) => {
          setCustomFrom(from);
          setCustomTo(to);
        }}
        onApplyCustom={handleApplyCustomDate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing[5], paddingVertical: spacing[3] },
  title: { ...type.h1 },
  tabBarContainer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
  },
  tabBar: { maxHeight: 44 },
  tabContent: { gap: spacing[2], paddingRight: spacing[5] },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    flexShrink: 0,
  },
  tabText: { ...type.micro },
  dateFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginHorizontal: spacing[5],
    marginBottom: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dateFilterText: { ...type.bodyMedium, flex: 1 },
  scrollContent: { paddingVertical: spacing[3] },
  statsRow: {
    flexDirection: "row",
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  statCard: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing[4],
    alignItems: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[2],
  },
  statValue: { ...type.h3, textAlign: "center" },
  statLabel: { ...type.micro, textAlign: "center", marginTop: 2 },
  sectionTitle: {
    ...type.h4,
    paddingHorizontal: spacing[5],
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  listCard: {
    marginHorizontal: spacing[5],
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing[4],
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
  },
  listInfo: { flex: 1 },
  listName: { ...type.bodyMedium },
  listSub: { ...type.micro, marginTop: 2 },
  listAmount: {
    marginLeft: "auto",
    ...type.bodyBold,
  },
  rank: { ...type.bodyBold, width: 24 },
  emptyText: {
    ...type.body,
    textAlign: "center",
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[5],
  },
});
