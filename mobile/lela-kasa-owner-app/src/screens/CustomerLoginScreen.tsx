import React, { useState } from "react";
import {
  KeyboardAvoidingView,
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

import type { RootStackParamList } from "../navigation/types";
import { getSdk, API_URL } from "../lib/sdk";
import { t } from "../lib/i18n";
import { useTheme } from "../context/ThemeContext";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { showToast } from "../components/Toast";
import { radius, spacing, type } from "../theme";

export default function CustomerLoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forced PIN change state
  const [showChangePin, setShowChangePin] = useState(false);
  const [changeToken, setChangeToken] = useState<string | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  // Forgot PIN state
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPin, setForgotNewPin] = useState("");
  const [forgotConfirmPin, setForgotConfirmPin] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "code" | "pin">("email");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !pin.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await getSdk().auth.customerLogin(
        username.trim(),
        pin.trim(),
      );

      if (data.customer?.mustChangePassword) {
        setChangeToken(data.accessToken);
        setShowChangePin(true);
        return;
      }

      navigation.replace("CustomerPortal", {
        customerId: data.customer.id,
        accessToken: data.accessToken,
      });
    } catch (err: any) {
      const msg = err?.message || t("customerInvalidCredentials");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChangePin() {
    if (newPin !== confirmPin) {
      setChangeError("PINs do not match");
      return;
    }
    if (newPin.length < 4) {
      setChangeError("PIN must be at least 4 characters");
      return;
    }
    setChanging(true);
    setChangeError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/customer-portal/change-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${changeToken}`,
        },
        body: JSON.stringify({
          currentPin: currentPin.trim(),
          newPin: newPin.trim(),
        }),
      });
      const envelope = await res.json();
      const responseData = envelope?.data ?? envelope;
      if (!res.ok)
        throw new Error(responseData?.message || "Failed to change PIN");

      navigation.replace("CustomerPortal", {
        customerId: responseData.customer.id,
        accessToken: responseData.accessToken,
      });
    } catch (err: any) {
      setChangeError(err.message || "Failed to change PIN");
    } finally {
      setChanging(false);
    }
  }

  function closeChangePin() {
    setShowChangePin(false);
    setChangeToken(null);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setChangeError(null);
  }

  async function handleForgotSendCode() {
    if (!forgotEmail.trim()) return;
    setForgotSubmitting(true);
    setForgotError(null);
    try {
      await getSdk().auth.customerForgotPin(forgotEmail.trim());
      setForgotStep("code");
    } catch (err: any) {
      setForgotError(err?.message || "Failed to send code");
    } finally {
      setForgotSubmitting(false);
    }
  }

  async function handleForgotReset() {
    if (forgotNewPin !== forgotConfirmPin) {
      setForgotError("PINs do not match");
      return;
    }
    if (forgotNewPin.length < 4) {
      setForgotError("PIN must be at least 4 characters");
      return;
    }
    setForgotSubmitting(true);
    setForgotError(null);
    try {
      await getSdk().auth.customerResetPin(
        forgotEmail.trim(),
        forgotCode.trim(),
        forgotNewPin.trim(),
      );
      showToast("PIN reset successfully", "success");
      closeForgotPin();
    } catch (err: any) {
      setForgotError(err?.message || "Failed to reset PIN");
    } finally {
      setForgotSubmitting(false);
    }
  }

  function closeForgotPin() {
    setShowForgotPin(false);
    setForgotEmail("");
    setForgotCode("");
    setForgotNewPin("");
    setForgotConfirmPin("");
    setForgotStep("email");
    setForgotError(null);
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <SafeAreaView style={styles.headerSafe}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={[
                styles.backButton,
                { backgroundColor: "rgba(255,255,255,0.15)" },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <LanguageSwitcher />
          </View>

          <View style={styles.headerContent}>
            <View
              style={[
                styles.logoContainer,
                { backgroundColor: "rgba(255,255,255,0.15)" },
              ]}
            >
              <Ionicons name="people" size={40} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>{t("customerPortal")}</Text>
            <Text style={styles.headerSubtitle}>{t("customerSignIn")}</Text>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t("username")}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.textMuted}
                />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={username}
                  onChangeText={(v) => {
                    setUsername(v);
                    setError(null);
                  }}
                  placeholder={t("enterUsername")}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoComplete="username"
                  editable={!submitting}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t("pin")}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textMuted}
                />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={pin}
                  onChangeText={(v) => {
                    setPin(v);
                    setError(null);
                  }}
                  secureTextEntry={!showPin}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="••••••"
                  placeholderTextColor={colors.textMuted}
                  autoComplete="off"
                  editable={!submitting}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={() => setShowPin(!showPin)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={showPin ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: colors.danger + "1A",
                    borderColor: colors.danger + "40",
                  },
                ]}
              >
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {error}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t("signIn")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPinLink}
              onPress={() => setShowForgotPin(true)}
            >
              <Text
                style={[styles.forgotPinText, { color: colors.primary }]}
              >
                Forgot PIN?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate("Login")}
            >
              <Text
                style={[styles.loginLinkText, { color: colors.textSecondary }]}
              >
                {t("ownerStaffLogin")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot PIN Modal */}
      <Modal
        visible={showForgotPin}
        transparent
        animationType="slide"
        onRequestClose={closeForgotPin}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                <Text
                  style={[styles.modalTitle, { color: colors.textPrimary }]}
                >
                  Reset PIN
                </Text>
                <TouchableOpacity onPress={closeForgotPin}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                {forgotStep === "email" && (
                  <>
                    <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
                      Enter your email address to receive a PIN reset code.
                    </Text>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Email
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={forgotEmail}
                        onChangeText={(v) => { setForgotEmail(v); setForgotError(null); }}
                        placeholder="your@email.com"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoFocus
                      />
                    </View>
                  </>
                )}
                {forgotStep === "code" && (
                  <>
                    <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
                      Enter the 6-digit code sent to {forgotEmail}
                    </Text>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Code
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={forgotCode}
                        onChangeText={(v) => { setForgotCode(v.replace(/\D/g, "").slice(0, 6)); setForgotError(null); }}
                        placeholder="000000"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoFocus
                      />
                    </View>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[3] }]}>
                      New PIN
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={forgotNewPin}
                        onChangeText={(v) => { setForgotNewPin(v.replace(/\D/g, "").slice(0, 10)); setForgotError(null); }}
                        secureTextEntry
                        keyboardType="number-pad"
                        maxLength={10}
                        placeholder="New PIN"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[3] }]}>
                      Confirm PIN
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={forgotConfirmPin}
                        onChangeText={(v) => { setForgotConfirmPin(v.replace(/\D/g, "").slice(0, 10)); setForgotError(null); }}
                        secureTextEntry
                        keyboardType="number-pad"
                        maxLength={10}
                        placeholder="Confirm PIN"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </>
                )}
                {forgotError && (
                  <View
                    style={[
                      styles.errorBox,
                      {
                        backgroundColor: colors.danger + "1A",
                        borderColor: colors.danger + "40",
                      },
                    ]}
                  >
                    <Text style={[styles.errorText, { color: colors.danger }]}>
                      {forgotError}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: colors.primary },
                    forgotSubmitting && styles.buttonDisabled,
                  ]}
                  onPress={forgotStep === "email" ? handleForgotSendCode : handleForgotReset}
                  disabled={forgotSubmitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>
                    {forgotSubmitting
                      ? "Please wait..."
                      : forgotStep === "email"
                        ? "Send Code"
                        : "Reset PIN"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Forced PIN Change Modal */}
      <Modal
        visible={showChangePin}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                <Text
                  style={[styles.modalTitle, { color: colors.textPrimary }]}
                >
                  Change Your PIN
                </Text>
              </View>
              <ScrollView style={styles.modalContent}>
                <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
                  For security, you must change your PIN before accessing the
                  portal.
                </Text>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  Current PIN
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={currentPin}
                    onChangeText={setCurrentPin}
                    secureTextEntry={!showCurrentPin}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="••••••"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPin(!showCurrentPin)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showCurrentPin ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  New PIN
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={newPin}
                    onChangeText={setNewPin}
                    secureTextEntry={!showNewPin}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="••••••"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPin(!showNewPin)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showNewPin ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  Confirm New PIN
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="••••••"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                {changeError && (
                  <View
                    style={[
                      styles.errorBox,
                      {
                        backgroundColor: colors.danger + "1A",
                        borderColor: colors.danger + "40",
                      },
                    ]}
                  >
                    <Text style={[styles.errorText, { color: colors.danger }]}>
                      {changeError}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: colors.primary },
                    changing && styles.buttonDisabled,
                  ]}
                  onPress={handleChangePin}
                  disabled={changing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>
                    {changing ? "Changing PIN..." : "Change PIN & Continue"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 280,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  headerSafe: { flex: 1 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    alignItems: "center",
    paddingHorizontal: spacing[6],
    marginTop: spacing[4],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  headerTitle: { ...type.h1, color: "#fff", marginBottom: spacing[2] },
  headerSubtitle: {
    ...type.body,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  keyboardView: { flex: 1, marginTop: 40 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
  },
  form: { flex: 1 },
  field: { marginBottom: spacing[5] },
  label: {
    ...type.caption,
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
  },
  input: {
    ...type.body,
    flex: 1,
    paddingVertical: spacing[3],
    marginLeft: spacing[3],
  },
  passwordToggle: { padding: spacing[2] },
  errorBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginBottom: spacing[4],
  },
  errorText: { ...type.caption },
  button: {
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    alignItems: "center",
    marginTop: spacing[2],
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...type.bodyBold, fontSize: 17, color: "#fff" },
  forgotPinLink: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing[4],
  },
  forgotPinText: { ...type.bodyBold },
  loginLink: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing[6],
  },
  loginLinkText: { ...type.bodyBold },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
  },
  modalTitle: { ...type.h3 },
  modalContent: { paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  modalDesc: { ...type.body, marginBottom: spacing[4], textAlign: "center" },
  fieldLabel: {
    ...type.caption,
    marginBottom: spacing[2],
    marginTop: spacing[3],
  },
});
