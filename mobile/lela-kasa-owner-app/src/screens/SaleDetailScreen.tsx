import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import type { PaymentMethod, AddPaymentDto, UpdateSaleDto, UpdateSaleLineDto, UpdateSalePaymentDto } from '../lib/sdk/resources/sales';
import { getSdk } from '../lib/sdk';
import { QK } from '../lib/query-keys';
import { StatusBadge } from '../components/StatusBadge';
import { AmountInput } from '../components/AmountInput';
import { PickerSheet, type PickerItem } from '../components/PickerSheet';
import { PaymentRow } from '../components/PaymentRow';
import { Skeleton } from '../components/Skeleton';
import { showToast } from '../components/Toast';
import { t } from '../lib/i18n';
import { useTheme } from '../context/ThemeContext';
import { useFormattedDate } from '../components/FormattedDate';
import { radius, spacing, type } from '../theme';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function SaleDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'SaleDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { saleId } = route.params;
  const insets = useSafeAreaInsets();
  const fmtDate = useFormattedDate();

  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; name: string } | null>(null);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  const { data: sale, isLoading } = useQuery({
    queryKey: QK.sale(saleId),
    queryFn: () => getSdk().sales.findOne(saleId),
  });

  const { data: accounts } = useQuery({
    queryKey: QK.paymentAccounts(),
    queryFn: () => getSdk().paymentAccounts.list(),
  });

  const voidMutation = useMutation({
    mutationFn: (reason: string) => getSdk().sales.void(saleId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.sale(saleId) });
      if (sale?.customerId) {
        queryClient.invalidateQueries({ queryKey: QK.customer(sale.customerId) });
        queryClient.invalidateQueries({ queryKey: QK.customerLedger(sale.customerId) });
      }
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
      setShowVoidDialog(false);
      setVoidReason('');
      showToast('Sale voided', 'success');
    },
    onError: () => showToast('Failed to void sale', 'error'),
  });

  const addPaymentMutation = useMutation({
    mutationFn: (dto: AddPaymentDto) =>
      getSdk().sales.addPayment(saleId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.sale(saleId) });
      if (sale?.customerId) {
        queryClient.invalidateQueries({ queryKey: QK.customer(sale.customerId) });
        queryClient.invalidateQueries({ queryKey: QK.customerLedger(sale.customerId) });
      }
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
      setShowAddPayment(false);
      setPaymentAmount('');
      setSelectedAccount(null);
      showToast(t('paymentAdded'), 'success');
    },
    onError: () => showToast(t('failedToAddPayment'), 'error'),
  });

  const updateSaleMutation = useMutation({
    mutationFn: (dto: UpdateSaleDto) => getSdk().sales.update(saleId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.sale(saleId) });
      if (sale?.customerId) {
        queryClient.invalidateQueries({ queryKey: QK.customer(sale.customerId) });
        queryClient.invalidateQueries({ queryKey: QK.customerLedger(sale.customerId) });
      }
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
      queryClient.invalidateQueries({ queryKey: QK.sales() });
      setShowEditDialog(false);
      showToast(t('saleUpdated'), 'success');
    },
    onError: () => showToast(t('failedToUpdate'), 'error'),
  });

  const accountItems: PickerItem[] = (accounts ?? []).map(a => ({
    id: a.id,
    label: a.name,
    subtitle: a.kind,
  }));

  const handleVoid = () => {
    if (!voidReason.trim()) {
      showToast(t('reasonForVoiding'), 'error');
      return;
    }
    voidMutation.mutate(voidReason.trim());
  };

  const handleAddPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showToast(t('enterValidAmount'), 'error');
      return;
    }
    if (!selectedAccount) {
      showToast(t('newSale.selectAccount'), 'error');
      return;
    }
    addPaymentMutation.mutate({
      paymentAccountId: selectedAccount.id,
      amountCents: Math.round(amount * 100),
      method: paymentMethod,
    });
  };

  const handleOpenEdit = () => {
    setEditNotes(sale?.notes || '');
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!sale) return;
    const lines: UpdateSaleLineDto[] = sale.lines.map(l => ({
      beverageId: l.beverageId,
      boxes: l.boxes,
      bottles: l.bottles,
    }));
    const payments: UpdateSalePaymentDto[] = sale.payments
      .filter(p => !p.voidedAt)
      .map(p => ({
        paymentAccountId: p.paymentAccountId,
        amountCents: p.amountCents,
        method: p.method as PaymentMethod,
        reference: p.reference,
        notes: p.notes,
        paidAt: p.paidAt,
      }));
    updateSaleMutation.mutate({
      saleDate: sale.saleDate,
      customerId: sale.customerId || '',
      priceTierId: sale.priceTierId,
      notes: editNotes,
      lines,
      payments,
      boxesReturnedOnSale: sale.boxesReturnedOnSale,
      bottlesReturnedOnSale: sale.bottlesReturnedOnSale,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Skeleton width={40} height={40} />
          <Skeleton width={120} height={28} />
        </View>
        <View style={{ paddingHorizontal: spacing[5] }}>
          <Skeleton height={100} />
        </View>
      </SafeAreaView>
    );
  }

  if (!sale) return null;

  const isVoided = sale.status === 'VOIDED';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('saleDetail')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('date')}</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{fmtDate(sale.saleDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('status')}</Text>
            <StatusBadge status={sale.status} />
          </View>
          {sale.customer && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('newSale.customer')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{sale.customer.name}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('lineItems')}</Text>
        <View style={[styles.linesCard, { backgroundColor: colors.surface }]}>
          {sale.lines.map((line, i) => (
            <View key={line.id} style={[styles.lineRow, i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
              <View style={styles.lineInfo}>
                <Text style={[styles.lineName, { color: colors.textPrimary }]}>{line.beverage?.name ?? 'Beverage'}</Text>
                <Text style={[styles.lineQty, { color: colors.textSecondary }]}>
                  {line.boxes > 0 && `${line.boxes} box${line.boxes > 1 ? 'es' : ''}`}
                  {line.boxes > 0 && line.bottles > 0 && ' · '}
                  {line.bottles > 0 && `${line.bottles} bottle${line.bottles > 1 ? 's' : ''}`}
                </Text>
              </View>
              <Text style={[styles.lineTotal, { color: colors.textPrimary }]}>{formatCurrency(line.lineTotalCents)}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('payments')} ({sale.payments.length})</Text>
        {sale.payments.map(payment => (
          <PaymentRow
            key={payment.id}
            date={fmtDate(payment.paidAt ?? payment.createdAt)}
            amountCents={payment.amountCents}
            method={payment.method}
            voided={!!payment.voidedAt}
            type="sale"
            onPress={() =>
              navigation.navigate('PaymentDetail', {
                paymentId: payment.id,
                saleId: sale.id,
              })
            }
          />
        ))}

          <View style={[styles.totalsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{t('newSale.subtotal')}</Text>
            <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{formatCurrency(sale.subtotalCents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{t('newSale.paid')}</Text>
            <Text style={[styles.totalValue, { color: colors.success }]}>{formatCurrency(sale.paidCents)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowFinal, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabelFinal, { color: colors.textPrimary }]}>{t('credit')}</Text>
            <Text style={[styles.totalValueFinal, { color: sale.creditDeltaCents > 0 ? colors.danger : colors.success }]}>
              {formatCurrency(sale.creditDeltaCents)}
            </Text>
          </View>
        </View>

        {!isVoided && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleOpenEdit}
            >
              <Ionicons name="pencil-outline" size={20} color={colors.textInverse} />
              <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>{t('edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddPayment(true)}
            >
              <Ionicons name="cash-outline" size={20} color={colors.textInverse} />
              <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>{t('addPayment')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDanger, { backgroundColor: colors.danger }]}
              onPress={() => setShowVoidDialog(true)}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.textInverse} />
              <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>{t('voidSale')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Void Dialog */}
      <Modal visible={showVoidDialog} transparent animationType="fade">
        <View style={[styles.dialogOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>{t('voidSaleTitle')}</Text>
            <Text style={[styles.dialogSubtitle, { color: colors.textSecondary }]}>{t('voidSaleSubtitle')}</Text>
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

      {/* Add Payment Modal */}
      <Modal visible={showAddPayment} transparent animationType="slide" onRequestClose={() => setShowAddPayment(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, spacing[4]), borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('addPayment')}</Text>
              <TouchableOpacity onPress={() => setShowAddPayment(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('amount')}</Text>
              <AmountInput value={paymentAmount} onChangeText={setPaymentAmount} placeholder="0.00" />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[4] }]}>{t('method')}</Text>
              <View style={styles.methodRow}>
                {(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodChip, { backgroundColor: paymentMethod === m ? colors.primary : colors.surfaceMuted }]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text style={[styles.methodText, { color: paymentMethod === m ? colors.textInverse : colors.textSecondary }]}>
                      {t(m === 'CASH' ? 'newSale.cash' : m === 'BANK_TRANSFER' ? 'newSale.bankTransfer' : m === 'MOBILE_MONEY' ? 'newSale.mobileMoney' : 'newSale.other')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[4] }]}>{t('account')}</Text>
              <TouchableOpacity style={[styles.accountPicker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowAccountPicker(true)}>
                <Text style={[styles.accountPickerText, { color: selectedAccount ? colors.textPrimary : colors.textMuted }]}>
                  {selectedAccount?.name ?? t('newSale.selectAccount')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleAddPayment} disabled={addPaymentMutation.isPending}>
              <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
                {addPaymentMutation.isPending ? t('adding') : t('addPayment')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PickerSheet
        visible={showAccountPicker}
        title={t('account')}
        items={accountItems}
        onSelect={(item) => {
          const a = accounts?.find(x => x.id === item.id);
          if (a) setSelectedAccount({ id: a.id, name: a.name });
        }}
        onClose={() => setShowAccountPicker(false)}
      />

      {/* Edit Sale Dialog */}
      <Modal visible={showEditDialog} transparent animationType="fade">
        <View style={[styles.dialogOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>{t('editSale')}</Text>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('notes')}</Text>
            <TextInput
              style={[styles.dialogInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
              placeholder={t('addNotes')}
              placeholderTextColor={colors.textMuted}
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={[styles.dialogCancel, { backgroundColor: colors.surfaceMuted }]} onPress={() => setShowEditDialog(false)}>
                <Text style={[styles.dialogCancelText, { color: colors.textPrimary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogConfirm, { backgroundColor: colors.primary }]} onPress={handleSaveEdit} disabled={updateSaleMutation.isPending}>
                <Text style={[styles.dialogConfirmText, { color: colors.textInverse }]}>
                  {updateSaleMutation.isPending ? t('saving') : t('save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  scrollContent: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },
  infoCard: {
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  infoLabel: { ...type.caption },
  infoValue: { ...type.bodyMedium },
  sectionTitle: { ...type.h4, marginBottom: spacing[2] },
  linesCard: {
    borderRadius: radius.md,
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
  },
  lineRowBorder: { borderTopWidth: 1 },
  lineInfo: { flex: 1 },
  lineName: { ...type.bodyMedium },
  lineQty: { ...type.caption, marginTop: 2 },
  lineTotal: { ...type.bodyBold },
  totalsCard: {
    borderRadius: radius.md,
    padding: spacing[4],
    marginTop: spacing[4],
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[2] },
  totalLabel: { ...type.body },
  totalValue: { ...type.bodyBold },
  totalRowFinal: { borderTopWidth: 1, marginTop: spacing[2], paddingTop: spacing[3] },
  totalLabelFinal: { ...type.bodyMedium },
  totalValueFinal: { ...type.h4 },
  actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[6] },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radius.md,
    paddingVertical: spacing[3],
  },
  actionButtonDanger: { },
  actionButtonText: { ...type.bodyBold },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingBottom: spacing[4], borderBottomWidth: 1 },
  modalTitle: { ...type.h3 },
  modalContent: { paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  fieldLabel: { ...type.caption, marginBottom: spacing[2] },
  methodRow: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  methodChip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.sm },
  methodChipActive: { },
  methodText: { ...type.caption },
  accountPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  accountPickerText: { ...type.body },
  accountPickerPlaceholder: { ...type.body },
  submitButton: { borderRadius: radius.md, marginHorizontal: spacing[5], paddingVertical: spacing[4], alignItems: 'center' },
  submitButtonText: { ...type.bodyBold, fontSize: 16 },
});
