import React from 'react';
import { StyleSheet, Text, TextInput, View, TextInputProps } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';

export function AmountInput({
  value,
  onChangeText,
  placeholder,
  style,
  ...rest
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'style'>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <Text style={[styles.prefix, { color: colors.textSecondary }]}>ETB</Text>
      <TextInput
        style={[styles.input, { color: colors.textPrimary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? '0.00'}
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    height: 48,
  },
  prefix: {
    ...type.bodyBold,
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    ...type.h3,
    paddingVertical: 0,
  },
});
