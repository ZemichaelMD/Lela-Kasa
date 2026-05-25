import React, { useState, useMemo, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { getSdk } from '../lib/sdk';
import { QK } from '../lib/query-keys';
import type { CreateSaleDto, CreateSaleLineDto, CreateSalePaymentDto, PaymentMethod } from '../lib/sdk/resources/sales';
import type { PickerItem } from '../components/PickerSheet';
import { PickerSheet } from '../components/PickerSheet';
import { AmountInput } from '../components/AmountInput';
import { showToast } from '../components/Toast';
import { t } from '../lib/i18n';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';

interface SaleLineItem {
  beverageId: string;
  beverageName: string;
  boxes: number;
  bottles: number;
  pricePerBoxCents: number;
  pricePerBottleCents: number;
}

interface ContainerKasaItem {
  beverageId: string;
  beverageName: string;
  count: number;
}

interface TierPrice {
  beverageId: string;
  pricePerBoxCents: number;
  pricePerBottleCents: number;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function NewSaleScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'NewSale'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const preSelectedCustomerId = route.params?.customerId;
  const insets = useSafeAreaInsets();

  const [saleDate] = useState(todayStr());
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [selectedTier, setSelectedTier] = useState<{ id: string; name: string } | null>(null);
  const [showTierPicker, setShowTierPicker] = useState(false);
  const [lines, setLines] = useState<SaleLineItem[]>([]);
  const [showBeveragePicker, setShowBeveragePicker] = useState(false);
  const [returnBoxes, setReturnBoxes] = useState('0');
  const [returnBottles, setReturnBottles] = useState('0');
  const [containerKasas, setContainerKasas] = useState<ContainerKasaItem[]>([]);
  const [showContainerKasaPicker, setShowContainerKasaPicker] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; name: string } | null>(null);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: QK.customers({}),
    queryFn: () => getSdk().customers.list({ pageSize: 100 }),
  });

  const { data: beveragesData } = useQuery({
    queryKey: QK.beverages(),
    queryFn: () => getSdk().beverages.list({ pageSize: 100, isActive: true }),
  });

  const { data: tiers } = useQuery({
    queryKey: QK.priceTiers(),
    queryFn: () => getSdk().priceTiers.list(),
  });

  const { data: tierPrices, isLoading: loadingPrices } = useQuery({
    queryKey: ['tier-prices', selectedTier?.id],
    queryFn: () => {
      if (!selectedTier) return Promise.resolve([]);
      return getSdk().priceTiers.getPrices(selectedTier.id);
    },
    enabled: !!selectedTier,
  });

  const { data: accounts } = useQuery({
    queryKey: QK.paymentAccounts(),
    queryFn: () => getSdk().paymentAccounts.list(),
  });

  React.useEffect(() => {
    if (tiers && !selectedTier) {
      const defaultTier = tiers.find(t => t.isDefault) ?? tiers[0];
      if (defaultTier) setSelectedTier({ id: defaultTier.id, name: defaultTier.name });
    }
  }, [tiers]);

  React.useEffect(() => {
    if (preSelectedCustomerId && customersData && tiers) {
      const customer = customersData.data.find(c => c.id === preSelectedCustomerId);
      if (customer) {
        setSelectedCustomer({ id: customer.id, name: customer.name });
        if (customer.priceTierId) {
          const tier = tiers.find(t => t.id === customer.priceTierId);
          if (tier) setSelectedTier({ id: tier.id, name: tier.name });
        }
      }
    }
  }, [preSelectedCustomerId, customersData, tiers]);

  // Is the price tier locked for the selected customer?
  const tierLocked = useMemo(() => {
    if (!selectedCustomer || !customersData) return false;
    const c = customersData.data.find(c => c.id === selectedCustomer.id);
    return c?.priceTierLocked ?? false;
  }, [selectedCustomer, customersData]);

  const priceMap = useMemo(() => {
    const map: Record<string, TierPrice> = {};
    (tierPrices ?? []).forEach(p => {
      map[p.beverageId] = {
        beverageId: p.beverageId,
        pricePerBoxCents: p.pricePerBoxCents,
        pricePerBottleCents: p.pricePerBottleCents,
      };
    });
    return map;
  }, [tierPrices]);

  const customerItems: PickerItem[] = (customersData?.data ?? []).map(c => ({
    id: c.id,
    label: c.name,
    subtitle: c.phone ?? undefined,
  }));

  const beverageItems: PickerItem[] = (beveragesData?.data ?? []).map(b => ({
    id: b.id,
    label: b.name,
    subtitle: b.brand ? `${b.brand} · ${b.bottlesPerBox} btls/box` : `${b.bottlesPerBox} btls/box`,
  }));

  const tierItems: PickerItem[] = (tiers ?? []).map(t => ({
    id: t.id,
    label: t.name,
  }));

  const accountItems: PickerItem[] = (accounts ?? []).map(a => ({
    id: a.id,
    label: a.name,
    subtitle: a.kind,
  }));

  const totalBottles = useMemo(() => lines.reduce((sum, l) => sum + l.bottles, 0), [lines]);
  const showContainerKasa = totalBottles >= 24 || containerKasas.length > 0;

  const subtotalCents = useMemo(() => {
    return lines.reduce((sum, line) => {
      return sum + line.boxes * line.pricePerBoxCents + line.bottles * line.pricePerBottleCents;
    }, 0);
  }, [lines]);

  const paidCents = useMemo(() => {
    const amount = parseFloat(paymentAmount);
    return amount > 0 ? Math.round(amount * 100) : 0;
  }, [paymentAmount]);

  const creditDelta = subtotalCents - paidCents;

  const createSaleMutation = useMutation({
    mutationFn: (dto: CreateSaleDto) => getSdk().sales.create(dto),
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: QK.sales() });
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
      if (sale.customerId) {
        queryClient.invalidateQueries({ queryKey: QK.customer(sale.customerId) });
        queryClient.invalidateQueries({ queryKey: QK.customerLedger(sale.customerId) });
      }
      navigation.goBack();
      showToast(t('newSale.saleRecordedSuccess'), 'success');
    },
    onError: (err: any) => {
      showToast(err?.message ?? t('newSale.failedToCreateSale'), 'error');
    },
  });

  const handleAddBeverage = useCallback((item: PickerItem) => {
    const beverage = beveragesData?.data.find(b => b.id === item.id);
    if (!beverage || !selectedTier) return;
    const prices = priceMap[beverage.id];
    if (!prices) {
      showToast(t('newSale.noPriceSet'), 'error');
      return;
    }
    setLines(prev => [...prev, {
      beverageId: beverage.id,
      beverageName: beverage.name,
      boxes: 0,
      bottles: 0,
      pricePerBoxCents: prices.pricePerBoxCents,
      pricePerBottleCents: prices.pricePerBottleCents,
    }]);
  }, [beveragesData, selectedTier, priceMap]);

  const handleRemoveLine = useCallback((index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateLineQty = useCallback((index: number, field: 'boxes' | 'bottles', delta: number) => {
    setLines(prev => {
      const newLines = [...prev];
      newLines[index] = { ...newLines[index], [field]: Math.max(0, newLines[index][field] + delta) };
      return newLines;
    });
  }, []);

  const handleAddContainerKasa = useCallback((item: PickerItem) => {
    const beverage = beveragesData?.data.find(b => b.id === item.id);
    if (!beverage) return;
    setContainerKasas(prev => [...prev, { beverageId: beverage.id, beverageName: beverage.name, count: 1 }]);
  }, [beveragesData]);

  const updateContainerKasaCount = useCallback((index: number, delta: number) => {
    setContainerKasas(prev => {
      const next = [...prev];
      next[index] = { ...next[index], count: Math.max(1, next[index].count + delta) };
      return next;
    });
  }, []);

  const removeContainerKasa = useCallback((index: number) => {
    setContainerKasas(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = () => {
    if (!selectedCustomer) {
      showToast(t('newSale.pleaseSelectCustomer'), 'error');
      return;
    }
    if (!selectedTier) {
      showToast(t('newSale.pleaseSelectTier'), 'error');
      return;
    }
    if (lines.length === 0) {
      showToast(t('newSale.pleaseAddItem'), 'error');
      return;
    }
    const hasItems = lines.some(l => l.boxes > 0 || l.bottles > 0);
    if (!hasItems) {
      showToast(t('newSale.pleaseSetQuantity'), 'error');
      return;
    }

    const saleLines: CreateSaleLineDto[] = lines.map(l => ({
      beverageId: l.beverageId,
      priceTierId: selectedTier.id,
      boxes: l.boxes,
      bottles: l.bottles,
    }));

    const payments: CreateSalePaymentDto[] | undefined = paidCents > 0 && selectedAccount
      ? [{
          paymentAccountId: selectedAccount.id,
          amountCents: paidCents,
          method: paymentMethod,
        }]
      : undefined;

    const validKasas = containerKasas.filter(k => k.beverageId && k.count > 0);
    const dto: CreateSaleDto = {
      saleDate,
      customerId: selectedCustomer.id,
      priceTierId: selectedTier.id,
      lines: saleLines,
      boxesReturnedOnSale: parseInt(returnBoxes) || 0,
      bottlesReturnedOnSale: parseInt(returnBottles) || 0,
      payments,
      containerKasas: validKasas.map(k => ({ beverageId: k.beverageId, count: k.count })),
    };

    createSaleMutation.mutate(dto);
  };

  const pricesLoaded = !!selectedTier && !loadingPrices;
  const hasPrices = pricesLoaded && (tierPrices?.length ?? 0) > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing[4]) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('newSale.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('newSale.customer')}</Text>
          <TouchableOpacity
            style={[styles.pickerField, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowCustomerPicker(true)}
          >
            <Text style={[styles.pickerValue, { color: selectedCustomer ? colors.textPrimary : colors.textMuted }]}>
              {selectedCustomer?.name ?? t('newSale.selectCustomer')}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('newSale.priceTier')}{tierLocked ? ' (locked)' : ''}
          </Text>
          <TouchableOpacity
            style={[styles.pickerField, { backgroundColor: colors.surface, borderColor: colors.border, opacity: tierLocked ? 0.6 : 1 }]}
            onPress={() => !tierLocked && setShowTierPicker(true)}
            disabled={tierLocked}
          >
            <Text style={[styles.pickerValue, { color: selectedTier ? colors.textPrimary : colors.textMuted }]}>
              {selectedTier?.name ?? t('newSale.selectTier')}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {selectedTier && loadingPrices && (
          <View style={styles.loadingPrices}>
            <Text style={[styles.loadingPricesText, { color: colors.textSecondary }]}>{t('newSale.loadingPrices')}</Text>
          </View>
        )}

        {selectedTier && !loadingPrices && !hasPrices && (
          <View style={[styles.noPrices, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="warning-outline" size={20} color={colors.warning} />
            <Text style={[styles.noPricesText, { color: colors.warning }]}>{t('newSale.noPricesWarning')}</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('newSale.items')}</Text>
        {lines.map((line, index) => (
          <View key={index} style={[styles.lineItem, { backgroundColor: colors.surface }]}>
            <View style={styles.lineHeader}>
              <Text style={[styles.lineName, { color: colors.textPrimary }]}>{line.beverageName}</Text>
              <Text style={[styles.linePrice, { color: colors.textSecondary }]}>
                {line.pricePerBoxCents > 0 && `Br ${(line.pricePerBoxCents / 100).toFixed(2)}/box`}
                {line.pricePerBoxCents > 0 && line.pricePerBottleCents > 0 && ' · '}
                {line.pricePerBottleCents > 0 && `Br ${(line.pricePerBottleCents / 100).toFixed(2)}/btl`}
              </Text>
              <TouchableOpacity onPress={() => handleRemoveLine(index)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.lineInputs}>
              <View style={styles.lineInput}>
                <Text style={[styles.lineInputLabel, { color: colors.textSecondary }]}>{t('newSale.boxes')}</Text>
                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.surfaceMuted }]}
                  onPress={() => updateLineQty(index, 'boxes', -1)}
                >
                  <Ionicons name="remove" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.qtyValue, { color: colors.textPrimary }]}>{line.boxes}</Text>
                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.surfaceMuted }]}
                  onPress={() => updateLineQty(index, 'boxes', 1)}
                >
                  <Ionicons name="add" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <View style={styles.lineInput}>
                <Text style={[styles.lineInputLabel, { color: colors.textSecondary }]}>{t('newSale.bottles')}</Text>
                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.surfaceMuted }]}
                  onPress={() => updateLineQty(index, 'bottles', -1)}
                >
                  <Ionicons name="remove" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.qtyValue, { color: colors.textPrimary }]}>{line.bottles}</Text>
                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.surfaceMuted }]}
                  onPress={() => updateLineQty(index, 'bottles', 1)}
                >
                  <Ionicons name="add" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addLineButton, { borderColor: hasPrices ? colors.primary : colors.border }, !hasPrices && { backgroundColor: colors.surfaceMuted }]}
          onPress={() => hasPrices && setShowBeveragePicker(true)}
          disabled={!hasPrices}
        >
          <Ionicons name="add-circle-outline" size={20} color={hasPrices ? colors.primary : colors.textMuted} />
          <Text style={[styles.addLineText, { color: hasPrices ? colors.primary : colors.textMuted }]}>
            {hasPrices ? t('newSale.addItem') : t('newSale.noPricesAvailable')}
          </Text>
        </TouchableOpacity>

        <View style={styles.returnsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('newSale.returnsOnSale')}</Text>
          <View style={styles.returnsRow}>
            <View style={styles.returnInput}>
              <Text style={[styles.returnLabel, { color: colors.textSecondary }]}>{t('newSale.boxes')}</Text>
              <AmountInput value={returnBoxes} onChangeText={setReturnBoxes} style={styles.returnAmount} />
            </View>
            <View style={styles.returnInput}>
              <Text style={[styles.returnLabel, { color: colors.textSecondary }]}>{t('newSale.bottles')}</Text>
              <AmountInput value={returnBottles} onChangeText={setReturnBottles} style={styles.returnAmount} />
            </View>
          </View>
        </View>

        {showContainerKasa && (
          <View style={styles.containerKasaSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('newSale.containerKasaSection')}</Text>
            {totalBottles >= 24 && (
              <Text style={[styles.kasaHint, { color: colors.textSecondary }]}>
                {totalBottles} {t('newSale.containerKasaHint')}
              </Text>
            )}
            {containerKasas.map((kasa, index) => (
              <View key={index} style={[styles.kasaItem, { backgroundColor: colors.surface }]}>
                <View style={styles.kasaItemHeader}>
                  <Text style={[styles.lineName, { color: colors.textPrimary }]}>{kasa.beverageName}</Text>
                  <TouchableOpacity onPress={() => removeContainerKasa(index)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.lineInput}>
                  <Text style={[styles.lineInputLabel, { color: colors.textSecondary }]}>{t('newSale.containerKasaCount')}</Text>
                  <TouchableOpacity
                    style={[styles.qtyButton, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => updateContainerKasaCount(index, -1)}
                  >
                    <Ionicons name="remove" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.qtyValue, { color: colors.textPrimary }]}>{kasa.count}</Text>
                  <TouchableOpacity
                    style={[styles.qtyButton, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => updateContainerKasaCount(index, 1)}
                  >
                    <Ionicons name="add" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addLineButton, { borderColor: colors.primary }]}
              onPress={() => setShowContainerKasaPicker(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.addLineText, { color: colors.primary }]}>
                {t('newSale.addContainerKasa')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.paymentSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('newSale.paymentOptional')}</Text>
          <AmountInput value={paymentAmount} onChangeText={setPaymentAmount} placeholder="0.00" />
          <View style={styles.methodRow}>
            {([
              { key: 'CASH', label: t('newSale.cash') },
              { key: 'BANK_TRANSFER', label: t('newSale.bankTransfer') },
              { key: 'MOBILE_MONEY', label: t('newSale.mobileMoney') },
              { key: 'OTHER', label: t('newSale.other') },
            ] as const).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.methodChip, { backgroundColor: paymentMethod === key ? colors.primary : colors.surfaceMuted }]}
                onPress={() => setPaymentMethod(key)}
              >
                <Text style={[styles.methodText, { color: paymentMethod === key ? colors.textInverse : colors.textSecondary }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.pickerField, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowAccountPicker(true)}
          >
            <Text style={[styles.pickerValue, { color: selectedAccount ? colors.textPrimary : colors.textMuted }]}>
              {selectedAccount?.name ?? t('newSale.selectAccount')}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.totals, { backgroundColor: colors.surface }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{t('newSale.subtotal')}</Text>
            <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{formatCurrency(subtotalCents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{t('newSale.paid')}</Text>
            <Text style={[styles.totalValue, { color: colors.success }]}>{formatCurrency(paidCents)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowFinal, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabelFinal, { color: colors.textPrimary }]}>{t('newSale.creditDelta')}</Text>
            <Text style={[styles.totalValueFinal, { color: creditDelta > 0 ? colors.danger : colors.success }]}>
              {formatCurrency(creditDelta)} {creditDelta > 0 ? '↑' : ''}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }, createSaleMutation.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={createSaleMutation.isPending}
        >
          <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
            {createSaleMutation.isPending ? t('newSale.recording') : t('newSale.recordSale')}
          </Text>
        </TouchableOpacity>
      </View>

      <PickerSheet visible={showCustomerPicker} title={t('newSale.customer')} items={customerItems} onSelect={(item) => {
        const c = customersData?.data.find(x => x.id === item.id);
        if (c) setSelectedCustomer({ id: c.id, name: c.name });
      }} onClose={() => setShowCustomerPicker(false)} />

      <PickerSheet visible={showTierPicker} title={t('newSale.priceTier')} items={tierItems} onSelect={(item) => {
        const t = tiers?.find(x => x.id === item.id);
        if (t) setSelectedTier({ id: t.id, name: t.name });
      }} onClose={() => setShowTierPicker(false)} />

      <PickerSheet visible={showBeveragePicker} title={t('newSale.addBeverage')} items={beverageItems} onSelect={handleAddBeverage} onClose={() => setShowBeveragePicker(false)} />

      <PickerSheet visible={showAccountPicker} title={t('newSale.paymentAccount')} items={accountItems} onSelect={(item) => {
        const a = accounts?.find(x => x.id === item.id);
        if (a) setSelectedAccount({ id: a.id, name: a.name });
      }} onClose={() => setShowAccountPicker(false)} />

      <PickerSheet visible={showContainerKasaPicker} title={t('newSale.containerKasaType')} items={beverageItems} onSelect={handleAddContainerKasa} onClose={() => setShowContainerKasaPicker(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  headerTitle: {
    ...type.h3,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
  },
  field: {
    marginBottom: spacing[4],
  },
  label: {
    ...type.caption,
    marginBottom: spacing[2],
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  pickerValue: {
    ...type.body,
  },
  pickerPlaceholder: {
    ...type.body,
  },
  loadingPrices: {
    padding: spacing[4],
    alignItems: 'center',
  },
  loadingPricesText: {
    ...type.caption,
  },
  noPrices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radius.sm,
    marginBottom: spacing[3],
  },
  noPricesText: {
    ...type.caption,
    flex: 1,
  },
  sectionTitle: {
    ...type.h4,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  lineItem: {
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  lineName: {
    ...type.bodyMedium,
    flex: 1,
  },
  linePrice: {
    ...type.micro,
    marginRight: spacing[2],
  },
  lineInputs: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  lineInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  lineInputLabel: {
    ...type.caption,
    width: 40,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    ...type.bodyBold,
    width: 24,
    textAlign: 'center',
  },
  addLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderRadius: radius.md,
    borderStyle: 'dashed',
  },
  addLineButtonDisabled: {
    opacity: 0.6,
  },
  addLineText: {
    ...type.bodyMedium,
  },
  returnsSection: {
    marginTop: spacing[4],
  },
  containerKasaSection: {
    marginTop: spacing[4],
  },
  kasaHint: {
    ...type.caption,
    marginBottom: spacing[2],
  },
  kasaItem: {
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  kasaItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  returnsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  returnInput: {
    flex: 1,
  },
  returnLabel: {
    ...type.caption,
    marginBottom: spacing[2],
  },
  returnAmount: {
    height: 40,
  },
  paymentSection: {
    marginTop: spacing[4],
  },
  methodRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
    flexWrap: 'wrap',
  },
  methodChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
  },
  methodText: {
    ...type.caption,
  },
  totals: {
    marginTop: spacing[6],
    borderRadius: radius.md,
    padding: spacing[4],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  totalLabel: {
    ...type.body,
  },
  totalValue: {
    ...type.bodyBold,
  },
  totalRowFinal: {
    borderTopWidth: 1,
    marginTop: spacing[2],
    paddingTop: spacing[3],
  },
  totalLabelFinal: {
    ...type.bodyMedium,
  },
  totalValueFinal: {
    ...type.h4,
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
  },
  submitButton: {
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...type.bodyBold,
    fontSize: 17,
  },
});
