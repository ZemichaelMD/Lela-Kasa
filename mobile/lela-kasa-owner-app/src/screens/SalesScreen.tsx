import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';
import { useFormattedDate } from '../components/FormattedDate';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { getSdk } from '../lib/sdk';
import { QK } from '../lib/query-keys';
import { SearchBar } from '../components/SearchBar';
import { SaleRow } from '../components/SaleRow';
import { NewSaleFAB } from '../components/NewSaleFAB';
import { EmptyState } from '../components/EmptyState';
import { DateFilter, type DatePreset as BaseDatePreset } from '../components/DateFilter';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { radius, spacing, type } from '../theme';

type SalesDatePreset = BaseDatePreset | 'custom';

function getDateRange(preset: SalesDatePreset, customFrom?: string, customTo?: string): { from: string; to: string; label: string } {
  const now = new Date();
  let from: Date;
  let to = now;
  let label = '';

  switch (preset) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      label = t('today');
      break;
    case 'week':
      from = new Date(now);
      from.setDate(now.getDate() - 7);
      label = t('thisWeek');
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      label = t('thisMonth');
      break;
    case 'custom':
      from = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
      to = customTo ? new Date(customTo) : now;
      label = t('custom');
      break;
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    label,
  };
}

export default function SalesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const fmtDate = useFormattedDate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<SalesDatePreset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  const range = getDateRange(datePreset, customFrom, customTo);

  const { data, isFetching, isRefetching, refetch } = useQuery({
    queryKey: QK.sales({ search, status: statusFilter === 'ALL' ? undefined : statusFilter, dateFrom: range.from, dateTo: range.to }),
    queryFn: () =>
      getSdk().sales.list({
        pageSize: 50,
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        dateFrom: range.from,
        dateTo: range.to,
      }),
  });

  const sales = data?.data ?? [];

  const renderEmpty = useCallback(() => {
    if (isFetching) return null;
    return (
      <EmptyState
        icon="receipt-outline"
        title={t('noSales')}
        subtitle={search ? t('tryDifferentSearch') : t('recordFirstSale')}
      />
    );
  }, [isFetching, search]);

  const handleApplyCustomDate = () => {
    if (customFrom && customTo) {
      setDatePreset('custom');
      setShowDateFilter(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('sales')}</Text>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('searchByCustomer')}
        />
      </View>

      <View style={styles.filters}>
        {['ALL', 'CONFIRMED', 'VOIDED'].map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, { backgroundColor: statusFilter === s ? colors.primary : colors.surfaceMuted }]}
            onPress={() => setStatusFilter(s)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, { color: statusFilter === s ? colors.textInverse : colors.textSecondary }]}>
              {s === 'ALL' ? t('all') : s === 'CONFIRMED' ? t('active') : t('voided')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.dateFilterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowDateFilter(true)}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.dateFilterText, { color: colors.textSecondary }]}>{range.label}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <FlatList
        data={sales}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <SaleRow
            date={fmtDate(item.saleDate)}
            totalCents={item.subtotalCents}
            paidCents={item.paidCents}
            creditDeltaCents={item.creditDeltaCents}
            status={item.status}
            customerName={item.customer?.name}
            lineCount={item.lines?.length}
            onPress={() => navigation.navigate('SaleDetail', { saleId: item.id })}
          />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      />

      <NewSaleFAB />

      <DateFilter
        visible={showDateFilter}
        selected={datePreset === 'custom' ? 'month' : datePreset}
        onSelect={(p) => setDatePreset(p)}
        onClose={() => setShowDateFilter(false)}
        showCustom
        customFrom={customFrom}
        customTo={customTo}
        onCustomChange={(from, to) => { setCustomFrom(from); setCustomTo(to); }}
        onApplyCustom={handleApplyCustomDate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[2] },
  title: { ...type.h2 },
  searchContainer: { paddingHorizontal: spacing[5], paddingBottom: spacing[2] },
  filters: { flexDirection: 'row', paddingHorizontal: spacing[5], paddingBottom: spacing[3], gap: spacing[2] },
  filterChip: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.full },
  filterText: { ...type.caption },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginHorizontal: spacing[5],
    marginBottom: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dateFilterText: { ...type.bodyMedium, flex: 1 },
  listContent: { paddingBottom: spacing[8] },
});
