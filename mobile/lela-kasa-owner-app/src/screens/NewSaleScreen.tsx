import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
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
import { getSdk } from "../lib/sdk";
import { customerRepo } from "../offline/repositories/CustomerRepository";
import { beverageRepo } from "../offline/repositories/BeverageRepository";
import { priceTierRepo } from "../offline/repositories/PriceTierRepository";
import { beveragePriceRepo } from "../offline/repositories/BeveragePriceRepository";
import { paymentAccountRepo } from "../offline/repositories/PaymentAccountRepository";
import {
  saleRepo,
  SaleCreatePayload,
} from "../offline/repositories/SaleRepository";

import { EthiopianDatePicker } from "../components/EthiopianDatePicker";
import { PickerSheet, type PickerItem } from "../components/PickerSheet";
import { showToast } from "../components/Toast";
import { t } from "../lib/i18n";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useOffline } from "../providers/OfflineProvider";
import { radius, spacing, type } from "../theme";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function custVal(c: any, prop: string): any {
  return c?.[prop] ?? c?.[{
    credit_balance_cents: "creditBalanceCents",
    outstanding_boxes: "outstandingBoxes",
    outstanding_bottles: "outstandingBottles",
    price_tier_id: "priceTierId",
  }[prop] ?? prop];
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LineItem {
  beverageId: string;
  name: string;
  boxes: number;
  boxesText: string;
  bottles: number;
  bottlesText: string;
  pricePerBoxCents: number;
  pricePerBottleCents: number;
}

interface PaymentRow {
  amountCents: number;
  amountInput: string;
  paymentAccountId: string;
}

interface ContainerKasaRow {
  beverageId: string;
  name: string;
  count: number;
  countText: string;
}

interface ReturnedContainerRow {
  beverageId: string;
  name: string;
  boxes: number;
  boxesText: string;
  bottles: number;
  bottlesText: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function NewSaleScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "NewSale">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { isOnline, triggerSync } = useOffline();

  // ─── Form state ──────────────────────────────────────────────────────────────
  const [saleDate, setSaleDate] = useState(todayIso());
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [priceTierId, setPriceTierId] = useState("");
  const [showTierPicker, setShowTierPicker] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [showBeveragePicker, setShowBeveragePicker] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
  const [showAccountPicker, setShowAccountPicker] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [applyCredit, setApplyCredit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState<"draft" | "confirm" | null>(null);

  // Container kasa
  const [containerKasas, setContainerKasas] = useState<ContainerKasaRow[]>([]);
  const [showKasaPicker, setShowKasaPicker] = useState(false);
  const [editingKasaIndex, setEditingKasaIndex] = useState<number | null>(null);

  // Returned containers
  const [returnedContainers, setReturnedContainers] = useState<
    ReturnedContainerRow[]
  >([]);
  const [showReturnPicker, setShowReturnPicker] = useState(false);
  const [editingReturnIndex, setEditingReturnIndex] = useState<number | null>(null);

  // ─── Reference data ──────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<any[]>([]);
  const [beverages, setBeverages] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [tierPrices, setTierPrices] = useState<any[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  const loadRefData = useCallback(async () => {
    setLoadingRef(true);
    const shopId = user?.shopId || "";
    try {
      if (isOnline) {
        const [custRes, bevRes, tierRes, accRes] = await Promise.all([
          getSdk().customers.list({ pageSize: 500 }),
          getSdk().beverages.list({ pageSize: 500, isActive: true }),
          getSdk().priceTiers.list(),
          getSdk().paymentAccounts.list(),
        ]);
        setCustomers(custRes.data ?? custRes);
        setBeverages(bevRes.data ?? bevRes);
        setTiers(tierRes);
        setAccounts(accRes);
      } else {
        const [c, b, t, a] = await Promise.all([
          customerRepo.list(shopId),
          beverageRepo.list(shopId),
          priceTierRepo.list(shopId),
          paymentAccountRepo.listActive(shopId),
        ]);
        setCustomers(c);
        setBeverages(b);
        setTiers(t);
        setAccounts(a);
      }
    } catch {
      try {
        const [c, b, t, a] = await Promise.all([
          customerRepo.list(shopId),
          beverageRepo.list(shopId),
          priceTierRepo.list(shopId),
          paymentAccountRepo.listActive(shopId),
        ]);
        setCustomers(c);
        setBeverages(b);
        setTiers(t);
        setAccounts(a);
      } catch {}
    } finally {
      setLoadingRef(false);
    }
  }, [isOnline, user?.shopId]);

  useEffect(() => {
    loadRefData();
  }, [loadRefData]);

  // Load tier prices when a tier is selected
  useEffect(() => {
    if (!priceTierId) return;
    async function loadPrices() {
      try {
        if (isOnline) {
          const prices = await getSdk().priceTiers.getPrices(priceTierId);
          setTierPrices(prices);
        } else {
          const prices = await beveragePriceRepo.getPricesByTier(priceTierId);
          setTierPrices(prices);
        }
      } catch {
        try {
          const prices = await beveragePriceRepo.getPricesByTier(priceTierId);
          setTierPrices(prices);
        } catch {}
      }
    }
    loadPrices();
  }, [priceTierId, isOnline]);

  // Default price tier
  useEffect(() => {
    if (tiers.length > 0 && !priceTierId) {
      const def = tiers.find((t) => t.isDefault) || tiers[0];
      setPriceTierId(def.id || def.local_id || def.server_id);
    }
  }, [tiers]);

  // Prefill customer from route param
  useEffect(() => {
    if (!route.params?.customerId || customers.length === 0) return;
    const c = customers.find(
      (x) => (x.id || x.server_id || x.local_id) === route.params!.customerId,
    );
    if (c) {
      const cId = c.id || c.server_id || c.local_id || "";
      setCustomerId(cId);
      setCustomerSearch(c.name || "");
      if (c.priceTierId || c.price_tier_id) {
        setPriceTierId(c.priceTierId ?? c.price_tier_id);
      }
    }
  }, [route.params?.customerId, customers]);

  // ─── Price helpers ───────────────────────────────────────────────────────────

  function getPriceForBeverage(
    bevId: string,
  ): { pricePerBoxCents: number; pricePerBottleCents: number } | null {
    const price = tierPrices.find(
      (p) => (p.beverageId || p.beverage_id) === bevId,
    );
    if (!price) return null;
    return {
      pricePerBoxCents: price.pricePerBoxCents ?? price.price_per_box_cents,
      pricePerBottleCents:
        price.pricePerBottleCents ?? price.price_per_bottle_cents,
    };
  }

  function computeLineTotal(line: LineItem): number {
    return line.boxes * line.pricePerBoxCents + line.bottles * line.pricePerBottleCents;
  }

  function maybeFoldBottlesIntoBoxes(idx: number) {
    setLines((prev) => {
      const line = prev[idx];
      if (!line || !line.beverageId) return prev;
      const bev = beverages.find(
        (b) => (b.id || b.local_id) === line.beverageId,
      );
      if (!bev) return prev;
      const perBox = bev.bottlesPerBox || 24;
      if (perBox <= 0 || line.bottles < perBox) return prev;
      const priceMatch =
        line.pricePerBottleCents * perBox === line.pricePerBoxCents;
      if (!priceMatch) return prev;
      const extraBoxes = Math.floor(line.bottles / perBox);
      const remBottles = line.bottles % perBox;
      return prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              boxes: l.boxes + extraBoxes,
              boxesText: String(l.boxes + extraBoxes),
              bottles: remBottles,
              bottlesText: remBottles ? String(remBottles) : "",
            }
          : l,
      );
    });
  }

  // ─── Computed values ─────────────────────────────────────────────────────────

  const subtotalCents = useMemo(() => {
    return lines.reduce((sum, l) => sum + computeLineTotal(l), 0);
  }, [lines]);

  const paidCents = useMemo(() => {
    return paymentRows.reduce((sum, r) => sum + (r.amountCents || 0), 0);
  }, [paymentRows]);

  const creditDelta = subtotalCents - paidCents;

  const totalBottles = useMemo(() => {
    return lines.reduce((sum, l) => sum + l.bottles, 0);
  }, [lines]);

  const selectedCustomer = useMemo(() => {
    return customers.find(
      (c) =>
        (c.id || c.server_id || c.local_id) === customerId,
    );
  }, [customers, customerId]);

  const isPriceTierLocked = selectedCustomer?.priceTierLocked ?? false;

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name?.toLowerCase().includes(q));
  }, [customers, customerSearch]);

  // ─── Line handlers ───────────────────────────────────────────────────────────

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        beverageId: "",
        name: "",
        boxes: 0,
        boxesText: "",
        bottles: 0,
        bottlesText: "",
        pricePerBoxCents: 0,
        pricePerBottleCents: 0,
      },
    ]);
  }

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function openBeveragePickerForLine(idx?: number) {
    if (idx !== undefined) setEditingLineIndex(idx);
    else setEditingLineIndex(null);
    setShowBeveragePicker(true);
  }

  function handleSelectBeverage(item: PickerItem) {
    const idx =
      editingLineIndex !== null
        ? editingLineIndex
        : lines.findIndex((l) => !l.beverageId);
    if (idx < 0) {
      // Add new line with this beverage
      const bev = beverages.find((b) => (b.id || b.local_id) === item.id);
      const bevId = bev?.id || bev?.local_id || "";
      const price = getPriceForBeverage(bevId);
      setLines((prev) => [
        ...prev,
        {
          beverageId: bevId,
          name: bev?.name || "",
          boxes: 1,
          boxesText: "1",
          bottles: 0,
          bottlesText: "",
          pricePerBoxCents: price?.pricePerBoxCents ?? 0,
          pricePerBottleCents: price?.pricePerBottleCents ?? 0,
        },
      ]);
      if (!price) showToast(t("newSale.noPriceSet"), "error");
    } else {
      const bev = beverages.find((b) => (b.id || b.local_id) === item.id);
      const bevId = bev?.id || bev?.local_id || "";
      const price = getPriceForBeverage(bevId);
      if (!price) {
        showToast(t("newSale.noPriceSet"), "error");
        return;
      }
      updateLine(idx, {
        beverageId: bevId,
        name: bev?.name || "",
        boxes: 1,
        boxesText: "1",
        bottles: 0,
        bottlesText: "",
        pricePerBoxCents: price.pricePerBoxCents,
        pricePerBottleCents: price.pricePerBottleCents,
      });
    }
    setShowBeveragePicker(false);
    setEditingLineIndex(null);
  }

  // ─── Container Kasa handlers ────────────────────────────────────────────────

  function addContainerKasa() {
    setContainerKasas((prev) => [
      ...prev,
      { beverageId: "", name: "", count: 1, countText: "1" },
    ]);
  }

  function updateContainerKasa(idx: number, patch: Partial<ContainerKasaRow>) {
    setContainerKasas((prev) =>
      prev.map((k, i) => (i === idx ? { ...k, ...patch } : k)),
    );
  }

  function removeContainerKasa(idx: number) {
    setContainerKasas((prev) => prev.filter((_, i) => i !== idx));
  }

  function openKasaPicker(idx: number) {
    setEditingKasaIndex(idx);
    setShowKasaPicker(true);
  }

  function handleSelectKasaBeverage(item: PickerItem) {
    if (editingKasaIndex === null) return;
    const bev = beverages.find((b) => (b.id || b.local_id) === item.id);
    updateContainerKasa(editingKasaIndex, {
      beverageId: bev?.id || bev?.local_id || item.id,
      name: bev?.name || item.label,
    });
    setShowKasaPicker(false);
    setEditingKasaIndex(null);
  }

  // ─── Returned Container handlers ─────────────────────────────────────────────

  function addReturnedContainer() {
    setReturnedContainers((prev) => [
      ...prev,
      { beverageId: "", name: "", boxes: 0, boxesText: "", bottles: 0, bottlesText: "" },
    ]);
  }

  function updateReturnedContainer(
    idx: number,
    patch: Partial<ReturnedContainerRow>,
  ) {
    setReturnedContainers((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }

  function removeReturnedContainer(idx: number) {
    setReturnedContainers((prev) => prev.filter((_, i) => i !== idx));
  }

  function openReturnPicker(idx: number) {
    setEditingReturnIndex(idx);
    setShowReturnPicker(true);
  }

  function handleSelectReturnBeverage(item: PickerItem) {
    if (editingReturnIndex === null) return;
    const bev = beverages.find((b) => (b.id || b.local_id) === item.id);
    updateReturnedContainer(editingReturnIndex, {
      beverageId: bev?.id || bev?.local_id || item.id,
      name: bev?.name || item.label,
    });
    setShowReturnPicker(false);
    setEditingReturnIndex(null);
  }

  // ─── Payment handlers ────────────────────────────────────────────────────────

  function addPaymentRow() {
    setPaymentRows((prev) => [
      ...prev,
      {
        amountCents: 0,
        amountInput: "",
        paymentAccountId: accounts[0]?.id || accounts[0]?.server_id || accounts[0]?.local_id || "",
      },
    ]);
  }

  function updatePaymentRow(idx: number, patch: Partial<PaymentRow>) {
    setPaymentRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }

  function removePaymentRow(idx: number) {
    setPaymentRows((prev) => prev.filter((_, i) => i !== idx));
  }

  // ─── Add Customer ────────────────────────────────────────────────────────────

  async function handleAddCustomer() {
    if (!newCustName.trim()) return;
    setAddingCustomer(true);
    const shopId = user?.shopId || "";
    try {
      if (isOnline) {
        const created = await getSdk().customers.create({
          name: newCustName.trim(),
          phone: newCustPhone.trim() || undefined,
        });
        setCustomers((prev) =>
          prev.some((x) => (x.id || x.server_id || x.local_id) === created.id)
            ? prev
            : [...prev, created],
        );
        setCustomerId(created.id);
        setCustomerSearch(created.name);
      } else {
        const localId = await customerRepo.createOffline({
          shop_id: shopId,
          name: newCustName.trim(),
          phone: newCustPhone.trim() || undefined,
        });
        setCustomerId(localId);
        setCustomerSearch(newCustName.trim());
        const updated = await customerRepo.list(shopId);
        setCustomers(updated);
      }
      setShowAddCustomer(false);
      setNewCustName("");
      setNewCustPhone("");
    } catch {
      showToast("Failed to create customer", "error");
    } finally {
      setAddingCustomer(false);
    }
  }

  // ─── Save ────────────────────────────────────────────────────────────────────

  async function handleSave(status: "draft" | "confirm") {
    if (!customerId) {
      showToast(t("newSale.pleaseSelectCustomer"), "error");
      return;
    }
    if (!priceTierId) {
      showToast(t("newSale.pleaseSelectTier"), "error");
      return;
    }
    const validLines = lines.filter(
      (l) => l.beverageId && (l.boxes > 0 || l.bottles > 0),
    );
    if (validLines.length === 0) {
      showToast(t("newSale.pleaseAddItem"), "error");
      return;
    }
    const missingPrice = validLines.filter((l) => !getPriceForBeverage(l.beverageId));
    if (missingPrice.length > 0) {
      const names = missingPrice.map((l) => l.name || "?").join(", ");
      showToast(`${t("newSale.noPriceSet")}: ${names}`, "error");
      return;
    }

    setSaving(status);
    setSubmitting(true);
    try {
      const validPayments = paymentRows.filter(
        (r) => r.amountCents > 0 && r.paymentAccountId,
      );
      const validKasas = containerKasas.filter(
        (k) => k.beverageId && k.count > 0,
      );
      const validReturns = returnedContainers.filter(
        (r) => r.beverageId && (r.boxes > 0 || r.bottles > 0),
      );

      const fullSaleDate = saleDate
        ? `${saleDate}T00:00:00.000Z`
        : new Date().toISOString();

      const payload: SaleCreatePayload = {
        shop_id: user?.shopId || "",
        customer_id: customerId,
        sale_date: fullSaleDate,
        price_tier_id: priceTierId,
        notes: notes.trim() || undefined,
        apply_credit: applyCredit || undefined,
        lines: validLines.map((l) => ({
          beverage_id: l.beverageId,
          boxes: l.boxes,
          bottles: l.bottles,
          price_per_box_cents: l.pricePerBoxCents,
          price_per_bottle_cents: l.pricePerBottleCents,
        })),
        payments:
          validPayments.length > 0
            ? validPayments.map((r) => ({
                amount_cents: r.amountCents,
                method: "CASH",
                payment_account_id: r.paymentAccountId,
              }))
            : undefined,
        returned_containers:
          validReturns.length > 0
            ? validReturns.map((r) => ({
                beverage_id: r.beverageId,
                boxes: r.boxes,
                bottles: r.bottles,
              }))
            : undefined,
        container_kasas:
          validKasas.length > 0
            ? validKasas.map((k) => ({
                beverage_id: k.beverageId,
                count: k.count,
              }))
            : undefined,
      };

      await saleRepo.createOffline(payload);
      showToast(
        status === "confirm"
          ? "Sale confirmed successfully"
          : "Draft saved",
        "success",
      );
      navigation.goBack();
      if (isOnline) triggerSync();
    } catch (err: any) {
      showToast(err.message || t("newSale.failedToCreateSale"), "error");
    } finally {
      setSubmitting(false);
      setSaving(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const drawerTitle = t("newSale.title");

  function QtyStepper({
    value,
    text,
    onChange,
    onBlur,
    min,
  }: {
    value: number;
    text: string;
    onChange: (v: string, n: number) => void;
    onBlur?: () => void;
    min?: number;
  }) {
    const m = min ?? 0;
    return (
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepperBtn, { borderColor: colors.border }]}
          onPress={() => {
            const next = Math.max(m, value - 1);
            onChange(String(next), next);
          }}
          hitSlop={6}
        >
          <Ionicons name="remove" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <TextInput
          style={[
            styles.stepperInput,
            {
              backgroundColor: colors.background,
              color: colors.textPrimary,
              borderColor: colors.border,
            },
          ]}
          keyboardType="number-pad"
          value={text || (value > 0 ? String(value) : "")}
          onChangeText={(v) => {
            const n = v === "" ? 0 : parseInt(v) || 0;
            onChange(v, n);
          }}
          onBlur={onBlur}
          selectTextOnFocus
        />
        <TouchableOpacity
          style={[styles.stepperBtn, { borderColor: colors.border }]}
          onPress={() => {
            const next = value + 1;
            onChange(String(next), next);
          }}
          hitSlop={6}
        >
          <Ionicons name="add" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {drawerTitle}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Body */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sale Date */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Sale Date *
          </Text>
          <EthiopianDatePicker
            value={saleDate}
            onChange={setSaleDate}
            placeholder="Select sale date"
          />
        </View>

        {/* Customer */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Customer *
            </Text>
            {!showAddCustomer && (
              <TouchableOpacity
                onPress={() => setShowAddCustomer(true)}
                style={[styles.badgeBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="add" size={12} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                  New
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.searchWrapper}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              value={customerOpen ? customerSearch : selectedCustomer?.name || customerSearch}
              onChangeText={(v) => {
                setCustomerSearch(v);
                setCustomerOpen(true);
                if (customerId && v !== selectedCustomer?.name) {
                  setCustomerId("");
                }
              }}
              onFocus={() => {
                setCustomerOpen(true);
                setCustomerSearch("");
              }}
              onBlur={() => {
                setTimeout(() => setCustomerOpen(false), 150);
              }}
              placeholder="Search & pick customer"
              placeholderTextColor={colors.textMuted}
            />
            {customerId ? (
              <TouchableOpacity
                style={styles.searchClear}
                onPress={() => {
                  setCustomerId("");
                  setCustomerSearch("");
                }}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
            {customerOpen &&
              (() => {
                const filtered = filteredCustomers;
                return (
                  <View
                    style={[
                      styles.dropdown,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {filtered.length === 0 ? (
                      <Text style={[styles.dropdownEmpty, { color: colors.textMuted }]}>
                        No matches
                      </Text>
                    ) : (
                      filtered.slice(0, 50).map((c: any) => {
                        const cId = c.id || c.server_id || c.local_id;
                        const isSel = cId === customerId;
                        return (
                          <TouchableOpacity
                            key={cId}
                            style={[
                              styles.dropdownItem,
                              isSel && { backgroundColor: colors.surfaceTinted },
                            ]}
                            onPress={() => {
                              setCustomerId(cId);
                              setCustomerSearch(c.name || "");
                              setCustomerOpen(false);
                              const cTier = c.priceTierId ?? c.price_tier_id;
                              if (cTier && !isPriceTierLocked) {
                                setPriceTierId(cTier);
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.dropdownLabel,
                                { color: isSel ? colors.primary : colors.textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {c.name}
                            </Text>
                            {c.phone ? (
                              <Text style={[styles.dropdownSub, { color: colors.textMuted }]}>
                                {c.phone}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                );
              })()}
          </View>
          {showAddCustomer && (
            <View
              style={[
                styles.inlineForm,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.inlineFormTitle, { color: colors.textSecondary }]}>
                New Customer
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                value={newCustName}
                onChangeText={setNewCustName}
                placeholder="Name *"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                value={newCustPhone}
                onChangeText={setNewCustPhone}
                placeholder="Phone"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              <View style={styles.inlineFormActions}>
                <TouchableOpacity
                  onPress={handleAddCustomer}
                  disabled={addingCustomer || !newCustName.trim()}
                  style={[
                    styles.badgeBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: addingCustomer || !newCustName.trim() ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                    {addingCustomer ? "Adding..." : "Add"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddCustomer(false);
                    setNewCustName("");
                    setNewCustPhone("");
                  }}
                  style={[
                    styles.badgeBtn,
                    {
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: "600" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Price Tier */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Price Tier *{" "}
            {isPriceTierLocked && (
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                (locked for this customer)
              </Text>
            )}
          </Text>
          <TouchableOpacity
            style={[
              styles.selector,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: isPriceTierLocked ? 0.6 : 1,
              },
            ]}
            onPress={() => !isPriceTierLocked && setShowTierPicker(true)}
            disabled={isPriceTierLocked}
          >
            <Text
              style={[
                styles.selectorValue,
                { color: priceTierId ? colors.textPrimary : colors.textMuted },
              ]}
            >
              {priceTierId
                ? tiers.find(
                    (t) => (t.id || t.local_id || t.server_id) === priceTierId,
                  )?.name || "Selected Tier"
                : "Select Tier"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Items *
            </Text>
            <TouchableOpacity onPress={() => openBeveragePickerForLine()}>
              <Text style={[styles.addText, { color: colors.primary }]}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {lines.length === 0 ? (
            <TouchableOpacity
              style={[
                styles.addFirstItemBtn,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              onPress={() => {
                addLine();
                openBeveragePickerForLine();
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.addFirstItemText, { color: colors.primary }]}>
                Add first item
              </Text>
            </TouchableOpacity>
          ) : (
            lines.map((line, idx) => {
              const price = getPriceForBeverage(line.beverageId);
              const lineTotal = computeLineTotal(line);
              const selBev = beverages.find(
                (b) => (b.id || b.local_id) === line.beverageId,
              );
              return (
                <View
                  key={idx}
                  style={[
                    styles.lineCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  {/* Beverage + remove */}
                  <View style={styles.lineHeader}>
                    <TouchableOpacity
                      style={styles.lineBevSelector}
                      onPress={() => openBeveragePickerForLine(idx)}
                    >
                      <Text
                        style={[
                          styles.lineBevText,
                          {
                            color: line.beverageId
                              ? colors.textPrimary
                              : colors.textMuted,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {selBev
                          ? `${selBev.name}${selBev.brand ? ` (${selBev.brand})` : ""}`
                          : "Select beverage"}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeLine(idx)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>

                  {/* Qty + Total row */}
                  <View style={styles.lineQtyRow}>
                    <View style={styles.qtyField}>
                      <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>
                        Boxes
                      </Text>
                      <QtyStepper
                        value={line.boxes}
                        text={line.boxesText}
                        onChange={(v, n) => updateLine(idx, { boxesText: v, boxes: n })}
                        onBlur={() => maybeFoldBottlesIntoBoxes(idx)}
                        min={0}
                      />
                    </View>
                    <View style={styles.qtyField}>
                      <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>
                        Bottles
                      </Text>
                      <QtyStepper
                        value={line.bottles}
                        text={line.bottlesText}
                        onChange={(v, n) => updateLine(idx, { bottlesText: v, bottles: n })}
                        onBlur={() => maybeFoldBottlesIntoBoxes(idx)}
                        min={0}
                      />
                    </View>
                    <View style={styles.qtyField}>
                      <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>
                        Total
                      </Text>
                      <Text style={[styles.lineTotalText, { color: colors.textPrimary }]}>
                        {(lineTotal / 100).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Price info */}
                  {price && (
                    <Text style={[styles.priceInfo, { color: colors.textMuted }]}>
                      {(price.pricePerBoxCents / 100).toLocaleString()}/box ·{" "}
                      {(price.pricePerBottleCents / 100).toLocaleString()}/btl
                    </Text>
                  )}
                  {line.beverageId && !price && (
                    <Text style={[styles.noPrice, { color: colors.warning }]}>
                      No price set for this tier
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Container Kasa Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Container Kasa
            </Text>
            <TouchableOpacity onPress={addContainerKasa}>
              <Text style={[styles.addText, { color: colors.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {totalBottles >= 24 && (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {totalBottles} loose bottles — specify the container box type.
            </Text>
          )}
          {containerKasas.map((kasa, idx) => {
            const selectedBev = beverages.find(
              (b) => (b.id || b.local_id) === kasa.beverageId,
            );
            return (
              <View
                key={idx}
                style={[
                  styles.kasaCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.kasaRow}>
                  <TouchableOpacity
                    style={[
                      styles.kasaSelector,
                      { borderColor: colors.border, backgroundColor: colors.background },
                    ]}
                    onPress={() => openKasaPicker(idx)}
                  >
                    <Text
                      style={[
                        styles.kasaSelectorText,
                        {
                          color: kasa.beverageId
                            ? colors.textPrimary
                            : colors.textMuted,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedBev
                        ? `${selectedBev.name}${selectedBev.brand ? ` (${selectedBev.brand})` : ""}`
                        : "Select box type"}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                  <View style={styles.kasaCountWrap}>
                    <QtyStepper
                      value={kasa.count}
                      text={kasa.countText}
                      onChange={(v, n) =>
                        updateContainerKasa(idx, {
                          countText: v,
                          count: Math.max(1, n),
                        })
                      }
                      min={1}
                    />
                  </View>
                  <TouchableOpacity onPress={() => removeContainerKasa(idx)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Returned Containers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Returned Containers
            </Text>
            <TouchableOpacity onPress={addReturnedContainer}>
              <Text style={[styles.addText, { color: colors.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Containers returned by the customer with this sale.
          </Text>
          {returnedContainers.map((ret, idx) => {
            const selectedBev = beverages.find(
              (b) => (b.id || b.local_id) === ret.beverageId,
            );
            return (
              <View
                key={idx}
                style={[
                  styles.kasaCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.kasaRow}>
                  <TouchableOpacity
                    style={[
                      styles.kasaSelector,
                      { borderColor: colors.border, backgroundColor: colors.background },
                    ]}
                    onPress={() => openReturnPicker(idx)}
                  >
                    <Text
                      style={[
                        styles.kasaSelectorText,
                        {
                          color: ret.beverageId
                            ? colors.textPrimary
                            : colors.textMuted,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedBev
                        ? `${selectedBev.name}${selectedBev.brand ? ` (${selectedBev.brand})` : ""}`
                        : "Select beverage"}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeReturnedContainer(idx)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
                <View style={styles.returnQtyRow}>
                  <View style={styles.qtyField}>
                    <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>
                      Boxes
                    </Text>
                    <QtyStepper
                      value={ret.boxes}
                      text={ret.boxesText}
                      onChange={(v, n) =>
                        updateReturnedContainer(idx, {
                          boxesText: v,
                          boxes: Math.max(0, n),
                        })
                      }
                      min={0}
                    />
                  </View>
                  <View style={styles.qtyField}>
                    <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>
                      Bottles
                    </Text>
                    <QtyStepper
                      value={ret.bottles}
                      text={ret.bottlesText}
                      onChange={(v, n) =>
                        updateReturnedContainer(idx, {
                          bottlesText: v,
                          bottles: Math.max(0, n),
                        })
                      }
                      min={0}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Live Totals Card */}
        <View
          style={[
            styles.totalsCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.totalsLabel, { color: colors.textMuted }]}>
            Total
          </Text>
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsKey, { color: colors.textSecondary }]}>
              Subtotal
            </Text>
            <Text style={[styles.totalsVal, { color: colors.textPrimary }]}>
              {(subtotalCents / 100).toLocaleString()} Br
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsKey, { color: colors.textSecondary }]}>
              Paid
            </Text>
            <Text style={[styles.totalsVal, { color: colors.textPrimary }]}>
              {(paidCents / 100).toLocaleString()} Br
            </Text>
          </View>
          <View style={[styles.totalsDivider, { backgroundColor: colors.border }]} />
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsKey, { color: colors.textSecondary }]}>
              Credit
            </Text>
            <Text
              style={[
                styles.totalsVal,
                {
                  color:
                    creditDelta > 0
                      ? colors.danger
                      : creditDelta < 0
                        ? colors.success
                        : colors.textPrimary,
                  fontWeight: "700",
                },
              ]}
            >
              {(creditDelta / 100).toLocaleString()} Br
            </Text>
          </View>
        </View>

        {/* Payments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Payments
            </Text>
            <TouchableOpacity onPress={addPaymentRow}>
              <Text style={[styles.addText, { color: colors.primary }]}>
                + Add Payment
              </Text>
            </TouchableOpacity>
          </View>
          {paymentRows.map((row, idx) => (
            <View
              key={idx}
              style={[
                styles.paymentCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.paymentRow}>
                <TextInput
                  style={[
                    styles.paymentInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={row.amountInput}
                  onChangeText={(v) => {
                    const parsed = parseFloat(v);
                    updatePaymentRow(idx, {
                      amountInput: v,
                      amountCents: isNaN(parsed) ? 0 : Math.round(parsed * 100),
                    });
                  }}
                />
                <TouchableOpacity
                  style={[
                    styles.paymentAccountBtn,
                    { borderColor: colors.border },
                  ]}
                  onPress={() => setShowAccountPicker(idx)}
                >
                  <Text
                    style={[
                      styles.paymentAccountText,
                      {
                        color: row.paymentAccountId
                          ? colors.textPrimary
                          : colors.textMuted,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {row.paymentAccountId
                      ? accounts.find(
                          (a) =>
                            (a.id || a.server_id || a.local_id) ===
                            row.paymentAccountId,
                        )?.name || "Account"
                      : "Account"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removePaymentRow(idx)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Notes
          </Text>
          <TextInput
            style={[
              styles.textarea,
              {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            placeholder="Optional notes..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Apply Credit Toggle */}
        {selectedCustomer && custVal(selectedCustomer, "credit_balance_cents") > 0 ? (
          <TouchableOpacity
            style={styles.creditRow}
            onPress={() => setApplyCredit(!applyCredit)}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: applyCredit ? colors.primary : "transparent",
                  borderColor: applyCredit ? colors.primary : colors.border,
                },
              ]}
            >
              {applyCredit && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={[styles.creditText, { color: colors.textPrimary }]}>
              Apply existing credit (
              {((custVal(selectedCustomer, "credit_balance_cents") ?? 0) / 100).toLocaleString()}{" "}
              Br)
            </Text>
          </TouchableOpacity>
        ) : selectedCustomer ? (
          <TouchableOpacity
            style={styles.creditRow}
            onPress={() => setApplyCredit(!applyCredit)}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: applyCredit ? colors.primary : "transparent",
                  borderColor: applyCredit ? colors.primary : colors.border,
                },
              ]}
            >
              {applyCredit && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={[styles.creditText, { color: colors.textPrimary }]}>
              Apply customer credit
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Projected Balances */}
        {selectedCustomer && (
          <View
            style={[
              styles.projectedCard,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.projectedTitle, { color: colors.textSecondary }]}>
              Projected balances for {selectedCustomer.name}
            </Text>
            <View style={styles.totalsRow}>
              <Text style={[styles.totalsKey, { color: colors.textSecondary }]}>
                Current credit
              </Text>
              <Text style={[styles.totalsVal, { color: colors.textPrimary }]}>
                {((custVal(selectedCustomer, "credit_balance_cents") ?? 0) / 100).toLocaleString()} Br
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={[styles.totalsKey, { color: colors.textSecondary }]}>
                After this sale
              </Text>
              <Text
                style={[
                  styles.totalsVal,
                  {
                    color:
                      (custVal(selectedCustomer, "credit_balance_cents") ?? 0) + creditDelta > 0
                        ? colors.danger
                        : colors.success,
                    fontWeight: "600",
                  },
                ]}
              >
                {(
                  ((custVal(selectedCustomer, "credit_balance_cents") ?? 0) + creditDelta) /
                  100
                ).toLocaleString()}{" "}
                Br
              </Text>
            </View>
            <View style={[styles.totalsDivider, { backgroundColor: colors.border }]} />
            <View style={styles.totalsRow}>
              <Text style={[styles.totalsKey, { color: colors.textSecondary, fontSize: 12 }]}>
                Boxes outstanding
              </Text>
              <Text style={[styles.totalsVal, { color: colors.textPrimary, fontSize: 13 }]}>
                {(() => {
                  const kasaBoxes = containerKasas.reduce((s, k) => s + (k.count || 0), 0);
                  const lineBoxes = lines.reduce((s, l) => s + (l.boxes || 0), 0);
                  const retBoxes = returnedContainers.reduce((s, r) => s + (r.boxes || 0), 0);
                  const current = custVal(selectedCustomer, "outstanding_boxes") ?? 0;
                  const projected = current + lineBoxes + kasaBoxes - retBoxes;
                  const delta = lineBoxes + kasaBoxes - retBoxes;
                  return delta !== 0 ? `${current} → ${projected}` : String(current);
                })()}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={[styles.totalsKey, { color: colors.textSecondary, fontSize: 12 }]}>
                Bottles outstanding
              </Text>
              <Text style={[styles.totalsVal, { color: colors.textPrimary, fontSize: 13 }]}>
                {custVal(selectedCustomer, "outstanding_bottles") ?? 0}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { borderTopColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.footerBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={[styles.footerBtnText, { color: colors.textPrimary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSave("draft")}
          disabled={submitting}
          style={[
            styles.footerBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.background,
              opacity: submitting ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[styles.footerBtnText, { color: colors.textPrimary }]}>
            {submitting && saving === "draft" ? "Saving..." : "Save Draft"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSave("confirm")}
          disabled={submitting}
          style={[
            styles.footerBtnPrimary,
            { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.footerBtnPrimaryText, { color: "#fff" }]}>
            {submitting && saving === "confirm" ? "Saving..." : "Confirm Sale"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pickers */}
      {loadingRef ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          <PickerSheet
            visible={showTierPicker}
            title="Select Price Tier"
            items={tiers.map((t) => ({
              id: t.id || t.local_id || t.server_id,
              label: t.name,
            }))}
            selectedId={priceTierId}
            onSelect={(item) => {
              setPriceTierId(item.id);
              setShowTierPicker(false);
            }}
            onClose={() => setShowTierPicker(false)}
          />

          <PickerSheet
            visible={showBeveragePicker}
            title="Select Beverage"
            items={beverages.map((b) => ({
              id: b.id || b.local_id,
              label: b.name,
              subtitle: b.brand || undefined,
            }))}
            onSelect={handleSelectBeverage}
            onClose={() => {
              setShowBeveragePicker(false);
              setEditingLineIndex(null);
            }}
          />

          <PickerSheet
            visible={showKasaPicker}
            title="Select Box Type"
            items={beverages.map((b) => ({
              id: b.id || b.local_id,
              label: b.name,
              subtitle: b.brand || undefined,
            }))}
            onSelect={handleSelectKasaBeverage}
            onClose={() => {
              setShowKasaPicker(false);
              setEditingKasaIndex(null);
            }}
          />

          <PickerSheet
            visible={showReturnPicker}
            title="Select Beverage for Return"
            items={beverages.map((b) => ({
              id: b.id || b.local_id,
              label: b.name,
              subtitle: b.brand || undefined,
            }))}
            onSelect={handleSelectReturnBeverage}
            onClose={() => {
              setShowReturnPicker(false);
              setEditingReturnIndex(null);
            }}
          />

          <PickerSheet
            visible={showAccountPicker !== null}
            title="Select Account"
            items={accounts.map((a) => ({
              id: a.id || a.server_id || a.local_id,
              label: a.name,
              subtitle: a.kind,
            }))}
            onSelect={(item) => {
              if (showAccountPicker !== null) {
                updatePaymentRow(showAccountPicker, {
                  paymentAccountId: item.id,
                });
              }
              setShowAccountPicker(null);
            }}
            onClose={() => setShowAccountPicker(null)}
          />
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { ...type.h3 },
  scrollContent: { paddingBottom: spacing[10], paddingHorizontal: spacing[5] },

  // ─── Fields ──────────────────────────────────────────────────────────────────
  fieldGroup: { marginTop: spacing[5] },
  label: { ...type.caption, marginBottom: spacing[2] },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  input: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    height: 44,
  },
  textarea: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3],
    minHeight: 64,
    textAlignVertical: "top",
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    height: 44,
  },
  selectorValue: { ...type.body, flex: 1 },

  // ─── Customer search ─────────────────────────────────────────────────────────
  searchWrapper: { position: "relative", zIndex: 20 },
  searchClear: { position: "absolute", right: 10, top: 13 },
  dropdown: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    marginTop: 2,
    borderWidth: 1,
    borderRadius: radius.md,
    maxHeight: 220,
    overflow: "hidden",
    zIndex: 100,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  dropdownLabel: { ...type.body, flex: 1 },
  dropdownSub: { ...type.caption, marginLeft: spacing[2] },
  dropdownEmpty: { ...type.caption, padding: spacing[3], textAlign: "center" },
  inlineForm: {
    marginTop: spacing[2],
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3],
    gap: spacing[2],
  },
  inlineFormTitle: { ...type.caption, fontWeight: "600" },
  inlineFormActions: { flexDirection: "row", gap: spacing[2] },
  badgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
  },

  // ─── Section ─────────────────────────────────────────────────────────────────
  section: { marginTop: spacing[6] },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  sectionTitle: { ...type.h4 },
  addText: { ...type.bodyBold, fontSize: 14 },

  // ─── Add first item ──────────────────────────────────────────────────────────
  addFirstItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
  },
  addFirstItemText: { ...type.bodyBold, fontSize: 14 },

  // ─── Line items ──────────────────────────────────────────────────────────────
  lineCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  lineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  lineBevSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lineBevText: { ...type.bodyBold, flex: 1 },
  lineQtyRow: { flexDirection: "row", gap: spacing[2] },
  qtyField: { flex: 1 },
  qtyLabel: { ...type.micro, marginBottom: 4 },
  lineTotalText: { ...type.bodyBold, marginTop: spacing[3], textAlign: "center" },
  priceInfo: { ...type.micro, marginTop: spacing[1] },
  noPrice: { ...type.micro, marginTop: spacing[1] },

  // ─── Stepper ─────────────────────────────────────────────────────────────────
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  stepperBtn: {
    width: 30,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperInput: {
    ...type.body,
    borderWidth: 1,
    borderRadius: 0,
    width: 44,
    height: 34,
    textAlign: "center",
    padding: 0,
    marginHorizontal: -1,
  },

  // ─── Container Kasa / Returned ───────────────────────────────────────────────
  hint: { ...type.caption, marginBottom: spacing[2] },
  kasaCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  kasaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  kasaSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    height: 38,
  },
  kasaSelectorText: { ...type.body, flex: 1, fontSize: 13 },
  kasaCountWrap: { width: 88 },
  returnQtyRow: {
    flexDirection: "row",
    gap: spacing[2],
    marginTop: spacing[2],
  },

  // ─── Totals ──────────────────────────────────────────────────────────────────
  totalsCard: {
    marginTop: spacing[6],
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing[4],
  },
  totalsLabel: { ...type.micro, marginBottom: spacing[2] },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  totalsKey: { ...type.body },
  totalsVal: { ...type.bodyBold },
  totalsDivider: { height: 1, marginVertical: spacing[2] },

  // ─── Payments ────────────────────────────────────────────────────────────────
  paymentCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  paymentInput: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    width: 100,
    height: 38,
    textAlign: "center",
  },
  paymentAccountBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    height: 38,
  },
  paymentAccountText: { ...type.body, flex: 1, fontSize: 13 },

  // ─── Apply credit ────────────────────────────────────────────────────────────
  creditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing[5],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  creditText: { ...type.body, fontWeight: "500" },

  // ─── Projected balances ─────────────────────────────────────────────────────
  projectedCard: {
    marginTop: spacing[4],
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing[4],
  },
  projectedTitle: { ...type.caption, fontWeight: "600", marginBottom: spacing[2] },

  // ─── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  footerBtnText: { ...type.bodyBold, fontSize: 13 },
  footerBtnPrimary: {
    flex: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
  },
  footerBtnPrimaryText: { ...type.bodyBold, fontSize: 13 },
});
