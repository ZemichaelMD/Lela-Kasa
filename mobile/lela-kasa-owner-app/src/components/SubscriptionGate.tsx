import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { getSdk, SupportInfo } from "../lib/sdk";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  getLanguage,
  setLanguage,
  subscribeLanguage,
  Language,
} from "../lib/i18n";
import { t } from "../lib/i18n";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing, type } from "../theme";
import { useOffline } from "../offline/context";
import { SyncStatusBar } from "./SyncStatusBar";
import {
  saveSubscriptionCache,
  loadSubscriptionCache,
} from "../lib/subscription-cache";

type GateState = "loading" | "ok" | "blocked";

export default function SubscriptionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [state, setState] = useState<GateState>("loading");
  const [planName, setPlanName] = useState<string>("");
  const [support, setSupport] = useState<SupportInfo | null>(null);
  const [lang, setLang] = useState<Language>(getLanguage);
  const { isOnline } = useOffline();
  const checkedRef = useRef(false);

  useEffect(() => subscribeLanguage(setLang), []);

  useEffect(() => {
    getSdk()
      .auth.config()
      .then((cfg) => {
        if (cfg?.support) setSupport(cfg.support);
      })
      .catch(() => {});
  }, []);

  const check = useCallback(async () => {
    try {
      const sub = await getSdk().subscriptions.mySubscription();
      if (sub) {
        void saveSubscriptionCache(sub);
      }
      const active =
        sub?.hasSubscription &&
        (sub.status === "ACTIVE" || sub.status === "TRIAL");
      setPlanName(sub?.planName ?? "");
      setState(active ? "ok" : "blocked");
    } catch {
      if (!isOnline) {
        const cached = await loadSubscriptionCache();
        if (
          cached?.hasSubscription &&
          (cached.status === "ACTIVE" || cached.status === "TRIAL")
        ) {
          setPlanName(cached.planName ?? "");
          setState("ok");
          return;
        }
      }
      setState("blocked");
    }
  }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const sub = await getSdk()
          .subscriptions.mySubscription()
          .catch(() => null);
        if (cancelled) return;
        if (sub) {
          void saveSubscriptionCache(sub);
        }
        const active =
          sub?.hasSubscription &&
          (sub.status === "ACTIVE" || sub.status === "TRIAL");
        if (active) {
          setPlanName(sub?.planName ?? "");
          setState("ok");
          return;
        }
        if (!isOnline) {
          const cached = await loadSubscriptionCache();
          if (
            cached?.hasSubscription &&
            (cached.status === "ACTIVE" || cached.status === "TRIAL")
          ) {
            setPlanName(cached.planName ?? "");
            setState("ok");
            return;
          }
        }
        setPlanName(sub?.planName ?? "");
        setState("blocked");
      })();
      return () => {
        cancelled = true;
      };
    }, [isOnline]),
  );

  if (state === "ok")
    return (
      <>
        <SyncStatusBar />
        {children}
      </>
    );

  if (state === "loading") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.langBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.langButton, { borderColor: colors.border }]}
          onPress={() => setLanguage(lang === "en" ? "am" : "en")}
        >
          <Ionicons
            name="language-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text
            style={[styles.langButtonText, { color: colors.textSecondary }]}
          >
            {lang === "en" ? "አማ" : "EN"}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}
        >
          <Ionicons name="lock-closed" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t("subscriptionRequired")}
        </Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>
          {t("subscriptionRequiredDesc")}
        </Text>
        {planName ? (
          <Text style={[styles.plan, { color: colors.textMuted }]}>
            {t("currentPlan")}: {planName}
          </Text>
        ) : null}

        {support && (
          <View
            style={[
              styles.contactCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>
              Contact Admin
            </Text>
            {support.phone ? (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL(`tel:${support.phone}`)}
              >
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.contactText, { color: colors.primary }]}>
                  {support.phone}
                </Text>
              </TouchableOpacity>
            ) : null}
            {support.email ? (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL(`mailto:${support.email}`)}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.contactText, { color: colors.primary }]}>
                  {support.email}
                </Text>
              </TouchableOpacity>
            ) : null}
            {support.telegram ? (
              <View style={styles.contactRow}>
                <Ionicons
                  name="paper-plane-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={[styles.contactText, { color: colors.textMuted }]}>
                  Telegram: {support.telegram}
                </Text>
              </View>
            ) : null}
            {support.whatsapp ? (
              <View style={styles.contactRow}>
                <Ionicons
                  name="logo-whatsapp"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={[styles.contactText, { color: colors.textMuted }]}>
                  WhatsApp: {support.whatsapp}
                </Text>
              </View>
            ) : null}
            {support.hours ? (
              <View style={styles.contactRow}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.contactSmall, { color: colors.textMuted }]}
                >
                  {support.hours}
                </Text>
              </View>
            ) : null}
            {support.message ? (
              <Text
                style={[
                  styles.contactSmall,
                  {
                    color: colors.textMuted,
                    marginTop: spacing[2],
                    fontStyle: "italic",
                  },
                ]}
              >
                {support.message}
              </Text>
            ) : null}
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("Subscription")}
        >
          <Ionicons name="card-outline" size={18} color={colors.textInverse} />
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>
            {t("viewPlansAndPay")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonOutline, { borderColor: colors.border }]}
          onPress={() => {
            setState("loading");
            void check();
          }}
        >
          <Ionicons name="refresh" size={18} color={colors.textPrimary} />
          <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
            {t("refresh")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOut} onPress={() => void logout()}>
          <Text style={[styles.signOutText, { color: colors.danger }]}>
            {t("signOut")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  langBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
  },
  langButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  langButtonText: { ...type.caption, fontWeight: "600" },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[6],
  },
  title: { ...type.h2, textAlign: "center", marginBottom: spacing[2] },
  desc: { ...type.body, textAlign: "center", marginBottom: spacing[4] },
  plan: { ...type.caption, marginBottom: spacing[4] },
  contactCard: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[5],
  },
  contactTitle: { ...type.bodyBold, marginBottom: spacing[3] },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: 6,
  },
  contactText: { ...type.caption },
  contactSmall: { ...type.caption, fontSize: 11 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    alignSelf: "stretch",
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    marginTop: spacing[2],
  },
  buttonOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    marginTop: spacing[3],
  },
  buttonText: { ...type.bodyBold },
  signOut: { marginTop: spacing[8], padding: spacing[2] },
  signOutText: { ...type.bodyBold },
});
