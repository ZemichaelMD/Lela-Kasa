import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RootStackParamList } from "../navigation/types";
import { getSdk, type SubscriptionPlan } from "../lib/sdk";
import { QK } from "../lib/query-keys";
import { t } from "../lib/i18n";
import { useTheme } from "../context/ThemeContext";
import { showToast } from "../components/Toast";
import { radius, spacing, type, shadow } from "../theme";

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "successLight", text: "success" },
  TRIALING: { bg: "primaryLight", text: "primary" },
  TRIAL: { bg: "warningLight", text: "warning" },
  PAST_DUE: { bg: "dangerLight", text: "danger" },
  EXPIRED: { bg: "surfaceMuted", text: "textMuted" },
  CANCELLED: { bg: "surfaceMuted", text: "textMuted" },
  FREE: { bg: "surfaceMuted", text: "textMuted" },
  PENDING_VERIFICATION: { bg: "warningLight", text: "warning" },
};

const ACTION_STYLES: Record<string, { bg: string; text: string }> = {
  CREATED: { bg: "surfaceMuted", text: "textMuted" },
  ACTIVATED: { bg: "successLight", text: "success" },
  PAYMENT: { bg: "primaryLight", text: "primary" },
  EXTENDED: { bg: "primaryLight", text: "primary" },
  CANCELLED: { bg: "dangerLight", text: "danger" },
  SUSPENDED: { bg: "warningLight", text: "warning" },
  RESUMED: { bg: "successLight", text: "success" },
  EXPIRED: { bg: "surfaceMuted", text: "textMuted" },
};

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: sub, isLoading: loadingSub } = useQuery({
    queryKey: QK.subscription(),
    queryFn: () => getSdk().subscriptions.mySubscription(),
    staleTime: 60_000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["subscription-history"],
    queryFn: () => getSdk().subscriptions.history(),
    staleTime: 60_000,
  });

  const [extending, setExtending] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);
  const [hasPending, setHasPending] = useState(false);

  // Plan picker state
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectingPlan, setSelectingPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => getSdk().subscriptions.listPlans(),
    staleTime: 60_000,
  });

  React.useEffect(() => { if (sub?.billingCycle) setBillingCycle(sub.billingCycle as any); }, [sub]);

  const notifyMutation = useMutation({
    mutationFn: (input: {
      planId: string;
      providerId: string;
      reference?: string;
      notes?: string;
      billingCycle?: string;
    }) => getSdk().subscriptions.notifyPayment({ ...input, billingCycle: input.billingCycle || "monthly" } as any),
    onSuccess: (data) => {
      if ((data as any)?.throttled) {
        showToast(
          (data as any)?.message || "Already notified recently",
          "error",
        );
        return;
      }
      setNotified(true);
      setHasPending(true);
      queryClient.invalidateQueries({ queryKey: QK.subscription() });
      queryClient.invalidateQueries({ queryKey: ["subscription-history"] });
      showToast("Payment reported — waiting for admin verification", "success");
    },
    onError: () => showToast("Failed to notify admin", "error"),
  });

  const remindMutation = useMutation({
    mutationFn: (planId: string) =>
      getSdk().subscriptions.notifyPayment({
        planId,
        providerId: "reminder",
        reference: "Reminder",
        notes: "Reminder from owner",
      }),
    onSuccess: (data) => {
      if ((data as any)?.throttled) {
        showToast(
          (data as any)?.message || "Reminded recently, please wait",
          "error",
        );
        return;
      }
      showToast("Reminder sent", "success");
    },
    onError: () => showToast("Failed to send reminder", "error"),
  });

  React.useEffect(() => {
    const paymentEntries = history.filter((e: any) => e.action === "PAYMENT");
    const latest =
      paymentEntries.length > 0
        ? paymentEntries.reduce((a: any, b: any) =>
            new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
          )
        : null;
    setHasPending(latest?.newStatus === "PENDING_VERIFICATION");
  }, [history]);

  function handleStartExtend() {
    setExtending(true);
    setSelectedProviderId("");
    setReference("");
    setNotes("");
    setNotified(false);
    getSdk()
      .subscriptions.providers()
      .then(setProviders)
      .catch(() => showToast("Failed to load payment providers", "error"));
  }

  function handleNotify() {
    if (!selectedProviderId || !sub?.planId) return;
    notifyMutation.mutate({
      planId: selectedPlanId || sub.planId,
      providerId: selectedProviderId,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
      billingCycle,
    });
  }

  function handleRemind() {
    if (!sub?.planId) return;
    remindMutation.mutate(sub.planId);
  }

  async function handleSelectPlan(planId: string) {
    setSelectingPlan(true);
    try {
      await getSdk().subscriptions.selectPlan(planId, billingCycle);
      setSelectedPlanId(planId);
      queryClient.invalidateQueries({ queryKey: QK.subscription() });
      showToast("Plan selected! Choose a payment method below.", "success");
      handleStartExtend();
    } catch (e: any) {
      showToast(e?.message || "Failed to select plan", "error");
    } finally {
      setSelectingPlan(false);
    }
  }

  function handleCancel() {
    Alert.alert(
      t("cancelSubscription"),
      "Your plan stays active until the end of the billing period.",
      [
        { text: t("keepPlan"), style: "cancel" },
        { text: t("cancelPlan"), style: "destructive" },
      ],
    );
  }

  function trialDaysLeft() {
    if (!sub?.trialEndsAt || sub.status !== "TRIAL") return null;
    const end = new Date(sub.trialEndsAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  const td = trialDaysLeft();
  const currentPrice = billingCycle === "yearly" ? (sub?.yearlyPriceCents ?? 0) : (sub?.monthlyPriceCents ?? sub?.planPriceCents ?? 0);

  const status = sub?.status ?? "FREE";
  const statusKey = status in STATUS_STYLES ? status : "FREE";
  const sc = STATUS_STYLES[statusKey];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, spacing[4]) },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t("subscription")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Pending banner */}
        {hasPending && (
          <View
            style={[
              styles.pendingBanner,
              {
                backgroundColor: colors.warningLight,
                borderColor: colors.warning,
              },
            ]}
          >
            <View style={styles.pendingBannerContent}>
              <View
                style={[
                  styles.pendingIcon,
                  { backgroundColor: colors.warning },
                ]}
              >
                <Ionicons name="warning" size={16} color={colors.textInverse} />
              </View>
              <View style={styles.pendingText}>
                <Text style={[styles.pendingTitle, { color: colors.warning }]}>
                  {t("pendingVerification")}
                </Text>
                <Text
                  style={[styles.pendingDesc, { color: colors.textSecondary }]}
                >
                  Payment waiting for admin confirmation
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.remindButton, { backgroundColor: colors.warning }]}
              onPress={handleRemind}
              disabled={remindMutation.isPending}
            >
              <Text
                style={[styles.remindButtonText, { color: colors.textInverse }]}
              >
                {remindMutation.isPending ? "..." : "Remind"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Current plan card */}
        <View style={[styles.currentCard, { backgroundColor: colors.primary }]}>
          <View style={styles.currentTop}>
            <View>
              <Text style={[styles.planName, { color: colors.textInverse }]}>
                {sub?.planName ??
                  (sub?.hasSubscription ? t("currentPlan") : t("noActivePlan"))}
              </Text>
              {sub?.paidUntil && (
                <Text
                  style={[
                    styles.renewalText,
                    { color: "rgba(255,255,255,0.75)" },
                  ]}
                >
                  {t("paidUntil")}: {fmt(sub.paidUntil)}
                </Text>
              )}
              {sub?.planPriceCents && sub.planPriceCents > 0 && (
                <Text
                  style={[
                    styles.renewalText,
                    { color: "rgba(255,255,255,0.75)" },
                  ]}
                >
                  {formatCurrency(sub.planPriceCents)}/mo
                </Text>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: colors[sc.bg as keyof typeof colors] },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: colors[sc.text as keyof typeof colors] },
                ]}
              >
                {status}
              </Text>
            </View>
          </View>

          {sub?.hasSubscription && !hasPending && (
            <TouchableOpacity style={styles.cancelLink} onPress={handleCancel}>
              <Text
                style={[
                  styles.cancelLinkText,
                  { color: "rgba(255,255,255,0.7)" },
                ]}
              >
                {t("cancelSubscription")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Extend flow */}
        {extending && (
          <View
            style={[
              styles.extendCard,
              { backgroundColor: colors.surface },
              shadow.sm,
            ]}
          >
            {notified ? (
              <View style={styles.notifiedContent}>
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color={colors.success}
                />
                <Text
                  style={[styles.notifiedTitle, { color: colors.textPrimary }]}
                >
                  Extension Request Sent!
                </Text>
                <Text
                  style={[styles.notifiedDesc, { color: colors.textSecondary }]}
                >
                  Your payment details have been sent to the admin. Subscription
                  will be extended once confirmed.
                </Text>
                <TouchableOpacity onPress={() => setExtending(false)}>
                  <Text style={[styles.closeText, { color: colors.primary }]}>
                    {t("close")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.extendHeader}>
                  <Text
                    style={[styles.extendTitle, { color: colors.textPrimary }]}
                  >
                    {t("extendSubscription")}
                  </Text>
                  <TouchableOpacity onPress={() => setExtending(false)}>
                    <Text
                      style={[styles.cancelText, { color: colors.textMuted }]}
                    >
                      {t("cancel")}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.extendSummary,
                    { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <View style={styles.summaryRow}>
                    <Text
                      style={[styles.summaryLabel, { color: colors.textMuted }]}
                    >
                      {t("plan")}
                    </Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {sub?.planName}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text
                      style={[styles.summaryLabel, { color: colors.textMuted }]}
                    >
                      {t("amount")}
                    </Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {sub?.planPriceCents
                        ? formatCurrency(sub.planPriceCents)
                        : "—"}
                    </Text>
                  </View>
                  {sub?.paidUntil && (
                    <View style={styles.summaryRow}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        {t("paidUntil")}
                      </Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {fmt(sub.paidUntil)}
                      </Text>
                    </View>
                  )}
                </View>

                {providers.length === 0 ? (
                  <Text
                    style={[styles.loadingText, { color: colors.textMuted }]}
                  >
                    {t("loading")}
                  </Text>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.providerLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("selectPaymentMethod")}
                    </Text>
                    {providers.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.providerCard,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor:
                              selectedProviderId === p.id
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                        onPress={() => setSelectedProviderId(p.id)}
                      >
                        <View
                          style={[
                            styles.providerIcon,
                            {
                              backgroundColor:
                                selectedProviderId === p.id
                                  ? colors.primary
                                  : colors.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name="card-outline"
                            size={20}
                            color={
                              selectedProviderId === p.id
                                ? colors.textInverse
                                : colors.textMuted
                            }
                          />
                        </View>
                        <View style={styles.providerInfo}>
                          <Text
                            style={[
                              styles.providerName,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {p.name}
                          </Text>
                          <Text
                            style={[
                              styles.providerKind,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {p.kind}
                          </Text>
                          {p.instructions && (
                            <Text
                              style={[
                                styles.providerInstructions,
                                { color: colors.textMuted },
                              ]}
                            >
                              {p.instructions}
                            </Text>
                          )}
                          {p.contactInfo && (
                            <Text
                              style={[
                                styles.providerContact,
                                { color: colors.textSecondary },
                              ]}
                            >
                              Contact: {p.contactInfo}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {selectedProviderId && (
                  <View style={styles.referenceSection}>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("transactionReference")}
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
                      value={reference}
                      onChangeText={setReference}
                      placeholder="e.g. Bank receipt #12345"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: colors.textSecondary, marginTop: spacing[3] },
                      ]}
                    >
                      {t("notes")}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        styles.textArea,
                        {
                          backgroundColor: colors.surface,
                          color: colors.textPrimary,
                          borderColor: colors.border,
                        },
                      ]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder={t("notes")}
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={2}
                    />
                    <TouchableOpacity
                      style={[
                        styles.notifyButton,
                        {
                          backgroundColor: colors.primary,
                          opacity: notifying ? 0.6 : 1,
                        },
                      ]}
                      onPress={handleNotify}
                      disabled={notifying}
                    >
                      <Text
                        style={[
                          styles.notifyButtonText,
                          { color: colors.textInverse },
                        ]}
                      >
                        {notifying ? t("submitting") : t("markAsPaid")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Trial banner */}
        {td !== null && td > 0 && (
          <View
            style={[
              styles.trialBanner,
              {
                backgroundColor: td <= 3 ? colors.dangerLight : colors.warningLight,
                borderColor: td <= 3 ? colors.danger : colors.warning,
              },
            ]}
          >
            <Ionicons name="sparkles" size={20} color={td <= 3 ? colors.danger : colors.warning} />
            <Text style={[styles.trialText, { color: td <= 3 ? colors.danger : colors.warning }]}>
              Trial ends in {td} day{td !== 1 ? "s" : ""}. Upgrade to keep access.
            </Text>
          </View>
        )}

        {/* Plan Picker */}
        {plans.length > 0 && (
          <View style={styles.planPickerSection}>
            <View style={styles.billingToggle}>
              <TouchableOpacity
                style={[styles.toggleOption, billingCycle === "monthly" && { backgroundColor: colors.primary }]}
                onPress={() => setBillingCycle("monthly")}
              >
                <Text style={[styles.toggleOptionText, { color: billingCycle === "monthly" ? colors.textInverse : colors.textSecondary }]}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOption, billingCycle === "yearly" && { backgroundColor: colors.primary }]}
                onPress={() => setBillingCycle("yearly")}
              >
                <Text style={[styles.toggleOptionText, { color: billingCycle === "yearly" ? colors.textInverse : colors.textSecondary }]}>Yearly</Text>
              </TouchableOpacity>
            </View>
            {billingCycle === "yearly" && (
              <Text style={[styles.saveBadge, { color: colors.success }]}>Save ~17%</Text>
            )}

            {plans.map((plan: SubscriptionPlan) => {
              const price = billingCycle === "yearly" ? plan.yearlyPriceCents : plan.monthlyPriceCents;
              const isCurrent = sub?.planId === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isCurrent ? colors.primary : colors.border,
                    },
                    isCurrent && { borderWidth: 2, backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => !isCurrent && handleSelectPlan(plan.id)}
                  disabled={selectingPlan || isCurrent}
                >
                  <View style={styles.planCardTop}>
                    <Text style={[styles.planCardName, { color: colors.textPrimary }]}>{plan.name}</Text>
                    {isCurrent && (
                      <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.currentBadgeText, { color: colors.textInverse }]}>Current</Text>
                      </View>
                    )}
                  </View>
                  {plan.description && (
                    <Text style={[styles.planCardDesc, { color: colors.textSecondary }]}>{plan.description}</Text>
                  )}
                  <View style={styles.planPrice}>
                    <Text style={[styles.planPriceAmount, { color: colors.textPrimary }]}>
                      {formatCurrency(billingCycle === "yearly" ? Math.round(plan.yearlyPriceCents / 12) : plan.monthlyPriceCents)}
                    </Text>
                    <Text style={[styles.planPriceUnit, { color: colors.textMuted }]}>/mo</Text>
                  </View>
                  {billingCycle === "yearly" && (
                    <Text style={[styles.yearlyTotal, { color: colors.textMuted }]}>
                      {formatCurrency(plan.yearlyPriceCents)} billed yearly
                    </Text>
                  )}
                  {plan.features?.length > 0 && (
                    <View style={styles.featureList}>
                      {plan.features.map((f: string, i: number) => (
                        <View key={i} style={styles.featureItem}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                          <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Action buttons */}
        {!extending && (
          <>
            {sub?.hasSubscription && !hasPending && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleStartExtend}
              >
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={colors.textInverse}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: colors.textInverse },
                  ]}
                >
                  {t("extendSubscription")}
                </Text>
              </TouchableOpacity>
            )}
            {(!sub?.hasSubscription ||
              sub?.status === "TRIAL" ||
              sub?.status === "PAST_DUE") &&
              !hasPending && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleStartExtend}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: colors.textInverse },
                    ]}
                  >
                    {t("viewPlans")}
                  </Text>
                </TouchableOpacity>
              )}
          </>
        )}

        {/* Billing history */}
        <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
          {t("billingHistory")}
        </Text>
        {history.length === 0 ? (
          <Text style={[styles.emptyHistory, { color: colors.textMuted }]}>
            {t("noHistory")}
          </Text>
        ) : (
          history.map((h: any) => {
            const as = ACTION_STYLES[h.action] ?? {
              bg: "surfaceMuted",
              text: "textMuted",
            };
            return (
              <View
                key={h.id}
                style={[
                  styles.historyItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderLeftColor:
                      h.newStatus === "PENDING_VERIFICATION"
                        ? colors.warning
                        : "transparent",
                  },
                  h.newStatus === "PENDING_VERIFICATION" && {
                    borderLeftWidth: 3,
                  },
                ]}
              >
                <View
                  style={[
                    styles.actionBadge,
                    { backgroundColor: colors[as.bg as keyof typeof colors] },
                  ]}
                >
                  <Text
                    style={[
                      styles.actionBadgeText,
                      { color: colors[as.text as keyof typeof colors] },
                    ]}
                  >
                    {h.action}
                  </Text>
                </View>
                <View style={styles.historyInfo}>
                  <Text
                    style={[styles.historyPlan, { color: colors.textPrimary }]}
                  >
                    {h.plan?.name}
                  </Text>
                  {h.amountCents != null && (
                    <Text
                      style={[
                        styles.historyAmount,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatCurrency(h.amountCents)}
                    </Text>
                  )}
                  {h.notes && (
                    <Text
                      style={[styles.historyNotes, { color: colors.textMuted }]}
                    >
                      {h.notes}
                    </Text>
                  )}
                  {h.newStatus === "PENDING_VERIFICATION" && (
                    <Text
                      style={[styles.pendingStatus, { color: colors.warning }]}
                    >
                      Pending verification
                    </Text>
                  )}
                </View>
                <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                  {fmt(h.createdAt)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  headerTitle: { ...type.h3 },
  content: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[8] },
  pendingBanner: {
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
  },
  pendingBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  pendingIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingText: { flex: 1 },
  pendingTitle: { ...type.bodyBold },
  pendingDesc: { ...type.caption, marginTop: 2 },
  remindButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
  },
  remindButtonText: { ...type.micro },
  currentCard: {
    borderRadius: radius.xl,
    padding: spacing[5],
    gap: spacing[3],
  },
  currentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planName: { ...type.h2 },
  renewalText: { ...type.caption, marginTop: 4 },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusText: { ...type.micro },
  cancelLink: { alignSelf: "flex-start" },
  cancelLinkText: { ...type.caption, textDecorationLine: "underline" },
  extendCard: { borderRadius: radius.lg, padding: spacing[4], gap: spacing[3] },
  extendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  extendTitle: { ...type.bodyBold },
  cancelText: { ...type.caption },
  extendSummary: {
    borderRadius: radius.sm,
    padding: spacing[3],
    gap: spacing[2],
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { ...type.caption },
  summaryValue: { ...type.bodyBold },
  loadingText: {
    ...type.body,
    textAlign: "center",
    paddingVertical: spacing[4],
  },
  providerLabel: { ...type.caption, marginBottom: spacing[2] },
  providerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 2,
  },
  providerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  providerInfo: { flex: 1 },
  providerName: { ...type.bodyBold },
  providerKind: { ...type.caption, marginTop: 2 },
  providerInstructions: {
    ...type.micro,
    marginTop: spacing[2],
    lineHeight: 16,
  },
  providerContact: { ...type.caption, marginTop: spacing[1] },
  referenceSection: {
    borderTopWidth: 1,
    borderTopColor: "transparent",
    paddingTop: spacing[3],
    marginTop: spacing[2],
  },
  fieldLabel: { ...type.caption, marginBottom: spacing[2] },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...type.body,
  },
  textArea: { minHeight: 60, textAlignVertical: "top" },
  notifyButton: {
    borderRadius: radius.sm,
    paddingVertical: spacing[3],
    alignItems: "center",
    marginTop: spacing[3],
  },
  notifyButtonText: { ...type.bodyBold },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    borderRadius: radius.md,
    paddingVertical: spacing[4],
  },
  actionButtonText: { ...type.bodyBold },
  historyTitle: { ...type.h4, marginTop: spacing[2] },
  emptyHistory: {
    ...type.body,
    textAlign: "center",
    paddingVertical: spacing[6],
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
    borderRadius: radius.sm,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
    borderWidth: 1,
  },
  actionBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.xs,
  },
  actionBadgeText: { ...type.micro },
  historyInfo: { flex: 1 },
  historyPlan: { ...type.bodyBold },
  historyAmount: { ...type.caption, marginTop: 2 },
  historyNotes: { ...type.micro, marginTop: 2 },
  pendingStatus: { ...type.micro, marginTop: 2, fontWeight: "600" },
  historyDate: { ...type.micro, textAlign: "right" },
  notifiedContent: {
    alignItems: "center",
    paddingVertical: spacing[6],
    gap: spacing[3],
  },
  notifiedTitle: { ...type.h4 },
  notifiedDesc: { ...type.body, textAlign: "center" },
  closeText: { ...type.bodyBold },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
  },
  trialText: { ...type.caption, flex: 1 },
  planPickerSection: { gap: spacing[2] },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: radius.md,
    padding: 3,
    alignSelf: 'center',
  },
  toggleOption: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1] + 2,
    borderRadius: radius.sm,
  },
  toggleOptionText: { ...type.caption },
  saveBadge: { ...type.micro, textAlign: 'center', marginTop: -spacing[1], marginBottom: spacing[2] },
  planCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing[4],
    gap: spacing[2],
  },
  planCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planCardName: { ...type.h4 },
  currentBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  currentBadgeText: { ...type.micro },
  planCardDesc: { ...type.caption },
  planPrice: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  planPriceAmount: { ...type.h2 },
  planPriceUnit: { ...type.caption },
  yearlyTotal: { ...type.micro },
  featureList: { gap: spacing[1], marginTop: spacing[1] },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  featureText: { ...type.micro },
});
