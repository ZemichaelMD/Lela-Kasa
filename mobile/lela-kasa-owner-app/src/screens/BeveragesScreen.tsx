import React, { useState } from 'react';
import {
  Modal,
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

export default function BeveragesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingBeverage, setEditingBeverage] = useState<{ id: string; name: string; brand?: string; sizeMl?: number; bottlesPerBox: number } | null>(null);
  const [selectedBeverage, setSelectedBeverage] = useState<{ id: string; name: string; brand?: string; sizeMl?: number; bottlesPerBox: number; stockBottles: number; isActive: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formSizeMl, setFormSizeMl] = useState('');
  const [formBottlesPerBox, setFormBottlesPerBox] = useState('');
  const [formStockAmount, setFormStockAmount] = useState('');

  // Multi-entry state for bulk add
  const [entries, setEntries] = useState<Array<{ key: string; name: string; brand: string; sizeMl: string; bottlesPerBox: string }>>([]);

  const { data, isRefetching, refetch } = useQuery({
    queryKey: QK.beverages(),
    queryFn: () => getSdk().beverages.list({ pageSize: 100, isActive: showInactive ? undefined : true }),
  });

  const beverages = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (dtos: Array<{ name: string; brand?: string; sizeMl?: number; bottlesPerBox: number }>) =>
      dtos.length === 1
        ? getSdk().beverages.create(dtos[0]).then((b) => [b])
        : getSdk().beverages.createMany(dtos),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: QK.beverages() });
      setShowAddEditModal(false);
      resetForm();
      showToast(results.length > 1 ? `${results.length} ${t('beverages')} ${t('beverageCreated').toLowerCase()}` : t('beverageCreated'), 'success');
    },
    onError: () => showToast(t('failedToCreate'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { name?: string; brand?: string; sizeMl?: number; bottlesPerBox?: number } }) =>
      getSdk().beverages.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.beverages() });
      setShowAddEditModal(false);
      resetForm();
      showToast(t('beverageUpdated'), 'success');
    },
    onError: () => showToast(t('failedToUpdate'), 'error'),
  });

  const addStockMutation = useMutation({
    mutationFn: ({ id, stockBottles }: { id: string; stockBottles: number }) =>
      getSdk().beverages.update(id, { stockBottles }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.beverages() });
      setShowStockModal(false);
      setFormStockAmount('');
      showToast(t('stockAdded'), 'success');
    },
    onError: () => showToast(t('failedToAddStock'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => getSdk().beverages.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.beverages() });
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      showToast(t('beverageDeleted'), 'success');
    },
    onError: () => showToast(t('failedToDelete'), 'error'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      getSdk().beverages.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.beverages() });
      showToast(t('beverageToggled'), 'success');
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormBrand('');
    setFormSizeMl('');
    setFormBottlesPerBox('');
    setEditingBeverage(null);
    setEntries([]);
  };

  function newEntry() {
    return { key: Math.random().toString(36).slice(2, 8), name: '', brand: '', sizeMl: '', bottlesPerBox: '24' };
  }

  const openAdd = () => {
    resetForm();
    setEntries([newEntry()]);
    setShowAddEditModal(true);
  };

  const openEdit = (item: { id: string; name: string; brand?: string; sizeMl?: number; bottlesPerBox: number }) => {
    setEditingBeverage({ id: item.id, name: item.name, brand: item.brand, sizeMl: item.sizeMl, bottlesPerBox: item.bottlesPerBox });
    setFormName(item.name);
    setFormBrand(item.brand || '');
    setFormSizeMl(item.sizeMl ? String(item.sizeMl) : '');
    setFormBottlesPerBox(String(item.bottlesPerBox));
    setShowAddEditModal(true);
  };

  const openDetail = (item: { id: string; name: string; brand?: string; sizeMl?: number; bottlesPerBox: number; stockBottles: number; isActive: boolean }) => {
    setSelectedBeverage(item);
    setShowDetailModal(true);
  };

  const openAddStock = (item: { id: string; name: string; brand?: string; sizeMl?: number; bottlesPerBox: number; stockBottles: number; isActive: boolean }) => {
    setSelectedBeverage(item);
    setFormStockAmount('');
    setShowStockModal(true);
  };

  function updateEntry(key: string, field: string, value: string) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, [field]: value } : e)));
  }

  function addEntry() {
    setEntries((prev) => [...prev, newEntry()]);
  }

  function removeEntry(key: string) {
    setEntries((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((e) => e.key !== key);
    });
  }

  const handleSave = () => {
    if (editingBeverage) {
      if (!formName.trim()) {
        showToast(t('enterBeverageName'), 'error');
        return;
      }
      const bottlesPerBox = parseInt(formBottlesPerBox, 10);
      if (!bottlesPerBox || bottlesPerBox <= 0) {
        showToast(t('enterValidBottlesPerBox'), 'error');
        return;
      }
      const dto = {
        name: formName.trim(),
        brand: formBrand.trim() || undefined,
        sizeMl: formSizeMl ? parseInt(formSizeMl, 10) : undefined,
        bottlesPerBox,
      };
      updateMutation.mutate({ id: editingBeverage.id, dto });
    } else {
      const valid = entries.filter((e) => e.name.trim());
      if (valid.length === 0) {
        showToast(t('enterBeverageName'), 'error');
        return;
      }
      for (const e of valid) {
        const bpb = parseInt(e.bottlesPerBox, 10);
        if (!bpb || bpb <= 0) {
          showToast(t('enterValidBottlesPerBox'), 'error');
          return;
        }
      }
      const dtos = valid.map((e) => ({
        name: e.name.trim(),
        brand: e.brand.trim() || undefined,
        sizeMl: e.sizeMl ? parseInt(e.sizeMl, 10) : undefined,
        bottlesPerBox: parseInt(e.bottlesPerBox, 10),
      }));
      createMutation.mutate(dtos);
    }
  };

  const handleAddStock = () => {
    const amount = parseInt(formStockAmount, 10);
    if (!amount || amount <= 0) {
      showToast(t('enterStockAmount'), 'error');
      return;
    }
    if (!selectedBeverage) return;
    const newStock = (selectedBeverage as any).stockBottles + amount;
    addStockMutation.mutate({ id: selectedBeverage.id, stockBottles: newStock });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('beverages')}</Text>
        <TouchableOpacity onPress={openAdd} hitSlop={8}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.toggleButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowInactive(!showInactive)}
      >
        <Ionicons name={showInactive ? 'eye' : 'eye-off'} size={18} color={colors.textSecondary} />
        <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
          {showInactive ? t('showInactive') : t('hideInactive')}
        </Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {beverages.map(item => (
          <TouchableOpacity key={item.id} style={[styles.card, { backgroundColor: colors.surface }, shadow.sm]} onPress={() => openDetail(item)} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="wine-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.textPrimary }]}>{item.name}</Text>
                {item.brand && <Text style={[styles.cardBrand, { color: colors.textSecondary }]}>{item.brand}</Text>}
              </View>
              {!item.isActive && (
                <View style={[styles.inactiveBadge, { backgroundColor: colors.surfaceMuted }]}>
                  <Text style={[styles.inactiveText, { color: colors.textMuted }]}>{t('inactive')}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardDetails}>
              <View style={styles.detailCol}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('bottlesPerBox')}</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.bottlesPerBox}</Text>
              </View>
              {item.sizeMl && (
                <View style={styles.detailCol}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('sizeMl')}</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.sizeMl}ml</Text>
                </View>
              )}
              <View style={styles.detailCol}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('stockBottles')}</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.stockBottles}</Text>
              </View>
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
                {editingBeverage ? t('editBeverage') : t('addBeverage')}
              </Text>
              <TouchableOpacity onPress={() => setShowAddEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {editingBeverage ? (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('beverageName')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder={t('enterBeverageName')}
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('brand')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                    value={formBrand}
                    onChangeText={setFormBrand}
                    placeholder={t('brand')}
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('sizeMl')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                    value={formSizeMl}
                    onChangeText={setFormSizeMl}
                    placeholder="500"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('bottlesPerBox')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                    value={formBottlesPerBox}
                    onChangeText={setFormBottlesPerBox}
                    placeholder="12"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.helpText, { color: colors.textMuted }]}>
                    Fill in one or more beverages to add them all at once.
                  </Text>
                  {entries.map((entry, i) => (
                    <View key={entry.key} style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.entryHeader}>
                        <Text style={[styles.entryNumber, { color: colors.textMuted }]}>#{i + 1}</Text>
                        {entries.length > 1 && (
                          <TouchableOpacity onPress={() => removeEntry(entry.key)}>
                            <Ionicons name="remove-circle-outline" size={20} color={colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('beverageName')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                        value={entry.name}
                        onChangeText={(v) => updateEntry(entry.key, 'name', v)}
                        placeholder={t('enterBeverageName')}
                        placeholderTextColor={colors.textMuted}
                      />
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('brand')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                        value={entry.brand}
                        onChangeText={(v) => updateEntry(entry.key, 'brand', v)}
                        placeholder={t('brand')}
                        placeholderTextColor={colors.textMuted}
                      />
                      <View style={[styles.inlineRow, { gap: spacing[2] }]}>
                        <View style={styles.inlineCol}>
                          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('sizeMl')}</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            value={entry.sizeMl}
                            onChangeText={(v) => updateEntry(entry.key, 'sizeMl', v)}
                            placeholder="500"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                          />
                        </View>
                        <View style={styles.inlineCol}>
                          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('bottlesPerBox')}</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            value={entry.bottlesPerBox}
                            onChangeText={(v) => updateEntry(entry.key, 'bottlesPerBox', v)}
                            placeholder="24"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[styles.addEntryButton, { borderColor: colors.border }]}
                    onPress={addEntry}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                    <Text style={[styles.addEntryText, { color: colors.primary }]}>Add another beverage</Text>
                  </TouchableOpacity>
                </>
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

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide" onRequestClose={() => setShowDetailModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, spacing[4]), borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('beverageDetail')}</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {selectedBeverage && (
                <>
                  <View style={[styles.detailCard, { backgroundColor: colors.surfaceMuted }]}>
                    <View style={styles.detailCardHeader}>
                      <View style={[styles.detailCardIcon, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="wine-outline" size={24} color={colors.primary} />
                      </View>
                      <View style={styles.detailCardInfo}>
                        <Text style={[styles.detailCardName, { color: colors.textPrimary }]}>{selectedBeverage.name}</Text>
                        {selectedBeverage.brand && (
                          <Text style={[styles.detailCardBrand, { color: colors.textSecondary }]}>{selectedBeverage.brand}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.detailGrid}>
                      <View style={styles.detailGridItem}>
                        <Text style={[styles.detailGridLabel, { color: colors.textMuted }]}>{t('bottlesPerBox')}</Text>
                        <Text style={[styles.detailGridValue, { color: colors.textPrimary }]}>{selectedBeverage.bottlesPerBox}</Text>
                      </View>
                      {selectedBeverage.sizeMl && (
                        <View style={styles.detailGridItem}>
                          <Text style={[styles.detailGridLabel, { color: colors.textMuted }]}>{t('sizeMl')}</Text>
                          <Text style={[styles.detailGridValue, { color: colors.textPrimary }]}>{selectedBeverage.sizeMl}ml</Text>
                        </View>
                      )}
                      <View style={styles.detailGridItem}>
                        <Text style={[styles.detailGridLabel, { color: colors.textMuted }]}>{t('stockBottles')}</Text>
                        <Text style={[styles.detailGridValue, { color: colors.textPrimary }]}>{selectedBeverage.stockBottles}</Text>
                      </View>
                      <View style={styles.detailGridItem}>
                        <Text style={[styles.detailGridLabel, { color: colors.textMuted }]}>{t('status')}</Text>
                        <Text style={[styles.detailGridValue, { color: selectedBeverage.isActive ? colors.success : colors.danger }]}>
                          {selectedBeverage.isActive ? t('active') : t('inactive')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.stockButton, { backgroundColor: colors.primary }]}
                    onPress={() => { setShowDetailModal(false); openAddStock(selectedBeverage); }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={colors.textInverse} />
                    <Text style={[styles.stockButtonText, { color: colors.textInverse }]}>{t('addToStock')}</Text>
                  </TouchableOpacity>

                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={[styles.detailActionButton, { backgroundColor: colors.surfaceMuted }]}
                      onPress={() => { setShowDetailModal(false); openEdit(selectedBeverage); }}
                    >
                      <Ionicons name="pencil" size={16} color={colors.primary} />
                      <Text style={[styles.detailActionText, { color: colors.primary }]}>{t('editBeverage')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.detailActionButton, { backgroundColor: colors.surfaceMuted }]}
                      onPress={() => toggleActiveMutation.mutate({ id: selectedBeverage.id, isActive: !selectedBeverage.isActive })}
                    >
                      <Ionicons name={selectedBeverage.isActive ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.accent} />
                      <Text style={[styles.detailActionText, { color: colors.accent }]}>
                        {selectedBeverage.isActive ? t('hideInactive') : t('showInactive')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.detailActionButton, { backgroundColor: colors.dangerLight }]}
                      onPress={() => { setShowDetailModal(false); setDeleteTarget({ id: selectedBeverage.id, name: selectedBeverage.name }); setShowDeleteDialog(true); }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text style={[styles.detailActionText, { color: colors.danger }]}>{t('delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Stock Modal */}
      <Modal visible={showStockModal} transparent animationType="slide" onRequestClose={() => setShowStockModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, spacing[4]), borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('addToStock')}</Text>
              <TouchableOpacity onPress={() => setShowStockModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              {selectedBeverage && (
                <Text style={[styles.currentStock, { color: colors.textSecondary }]}>
                  {t('stockBottles')}: {(selectedBeverage as any).stockBottles}
                </Text>
              )}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('addStockAmount')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={formStockAmount}
                onChangeText={setFormStockAmount}
                placeholder={t('enterStockAmount')}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary, opacity: addStockMutation.isPending ? 0.6 : 1 }]}
                onPress={handleAddStock}
                disabled={addStockMutation.isPending}
              >
                <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                  {addStockMutation.isPending ? t('saving') : t('addToStock')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={showDeleteDialog}
        title={t('deleteBeverage')}
        message={t('confirmDeleteBeverage')}
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
  toggleButton: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[2], marginHorizontal: spacing[5], marginBottom: spacing[3], borderRadius: radius.sm, borderWidth: 1 },
  toggleText: { ...type.caption },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing[5], paddingBottom: spacing[6] },
  card: { borderRadius: radius.md, padding: spacing[4], marginBottom: spacing[2] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2] },
  cardIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing[3] },
  cardInfo: { flex: 1 },
  cardName: { ...type.bodyBold },
  cardBrand: { ...type.caption, marginTop: 1 },
  inactiveBadge: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radius.full },
  inactiveText: { ...type.micro },
  cardDetails: { flexDirection: 'row', gap: spacing[4] },
  detailCol: { flex: 1 },
  detailLabel: { ...type.micro, marginBottom: 1 },
  detailValue: { ...type.bodyBold, fontSize: 13 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[5], paddingBottom: spacing[3], borderBottomWidth: 1 },
  modalTitle: { ...type.h3 },
  modalContent: { padding: spacing[5] },
  fieldLabel: { ...type.caption, marginBottom: spacing[1] },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[3], ...type.body },
  saveButton: { paddingVertical: spacing[3], borderRadius: radius.sm, alignItems: 'center', marginTop: spacing[2] },
  saveButtonText: { ...type.bodyBold },
  detailCard: { borderRadius: radius.md, padding: spacing[4], marginBottom: spacing[4] },
  detailCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3] },
  detailCardIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing[3] },
  detailCardInfo: { flex: 1 },
  detailCardName: { ...type.h4 },
  detailCardBrand: { ...type.caption, marginTop: 2 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  detailGridItem: { width: '47%' },
  detailGridLabel: { ...type.micro, marginBottom: 2 },
  detailGridValue: { ...type.bodyBold },
  stockButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.sm, marginBottom: spacing[3] },
  stockButtonText: { ...type.bodyBold },
  detailActions: { flexDirection: 'row', gap: spacing[2] },
  detailActionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1], paddingVertical: spacing[2], borderRadius: radius.sm },
  detailActionText: { ...type.caption },
  currentStock: { ...type.body, marginBottom: spacing[3] },
  helpText: { ...type.caption, marginBottom: spacing[3] },
  entryCard: { borderWidth: 1, borderRadius: radius.md, padding: spacing[3], marginBottom: spacing[3] },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  entryNumber: { ...type.micro },
  inlineRow: { flexDirection: 'row' },
  inlineCol: { flex: 1 },
  addEntryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1], paddingVertical: spacing[3], borderWidth: 1, borderRadius: radius.sm, borderStyle: 'dashed' },
  addEntryText: { ...type.caption, fontWeight: '600' },
});
