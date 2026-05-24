import { Platform, ViewStyle } from "react-native";

export const palette = {
  brand: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
  },
  accent: {
    50: "#fff7ed",
    100: "#ffedd5",
    200: "#fed7aa",
    400: "#fb923c",
    500: "#f97316",
    600: "#ea580c",
    700: "#c2410c",
  },
  warm: {
    50: "#fef3c7",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    900: "#78350f",
  },
  green: {
    50: "#ecfdf5",
    100: "#dcfce7",
    300: "#6ee7b7",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    900: "#14532d",
  },
  red: {
    50: "#fef2f2",
    100: "#fee2e2",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    900: "#7f1d1d",
  },
  blue: {
    50: "#eff6ff",
    100: "#dbeafe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    900: "#1e3a8a",
  },
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    700: "#b45309",
    900: "#78350f",
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
};

export const lightColors = {
  background: palette.slate[50],
  surface: palette.white,
  surfaceMuted: palette.slate[100],
  surfaceTinted: palette.brand[50],
  textPrimary: palette.slate[900],
  textSecondary: palette.slate[600],
  textMuted: palette.slate[400],
  textInverse: palette.white,
  primary: palette.brand[500],
  primaryDark: palette.brand[700],
  primaryLight: palette.brand[100],
  accent: palette.warm[500],
  accentLight: palette.warm[50],
  success: palette.green[600],
  successLight: palette.green[100],
  warning: palette.amber[500],
  warningLight: palette.amber[100],
  danger: palette.red[500],
  dangerLight: palette.red[100],
  border: palette.slate[200],
  borderStrong: palette.slate[300],
  scrim: "rgba(15, 23, 42, 0.55)",
  scrimLight: "rgba(15, 23, 42, 0.30)",
};

export const darkColors = {
  background: palette.slate[900],
  surface: palette.slate[800],
  surfaceMuted: palette.slate[700],
  surfaceTinted: palette.brand[900],
  textPrimary: palette.slate[100],
  textSecondary: palette.slate[400],
  textMuted: palette.slate[500],
  textInverse: palette.slate[900],
  primary: palette.brand[400],
  primaryDark: palette.brand[300],
  primaryLight: palette.brand[900],
  accent: palette.warm[400],
  accentLight: palette.warm[700],
  success: palette.green[400],
  successLight: palette.green[700],
  warning: palette.amber[400],
  warningLight: palette.amber[700],
  danger: palette.red[400],
  dangerLight: palette.red[700],
  border: palette.slate[700],
  borderStrong: palette.slate[600],
  scrim: "rgba(0, 0, 0, 0.7)",
  scrimLight: "rgba(0, 0, 0, 0.4)",
};

export type ColorScheme = typeof lightColors;

export const colors = lightColors;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
};

export const type = {
  display: { fontSize: 32, fontWeight: "800" as const, lineHeight: 38 },
  h1: { fontSize: 26, fontWeight: "800" as const, lineHeight: 32 },
  h2: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: "700" as const, lineHeight: 24 },
  h4: { fontSize: 16, fontWeight: "700" as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  bodyMedium: { fontSize: 15, fontWeight: "500" as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: "700" as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "500" as const, lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: "600" as const, lineHeight: 14 },
};

export const shadow = {
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.slate[900],
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  })!,
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.slate[900],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 3 },
    default: {},
  })!,
  lg: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.slate[900],
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {},
  })!,
  brand: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.brand[500],
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
    default: {},
  })!,
};

export const theme = { colors, palette, radius, spacing, type, shadow };
export type Theme = typeof theme;
