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
import { getSdk } from "../lib/sdk";
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
import { radius, spacing, type } from "../theme";

type SalesDatePreset = BaseDatePreset | "custom";

function getDateRange(
  preset: SalesDatePreset,
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
      <View style={[styles.cardFooter, { marginTop: spacing[3] }]}>
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
  const fmtDate = useFormattedDate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<SalesDatePreset>("month");
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
    };
    return labels[datePreset];
  }, [datePreset, customFrom, customTo]);

  const queryKey = QK.sales({
    search,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    dateFrom: range.from,
    dateTo: range.to,
  });

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
      try {
        return await withCache('sales', () =>
          getSdk().sales.list({
            page: pageParam,
            pageSize: PAGE_SIZE,
            search: search || undefined,
            status: statusFilter === "ALL" ? undefined : statusFilter,
            dateFrom: range.from,
            dateTo: range.to,
          }),
        );
      } catch {
        return {
          data: [],
          total: 0,
          page: pageParam,
          pageSize: PAGE_SIZE,
        };
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
            setDatePreset(p);
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
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, paddingHorizontal: spacing[4] }}
          contentContainerStyle={{
            paddingBottom: spacing[8],
            paddingTop: spacing[2],
          }}
          renderItem={({ item }) => {
            const isVoided = item.status?.toUpperCase() === "VOIDED";
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
                  <Text
                    style={[styles.customerName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.customer?.name || t("walkInCustomer")}
                  </Text>
                  <Text
                    style={[
                      styles.amountText,
                      {
                        color: isVoided ? colors.textMuted : colors.textPrimary,
                      },
                    ]}
                  >
                    {formatCurrency(item.subtotalCents)}
                  </Text>
                </View>
                {/*<Text
                  style={[styles.statusPillText, { color: colors.primary }]}
                >
                  Credit: {formatCurrency(item.creditDeltaCents)} Payment:{" "}
                  {formatCurrency(item.paidCents)}
                </Text>*/}

                <View style={styles.cardFooter}>
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {fmtDate(item.saleDate)} • {item.lines?.length || 0}{" "}
                    {item.lines?.length === 1 ? t("item") : t("items")}
                  </Text>

                  {/* Premium Status Pill */}
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isVoided
                          ? colors.textMuted + "15"
                          : colors.primary + "15",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: isVoided ? colors.textMuted : colors.primary },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
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
  /* Premium Card Restyling */
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
    alignItems: "center",
    gap: spacing[2],
  },
  customerName: {
    flex: 1,
    ...type.body,
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: -0.2,
  },
  amountText: {
    ...type.body,
    fontWeight: "700",
    fontSize: 15,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing[2],
  },
  metaText: {
    ...type.caption,
    fontSize: 12,
  },
  statusPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: 3,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPillText: {
    fontSize: 10,
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
