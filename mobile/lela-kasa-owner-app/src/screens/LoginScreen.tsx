import React, { useState } from "react";
import {
  KeyboardAvoidingView,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import { useTranslation } from "../lib/i18n";
import { showToast } from "../components/Toast";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { radius, spacing, type } from "../theme";
import { useTheme } from "../context/ThemeContext";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      showToast(t("fillBothFields"), "error");
      return;
    }
    setIsLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("invalidCredentials");
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const isPhone = /^[+]?[\d\s()-]+$/.test(identifier.trim());

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
              <Ionicons name="beer" size={40} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>{t("welcomeBack")}</Text>
            <Text style={styles.headerSubtitle}>{t("signInToManage")}</Text>
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
                {isPhone ? t("phoneNumber") : t("email")}
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
                  name={isPhone ? "call-outline" : "mail-outline"}
                  size={20}
                  color={colors.textMuted}
                />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={
                    isPhone ? "+251 9XX XXX XXX" : "shop@example.com"
                  }
                  placeholderTextColor={colors.textMuted}
                  keyboardType={isPhone ? "phone-pad" : "email-address"}
                  autoCapitalize="none"
                  autoComplete={isPhone ? "tel" : "email"}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t("password")}
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
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("enterPassword")}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!isLoading}
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text
                style={[styles.forgotPasswordText, { color: colors.primary }]}
              >
                {t("forgotPassword")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t("signIn")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate("Register" as never)}
            >
              <Text
                style={[styles.registerText, { color: colors.textSecondary }]}
              >
                {t("noAccount")}{" "}
              </Text>
              <Text
                style={[styles.registerTextBold, { color: colors.primary }]}
              >
                {t("signUp")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.customerLoginLink}
              onPress={() => navigation.navigate("CustomerLogin")}
            >
              <Text
                style={[styles.customerLoginText, { color: colors.textSecondary }]}
              >
                {t("customerPortal")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  label: { ...type.caption, marginBottom: spacing[2], marginLeft: spacing[1] },
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
  forgotPasswordLink: {
    alignSelf: "flex-end",
    marginTop: -spacing[3],
    marginBottom: spacing[4],
  },
  forgotPasswordText: { ...type.caption },
  button: {
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    alignItems: "center",
    marginTop: spacing[2],
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...type.bodyBold, fontSize: 17, color: "#fff" },
  registerLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing[6],
    alignItems: "center",
  },
  registerText: { ...type.body },
  registerTextBold: { ...type.bodyBold },
  customerLoginLink: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing[4],
  },
  customerLoginText: {
    ...type.body,
    fontSize: 13,
  },
});
