import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../context/ThemeContext";
import { radius, spacing, type } from "../theme";
import { SaleLine } from "../lib/sdk";
import type { SaleContainerKasa, SaleReturnedContainer } from "../lib/sdk/resources/sales";

const STATUS_CONFIG = {
  VOIDED: { tone: "danger", icon: "close-circle-outline" as const },
  DRAFT: { tone: "warning", icon: "ellipse-outline" as const },
  SUCCESS: { tone: "success", icon: "checkmark-circle-outline" as const },
} as const;

export function SaleRow({
  date,
  totalCents,
  paidCents,
  creditDeltaCents,
  status,
  customerName,
  lineCount,
  line = [],
  containerKasas,
  returnedContainers,
  onPress,
}: {
  date: string;
  totalCents: number;
  paidCents: number;
  creditDeltaCents: number;
  status: string;
  customerName?: string;
  lineCount?: number;
  line?: SaleLine[];
  containerKasas?: SaleContainerKasa[];
  returnedContainers?: SaleReturnedContainer[];
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const fmt = (cents: number) =>
    (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

  const cfg =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.SUCCESS;
  const statusColor =
    cfg.tone === "danger"
      ? colors.danger
      : cfg.tone === "warning"
        ? colors.warning
        : colors.success;
  const statusBg =
    cfg.tone === "danger"
      ? colors.dangerLight
      : cfg.tone === "warning"
        ? colors.warningLight
        : colors.successLight;
  const hasCredit = creditDeltaCents > 0;

  function formatLineItems(lines: SaleLine[]): string {
    const formattedTextArray = lines.map((line) => {
      const text =
        `${line.beverage?.name ?? "Unknown"} - ${line.boxes > 0 && line.boxes ? line.boxes + " Box " : ""}${line.bottles > 0 && line.bottles ? line.bottles + " Bottle" : ""}`.trim();
      if (text.length > 30) {
        return text.substring(0, 27) + "...";
      }
      return text;
    });
    return formattedTextArray.join(", ");
  }

  const hasContainers =
    (containerKasas && containerKasas.length > 0) ||
    (returnedContainers && returnedContainers.length > 0);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomWidth: 2,
          borderBottomColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.body}>
        {/* Top row: customer / date + status */}
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            {customerName ? (
              <Text
                style={[styles.customer, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {customerName}
              </Text>
            ) : (
              <Text style={[styles.customer, { color: colors.textMuted }]}>
                Walk-in
              </Text>
            )}
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {date}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <Ionicons name={cfg.icon} size={12} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {status}
            </Text>
          </View>
        </View>

        {/* Amounts row */}
        <View style={styles.amountsRow}>
          <AmountCell
            label="Total"
            value={fmt(totalCents)}
            color={colors.textPrimary}
          />
          <AmountCell
            label="Paid"
            value={fmt(paidCents)}
            color={colors.success}
          />
          {hasCredit && (
            <AmountCell
              label="Credit"
              value={fmt(creditDeltaCents)}
              color={colors.danger}
            />
          )}
          {lineCount !== undefined && (
            <View style={styles.amountCell}>
              <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
                Items
              </Text>
              <Text
                style={[styles.amountValue, { color: colors.textSecondary }]}
              >
                {lineCount}
              </Text>
            </View>
          )}
        </View>

        {/* Line items */}
        <Text style={[styles.lineText, { color: colors.textMuted }]}>
          {formatLineItems(line)}
        </Text>

        {/* Container Kasa (Mixed Box) */}
        {containerKasas && containerKasas.length > 0 && (
          <View style={[styles.containersSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.containerLabel, { color: colors.primary }]}>
              Container Kasa
            </Text>
            {containerKasas.map((ck) => (
              <Text key={ck.id} style={[styles.containerItem, { color: colors.textSecondary }]}>
                {ck.beverage?.name ?? "Unknown"} × {ck.count}
              </Text>
            ))}
          </View>
        )}

        {/* Returned Containers */}
        {returnedContainers && returnedContainers.length > 0 && (
          <View style={[styles.containersSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.containerLabel, { color: colors.warning }]}>
              Returned Containers
            </Text>
            {returnedContainers.map((rc) => (
              <Text key={rc.id} style={[styles.containerItem, { color: colors.textSecondary }]}>
                {rc.beverage?.name ?? "Unknown"} — {rc.boxes > 0 ? `${rc.boxes} Box ` : ""}{rc.bottles > 0 ? `${rc.bottles} Bottle` : ""}
              </Text>
            ))}
          </View>
        )}
      </View>

      <Ionicons
        name="chevron-forward"
        size={14}
        color={colors.textMuted}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

function AmountCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.amountCell}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={[styles.amountValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing[2],
  },
  topLeft: { flex: 1, marginRight: spacing[2] },
  customer: {
    ...type.bodyMedium,
    fontSize: 14,
  },
  date: {
    ...type.micro,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  amountsRow: {
    flexDirection: "row",
    gap: spacing[4],
  },
  lineText: {
    marginTop: spacing[1],
    ...type.micro,
    overflow: "hidden",
  },
  containersSection: {
    marginTop: spacing[2],
    paddingTop: spacing[1],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  containerLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },
  containerItem: {
    fontSize: 11,
    lineHeight: 16,
  },
  amountCell: {},
  amountLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94a3b8",
    marginBottom: 1,
  },
  amountValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  chevron: {
    marginRight: spacing[3],
  },
});
