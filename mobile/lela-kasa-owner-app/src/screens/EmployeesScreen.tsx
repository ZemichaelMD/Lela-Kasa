import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
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
import { radius, spacing, type } from '../theme';

export default function EmployeesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<{ id: string; name: string; email: string; phone?: string | null; isActive: boolean; username?: string; hasPin: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPin, setFormPin] = useState('');
  const [showEditPin, setShowEditPin] = useState(false);

  const { data, isRefetching, refetch, isLoading, error } = useQuery({
    queryKey: QK.employees(),
    queryFn: () => getSdk().employees.list(),
  });

  const employees = data ?? [];

  const addMutation = useMutation({
    mutationFn: (dto: { name: string; email: string; password: string; phone?: string }) =>
      getSdk().employees.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.employees() });
      setShowAddModal(false);
      resetForm();
      showToast(t('employeeAdded'), 'success');
    },
    onError: (err: any) => {
      showToast(err?.message ?? t('failedToAddEmployee'), 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { name?: string; phone?: string | null; isActive?: boolean } }) =>
      getSdk().employees.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.employees() });
      setShowEditModal(false);
      resetForm();
      showToast(t('employeeUpdated'), 'success');
    },
    onError: (err: any) => {
      showToast(err?.message ?? t('failedToUpdateEmployee'), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => getSdk().employees.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.employees() });
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      showToast(t('employeeDeleted'), 'success');
    },
    onError: () => {
      showToast(t('failedToDelete'), 'error');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      getSdk().employees.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.employees() });
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPhone('');
    setFormUsername('');
    setFormPin('');
    setShowEditPin(false);
    setEditingEmployee(null);
  };

  const openAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEdit = (item: { id: string; name: string; email: string; phone?: string | null; isActive: boolean; username?: string; hasPin: boolean }) => {
    setEditingEmployee({ id: item.id, name: item.name, email: item.email, phone: item.phone, isActive: item.isActive, username: item.username, hasPin: item.hasPin });
    setFormName(item.name);
    setFormEmail(item.email);
    setFormPhone(item.phone || '');
    setFormUsername(item.username || '');
    setFormPin('');
    setShowEditPin(false);
    setShowEditModal(true);
  };

  const handleAdd = () => {
    if (!formName || !formEmail || !formPassword) {
      showToast(t('fillRequiredFields'), 'error');
      return;
    }
    if (formPassword.length < 8) {
      showToast(t('passwordTooShort'), 'error');
      return;
    }
    addMutation.mutate({ name: formName, email: formEmail, password: formPassword, phone: formPhone || undefined });
  };

  const handleUpdate = () => {
    if (!formName) {
      showToast(t('enterName'), 'error');
      return;
    }
    if (!editingEmployee) return;
    const dto: any = { name: formName, phone: formPhone || null };
    if (showEditPin) {
      if (formUsername) dto.username = formUsername;
      if (formPin && formPin.length >= 4) dto.pin = formPin;
    }
    updateMutation.mutate({
      id: editingEmployee.id,
      dto,
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const renderEmployeeCard = (item: { id: string; name: string; email: string; phone?: string | null; isActive: boolean; username?: string; hasPin: boolean }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => openEdit(item)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.cardEmail, { color: colors.textSecondary }]}>{item.email}</Text>
          {item.phone && (
            <Text style={[styles.cardPhone, { color: colors.textMuted }]}>{item.phone}</Text>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: item.isActive ? colors.successLight : colors.surfaceMuted }]}
            onPress={() => toggleActiveMutation.mutate({ id: item.id, isActive: !item.isActive })}
          >
            <Text style={[styles.toggleText, { color: item.isActive ? colors.success : colors.textMuted }]}>
              {item.isActive ? t('active') : t('inactive')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.permsButton, { backgroundColor: colors.surfaceMuted }]}
            onPress={() => navigation.navigate('EmployeePermissions', { employeeId: item.id, employeeName: item.name })}
          >
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAddModal = () => (
    <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('addEmployee')}</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('employeeName')} *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={formName}
              onChangeText={setFormName}
              placeholder={t('enterName')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[4] }]}>{t('employeeEmail')} *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={formEmail}
              onChangeText={setFormEmail}
              placeholder={t('enterEmail')}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[4] }]}>{t('password')} *</Text>
            <View style={[styles.pinInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.pinInput, { color: colors.textPrimary }]}
                value={formPassword}
                onChangeText={setFormPassword}
                placeholder={t('enterPassword')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.pinToggle}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{t('passwordMin')} 8 {t('characters')}</Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[4] }]}>{t('phoneNumber')} ({t('optional').toLowerCase()})</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={formPhone}
              onChangeText={setFormPhone}
              placeholder="+251 9XX XXX XXX"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }, addMutation.isPending && styles.submitButtonDisabled]}
              onPress={handleAdd}
              disabled={addMutation.isPending}
            >
              <Text style={styles.submitButtonText}>
                {addMutation.isPending ? t('saving') : t('addEmployee')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('editEmployee')}</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('employeeName')} *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={formName}
              onChangeText={setFormName}
              placeholder={t('enterName')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[4] }]}>{t('employeeEmail')}</Text>
            <View style={[styles.input, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <Text style={[styles.disabledText, { color: colors.textMuted }]}>{formEmail}</Text>
            </View>
            <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{t('emailCannotChange')}</Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[4] }]}>{t('phoneNumber')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={formPhone}
              onChangeText={setFormPhone}
              placeholder="+251 9XX XXX XXX"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.pinToggleRow, { marginTop: spacing[4] }]}
              onPress={() => setShowEditPin(!showEditPin)}
              activeOpacity={0.7}
            >
              <Ionicons name={showEditPin ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
              <Text style={[styles.pinToggleText, { color: colors.primary }]}>{showEditPin ? t('hideCredentials') : t('editCredentials')}</Text>
            </TouchableOpacity>

            {showEditPin && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[3] }]}>{t('username')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  value={formUsername}
                  onChangeText={setFormUsername}
                  placeholder={t('enterUsername')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
                {editingEmployee?.username && (
                  <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{t('current')}: {editingEmployee.username}</Text>
                )}

                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[3] }]}>{t('pin')}</Text>
                <View style={[styles.pinInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.pinInput, { color: colors.textPrimary }]}
                    value={formPin}
                    onChangeText={(v) => setFormPin(v.replace(/\D/g, '').slice(0, 6))}
                    placeholder={editingEmployee?.hasPin ? t('enterNewPin') : t('setPin')}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.pinToggle}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
                  {editingEmployee?.hasPin ? t('pinChangeHint') : t('pinSetHint')}
                </Text>
              </>
            )}

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }, updateMutation.isPending && styles.submitButtonDisabled]}
              onPress={handleUpdate}
              disabled={updateMutation.isPending}
            >
              <Text style={styles.submitButtonText}>
                {updateMutation.isPending ? t('saving') : t('save')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('employees')}</Text>
        <TouchableOpacity onPress={openAdd} hitSlop={8}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>{t('failedToLoad')}</Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>{(error as any)?.message}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : employees.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textPrimary }]}>{t('noEmployees')}</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>{t('addFirstEmployee')}</Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderEmployeeCard(item)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        />
      )}

      {renderAddModal()}
      {renderEditModal()}

      <ConfirmDialog
        visible={showDeleteDialog}
        title={t('deleteEmployee')}
        message={t('confirmDeleteEmployee')}
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
  listContent: { paddingHorizontal: spacing[5], paddingBottom: spacing[6] },
  card: { borderRadius: radius.md, padding: spacing[4], marginBottom: spacing[2] },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', marginRight: spacing[3] },
  cardInfo: { flex: 1 },
  cardName: { ...type.bodyBold },
  cardEmail: { ...type.caption, marginTop: 1 },
  cardPhone: { ...type.micro, marginTop: 1 },
  cardActions: { alignItems: 'flex-end', gap: spacing[2] },
  toggleButton: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radius.full },
  toggleText: { ...type.micro },
  permsButton: { width: 28, height: 28, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderBottomWidth: 1 },
  modalTitle: { ...type.h3 },
  modalContent: { paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  modalScroll: { maxHeight: 420 },
  fieldLabel: { ...type.caption, marginBottom: spacing[2] },
  fieldHint: { ...type.micro, marginTop: spacing[1] },
  input: { ...type.body, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  disabledText: { ...type.body },
  pinInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[4] },
  pinInput: { ...type.body, flex: 1, paddingVertical: spacing[3] },
  pinToggle: { padding: spacing[2] },
  pinToggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  pinToggleText: { ...type.bodyMedium },
  submitButton: { borderRadius: radius.md, paddingVertical: spacing[4], alignItems: 'center', marginTop: spacing[4] },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { ...type.bodyBold, color: '#fff', fontSize: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing[6] },
  errorText: { ...type.h4, marginTop: spacing[4], marginBottom: spacing[2] },
  errorSubtext: { ...type.body, textAlign: 'center', marginBottom: spacing[4] },
  retryButton: { borderRadius: radius.md, paddingHorizontal: spacing[6], paddingVertical: spacing[3] },
  retryButtonText: { ...type.bodyBold, color: '#fff' },
  emptyText: { ...type.h4, marginTop: spacing[4], marginBottom: spacing[2] },
  emptySubtext: { ...type.body, textAlign: 'center' },
});
