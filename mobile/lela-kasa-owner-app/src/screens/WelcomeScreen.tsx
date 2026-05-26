import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { RootStackParamList } from "../navigation/types";
import { useTranslation } from "../lib/i18n";
import { useTheme } from "../context/ThemeContext";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { palette, radius, spacing, type } from "../theme";

export default function WelcomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.topRight}>
        <LanguageSwitcher />
      </View>
      <View style={styles.content}>
        <Image
          source={require("../../assets/icon.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t("appName")}
        </Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          {t("manageShop")}
          {"\n"}
          {t("withConfidence")}
        </Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.buttonText}>{t("signIn")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.onboardingButton}
          onPress={() => navigation.navigate("Onboarding")}
        >
          <Text
            style={[styles.onboardingText, { color: colors.textSecondary }]}
          >
            {t("learnMore")}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: spacing[8],
  },
  topRight: {
    position: "absolute",
    top: spacing[4],
    right: spacing[6],
    zIndex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[6],
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginTop: spacing[4],
    marginBottom: spacing[6],
  },
  title: { ...type.h1, marginBottom: spacing[3] },
  tagline: { ...type.body, textAlign: "center", lineHeight: 26 },
  footer: { paddingHorizontal: spacing[6], paddingBottom: spacing[8] },
  button: {
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    alignItems: "center",
    marginBottom: spacing[4],
  },
  buttonText: { ...type.bodyBold, color: "#fff", fontSize: 17 },
  onboardingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
  },
  onboardingText: { ...type.body },
});
