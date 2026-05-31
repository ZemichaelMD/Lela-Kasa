import React, { useState } from "react";
import {
  RefreshControl,
  ScrollView,
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
import {
  beverageRepo,
  BeverageOffline,
} from "../offline/repositories/BeverageRepository";
import { useOffline } from "../providers/OfflineProvider";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ModalSheet } from "../components/ModalSheet";
import { showToast } from "../components/Toast";
import { t } from "../lib/i18n";
import { radius, spacing, type, layout } from "../theme";

export default function BeveragesScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { isOnline, isSyncing, triggerSync } = useOffline();

  const [search, setSearch] = useState("");
  const [selectedBeverage, setSelectedBeverage] =
    useState<BeverageOffline | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockDelta, setStockDelta] = useState("");

  const {
    data: beverages = [],
    isLoading,
    refetch,
  } = useOfflineQuery(["beverages", search], () =>
    beverageRepo.list(user?.shopId || ""),
  );

  const filteredBeverages = beverages.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.brand?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdjustStock = async () => {
    const delta = parseInt(stockDelta, 10);
    if (isNaN(delta) || !selectedBeverage) return;

    try {
      await beverageRepo.adjustStock({
        id: (selectedBeverage as any).id,
        shopId: user?.shopId || "",
        actorUserId: user?.id || "",
        deltaBottles: delta,
        reason: "ADJUSTMENT",
      });
      showToast("Stock updated", "success");
      setShowStockModal(false);
      setStockDelta("");
      refetch();
      if (isOnline) triggerSync();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t("beverages")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search products..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
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
      >
        {filteredBeverages.map((item) => (
          <View
            key={(item as any).id || (item as any).local_id}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <View style={styles.cardInfo}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>
                {item.name}
              </Text>
              <Text style={[styles.brand, { color: colors.textSecondary }]}>
                {item.brand || "No brand"}
              </Text>
            </View>
            <View style={styles.stockSection}>
              <View style={styles.stockInfo}>
                <Text style={[styles.stockLabel, { color: colors.textMuted }]}>
                  Stock
                </Text>
                <Text
                  style={[
                    styles.stockValue,
                    {
                      color:
                        item.stock_bottles < 24
                          ? colors.danger
                          : colors.success,
                    },
                  ]}
                >
                  {item.stock_bottles} btls
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.adjustButton,
                  { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => {
                  setSelectedBeverage(item);
                  setShowStockModal(true);
                }}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Stock Modal */}
      <ModalSheet
        visible={showStockModal}
        onClose={() => setShowStockModal(false)}
        title="Adjust Stock"
        footer={
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleAdjustStock}
          >
            <Text
              style={[styles.saveButtonText, { color: colors.textInverse }]}
            >
              Update Stock
            </Text>
          </TouchableOpacity>
        }
      >
        <View style={styles.modalContent}>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            How many bottles are you adding/removing for{" "}
            {selectedBeverage?.name}?
          </Text>
          <TextInput
            style={[
              styles.stockInput,
              {
                backgroundColor: colors.surfaceMuted,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            value={stockDelta}
            onChangeText={setStockDelta}
            placeholder="e.g. 24 or -12"
            keyboardType="numeric"
            autoFocus
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
  title: { ...type.h3 },
  searchContainer: { paddingHorizontal: spacing[5], paddingBottom: spacing[4] },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    height: 46,
    borderRadius: radius.md,
    gap: spacing[2],
  },
  searchInput: { flex: 1, ...type.body },
  listContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: layout.screenPaddingBottom,
  },
  card: {
    flexDirection: "row",
    padding: spacing[4],
    borderRadius: radius.lg,
    marginBottom: spacing[3],
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  cardInfo: { flex: 1 },
  name: { ...type.bodyBold, fontSize: 16 },
  brand: { ...type.caption, fontSize: 12 },
  stockSection: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  stockInfo: { alignItems: "flex-end" },
  stockLabel: { ...type.micro },
  stockValue: { ...type.bodyBold, fontSize: 14 },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: { paddingVertical: spacing[4] },
  modalSubtitle: { ...type.body, marginBottom: 20 },
  stockInput: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  saveButton: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: { ...type.bodyBold },
});
