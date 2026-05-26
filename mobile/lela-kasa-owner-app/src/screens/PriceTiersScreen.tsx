import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { getSdk } from '../lib/sdk';
import { QK } from '../lib/query-keys';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { showToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ModalSheet } from '../components/ModalSheet';
import { radius, spacing, type } from '../theme';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

export default function PriceTiersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
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
    mutationFn: (dto: { name: string; kind?: string; isDefault?: boolean }) => getSdk().priceTiers.create(dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QK.priceTiers() }); setShowAddEditModal(false); resetForm(); showToast(t('priceTierCreated'), 'success'); },
    onError: () => showToast(t('failedToCreate'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => getSdk().priceTiers.update(id, dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QK.priceTiers() }); setShowAddEditModal(false); resetForm(); showToast(t('priceTierUpdated'), 'success'); },
    onError: () => showToast(t('failedToUpdate'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => getSdk().priceTiers.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QK.priceTiers() }); setShowDeleteDialog(false); setDeleteTarget(null); showToast(t('priceTierDeleted'), 'success'); },
    onError: () => showToast(t('failedToDelete'), 'error'),
  });

  const savePricesMutation = useMutation({
    mutationFn: ({ tierId, prices }: { tierId: string; prices: any[] }) => getSdk().priceTiers.setPrices(tierId, prices),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tier-prices', selectedTier?.id] }); setShowPricesModal(false); showToast(t('pricesUpdated'), 'success'); },
    onError: () => showToast(t('failedToUpdatePrices'), 'error'),
  });

  const resetForm = () => { setFormName(''); setFormKind(''); setFormIsDefault(false); setEditingTier(null); };

  const openAdd = () => { resetForm(); setShowAddEditModal(true); };
  const openEdit = (item: typeof editingTier) => {
    if (!item) return;
    setEditingTier(item);
    setFormName(item.name); setFormKind(item.kind); setFormIsDefault(item.isDefault);
    setShowAddEditModal(true);
  };

  const handleSave = () => {
    if (!formName.trim()) { showToast(t('enterPriceTierName'), 'error'); return; }
    const dto = { name: formName.trim(), kind: formKind.trim() || undefined, isDefault: formIsDefault };
    if (editingTier) updateMutation.mutate({ id: editingTier.id, dto });
    else createMutation.mutate(dto);
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

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const inputStyle = [styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }] as any;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('priceTiersTitle')}</Text>
        <TouchableOpacity onPress={openAdd} hitSlop={8} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tiers.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={() => { setSelectedTier(item); setPriceEdits({}); setShowPricesModal(true); }}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.textPrimary }]}>{item.name}</Text>
                {item.kind && <Text style={[styles.cardKind, { color: colors.textSecondary }]}>{item.kind}</Text>}
              </View>
              {item.isDefault && (
                <View style={[styles.defaultPill, { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.defaultText, { color: colors.success }]}>{t('default')}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardRight}>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.surfaceMuted }]}
                onPress={e => { e.stopPropagation(); openEdit(item); }}
              >
                <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.dangerLight }]}
                onPress={e => { e.stopPropagation(); setDeleteTarget({ id: item.id, name: item.name }); setShowDeleteDialog(true); }}
              >
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add/Edit Modal */}
      <ModalSheet
        visible={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editingTier ? t('editPriceTier') : t('addPriceTier')}
        footer={
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.primary }, isSaving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.footerBtnText}>{t('save')}</Text>}
          </TouchableOpacity>
        }
      >
        <Field label={t('priceTierName')}>
          <View style={inputStyle}>
            <Ionicons name="pricetag-outline" size={16} color={colors.textMuted} style={{ marginRight: spacing[2] }} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={formName} onChangeText={setFormName}
              placeholder={t('enterPriceTierName')} placeholderTextColor={colors.textMuted}
            />
          </View>
        </Field>

        <Field label={t('kind')}>
          <View style={inputStyle}>
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={formKind} onChangeText={setFormKind}
              placeholder={t('kind')} placeholderTextColor={colors.textMuted}
            />
          </View>
        </Field>

        <TouchableOpacity
          style={[styles.toggleRow, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
          onPress={() => setFormIsDefault(v => !v)}
          activeOpacity={0.7}
        >
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{t('setDefault')}</Text>
            <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>Make this the default price tier</Text>
          </View>
          <View style={[styles.switchTrack, { backgroundColor: formIsDefault ? colors.primary : colors.border }]}>
            <View style={[styles.switchThumb, { transform: [{ translateX: formIsDefault ? 20 : 2 }] }]} />
          </View>
        </TouchableOpacity>
      </ModalSheet>

      {/* Prices Modal */}
      <ModalSheet
        visible={showPricesModal}
        onClose={() => setShowPricesModal(false)}
        title={t('priceTierDetail')}
        footer={
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.primary }, savePricesMutation.isPending && styles.btnDisabled]}
            onPress={handleSavePrices}
            disabled={savePricesMutation.isPending}
            activeOpacity={0.85}
          >
            {savePricesMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.footerBtnText}>{t('save')}</Text>}
          </TouchableOpacity>
        }
      >
        {selectedTier && (
          <View style={[styles.tierBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.tierBadgeName, { color: colors.primary }]}>{selectedTier.name}</Text>
            {selectedTier.kind && <Text style={[styles.tierBadgeKind, { color: colors.primary }]}>{selectedTier.kind}</Text>}
          </View>
        )}

        {loadingPrices ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.pricesList}>
            {beverages?.data.map((bev, index) => (
              <View
                key={bev.id}
                style={[
                  styles.priceRow,
                  { backgroundColor: index % 2 === 0 ? colors.surface : colors.surfaceMuted },
                ]}
              >
                <View style={styles.priceInfo}>
                  <Text style={[styles.priceName, { color: colors.textPrimary }]}>{bev.name}</Text>
                  {bev.brand && <Text style={[styles.priceBrand, { color: colors.textMuted }]}>{bev.brand}</Text>}
                </View>
                <View style={styles.priceInputs}>
                  <View style={styles.priceInputCol}>
                    <Text style={[styles.priceInputLabel, { color: colors.textMuted }]}>Box</Text>
                    <View style={[styles.priceInput, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <TextInput
                        style={[styles.priceInputText, { color: colors.textPrimary }]}
                        value={getPriceEdit(bev.id, 'box')}
                        onChangeText={v => setPriceEdits(p => ({ ...p, [bev.id]: { ...p[bev.id], box: v } }))}
                        placeholder="0.00" placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <View style={styles.priceInputCol}>
                    <Text style={[styles.priceInputLabel, { color: colors.textMuted }]}>Bottle</Text>
                    <View style={[styles.priceInput, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <TextInput
                        style={[styles.priceInputText, { color: colors.textPrimary }]}
                        value={getPriceEdit(bev.id, 'bottle')}
                        onChangeText={v => setPriceEdits(p => ({ ...p, [bev.id]: { ...p[bev.id], bottle: v } }))}
                        placeholder="0.00" placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ModalSheet>

      <ConfirmDialog
        visible={showDeleteDialog}
        title={t('deletePriceTier')}
        message={t('confirmDeletePriceTier')}
        destructive
        confirmText={t('delete')} cancelText={t('cancel')}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => { setShowDeleteDialog(false); setDeleteTarget(null); }}
        isLoading={deleteMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...type.h3 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing[5], gap: spacing[3], paddingBottom: spacing[8] },
  card: { borderRadius: radius.xl, padding: spacing[4] },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] },
  cardIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { ...type.bodyBold },
  cardKind: { ...type.caption, marginTop: 1 },
  defaultPill: { paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.full },
  defaultText: { ...type.micro, fontWeight: '700' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], justifyContent: 'flex-end' },
  iconBtn: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  // Modal
  field: { marginBottom: spacing[4] },
  fieldLabel: { ...type.caption, fontWeight: '600', marginBottom: spacing[2] },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.lg, paddingHorizontal: spacing[3], height: 50 },
  inputText: { ...type.body, flex: 1, paddingVertical: 0 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing[4], borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing[4] },
  toggleInfo: { flex: 1 },
  toggleLabel: { ...type.bodyMedium },
  toggleDesc: { ...type.caption, marginTop: 2 },
  switchTrack: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderRadius: radius.lg, marginBottom: spacing[4] },
  tierBadgeName: { ...type.bodyBold },
  tierBadgeKind: { ...type.caption },
  loadingWrap: { paddingVertical: spacing[8], alignItems: 'center' },
  pricesList: { borderRadius: radius.lg, overflow: 'hidden' },
  priceRow: { flexDirection: 'row', alignItems: 'center', padding: spacing[3] },
  priceInfo: { flex: 1 },
  priceName: { ...type.bodyMedium, fontSize: 14 },
  priceBrand: { ...type.micro, marginTop: 1 },
  priceInputs: { flexDirection: 'row', gap: spacing[2] },
  priceInputCol: { alignItems: 'center' },
  priceInputLabel: { ...type.micro, marginBottom: 3 },
  priceInput: { width: 70, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing[2], height: 38, justifyContent: 'center' },
  priceInputText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  footerBtn: { height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  footerBtnText: { ...type.bodyBold, fontSize: 16, color: '#fff' },
});
