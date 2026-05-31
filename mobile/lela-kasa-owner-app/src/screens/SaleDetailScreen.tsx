import React, { useState, useEffect } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import type { RootStackParamList } from "../navigation/types";
import type {
  AddPaymentDto,
  UpdateSaleDto,
  UpdateSaleLineDto,
  UpdateSalePaymentDto,
  Sale,
} from "../lib/sdk/resources/sales";
import { getSdk } from "../lib/sdk";
import { QK } from "../lib/query-keys";
import { StatusBadge } from "../components/StatusBadge";
import { AmountInput } from "../components/AmountInput";
import { PickerSheet, type PickerItem } from "../components/PickerSheet";
import { PaymentRow } from "../components/PaymentRow";
import { Skeleton } from "../components/Skeleton";
import { OfflineLimitedView } from "../components/OfflineLimitedView";
import { showToast } from "../components/Toast";
import { t } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useFormattedDate } from "../components/FormattedDate";
import { useOffline } from "../providers/OfflineProvider";
import { getDb, saleRepo } from "../offline";
import { radius, spacing, type } from "../theme";

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

/** Shape of a sale row from the local SQLite sales table */
interface LocalSaleDetailRow {
  id: string;
  shop_id: string;
  customer_id: string | null;
  price_tier_id: string;
  sale_date: string;
  status: string;
  subtotal_cents: number;
  paid_cents: number;
  credit_delta_cents: number;
  boxes_out_delta: number;
  bottles_out_delta: number;
  boxes_returned_on_sale: number;
  bottles_returned_on_sale: number;
  notes: string | null;
  voided_at: string | null;
  void_reason: string | null;
  sync_status: string;
  created_at: string | null;
  updated_at: string | null;
  local_updated_at: string | null;
}

/** Shape of a sale_line row from SQLite */
interface LocalLineRow {
  id: string;
  sale_id: string;
  beverage_id: string;
  boxes: number;
  bottles: number;
  price_per_box_cents: number;
  price_per_bottle_cents: number;
  line_total_cents: number;
}

/** Shape of a payment row from SQLite */
interface LocalPaymentRow {
  id: string;
  sale_id: string;
  customer_id: string | null;
  payment_account_id: string;
  amount_cents: number;
  method: string;
  reference: string | null;
  notes: string | null;
  paid_at: string | null;
  voided_at: string | null;
}

/** Shape of a sale_container_kasas row from SQLite */
interface LocalContainerKasaRow {
  id: string;
  sale_id: string;
  beverage_id: string;
  count: number;
  local_updated_at: string | null;
  beverage_name?: string | null;
}

/** Shape of a sale_returned_containers row from SQLite */
interface LocalReturnedContainerRow {
  id: string;
  sale_id: string;
  beverage_id: string;
  boxes: number;
  bottles: number;
  local_updated_at: string | null;
  beverage_name?: string | null;
}

async function fetchOfflineSale(
  saleId: string,
  userShopId: string,
): Promise<Sale | null> {
  try {
    const db = await getDb();
    const saleRow = await db.getFirstAsync<LocalSaleDetailRow>(
      "SELECT * FROM sales WHERE id = ? AND shop_id = ? AND deleted_at IS NULL",
      [saleId, userShopId],
    );
    if (!saleRow) return null;

    const lines = await db.getAllAsync<LocalLineRow>(
      "SELECT * FROM sale_lines WHERE sale_id = ? AND deleted_at IS NULL",
      [saleId],
    );
    const payments = await db.getAllAsync<LocalPaymentRow>(
      "SELECT * FROM payments WHERE sale_id = ? AND deleted_at IS NULL",
      [saleId],
    );
    const containerKasas = await db.getAllAsync<LocalContainerKasaRow>(
      `SELECT ck.*, b.name as beverage_name
       FROM sale_container_kasas ck
       LEFT JOIN beverages b ON b.id = ck.beverage_id
       WHERE ck.sale_id = ? AND ck.deleted_at IS NULL`,
      [saleId],
    );
    const returnedContainers = await db.getAllAsync<LocalReturnedContainerRow>(
      `SELECT rc.*, b.name as beverage_name
       FROM sale_returned_containers rc
       LEFT JOIN beverages b ON b.id = rc.beverage_id
       WHERE rc.sale_id = ? AND rc.deleted_at IS NULL`,
      [saleId],
    );

    return {
      id: saleRow.id,
      shopId: saleRow.shop_id,
      customerId: saleRow.customer_id ?? undefined,
      priceTierId: saleRow.price_tier_id,
      saleDate: saleRow.sale_date,
      status: saleRow.status,
      subtotalCents: saleRow.subtotal_cents ?? 0,
      paidCents: saleRow.paid_cents ?? 0,
      creditDeltaCents: saleRow.credit_delta_cents ?? 0,
      boxesOutDelta: saleRow.boxes_out_delta ?? 0,
      bottlesOutDelta: saleRow.bottles_out_delta ?? 0,
      boxesReturnedOnSale: saleRow.boxes_returned_on_sale ?? 0,
      bottlesReturnedOnSale: saleRow.bottles_returned_on_sale ?? 0,
      notes: saleRow.notes ?? undefined,
      voidedAt: saleRow.voided_at ?? undefined,
      voidReason: saleRow.void_reason ?? undefined,
      createdAt: saleRow.created_at ?? saleRow.local_updated_at ?? "",
      updatedAt: saleRow.updated_at ?? saleRow.local_updated_at ?? "",
      lines: lines.map((l) => ({
        id: l.id,
        saleId: l.sale_id,
        beverageId: l.beverage_id,
        boxes: l.boxes,
        bottles: l.bottles,
        pricePerBoxCents: l.price_per_box_cents,
        pricePerBottleCents: l.price_per_bottle_cents,
        lineTotalCents: l.line_total_cents,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        saleId: p.sale_id,
        paymentAccountId: p.payment_account_id,
        amountCents: p.amount_cents,
        method: p.method,
        reference: p.reference ?? undefined,
        notes: p.notes ?? undefined,
        paidAt: p.paid_at ?? undefined,
        voidedAt: p.voided_at ?? undefined,
        createdAt: p.paid_at ?? "",
      })),
      containerKasas: containerKasas.map((ck) => ({
        id: ck.id,
        saleId: ck.sale_id,
        beverageId: ck.beverage_id,
        count: ck.count,
        beverage: ck.beverage_name
          ? { id: ck.beverage_id, name: ck.beverage_name }
          : undefined,
        createdAt: ck.local_updated_at ?? saleRow.local_updated_at ?? "",
      })),
      returnedContainers: returnedContainers.map((rc) => ({
        id: rc.id,
        saleId: rc.sale_id,
        beverageId: rc.beverage_id,
        boxes: rc.boxes ?? 0,
        bottles: rc.bottles ?? 0,
        beverage: rc.beverage_name
          ? { id: rc.beverage_id, name: rc.beverage_name }
          : undefined,
        createdAt: rc.local_updated_at ?? saleRow.local_updated_at ?? "",
      })),
    };
  } catch {
    return null;
  }
}

export default function SaleDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "SaleDetail">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { saleId } = route.params;
  const insets = useSafeAreaInsets();
  const fmtDate = useFormattedDate();
  const { hasPermission, user } = useAuth();
  const { isOnline } = useOffline();
  const userShopId = user?.shopId ?? "";
  const canEditSale = hasPermission("sales:edit");

  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [selectedAccount, setSelectedAccount] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  const { data: sale, isLoading } = useQuery({
    queryKey: QK.sale(saleId),
    queryFn: async () => {
      try {
        const onlineResult = await getSdk().sales.findOne(saleId);
        return onlineResult;
      } catch (err) {
        // Offline fallback – load from SQLite
        const offlineResult = await fetchOfflineSale(saleId, userShopId);
        if (offlineResult) {
          return offlineResult;
        }
        throw new Error("Sale not available offline");
      }
    },
    retry: false,
  });

  const { data: accounts } = useQuery({
    queryKey: QK.paymentAccounts(),
    queryFn: () => getSdk().paymentAccounts.list(),
  });

  const voidMutation = useMutation({
    mutationFn: (reason: string) => getSdk().sales.void(saleId, reason),
    onSuccess: (updatedSale) => {
      saleRepo.applyRemoteSale(updatedSale).catch((error) => {
        console.error("Failed to update offline sale after void", error);
        showToast("Failed to update offline sale", "error");
      });
      queryClient.invalidateQueries({ queryKey: QK.sale(saleId) });
      if (sale?.customerId) {
        queryClient.invalidateQueries({
          queryKey: QK.customer(sale.customerId),
        });
        queryClient.invalidateQueries({
          queryKey: QK.customerLedger(sale.customerId),
        });
      }
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
      setShowVoidDialog(false);
      setVoidReason("");
      showToast("Sale voided", "success");
    },
    onError: () => showToast("Failed to void sale", "error"),
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (dto: AddPaymentDto) => {
      if (isOnline) {
        return getSdk().sales.addPayment(saleId, dto);
      }
      await saleRepo.addPayment({
        saleId,
        shopId: user?.shopId || "",
        actorUserId: user?.id || "",
        amountCents: dto.amountCents,
        paymentAccountId: dto.paymentAccountId,
        method: "CASH",
        reference: dto.reference,
      });
      return { id: saleId } as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.sale(saleId) });
      if (sale?.customerId) {
        queryClient.invalidateQueries({
          queryKey: QK.customer(sale.customerId),
        });
        queryClient.invalidateQueries({
          queryKey: QK.customerLedger(sale.customerId),
        });
      }
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
      setShowAddPayment(false);
      setPaymentAmount("");
      setSelectedAccount(null);
      showToast(t("paymentAdded"), "success");
    },
    onError: () => showToast(t("failedToAddPayment"), "error"),
  });

  const updateSaleMutation = useMutation({
    mutationFn: (dto: UpdateSaleDto) => getSdk().sales.update(saleId, dto),
    onSuccess: (updatedSale) => {
      saleRepo.applyRemoteSale(updatedSale).catch((error) => {
        console.error("Failed to update offline sale after edit", error);
        showToast("Failed to update offline sale", "error");
      });
      queryClient.invalidateQueries({ queryKey: QK.sale(saleId) });
      if (sale?.customerId) {
        queryClient.invalidateQueries({
          queryKey: QK.customer(sale.customerId),
        });
        queryClient.invalidateQueries({
          queryKey: QK.customerLedger(sale.customerId),
        });
      }
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
      queryClient.invalidateQueries({ queryKey: QK.sales() });
      setShowEditDialog(false);
      showToast(t("saleUpdated"), "success");
    },
    onError: () => showToast(t("failedToUpdate"), "error"),
  });

  const accountItems: PickerItem[] = (accounts ?? []).map((a) => ({
    id: a.id,
    label: a.name,
    subtitle: a.kind,
  }));

  const handleVoid = () => {
    if (!voidReason.trim()) {
      showToast(t("reasonForVoiding"), "error");
      return;
    }
    voidMutation.mutate(voidReason.trim());
  };

  const handleAddPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showToast(t("enterValidAmount"), "error");
      return;
    }
    if (!selectedAccount) {
      showToast(t("newSale.selectAccount"), "error");
      return;
    }
    addPaymentMutation.mutate({
      paymentAccountId: selectedAccount.id,
      amountCents: Math.round(amount * 100),
    });
  };

  const handleOpenEdit = () => {
    setEditNotes(sale?.notes || "");
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!sale) return;
    const lines: UpdateSaleLineDto[] = sale.lines.map((l) => ({
      beverageId: l.beverageId,
      boxes: l.boxes,
      bottles: l.bottles,
    }));
    const payments: UpdateSalePaymentDto[] = sale.payments
      .filter((p) => !p.voidedAt)
      .map((p) => ({
        paymentAccountId: p.paymentAccountId,
        amountCents: p.amountCents,
        reference: p.reference,
        notes: p.notes,
        paidAt: p.paidAt,
      }));
    updateSaleMutation.mutate({
      saleDate: sale.saleDate,
      customerId: sale.customerId || "",
      priceTierId: sale.priceTierId,
      notes: editNotes,
      lines,
      payments,
      boxesReturnedOnSale: sale.boxesReturnedOnSale,
      bottlesReturnedOnSale: sale.bottlesReturnedOnSale,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Skeleton width={40} height={40} />
          <Skeleton width={120} height={28} />
        </View>
        <View style={{ paddingHorizontal: spacing[5] }}>
          <Skeleton height={100} />
        </View>
      </SafeAreaView>
    );
  }

  if (!sale) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t("saleDetail")}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <OfflineLimitedView />
      </SafeAreaView>
    );
  }

  const isVoided = sale.status === "VOIDED";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t("saleDetail")}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t("date")}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {fmtDate(sale.saleDate)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t("status")}
              </Text>
              <StatusBadge status={sale.status} />
            </View>
            {sale.customer && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  {t("newSale.customer")}
                </Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {sale.customer.name}
                </Text>
              </View>
            )}
            {!isOnline && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.warning }]}>
                  Offline mode
                </Text>
                <Ionicons
                  name="cloud-offline-outline"
                  size={18}
                  color={colors.warning}
                />
              </View>
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t("lineItems")}
          </Text>
          <View style={[styles.linesCard, { backgroundColor: colors.surface }]}>
            {sale.lines.map((line, i) => (
              <View
                key={line.id}
                style={[
                  styles.lineRow,
                  i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 },
                ]}
              >
                <View style={styles.lineInfo}>
                  <Text style={[styles.lineName, { color: colors.textPrimary }]}>
                    {line.beverage?.name ?? "Beverage"}
                  </Text>
                  <Text style={[styles.lineQty, { color: colors.textSecondary }]}>
                    {line.boxes > 0 &&
                      `${line.boxes} box${line.boxes > 1 ? "es" : ""}`}
                    {line.boxes > 0 && line.bottles > 0 && " · "}
                    {line.bottles > 0 &&
                      `${line.bottles} bottle${line.bottles > 1 ? "s" : ""}`}
                  </Text>
                </View>
                <Text style={[styles.lineTotal, { color: colors.textPrimary }]}>
                  {formatCurrency(line.lineTotalCents)}
                </Text>
              </View>
            ))}
          </View>

          {sale.containerKasas && sale.containerKasas.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                {t("newSale.containerKasaSection")}
              </Text>
              <View
                style={[styles.linesCard, { backgroundColor: colors.surface }]}
              >
                {sale.containerKasas.map((ck, i) => (
                  <View
                    key={ck.id}
                    style={[
                      styles.lineRow,
                      i > 0 && {
                        borderTopColor: colors.border,
                        borderTopWidth: 1,
                      },
                    ]}
                  >
                    <View style={styles.lineInfo}>
                      <Text
                        style={[styles.lineName, { color: colors.textPrimary }]}
                      >
                        {ck.beverage?.name ?? "Beverage"}
                      </Text>
                    </View>
                    <Text
                      style={[styles.lineTotal, { color: colors.textPrimary }]}
                    >
                      × {ck.count}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {sale.returnedContainers && sale.returnedContainers.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.warning }]}>
                {t("newSale.returnedContainersSection")}
              </Text>
              <View
                style={[styles.linesCard, { backgroundColor: colors.surface }]}
              >
                {sale.returnedContainers.map((rc, i) => (
                  <View
                    key={rc.id}
                    style={[
                      styles.lineRow,
                      i > 0 && {
                        borderTopColor: colors.border,
                        borderTopWidth: 1,
                      },
                    ]}
                  >
                    <View style={styles.lineInfo}>
                      <Text
                        style={[styles.lineName, { color: colors.textPrimary }]}
                      >
                        {rc.beverage?.name ?? "Beverage"}
                      </Text>
                      <Text
                        style={[styles.lineQty, { color: colors.textSecondary }]}
                      >
                        {rc.boxes > 0 &&
                          `${rc.boxes} box${rc.boxes > 1 ? "es" : ""}`}
                        {rc.boxes > 0 && rc.bottles > 0 && " · "}
                        {rc.bottles > 0 &&
                          `${rc.bottles} bottle${rc.bottles > 1 ? "s" : ""}`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t("payments")} ({sale.payments.length})
          </Text>
          {sale.payments.map((payment) => (
            <PaymentRow
              key={payment.id}
              date={fmtDate(payment.paidAt ?? payment.createdAt)}
              amountCents={payment.amountCents}
              method={payment.method}
              voided={!!payment.voidedAt}
              type="sale"
              onPress={() =>
                navigation.navigate("PaymentDetail", {
                  paymentId: payment.id,
                  saleId: sale.id,
                })
              }
            />
          ))}

          <View style={[styles.totalsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                {t("newSale.subtotal")}
              </Text>
              <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
                {formatCurrency(sale.subtotalCents)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                {t("newSale.paid")}
              </Text>
              <Text style={[styles.totalValue, { color: colors.success }]}>
                {formatCurrency(sale.paidCents)}
              </Text>
            </View>
            <View
              style={[
                styles.totalRow,
                styles.totalRowFinal,
                { borderTopColor: colors.border },
              ]}
            >
              <Text
                style={[styles.totalLabelFinal, { color: colors.textPrimary }]}
              >
                {t("credit")}
              </Text>
              <Text
                style={[
                  styles.totalValueFinal,
                  {
                    color:
                      sale.creditDeltaCents > 0 ? colors.danger : colors.success,
                  },
                ]}
              >
                {formatCurrency(sale.creditDeltaCents)}
              </Text>
            </View>
          </View>

          {/* Spacer so content clears the sticky footer */}
          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Sticky bottom action bar — only when not voided and online */}
      {!isVoided && !!isOnline && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, spacing[3]),
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.bottomAction, { borderColor: colors.border }]}
            onPress={handleOpenEdit}
            disabled={!canEditSale}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.bottomActionText, { color: colors.textSecondary }]}>
              {t("edit")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomAction, { borderColor: colors.border }]}
            onPress={() => setShowAddPayment(true)}
          >
            <Ionicons name="cash-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.bottomActionText, { color: colors.textSecondary }]}>
              {t("addPayment")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomAction, { borderColor: colors.border }]}
            onPress={() => setShowVoidDialog(true)}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.bottomActionText, { color: colors.textMuted }]}>
              {t("voidSale")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Void Dialog */}
      <Modal visible={showVoidDialog} transparent animationType="fade">
        <View style={[styles.dialogOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>
              {t("voidSaleTitle")}
            </Text>
            <Text
              style={[styles.dialogSubtitle, { color: colors.textSecondary }]}
            >
              {t("voidSaleSubtitle")}
            </Text>
            <TextInput
              style={[
                styles.dialogInput,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                },
              ]}
              placeholder={t("reasonForVoiding")}
              placeholderTextColor={colors.textMuted}
              value={voidReason}
              onChangeText={setVoidReason}
              multiline
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[
                  styles.dialogCancel,
                  { backgroundColor: colors.surfaceMuted },
                ]}
                onPress={() => setShowVoidDialog(false)}
              >
                <Text
                  style={[
                    styles.dialogCancelText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t("cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dialogConfirm,
                  { backgroundColor: colors.danger },
                ]}
                onPress={handleVoid}
              >
                <Text
                  style={[
                    styles.dialogConfirmText,
                    { color: colors.textInverse },
                  ]}
                >
                  {t("void")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        visible={showAddPayment}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddPayment(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, spacing[6]),
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                {
                  paddingTop: Math.max(insets.top, spacing[4]),
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t("addPayment")}
              </Text>
              <TouchableOpacity onPress={() => setShowAddPayment(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                {t("amount")}
              </Text>
              <AmountInput
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="0.00"
              />

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: spacing[4] },
                ]}
              >
                {t("account")}
              </Text>
              <TouchableOpacity
                style={[
                  styles.accountPicker,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowAccountPicker(true)}
              >
                <Text
                  style={[
                    styles.accountPickerText,
                    {
                      color: selectedAccount
                        ? colors.textPrimary
                        : colors.textMuted,
                    },
                  ]}
                >
                  {selectedAccount?.name ?? t("newSale.selectAccount")}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleAddPayment}
              disabled={addPaymentMutation.isPending}
            >
              <Text
                style={[styles.submitButtonText, { color: colors.textInverse }]}
              >
                {addPaymentMutation.isPending ? t("adding") : t("addPayment")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PickerSheet
        visible={showAccountPicker}
        title={t("account")}
        items={accountItems}
        onSelect={(item) => {
          const a = accounts?.find((x) => x.id === item.id);
          if (a) setSelectedAccount({ id: a.id, name: a.name });
        }}
        onClose={() => setShowAccountPicker(false)}
      />

      {/* Edit Sale Dialog */}
      <Modal visible={showEditDialog} transparent animationType="fade">
        <View style={[styles.dialogOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>
              {t("editSale")}
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t("notes")}
            </Text>
            <TextInput
              style={[
                styles.dialogInput,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                },
              ]}
              placeholder={t("addNotes")}
              placeholderTextColor={colors.textMuted}
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[
                  styles.dialogCancel,
                  { backgroundColor: colors.surfaceMuted },
                ]}
                onPress={() => setShowEditDialog(false)}
              >
                <Text
                  style={[
                    styles.dialogCancelText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t("cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dialogConfirm,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleSaveEdit}
                disabled={updateSaleMutation.isPending}
              >
                <Text
                  style={[
                    styles.dialogConfirmText,
                    { color: colors.textInverse },
                  ]}
                >
                  {updateSaleMutation.isPending ? t("saving") : t("save")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  headerTitle: { ...type.h3 },
  scrollContent: { paddingHorizontal: spacing[5], paddingTop: spacing[2], paddingBottom: spacing[4] },
  infoCard: {
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[2],
  },
  infoLabel: { ...type.caption },
  infoValue: { ...type.bodyMedium },
  sectionTitle: { ...type.h4, marginBottom: spacing[2] },
  linesCard: {
    borderRadius: radius.md,
    marginBottom: spacing[4],
    overflow: "hidden",
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[4],
  },
  lineRowBorder: { borderTopWidth: 1 },
  lineInfo: { flex: 1 },
  lineName: { ...type.bodyMedium },
  lineQty: { ...type.caption, marginTop: 2 },
  lineTotal: { ...type.bodyBold },
  totalsCard: {
    borderRadius: radius.md,
    padding: spacing[4],
    marginTop: spacing[4],
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing[2],
  },
  totalLabel: { ...type.body },
  totalValue: { ...type.bodyBold },
  totalRowFinal: {
    borderTopWidth: 1,
    marginTop: spacing[2],
    paddingTop: spacing[3],
  },
  totalLabelFinal: { ...type.bodyMedium },
  totalValueFinal: { ...type.h4 },
  bottomBar: {
    flexDirection: "row",
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    borderTopWidth: 1,
  },
  bottomAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing[3],
  },
  bottomActionText: { ...type.caption, fontWeight: "600" },
  dialogOverlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  dialog: {
    borderRadius: radius.lg,
    padding: spacing[5],
    width: "85%",
    maxWidth: 340,
  },
  dialogTitle: { ...type.h3, marginBottom: spacing[2] },
  dialogSubtitle: { ...type.body, marginBottom: spacing[4] },
  dialogInput: {
    ...type.body,
    borderRadius: radius.sm,
    padding: spacing[3],
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: spacing[4],
  },
  dialogButtons: { flexDirection: "row", gap: spacing[3] },
  dialogCancel: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: "center",
    borderRadius: radius.sm,
  },
  dialogCancelText: { ...type.bodyBold },
  dialogConfirm: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: "center",
    borderRadius: radius.sm,
  },
  dialogConfirmText: { ...type.bodyBold },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
  },
  modalTitle: { ...type.h3 },
  modalContent: { paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  fieldLabel: { ...type.caption, marginBottom: spacing[2] },
  accountPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  accountPickerText: { ...type.body },
  accountPickerPlaceholder: { ...type.body },
  submitButton: {
    borderRadius: radius.md,
    marginHorizontal: spacing[5],
    paddingVertical: spacing[4],
    alignItems: "center",
  },
  submitButtonText: { ...type.bodyBold, fontSize: 16 },
});
