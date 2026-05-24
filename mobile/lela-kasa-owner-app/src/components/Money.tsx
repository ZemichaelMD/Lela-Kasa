import React from "react";
import { StyleSheet, Text, TextStyle } from "react-native";
import { colors, type } from "../theme";

function formatEtb(cents: number): string {
  const etb = (cents / 100).toFixed(2);
  return `Br ${etb}`;
}

export function Money({
  cents,
  size = "md",
  style,
}: {
  cents: number;
  size?: "sm" | "md" | "lg";
  style?: TextStyle;
}) {
  const sizeStyle =
    size === "lg" ? styles.lg : size === "sm" ? styles.sm : styles.md;
  return <Text style={[styles.base, sizeStyle, style]}>{formatEtb(cents)}</Text>;
}

const styles = StyleSheet.create({
  base: {
    ...type.bodyBold,
    color: colors.textPrimary,
  },
  sm: { fontSize: 13, lineHeight: 18 },
  md: { fontSize: 15, lineHeight: 20 },
  lg: { fontSize: 22, lineHeight: 26, fontWeight: "800" },
});
