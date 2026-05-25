import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { getSdk } from '../lib/sdk';
import { QK } from '../lib/query-keys';
import { SegmentControl } from '../components/SegmentControl';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { showToast } from '../components/Toast';
import { radius, spacing, type } from '../theme';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}
function getFirstOfMonthStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

export default function EmployeeDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'EmployeeDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { employeeId, employeeName } = route.params;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const segmentLabels = [t('info'), t('permissions'), t('activity')];

  // Edit form state
  const [editName, setEditName] = useState(employeeName);
  const [editPhone, setEditPhone] = useState('');

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { name?: string; phone?: string | null; isActive?: boolean } }) =>
      getSdk().employees.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: QK.employees() });
      setShowEditModal(false);
      showToast(t('employeeUpdated'), 'success');
    },
    onError: (err: any) => {
      showToast(err?.message ?? t('failedToUpdateEmployee'), 'error');
    },
  });

  const openEdit = (name: string, phone?: string | null) => {
    setEditName(name);
    setEditPhone(phone ?? '');
    setShowEditModal(true);
  };

  const handleUpdate = () => {
    if (!editName.trim()) {
      showToast(t('enterName'), 'error');
      return;
    }
    updateMutation.mutate({ id: employeeId, dto: { name: editName.trim(), phone: editPhone || null } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{employeeName}</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{t('employeeDetail')}</Text>
        </View>
        <TouchableOpacity onPress={() => openEdit(employeeName, undefined)} hitSlop={8}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <SegmentControl segments={segmentLabels} activeIndex={activeTab} onChange={setActiveTab} />

      {activeTab === 0 && <InfoTab employeeId={employeeId} colors={colors} onEdit={openEdit} />}
      {activeTab === 1 && <PermissionsTab employeeId={employeeId} colors={colors} />}
      {activeTab === 2 && <ActivityTab employeeId={employeeId} colors={colors} navigation={navigation} />}

      {/* Edit Modal */}
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
                value={editName}
                onChangeText={setEditName}
                placeholder={t('enterName')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing[4] }]}>{t('phoneNumber')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+251 9XX XXX XXX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

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
    </SafeAreaView>
  );
}

// ─── Info Tab ──────────────────────────────────────────────────────────────────

function InfoTab({ employeeId, colors, onEdit }: { employeeId: string; colors: any; onEdit: (name: string, phone?: string | null) => void }) {
  const { data: employee, isLoading, refetch } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => getSdk().employees.findOne(employeeId),
  });

  if (isLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!employee) {
    return (
      <View style={styles.centerContent}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={[styles.emptyText, { color: colors.textPrimary }]}>{t('employeeNotFound')}</Text>
      </View>
    );
  }

  const statusColor = employee.isActive ? colors.success : colors.textMuted;
  const statusBg = employee.isActive ? colors.successLight : colors.surfaceMuted;
  const roleColor = employee.role === 'OWNER' ? colors.primary : colors.textMuted;
  const roleBg = employee.role === 'OWNER' ? colors.primaryLight : colors.surfaceMuted;

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.avatarLarge, { backgroundColor: statusBg }]}>
          <Ionicons name={employee.isActive ? 'checkmark-circle' : 'close-circle'} size={32} color={statusColor} />
        </View>
        <View style={styles.statusInfo}>
          <Text style={[styles.empName, { color: colors.textPrimary }]}>{employee.name}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: roleBg }]}>
              <Text style={[styles.badgeText, { color: roleColor }]}>{employee.role}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusBg }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {employee.isActive ? t('active') : t('inactive')}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => onEdit(employee.name, employee.phone)} hitSlop={8}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.detailsSection}>
        <DetailRow icon="mail-outline" label={t('emailLabel')} value={employee.email} colors={colors} />
        <DetailRow icon="call-outline" label={t('phoneNumber')} value={employee.phone ?? '\u2014'} colors={colors} />
        <DetailRow
          icon="checkmark-circle-outline"
          label={t('emailVerified')}
          value={employee.emailVerified ? t('verified') : t('notVerified')}
          valueColor={employee.emailVerified ? colors.success : colors.warning}
          colors={colors}
        />
        <DetailRow
          icon="person-outline"
          label={t('username')}
          value={employee.username ?? t('notSet')}
          valueColor={employee.username ? undefined : colors.textMuted}
          colors={colors}
        />
        <DetailRow
          icon="calendar-outline"
          label={t('employeeSince')}
          value={new Date(employee.createdAt).toLocaleDateString()}
          colors={colors}
        />
      </View>
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueColor,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  colors: any;
}) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <View style={styles.detailLeft}>
        <Ionicons name={icon as any} size={18} color={colors.textMuted} style={{ marginRight: spacing[3] }} />
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: valueColor ?? colors.textPrimary }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── Permissions Tab ──────────────────────────────────────────────────────────

function PermissionsTab({ employeeId, colors }: { employeeId: string; colors: any }) {
  const { data: groups, isLoading } = useQuery({
    queryKey: ['employee-permissions', employeeId],
    queryFn: () => getSdk().permissions.getEmployee(employeeId),
  });

  if (isLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <View style={styles.centerContent}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('permissions')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      {groups.map(group => {
        const allGranted = group.permissions.every(p => p.granted);
        return (
          <View key={group.group} style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.groupHeader}>
              <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{group.group}</Text>
            </View>
            {group.permissions.map(perm => (
              <View key={perm.slug} style={[styles.permRow, { borderTopColor: colors.border }]}>
                <View style={styles.permInfo}>
                  <Text style={[styles.permLabel, { color: colors.textPrimary }]}>{perm.label}</Text>
                  <Text style={[styles.permDesc, { color: colors.textMuted }]}>{perm.description}</Text>
                </View>
                <View style={[styles.permBadge, { backgroundColor: perm.granted ? colors.successLight : colors.surfaceMuted }]}>
                  <Text style={[styles.permBadgeText, { color: perm.granted ? colors.success : colors.textMuted }]}>
                    {perm.granted ? t('granted') : t('denied')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab({ employeeId, colors, navigation }: { employeeId: string; colors: any; navigation: any }) {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState(getFirstOfMonthStr);
  const [dateTo, setDateTo] = useState(getTodayStr);

  const queryKey = ['employee-sales', employeeId, page, dateFrom, dateTo];
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      getSdk().sales.list({
        page,
        pageSize: 20,
        createdById: employeeId,
        dateFrom,
        dateTo,
      }),
  });

  const sales = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);
  const totalAmountCents = sales.reduce((sum: number, s: any) => sum + s.subtotalCents, 0);

  return (
    <View style={styles.tabContent}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('totalSales')}</Text>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{total}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('totalSalesAmount')}</Text>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>ETB {formatCurrency(totalAmountCents)}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={[styles.filterInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            value={dateFrom}
            onChangeText={(v) => { setDateFrom(v); setPage(1); }}
            placeholder="From"
            placeholderTextColor={colors.textMuted}
            style={[styles.filterText, { color: colors.textPrimary }]}
          />
        </View>
        <Text style={{ color: colors.textMuted, marginHorizontal: spacing[2] }}>{'\u2014'}</Text>
        <View style={[styles.filterInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            value={dateTo}
            onChangeText={(v) => { setDateTo(v); setPage(1); }}
            placeholder="To"
            placeholderTextColor={colors.textMuted}
            style={[styles.filterText, { color: colors.textPrimary }]}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sales.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('noActivity')}</Text>
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => {
            const isVoided = item.status === 'VOIDED';
            return (
              <TouchableOpacity
                style={[styles.saleCard, { backgroundColor: colors.surface, borderColor: colors.border }, isVoided && { opacity: 0.6 }]}
                onPress={() => navigation.navigate('SaleDetail', { saleId: item.id })}
                activeOpacity={0.7}
              >
                <View style={styles.saleHeader}>
                  <View style={styles.saleLeft}>
                    <Text style={[styles.saleCustomer, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.customer?.name ?? 'Walk-in'}
                    </Text>
                    <Text style={[styles.saleDate, { color: colors.textMuted }]}>
                      {new Date(item.saleDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.saleRight}>
                    <Text style={[styles.saleAmount, { color: isVoided ? colors.textMuted : colors.textPrimary }]}>
                      ETB {formatCurrency(item.subtotalCents)}
                    </Text>
                    {item.creditDeltaCents > 0 && (
                      <Text style={[styles.saleCredit, { color: colors.danger }]}>
                        {t('credit')}: ETB {formatCurrency(item.creditDeltaCents)}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  disabled={page <= 1}
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                  style={[styles.pageBtn, { borderColor: colors.border }, page <= 1 && { opacity: 0.4 }]}
                >
                  <Text style={{ color: colors.textSecondary, ...type.caption }}>{t('prev')}</Text>
                </TouchableOpacity>
                <Text style={{ color: colors.textMuted, ...type.micro }}>
                  {page}/{totalPages}
                </Text>
                <TouchableOpacity
                  disabled={page >= totalPages}
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={[styles.pageBtn, { borderColor: colors.border }, page >= totalPages && { opacity: 0.4 }]}
                >
                  <Text style={{ color: colors.textSecondary, ...type.caption }}>{t('next')}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
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
    borderBottomWidth: 1,
  },
  headerCenter: { alignItems: 'center', flex: 1, marginHorizontal: spacing[3] },
  headerTitle: { ...type.h3 },
  headerSub: { ...type.micro, marginTop: 2 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  tabContent: { padding: spacing[4], flex: 1 },
  emptyText: { ...type.body, marginTop: spacing[4] },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[4],
  },
  statusInfo: { flex: 1 },
  empName: { ...type.h4, marginBottom: spacing[1] },
  badgeRow: { flexDirection: 'row', gap: spacing[2] },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: radius.full,
  },
  badgeText: { ...type.micro },
  detailsSection: { borderRadius: radius.md, overflow: 'hidden' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  detailLabel: { ...type.body },
  detailValue: { ...type.bodyMedium, maxWidth: '50%' },
  groupCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  groupTitle: { ...type.caption, textTransform: 'uppercase', letterSpacing: 1 },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  permInfo: { flex: 1, marginRight: spacing[3] },
  permLabel: { ...type.bodyMedium },
  permDesc: { ...type.micro, marginTop: 2 },
  permBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
  },
  permBadgeText: { ...type.micro },
  summaryRow: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] },
  summaryCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[4],
  },
  summaryLabel: { ...type.micro, marginBottom: spacing[1] },
  summaryValue: { ...type.h3 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  filterText: { ...type.body },
  saleCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  saleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  saleLeft: { flex: 1, marginRight: spacing[3] },
  saleCustomer: { ...type.bodyBold },
  saleDate: { ...type.micro, marginTop: 2 },
  saleRight: { alignItems: 'flex-end' },
  saleAmount: { ...type.bodyBold },
  saleCredit: { ...type.micro, marginTop: 2 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[4],
  },
  pageBtn: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderBottomWidth: 1 },
  modalTitle: { ...type.h3 },
  modalContent: { paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  modalScroll: { maxHeight: 420 },
  fieldLabel: { ...type.caption, marginBottom: spacing[2] },
  input: { ...type.body, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  submitButton: { borderRadius: radius.md, paddingVertical: spacing[4], alignItems: 'center', marginTop: spacing[4] },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { ...type.bodyBold, color: '#fff', fontSize: 16 },
});
