import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
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
import { FormattedDate } from "../components/FormattedDate";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { API_URL } from "../lib/sdk";
import { radius, spacing, type } from "../theme";

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusChip(label: string, colors: any) {
  const bgColor =
    label === "CONFIRMED"
      ? colors.success + "1A"
      : label === "OPEN"
        ? colors.warning + "1A"
        : colors.surfaceMuted;
  const textColor =
    label === "CONFIRMED"
      ? colors.success
      : label === "OPEN"
        ? colors.warning
        : colors.textMuted;
  return (
    <View style={[styles.statusChip, { backgroundColor: bgColor }]}>
      <Text style={[styles.statusChipText, { color: textColor }]}>
        {label}
      </Text>
    </View>
  );
}

export default function CustomerSaleDetailScreen() {
  const { colors } = useTheme();
  const route =
    useRoute<RouteProp<RootStackParamList, "CustomerSaleDetail">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { customerId, saleId, accessToken } = route.params;

  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId || !saleId) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/api/v1/customer-portal/${customerId}/sales/${saleId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );
        const envelope = await res.json();
        if (!res.ok)
          throw new Error(envelope?.error?.message ?? "Request failed");
        setSale(envelope?.data ?? envelope);
      } catch (e: any) {
        setError(e.message ?? "Failed to load sale details");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [customerId, saleId, accessToken]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border },
          ]}
        >
          <Skeleton width={120} height={24} />
        </View>
        <View style={styles.content}>
          <Skeleton width="100%" height={120} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={200} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !sale) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.danger}
          />
          <Text style={[styles.errorTitle, { color: colors.danger }]}>
            {t("errorLoading")}
          </Text>
          <Text
            style={[styles.errorDesc, { color: colors.textSecondary }]}
          >
            {error ?? t("notFound")}
          </Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: colors.primary }]}
            onPress={() =>
              navigation.replace("CustomerPortal", { customerId, accessToken })
            }
          >
            <Text
              style={[styles.errorButtonText, { color: colors.textInverse }]}
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
              Sale #{(sale.id ?? "").slice(-6).toUpperCase()}
            </Text>
          </View>
          <LanguageSwitcher />
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {/* Sale Info */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.infoHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textMuted },
              ]}
            >
              {t("saleInfo")}
            </Text>
            {statusChip(sale.status, colors)}
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoField}>
              <Text
                style={[styles.infoLabel, { color: colors.textMuted }]}
              >
                {t("saleDate")}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                <FormattedDate iso={sale.saleDate} />
              </Text>
            </View>
            <View style={styles.infoField}>
              <Text
                style={[styles.infoLabel, { color: colors.textMuted }]}
              >
                {t("customer")}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {sale.customer?.name}
              </Text>
              {sale.customer?.phone && (
                <Text
                  style={[styles.infoSub, { color: colors.textMuted }]}
                >
                  {sale.customer.phone}
                </Text>
              )}
            </View>
            <View style={styles.infoField}>
              <Text
                style={[styles.infoLabel, { color: colors.textMuted }]}
              >
                {t("dateTime")}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {formatDateTime(sale.createdAt)}
              </Text>
            </View>
            <View style={styles.infoField}>
              <Text
                style={[styles.infoLabel, { color: colors.textMuted }]}
              >
                {t("lastUpdated")}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {formatDateTime(sale.updatedAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View
          style={[
            styles.tableCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.tableHeader,
              { backgroundColor: colors.surfaceMuted },
            ]}
          >
            <Text
              style={[styles.sectionTitle, { color: colors.textMuted }]}
            >
              {t("items")}
            </Text>
          </View>
          <View style={styles.tableCols}>
            <Text
              style={[styles.tableCol, { color: colors.textMuted, flex: 2 }]}
            >
              {t("beverage")}
            </Text>
            <Text
              style={[styles.tableCol, { color: colors.textMuted, flex: 1 }]}
            >
              {t("quantity")}
            </Text>
            <Text
              style={[
                styles.tableCol,
                { color: colors.textMuted, flex: 1 },
              ]}
            >
              {t("unitPrice")}
            </Text>
            <Text
              style={[
                styles.tableCol,
                { color: colors.textMuted, flex: 1, textAlign: "right" },
              ]}
            >
              {t("total")}
            </Text>
          </View>
          {(sale.lines ?? []).map((item: any, idx: number) => {
            const qtyParts: string[] = [];
            if (item.boxes > 0)
              qtyParts.push(
                `${item.boxes} ${item.boxes === 1 ? "box" : "boxes"}`,
              );
            if (item.bottles > 0)
              qtyParts.push(
                `${item.bottles} ${item.bottles === 1 ? "bottle" : "bottles"}`,
              );
            return (
              <View
                key={item.id ?? idx}
                style={[
                  styles.tableRow,
                  idx < (sale.lines?.length ?? 0) - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tableCell,
                    { color: colors.textPrimary, flex: 2 },
                  ]}
                >
                  {item.beverage?.name ?? "-"}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { color: colors.textPrimary, flex: 1 },
                  ]}
                >
                  {qtyParts.length > 0 ? qtyParts.join(" + ") : "-"}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { color: colors.textPrimary, flex: 1 },
                  ]}
                >
                  {formatCurrency(item.pricePerBoxCents)}/box
                  {item.pricePerBottleCents > 0 &&
                    (" \u00B7 " + formatCurrency(item.pricePerBottleCents) + "/btl")}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      color: colors.textPrimary,
                      flex: 1,
                      textAlign: "right",
                    },
                  ]}
                >
                  {formatCurrency(item.lineTotalCents)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Payments */}
        <View
          style={[
            styles.tableCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.tableHeader,
              { backgroundColor: colors.surfaceMuted },
            ]}
          >
            <Text
              style={[styles.sectionTitle, { color: colors.textMuted }]}
            >
              {t("payments")}
            </Text>
          </View>
          <View style={styles.tableCols}>
            <Text
              style={[styles.tableCol, { color: colors.textMuted, flex: 1 }]}
            >
              {t("date")}
            </Text>
            <Text
              style={[
                styles.tableCol,
                { color: colors.textMuted, flex: 1.5 },
              ]}
            >
              {t("paymentAccount")}
            </Text>
            <Text
              style={[
                styles.tableCol,
                { color: colors.textMuted, flex: 1, textAlign: "right" },
              ]}
            >
              {t("amountPaid")}
            </Text>
          </View>
          {sale.payments.length === 0 ? (
            <Text
              style={[styles.emptyText, { color: colors.textMuted }]}
            >
              {t("noPaymentsRecorded")}
            </Text>
          ) : (
            sale.payments.map((p: any, idx: number) => (
              <View
                key={p.id ?? idx}
                style={[
                  styles.tableRow,
                  idx < sale.payments.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tableCell,
                    { color: colors.textMuted, flex: 1 },
                  ]}
                >
                  <FormattedDate iso={p.paidAt} />
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { color: colors.textPrimary, flex: 1.5 },
                  ]}
                >
                  {p.paymentAccount?.name ?? t("other")}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      color: colors.success,
                      flex: 1,
                      textAlign: "right",
                      fontWeight: "700",
                    },
                  ]}
                >
                  {formatCurrency(p.amountCents)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Container Kasas */}
        {(sale.containerKasas?.length ?? 0) > 0 && (
          <View
            style={[
              styles.tableCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.tableHeader,
                { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <Text
                style={[styles.sectionTitle, { color: colors.textMuted }]}
              >
                {t("containerKasaSection")}
              </Text>
            </View>
            <View style={styles.tableCols}>
              <Text
                style={[
                  styles.tableCol,
                  { color: colors.textMuted, flex: 2 },
                ]}
              >
                {t("beverage")}
              </Text>
              <Text
                style={[
                  styles.tableCol,
                  {
                    color: colors.textMuted,
                    flex: 1,
                    textAlign: "right",
                  },
                ]}
              >
                {t("containerKasaCount")}
              </Text>
            </View>
            {sale.containerKasas!.map((k: any, idx: number) => (
              <View
                key={k.id ?? idx}
                style={[
                  styles.tableRow,
                  idx < sale.containerKasas!.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tableCell,
                    { color: colors.textPrimary, flex: 2 },
                  ]}
                >
                  {k.beverage?.name ?? t("beverage")}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      color: colors.textPrimary,
                      flex: 1,
                      textAlign: "right",
                    },
                  ]}
                >
                  {k.count}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Returned Containers */}
        {(sale.returnedContainers?.length ?? 0) > 0 && (
          <View
            style={[
              styles.tableCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.tableHeader,
                { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <Text
                style={[styles.sectionTitle, { color: colors.textMuted }]}
              >
                {t("returnedContainersSection")}
              </Text>
            </View>
            <View style={styles.tableCols}>
              <Text
                style={[
                  styles.tableCol,
                  { color: colors.textMuted, flex: 2 },
                ]}
              >
                {t("beverage")}
              </Text>
              <Text
                style={[
                  styles.tableCol,
                  { color: colors.textMuted, flex: 1 },
                ]}
              >
                {t("returnBoxes")}
              </Text>
              <Text
                style={[
                  styles.tableCol,
                  {
                    color: colors.textMuted,
                    flex: 1,
                    textAlign: "right",
                  },
                ]}
              >
                {t("returnBottles")}
              </Text>
            </View>
            {sale.returnedContainers!.map((r: any, idx: number) => (
              <View
                key={r.id ?? idx}
                style={[
                  styles.tableRow,
                  idx < sale.returnedContainers!.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tableCell,
                    { color: colors.textPrimary, flex: 2 },
                  ]}
                >
                  {r.beverage?.name ?? t("beverage")}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { color: colors.textPrimary, flex: 1 },
                  ]}
                >
                  {r.boxes}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      color: colors.textPrimary,
                      flex: 1,
                      textAlign: "right",
                    },
                  ]}
                >
                  {r.bottles}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Summary */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: colors.textMuted }]}
          >
            {t("summary")}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              {t("totalAmount")}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: colors.textPrimary },
              ]}
            >
              {formatCurrency(sale.subtotalCents)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              {t("totalPaid")}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: colors.success },
              ]}
            >
              {formatCurrency(sale.paidCents)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { borderColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>
              {t("remainingBalance")}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    sale.subtotalCents > sale.paidCents
                      ? colors.danger
                      : colors.textPrimary,
                },
              ]}
            >
              {formatCurrency(sale.subtotalCents - sale.paidCents)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {sale.notes && (
          <View
            style={[
              styles.notesCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.sectionTitle, { color: colors.textMuted }]}
            >
              {t("note")}
            </Text>
            <Text style={[styles.notesText, { color: colors.textMuted }]}>
              {sale.notes}
            </Text>
          </View>
        )}
      </ScrollView>
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
  content: { padding: spacing[5], paddingBottom: spacing[10], gap: spacing[4] },
  infoCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[4],
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  infoGrid: { gap: spacing[1] },
  infoField: { gap: 2 },
  infoLabel: { ...type.caption },
  infoValue: { ...type.bodyBold },
  infoSub: { ...type.caption },
  sectionTitle: { ...type.caption, fontWeight: "600", textTransform: "uppercase" },
  statusChip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  statusChipText: { ...type.caption, fontWeight: "600" },
  tableCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableHeader: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  tableCols: {
    flexDirection: "row",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  tableCol: { ...type.caption, fontWeight: "600" },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  tableCell: { ...type.body, fontVariant: ["tabular-nums"] },
  emptyText: { ...type.body, fontStyle: "italic", textAlign: "center", padding: spacing[6] },
  summaryCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[4],
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[2],
  },
  summaryLabel: { ...type.body },
  summaryValue: { ...type.bodyBold, fontVariant: ["tabular-nums"] },
  summaryDivider: {
    borderTopWidth: 1,
    marginVertical: spacing[2],
  },
  notesCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[4],
  },
  notesText: { ...type.body, marginTop: spacing[1] },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
    gap: spacing[3],
  },
  errorTitle: { ...type.h3 },
  errorDesc: { ...type.body, textAlign: "center" },
  errorButton: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    marginTop: spacing[3],
  },
  errorButtonText: { ...type.bodyBold },
});
