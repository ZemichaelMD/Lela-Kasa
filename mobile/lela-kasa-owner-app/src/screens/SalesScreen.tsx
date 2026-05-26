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
import { useFormattedDate } from '../components/FormattedDate';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { getSdk } from '../lib/sdk';
import { QK } from '../lib/query-keys';
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
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      label = t('thisMonth');
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    label,
  };
}

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'VOIDED', label: 'Voided' },
];

export default function SalesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
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
    return <EmptyState icon="receipt-outline" title={t('noSales')} subtitle={search ? t('tryDifferentSearch') : t('recordFirstSale')} />;
  }, [isFetching, search]);

  const handleApplyCustomDate = () => {
    if (customFrom && customTo) {
      setDatePreset('custom');
      setShowDateFilter(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header: title + date badge */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('sales')}</Text>
        <TouchableOpacity
          style={[styles.dateBadge, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
          onPress={() => setShowDateFilter(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={13} color={colors.primary} />
          <Text style={[styles.dateBadgeText, { color: colors.primary }]}>{range.label}</Text>
          <Ionicons name="chevron-down" size={11} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t('searchByCustomer')}
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

        {/* Status tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {STATUS_TABS.map(tab => {
            const active = statusFilter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={styles.tab}
                onPress={() => setStatusFilter(tab.value)}
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
        contentContainerStyle={{ paddingBottom: spacing[8] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  title: { ...type.h2 },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  dateBadgeText: {
    ...type.micro,
    fontWeight: '700',
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
    marginRight: spacing[1],
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
});
