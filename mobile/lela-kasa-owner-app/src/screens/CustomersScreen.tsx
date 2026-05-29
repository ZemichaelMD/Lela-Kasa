import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Presets } from "react-native-pulsar";

import type { RootStackParamList } from "../navigation/types";
import { getSdk } from "../lib/sdk";
import { QK } from "../lib/query-keys";
import { NewSaleFAB } from "../components/NewSaleFAB";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { ModalSheet } from "../components/ModalSheet";
import { showToast } from "../components/Toast";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useOffline } from "../offline/context";
import { createCustomerOffline } from "../offline/writes";
import { withCache, cacheResponse, getCachedResponse } from "../lib/api-cache";
import { t } from "../lib/i18n";
import { radius, spacing, type } from "../theme";

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
        <Skeleton width={80} height={16} radius={4} />
      </View>
      <View style={[styles.cardFooter, { marginTop: spacing[3] }]}>
        <Skeleton width={100} height={12} radius={2} />
        <Skeleton width={110} height={12} radius={2} />
      </View>
    </View>
  );
}

export default function CustomersScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [search, setSearch] = useState("");
  const [hasCredit, setHasCredit] = useState(false);

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPin, setCreatePin] = useState("");

  const shopId = user?.shopId;

  const createMutation = useMutation({
    mutationFn: async (dto: {
      name: string;
      phone?: string;
      notes?: string;
      username?: string;
      pin?: string;
    }) => {
      if (isOnline) {
        return getSdk().customers.create(dto);
      }
      if (!shopId || !user) throw new Error("Failed to create customer");
      await createCustomerOffline({
        shopId,
        actorUserId: user.id,
        name: dto.name,
        phone: dto.phone,
        notes: dto.notes,
      });
      return { id: "local", name: dto.name } as any;
    },
    onSuccess: (result) => {
      if (!isOnline) {
        getCachedResponse<any>("customers").then((existing) => {
          if (existing?.data) {
            cacheResponse("customers", {
              ...existing,
              data: [...existing.data, result],
              total: existing.total + 1,
            });
          }
        });
      }
      Presets.System.impactMedium();
      setShowCreateSheet(false);
      setCreateName("");
      setCreatePhone("");
      setCreateNotes("");
      setCreateUsername("");
      setCreatePin("");
      queryClient.invalidateQueries({
        queryKey: QK.customers({ search, hasCredit }),
      });
      showToast(t("customerCreated"), "success");
    },
    onError: (err: any) => {
      Presets.System.impactMedium();
      showToast(err?.message ?? "Failed to create customer", "error");
    },
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: QK.customers({ search, hasCredit }),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await withCache("customers", () =>
        getSdk().customers.list({
          page: pageParam as number,
          pageSize: 30,
          search: search || undefined,
          hasCredit: hasCredit || undefined,
        }),
      );
      return result;
    },
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    initialPageParam: 1,
  });

  const customers = data?.pages.flatMap((p) => p.data) ?? [];

  const handleStatusChange = (value: boolean) => {
    Presets.System.selection();
    setHasCredit(value);
  };

  const handleClearSearch = () => {
    Presets.System.impactLight();
    setSearch("");
  };

  const handleRefresh = () => {
    Presets.System.impactLight();
    refetch();
  };

  const handleRowPress = (id: string, name: string) => {
    Presets.System.impactMedium();
    navigation.navigate("CustomerDetail", {
      customerId: id,
      customerName: name,
    });
  };

  const handleOpenCreateSheet = () => {
    Presets.System.impactLight();
    setShowCreateSheet(true);
  };

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View
        style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}
      >
        <SkeletonRow />
      </View>
    );
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isFetching) return null;
    return (
      <EmptyState
        icon="people-outline"
        title={t("noCustomers")}
        subtitle={search ? t("tryDifferentSearch") : t("addFirstCustomer")}
      />
    );
  }, [isFetching, search]);

  const TABS = [
    { value: false, label: t("all") },
    { value: true, label: t("hasBalance") },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Premium Compact Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t("customers")}
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleOpenCreateSheet}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Modern Control Panel Bar */}
      <View style={styles.filterBar}>
        {/* Search Input */}
        <View
          style={[
            styles.searchRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t("searchCustomers")}
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
          {TABS.map((tab) => {
            const active = hasCredit === tab.value;
            return (
              <TouchableOpacity
                key={String(tab.value)}
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

      {/* Customer List Stack */}
      {isFetching && !isRefetching && customers.length === 0 ? (
        <View style={{ paddingHorizontal: spacing[4], gap: spacing[3] }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, paddingHorizontal: spacing[4] }}
          contentContainerStyle={{
            paddingBottom: spacing[8],
            paddingTop: spacing[2],
          }}
          renderItem={({ item }) => {
            const hasBalance = item.creditBalanceCents > 0;
            return (
              <TouchableOpacity
                onPress={() => handleRowPress(item.id, item.name)}
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
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.balanceText,
                      { color: hasBalance ? colors.danger : colors.textMuted },
                    ]}
                  >
                    {formatCurrency(item.creditBalanceCents)}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text
                    style={[styles.metaText, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {item.phone || t("noPhoneNumber")}
                  </Text>

                  <View style={styles.packagesContainer}>
                    <View
                      style={[
                        styles.packageBadge,
                        { backgroundColor: colors.border + "30" },
                      ]}
                    >
                      <Ionicons
                        name="cube-outline"
                        size={11}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.packageText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.outstandingBoxes || 0}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.packageBadge,
                        { backgroundColor: colors.border + "30" },
                      ]}
                    >
                      <Ionicons
                        name="wine-outline"
                        size={11}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.packageText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.outstandingBottles || 0}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
        />
      )}

      <NewSaleFAB />

      {/* Create Customer Sheet */}
      <ModalSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        title={t("newCustomer")}
        footer={
          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                opacity: createMutation.isPending ? 0.6 : 1,
              },
            ]}
            onPress={() => {
              if (!createName.trim()) {
                showToast("Name is required", "error");
                return;
              }
              Presets.System.impactLight();
              createMutation.mutate({
                name: createName.trim(),
                phone: createPhone.trim() || undefined,
                notes: createNotes.trim() || undefined,
                username: createUsername.trim() || undefined,
                pin: createPin.trim() || undefined,
              });
            }}
            disabled={createMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveBtnText, { color: colors.textInverse }]}>
              {createMutation.isPending ? t("saving") : t("create")}
            </Text>
          </TouchableOpacity>
        }
      >
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t("fullName")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceMuted,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              value={createName}
              onChangeText={setCreateName}
              placeholder={t("fullName")}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t("phoneNumber")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceMuted,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              value={createPhone}
              onChangeText={setCreatePhone}
              placeholder={t("phonePlaceholder") as any}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t("customerNotes")}
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                {
                  backgroundColor: colors.surfaceMuted,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              value={createNotes}
              onChangeText={setCreateNotes}
              placeholder={t("optionalNotes") as any}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={[styles.divider, { borderTopColor: colors.border }]}>
            <Text
              style={[styles.sectionLabel, { color: colors.textSecondary }]}
            >
              Portal Access
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t("username")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceMuted,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              value={createUsername}
              onChangeText={setCreateUsername}
              placeholder="Auto-generated if empty"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t("pin")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceMuted,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              value={createPin}
              onChangeText={setCreatePin}
              placeholder="Numeric PIN"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  /* Premium Card Implementation */
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
  balanceText: {
    ...type.body,
    fontWeight: "700",
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing[2],
  },
  metaText: {
    flex: 1,
    ...type.caption,
    fontSize: 12,
    marginRight: spacing[2],
  },
  packagesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  packageBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.md,
    gap: 4,
  },
  packageText: {
    fontSize: 11,
    fontWeight: "600",
  },
  // Form Sheet Styling
  form: { gap: spacing[1] },
  fieldGroup: { marginBottom: spacing[2] },
  fieldLabel: {
    ...type.micro,
    marginBottom: spacing[1],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    height: 46,
    ...type.body,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 70,
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
    textAlignVertical: "top",
  },
  divider: {
    paddingTop: spacing[3],
    marginBottom: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: { ...type.caption, fontWeight: "700", letterSpacing: -0.1 },
  saveBtn: {
    height: 48,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { ...type.bodyBold, fontSize: 15 },
});
