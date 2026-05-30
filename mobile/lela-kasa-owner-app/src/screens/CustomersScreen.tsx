import React, { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";

import type { RootStackParamList } from "../navigation/types";
import { useOfflineQuery } from "../offline/hooks/useOfflineQuery";
import { customerRepo } from "../offline/repositories/CustomerRepository";
import { useOffline } from "../providers/OfflineProvider";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ModalSheet } from "../components/ModalSheet";
import { showToast } from "../components/Toast";
import { t } from "../lib/i18n";
import { radius, spacing, type, layout } from "../theme";

const formatCurrency = (cents: number) => {
  return `ETB ${(cents / 100).toLocaleString()}`;
};

export default function CustomersScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { isOnline, isSyncing, triggerSync } = useOffline();

  const [search, setSearch] = useState("");
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");

  const { data: customers = [], refetch } = useOfflineQuery(
    ["customers", search],
    () =>
      search
        ? customerRepo.search(search)
        : customerRepo.list(user?.shopId || ""),
  );

  const handleCreate = async () => {
    if (!createName.trim()) {
      showToast("Name is required", "error");
      return;
    }
    try {
      await customerRepo.createOffline({
        shop_id: user?.shopId || "",
        name: createName.trim(),
        phone: createPhone.trim() || undefined,
      });
      setShowCreateSheet(false);
      setCreateName("");
      setCreatePhone("");
      showToast(t("customerCreated"), "success");
      refetch();
      if (isOnline) triggerSync();
    } catch (err: any) {
      showToast(err.message || "Failed to create customer", "error");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t("customers")}
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateSheet(true)}
        >
          <Ionicons name="add" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t("searchCustomers")}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={customers}
        keyExtractor={(item) => item.local_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={async () => {
              if (isOnline) await triggerSync();
              refetch();
            }}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.customerCard, { backgroundColor: colors.surface }]}
            onPress={() =>
              navigation.navigate("CustomerDetail", {
                customerId: item.server_id || item.local_id,
                customerName: item.name,
              })
            }
          >
            <View style={styles.customerInfo}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text
                  style={[styles.customerName, { color: colors.textPrimary }]}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.customerPhone,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.phone || "No phone"}
                </Text>
              </View>
            </View>
            <View style={styles.customerStats}>
              <Text
                style={[
                  styles.balanceText,
                  {
                    color:
                      item.credit_balance_cents > 0
                        ? colors.danger
                        : colors.textMuted,
                  },
                ]}
              >
                {formatCurrency(item.credit_balance_cents)}
              </Text>
              {item.sync_status === "pending" && (
                <Ionicons
                  name="cloud-upload-outline"
                  size={14}
                  color={colors.warning}
                  style={{ marginTop: 4 }}
                />
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="people-outline"
              size={64}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No customers found
            </Text>
          </View>
        }
      />

      {/* Create Modal */}
      <ModalSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        title={t("newCustomer")}
        footer={
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleCreate}
          >
            <Text
              style={[styles.saveButtonText, { color: colors.textInverse }]}
            >
              {t("create")}
            </Text>
          </TouchableOpacity>
        }
      >
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
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
            placeholder="e.g. Abebe Kebede"
          />
          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, marginTop: 16 },
            ]}
          >
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
            placeholder="0911..."
            keyboardType="phone-pad"
          />
        </View>
      </ModalSheet>
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
  title: {
    ...type.h2,
    fontSize: 24,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchContainer: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    height: 50,
    borderRadius: radius.lg,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...type.body,
  },
  listContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: layout.screenPaddingBottom,
  },
  customerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[4],
    borderRadius: radius.lg,
    marginBottom: spacing[3],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...type.bodyBold,
    fontSize: 18,
  },
  customerName: {
    ...type.bodyBold,
    fontSize: 16,
  },
  customerPhone: {
    ...type.caption,
    fontSize: 12,
  },
  customerStats: {
    alignItems: "flex-end",
  },
  balanceText: {
    ...type.bodyBold,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: 16,
  },
  emptyText: {
    ...type.body,
    fontSize: 16,
  },
  form: {
    paddingVertical: spacing[2],
  },
  label: {
    ...type.caption,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    borderWidth: 1,
  },
  saveButton: {
    height: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    ...type.bodyBold,
    color: "white",
  },
});
