import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { getSdk } from '../lib/sdk';
import { QK } from '../lib/query-keys';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { radius, spacing, type } from '../theme';
import { showToast } from '../components/Toast';

function getAccountIcon(kind: string): keyof typeof Ionicons.glyphMap {
  switch (kind.toUpperCase()) {
    case 'CASH': return 'cash-outline';
    case 'BANK': return 'business-outline';
    case 'MOBILE_MONEY': return 'phone-portrait-outline';
    default: return 'wallet-outline';
  }
}

const KIND_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'OTHER', label: 'Other' },
];

export default function PaymentAccountsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{ id: string; name: string; kind: string; holderName?: string; bankName?: string; accountNumber?: string; notes?: string; isActive: boolean } | null>(null);
  const [formName, setFormName] = useState('');
  const [formKind, setFormKind] = useState('CASH');
  const [formHolderName, setFormHolderName] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [showKindPicker, setShowKindPicker] = useState(false);

  const { data, isRefetching, refetch } = useQuery({
    queryKey: QK.paymentAccounts(),
    queryFn: () => getSdk().paymentAccounts.list(),
  });

  const accounts = data ?? [];

  const createMutation = useMutation({
    mutationFn: (dto: { name: string; kind: string; holderName?: string; bankName?: string; accountNumber?: string; notes?: string }) =>
      getSdk().paymentAccounts.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.paymentAccounts() });
      setShowAddEditModal(false);
      resetForm();
      showToast(t('paymentAccountCreated'), 'success');
    },
    onError: () => showToast(t('failedToCreate'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { name?: string; kind?: string; holderName?: string; bankName?: string; accountNumber?: string; isActive?: boolean; notes?: string } }) =>
      getSdk().paymentAccounts.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.paymentAccounts() });
      setShowAddEditModal(false);
      resetForm();
      showToast(t('paymentAccountUpdated'), 'success');
    },
    onError: () => showToast(t('failedToUpdate'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => getSdk().paymentAccounts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.paymentAccounts() });
      showToast(t('paymentAccountDeleted'), 'success');
    },
    onError: () => showToast(t('failedToDelete'), 'error'),
  });

  const resetForm = () => {
    setFormName('');
    setFormKind('CASH');
    setFormHolderName('');
    setFormBankName('');
    setFormAccountNumber('');
    setFormNotes('');
    setFormIsActive(true);
    setEditingAccount(null);
  };

  const openAdd = () => {
    resetForm();
    setShowAddEditModal(true);
  };

  const openEdit = (item: { id: string; name: string; kind: string; holderName?: string; bankName?: string; accountNumber?: string; notes?: string; isActive: boolean }) => {
    setEditingAccount({ id: item.id, name: item.name, kind: item.kind, holderName: item.holderName, bankName: item.bankName, accountNumber: item.accountNumber, notes: item.notes, isActive: item.isActive });
    setFormName(item.name);
    setFormKind(item.kind);
    setFormHolderName(item.holderName || '');
    setFormBankName(item.bankName || '');
    setFormAccountNumber(item.accountNumber || '');
    setFormNotes(item.notes || '');
    setFormIsActive(item.isActive);
    setShowAddEditModal(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      showToast(t('enterAccountName'), 'error');
      return;
    }
    const dto = {
      name: formName.trim(),
      kind: formKind,
      holderName: formHolderName.trim() || undefined,
      bankName: formBankName.trim() || undefined,
      accountNumber: formAccountNumber.trim() || undefined,
      notes: formNotes.trim() || undefined,
      ...(editingAccount ? { isActive: formIsActive } : {}),
    };
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, dto });
    } else {
      createMutation.mutate(dto);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(t('deletePaymentAccount'), t('confirmDeletePaymentAccount'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive' as const, onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const selectedKindLabel = KIND_OPTIONS.find(k => k.value === formKind)?.label || formKind;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('paymentAccountsTitle')}</Text>
        <TouchableOpacity onPress={openAdd} hitSlop={8}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {accounts.map(item => (
          <View key={item.id} style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={getAccountIcon(item.kind)} size={20} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.cardKind, { color: colors.textSecondary }]}>{item.kind.replace('_', ' ')}</Text>
              </View>
              {!item.isActive && (
                <View style={[styles.inactiveBadge, { backgroundColor: colors.surfaceMuted }]}>
                  <Text style={[styles.inactiveText, { color: colors.textMuted }]}>{t('inactive')}</Text>
                </View>
              )}
            </View>
            {(item.holderName || item.bankName || item.accountNumber) && (
              <View style={styles.cardDetails}>
                {item.holderName && (
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {item.holderName}
                  </Text>
                )}
                {item.bankName && (
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {item.bankName}
                  </Text>
                )}
                {item.accountNumber && (
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    ****{item.accountNumber.slice(-4)}
                  </Text>
                )}
              </View>
            )}
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surfaceMuted }]} onPress={() => openEdit(item)}>
                <Ionicons name="pencil" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surfaceMuted }]} onPress={() => handleDelete(item.id, item.name)}>
                <Ionicons name="trash" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddEditModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, spacing[4]), borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {editingAccount ? t('editPaymentAccount') : t('addPaymentAccount')}
              </Text>
              <TouchableOpacity onPress={() => setShowAddEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('accountName')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={formName}
                onChangeText={setFormName}
                placeholder={t('enterAccountName')}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('accountType')}</Text>
              <TouchableOpacity
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowKindPicker(!showKindPicker)}
              >
                <Text style={{ color: formKind ? colors.textPrimary : colors.textMuted, ...type.body }}>{selectedKindLabel}</Text>
              </TouchableOpacity>
              {showKindPicker && (
                <View style={[styles.kindPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {KIND_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.kindOption, { borderBottomColor: colors.border }]}
                      onPress={() => { setFormKind(opt.value); setShowKindPicker(false); }}
                    >
                      <Text style={[styles.kindOptionText, { color: formKind === opt.value ? colors.primary : colors.textPrimary }]}>
                        {opt.label}
                      </Text>
                      {formKind === opt.value && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('holderName')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={formHolderName}
                onChangeText={setFormHolderName}
                placeholder={t('holderName')}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('bankName')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={formBankName}
                onChangeText={setFormBankName}
                placeholder={t('bankName')}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('accountNumber')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={formAccountNumber}
                onChangeText={setFormAccountNumber}
                placeholder={t('accountNumber')}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('notes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={formNotes}
                onChangeText={setFormNotes}
                placeholder={t('notes')}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
              {editingAccount && (
                <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>{t('active')}</Text>
                  <Switch
                    value={formIsActive}
                    onValueChange={setFormIsActive}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.textInverse}
                  />
                </View>
              )}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary, opacity: createMutation.isPending || updateMutation.isPending ? 0.6 : 1 }]}
                onPress={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                  {createMutation.isPending || updateMutation.isPending ? t('saving') : t('save')}
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
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  title: { ...type.h3 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing[5], paddingBottom: spacing[6] },
  card: { borderRadius: radius.md, padding: spacing[4], marginBottom: spacing[2] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2] },
  cardIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing[3] },
  cardInfo: { flex: 1 },
  cardName: { ...type.bodyBold },
  cardKind: { ...type.caption, marginTop: 1 },
  inactiveBadge: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radius.full },
  inactiveText: { ...type.micro },
  cardDetails: { flexDirection: 'row', gap: spacing[4], marginBottom: spacing[2] },
  detailText: { ...type.caption },
  cardActions: { flexDirection: 'row', gap: spacing[2], justifyContent: 'flex-end' },
  actionButton: { padding: spacing[2], borderRadius: radius.sm },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[5], paddingBottom: spacing[3], borderBottomWidth: 1 },
  modalTitle: { ...type.h3 },
  modalContent: { padding: spacing[5] },
  fieldLabel: { ...type.caption, marginBottom: spacing[1] },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[3], ...type.body },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  kindPicker: { borderWidth: 1, borderRadius: radius.sm, marginBottom: spacing[3], overflow: 'hidden' },
  kindOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1 },
  kindOptionText: { ...type.body },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderRadius: radius.sm, borderWidth: 1, marginBottom: spacing[3] },
  switchLabel: { ...type.body },
  saveButton: { paddingVertical: spacing[3], borderRadius: radius.sm, alignItems: 'center', marginTop: spacing[2] },
  saveButtonText: { ...type.bodyBold },
});
