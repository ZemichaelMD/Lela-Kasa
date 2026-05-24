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
import { showToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { radius, spacing, type, shadow } from '../theme';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function PriceTiersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showPricesModal, setShowPricesModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTier, setEditingTier] = useState<{ id: string; name: string; kind: string; isDefault: boolean } | null>(null);
  const [selectedTier, setSelectedTier] = useState<{ id: string; name: string; kind: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formName, setFormName] = useState('');
  const [formKind, setFormKind] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [priceEdits, setPriceEdits] = useState<Record<string, { box: string; bottle: string }>>({});

  const { data, isRefetching, refetch } = useQuery({
    queryKey: QK.priceTiers(),
    queryFn: () => getSdk().priceTiers.list(),
  });

  const tiers = data ?? [];

  const { data: beverages } = useQuery({
    queryKey: QK.beverages(),
    queryFn: () => getSdk().beverages.list({ pageSize: 100 }),
    enabled: !!selectedTier,
  });

  const { data: tierPrices, isLoading: loadingPrices } = useQuery({
    queryKey: ['tier-prices', selectedTier?.id],
    queryFn: () => selectedTier ? getSdk().priceTiers.getPrices(selectedTier.id) : [],
    enabled: !!selectedTier,
  });

  const createMutation = useMutation({
    mutationFn: (dto: { name: string; kind?: string; isDefault?: boolean }) =>
      getSdk().priceTiers.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.priceTiers() });
      setShowAddEditModal(false);
      resetForm();
      showToast(t('priceTierCreated'), 'success');
    },
    onError: () => showToast(t('failedToCreate'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { name?: string; kind?: string; isDefault?: boolean } }) =>
      getSdk().priceTiers.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.priceTiers() });
      setShowAddEditModal(false);
      resetForm();
      showToast(t('priceTierUpdated'), 'success');
    },
    onError: () => showToast(t('failedToUpdate'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => getSdk().priceTiers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.priceTiers() });
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      showToast(t('priceTierDeleted'), 'success');
    },
    onError: () => showToast(t('failedToDelete'), 'error'),
  });

  const savePricesMutation = useMutation({
    mutationFn: ({ tierId, prices }: { tierId: string; prices: { beverageId: string; pricePerBoxCents: number; pricePerBottleCents: number }[] }) =>
      getSdk().priceTiers.setPrices(tierId, prices),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier-prices', selectedTier?.id] });
      setShowPricesModal(false);
      showToast(t('pricesUpdated'), 'success');
    },
    onError: () => showToast(t('failedToUpdatePrices'), 'error'),
  });

  const resetForm = () => {
    setFormName('');
    setFormKind('');
    setFormIsDefault(false);
    setEditingTier(null);
  };

  const openAdd = () => {
    resetForm();
    setShowAddEditModal(true);
  };

  const openEdit = (item: { id: string; name: string; kind: string; isDefault: boolean }) => {
    setEditingTier({ id: item.id, name: item.name, kind: item.kind, isDefault: item.isDefault });
    setFormName(item.name);
    setFormKind(item.kind);
    setFormIsDefault(item.isDefault);
    setShowAddEditModal(true);
  };

  const openPrices = (item: { id: string; name: string; kind: string }) => {
    setSelectedTier(item);
    setPriceEdits({});
    setShowPricesModal(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      showToast(t('enterPriceTierName'), 'error');
      return;
    }
    const dto = {
      name: formName.trim(),
      kind: formKind.trim() || undefined,
      isDefault: formIsDefault,
    };
    if (editingTier) {
      updateMutation.mutate({ id: editingTier.id, dto });
    } else {
      createMutation.mutate(dto);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const handleSavePrices = () => {
    if (!selectedTier || !beverages) return;
    const prices = beverages.data
      .map(bev => {
        const edit = priceEdits[bev.id];
        const existing = tierPrices?.find(p => p.beverageId === bev.id);
        const boxCents = edit ? parseInt(edit.box, 10) * 100 : (existing?.pricePerBoxCents ?? 0);
        const bottleCents = edit ? parseInt(edit.bottle, 10) * 100 : (existing?.pricePerBottleCents ?? 0);
        return { beverageId: bev.id, pricePerBoxCents: isNaN(boxCents) ? 0 : boxCents, pricePerBottleCents: isNaN(bottleCents) ? 0 : bottleCents };
      })
      .filter(p => p.pricePerBoxCents > 0 || p.pricePerBottleCents > 0);
    savePricesMutation.mutate({ tierId: selectedTier.id, prices });
  };

  const getPriceEdit = (bevId: string, field: 'box' | 'bottle') => {
    if (priceEdits[bevId]?.[field]) return priceEdits[bevId][field];
    const existing = tierPrices?.find(p => p.beverageId === bevId);
    if (existing) return String((field === 'box' ? existing.pricePerBoxCents : existing.pricePerBottleCents) / 100);
    return '';
  };

  const updatePriceEdit = (bevId: string, field: 'box' | 'bottle', value: string) => {
    setPriceEdits(prev => ({
      ...prev,
      [bevId]: { ...prev[bevId], [field]: value },
    }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('priceTiersTitle')}</Text>
        <TouchableOpacity onPress={openAdd} hitSlop={8}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {tiers.map(item => (
          <TouchableOpacity key={item.id} style={[styles.card, { backgroundColor: colors.surface }, shadow.sm]} onPress={() => openPrices(item)} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.cardKind, { color: colors.textSecondary }]}>{item.kind}</Text>
              </View>
              {item.isDefault && (
                <View style={[styles.defaultBadge, { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.defaultText, { color: colors.success }]}>{t('default')}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surfaceMuted }]} onPress={(e) => { e.stopPropagation(); openEdit(item); }}>
                <Ionicons name="pencil" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.dangerLight }]} onPress={(e) => { e.stopPropagation(); setDeleteTarget({ id: item.id, name: item.name }); setShowDeleteDialog(true); }}>
                <Ionicons name="trash" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAddEditModal} transparent animationType="slide" onRequestClose={() => setShowAddEditModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, spacing[4]), borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {editingTier ? t('editPriceTier') : t('addPriceTier')}
              </Text>
              <TouchableOpacity onPress={() => setShowAddEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('priceTierName')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={formName}
                onChangeText={setFormName}
                placeholder={t('enterPriceTierName')}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('kind')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={formKind}
                onChangeText={setFormKind}
                placeholder={t('kind')}
                placeholderTextColor={colors.textMuted}
              />
              <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>{t('setDefault')}</Text>
                <TouchableOpacity
                  style={[styles.toggleSwitch, { backgroundColor: formIsDefault ? colors.primary : colors.border }]}
                  onPress={() => setFormIsDefault(!formIsDefault)}
                >
                  <View style={[styles.toggleKnob, { backgroundColor: colors.textInverse, transform: [{ translateX: formIsDefault ? 20 : 0 }] }]} />
                </TouchableOpacity>
              </View>
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

      {/* Prices Modal */}
      <Modal visible={showPricesModal} transparent animationType="slide" onRequestClose={() => setShowPricesModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, spacing[4]), borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('priceTierDetail')}</Text>
              <TouchableOpacity onPress={() => setShowPricesModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {selectedTier && (
                <Text style={[styles.tierSubtitle, { color: colors.textSecondary }]}>{selectedTier.name} - {selectedTier.kind}</Text>
              )}
              {loadingPrices ? (
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('loading')}</Text>
              ) : (
                beverages?.data.map(bev => (
                  <View key={bev.id} style={[styles.priceRow, { backgroundColor: colors.surfaceMuted }]}>
                    <View style={styles.priceInfo}>
                      <Text style={[styles.priceName, { color: colors.textPrimary }]}>{bev.name}</Text>
                      {bev.brand && <Text style={[styles.priceBrand, { color: colors.textMuted }]}>{bev.brand}</Text>}
                    </View>
                    <View style={styles.priceInputs}>
                      <View style={styles.priceInputCol}>
                        <Text style={[styles.priceInputLabel, { color: colors.textMuted }]}>{t('pricePerBox')}</Text>
                        <TextInput
                          style={[styles.priceInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                          value={getPriceEdit(bev.id, 'box')}
                          onChangeText={(v) => updatePriceEdit(bev.id, 'box', v)}
                          placeholder="0.00"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={styles.priceInputCol}>
                        <Text style={[styles.priceInputLabel, { color: colors.textMuted }]}>{t('pricePerBottle')}</Text>
                        <TextInput
                          style={[styles.priceInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                          value={getPriceEdit(bev.id, 'bottle')}
                          onChangeText={(v) => updatePriceEdit(bev.id, 'bottle', v)}
                          placeholder="0.00"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary, opacity: savePricesMutation.isPending ? 0.6 : 1 }]}
                onPress={handleSavePrices}
                disabled={savePricesMutation.isPending}
              >
                <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                  {savePricesMutation.isPending ? t('saving') : t('save')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={showDeleteDialog}
        title={t('deletePriceTier')}
        message={t('confirmDeletePriceTier')}
        destructive
        confirmText={t('delete')}
        cancelText={t('cancel')}
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteDialog(false); setDeleteTarget(null); }}
        isLoading={deleteMutation.isPending}
      />
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
  defaultBadge: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radius.full },
  defaultText: { ...type.micro },
  cardActions: { flexDirection: 'row', gap: spacing[2], justifyContent: 'flex-end' },
  actionButton: { padding: spacing[2], borderRadius: radius.sm },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[5], paddingBottom: spacing[3], borderBottomWidth: 1 },
  modalTitle: { ...type.h3 },
  modalContent: { padding: spacing[5] },
  fieldLabel: { ...type.caption, marginBottom: spacing[1] },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[3], ...type.body },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderRadius: radius.sm, borderWidth: 1, marginBottom: spacing[3] },
  switchLabel: { ...type.body },
  toggleSwitch: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 2 },
  toggleKnob: { width: 20, height: 20, borderRadius: 10 },
  saveButton: { paddingVertical: spacing[3], borderRadius: radius.sm, alignItems: 'center', marginTop: spacing[2] },
  saveButtonText: { ...type.bodyBold },
  tierSubtitle: { ...type.body, marginBottom: spacing[4] },
  loadingText: { ...type.body, textAlign: 'center', paddingVertical: spacing[6] },
  priceRow: { borderRadius: radius.sm, padding: spacing[3], marginBottom: spacing[2] },
  priceInfo: { marginBottom: spacing[2] },
  priceName: { ...type.bodyBold },
  priceBrand: { ...type.micro, marginTop: 1 },
  priceInputs: { flexDirection: 'row', gap: spacing[2] },
  priceInputCol: { flex: 1 },
  priceInputLabel: { ...type.micro, marginBottom: 2 },
  priceInput: { borderWidth: 1, borderRadius: radius.xs, paddingHorizontal: spacing[2], paddingVertical: spacing[2], ...type.body, fontSize: 13 },
});
