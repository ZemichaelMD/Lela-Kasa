import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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

import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { useOffline } from "../providers/OfflineProvider";
import { getSdk } from "../lib/sdk";
import { t } from "../lib/i18n";
import { showToast } from "../components/Toast";
import { radius, spacing, type, layout } from "../theme";

const WEB_APP_URL =
  process.env.EXPO_PUBLIC_WEB_APP_URL || "https://lelakasa.halepo.com";

export default function SettingsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();
  const { language, setLanguage: setLang } = useLanguage();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { isOnline, isSyncing, resetOfflineData } = useOffline();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isResettingOffline, setIsResettingOffline] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showEditShop, setShowEditShop] = useState(false);
  const [shopName, setShopName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [shopEmail, setShopEmail] = useState("");
  const [shopWebsite, setShopWebsite] = useState("");
  const [shopFacebook, setShopFacebook] = useState("");
  const [shopInstagram, setShopInstagram] = useState("");
  const [shopTiktok, setShopTiktok] = useState("");
  const [shopMapUrl, setShopMapUrl] = useState("");
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [phoneStep, setPhoneStep] = useState<"phone" | "code">("phone");
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [chatBubbleVisible, setChatBubbleVisible] = useState(true);
  const [togglingChat, setTogglingChat] = useState(false);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const changePasswordMutation = useMutation({
    mutationFn: (dto: { currentPassword: string; newPassword: string }) =>
      getSdk().auth.changePassword(dto),
    onSuccess: () => {
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      showToast(t("passwordChanged"), "success");
    },
    onError: (err: any) => {
      showToast(err?.message ?? t("failedToRecord"), "error");
    },
  });

  const { data: shopData } = useQuery({
    queryKey: ["shop"],
    queryFn: () => getSdk().shops.getMyShop(),
    enabled: !!user?.shopId,
  });

  const updateShopMutation = useMutation({
    mutationFn: (
      dto: Parameters<ReturnType<typeof getSdk>["shops"]["updateMyShop"]>[0],
    ) => getSdk().shops.updateMyShop(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop"] });
      setShowEditShop(false);
      showToast(t("shopUpdated"), "success");
    },
    onError: (err: any) =>
      showToast(err?.message ?? t("failedToUpdate"), "error"),
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => getSdk().auth.me(),
  });
  const verifications = me?.verifications;

  const requestPhoneChangeMutation = useMutation({
    mutationFn: (phone: string) => getSdk().auth.requestPhoneChange(phone),
    onSuccess: () => {
      setPhoneStep("code");
      showToast(t("otpSentToNewPhone"), "success");
    },
    onError: (err: any) =>
      showToast(err?.message ?? t("otpSendFailed"), "error"),
  });

  const confirmPhoneChangeMutation = useMutation({
    mutationFn: (dto: { phone: string; code: string }) =>
      getSdk().auth.confirmPhoneChange(dto.phone, dto.code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setShowChangePhone(false);
      setPhoneStep("phone");
      setNewPhone("");
      setPhoneCode("");
      showToast(t("phoneChanged"), "success");
    },
    onError: (err: any) =>
      showToast(err?.message ?? t("verificationFailed"), "error"),
  });

  const { data: appConfig } = useQuery({
    queryKey: ["app-config"],
    queryFn: () => getSdk().auth.config(),
  });
  const support = appConfig?.support;

  // Chat bubble visibility
  const { data: chatVis } = useQuery({
    queryKey: ["chat-bubble-visible"],
    queryFn: async () => {
      const v = await getSdk().shops.getSetting("chat_bubble_visible");
      return v !== "false";
    },
    enabled: !!user?.shopId,
    initialData: true,
  });

  useEffect(() => {
    if (chatVis !== undefined) setChatBubbleVisible(chatVis);
  }, [chatVis]);

  const toggleChatBubble = async () => {
    setTogglingChat(true);
    const next = !chatBubbleVisible;
    try {
      await getSdk().shops.setSetting(
        "chat_bubble_visible",
        next ? "true" : "false",
      );
      setChatBubbleVisible(next);
      queryClient.invalidateQueries({ queryKey: ["chat-bubble-visible"] });
    } catch (e: any) {
      showToast(e?.message ?? "Failed", "error");
    } finally {
      setTogglingChat(false);
    }
  };

  const hasSupport =
    !!support &&
    !!(
      support.phone ||
      support.email ||
      support.telegram ||
      support.whatsapp ||
      support.hours ||
      support.url ||
      support.message
    );

  const handleConnectTelegram = async () => {
    try {
      const info = await getSdk().telegram.getLinkInfo();
      if (!info.configured || !info.deepLink) {
        showToast(t("telegramNotConfiguredYet"), "error");
        return;
      }
      await Linking.openURL(info.deepLink);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : t("telegramLinkFailed"),
        "error",
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert(t("signOut"), t("signOutConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("signOut"),
        style: "destructive",
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await logout();
          } catch {
            showToast(t("failedToRecord"), "error");
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  const handleResetOfflineData = () => {
    if (isSyncing || isResettingOffline) {
      showToast(t("syncInProgress"), "info");
      return;
    }

    Alert.alert(t("clearOfflineDataTitle"), t("clearOfflineDataConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("clearOfflineDataAction"),
        style: "destructive",
        onPress: async () => {
          setIsResettingOffline(true);
          try {
            await resetOfflineData();
            showToast(
              isOnline ? t("offlineResyncing") : t("offlineResyncQueued"),
              "success",
            );
          } catch (e) {
            showToast(t("offlineResetFailed"), "error");
          } finally {
            setIsResettingOffline(false);
          }
        },
      },
    ]);
  };

  const toggleLanguage = async () => {
    const next: "en" | "am" = language === "en" ? "am" : "en";
    await setLang(next);
  };

  const cycleTheme = () => {
    const next =
      themeMode === "light"
        ? "dark"
        : themeMode === "dark"
          ? "system"
          : "light";
    setThemeMode(next);
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast(t("selectCustomerError"), "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t("passwordsDoNotMatch"), "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast(t("passwordTooShort"), "error");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleOpenWebApp = () => {
    Linking.openURL(WEB_APP_URL);
  };

  const handleOpenEditShop = () => {
    setShopName(shopData?.name ?? user?.shop?.name ?? "");
    setShopPhone(shopData?.phone ?? "");
    setShopAddress(shopData?.address ?? "");
    setShopDescription(shopData?.description ?? "");
    setShopEmail(shopData?.email ?? "");
    setShopWebsite(shopData?.website ?? "");
    setShopFacebook(shopData?.facebook ?? "");
    setShopInstagram(shopData?.instagram ?? "");
    setShopTiktok(shopData?.tiktok ?? "");
    setShopMapUrl(shopData?.mapUrl ?? "");
    setShowEditShop(true);
  };

  const handleSaveShop = () => {
    if (!shopName.trim()) {
      showToast(t("enterShopName"), "error");
      return;
    }
    updateShopMutation.mutate({
      name: shopName.trim(),
      phone: shopPhone.trim(),
      address: shopAddress.trim(),
      description: shopDescription.trim(),
      email: shopEmail.trim(),
      website: shopWebsite.trim(),
      facebook: shopFacebook.trim(),
      instagram: shopInstagram.trim(),
      tiktok: shopTiktok.trim(),
      mapUrl: shopMapUrl.trim(),
    });
  };

  const themeLabel =
    themeMode === "light"
      ? t("light")
      : themeMode === "dark"
        ? t("dark")
        : t("system");

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t("settings")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.profileCard, { backgroundColor: colors.surface }]}
            onPress={handleOpenEditShop}
            activeOpacity={0.7}
          >
            <View
              style={[styles.avatar, { backgroundColor: colors.primaryLight }]}
            >
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.textPrimary }]}>
                {user?.name}
              </Text>
              <Text
                style={[styles.profileEmail, { color: colors.textSecondary }]}
              >
                {user?.email}
              </Text>
            </View>
            <Ionicons
              name="pencil-outline"
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          <Text style={[styles.profileHint, { color: colors.textMuted }]}>
            {t("tapToEditProfile")}
          </Text>
        </View>

        {user?.shop && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              {t("shop")}
            </Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <TouchableOpacity style={styles.row} onPress={handleOpenEditShop}>
                <Ionicons
                  name="storefront-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                  {t("shopName")}
                </Text>
                <Text
                  style={[styles.rowValue, { color: colors.textSecondary }]}
                >
                  {shopData?.name ?? user.shop.name}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {(shopData?.phone || shopData?.address) && (
                <>
                  <View
                    style={[
                      styles.rowDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.row}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("phoneNumber")}
                    </Text>
                    <Text
                      style={[styles.rowValue, { color: colors.textSecondary }]}
                    >
                      {shopData?.phone ?? "—"}
                    </Text>
                  </View>
                  {shopData?.address && (
                    <>
                      <View
                        style={[
                          styles.rowDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <View style={styles.row}>
                        <Ionicons
                          name="location-outline"
                          size={20}
                          color={colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.rowLabel,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {t("address")}
                        </Text>
                        <Text
                          style={[
                            styles.rowValue,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {shopData.address}
                        </Text>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t("preferences")}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.row} onPress={toggleLanguage}>
              <Ionicons
                name="language-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {t("language")}
              </Text>
              <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                {language === "en" ? t("english") : t("amharic")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            <View
              style={[styles.rowDivider, { backgroundColor: colors.border }]}
            />
            <TouchableOpacity style={styles.row} onPress={cycleTheme}>
              <Ionicons
                name={
                  themeMode === "dark"
                    ? "moon"
                    : themeMode === "light"
                      ? "sunny"
                      : "desktop-outline"
                }
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {t("appearance")}
              </Text>
              <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                {themeLabel}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            <View
              style={[styles.rowDivider, { backgroundColor: colors.border }]}
            />
            <TouchableOpacity
              style={styles.row}
              onPress={toggleChatBubble}
              disabled={togglingChat}
            >
              <Ionicons
                name="chatbubbles-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {t("chatBubble")}
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  {
                    color: chatBubbleVisible
                      ? colors.success
                      : colors.textMuted,
                  },
                ]}
              >
                {chatBubbleVisible
                  ? t("chatBubbleVisible")
                  : t("chatBubbleHidden")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t("account")}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowChangePassword(true)}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {t("changePassword")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            <View
              style={[styles.rowDivider, { backgroundColor: colors.border }]}
            />
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("Subscription")}
            >
              <Ionicons
                name="card-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {t("subscription")}
              </Text>
              <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                {t("planActive")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            <View
              style={[styles.rowDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.row}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {t("emailLabel")}
              </Text>
              {verifications?.email.verified ? (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: colors.successLight },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={13}
                    color={colors.success}
                  />
                  <Text style={[styles.badgeText, { color: colors.success }]}>
                    {t("verified")}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: colors.warningLight },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: colors.warning }]}>
                    {t("notVerified")}
                  </Text>
                </View>
              )}
            </View>
            {!!me?.phone && (
              <>
                <View
                  style={[
                    styles.rowDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
                <TouchableOpacity
                  style={styles.row}
                  disabled={verifications?.phone.verified}
                  onPress={() =>
                    navigation.navigate("VerifyPhone", {
                      phone: me.phone as string,
                    })
                  }
                >
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.rowLabel, { color: colors.textPrimary }]}
                  >
                    {me.phone}
                  </Text>
                  {verifications?.phone.verified ? (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: colors.successLight },
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={13}
                        color={colors.success}
                      />
                      <Text
                        style={[styles.badgeText, { color: colors.success }]}
                      >
                        {t("verified")}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: colors.warningLight },
                        ]}
                      >
                        <Text
                          style={[styles.badgeText, { color: colors.warning }]}
                        >
                          {t("verifyNow")}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.textMuted}
                      />
                    </>
                  )}
                </TouchableOpacity>
                <View
                  style={[
                    styles.rowDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => {
                    setPhoneStep("phone");
                    setNewPhone("");
                    setPhoneCode("");
                    setShowChangePhone(true);
                  }}
                >
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.rowLabel, { color: colors.textPrimary }]}
                  >
                    {t("changePhone")}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t("integrations")}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.row}
              onPress={handleConnectTelegram}
            >
              <Ionicons
                name="paper-plane-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {t("connectTelegram")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t("catalog")}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("BeveragesManagement")}
            >
              <Ionicons
                name="wine-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {t("beverages")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            <View
              style={[styles.rowDivider, { backgroundColor: colors.border }]}
            />
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("PriceTiersManagement")}
            >
              <Ionicons
                name="pricetag-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {t("priceTiersTitle")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t("finance")}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("PaymentAccountsManagement")}
            >
              <Ionicons
                name="wallet-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {t("paymentAccountsTitle")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t("team")}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("EmployeesManagement")}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                {t("employees")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t("webApp")}
          </Text>
          <TouchableOpacity
            style={[styles.webAppCard, { backgroundColor: colors.surface }]}
            onPress={handleOpenWebApp}
          >
            <View
              style={[
                styles.webAppIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="globe-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.webAppInfo}>
              <Text style={[styles.webAppTitle, { color: colors.textPrimary }]}>
                {t("webApp")}
              </Text>
              <Text
                style={[styles.webAppDesc, { color: colors.textSecondary }]}
              >
                {t("webAppDesc")}
              </Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {hasSupport && support && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              {t("support")}
            </Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {!!support.message && (
                <View style={styles.row}>
                  <Ionicons
                    name="help-buoy-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.rowLabel, { color: colors.textSecondary }]}
                  >
                    {support.message}
                  </Text>
                </View>
              )}
              {!!support.phone && (
                <>
                  {!!support.message && (
                    <View
                      style={[
                        styles.rowDivider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  )}
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => Linking.openURL(`tel:${support.phone}`)}
                  >
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("supportPhone")}
                    </Text>
                    <Text
                      style={[styles.rowValue, { color: colors.textSecondary }]}
                    >
                      {support.phone}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              {!!support.email && (
                <>
                  <View
                    style={[
                      styles.rowDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => Linking.openURL(`mailto:${support.email}`)}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("supportEmail")}
                    </Text>
                    <Text
                      style={[styles.rowValue, { color: colors.textSecondary }]}
                    >
                      {support.email}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              {!!support.telegram && (
                <>
                  <View
                    style={[
                      styles.rowDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.row}>
                    <Ionicons
                      name="paper-plane-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("supportTelegram")}
                    </Text>
                    <Text
                      style={[styles.rowValue, { color: colors.textSecondary }]}
                    >
                      {support.telegram}
                    </Text>
                  </View>
                </>
              )}
              {!!support.whatsapp && (
                <>
                  <View
                    style={[
                      styles.rowDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.row}>
                    <Ionicons
                      name="logo-whatsapp"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("supportWhatsApp")}
                    </Text>
                    <Text
                      style={[styles.rowValue, { color: colors.textSecondary }]}
                    >
                      {support.whatsapp}
                    </Text>
                  </View>
                </>
              )}
              {!!support.hours && (
                <>
                  <View
                    style={[
                      styles.rowDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.row}>
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("supportHours")}
                    </Text>
                    <Text
                      style={[styles.rowValue, { color: colors.textSecondary }]}
                    >
                      {support.hours}
                    </Text>
                  </View>
                </>
              )}
              {!!support.url && (
                <>
                  <View
                    style={[
                      styles.rowDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => Linking.openURL(support.url)}
                  >
                    <Ionicons
                      name="open-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[styles.rowLabel, { color: colors.textPrimary }]}
                    >
                      {t("openSupportPage")}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t("offlineData")}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.row}
              onPress={handleResetOfflineData}
              disabled={isResettingOffline}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.rowLabel, { color: colors.danger }]}>
                {isResettingOffline
                  ? t("clearingOfflineData")
                  : t("clearOfflineData")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.signOutButton,
              { backgroundColor: colors.dangerLight },
            ]}
            onPress={handleSignOut}
            disabled={isSigningOut}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.signOutText, { color: colors.danger }]}>
              {isSigningOut ? `${t("signOut")}...` : t("signOut")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangePassword(false)}
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
                {t("changePassword")}
              </Text>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                {t("currentPassword")}
              </Text>
              <View
                style={[
                  styles.passwordInputContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.passwordInput, { color: colors.textPrimary }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder={t("enterCurrentPassword")}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={
                      showCurrentPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: spacing[4] },
                ]}
              >
                {t("newPassword")}
              </Text>
              <View
                style={[
                  styles.passwordInputContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.passwordInput, { color: colors.textPrimary }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t("enterNewPassword")}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: spacing[4] },
                ]}
              >
                {t("confirmNewPassword")}
              </Text>
              <View
                style={[
                  styles.passwordInputContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.passwordInput, { color: colors.textPrimary }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t("confirmNewPasswordPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  onSubmitEditing={handleChangePassword}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                changePasswordMutation.isPending && styles.submitButtonDisabled,
              ]}
              onPress={handleChangePassword}
              disabled={changePasswordMutation.isPending}
            >
              <Text style={styles.submitButtonText}>
                {changePasswordMutation.isPending
                  ? t("saving")
                  : t("changePassword")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Shop Modal */}
      <Modal
        visible={showEditShop}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditShop(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
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
                {t("editShop")}
              </Text>
              <TouchableOpacity onPress={() => setShowEditShop(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                {t("shopName")} *
              </Text>
              <TextInput
                style={[
                  styles.shopInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={shopName}
                onChangeText={setShopName}
                placeholder={t("shopName")}
                placeholderTextColor={colors.textMuted}
              />

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: spacing[4] },
                ]}
              >
                {t("phoneNumber")}
              </Text>
              <TextInput
                style={[
                  styles.shopInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={shopPhone}
                onChangeText={setShopPhone}
                placeholder={t("phoneNumber")}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: spacing[4] },
                ]}
              >
                {t("address")}
              </Text>
              <TextInput
                style={[
                  styles.shopInput,
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={shopAddress}
                onChangeText={setShopAddress}
                placeholder={t("address")}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
              />

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: spacing[4] },
                ]}
              >
                {t("shopDescription")}
              </Text>
              <TextInput
                style={[
                  styles.shopInput,
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={shopDescription}
                onChangeText={setShopDescription}
                placeholder={t("shopDescriptionPlaceholder")}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: spacing[4] },
                ]}
              >
                {t("shopEmail")}
              </Text>
              <TextInput
                style={[
                  styles.shopInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={shopEmail}
                onChangeText={setShopEmail}
                placeholder="shop@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: spacing[4] },
                ]}
              >
                {t("shopWebsite")}
              </Text>
              <TextInput
                style={[
                  styles.shopInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={shopWebsite}
                onChangeText={setShopWebsite}
                placeholder="https://example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: spacing[4] },
                ]}
              >
                {t("shopFacebook")}
              </Text>
              <TextInput
                style={[
                  styles.shopInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={shopFacebook}
                onChangeText={setShopFacebook}
                placeholder="facebook.com/yourshop"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: spacing[4] },
                ]}
              >
                {t("shopInstagram")}
              </Text>
              <TextInput
                style={[
                  styles.shopInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={shopInstagram}
                onChangeText={setShopInstagram}
                placeholder="@yourshop"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: spacing[4] },
                ]}
              >
                {t("shopTiktok")}
              </Text>
              <TextInput
                style={[
                  styles.shopInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={shopTiktok}
                onChangeText={setShopTiktok}
                placeholder="@yourshop"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary, marginTop: spacing[4] },
                ]}
              >
                {t("shopMapUrl")}
              </Text>
              <TextInput
                style={[
                  styles.shopInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={shopMapUrl}
                onChangeText={setShopMapUrl}
                placeholder="https://maps.google.com/..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
                {t("shopMapUrlHint")}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                updateShopMutation.isPending && styles.submitButtonDisabled,
              ]}
              onPress={handleSaveShop}
              disabled={updateShopMutation.isPending}
            >
              <Text style={styles.submitButtonText}>
                {updateShopMutation.isPending ? t("saving") : t("save")}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Phone Modal */}
      <Modal
        visible={showChangePhone}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangePhone(false)}
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
                {t("changePhoneTitle")}
              </Text>
              <TouchableOpacity onPress={() => setShowChangePhone(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                {phoneStep === "phone"
                  ? t("changePhoneStep1")
                  : t("changePhoneStep2")}
              </Text>
              {phoneStep === "phone" ? (
                <TextInput
                  style={[
                    styles.shopInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={newPhone}
                  onChangeText={setNewPhone}
                  placeholder="+251 9XX XXX XXX"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
              ) : (
                <TextInput
                  style={[
                    styles.shopInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={phoneCode}
                  onChangeText={(v) =>
                    setPhoneCode(v.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                (requestPhoneChangeMutation.isPending ||
                  confirmPhoneChangeMutation.isPending) &&
                  styles.submitButtonDisabled,
              ]}
              disabled={
                requestPhoneChangeMutation.isPending ||
                confirmPhoneChangeMutation.isPending
              }
              onPress={() => {
                if (phoneStep === "phone") {
                  if (!newPhone.trim()) {
                    showToast(t("otpSendFailed"), "error");
                    return;
                  }
                  requestPhoneChangeMutation.mutate(newPhone.trim());
                } else {
                  if (phoneCode.length !== 6) {
                    showToast(t("enterSixDigitCode"), "error");
                    return;
                  }
                  confirmPhoneChangeMutation.mutate({
                    phone: newPhone.trim(),
                    code: phoneCode,
                  });
                }
              }}
            >
              <Text style={styles.submitButtonText}>
                {requestPhoneChangeMutation.isPending ||
                confirmPhoneChangeMutation.isPending
                  ? t("saving")
                  : phoneStep === "phone"
                    ? t("sendCode")
                    : t("confirmChange")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  title: { ...type.h1 },
  scrollContent: { paddingBottom: layout.screenPaddingBottom },
  section: { marginTop: spacing[4] },
  sectionTitle: {
    ...type.caption,
    paddingHorizontal: spacing[5],
    marginBottom: spacing[2],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing[5],
    padding: spacing[4],
    borderRadius: radius.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[3],
  },
  profileInfo: { flex: 1 },
  profileName: { ...type.h4 },
  profileEmail: { ...type.caption },
  profileHint: {
    ...type.micro,
    paddingHorizontal: spacing[5],
    marginTop: spacing[1],
  },
  card: {
    marginHorizontal: spacing[5],
    borderRadius: radius.md,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[3],
  },
  rowDivider: { height: 1, marginHorizontal: spacing[4] },
  rowLabel: { ...type.body, flex: 1 },
  rowValue: { ...type.body },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: { ...type.micro },
  webAppCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing[5],
    padding: spacing[4],
    borderRadius: radius.md,
    gap: spacing[3],
  },
  webAppIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  webAppInfo: { flex: 1 },
  webAppTitle: { ...type.bodyBold },
  webAppDesc: { ...type.caption, marginTop: 2 },
  footer: { marginTop: spacing[8], paddingHorizontal: spacing[5] },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: radius.md,
  },
  signOutText: { ...type.bodyBold },
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
  modalScroll: { maxHeight: 420 },
  fieldHint: { ...type.micro, marginTop: spacing[1] },
  fieldLabel: { ...type.caption, marginBottom: spacing[2] },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
  },
  passwordInput: { ...type.body, flex: 1, paddingVertical: spacing[3] },
  passwordToggle: { padding: spacing[2] },
  shopInput: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  submitButton: {
    borderRadius: radius.md,
    marginHorizontal: spacing[5],
    paddingVertical: spacing[4],
    alignItems: "center",
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { ...type.bodyBold, color: "#fff", fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: "top" },
});
