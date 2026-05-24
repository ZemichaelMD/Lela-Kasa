import React from "react";
import { Text, View, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { radius, type } from "../theme";

export type PillTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type PillProps = {
  label: string;
  tone?: PillTone;
  icon?: React.ReactNode;
  size?: "sm" | "md";
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Pill({
  label,
  tone = "neutral",
  icon,
  size = "sm",
  style,
  textStyle,
}: PillProps) {
  const { colors, isDark } = useTheme();
  const sizeStyle = size === "md" ? styles.md : styles.sm;

  const bg = isDark
    ? tone === "neutral" ? "#334155" : tone === "brand" ? "#0c4a6e" : tone === "success" ? "#14532d" : tone === "warning" ? "#78350f" : tone === "danger" ? "#7f1d1d" : "#1e3a5f"
    : tone === "neutral" ? "#f1f5f9" : tone === "brand" ? "#f0f9ff" : tone === "success" ? "#ecfdf5" : tone === "warning" ? "#fffbeb" : tone === "danger" ? "#fef2f2" : "#eff6ff";

  const fg = isDark
    ? tone === "neutral" ? "#e2e8f0" : tone === "brand" ? "#7dd3fc" : tone === "success" ? "#4ade80" : tone === "warning" ? "#fbbf24" : tone === "danger" ? "#f87171" : "#60a5fa"
    : tone === "neutral" ? "#334155" : tone === "brand" ? "#0369a1" : tone === "success" ? "#15803d" : tone === "warning" ? "#b45309" : tone === "danger" ? "#b91c1c" : "#2563eb";

  return (
    <View
      style={[
        styles.pill,
        sizeStyle,
        { backgroundColor: bg },
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text
        style={[
          styles.text,
          size === "md" ? styles.textMd : styles.textSm,
          { color: fg },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  sm: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  md: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  icon: {
    marginRight: 4,
  },
  text: { ...type.micro },
  textSm: { fontSize: 11, lineHeight: 14 },
  textMd: { fontSize: 13, lineHeight: 16 },
});
