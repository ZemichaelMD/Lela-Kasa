import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';

export function StatCard({
  label,
  value,
  trend,
  icon,
  style,
}: {
  label: string;
  value: string;
  trend?: { value: string; positive: boolean };
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, style]}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={icon} size={18} color={colors.primary} />
          </View>
        )}
        {trend && (
          <View
            style={[
              styles.trendBadge,
              { backgroundColor: trend.positive ? colors.successLight : colors.dangerLight },
            ]}
          >
            <Ionicons
              name={trend.positive ? 'trending-up' : 'trending-down'}
              size={12}
              color={trend.positive ? colors.success : colors.danger}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend.positive ? colors.success : colors.danger },
              ]}
            >
              {trend.value}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: spacing[4],
    flex: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  trendText: {
    ...type.micro,
  },
  value: {
    ...type.h2,
    marginBottom: 2,
  },
  label: {
    ...type.caption,
  },
});
