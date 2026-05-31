import React, { useCallback, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFormattedDate } from "../components/FormattedDate";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Presets } from "react-native-pulsar";

import type { RootStackParamList } from "../navigation/types";
import { getSdk, Sale } from "../lib/sdk";
import { QK } from "../lib/query-keys";
import { NewSaleFAB } from "../components/NewSaleFAB";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import {
  DateFilter,
  type DatePreset as BaseDatePreset,
} from "../components/DateFilter";
import { useTheme } from "../context/ThemeContext";
import { withCache } from "../lib/api-cache";
import { t } from "../lib/i18n";
import { radius, spacing, type, layout } from "../theme";
import { getDb } from "../offline";
import { useOffline } from "../providers/OfflineProvider";
import { useAuth } from "../context/AuthContext";
import { useTabBarVisibility } from "../context/TabBarVisibilityContext";

type SalesDatePreset = BaseDatePreset | "custom" | "all";

function getDateRange(
  preset: SalesDatePreset,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string; label: string } {
  const now = new Date();
  let from: Date | null = null;
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
    case "all":
      label = t("allTime");
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
    from: from ? from.toISOString().split("T")[0] : "",
    to: from ? to.toISOString().split("T")[0] : "",
    label,
  };
}

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "VOIDED", label: "Voided" },
];

const PAGE_SIZE = 20;

// Helper to format currency cleanly without external dependencies
const formatCurrency = (cents: number) => {
  return `ETB ${(cents / 100).toFixed(2)}`;
};

function SkeletonRow() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <Skeleton width={140} height={16} radius={4} />
        <Skeleton width={70} height={16} radius={4} />
      </View>
      <View style={[styles.cardMidRow, { marginTop: spacing[3] }]}>
        <Skeleton width={90} height={12} radius={2} />
        <Skeleton width={65} height={18} radius={radius.full} />
      </View>
    </View>
  );
}

export default function SalesScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isOnline, syncVersion } = useOffline();
  const userShopId = user?.shopId ?? "";
  const fmtDate = useFormattedDate();
  const { onScroll } = useTabBarVisibility();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<SalesDatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = getDateRange(datePreset, customFrom, customTo);

  const dateLabel = useMemo(() => {
    if (datePreset === "custom") {
      if (customFrom && customTo) {
        const f = new Date(customFrom);
        const t = new Date(customTo);
        return `${f.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${t.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      }
      return t("custom");
    }
    const labels: Record<SalesDatePreset, string> = {
      today: t("today"),
      week: t("thisWeek"),
      month: t("thisMonth"),
      custom: t("custom"),
      all: t("allTime"),
    };
    return labels[datePreset];
  }, [datePreset, customFrom, customTo]);

  const queryKey = [
    ...QK.sales({
      search,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      dateFrom: range.from,
      dateTo: range.to,
    }),
    isOnline,
    syncVersion,
  ];

  const queryLocalSales = useCallback(async (pageParam: number, includeSynced = false) => {
    try {
      const db = await getDb();
      let sql =
        "SELECT * FROM sales WHERE shop_id = ? AND deleted_at IS NULL";
      const params: any[] = [userShopId];

      if (!includeSynced) {
        sql += " AND (sync_status != 'synced' OR sync_status IS NULL)";
      }

      if (range.from) {
        sql += " AND DATE(sale_date) >= DATE(?)";
        params.push(range.from);
      }
      if (range.to) {
        sql += " AND DATE(sale_date) <= DATE(?)";
        params.push(range.to);
      }
      if (statusFilter !== "ALL") {
        sql += " AND status = ?";
        params.push(statusFilter);
      }
      sql +=
        " ORDER BY sale_date DESC, COALESCE(created_at, last_synced_at) DESC LIMIT ?";
      params.push(PAGE_SIZE);

      const rows = await db.getAllAsync<any>(sql, params);

      const saleIds = rows.map((r: any) => r.id);
      let customerMap: Record<string, string> = {};
      let lineCountMap: Record<string, number> = {};
      let paymentPaidMap: Record<string, number> = {};

      if (saleIds.length > 0) {
        const idPlaceholders = saleIds.map(() => "?").join(", ");

        try {
          const customerRows = await db.getAllAsync<{ id: string; name: string }>(
            `SELECT id, name FROM customers WHERE id IN (SELECT DISTINCT customer_id FROM sales WHERE id IN (${idPlaceholders}) AND customer_id IS NOT NULL)`,
            saleIds,
          );
          customerRows.forEach((c) => {
            customerMap[c.id] = c.name;
          });
        } catch {}

        try {
          const lineRows = await db.getAllAsync<{ sale_id: string; cnt: number }>(
            `SELECT sale_id, COUNT(*) as cnt FROM sale_lines WHERE sale_id IN (${idPlaceholders}) GROUP BY sale_id`,
            saleIds,
          );
          lineRows.forEach((l) => {
            lineCountMap[l.sale_id] = l.cnt;
          });
        } catch {}

        try {
          const paymentRows = await db.getAllAsync<{ sale_id: string; total: number }>(
            `SELECT sale_id, COALESCE(SUM(amount_cents), 0) as total FROM payments WHERE sale_id IN (${idPlaceholders}) GROUP BY sale_id`,
            saleIds,
          );
          paymentRows.forEach((p) => {
            paymentPaidMap[p.sale_id] = p.total;
          });
        } catch {}
      }

      const data = rows.map((r: any) => {
        const lineCount = lineCountMap[r.id] || 0;
        const synced = r.sync_status === 'synced';
        return {
          id: r.id,
          shopId: r.shop_id,
          customerId: r.customer_id,
          priceTierId: r.price_tier_id,
          saleDate: r.sale_date,
          status: r.status,
          subtotalCents: r.subtotal_cents ?? 0,
          paidCents: paymentPaidMap[r.id] ?? r.paid_cents ?? 0,
          creditDeltaCents: r.credit_delta_cents ?? 0,
          boxesOutDelta: r.boxes_out_delta ?? 0,
          bottlesOutDelta: r.bottles_out_delta ?? 0,
          boxesReturnedOnSale: r.boxes_returned_on_sale ?? 0,
          bottlesReturnedOnSale: r.bottles_returned_on_sale ?? 0,
          notes: r.notes,
          customer: r.customer_id && customerMap[r.customer_id]
            ? { name: customerMap[r.customer_id] } as any
            : null,
          lines: Array(lineCount).fill({} as any),
          payments: [],
          createdAt: r.created_at ?? r.last_synced_at,
          updatedAt: r.updated_at ?? r.last_synced_at,
          _synced: synced,
        };
      });
      return {
        data: data as unknown as Sale[],
        total: data.length,
        page: pageParam,
        pageSize: PAGE_SIZE,
      };
    } catch {
      return { data: [], total: 0, page: pageParam, pageSize: PAGE_SIZE };
    }
  }, [userShopId, range.from, range.to, statusFilter]);

  const {
    data,
    isLoading,
    isFetching,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      if (!isOnline) {
        return await queryLocalSales(pageParam, true);
      }
      try {
        const apiResult = await withCache("sales", () =>
          getSdk().sales.list({
            page: pageParam,
            pageSize: PAGE_SIZE,
            search: search || undefined,
            status: statusFilter === "ALL" ? "CONFIRMED,OPEN,VOIDED" : statusFilter,
            dateFrom: range.from || undefined,
            dateTo: range.to || undefined,
          }),
        );

        // Merge local unsynced sales on the first page
        if (pageParam === 1) {
          const localResult = await queryLocalSales(1, false);
          if (localResult && localResult.data.length > 0) {
            const apiIds = new Set(apiResult.data.map((s: Sale) => s.id));
            const unsynced = localResult.data.filter((s: any) => !apiIds.has(s.id));
            if (unsynced.length > 0) {
              const sorted = [...unsynced, ...apiResult.data].sort(
                (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime(),
              );
              return {
                ...apiResult,
                data: sorted,
                total: apiResult.total + unsynced.length,
              };
            }
          }
        }
        return apiResult;
      } catch {
        return await queryLocalSales(pageParam, true);
      }
    },
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const sales = data?.pages.flatMap((page) => page.data) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;

  const handleStatusChange = (status: string) => {
    Presets.System.selection();
    setStatusFilter(status);
  };

  const handleClearSearch = () => {
    Presets.System.impactLight();
    setSearch("");
  };

  const handleRefresh = () => {
    Presets.System.impactLight();
    refetch();
  };

  const handleRowPress = (saleId: string) => {
    Presets.System.impactMedium();
    navigation.navigate("SaleDetail", { saleId });
  };

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="receipt-outline"
        title={t("noSales")}
        subtitle={search ? t("tryDifferentSearch") : t("recordFirstSale")}
      />
    );
  }, [isLoading, search]);

  const renderFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (sales.length > 0 && !hasNextPage) {
      return (
        <View style={styles.footerText}>
          <Text style={[styles.footerTextInner, { color: colors.textMuted }]}>
            {totalCount} sale{totalCount !== 1 ? "s" : ""} Total
          </Text>
        </View>
      );
    }
    return null;
  }, [isFetchingNextPage, sales.length, hasNextPage, totalCount, colors]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Premium Compact Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t("sales")}
        </Text>
        <DateFilter
          visible={false}
          selected={datePreset === "custom" ? "month" : datePreset}
          onSelect={(p) => {
            Presets.System.selection();
            setDatePreset(p as SalesDatePreset);
          }}
          onClose={() => {}}
          showCustom
          customFrom={customFrom}
          customTo={customTo}
          onCustomChange={(from, to) => {
            setCustomFrom(from);
            setCustomTo(to);
          }}
          onApplyCustom={() => {
            if (customFrom && customTo) {
              setDatePreset("custom");
            }
          }}
          extraPills={[
            { key: "all", labelKey: "allTime", icon: "time-outline" },
          ]}
          label={dateLabel}
        />
      </View>

      {/* Modern Control Panel Bar */}
      <View style={styles.filterBar}>
        <View
          style={[
            styles.searchRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t("searchByCustomer")}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} hitSlop={12}>
              <Ionicons
                name="close-circle"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Compact Pill-Segmented Control */}
        <View
          style={[
            styles.segmentedControl,
            { backgroundColor: colors.border + "40" },
          ]}
        >
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[
                  styles.segmentTab,
                  active && { backgroundColor: colors.surface },
                ]}
                onPress={() => handleStatusChange(tab.value)}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? colors.textPrimary : colors.textMuted },
                    active && { fontWeight: "700" },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Sales List Stack */}
      {isLoading ? (
        <View style={{ paddingHorizontal: spacing[4], gap: spacing[3] }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <FlatList<Sale>
          data={sales as Sale[]}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, paddingHorizontal: spacing[4] }}
          contentContainerStyle={{
            paddingBottom: layout.screenPaddingBottom,
            paddingTop: spacing[2],
          }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => {
            const isVoided = item.status?.toUpperCase() === "VOIDED";
            const isUnsynced = (item as any)._synced === false;
            const itemsCount = item.lines?.length || 0;
            const creditNote =
              item.creditDeltaCents > 0
                ? `+${formatCurrency(item.creditDeltaCents)}`
                : item.creditDeltaCents < 0
                  ? formatCurrency(item.creditDeltaCents)
                  : null;
            return (
              <TouchableOpacity
                onPress={() => handleRowPress(item.id)}
                activeOpacity={0.7}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text
                      style={[styles.customerName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.customer?.name || t("walkInCustomer")}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isVoided
                            ? `${colors.textMuted}18`
                            : `${colors.primary}18`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color: isVoided
                              ? colors.textMuted
                              : colors.primary,
                          },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                    {isUnsynced && (
                      <Ionicons
                        name="cloud-offline-outline"
                        size={14}
                        color={colors.warning}
                      />
                    )}
                  </View>
                </View>

                <Text
                  style={[styles.itemsSummary, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {fmtDate(item.saleDate)}
                  {itemsCount > 0 ? ` · ${itemsCount} ${itemsCount === 1 ? t("item") : t("items")}` : ""}
                </Text>

                <View style={styles.cardMidRow}>
                  <Text style={[styles.amountText, { color: colors.textPrimary }]}>
                    {formatCurrency(item.subtotalCents)}
                  </Text>
                  <Text style={[styles.paidText, { color: colors.textMuted }]}>
                    {t("newSale.paid")} {formatCurrency(item.paidCents)}
                  </Text>
                  {creditNote && (
                    <Text
                      style={[
                        styles.creditText,
                        {
                          color:
                            item.creditDeltaCents > 0
                              ? colors.danger
                              : colors.success,
                        },
                      ]}
                    >
                      {creditNote}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      <NewSaleFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  title: {
    ...type.h2,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  filterBar: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[3],
    height: 40,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...type.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: radius.lg,
    padding: 3,
    alignItems: "center",
  },
  segmentTab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  segmentText: {
    ...type.caption,
    fontSize: 13,
    fontWeight: "500",
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[2],
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  cardMidRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing[3],
    marginTop: spacing[2],
  },
  customerName: {
    flex: 1,
    ...type.body,
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: -0.2,
  },
  itemsSummary: {
    ...type.caption,
    fontSize: 11,
    marginTop: 2,
  },
  amountText: {
    ...type.body,
    fontWeight: "700",
    fontSize: 15,
  },
  paidText: {
    ...type.caption,
    fontSize: 11,
  },
  creditText: {
    ...type.caption,
    fontSize: 11,
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  footerLoader: {
    paddingVertical: spacing[6],
    alignItems: "center",
  },
  footerText: {
    paddingVertical: spacing[4],
    alignItems: "center",
  },
  footerTextInner: {
    ...type.caption,
    fontSize: 12,
    fontWeight: "500",
  },
});
