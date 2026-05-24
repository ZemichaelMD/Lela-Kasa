import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { getSdk } from '../lib/sdk';
import { QK } from '../lib/query-keys';
import { t } from '../lib/i18n';
import { showToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function PaymentDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'PaymentDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { paymentId, saleId } = route.params;

  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const voidPaymentMutation = useMutation({
    mutationFn: (reason: string) => {
      if (!saleId) throw new Error('No sale ID');
      return getSdk().sales.voidPayment(saleId, paymentId, reason);
    },
    onSuccess: () => {
      if (saleId) {
        queryClient.invalidateQueries({ queryKey: QK.sale(saleId) });
      }
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
      setShowVoidDialog(false);
      setVoidReason('');
      navigation.goBack();
      Alert.alert(t('success'), t('paymentVoided'));
    },
    onError: () => Alert.alert(t('error'), t('failedToVoidPayment')),
  });

  const handleVoid = () => {
    if (!voidReason.trim()) {
      Alert.alert(t('error'), 'Please provide a reason');
      return;
    }
    voidPaymentMutation.mutate(voidReason.trim());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('paymentDetail')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.amountCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>{t('amount')}</Text>
          <Text style={[styles.amountValue, { color: colors.success }]}>{formatCurrency(0)}</Text>
        </View>

        <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('method')}</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>—</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('date')}</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>—</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('status')}</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{saleId ? t('salePayment') : t('accountPayment')}</Text>
          </View>
        </View>

        {saleId && (
          <TouchableOpacity
            style={[styles.voidButton, { backgroundColor: colors.danger }]}
            onPress={() => setShowVoidDialog(true)}
          >
            <Ionicons name="close-circle-outline" size={20} color={colors.textInverse} />
            <Text style={[styles.voidButtonText, { color: colors.textInverse }]}>{t('voidPayment')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showVoidDialog} transparent animationType="fade">
        <View style={[styles.dialogOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>{t('voidPaymentTitle')}</Text>
            <Text style={[styles.dialogSubtitle, { color: colors.textSecondary }]}>{t('voidPaymentSubtitle')}</Text>
            <TextInput
              style={[styles.dialogInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
              placeholder={t('reasonForVoiding')}
              placeholderTextColor={colors.textMuted}
              value={voidReason}
              onChangeText={setVoidReason}
              multiline
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={[styles.dialogCancel, { backgroundColor: colors.surfaceMuted }]} onPress={() => setShowVoidDialog(false)}>
                <Text style={[styles.dialogCancelText, { color: colors.textPrimary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogConfirm, { backgroundColor: colors.danger }]} onPress={handleVoid}>
                <Text style={[styles.dialogConfirmText, { color: colors.textInverse }]}>{t('void')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  headerTitle: { ...type.h3 },
  content: { flex: 1, paddingHorizontal: spacing[5] },
  amountCard: {
    borderRadius: radius.md,
    padding: spacing[6],
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  amountLabel: { ...type.caption, marginBottom: spacing[2] },
  amountValue: { ...type.h1 },
  detailCard: {
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[6],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  detailLabel: { ...type.body },
  detailValue: { ...type.bodyMedium },
  voidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radius.md,
    paddingVertical: spacing[4],
  },
  voidButtonText: { ...type.bodyBold },
  dialogOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dialog: {
    borderRadius: radius.lg,
    padding: spacing[5],
    width: '85%',
    maxWidth: 340,
  },
  dialogTitle: { ...type.h3, marginBottom: spacing[2] },
  dialogSubtitle: { ...type.body, marginBottom: spacing[4] },
  dialogInput: {
    ...type.body,
    borderRadius: radius.sm,
    padding: spacing[3],
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing[4],
  },
  dialogButtons: { flexDirection: 'row', gap: spacing[3] },
  dialogCancel: { flex: 1, paddingVertical: spacing[3], alignItems: 'center', borderRadius: radius.sm },
  dialogCancelText: { ...type.bodyBold },
  dialogConfirm: { flex: 1, paddingVertical: spacing[3], alignItems: 'center', borderRadius: radius.sm },
  dialogConfirmText: { ...type.bodyBold },
});
