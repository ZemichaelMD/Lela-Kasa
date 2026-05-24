import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import type { MainTabParamList } from '../navigation/types';
import DashboardScreen from '../screens/DashboardScreen';
import CustomersScreen from '../screens/CustomersScreen';
import SalesScreen from '../screens/SalesScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabName = 'Dashboard' | 'Customers' | 'Sales' | 'Reports' | 'Settings';

interface TabConfig {
  name: TabName;
  component: React.ComponentType<any>;
  icon: 'home-outline' | 'people-outline' | 'receipt-outline' | 'bar-chart-outline' | 'settings-outline';
  iconActive: 'home' | 'people' | 'receipt' | 'bar-chart' | 'settings';
  label: string;
  permission?: string;
}

const tabConfig: TabConfig[] = [
  { name: 'Dashboard' as const, component: DashboardScreen, icon: 'home-outline' as const, iconActive: 'home' as const, label: 'dashboard' },
  { name: 'Customers' as const, component: CustomersScreen, icon: 'people-outline' as const, iconActive: 'people' as const, label: 'customers', permission: 'customers:view' },
  { name: 'Sales' as const, component: SalesScreen, icon: 'receipt-outline' as const, iconActive: 'receipt' as const, label: 'sales', permission: 'sales:view' },
  { name: 'Reports' as const, component: ReportsScreen, icon: 'bar-chart-outline' as const, iconActive: 'bar-chart' as const, label: 'reports', permission: 'reports:view' },
  { name: 'Settings' as const, component: SettingsScreen, icon: 'settings-outline' as const, iconActive: 'settings' as const, label: 'settings', permission: 'settings:view' },
];

export default function MainTabs() {
  const { colors } = useTheme();
  const { hasPermission } = useAuth();

  const visibleTabs = tabConfig.filter(tab => !tab.permission || hasPermission(tab.permission));

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = visibleTabs.find(t => t.name === route.name);
        return {
          headerShown: false,
          tabBarLabel: tab ? t(tab.label as any) : '',
          tabBarIcon: ({ focused, color, size }) => {
            const iconName = tab ? (focused ? tab.iconActive : tab.icon) : 'ellipse-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
        };
      }}
    >
      {visibleTabs.map(tab => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}
