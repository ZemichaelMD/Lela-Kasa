import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { radius, shadow, spacing } from '../theme';

export function NewSaleFAB({ customerId }: { customerId?: string }) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.primary }]}
      onPress={() => navigation.navigate('NewSale', { customerId })}
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={28} color={colors.textInverse} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing[5],
    bottom: 100, // moved up to clear the tab bar
    width: 56,
    height: 56,
    borderRadius: 16, // squarcle — not a full circle
    ...shadow.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
