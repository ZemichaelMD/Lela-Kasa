import React from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Presets } from "react-native-pulsar";

import type { MainTabParamList } from "./types";
import DashboardScreen from "../screens/DashboardScreen";
import CustomersScreen from "../screens/CustomersScreen";
import SalesScreen from "../screens/SalesScreen";
import ReportsScreen from "../screens/ReportsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useTabBarVisibility } from "../context/TabBarVisibilityContext";
import { t } from "../lib/i18n";
import { radius, spacing } from "../theme";

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabName = "Dashboard" | "Customers" | "Sales" | "Reports" | "Settings";

interface TabConfig {
  name: TabName;
  component: React.ComponentType<any>;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  label: string;
  permission?: string;
}

const tabConfig: TabConfig[] = [
  {
    name: "Dashboard",
    component: DashboardScreen,
    icon: "grid-outline",
    iconActive: "grid",
    label: "dashboard",
  },
  {
    name: "Customers",
    component: CustomersScreen,
    icon: "people-outline",
    iconActive: "people",
    label: "customers",
    permission: "customers:view",
  },
  {
    name: "Sales",
    component: SalesScreen,
    icon: "cart-outline",
    iconActive: "cart",
    label: "sales",
    permission: "sales:view",
  },
  {
    name: "Reports",
    component: ReportsScreen,
    icon: "stats-chart-outline",
    iconActive: "stats-chart",
    label: "reports",
    permission: "reports:view",
  },
  {
    name: "Settings",
    component: SettingsScreen,
    icon: "options-outline",
    iconActive: "options",
    label: "settings",
    permission: "settings:view",
  },
];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { translateY } = useTabBarVisibility();

  const mainTabs = state.routes.filter((r) =>
    ["Dashboard", "Customers", "Sales", "Reports"].includes(r.name),
  );
  const settingsTab = state.routes.find((r) => r.name === "Settings");

  const renderTab = (route: any) => {
    const index = state.routes.indexOf(route);
    const isFocused = state.index === index;
    const tab = tabConfig.find((tc) => tc.name === route.name);
    const label = tab ? t(tab.label as any) : "";
    const icon = tab
      ? isFocused
        ? tab.iconActive
        : tab.icon
      : "ellipse-outline";

    const activeColor = colors.primary;
    const inactiveColor = colors.textMuted;
    const color = isFocused ? activeColor : inactiveColor;

    const onPress = () => {
      Presets.System.impactLight();
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name as any);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        style={[
          styles.tabItem,
          isFocused && [
            styles.tabItemActive,
            { backgroundColor: `${colors.primary}18` },
          ],
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={22} color={color} />
        {isFocused && (
          <Text style={[styles.label, { color }]} numberOfLines={1}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View
      style={[
        styles.absoluteContainer,
        { transform: [{ translateY: translateY }] },
      ]}
    >
      <LinearGradient
        colors={
          isDark
            ? [
                "rgba(10, 10, 10, 0)",
                "rgba(10, 10, 10, 0.8)",
                "rgba(10, 10, 10, 1)",
              ]
            : [
                "rgba(255, 255, 255, 0)",
                "rgba(255, 255, 255, 0.8)",
                "rgba(255, 255, 255, 1)",
              ]
        }
        locations={[0, 1, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View
        style={[
          styles.dockContainer,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <View
          style={[
            styles.glassWrapper,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.mainGroup}>{mainTabs.map(renderTab)}</View>

          {settingsTab && (
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
          )}

          <View style={styles.settingsGroup}>
            {settingsTab && renderTab(settingsTab)}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function MainTabs() {
  const { hasPermission } = useAuth();
  const visibleTabs = tabConfig.filter(
    (tab) => !tab.permission || hasPermission(tab.permission),
  );

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {visibleTabs.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: "flex-end",
  },
  dockContainer: {
    alignItems: "center",
    paddingHorizontal: spacing[4],
  },
  glassWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius["3xl"],
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  mainGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  settingsGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  separator: {
    width: 1,
    height: 24,
    marginHorizontal: 6,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    paddingHorizontal: 10,
    gap: 6,
  },
  tabItemActive: {
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
    letterSpacing: 0.3,
  },
});
