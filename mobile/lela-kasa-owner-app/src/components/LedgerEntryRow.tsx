import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';

type LedgerEntryType = 'sale' | 'payment' | 'return';

export function LedgerEntryRow({
  type,
  label,
  date,
  amountCents,
  voided,
  onPress,
  boxes,
  bottles,
}: {
  type: LedgerEntryType;
  label: string;
  date: string;
  amountCents: number;
  voided?: boolean;
  onPress?: () => void;
  boxes?: number;
  bottles?: number;
}) {
  const { colors } = useTheme();
  const formatAmount = (cents: number) => {
    const val = (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
    return type === 'sale' || type === 'return' ? `-${val}` : `+${val}`;
  };

  const icon = type === 'sale' ? 'cube-outline' : type === 'payment' ? 'cash-outline' : 'return-up-back-outline';
  const amountColor = voided
    ? colors.textMuted
    : type === 'payment'
      ? colors.success
      : colors.danger;

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }, voided && styles.voided]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name={icon} size={18} color={voided ? colors.textMuted : colors.textSecondary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textPrimary }, voided && styles.voidedText]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{date}</Text>
        {type === 'return' && (boxes !== undefined || bottles !== undefined) && (
          <Text style={[styles.containers, { color: colors.textSecondary }]}>
            {boxes ? `${boxes} boxes` : ''}{boxes && bottles ? ', ' : ''}{bottles ? `${bottles} bottles` : ''}
          </Text>
        )}
      </View>
      {type !== 'return' && (
        <Text
          style={[
            styles.amount,
            { color: amountColor },
            voided && styles.voidedText,
          ]}
        >
          {formatAmount(amountCents)}
        </Text>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  voided: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  content: {
    flex: 1,
  },
  label: {
    ...type.bodyMedium,
  },
  date: {
    ...type.caption,
    marginTop: 2,
  },
  containers: {
    ...type.caption,
    marginTop: 1,
  },
  amount: {
    ...type.bodyBold,
    fontSize: 14,
  },
  voidedText: {
    textDecorationLine: 'line-through',
  },
});
