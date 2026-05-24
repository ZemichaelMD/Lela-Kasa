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
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';
import { useFormattedDate } from '../components/FormattedDate';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { getSdk } from '../lib/sdk';
import { QK } from '../lib/query-keys';
import type { RecordPaymentDto, RecordReturnDto, LedgerEntry } from '../lib/sdk/resources/customers';
import { SegmentControl } from '../components/SegmentControl';
import { LedgerEntryRow } from '../components/LedgerEntryRow';
import { SaleRow } from '../components/SaleRow';
import { PaymentRow } from '../components/PaymentRow';
import { AmountInput } from '../components/AmountInput';
import { PickerSheet, type PickerItem } from '../components/PickerSheet';
import { showToast } from '../components/Toast';
import { Skeleton } from '../components/Skeleton';
import { DateFilter, type DatePreset } from '../components/DateFilter';
import { t } from '../lib/i18n';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function CustomerDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'CustomerDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { customerId, customerName } = route.params;
  const insets = useSafeAreaInsets();
  const fmtDate = useFormattedDate();

  const [activeTab, setActiveTab] = useState(0);
  const [showVoided, setShowVoided] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<RecordPaymentDto['method']>('CASH');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; name: string } | null>(null);
  const [datePreset, setDatePreset] = useState<string>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showReturnSheet, setShowReturnSheet] = useState(false);
  const [returnBoxes, setReturnBoxes] = useState('');
  const [returnBottles, setReturnBottles] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTierId, setEditTierId] = useState('');
  const [editTierLocked, setEditTierLocked] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    let from: string | undefined;
    let to: string | undefined;

    switch (datePreset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        from = weekAgo.toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
        break;
      case 'custom':
        from = customFrom || undefined;
        to = customTo || undefined;
        break;
    }

    return { from, to };
  };

  const dateRange = getDateRange();

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: QK.customer(customerId),
    queryFn: () => getSdk().customers.findOne(customerId),
  });

  const { data: ledger = [], isLoading: loadingLedger } = useQuery({
    queryKey: QK.customerLedger(customerId),
    queryFn: () => getSdk().customers.getLedger(customerId),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: QK.paymentAccounts(),
    queryFn: () => getSdk().paymentAccounts.list(),
  });

  const { data: tiers = [] } = useQuery({
    queryKey: QK.priceTiers(),
    queryFn: () => getSdk().priceTiers.list(),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (dto: RecordPaymentDto) =>
      getSdk().customers.recordPayment(customerId, dto),
    onSuccess: (updatedCustomer) => {
      queryClient.setQueryData(QK.customer(customerId), updatedCustomer);
      queryClient.invalidateQueries({ queryKey: QK.customerLedger(customerId) });
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
      setShowPaymentSheet(false);
      setPaymentAmount('');
      setSelectedAccount(null);
      showToast(t('paymentRecorded'), 'success');
    },
    onError: () => {
      showToast(t('failedToRecord'), 'error');
    },
  });

  const recordReturnMutation = useMutation({
    mutationFn: (dto: RecordReturnDto) =>
      getSdk().customers.recordReturn(customerId, dto),
    onSuccess: (updatedCustomer) => {
      queryClient.setQueryData(QK.customer(customerId), updatedCustomer);
      queryClient.invalidateQueries({ queryKey: QK.customerLedger(customerId) });
      setShowReturnSheet(false);
      setReturnBoxes('');
      setReturnBottles('');
      setReturnNotes('');
      showToast(t('returnRecorded'), 'success');
    },
    onError: () => {
      showToast(t('failedToRecord'), 'error');
    },
  });

  const remindMutation = useMutation({
    mutationFn: () => getSdk().customers.remind(customerId),
    onSuccess: (res) => {
      if (res.throttled) showToast(res.message, 'info');
      else if (res.success) showToast(res.message, 'success');
      else showToast(res.message, 'error');
    },
    onError: (err: any) => {
      showToast(err?.message ?? t('reminderFailed'), 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (dto: { name?: string; phone?: string; notes?: string; priceTierId?: string; priceTierLocked?: boolean }) =>
      getSdk().customers.update(customerId, dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(QK.customer(customerId), (old: any) => ({ ...old, ...updated }));
      setShowEditSheet(false);
      showToast(t('customerUpdated') as any, 'success');
    },
    onError: (err: any) => showToast(err?.message ?? 'Failed', 'error'),
  });

  function openEditSheet() {
    if (!customer) return;
    setEditName(customer.name);
    setEditPhone(customer.phone ?? '');
    setEditNotes(customer.notes ?? '');
    setEditTierId(customer.priceTierId ?? '');
    setEditTierLocked(customer.priceTierLocked ?? false);
    setShowEditSheet(true);
  }

  const tierName = tiers.find(t => t.id === customer?.priceTierId)?.name;
  const tierLabel = tierName ? `${tierName}${customer?.priceTierLocked ? ' (locked)' : ''}` : t('none');

  const filteredLedger = showVoided ? ledger : ledger.filter(entry => {
    if (entry.type === 'sale') return entry.data.status !== 'VOIDED';
    if (entry.type === 'payment') return !entry.data.voidedAt;
    return true;
  }).filter(entry => {
    if (!dateRange.from && !dateRange.to) return true;
    const entryDate = entry.type === 'sale' ? entry.data.saleDate : entry.type === 'payment' ? entry.data.paidAt : entry.data.createdAt;
    if (!entryDate) return true;
    if (dateRange.from && entryDate < dateRange.from) return false;
    if (dateRange.to && entryDate > dateRange.to) return false;
    return true;
  });

  const salesEntries = filteredLedger.filter(e => e.type === 'sale');
  const paymentEntries = filteredLedger.filter(e => e.type === 'payment');
  const returnEntries = filteredLedger.filter(e => e.type === 'return');

  const accountItems: PickerItem[] = accounts.map(a => ({
    id: a.id,
    label: a.name,
    subtitle: a.kind,
  }));

  const handleRecordPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showToast(t('enterValidAmount'), 'error');
      return;
    }
    if (!selectedAccount) {
      showToast(t('newSale.selectAccount'), 'error');
      return;
    }
    recordPaymentMutation.mutate({
      amountCents: Math.round(amount * 100),
      method: paymentMethod,
      paymentAccountId: selectedAccount.id,
    });
  };

  const handleRecordReturn = () => {
    const boxes = parseInt(returnBoxes, 10) || 0;
    const bottles = parseInt(returnBottles, 10) || 0;
    if (boxes <= 0 && bottles <= 0) {
      showToast(t('enterReturnAmount'), 'error');
      return;
    }
    recordReturnMutation.mutate({
      boxes,
      bottles,
      notes: returnNotes.trim() || undefined,
    });
  };

  const isLoading = loadingCustomer || loadingLedger;
  const tabs = [t('activity'), t('sales'), t('payments'), t('returns')];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={styles.header}>
          <Skeleton width={160} height={28} />
          <Skeleton width={120} height={18} style={{ marginTop: spacing[2] }} />
        </View>
      ) : customer ? (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{customer.name}</Text>
          {customer.phone && (
            <Text style={[styles.phone, { color: colors.textSecondary }]}>{customer.phone}</Text>
          )}
          <View style={styles.tierRow}>
            <Text style={[styles.tierLabel, { color: colors.textMuted }]}>Price tier: {tierLabel}</Text>
            <TouchableOpacity onPress={openEditSheet} style={[styles.tierEditButton, { borderColor: colors.border }]}>
              <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {customer && (
        <View style={[styles.balanceCard, { backgroundColor: colors.surface }]}>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>{t('creditBalance')}</Text>
            <Text style={[styles.balanceValue, { color: customer.creditBalanceCents > 0 ? colors.danger : colors.success }]}>
              {formatCurrency(customer.creditBalanceCents)}
            </Text>
          </View>
          <View style={styles.containersRow}>
            <Text style={[styles.containerText, { color: colors.textSecondary }]}>{t('newSale.boxes')}: {customer.outstandingBoxes}</Text>
            <Text style={[styles.containerText, { color: colors.textSecondary }]}>{t('newSale.bottles')}: {customer.outstandingBottles}</Text>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.payButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowPaymentSheet(true)}
            >
              <Text style={[styles.payButtonText, { color: colors.textInverse }]}>{t('payNow')}</Text>
            </TouchableOpacity>
            {(customer.creditBalanceCents > 0 ||
              customer.outstandingBoxes > 0 ||
              customer.outstandingBottles > 0) && (
              <TouchableOpacity
                style={[styles.remindButton, { borderColor: colors.border }]}
                onPress={() => remindMutation.mutate()}
                disabled={remindMutation.isPending}
              >
                <Ionicons name="notifications-outline" size={16} color={colors.textPrimary} />
                <Text style={[styles.payButtonText, { color: colors.textPrimary }]}>
                  {remindMutation.isPending ? t('reminding') : t('remindCustomer')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <SegmentControl
        segments={tabs}
        activeIndex={activeTab}
        onChange={setActiveTab}
      />

      <TouchableOpacity
        style={[styles.dateFilterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowDateFilter(true)}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.dateFilterText, { color: colors.textSecondary }]}>
          {datePreset === 'all' ? t('allTime') : datePreset === 'today' ? t('today') : datePreset === 'week' ? t('thisWeek') : datePreset === 'month' ? t('thisMonth') : t('custom')}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {showVoided && activeTab === 0 && (
        <TouchableOpacity
          style={styles.voidedToggle}
          onPress={() => setShowVoided(false)}
        >
          <Text style={[styles.voidedToggleText, { color: colors.primary }]}>{t('hideVoided')}</Text>
        </TouchableOpacity>
      )}
      {!showVoided && activeTab === 0 && filteredLedger.length < ledger.length && (
        <TouchableOpacity
          style={styles.voidedToggle}
          onPress={() => setShowVoided(true)}
        >
          <Text style={[styles.voidedToggleText, { color: colors.primary }]}>{t('showVoided')} ({ledger.length - filteredLedger.length})</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.list}>
        {activeTab === 0 && filteredLedger.map((entry, i) => {
          if (entry.type === 'sale') {
            return (
              <LedgerEntryRow
                key={i}
                type="sale"
                label={t('sales')}
                date={fmtDate(entry.date)}
                amountCents={entry.data.creditDeltaCents}
                voided={entry.data.status === 'VOIDED'}
                onPress={() => navigation.navigate('SaleDetail', { saleId: entry.data.id })}
              />
            );
          }
          if (entry.type === 'payment') {
            return (
              <LedgerEntryRow
                key={i}
                type="payment"
                label={t('payments')}
                date={fmtDate(entry.date)}
                amountCents={entry.data.amountCents}
                voided={!!entry.data.voidedAt}
              />
            );
          }
          return (
            <LedgerEntryRow
              key={i}
              type="return"
              label={t('returns')}
              date={fmtDate(entry.date)}
              amountCents={0}
              boxes={entry.data.boxes}
              bottles={entry.data.bottles}
            />
          );
        })}

        {activeTab === 1 && salesEntries.map((entry, i) => {
          if (entry.type !== 'sale') return null;
          return (
            <SaleRow
              key={i}
              date={fmtDate(entry.date)}
              totalCents={entry.data.subtotalCents}
              paidCents={entry.data.paidCents}
              creditDeltaCents={entry.data.creditDeltaCents}
              status={entry.data.status}
              onPress={() => navigation.navigate('SaleDetail', { saleId: entry.data.id })}
            />
          );
        })}

        {activeTab === 2 && paymentEntries.map((entry, i) => {
          if (entry.type !== 'payment') return null;
          return (
            <PaymentRow
              key={i}
              date={fmtDate(entry.date)}
              amountCents={entry.data.amountCents}
              method={entry.data.method}
              voided={!!entry.data.voidedAt}
              type={entry.data.saleId ? 'sale' : 'account'}
            />
          );
        })}

        {activeTab === 3 && returnEntries.map((entry, i) => {
          if (entry.type !== 'return') return null;
          return (
            <LedgerEntryRow
              key={i}
              type="return"
              label={t('returns')}
              date={fmtDate(entry.date)}
              amountCents={0}
              boxes={entry.data.boxes}
              bottles={entry.data.bottles}
            />
          );
        })}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.bottomButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowPaymentSheet(true)}
        >
          <Text style={[styles.bottomButtonText, { color: colors.textInverse }]}>{t('recordPayment')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomButton, styles.bottomButtonSecondary, { backgroundColor: colors.surfaceMuted }]}
          onPress={() => setShowReturnSheet(true)}
        >
          <Text style={[styles.bottomButtonSecondaryText, { color: colors.textPrimary }]}>{t('recordReturn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomButton, styles.bottomButtonSecondary, { backgroundColor: colors.surfaceMuted }]}
          onPress={() => navigation.navigate('NewSale', { customerId })}
        >
          <Text style={[styles.bottomButtonSecondaryText, { color: colors.textPrimary }]}>{t('newSale.title')}</Text>
        </TouchableOpacity>
      </View>

      {/* Payment Sheet Modal */}
      <Modal
        visible={showPaymentSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentSheet(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, spacing[4]), borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('recordPayment')}</Text>
              <TouchableOpacity onPress={() => setShowPaymentSheet(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('amount')}</Text>
              <AmountInput
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="0.00"
              />

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
              <TouchableOpacity
                style={[styles.accountPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowAccountPicker(true)}
              >
                <Text style={[styles.accountPickerText, { color: selectedAccount ? colors.textPrimary : colors.textMuted }]}>
                  {selectedAccount?.name ?? t('newSale.selectAccount')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleRecordPayment}
              disabled={recordPaymentMutation.isPending}
            >
              <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
                {recordPaymentMutation.isPending ? t('newSale.recording') : t('recordPayment')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Return Sheet Modal */}
      <Modal
        visible={showReturnSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReturnSheet(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, spacing[4]), borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('recordReturn')}</Text>
              <TouchableOpacity onPress={() => setShowReturnSheet(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('newSale.boxes')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={returnBoxes}
                onChangeText={setReturnBoxes}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[4] }]}>{t('newSale.bottles')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={returnBottles}
                onChangeText={setReturnBottles}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[4] }]}>{t('notes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={returnNotes}
                onChangeText={setReturnNotes}
                placeholder={t('notes')}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleRecordReturn}
              disabled={recordReturnMutation.isPending}
            >
              <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
                {recordReturnMutation.isPending ? t('saving') : t('recordReturn')}
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
          const account = accounts.find(a => a.id === item.id);
          if (account) setSelectedAccount({ id: account.id, name: account.name });
        }}
        onClose={() => setShowAccountPicker(false)}
      />

      <DateFilter
        visible={showDateFilter}
        selected={datePreset === 'all' ? 'today' : datePreset as DatePreset}
        onSelect={(p) => { setDatePreset(p); }}
        onClose={() => setShowDateFilter(false)}
        showCustom
        customFrom={customFrom}
        customTo={customTo}
        onCustomChange={(from, to) => { setCustomFrom(from); setCustomTo(to); }}
        onApplyCustom={() => { if (customFrom && customTo) { setDatePreset('custom'); } }}
      />

      {/* Edit Customer Modal */}
      <Modal visible={showEditSheet} transparent animationType="slide" onRequestClose={() => setShowEditSheet(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, spacing[4]), borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('editCustomer')}</Text>
              <TouchableOpacity onPress={() => setShowEditSheet(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('fullName')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder={t('fullName')}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('phoneNumber')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder={t('phonePlaceholder') as any}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('customerNotes')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder={t('optionalNotes') as any}
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Default Price Tier</Text>
              {tiers.map(tier => (
                <TouchableOpacity
                  key={tier.id}
                  style={[styles.tierOption, { borderColor: colors.border, backgroundColor: editTierId === tier.id ? colors.primaryLight : 'transparent' }]}
                  onPress={() => setEditTierId(editTierId === tier.id ? '' : tier.id)}
                >
                  <Text style={[styles.tierOptionText, { color: editTierId === tier.id ? colors.primary : colors.textPrimary }]}>
                    {tier.name} ({tier.kind.toLowerCase()})
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.tierOption, { borderColor: colors.border, backgroundColor: editTierId === '' ? colors.primaryLight : 'transparent', marginTop: spacing[2] }]}
                onPress={() => setEditTierId('')}
              >
                <Text style={[styles.tierOptionText, { color: editTierId === '' ? colors.primary : colors.textPrimary }]}>— {t('none')} —</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lockRow, { marginTop: spacing[3] }]}
                onPress={() => setEditTierLocked(!editTierLocked)}
              >
                <Ionicons name={editTierLocked ? 'lock-closed' : 'lock-open-outline'} size={18} color={editTierLocked ? colors.danger : colors.textMuted} />
                <Text style={[styles.lockText, { color: editTierLocked ? colors.danger : colors.textSecondary }]}>
                  Lock price tier (employees can't change)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary, marginTop: spacing[4], opacity: updateMutation.isPending ? 0.6 : 1 }]}
                onPress={() => updateMutation.mutate({
                  name: editName.trim() || undefined,
                  phone: editPhone.trim() || undefined,
                  notes: editNotes.trim() || undefined,
                  priceTierId: editTierId || undefined,
                  priceTierLocked: editTierLocked,
                })}
                disabled={updateMutation.isPending}
              >
                <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                  {updateMutation.isPending ? t('saving') : t('save')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  backButton: {
    width: 40,
    height: 40,
    marginBottom: spacing[2],
  },
  name: {
    ...type.h2,
  },
  phone: {
    ...type.body,
    marginTop: 2,
  },
  balanceCard: {
    marginHorizontal: spacing[5],
    padding: spacing[4],
    borderRadius: radius.md,
    marginBottom: spacing[3],
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    ...type.caption,
  },
  balanceValue: {
    ...type.h2,
  },
  containersRow: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[3],
  },
  containerText: {
    ...type.body,
  },
  actionRow: {
    marginTop: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
  },
  payButton: {
    flex: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  remindButton: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing[1],
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    ...type.bodyBold,
  },
  voidedToggle: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
  },
  voidedToggleText: {
    ...type.caption,
  },
  list: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
  },
  bottomButton: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  bottomButtonText: {
    ...type.bodyBold,
  },
  bottomButtonSecondary: {
  },
  bottomButtonSecondaryText: {
    ...type.bodyBold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing[6],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...type.h3,
  },
  modalContent: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  fieldLabel: {
    ...type.caption,
    marginBottom: spacing[2],
  },
  methodRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  methodChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
  },
  methodChipActive: {
  },
  methodText: {
    ...type.caption,
  },
  accountPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  accountPickerText: {
    ...type.body,
  },
  accountPickerPlaceholder: {
    ...type.body,
  },
  submitButton: {
    borderRadius: radius.md,
    marginHorizontal: spacing[5],
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  submitButtonText: {
    ...type.bodyBold,
    fontSize: 16,
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginHorizontal: spacing[5],
    marginVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dateFilterText: { ...type.bodyMedium, flex: 1 },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing[3], paddingVertical: spacing[3], ...type.body },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  tierRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[1], gap: spacing[2] },
  tierLabel: { ...type.caption },
  tierEditButton: { borderWidth: 1, borderRadius: radius.sm, padding: spacing[1] },
  sectionLabel: { ...type.bodyBold, marginBottom: spacing[2], marginTop: spacing[3] },
  tierOption: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing[3], paddingVertical: spacing[2], marginBottom: spacing[1] },
  tierOptionText: { ...type.caption },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  lockText: { ...type.caption },
  saveButton: { borderRadius: radius.md, paddingVertical: spacing[3], alignItems: 'center' },
  saveButtonText: { ...type.bodyBold },
});
