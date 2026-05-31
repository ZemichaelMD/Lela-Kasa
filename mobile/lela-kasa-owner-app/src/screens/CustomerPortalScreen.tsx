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
import { useFormattedDate } from "../components/FormattedDate";
import { radius, spacing, type } from "../theme";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import Constants from "expo-constants";

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });
}

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://192.168.0.186:3001";

export default function CustomerPortalScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "CustomerPortal">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const fmtDate = useFormattedDate();
  const { customerId } = route.params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    const token = route.params.accessToken;
    if (!token) {
      setError(t("noAccessToken"));
      setLoading(false);
      return;
    }
    setAccessToken(token);
    fetch(`${API_URL}/api/v1/customer-portal/${customerId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(body)}`);
        const d = body?.data ?? body;
        if (!d?.customer) throw new Error(t("notFound"));
        setData(d);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [customerId, route.params.accessToken]);

  function handleLogout() {
    navigation.reset({ index: 0, routes: [{ name: "CustomerLogin" }] });
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Skeleton width={120} height={24} />
        </View>
        <View style={styles.content}>
          <Skeleton width={180} height={32} style={{ marginBottom: 8 }} />
          <Skeleton width={100} height={16} style={{ marginBottom: 24 }} />
          <Skeleton width="100%" height={96} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={200} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
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
          <Text style={[styles.errorDesc, { color: colors.textSecondary }]}>
            {error || t("notFound")}
          </Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: colors.primary }]}
            onPress={handleLogout}
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

  const { customer, ledger } = data;

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
            <Ionicons
              name="storefront-outline"
              size={18}
              color={colors.textMuted}
            />
            <Text style={[styles.shopName, { color: colors.textPrimary }]}>
              {customer.shop?.name ?? "Shop"}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.newOrderBtn, { backgroundColor: colors.primary }]}
              onPress={() =>
                navigation.navigate("CustomerOrder", {
                  customerId,
                  accessToken: accessToken ?? "",
                })
              }
            >
              <Ionicons name="cart-outline" size={14} color="#fff" />
              <Text style={styles.newOrderBtnText}>{t("newOrder")}</Text>
            </TouchableOpacity>
            <LanguageSwitcher />
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons
                name="log-out-outline"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.content}>
          <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>
            {t("welcome")}, {customer.name}
          </Text>
          {customer.phone ? (
            <Text style={[styles.phoneText, { color: colors.textSecondary }]}>
              {customer.phone}
            </Text>
          ) : null}

          <View style={styles.cardsRow}>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                {t("creditBalance")}
              </Text>
              <Text
                style={[
                  styles.cardValue,
                  {
                    color:
                      customer.creditBalanceCents > 0
                        ? colors.danger
                        : colors.success,
                  },
                ]}
              >
                {formatCurrency(customer.creditBalanceCents)}
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                {t("boxesOwned")}
              </Text>
              <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                {customer.outstandingBoxes}
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                {t("bottlesOwned")}
              </Text>
              <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                {customer.outstandingBottles}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t("recentActivity")}
          </Text>

          {ledger.length === 0 ? (
            <Text style={[styles.noActivity, { color: colors.textMuted }]}>
              {t("noActivity")}
            </Text>
          ) : (
            <View style={styles.activityList}>
              {ledger.map((entry: any, i: number) => {
                const isPayment = entry.type === "payment";
                const iconColor = isPayment ? colors.success : colors.primary;
                const rowContent = (
                  <>
                    <View
                      style={[
                        styles.activityIcon,
                        { backgroundColor: iconColor + "1A" },
                      ]}
                    >
                      <Ionicons
                        name={isPayment ? "cash-outline" : "cart-outline"}
                        size={18}
                        color={iconColor}
                      />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text
                        style={[
                          styles.activityType,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {isPayment ? t("payment") : t("sale")}
                      </Text>
                      <Text
                        style={[
                          styles.activityDate,
                          { color: colors.textMuted },
                        ]}
                      >
                        {fmtDate(entry.date)}
                      </Text>
                      {entry.notes ? (
                        <Text
                          style={[
                            styles.activityNote,
                            { color: colors.textMuted },
                          ]}
                        >
                          {entry.notes}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.activityAmount}>
                      {!isPayment && (
                        <Text
                          style={[
                            styles.amountText,
                            {
                              color:
                                entry.status === "CONFIRMED"
                                  ? colors.danger
                                  : colors.textPrimary,
                            },
                          ]}
                        >
                          {formatCurrency(entry.subtotalCents)}
                        </Text>
                      )}
                      {isPayment && (
                        <Text
                          style={[styles.amountText, { color: colors.success }]}
                        >
                          +{formatCurrency(entry.amountCents)}
                        </Text>
                      )}
                    </View>
                  </>
                );
                if (isPayment) {
                  return (
                    <View
                      key={`${entry.type}-${entry.id ?? i}-${i}`}
                      style={[
                        styles.activityRow,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                        },
                      ]}
                    >
                      {rowContent}
                    </View>
                  );
                }
                return (
                  <TouchableOpacity
                    key={`${entry.type}-${entry.id ?? i}-${i}`}
                    style={[
                      styles.activityRow,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    onPress={() =>
                      navigation.navigate("CustomerSaleDetail", {
                        customerId,
                        saleId: entry.id,
                        accessToken: accessToken ?? "",
                      })
                    }
                    activeOpacity={0.7}
                  >
                    {rowContent}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  shopName: { ...type.bodyBold },
  newOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  newOrderBtnText: { ...type.caption, fontWeight: "600", color: "#fff" },
  logoutBtn: { padding: spacing[1] },
  scroll: { flex: 1 },
  content: { padding: spacing[5] },
  welcomeTitle: { ...type.h2, marginBottom: spacing[1] },
  phoneText: { ...type.body, marginBottom: spacing[5] },
  cardsRow: {
    flexDirection: "row",
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  card: {
    flex: 1,
    padding: spacing[3],
    borderRadius: radius.md,
  },
  cardLabel: {
    ...type.caption,
    textTransform: "uppercase",
    marginBottom: spacing[2],
  },
  cardValue: { ...type.h2 },
  sectionTitle: { ...type.bodyBold, marginBottom: spacing[3] },
  noActivity: {
    ...type.body,
    textAlign: "center",
    paddingVertical: spacing[6],
  },
  activityList: { gap: spacing[2] },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing[3],
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  activityInfo: { flex: 1 },
  activityType: { ...type.bodyBold, textTransform: "capitalize" },
  activityDate: { ...type.caption, marginTop: 2 },
  activityNote: { ...type.caption, marginTop: 2 },
  activityAmount: { alignItems: "flex-end" },
  amountText: { ...type.bodyBold, fontVariant: ["tabular-nums"] },
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
