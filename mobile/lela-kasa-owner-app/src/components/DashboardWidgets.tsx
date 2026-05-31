import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Skeleton } from "./Skeleton";
import { radius, spacing, type } from "../theme";
import { formatMoneyCents } from "../lib/util/money";

const { width: screenWidth } = Dimensions.get("window");

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: "primary" | "warning" | "danger" | "success";
  loading?: boolean;
  onPress?: () => void;
  fullWidth?: boolean;
}

export function KpiCard({
  label,
  value,
  sub,
  icon,
  color = "primary",
  loading,
  onPress,
  fullWidth = false,
}: KpiCardProps) {
  const { colors } = useTheme();

  const tintColors = {
    primary: { bg: colors.primaryLight, fg: colors.primary },
    warning: { bg: colors.warningLight, fg: colors.warning },
    danger: { bg: colors.dangerLight, fg: colors.danger },
    success: { bg: colors.successLight, fg: colors.success },
  };

  const tc = tintColors[color];

  if (loading) {
    return (
      <View style={[styles.card, fullWidth && styles.cardFull, { backgroundColor: colors.surface }]}>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={120} height={12} />
            <Skeleton width={fullWidth ? 180 : 110} height={28} />
          </View>
          <Skeleton width={40} height={40} radius={10} />
        </View>
        {sub && <Skeleton width={100} height={10} style={{ marginTop: 10 }} />}
      </View>
    );
  }

  const inner = (
    <View style={[styles.card, fullWidth && styles.cardFull, { backgroundColor: colors.surface }]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
            {label}
          </Text>
          <Text
            style={[styles.value, { color: colors.textPrimary }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {value}
          </Text>
        </View>
        <View style={[styles.iconBox, { backgroundColor: tc.bg }]}>
          <Ionicons name={icon} size={18} color={tc.fg} />
        </View>
      </View>
      {sub && (
        <Text style={[styles.sub, { color: colors.textMuted }]}>{sub}</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

// ── Range Selector ────────────────────────────────────────────────────────────

export type RangeMode = "today" | "week" | "month" | "custom";

interface RangeSelectorProps {
  mode: RangeMode;
  onModeChange: (mode: RangeMode) => void;
}

export function RangeSelector({ mode, onModeChange }: RangeSelectorProps) {
  const { colors } = useTheme();
  const presets: Array<{ id: RangeMode; label: string }> = [
    { id: "today", label: "Today" },
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <View style={[styles.rangeWrap, { backgroundColor: colors.surfaceMuted }]}>
      {presets.map((p) => (
        <TouchableOpacity
          key={p.id}
          onPress={() => onModeChange(p.id)}
          style={[
            styles.rangeBtn,
            mode === p.id && { backgroundColor: colors.surface },
            mode === p.id && styles.rangeBtnActive,
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.rangeLabel,
              { color: mode === p.id ? colors.textPrimary : colors.textSecondary },
              mode === p.id && styles.rangeLabelActive,
            ]}
          >
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Top Customers List ────────────────────────────────────────────────────────

interface TopCustomersListProps {
  loading: boolean;
  data: Array<{ id: string; name: string; totalCents: number }>;
}

export function TopCustomersList({ loading, data }: TopCustomersListProps) {
  const { colors } = useTheme();
  const max = Math.max(...data.map((c) => c.totalCents), 1);

  return (
    <View style={[styles.widget, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
      <View style={styles.widgetHeader}>
        <View style={[styles.widgetIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="people" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.widgetTitle, { color: colors.textPrimary }]}>
          Top Customers
        </Text>
      </View>

      {loading ? (
        <View style={{ gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Skeleton width={120} height={12} />
                <Skeleton width={70} height={12} />
              </View>
              <Skeleton width="100%" height={6} radius={3} />
            </View>
          ))}
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {data.map((c, i) => (
            <View key={c.id}>
              <View style={styles.customerRow}>
                <View style={[styles.rankBadge, { backgroundColor: colors.surfaceMuted }]}>
                  <Text style={[styles.rankText, { color: colors.textSecondary }]}>{i + 1}</Text>
                </View>
                <Text
                  style={[styles.customerName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {c.name}
                </Text>
                <Text style={[styles.customerValue, { color: colors.textSecondary }]}>
                  {formatMoneyCents(c.totalCents)}
                </Text>
              </View>
              <View style={[styles.progressBg, { backgroundColor: colors.surfaceMuted }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${(c.totalCents / max) * 100}%`,
                      opacity: 0.5 + (1 - i / data.length) * 0.5,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Low Stock Widget ──────────────────────────────────────────────────────────

interface LowStockWidgetProps {
  loading: boolean;
  data: Array<{ name: string; stockBottles: number }>;
}

export function LowStockWidget({ loading, data }: LowStockWidgetProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.widget, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
      <View style={styles.widgetHeader}>
        <View style={[styles.widgetIcon, { backgroundColor: colors.dangerLight }]}>
          <Ionicons name="warning" size={16} color={colors.danger} />
        </View>
        <Text style={[styles.widgetTitle, { color: colors.textPrimary }]}>
          Low Stock Alert
        </Text>
      </View>

      {loading ? (
        <View style={{ gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Skeleton width={120} height={12} />
                <Skeleton width={50} height={12} />
              </View>
              <Skeleton width="100%" height={6} radius={3} />
            </View>
          ))}
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={[styles.emptyText, { color: colors.success }]}>All stock levels OK</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {data.map((b, i) => {
            const pct = Math.min(100, Math.round((b.stockBottles / 60) * 100));
            const critical = b.stockBottles <= 12;
            return (
              <View key={i} style={{ gap: 4 }}>
                <View style={styles.stockRow}>
                  <Text
                    style={[styles.stockName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {b.name}
                  </Text>
                  <Text
                    style={[
                      styles.stockCount,
                      { color: critical ? colors.danger : colors.textSecondary },
                    ]}
                  >
                    {b.stockBottles} bottles
                  </Text>
                </View>
                <View style={[styles.progressBg, { backgroundColor: colors.surfaceMuted }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: critical ? colors.danger : colors.warning,
                        width: `${pct}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Recent Voids Widget ───────────────────────────────────────────────────────

interface RecentVoidsWidgetProps {
  loading: boolean;
  data: Array<{
    id: string;
    customerId: string | null;
    customerName?: string | null;
    saleDate: string | null;
    voidedAt: string | null;
    subtotalCents: number;
  }>;
  onPressSale?: (saleId: string) => void;
}

export function RecentVoidsWidget({ loading, data, onPressSale }: RecentVoidsWidgetProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.widget, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
      <View style={styles.widgetHeader}>
        <View style={[styles.widgetIcon, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="close-circle" size={16} color={colors.warning} />
        </View>
        <Text style={[styles.widgetTitle, { color: colors.textPrimary }]}>Recent Voids</Text>
      </View>

      {loading ? (
        <View style={{ gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={48} radius={8} />
          ))}
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recent voids</Text>
        </View>
      ) : (
        <View style={{ gap: 4 }}>
          {data.map((v) => (
            <TouchableOpacity
              key={v.id}
              onPress={() => onPressSale?.(v.id)}
              activeOpacity={0.7}
              style={[styles.voidItem, { borderBottomColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.voidName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {v.customerName ?? "—"}
                </Text>
                <Text style={[styles.voidMeta, { color: colors.textMuted }]}>
                  {v.saleDate ? `Sale: ${fmtShort(v.saleDate)}` : ""}
                  {v.voidedAt ? ` · Voided: ${fmtShort(v.voidedAt)}` : ""}
                </Text>
              </View>
              <View style={styles.voidRight}>
                <Text style={[styles.voidValue, { color: colors.textPrimary }]}>
                  {formatMoneyCents(v.subtotalCents)}
                </Text>
                <Text style={[styles.voidId, { color: colors.textMuted }]}>#{v.id.slice(-6)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    borderRadius: radius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardFull: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    ...type.caption,
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    ...type.h3,
    fontSize: 22,
  },
  sub: {
    ...type.micro,
    fontSize: 11,
    marginTop: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeWrap: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: 2,
    gap: 2,
    flexWrap: "wrap",
  },
  rangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  rangeBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  rangeLabel: {
    ...type.caption,
    fontSize: 12,
  },
  rangeLabelActive: {
    fontWeight: "700",
  },
  widget: {
    padding: spacing[5],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    width: "100%",
  },
  widgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  widgetIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  widgetTitle: {
    ...type.bodyBold,
    fontSize: 14,
  },
  emptyBox: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  emptyText: {
    ...type.body,
    fontSize: 13,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  rankBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    ...type.micro,
    fontSize: 10,
  },
  customerName: {
    ...type.bodyMedium,
    fontSize: 13,
    flex: 1,
  },
  customerValue: {
    ...type.caption,
    fontSize: 12,
  },
  progressBg: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  stockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stockName: {
    ...type.bodyMedium,
    fontSize: 13,
    flex: 1,
  },
  stockCount: {
    ...type.caption,
    fontSize: 11,
  },
  voidItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  voidName: {
    ...type.bodyMedium,
    fontSize: 13,
  },
  voidMeta: {
    ...type.micro,
    fontSize: 10,
    marginTop: 1,
  },
  voidRight: {
    alignItems: "flex-end",
  },
  voidValue: {
    ...type.bodyBold,
    fontSize: 13,
  },
  voidId: {
    ...type.micro,
    fontSize: 10,
    marginTop: 1,
  },
});
