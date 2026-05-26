import React, { useCallback, useState } from 'react';
import {
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
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { getSdk } from '../lib/sdk';
import { QK } from '../lib/query-keys';
import { CustomerRow } from '../components/CustomerRow';
import { NewSaleFAB } from '../components/NewSaleFAB';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { ModalSheet } from '../components/ModalSheet';
import { showToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { radius, spacing, type } from '../theme';

export default function CustomersScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [hasCredit, setHasCredit] = useState(false);

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createPin, setCreatePin] = useState('');

  const createMutation = useMutation({
    mutationFn: (dto: { name: string; phone?: string; notes?: string; username?: string; pin?: string }) =>
      getSdk().customers.create(dto),
    onSuccess: () => {
      setShowCreateSheet(false);
      setCreateName(''); setCreatePhone(''); setCreateNotes('');
      setCreateUsername(''); setCreatePin('');
      queryClient.invalidateQueries({ queryKey: QK.customers({ search, hasCredit }) });
      showToast(t('customerCreated'), 'success');
    },
    onError: (err: any) => showToast(err?.message ?? 'Failed to create customer', 'error'),
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching, isRefetching, refetch } =
    useInfiniteQuery({
      queryKey: QK.customers({ search, hasCredit }),
      queryFn: ({ pageParam = 1 }) =>
        getSdk().customers.list({ page: pageParam as number, pageSize: 30, search: search || undefined, hasCredit: hasCredit || undefined }),
      getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
      initialPageParam: 1,
    });

  const customers = data?.pages.flatMap(p => p.data) ?? [];

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return <View style={{ paddingHorizontal: spacing[5], paddingVertical: spacing[2] }}><Skeleton height={60} style={{ flex: 1 }} /></View>;
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isFetching) return null;
    return <EmptyState icon="people-outline" title={t('noCustomers')} subtitle={search ? t('tryDifferentSearch') : t('addFirstCustomer')} />;
  }, [isFetching, search]);

  const TABS = [
    { value: false, label: t('all') },
    { value: true, label: t('hasBalance') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('customers')}</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateSheet(true)}
        >
          <Ionicons name="add" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Unified filter bar */}
      <View style={styles.filterBar}>
        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t('searchCustomers')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="search-outline" size={15} color={colors.textMuted} />
          )}
        </View>

        {/* Filter tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {TABS.map(tab => {
            const active = hasCredit === tab.value;
            return (
              <TouchableOpacity
                key={String(tab.value)}
                style={styles.tab}
                onPress={() => setHasCredit(tab.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted }]}>
                  {tab.label}
                </Text>
                {active && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={customers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CustomerRow
            name={item.name}
            phone={item.phone}
            balanceCents={item.creditBalanceCents}
            outstandingBoxes={item.outstandingBoxes}
            outstandingBottles={item.outstandingBottles}
            onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id, customerName: item.name })}
          />
        )}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: spacing[8] }}
      />

      <NewSaleFAB />

      {/* Create Customer Sheet */}
      <ModalSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        title={t('newCustomer')}
        footer={
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: createMutation.isPending ? 0.6 : 1 }]}
            onPress={() => {
              if (!createName.trim()) { showToast('Name is required', 'error'); return; }
              createMutation.mutate({
                name: createName.trim(),
                phone: createPhone.trim() || undefined,
                notes: createNotes.trim() || undefined,
                username: createUsername.trim() || undefined,
                pin: createPin.trim() || undefined,
              });
            }}
            disabled={createMutation.isPending}
          >
            <Text style={[styles.saveBtnText, { color: colors.textInverse }]}>
              {createMutation.isPending ? t('saving') : t('create')}
            </Text>
          </TouchableOpacity>
        }
      >
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('fullName')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border }]}
              value={createName}
              onChangeText={setCreateName}
              placeholder={t('fullName')}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('phoneNumber')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border }]}
              value={createPhone}
              onChangeText={setCreatePhone}
              placeholder={t('phonePlaceholder') as any}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('customerNotes')}</Text>
            <TextInput
              style={[styles.input, styles.multilineInput, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border }]}
              value={createNotes}
              onChangeText={setCreateNotes}
              placeholder={t('optionalNotes') as any}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={[styles.divider, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Portal Access</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('username')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border }]}
              value={createUsername}
              onChangeText={setCreateUsername}
              placeholder="Auto-generated if empty"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('pin')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, borderColor: colors.border }]}
              value={createPin}
              onChangeText={setCreatePin}
              placeholder="Numeric PIN"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>
      </ModalSheet>
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
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  title: { ...type.h2 },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[2],
    gap: spacing[1],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    height: 44,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...type.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: spacing[1],
  },
  tab: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginRight: spacing[2],
    position: 'relative',
  },
  tabText: {
    ...type.caption,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing[4],
    right: spacing[4],
    height: 2,
    borderRadius: 1,
  },
  // Form
  form: { gap: spacing[1] },
  fieldGroup: { marginBottom: spacing[3] },
  fieldLabel: { ...type.micro, marginBottom: spacing[2], textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    ...type.body,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  divider: {
    paddingTop: spacing[4],
    marginBottom: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: { ...type.caption, fontWeight: '700' },
  saveBtn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { ...type.bodyBold, fontSize: 16 },
});
