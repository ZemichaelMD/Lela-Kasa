import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';
import { Pill } from './Pill';

export function PaymentRow({
  date,
  amountCents,
  method,
  voided,
  type: paymentType,
  onPress,
}: {
  date: string;
  amountCents: number;
  method: string;
  voided?: boolean;
  type?: 'sale' | 'account';
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }, voided && styles.voided]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.left}>
        <Text style={[styles.date, { color: colors.textPrimary }, voided && styles.voidedText]}>{date}</Text>
        <Text style={[styles.method, { color: colors.textSecondary }, voided && styles.voidedText]}>{method}</Text>
        {paymentType && (
          <Pill label={paymentType === 'sale' ? 'Sale Payment' : 'Account Payment'} tone="info" size="sm" />
        )}
      </View>
      <View style={styles.right}>
        <Text
          style={[
            styles.amount,
            { color: voided ? colors.textMuted : colors.success },
            voided && styles.voidedText,
          ]}
        >
          {formatCurrency(amountCents)}
        </Text>
        {voided && <Pill label="Voided" tone="danger" size="sm" />}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  voided: {
    opacity: 0.5,
  },
  left: {
    flex: 1,
    gap: spacing[1],
  },
  date: {
    ...type.bodyMedium,
  },
  method: {
    ...type.caption,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  amount: {
    ...type.bodyBold,
    fontSize: 15,
  },
  voidedText: {
    textDecorationLine: 'line-through',
  },
});
