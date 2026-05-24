import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, type } from "../theme";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.option,
          language === "en" && { backgroundColor: colors.primaryLight },
        ]}
        onPress={() => setLanguage("en")}
        disabled={language === "en"}
      >
        <Text
          style={[
            styles.text,
            { color: language === "en" ? colors.primary : colors.textMuted },
          ]}
        >
          EN
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.option,
          language === "am" && { backgroundColor: colors.primaryLight },
        ]}
        onPress={() => setLanguage("am")}
        disabled={language === "am"}
      >
        <Text
          style={[
            styles.text,
            { color: language === "am" ? colors.primary : colors.textMuted },
          ]}
        >
          አማ
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function LanguageSwitcherLarge() {
  const { language, setLanguage } = useLanguage();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.largeContainer,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.largeOption,
          language === "en" && { backgroundColor: colors.primaryLight },
        ]}
        onPress={() => setLanguage("en")}
        disabled={language === "en"}
      >
        <Ionicons
          name={language === "en" ? "checkmark-circle" : "ellipse-outline"}
          size={20}
          color={language === "en" ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.largeText,
            { color: language === "en" ? colors.primary : colors.textPrimary },
          ]}
        >
          English
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.largeOption,
          language === "am" && { backgroundColor: colors.primaryLight },
        ]}
        onPress={() => setLanguage("am")}
        disabled={language === "am"}
      >
        <Ionicons
          name={language === "am" ? "checkmark-circle" : "ellipse-outline"}
          size={20}
          color={language === "am" ? colors.primary : colors.textMuted}
        />
        <Text
          style={[
            styles.largeText,
            { color: language === "am" ? colors.primary : colors.textPrimary },
          ]}
        >
          አማርኛ
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  option: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.xs,
  },
  text: { ...type.body },
  largeContainer: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  largeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    padding: spacing[3],
  },
  largeText: { ...type.body },
});
