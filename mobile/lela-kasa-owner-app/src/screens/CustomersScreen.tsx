import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';

import type { RootStackParamList } from '../navigation/types';
import { getSdk } from '../lib/sdk';
import { QK } from '../lib/query-keys';
import { SearchBar } from '../components/SearchBar';
import { CustomerRow } from '../components/CustomerRow';
import { NewSaleFAB } from '../components/NewSaleFAB';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { radius, spacing, type } from '../theme';

export default function CustomersScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [search, setSearch] = useState('');
  const [hasCredit, setHasCredit] = useState(false);

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[3] },
  title: { ...type.h1 },
  searchContainer: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] },
  filters: { flexDirection: 'row', paddingHorizontal: spacing[5], paddingBottom: spacing[3], gap: spacing[2] },
  filterChip: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.full },
  filterText: { ...type.caption },
  footer: { paddingHorizontal: spacing[5], paddingVertical: spacing[2] },
});
