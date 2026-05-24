import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';
import { Pill } from './Pill';

export function SaleRow({
  date,
  totalCents,
  paidCents,
  creditDeltaCents,
  status,
  customerName,
  lineCount,
  onPress,
}: {
  date: string;
  totalCents: number;
  paidCents: number;
  creditDeltaCents: number;
  status: string;
  customerName?: string;
  lineCount?: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
  };

  const statusTone = status === 'VOIDED' ? 'danger' : status === 'DRAFT' ? 'warning' : 'success';
  const isPaid = creditDeltaCents <= 0;

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.surface }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.date, { color: colors.textMuted }]}>{date}</Text>
          {customerName && (
            <Text style={[styles.customer, { color: colors.textPrimary }]} numberOfLines={1}>{customerName}</Text>
          )}
        </View>
        <Pill label={status} tone={statusTone} />
      </View>

      <View style={styles.amountsRow}>
        <View style={styles.amountCol}>
          <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.amountValue, { color: colors.textPrimary }]}>{formatCurrency(totalCents)}</Text>
        </View>
        <View style={styles.amountCol}>
          <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Paid</Text>
          <Text style={[styles.amountValue, { color: colors.success }]}>{formatCurrency(paidCents)}</Text>
        </View>
        {creditDeltaCents > 0 && (
          <View style={styles.amountCol}>
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Credit</Text>
            <Text style={[styles.amountValue, { color: colors.danger }]}>{formatCurrency(creditDeltaCents)}</Text>
          </View>
        )}
        {isPaid && creditDeltaCents === 0 && paidCents > 0 && (
          <View style={styles.amountCol}>
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Status</Text>
            <Text style={[styles.paidBadge, { color: colors.success }]}>Paid</Text>
          </View>
        )}
      </View>

      {lineCount !== undefined && (
        <Text style={[styles.footer, { color: colors.textMuted }]}>{lineCount} item{lineCount !== 1 ? 's' : ''}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[3],
    marginHorizontal: spacing[5],
    marginVertical: 1,
    borderRadius: radius.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[1],
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing[2],
  },
  date: {
    ...type.micro,
  },
  customer: {
    ...type.caption,
    marginTop: 1,
  },
  amountsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  amountCol: {
    flex: 1,
  },
  amountLabel: {
    ...type.micro,
    marginBottom: 1,
  },
  amountValue: {
    ...type.bodyBold,
    fontSize: 13,
    lineHeight: 18,
  },
  paidBadge: {
    ...type.caption,
    fontWeight: '600',
  },
  footer: {
    ...type.micro,
    marginTop: spacing[1],
  },
});
