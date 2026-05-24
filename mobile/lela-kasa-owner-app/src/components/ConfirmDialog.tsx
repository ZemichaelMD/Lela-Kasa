import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: destructive ? colors.dangerLight : colors.primaryLight }]}>
              <Ionicons
                name={destructive ? 'trash-outline' : 'checkmark-circle-outline'}
                size={24}
                color={destructive ? colors.danger : colors.primary}
              />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.surfaceMuted }]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: destructive ? colors.danger : colors.primary, opacity: isLoading ? 0.6 : 1 }]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              <Text style={[styles.buttonText, { color: colors.textInverse }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  dialog: { width: '100%', borderRadius: radius.xl, padding: spacing[5], alignItems: 'center' },
  iconContainer: { marginBottom: spacing[3] },
  iconCircle: { width: 56, height: 56, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.h3, marginBottom: spacing[2], textAlign: 'center' },
  message: { ...type.body, textAlign: 'center', marginBottom: spacing[5] },
  buttonRow: { flexDirection: 'row', gap: spacing[3], width: '100%' },
  button: { flex: 1, paddingVertical: spacing[3], borderRadius: radius.sm, alignItems: 'center' },
  buttonText: { ...type.bodyBold },
});
