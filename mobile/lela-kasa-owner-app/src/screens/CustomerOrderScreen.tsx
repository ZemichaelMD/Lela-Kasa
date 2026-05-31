import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { RootStackParamList } from "../navigation/types";
import { t } from "../lib/i18n";
import { useTheme } from "../context/ThemeContext";
import { Skeleton } from "../components/Skeleton";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { showToast } from "../components/Toast";
import { PickerSheet, type PickerItem } from "../components/PickerSheet";
import { radius, spacing, type } from "../theme";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.186:3000";

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });
}

export default function CustomerOrderScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "CustomerOrder">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { customerId, accessToken } = route.params;

  const [beverages, setBeverages] = useState<any[]>([]);
  const [prices, setPrices] = useState<
    Record<string, { box: number; bottle: number }>
  >({});
  const [lines, setLines] = useState<
    Array<{ beverageId: string; name: string; boxes: number; bottles: number }>
  >([]);
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [placed, setPlaced] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const headers = {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        };

        const [bevsRes, tiersRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/beverages?pageSize=100&isActive=true`, {
            headers,
          }),
          fetch(`${API_URL}/api/v1/price-tiers`, { headers }),
        ]);

        if (!bevsRes.ok) {
          const errBody = await bevsRes.json().catch(() => ({}));
          throw new Error(errBody?.error?.message ?? `Beverages API: ${bevsRes.status}`);
        }
        if (!tiersRes.ok) {
          const errBody = await tiersRes.json().catch(() => ({}));
          throw new Error(errBody?.error?.message ?? `Tiers API: ${tiersRes.status}`);
        }

        const bevsEnvelope = await bevsRes.json();
        const tiersEnvelope = await tiersRes.json();

        // Response is wrapped twice: { success: true, data: { data: [...], total, page, pageSize } }
        const bevsPayload = bevsEnvelope?.data ?? bevsEnvelope;
        const bevs = Array.isArray(bevsPayload?.data)
          ? bevsPayload.data
          : Array.isArray(bevsPayload)
            ? bevsPayload
            : [];

        const tiersPayload = tiersEnvelope?.data ?? tiersEnvelope;
        const tiers = Array.isArray(tiersPayload) ? tiersPayload : [];
        const tier = tiers?.find((t: any) => t.isDefault) ?? tiers?.[0];

        const priceMap: Record<string, { box: number; bottle: number }> = {};
        if (tier) {
          const pricesRes = await fetch(
            `${API_URL}/api/v1/price-tiers/${tier.id}/prices`,
            { headers },
          );
          if (!pricesRes.ok) {
            const errBody = await pricesRes.json().catch(() => ({}));
            throw new Error(errBody?.error?.message ?? `Prices API: ${pricesRes.status}`);
          }
          const pricesEnvelope = await pricesRes.json();
          const pricesPayload = pricesEnvelope?.data ?? pricesEnvelope;
          const pricesArr = Array.isArray(pricesPayload)
            ? pricesPayload
            : pricesPayload?.data ?? [];
          for (const p of pricesArr) {
            priceMap[p.beverageId] = {
              box: p.pricePerBoxCents,
              bottle: p.pricePerBottleCents,
            };
          }
        }

        setBeverages(bevs);
        setPrices(priceMap);
      } catch (e: any) {
        showToast(e?.message ?? "Failed to load beverages", "error");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [customerId, accessToken]);

  const subtotal = lines.reduce((sum, l) => {
    const p = prices[l.beverageId] ?? { box: 0, bottle: 0 };
    return sum + l.boxes * p.box + l.bottles * p.bottle;
  }, 0);

  function addLine(beverageId: string) {
    const bev = beverages.find((b: any) => b.id === beverageId);
    if (!bev) return;
    setLines((prev) => {
      if (prev.some((l) => l.beverageId === beverageId)) return prev;
      return [
        ...prev,
        { beverageId: bev.id, name: bev.name, boxes: 0, bottles: 0 },
      ];
    });
  }

  function updateLine(
    beverageId: string,
    field: "boxes" | "bottles",
    delta: number,
  ) {
    setLines((prev) =>
      prev.map((l) =>
        l.beverageId === beverageId
          ? { ...l, [field]: Math.max(0, l[field] + delta) }
          : l,
      ),
    );
  }

  function setLineValue(
    beverageId: string,
    field: "boxes" | "bottles",
    raw: string,
  ) {
    const val = parseInt(raw, 10);
    if (raw === "") {
      setLines((prev) =>
        prev.map((l) =>
          l.beverageId === beverageId ? { ...l, [field]: 0 } : l,
        ),
      );
      return;
    }
    if (isNaN(val) || val < 0) return;
    setLines((prev) =>
      prev.map((l) =>
        l.beverageId === beverageId ? { ...l, [field]: val } : l,
      ),
    );
  }

  function removeLine(beverageId: string) {
    setLines((prev) => prev.filter((l) => l.beverageId !== beverageId));
  }

  async function handlePlaceOrder() {
    const activeLines = lines.filter((l) => l.boxes > 0 || l.bottles > 0);
    if (activeLines.length === 0) {
      showToast("Add at least one item with quantity", "error");
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          lines: activeLines.map((l) => ({
            beverageId: l.beverageId,
            boxes: l.boxes,
            bottles: l.bottles,
          })),
          notes: notes.trim() || undefined,
        }),
      });
      const envelope = await res.json();
      if (!res.ok) throw new Error(envelope?.error?.message ?? "Request failed");
      showToast(t("orderPlaced"), "success");
      setPlaced(true);
    } catch (e: any) {
      showToast(e?.message ?? "Failed to place order", "error");
    } finally {
      setPlacing(false);
    }
  }

  if (placed) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.placedContainer}>
          <View
            style={[
              styles.placedIcon,
              { backgroundColor: colors.success + "1A" },
            ]}
          >
            <Ionicons name="cart" size={40} color={colors.success} />
          </View>
          <Text style={[styles.placedTitle, { color: colors.textPrimary }]}>
            {t("orderPlaced")}
          </Text>
          <Text
            style={[
              styles.placedDesc,
              { color: colors.textSecondary },
            ]}
          >
            {t("notifyOwner")}
          </Text>
          <TouchableOpacity
            style={[
              styles.placedButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() =>
              navigation.replace("CustomerPortal", {
                customerId,
                accessToken,
              })
            }
          >
            <Text
              style={[
                styles.placedButtonText,
                { color: colors.textInverse },
              ]}
            >
              {t("backToLogin")}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {t("newOrder")}
            </Text>
          </View>
          <LanguageSwitcher />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Skeleton width="100%" height={80} style={{ marginBottom: 12 }} />
              <Skeleton width="100%" height={80} style={{ marginBottom: 12 }} />
              <Skeleton width="100%" height={80} />
            </View>
          ) : (
            <>
              {lines.map((l) => {
                const p = prices[l.beverageId];
                return (
                  <View
                    key={l.beverageId}
                    style={[
                      styles.lineCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.lineHeader}>
                      <Text
                        style={[
                          styles.lineName,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {l.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeLine(l.beverageId)}
                        style={styles.removeBtn}
                      >
                        <Ionicons
                          name="close"
                          size={18}
                          color={colors.danger}
                        />
                      </TouchableOpacity>
                    </View>
                    {p && (
                      <Text
                        style={[
                          styles.linePrices,
                          { color: colors.textMuted },
                        ]}
                      >
                        Box: {formatCurrency(p.box)} · Bottle:{" "}
                        {formatCurrency(p.bottle)}
                      </Text>
                    )}
                    <View style={styles.quantityRow}>
                      <View style={styles.quantityGroup}>
                        <TouchableOpacity
                          onPress={() =>
                            updateLine(l.beverageId, "boxes", -1)
                          }
                          style={[
                            styles.qtyBtn,
                            { borderColor: colors.border },
                          ]}
                        >
                          <Ionicons
                            name="remove"
                            size={16}
                            color={colors.textPrimary}
                          />
                        </TouchableOpacity>
                        <TextInput
                          style={[
                            styles.qtyInput,
                            {
                              color: colors.textPrimary,
                              borderColor: colors.border,
                              backgroundColor: colors.background,
                            },
                          ]}
                          keyboardType="number-pad"
                          value={String(l.boxes)}
                          onChangeText={(v) =>
                            setLineValue(l.beverageId, "boxes", v)
                          }
                          selectTextOnFocus
                        />
                        <TouchableOpacity
                          onPress={() =>
                            updateLine(l.beverageId, "boxes", 1)
                          }
                          style={[
                            styles.qtyBtn,
                            { borderColor: colors.border },
                          ]}
                        >
                          <Ionicons
                            name="add"
                            size={16}
                            color={colors.textPrimary}
                          />
                        </TouchableOpacity>
                        <Text
                          style={[
                            styles.qtyLabel,
                            { color: colors.textMuted },
                          ]}
                        >
                          boxes
                        </Text>
                      </View>
                      <View style={styles.quantityGroup}>
                        <TouchableOpacity
                          onPress={() =>
                            updateLine(l.beverageId, "bottles", -1)
                          }
                          style={[
                            styles.qtyBtn,
                            { borderColor: colors.border },
                          ]}
                        >
                          <Ionicons
                            name="remove"
                            size={16}
                            color={colors.textPrimary}
                          />
                        </TouchableOpacity>
                        <TextInput
                          style={[
                            styles.qtyInput,
                            {
                              color: colors.textPrimary,
                              borderColor: colors.border,
                              backgroundColor: colors.background,
                            },
                          ]}
                          keyboardType="number-pad"
                          value={String(l.bottles)}
                          onChangeText={(v) =>
                            setLineValue(l.beverageId, "bottles", v)
                          }
                          selectTextOnFocus
                        />
                        <TouchableOpacity
                          onPress={() =>
                            updateLine(l.beverageId, "bottles", 1)
                          }
                          style={[
                            styles.qtyBtn,
                            { borderColor: colors.border },
                          ]}
                        >
                          <Ionicons
                            name="add"
                            size={16}
                            color={colors.textPrimary}
                          />
                        </TouchableOpacity>
                        <Text
                          style={[
                            styles.qtyLabel,
                            { color: colors.textMuted },
                          ]}
                        >
                          bottles
                        </Text>
                      </View>
                    </View>
                    {p && (l.boxes > 0 || l.bottles > 0) && (
                      <Text
                        style={[
                          styles.lineTotal,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {formatCurrency(
                          l.boxes * p.box + l.bottles * p.bottle,
                        )}
                      </Text>
                    )}
                  </View>
                );
              })}

              <View style={styles.selectSection}>
                <Text
                  style={[
                    styles.selectLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("selectBeverage")}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.addBeverageBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setPickerOpen(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.addBeverageText, { color: colors.primary }]}>
                    {t("selectBeverage")}
                  </Text>
                </TouchableOpacity>
              </View>

              <PickerSheet
                visible={pickerOpen}
                title={t("selectBeverage")}
                items={beverages
                  .filter((b: any) => !lines.some((l) => l.beverageId === b.id))
                  .map((b: any) => ({
                    id: b.id,
                    label: b.name,
                    subtitle: b.brand ? `${b.brand}${prices[b.id] ? ` \u00B7 ${formatCurrency(prices[b.id].box)}/box` : ""}` : undefined,
                  }))}
                onSelect={(item: PickerItem) => addLine(item.id)}
                onClose={() => setPickerOpen(false)}
                selectedId={undefined}
              />

              <View style={styles.notesSection}>
                <Text
                  style={[
                    styles.notesLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("orderNotes")} ({t("optional")})
                </Text>
                <TextInput
                  style={[
                    styles.notesInput,
                    {
                      color: colors.textPrimary,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>

              <View
                style={[
                  styles.totalCard,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.totalLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("orderTotal")}
                </Text>
                <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
                  {formatCurrency(subtotal)}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
                  (placing || lines.length === 0) && styles.submitBtnDisabled,
                ]}
                onPress={handlePlaceOrder}
                disabled={placing || lines.length === 0}
                activeOpacity={0.8}
              >
                {placing ? (
                  <Text
                    style={[
                      styles.submitBtnText,
                      { color: colors.textInverse },
                    ]}
                  >
                    Placing...
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.submitBtnText,
                      { color: colors.textInverse },
                    ]}
                  >
                    {t("placeOrder")}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  backButton: { padding: spacing[1] },
  headerTitle: { ...type.bodyBold },
  scrollContent: { padding: spacing[5], paddingBottom: spacing[10] },
  loadingContainer: { padding: spacing[5] },
  lineCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  lineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[1],
  },
  lineName: { ...type.bodyBold },
  removeBtn: { padding: spacing[1] },
  linePrices: { ...type.caption, marginBottom: spacing[2] },
  quantityRow: { gap: spacing[2], marginTop: spacing[1] },
  quantityGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.xs,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyInput: {
    width: 48,
    height: 32,
    borderRadius: radius.xs,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 14,
    paddingVertical: 0,
  },
  qtyLabel: { ...type.caption, marginLeft: spacing[1] },
  lineTotal: {
    ...type.bodyBold,
    textAlign: "right",
    marginTop: spacing[1],
    fontVariant: ["tabular-nums"],
  },
  selectSection: { marginBottom: spacing[4] },
  selectLabel: { ...type.bodyBold, marginBottom: spacing[2] },
  addBeverageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: spacing[3],
  },
  addBeverageText: { ...type.bodyBold },
  notesSection: { marginBottom: spacing[4] },
  notesLabel: { ...type.bodyBold, marginBottom: spacing[2] },
  notesInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3],
    minHeight: 60,
    ...type.body,
  },
  totalCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  totalLabel: { ...type.bodyBold },
  totalValue: { ...type.h2, fontVariant: ["tabular-nums"] },
  submitBtn: {
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { ...type.bodyBold, fontSize: 17 },
  placedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
    gap: spacing[3],
  },
  placedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[2],
  },
  placedTitle: { ...type.h2, textAlign: "center" },
  placedDesc: { ...type.body, textAlign: "center" },
  placedButton: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    marginTop: spacing[3],
  },
  placedButtonText: { ...type.bodyBold },
});
