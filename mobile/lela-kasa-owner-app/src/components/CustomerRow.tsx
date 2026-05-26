import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';

export function CustomerRow({
  name,
  phone,
  balanceCents,
  outstandingBoxes,
  outstandingBottles,
  onPress,
}: {
  name: string;
  phone?: string;
  balanceCents: number;
  outstandingBoxes?: number;
  outstandingBottles?: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const hasBalance = balanceCents > 0;
  const hasContainers = (outstandingBoxes ?? 0) > 0 || (outstandingBottles ?? 0) > 0;
  const fmt = (cents: number) => (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {name.trim().charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{name}</Text>
        {phone && <Text style={[styles.phone, { color: colors.textMuted }]}>{phone}</Text>}

        {hasContainers && (
          <View style={styles.containers}>
            {(outstandingBoxes ?? 0) > 0 && (
              <View style={[styles.containerTag, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="cube-outline" size={10} color={colors.warning} />
                <Text style={[styles.containerText, { color: colors.warning }]}>{outstandingBoxes} boxes</Text>
              </View>
            )}
            {(outstandingBottles ?? 0) > 0 && (
              <View style={[styles.containerTag, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="wine-outline" size={10} color={colors.warning} />
                <Text style={[styles.containerText, { color: colors.warning }]}>{outstandingBottles} bottles</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Balance */}
      <View style={styles.right}>
        {hasBalance ? (
          <View style={[styles.balancePill, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.balanceText, { color: colors.danger }]}>{fmt(balanceCents)}</Text>
          </View>
        ) : (
          <View style={[styles.balancePill, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark" size={12} color={colors.success} />
            <Text style={[styles.balanceText, { color: colors.success }]}>Paid</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...type.bodyMedium,
    fontSize: 14,
  },
  phone: {
    ...type.micro,
    marginTop: 1,
  },
  containers: {
    flexDirection: 'row',
    gap: spacing[1],
    marginTop: spacing[1],
    flexWrap: 'wrap',
  },
  containerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  containerText: {
    fontSize: 10,
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  balanceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevron: {
    marginTop: 2,
  },
});
