import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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

type Employee = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  username?: string;
  hasPin: boolean;
};

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

export default function EmployeesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPinField, setShowPinField] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPin, setFormPin] = useState('');

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
    onError: (err: any) => showToast(err?.message ?? t('failedToAddEmployee'), 'error'),
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
    onError: (err: any) => showToast(err?.message ?? t('failedToUpdateEmployee'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => getSdk().employees.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.employees() });
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      showToast(t('employeeDeleted'), 'success');
    },
    onError: () => showToast(t('failedToDelete'), 'error'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      getSdk().employees.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK.employees() }),
  });

  const resetForm = () => {
    setFormName(''); setFormEmail(''); setFormPassword('');
    setFormPhone(''); setFormUsername(''); setFormPin('');
    setShowPinField(false); setShowPassword(false);
    setEditingEmployee(null);
  };

  const openAdd = () => { resetForm(); setShowAddModal(true); };

  const openEdit = (item: Employee) => {
    setEditingEmployee(item);
    setFormName(item.name);
    setFormEmail(item.email);
    setFormPhone(item.phone ?? '');
    setFormUsername(item.username ?? '');
    setFormPin('');
    setShowPinField(false);
    setShowEditModal(true);
  };

  const handleAdd = () => {
    if (!formName || !formEmail || !formPassword) {
      showToast(t('fillRequiredFields'), 'error'); return;
    }
    if (formPassword.length < 8) {
      showToast(t('passwordTooShort'), 'error'); return;
    }
    addMutation.mutate({ name: formName, email: formEmail, password: formPassword, phone: formPhone || undefined });
  };

  const handleUpdate = () => {
    if (!formName) { showToast(t('enterName'), 'error'); return; }
    if (!editingEmployee) return;
    const dto: any = { name: formName, phone: formPhone || null };
    if (showPinField) {
      if (formUsername) dto.username = formUsername;
      if (formPin && formPin.length >= 4) dto.pin = formPin;
    }
    updateMutation.mutate({ id: editingEmployee.id, dto });
  };

  const inputStyle = [styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }] as any;

  const renderItem = ({ item }: { item: Employee }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('EmployeeDetail', { employeeId: item.id, employeeName: item.name })}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="person" size={18} color={colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.rowEmail, { color: colors.textSecondary }]} numberOfLines={1}>{item.email}</Text>
        {item.phone && (
          <Text style={[styles.rowPhone, { color: colors.textMuted }]}>{item.phone}</Text>
        )}
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={[styles.statusPill, { backgroundColor: item.isActive ? colors.successLight : colors.surfaceMuted }]}
          onPress={() => toggleActiveMutation.mutate({ id: item.id, isActive: !item.isActive })}
        >
          <View style={[styles.statusDot, { backgroundColor: item.isActive ? colors.success : colors.textMuted }]} />
          <Text style={[styles.statusText, { color: item.isActive ? colors.success : colors.textMuted }]}>
            {item.isActive ? t('active') : t('inactive')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surfaceMuted }]}
          onPress={() => openEdit(item)}
        >
          <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surfaceMuted }]}
          onPress={() => navigation.navigate('EmployeePermissions', { employeeId: item.id, employeeName: item.name })}
        >
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.dangerLight }]}
          onPress={() => { setDeleteTarget({ id: item.id, name: item.name }); setShowDeleteDialog(true); }}
        >
          <Ionicons name="trash-outline" size={15} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('employees')}</Text>
        <TouchableOpacity onPress={openAdd} hitSlop={8} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('failedToLoad')}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : employees.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('noEmployees')}</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{t('addFirstEmployee')}</Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        />
      )}

      {/* Add Modal */}
      <ModalSheet
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('addEmployee')}
        footer={
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.primary }, addMutation.isPending && styles.btnDisabled]}
            onPress={handleAdd}
            disabled={addMutation.isPending}
            activeOpacity={0.85}
          >
            {addMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.footerBtnText}>{t('addEmployee')}</Text>
            }
          </TouchableOpacity>
        }
      >
        <FormField label={`${t('employeeName')} *`}>
          <View style={inputStyle}>
            <Ionicons name="person-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={formName} onChangeText={setFormName}
              placeholder={t('enterName')} placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </View>
        </FormField>

        <FormField label={`${t('employeeEmail')} *`}>
          <View style={inputStyle}>
            <Ionicons name="mail-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={formEmail} onChangeText={setFormEmail}
              placeholder={t('enterEmail')} placeholderTextColor={colors.textMuted}
              keyboardType="email-address" autoCapitalize="none"
            />
          </View>
        </FormField>

        <FormField label={`${t('password')} *`}>
          <View style={inputStyle}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={formPassword} onChangeText={setFormPassword}
              placeholder="••••••••" placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword} autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>{t('passwordMin')} 8 {t('characters')}</Text>
        </FormField>

        <FormField label={`${t('phoneNumber')} (${t('optional').toLowerCase()})`}>
          <View style={inputStyle}>
            <Ionicons name="call-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={formPhone} onChangeText={setFormPhone}
              placeholder="+251 9XX XXX XXX" placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>
        </FormField>
      </ModalSheet>

      {/* Edit Modal */}
      <ModalSheet
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('editEmployee')}
        footer={
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.primary }, updateMutation.isPending && styles.btnDisabled]}
            onPress={handleUpdate}
            disabled={updateMutation.isPending}
            activeOpacity={0.85}
          >
            {updateMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.footerBtnText}>{t('save')}</Text>
            }
          </TouchableOpacity>
        }
      >
        <FormField label={`${t('employeeName')} *`}>
          <View style={inputStyle}>
            <Ionicons name="person-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={formName} onChangeText={setFormName}
              placeholder={t('enterName')} placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </View>
        </FormField>

        <FormField label={t('employeeEmail')}>
          <View style={[inputStyle, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name="mail-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
            <Text style={[styles.inputText, { color: colors.textMuted }]}>{formEmail}</Text>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>{t('emailCannotChange')}</Text>
        </FormField>

        <FormField label={t('phoneNumber')}>
          <View style={inputStyle}>
            <Ionicons name="call-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={formPhone} onChangeText={setFormPhone}
              placeholder="+251 9XX XXX XXX" placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>
        </FormField>

        <TouchableOpacity
          style={[styles.collapseRow, { backgroundColor: colors.surfaceTinted }]}
          onPress={() => setShowPinField(v => !v)}
          activeOpacity={0.7}
        >
          <Ionicons name={showPinField ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
          <Text style={[styles.collapseText, { color: colors.primary }]}>
            {showPinField ? t('hideCredentials') : t('editCredentials')}
          </Text>
        </TouchableOpacity>

        {showPinField && (
          <>
            <FormField label={t('username')}>
              <View style={inputStyle}>
                <Ionicons name="at-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.inputText, { color: colors.textPrimary }]}
                  value={formUsername} onChangeText={setFormUsername}
                  placeholder={t('enterUsername')} placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
              {editingEmployee?.username && (
                <Text style={[styles.hint, { color: colors.textMuted }]}>{t('current')}: {editingEmployee.username}</Text>
              )}
            </FormField>

            <FormField label={t('pin')}>
              <View style={inputStyle}>
                <Ionicons name="keypad-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.inputText, { color: colors.textPrimary }]}
                  value={formPin}
                  onChangeText={v => setFormPin(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder={editingEmployee?.hasPin ? t('enterNewPin') : t('setPin')}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                {editingEmployee?.hasPin ? t('pinChangeHint') : t('pinSetHint')}
              </Text>
            </FormField>
          </>
        )}
      </ModalSheet>

      <ConfirmDialog
        visible={showDeleteDialog}
        title={t('deleteEmployee')}
        message={t('confirmDeleteEmployee')}
        destructive
        confirmText={t('delete')}
        cancelText={t('cancel')}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => { setShowDeleteDialog(false); setDeleteTarget(null); }}
        isLoading={deleteMutation.isPending}
      />
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
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...type.h3 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingTop: spacing[1], paddingBottom: spacing[6] },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing[5] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { ...type.bodyMedium, fontSize: 14 },
  rowEmail: { ...type.caption, marginTop: 1 },
  rowPhone: { ...type.micro, marginTop: 1 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], flexShrink: 0 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...type.micro },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing[6] },
  emptyTitle: { ...type.h4, marginTop: spacing[4], marginBottom: spacing[2], textAlign: 'center' },
  emptyDesc: { ...type.body, textAlign: 'center' },
  retryBtn: { marginTop: spacing[4], borderRadius: radius.md, paddingHorizontal: spacing[6], paddingVertical: spacing[3] },
  retryBtnText: { ...type.bodyBold, color: '#fff' },
  // Modal form
  field: { marginBottom: spacing[4] },
  fieldLabel: { ...type.caption, fontWeight: '600', marginBottom: spacing[2] },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    height: 50,
  },
  inputIcon: { marginRight: spacing[2] },
  inputText: { ...type.body, flex: 1, paddingVertical: 0 },
  hint: { ...type.micro, marginTop: spacing[1] },
  collapseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[4],
  },
  collapseText: { ...type.bodyMedium, fontSize: 14 },
  footerBtn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  footerBtnText: { ...type.bodyBold, fontSize: 16, color: '#fff' },
});
