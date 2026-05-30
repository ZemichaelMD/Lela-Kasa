import { Platform, ViewStyle } from "react-native";

export const palette = {
  brand: {
    50: "#f2fbf5", // Ultra-clean faint brand tint
    100: "#e0f6e8",
    200: "#c2ead2",
    300: "#91d7b3",
    400: "#5bbd90", // Accessible bright brand accent
    500: "#349e6f",
    600: "#237e56",
    700: "#096136", // Your core logo color
    800: "#074d2b",
    900: "#05381f",
  },
  // Repurposed forest to be a sleek charcoal/slate system for an elegant dark mode
  forest: {
    950: "#090b0e",
    900: "#12151c",
    800: "#1a1f26",
    700: "#242b35",
    600: "#303946",
    500: "#414d5e",
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
    100: "#d1fae5",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    900: "#064e3b",
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
  background: "#f8fafc", // Clean, crisp slate-white canvas
  surface: palette.white,
  surfaceMuted: "#f1f5f9", // Neutral, non-green muted gray
  surfaceTinted: palette.brand[50], // Barely-there brand wash
  textPrimary: palette.slate[900],
  textSecondary: palette.slate[600],
  textMuted: palette.slate[400],
  textInverse: palette.white,
  primary: palette.brand[700], // Sharp rendering of logo color
  primaryDark: palette.brand[800],
  primaryLight: palette.brand[100],
  accent: palette.accent[500],
  accentLight: palette.accent[50],
  success: palette.green[600],
  successLight: palette.green[100],
  warning: palette.amber[500],
  warningLight: palette.amber[100],
  danger: palette.red[500],
  dangerLight: palette.red[100],
  border: palette.slate[200],
  borderStrong: palette.slate[300],
  scrim: "rgba(15, 23, 42, 0.6)", // Sleek slate-dark overlay
  scrimLight: "rgba(15, 23, 42, 0.3)",
};

export const darkColors = {
  background: palette.forest[900], // Deep premium charcoal
  surface: palette.forest[800], // Slightly elevated dark slate
  surfaceMuted: palette.forest[700],
  surfaceTinted: palette.forest[600],
  textPrimary: "#f1f5f9", // Clean off-white text
  textSecondary: palette.slate[400], // Muted gray text
  textMuted: palette.slate[500],
  textInverse: palette.forest[950],
  primary: palette.brand[400], // Bright emerald highlight for readability
  primaryDark: palette.brand[300],
  primaryLight: palette.forest[600],
  accent: palette.accent[400],
  accentLight: palette.forest[600],
  success: palette.green[400],
  successLight: palette.green[900],
  warning: palette.amber[400],
  warningLight: palette.amber[900],
  danger: palette.red[400],
  dangerLight: palette.red[900],
  border: palette.forest[700],
  borderStrong: palette.forest[600],
  scrim: "rgba(0, 0, 0, 0.85)",
  scrimLight: "rgba(0, 0, 0, 0.5)",
};

export type ColorScheme = typeof lightColors;

export const colors = lightColors;

// Tighter radius configurations optimized for modern mobile views
export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  "2xl": 22,
  "3xl": 28,
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

export const layout = {
  screenPaddingBottom: 100, // Enough to clear the floating bottom nav
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
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 1.5,
    },
    android: { elevation: 1 },
    default: {},
  })!,
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  })!,
  lg: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
    default: {},
  })!,
  brand: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.brand[700],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
    },
    android: { elevation: 5 },
    default: {},
  })!,
};

export const theme = { colors, palette, radius, spacing, type, shadow };
export type Theme = typeof theme;
