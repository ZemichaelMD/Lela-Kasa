import React, { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
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

type BevItem = {
  id: string; name: string; brand?: string;
  sizeMl?: number; bottlesPerBox: number;
  stockBottles: number; isActive: boolean;
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
      {hint && <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>}
    </View>
  );
}

export default function BeveragesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [showInactive, setShowInactive] = useState(false);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingBeverage, setEditingBeverage] = useState<Omit<BevItem, 'stockBottles' | 'isActive'> | null>(null);
  const [selectedBeverage, setSelectedBeverage] = useState<BevItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formSizeMl, setFormSizeMl] = useState('');
  const [formBottlesPerBox, setFormBottlesPerBox] = useState('');
  const [formStockAmount, setFormStockAmount] = useState('');
  const [entries, setEntries] = useState<Array<{ key: string; name: string; brand: string; sizeMl: string; bottlesPerBox: string }>>([]);

  const { data, isRefetching, refetch } = useQuery({
    queryKey: QK.beverages(),
    queryFn: () => getSdk().beverages.list({ pageSize: 100, isActive: showInactive ? undefined : true }),
  });
  const beverages = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (dtos: Array<{ name: string; brand?: string; sizeMl?: number; bottlesPerBox: number }>) =>
      dtos.length === 1 ? getSdk().beverages.create(dtos[0]).then(b => [b]) : getSdk().beverages.createMany(dtos),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: QK.beverages() });
      setShowAddEditModal(false); resetForm();
      showToast(results.length > 1 ? `${results.length} ${t('beverages')} ${t('beverageCreated').toLowerCase()}` : t('beverageCreated'), 'success');
    },
    onError: () => showToast(t('failedToCreate'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => getSdk().beverages.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.beverages() });
      setShowAddEditModal(false); resetForm();
      showToast(t('beverageUpdated'), 'success');
    },
    onError: () => showToast(t('failedToUpdate'), 'error'),
  });

  const addStockMutation = useMutation({
    mutationFn: ({ id, stockBottles }: { id: string; stockBottles: number }) =>
      getSdk().beverages.update(id, { stockBottles }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.beverages() });
      setShowStockModal(false); setFormStockAmount('');
      showToast(t('stockAdded'), 'success');
    },
    onError: () => showToast(t('failedToAddStock'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => getSdk().beverages.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.beverages() });
      setShowDeleteDialog(false); setDeleteTarget(null);
      showToast(t('beverageDeleted'), 'success');
    },
    onError: () => showToast(t('failedToDelete'), 'error'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      getSdk().beverages.update(id, { isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QK.beverages() }); showToast(t('beverageToggled'), 'success'); },
  });

  const resetForm = () => {
    setFormName(''); setFormBrand(''); setFormSizeMl(''); setFormBottlesPerBox('');
    setEditingBeverage(null); setEntries([]);
  };

  const newEntry = () => ({ key: Math.random().toString(36).slice(2, 8), name: '', brand: '', sizeMl: '', bottlesPerBox: '24' });
  const openAdd = () => { resetForm(); setEntries([newEntry()]); setShowAddEditModal(true); };
  const openEdit = (item: BevItem) => {
    setEditingBeverage({ id: item.id, name: item.name, brand: item.brand, sizeMl: item.sizeMl, bottlesPerBox: item.bottlesPerBox });
    setFormName(item.name); setFormBrand(item.brand ?? '');
    setFormSizeMl(item.sizeMl ? String(item.sizeMl) : '');
    setFormBottlesPerBox(String(item.bottlesPerBox));
    setShowAddEditModal(true);
  };

  const handleSave = () => {
    if (editingBeverage) {
      if (!formName.trim()) { showToast(t('enterBeverageName'), 'error'); return; }
      const bpb = parseInt(formBottlesPerBox, 10);
      if (!bpb || bpb <= 0) { showToast(t('enterValidBottlesPerBox'), 'error'); return; }
      updateMutation.mutate({ id: editingBeverage.id, dto: { name: formName.trim(), brand: formBrand.trim() || undefined, sizeMl: formSizeMl ? parseInt(formSizeMl, 10) : undefined, bottlesPerBox: bpb } });
    } else {
      const valid = entries.filter(e => e.name.trim());
      if (!valid.length) { showToast(t('enterBeverageName'), 'error'); return; }
      for (const e of valid) {
        if (!parseInt(e.bottlesPerBox, 10)) { showToast(t('enterValidBottlesPerBox'), 'error'); return; }
      }
      createMutation.mutate(valid.map(e => ({ name: e.name.trim(), brand: e.brand.trim() || undefined, sizeMl: e.sizeMl ? parseInt(e.sizeMl, 10) : undefined, bottlesPerBox: parseInt(e.bottlesPerBox, 10) })));
    }
  };

  const handleAddStock = () => {
    const amount = parseInt(formStockAmount, 10);
    if (!amount || amount <= 0) { showToast(t('enterStockAmount'), 'error'); return; }
    if (!selectedBeverage) return;
    addStockMutation.mutate({ id: selectedBeverage.id, stockBottles: selectedBeverage.stockBottles + amount });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const inputStyle = [styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }] as any;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('beverages')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowInactive(v => !v)} hitSlop={8} style={[styles.filterBtn, { backgroundColor: showInactive ? colors.primaryLight : colors.surface, borderColor: colors.border }]}>
            <Ionicons name={showInactive ? 'eye' : 'eye-off-outline'} size={16} color={showInactive ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openAdd} hitSlop={8} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {beverages.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={() => { setSelectedBeverage(item); setShowDetailModal(true); }}
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="wine-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.textPrimary }]}>{item.name}</Text>
                {item.brand && <Text style={[styles.cardBrand, { color: colors.textSecondary }]}>{item.brand}</Text>}
              </View>
              {!item.isActive && (
                <View style={[styles.inactivePill, { backgroundColor: colors.surfaceMuted }]}>
                  <Text style={[styles.inactiveText, { color: colors.textMuted }]}>{t('inactive')}</Text>
                </View>
              )}
            </View>
            <View style={[styles.cardStats, { borderTopColor: colors.border }]}>
              <StatCell label={t('bottlesPerBox')} value={String(item.bottlesPerBox)} colors={colors} />
              {item.sizeMl ? <StatCell label={t('sizeMl')} value={`${item.sizeMl}ml`} colors={colors} /> : null}
              <StatCell label={t('stockBottles')} value={String(item.stockBottles)} colors={colors} highlight={item.stockBottles < 10} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add/Edit Modal */}
      <ModalSheet
        visible={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editingBeverage ? t('editBeverage') : t('addBeverage')}
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
        {editingBeverage ? (
          <>
            <Field label={t('beverageName')}>
              <View style={inputStyle}>
                <TextInput style={[styles.inputText, { color: colors.textPrimary }]} value={formName} onChangeText={setFormName} placeholder={t('enterBeverageName')} placeholderTextColor={colors.textMuted} />
              </View>
            </Field>
            <Field label={t('brand')}>
              <View style={inputStyle}>
                <TextInput style={[styles.inputText, { color: colors.textPrimary }]} value={formBrand} onChangeText={setFormBrand} placeholder={t('brand')} placeholderTextColor={colors.textMuted} />
              </View>
            </Field>
            <View style={styles.row2}>
              <View style={styles.col2}>
                <Field label={t('sizeMl')}>
                  <View style={inputStyle}>
                    <TextInput style={[styles.inputText, { color: colors.textPrimary }]} value={formSizeMl} onChangeText={setFormSizeMl} placeholder="500" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
                  </View>
                </Field>
              </View>
              <View style={styles.col2}>
                <Field label={t('bottlesPerBox')}>
                  <View style={inputStyle}>
                    <TextInput style={[styles.inputText, { color: colors.textPrimary }]} value={formBottlesPerBox} onChangeText={setFormBottlesPerBox} placeholder="24" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
                  </View>
                </Field>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.helpText, { color: colors.textMuted }]}>
              Add one or more beverages at once.
            </Text>
            {entries.map((entry, i) => (
              <View key={entry.key} style={[styles.entryCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <View style={styles.entryHeader}>
                  <Text style={[styles.entryNum, { color: colors.textMuted }]}>#{i + 1}</Text>
                  {entries.length > 1 && (
                    <TouchableOpacity onPress={() => setEntries(p => p.filter(e => e.key !== entry.key))} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={[inputStyle, styles.entryInput]}>
                  <TextInput style={[styles.inputText, { color: colors.textPrimary }]} value={entry.name} onChangeText={v => setEntries(p => p.map(e => e.key === entry.key ? { ...e, name: v } : e))} placeholder={t('enterBeverageName')} placeholderTextColor={colors.textMuted} />
                </View>
                <View style={[inputStyle, styles.entryInput]}>
                  <TextInput style={[styles.inputText, { color: colors.textPrimary }]} value={entry.brand} onChangeText={v => setEntries(p => p.map(e => e.key === entry.key ? { ...e, brand: v } : e))} placeholder={t('brand')} placeholderTextColor={colors.textMuted} />
                </View>
                <View style={styles.row2}>
                  <View style={[styles.col2, inputStyle, { marginRight: spacing[2] }]}>
                    <TextInput style={[styles.inputText, { color: colors.textPrimary }]} value={entry.sizeMl} onChangeText={v => setEntries(p => p.map(e => e.key === entry.key ? { ...e, sizeMl: v } : e))} placeholder="ml" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
                  </View>
                  <View style={[styles.col2, inputStyle]}>
                    <TextInput style={[styles.inputText, { color: colors.textPrimary }]} value={entry.bottlesPerBox} onChangeText={v => setEntries(p => p.map(e => e.key === entry.key ? { ...e, bottlesPerBox: v } : e))} placeholder="/box" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addEntryBtn, { borderColor: colors.primary }]}
              onPress={() => setEntries(p => [...p, newEntry()])}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.addEntryText, { color: colors.primary }]}>Add another</Text>
            </TouchableOpacity>
          </>
        )}
      </ModalSheet>

      {/* Detail Modal */}
      <ModalSheet
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={t('beverageDetail')}
        footer={selectedBeverage ? (
          <View style={styles.detailFooterRow}>
            <TouchableOpacity
              style={[styles.detailFooterBtn, { backgroundColor: colors.primary, flex: 2 }]}
              onPress={() => { setShowDetailModal(false); if (selectedBeverage) { setFormStockAmount(''); setShowStockModal(true); } }}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.footerBtnText}>{t('addToStock')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.detailFooterBtn, { backgroundColor: colors.surfaceMuted }]}
              onPress={() => { setShowDetailModal(false); if (selectedBeverage) openEdit(selectedBeverage); }}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.detailFooterBtn, { backgroundColor: colors.dangerLight }]}
              onPress={() => { setShowDetailModal(false); if (selectedBeverage) { setDeleteTarget({ id: selectedBeverage.id, name: selectedBeverage.name }); setShowDeleteDialog(true); } }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ) : undefined}
      >
        {selectedBeverage && (
          <>
            <View style={[styles.detailHero, { backgroundColor: colors.surfaceMuted }]}>
              <View style={[styles.heroIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="wine-outline" size={28} color={colors.primary} />
              </View>
              <View style={styles.heroInfo}>
                <Text style={[styles.heroName, { color: colors.textPrimary }]}>{selectedBeverage.name}</Text>
                {selectedBeverage.brand && (
                  <Text style={[styles.heroBrand, { color: colors.textSecondary }]}>{selectedBeverage.brand}</Text>
                )}
              </View>
            </View>
            <View style={styles.detailGrid}>
              <DetailCell label={t('bottlesPerBox')} value={String(selectedBeverage.bottlesPerBox)} colors={colors} />
              {selectedBeverage.sizeMl ? <DetailCell label={t('sizeMl')} value={`${selectedBeverage.sizeMl}ml`} colors={colors} /> : null}
              <DetailCell label={t('stockBottles')} value={String(selectedBeverage.stockBottles)} colors={colors} />
              <DetailCell label={t('status')} value={selectedBeverage.isActive ? t('active') : t('inactive')} colors={colors} accent={selectedBeverage.isActive ? colors.success : colors.danger} />
            </View>
            <TouchableOpacity
              style={[styles.toggleActiveBtn, { backgroundColor: selectedBeverage.isActive ? colors.surfaceMuted : colors.successLight, borderColor: colors.border }]}
              onPress={() => { toggleActiveMutation.mutate({ id: selectedBeverage.id, isActive: !selectedBeverage.isActive }); setShowDetailModal(false); }}
              activeOpacity={0.7}
            >
              <Ionicons name={selectedBeverage.isActive ? 'eye-off-outline' : 'eye-outline'} size={16} color={selectedBeverage.isActive ? colors.textSecondary : colors.success} />
              <Text style={[styles.toggleActiveText, { color: selectedBeverage.isActive ? colors.textSecondary : colors.success }]}>
                {selectedBeverage.isActive ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ModalSheet>

      {/* Add Stock Modal */}
      <ModalSheet
        visible={showStockModal}
        onClose={() => setShowStockModal(false)}
        title={t('addToStock')}
        footer={
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.primary }, addStockMutation.isPending && styles.btnDisabled]}
            onPress={handleAddStock}
            disabled={addStockMutation.isPending}
            activeOpacity={0.85}
          >
            {addStockMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.footerBtnText}>{t('addToStock')}</Text>}
          </TouchableOpacity>
        }
      >
        {selectedBeverage && (
          <View style={[styles.stockInfo, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.stockInfoLabel, { color: colors.textSecondary }]}>{t('stockBottles')}</Text>
            <Text style={[styles.stockInfoValue, { color: colors.textPrimary }]}>{selectedBeverage.stockBottles}</Text>
          </View>
        )}
        <Field label={t('addStockAmount')}>
          <View style={inputStyle}>
            <Ionicons name="cube-outline" size={16} color={colors.textMuted} style={{ marginRight: spacing[2] }} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={formStockAmount} onChangeText={setFormStockAmount}
              placeholder={t('enterStockAmount')} placeholderTextColor={colors.textMuted}
              keyboardType="number-pad" autoFocus
            />
          </View>
        </Field>
      </ModalSheet>

      <ConfirmDialog
        visible={showDeleteDialog}
        title={t('deleteBeverage')}
        message={t('confirmDeleteBeverage')}
        destructive
        confirmText={t('delete')} cancelText={t('cancel')}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => { setShowDeleteDialog(false); setDeleteTarget(null); }}
        isLoading={deleteMutation.isPending}
      />
    </SafeAreaView>
  );
}

function StatCell({ label, value, colors, highlight }: { label: string; value: string; colors: any; highlight?: boolean }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: highlight ? colors.warning : colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function DetailCell({ label, value, colors, accent }: { label: string; value: string; colors: any; accent?: string }) {
  return (
    <View style={[styles.detailCell, { backgroundColor: colors.surfaceMuted }]}>
      <Text style={[styles.detailCellLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailCellValue, { color: accent ?? colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...type.h3 },
  headerRight: { flexDirection: 'row', gap: spacing[2], alignItems: 'center' },
  filterBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing[5], gap: spacing[3], paddingBottom: spacing[8] },
  card: { borderRadius: radius.xl, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: spacing[4], gap: spacing[3] },
  cardIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { ...type.bodyBold },
  cardBrand: { ...type.caption, marginTop: 1 },
  inactivePill: { paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.full },
  inactiveText: { ...type.micro },
  cardStats: { flexDirection: 'row', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderTopWidth: StyleSheet.hairlineWidth },
  statCell: { flex: 1 },
  statLabel: { ...type.micro, marginBottom: 2 },
  statValue: { ...type.bodyBold, fontSize: 14 },
  // Modal form
  field: { marginBottom: spacing[4] },
  fieldLabel: { ...type.caption, fontWeight: '600', marginBottom: spacing[2] },
  hint: { ...type.micro, marginTop: spacing[1] },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.lg, paddingHorizontal: spacing[3], height: 50 },
  inputText: { ...type.body, flex: 1, paddingVertical: 0 },
  row2: { flexDirection: 'row', gap: spacing[3] },
  col2: { flex: 1 },
  helpText: { ...type.caption, marginBottom: spacing[4] },
  entryCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing[3], marginBottom: spacing[3] },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  entryNum: { ...type.micro },
  entryInput: { marginBottom: spacing[2] },
  addEntryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderWidth: 1.5, borderRadius: radius.lg, borderStyle: 'dashed', marginBottom: spacing[2] },
  addEntryText: { ...type.bodyMedium, fontSize: 14 },
  footerBtn: { height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  footerBtnText: { ...type.bodyBold, fontSize: 16, color: '#fff' },
  detailHero: { flexDirection: 'row', alignItems: 'center', padding: spacing[4], borderRadius: radius.lg, marginBottom: spacing[4], gap: spacing[3] },
  heroIcon: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  heroInfo: { flex: 1 },
  heroName: { ...type.h4 },
  heroBrand: { ...type.caption, marginTop: 2 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[4] },
  detailCell: { width: '47%', borderRadius: radius.md, padding: spacing[3] },
  detailCellLabel: { ...type.micro, marginBottom: 3 },
  detailCellValue: { ...type.bodyBold },
  toggleActiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg, borderWidth: 1 },
  toggleActiveText: { ...type.bodyMedium, fontSize: 14 },
  detailFooterRow: { flexDirection: 'row', gap: spacing[2] },
  detailFooterBtn: { height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[3] },
  stockInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[4], borderRadius: radius.lg, marginBottom: spacing[4] },
  stockInfoLabel: { ...type.body },
  stockInfoValue: { ...type.h3 },
});
