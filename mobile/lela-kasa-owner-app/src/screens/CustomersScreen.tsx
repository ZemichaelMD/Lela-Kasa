import React, { useCallback, useState } from 'react';
import {
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { getSdk } from '../lib/sdk';
import { QK } from '../lib/query-keys';
import { SearchBar } from '../components/SearchBar';
import { CustomerRow } from '../components/CustomerRow';
import { NewSaleFAB } from '../components/NewSaleFAB';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
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
  const insets = useSafeAreaInsets();

  // Create customer modal state
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
      setCreateName('');
      setCreatePhone('');
      setCreateNotes('');
      setCreateUsername('');
      setCreatePin('');
      queryClient.invalidateQueries({ queryKey: QK.customers({ search, hasCredit }) });
      showToast(t('customerCreated'), 'success');
    },
    onError: (err: any) => showToast(err?.message ?? 'Failed to create customer', 'error'),
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: QK.customers({ search, hasCredit }),
    queryFn: ({ pageParam = 1 }) =>
      getSdk().customers.list({ page: pageParam as number, pageSize: 30, search: search || undefined, hasCredit: hasCredit || undefined }),
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    initialPageParam: 1,
  });

  const customers = data?.pages.flatMap(p => p.data) ?? [];

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <Skeleton height={60} style={{ flex: 1 }} />
      </View>
    );
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isFetching) return null;
    return (
      <EmptyState
        icon="people-outline"
        title={t('noCustomers')}
        subtitle={search ? t('tryDifferentSearch') : t('addFirstCustomer')}
      />
    );
  }, [isFetching, search]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('customers')}</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateSheet(true)}
        >
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('searchCustomers')}
        />
      </View>

      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: !hasCredit ? colors.primary : colors.surfaceMuted }]}
          onPress={() => setHasCredit(false)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, { color: !hasCredit ? colors.textInverse : colors.textSecondary }]}>{t('all')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: hasCredit ? colors.primary : colors.surfaceMuted }]}
          onPress={() => setHasCredit(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, { color: hasCredit ? colors.textInverse : colors.textSecondary }]}>{t('hasBalance')}</Text>
        </TouchableOpacity>
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
            onPress={() =>
              navigation.navigate('CustomerDetail', {
                customerId: item.id,
                customerName: item.name,
              })
            }
          />
        )}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
      />

      <NewSaleFAB />

      {/* Create Customer Modal */}
      <Modal visible={showCreateSheet} transparent animationType="slide" onRequestClose={() => setShowCreateSheet(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, spacing[4]), borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('newCustomer')}</Text>
              <TouchableOpacity onPress={() => setShowCreateSheet(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('fullName')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={createName}
                onChangeText={setCreateName}
                placeholder={t('fullName')}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('phoneNumber')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={createPhone}
                onChangeText={setCreatePhone}
                placeholder={t('phonePlaceholder') as any}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('customerNotes')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={createNotes}
                onChangeText={setCreateNotes}
                placeholder={t('optionalNotes') as any}
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Customer Portal Access</Text>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Username</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={createUsername}
                onChangeText={setCreateUsername}
                placeholder="Auto-generated from name if empty"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Portal PIN</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={createPin}
                onChangeText={setCreatePin}
                placeholder="Set a numeric PIN"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                maxLength={10}
              />
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary, marginTop: spacing[4], opacity: createMutation.isPending ? 0.6 : 1 }]}
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
                <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                  {createMutation.isPending ? t('saving') : t('create')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[3], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.h1 },
  addButton: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] },
  filters: { flexDirection: 'row', paddingHorizontal: spacing[5], paddingBottom: spacing[3], gap: spacing[2] },
  filterChip: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.full },
  filterText: { ...type.caption },
  footer: { paddingHorizontal: spacing[5], paddingVertical: spacing[2] },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderBottomWidth: 1 },
  modalTitle: { ...type.h3 },
  modalContent: { paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  fieldLabel: { ...type.caption, marginBottom: spacing[2], marginTop: spacing[2] },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing[3], paddingVertical: spacing[3], ...type.body },
  sectionLabel: { ...type.bodyBold, marginBottom: spacing[2], marginTop: spacing[3] },
  saveButton: { borderRadius: radius.md, paddingVertical: spacing[3], alignItems: 'center' },
  saveButtonText: { ...type.bodyBold },
});
