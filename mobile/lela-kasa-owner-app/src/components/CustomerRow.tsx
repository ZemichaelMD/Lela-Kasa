import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';
import { Pill } from './Pill';

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
  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
  };

  const hasContainers = (outstandingBoxes ?? 0) > 0 || (outstandingBottles ?? 0) > 0;

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.surface }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{name}</Text>
          {phone && (
            <Text style={[styles.phone, { color: colors.textMuted }]}>{phone}</Text>
          )}
        </View>
        {balanceCents > 0 ? (
          <Pill label={formatCurrency(balanceCents)} tone="danger" />
        ) : (
          <Pill label="Paid" tone="success" />
        )}
      </View>

      {hasContainers && (
        <View style={styles.containersRow}>
          {outstandingBoxes !== undefined && outstandingBoxes > 0 && (
            <View style={styles.containerCol}>
              <Text style={[styles.containerLabel, { color: colors.textMuted }]}>Boxes</Text>
              <Text style={[styles.containerValue, { color: colors.textPrimary }]}>{outstandingBoxes}</Text>
            </View>
          )}
          {outstandingBottles !== undefined && outstandingBottles > 0 && (
            <View style={styles.containerCol}>
              <Text style={[styles.containerLabel, { color: colors.textMuted }]}>Bottles</Text>
              <Text style={[styles.containerValue, { color: colors.textPrimary }]}>{outstandingBottles}</Text>
            </View>
          )}
        </View>
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
  name: {
    ...type.bodyBold,
  },
  phone: {
    ...type.micro,
    marginTop: 1,
  },
  containersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  containerCol: {
    flex: 1,
  },
  containerLabel: {
    ...type.micro,
    marginBottom: 1,
  },
  containerValue: {
    ...type.bodyBold,
    fontSize: 13,
    lineHeight: 18,
  },
});
