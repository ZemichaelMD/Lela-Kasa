import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EthiopianDatePicker } from './EthiopianDatePicker';
import { ModalSheet } from './ModalSheet';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { radius, spacing, type } from '../theme';

export type DatePreset = 'today' | 'week' | 'month';

interface DateFilterProps {
  visible: boolean;
  selected: DatePreset;
  onSelect: (preset: DatePreset) => void;
  onClose: () => void;
  showCustom?: boolean;
  customFrom?: string;
  customTo?: string;
  onCustomChange?: (from: string, to: string) => void;
  onApplyCustom?: () => void;
}

const presets: { key: DatePreset; labelKey: string; descKey: string }[] = [
  { key: 'today', labelKey: 'today', descKey: 'todayDesc' },
  { key: 'week', labelKey: 'thisWeek', descKey: 'thisWeekDesc' },
  { key: 'month', labelKey: 'thisMonth', descKey: 'thisMonthDesc' },
];

export function DateFilter({
  visible,
  selected,
  onSelect,
  onClose,
  showCustom,
  customFrom,
  customTo,
  onCustomChange,
  onApplyCustom,
}: DateFilterProps) {
  const { colors } = useTheme();
  const [showCustomRange, setShowCustomRange] = useState(false);

  const handleSelect = (key: DatePreset) => {
    setShowCustomRange(false);
    onSelect(key);
    onClose();
  };

  const canApply = !!customFrom && !!customTo;

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={t('filterByDate')}
      maxHeightFraction={0.65}
      footer={
        showCustom && showCustomRange ? (
          <TouchableOpacity
            style={[
              styles.applyBtn,
              { backgroundColor: canApply ? colors.primary : colors.surfaceMuted },
            ]}
            onPress={() => { onApplyCustom?.(); onClose(); }}
            disabled={!canApply}
            activeOpacity={0.85}
          >
            <Text style={[styles.applyBtnText, { color: canApply ? colors.textInverse : colors.textMuted }]}>
              {t('apply')}
            </Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      <View style={[styles.listCard, { backgroundColor: colors.surfaceMuted, borderRadius: radius.lg }]}>
        {presets.map(({ key, labelKey, descKey }, index) => {
          const isActive = selected === key && !showCustomRange;
          const isLast = index === presets.length - 1 && !showCustom;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.optionRow,
                !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
              onPress={() => handleSelect(key)}
              activeOpacity={0.6}
            >
              <View style={[styles.radio, { borderColor: isActive ? colors.primary : colors.borderStrong }]}>
                {isActive && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: isActive ? colors.primary : colors.textPrimary }]}>
                  {t(labelKey as any)}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                  {t(descKey as any)}
                </Text>
              </View>
              {isActive && (
                <Ionicons name="checkmark" size={16} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}

        {showCustom && (
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setShowCustomRange(v => !v)}
            activeOpacity={0.6}
          >
            <View style={[styles.radio, { borderColor: showCustomRange ? colors.primary : colors.borderStrong }]}>
              {showCustomRange && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, { color: showCustomRange ? colors.primary : colors.textPrimary }]}>
                {t('customRange')}
              </Text>
              <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                {t('customRangeDesc')}
              </Text>
            </View>
            <Ionicons
              name={showCustomRange ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {showCustom && showCustomRange && (
        <View style={[styles.customSection, { borderColor: colors.border }]}>
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={[styles.dateColLabel, { color: colors.textMuted }]}>From</Text>
              <EthiopianDatePicker
                value={customFrom ?? ''}
                onChange={(v) => onCustomChange?.(v, customTo ?? '')}
                placeholder="Start date"
              />
            </View>
            <Ionicons name="arrow-forward" size={14} color={colors.textMuted} style={styles.dateArrow} />
            <View style={styles.dateCol}>
              <Text style={[styles.dateColLabel, { color: colors.textMuted }]}>To</Text>
              <EthiopianDatePicker
                value={customTo ?? ''}
                onChange={(v) => onCustomChange?.(customFrom ?? '', v)}
                placeholder="End date"
              />
            </View>
          </View>
        </View>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  listCard: {
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionText: { flex: 1 },
  optionLabel: { ...type.bodyMedium, fontSize: 14 },
  optionDesc: { ...type.micro, marginTop: 1 },
  customSection: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dateCol: { flex: 1 },
  dateColLabel: { ...type.micro, marginBottom: spacing[1] },
  dateArrow: { marginTop: spacing[5] },
  applyBtn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: { ...type.bodyBold, fontSize: 16 },
});
