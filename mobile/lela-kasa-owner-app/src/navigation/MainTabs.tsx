import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Presets } from "react-native-pulsar";

import type { MainTabParamList } from "../navigation/types";
import DashboardScreen from "../screens/DashboardScreen";
import CustomersScreen from "../screens/CustomersScreen";
import SalesScreen from "../screens/SalesScreen";
import ReportsScreen from "../screens/ReportsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
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
    const color = isFocused ? colors.primary : colors.textMuted;

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
        style={styles.tabItem}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconWrap,
            isFocused && {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.04)",
            },
          ]}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {isFocused && <Text style={[styles.label, { color }]}>{label}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 15) }]}
    >
      <View
        style={[
          styles.glassWrapper,
          {
            backgroundColor: isDark
              ? "rgba(30, 41, 59, 0.85)"
              : "rgba(255, 255, 255, 0.8)",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.05)",
          },
        ]}
      >
        <View style={styles.mainGroup}>{mainTabs.map(renderTab)}</View>

        <View
          style={[
            styles.separator,
            { backgroundColor: colors.border, opacity: 0.5 },
          ]}
        />

        <View style={styles.settingsGroup}>
          {settingsTab && renderTab(settingsTab)}
        </View>
      </View>
    </View>
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
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing[4],
  },
  glassWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius["2xl"],
    borderWidth: 1,
    padding: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
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
    paddingLeft: 4,
  },
  separator: {
    width: 1,
    height: 24,
    marginHorizontal: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    height: 40,
    paddingHorizontal: 8,
    flexDirection: "row",
    gap: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
});
