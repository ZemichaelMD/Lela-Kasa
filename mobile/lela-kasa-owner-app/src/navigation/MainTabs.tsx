import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainTabParamList } from '../navigation/types';
import DashboardScreen from '../screens/DashboardScreen';
import CustomersScreen from '../screens/CustomersScreen';
import SalesScreen from '../screens/SalesScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import { palette, radius } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabName = 'Dashboard' | 'Customers' | 'Sales' | 'Reports' | 'Settings';

interface TabConfig {
  name: TabName;
  component: React.ComponentType<any>;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  label: string;
  permission?: string;
}

const tabConfig: TabConfig[] = [
  { name: 'Dashboard', component: DashboardScreen, icon: 'home-outline', iconActive: 'home', label: 'dashboard' },
  { name: 'Customers', component: CustomersScreen, icon: 'people-outline', iconActive: 'people', label: 'customers', permission: 'customers:view' },
  { name: 'Sales', component: SalesScreen, icon: 'receipt-outline', iconActive: 'receipt', label: 'sales', permission: 'sales:view' },
  { name: 'Reports', component: ReportsScreen, icon: 'bar-chart-outline', iconActive: 'bar-chart', label: 'reports', permission: 'reports:view' },
  { name: 'Settings', component: SettingsScreen, icon: 'settings-outline', iconActive: 'settings', label: 'settings', permission: 'settings:view' },
];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab = tabConfig.find(tc => tc.name === route.name);
        const label = tab ? t(tab.label as any) : '';
        const icon = tab ? (isFocused ? tab.iconActive : tab.icon) : 'ellipse-outline';
        const color = isFocused ? colors.primary : colors.textMuted;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
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
            {/* Active indicator pill at top */}
            <View style={styles.indicatorWrap}>
              {isFocused && (
                <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
              )}
            </View>

            {/* Icon with subtle active bg */}
            <View
              style={[
                styles.iconWrap,
                isFocused && { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name={icon} size={22} color={color} />
            </View>

            <Text
              style={[
                styles.label,
                { color },
                isFocused && styles.labelActive,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MainTabs() {
  const { hasPermission } = useAuth();
  const visibleTabs = tabConfig.filter(tab => !tab.permission || hasPermission(tab.permission));

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {visibleTabs.map(tab => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: palette.slate[900],
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  indicatorWrap: {
    height: 3,
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  indicator: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
  },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 13,
  },
  labelActive: {
    fontWeight: '700',
  },
});
