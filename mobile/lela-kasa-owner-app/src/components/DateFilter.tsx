import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EthiopianDatePicker } from './EthiopianDatePicker';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';
import { radius, spacing, type, shadow } from '../theme';

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

const presets: { key: DatePreset; label: string; icon: 'today-outline' | 'calendar-outline' | 'calendar-number-outline'; desc: string }[] = [
  { key: 'today', label: 'today', icon: 'today-outline', desc: 'todayDesc' },
  { key: 'week', label: 'thisWeek', icon: 'calendar-outline', desc: 'thisWeekDesc' },
  { key: 'month', label: 'thisMonth', icon: 'calendar-number-outline', desc: 'thisMonthDesc' },
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, ...shadow.lg }]}>
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('filterByDate')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.presets}>
            {presets.map(({ key, label, icon, desc }) => {
              const isActive = selected === key && !showCustomRange;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.presetCard,
                    {
                      backgroundColor: isActive ? colors.primary : colors.background,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.presetIcon, { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : colors.primaryLight }]}>
                    <Ionicons name={icon} size={22} color={isActive ? colors.textInverse : colors.primary} />
                  </View>
                  <View style={styles.presetTexts}>
                    <Text style={[styles.presetLabel, { color: isActive ? colors.textInverse : colors.textPrimary }]}>
                      {t(label as any)}
                    </Text>
                    <Text style={[styles.presetDesc, { color: isActive ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
                      {t(desc as any)}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={18} color={colors.textInverse} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {showCustom && (
              <TouchableOpacity
                style={[
                  styles.presetCard,
                  {
                    backgroundColor: showCustomRange ? colors.primary : colors.background,
                    borderColor: showCustomRange ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setShowCustomRange(!showCustomRange)}
                activeOpacity={0.7}
              >
                <View style={[styles.presetIcon, { backgroundColor: showCustomRange ? 'rgba(255,255,255,0.2)' : colors.primaryLight }]}>
                  <Ionicons name="calendar-outline" size={22} color={showCustomRange ? colors.textInverse : colors.primary} />
                </View>
                <View style={styles.presetTexts}>
                  <Text style={[styles.presetLabel, { color: showCustomRange ? colors.textInverse : colors.textPrimary }]}>
                    {t('customRange')}
                  </Text>
                  <Text style={[styles.presetDesc, { color: showCustomRange ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
                    {t('customRangeDesc')}
                  </Text>
                </View>
                {showCustomRange && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={18} color={colors.textInverse} />
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {showCustom && showCustomRange && (
            <View style={[styles.customSection, { borderTopColor: colors.border }]}>
              <View style={styles.customDateRow}>
                <EthiopianDatePicker value={customFrom ?? ''} onChange={(v) => onCustomChange?.(v, customTo ?? '')} placeholder="From" />
                <Text style={[styles.dateArrow, { color: colors.textMuted }]}>→</Text>
                <EthiopianDatePicker value={customTo ?? ''} onChange={(v) => onCustomChange?.(customFrom ?? '', v)} placeholder="To" />
              </View>
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: colors.primary }, (!customFrom || !customTo) && styles.applyButtonDisabled]}
                onPress={() => { onApplyCustom?.(); onClose(); }}
                disabled={!customFrom || !customTo}
                activeOpacity={0.7}
              >
                <Text style={styles.applyButtonText}>{t('apply')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: spacing[6] },
  handleContainer: { alignItems: 'center', paddingVertical: spacing[3] },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingBottom: spacing[4] },
  title: { ...type.h3 },
  closeButton: { padding: spacing[1] },
  presets: { paddingHorizontal: spacing[5], gap: spacing[3] },
  presetCard: { flexDirection: 'row', alignItems: 'center', padding: spacing[4], borderRadius: radius.lg, borderWidth: 1.5 },
  presetIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  presetTexts: { flex: 1, marginLeft: spacing[3] },
  presetLabel: { ...type.bodyBold },
  presetDesc: { ...type.caption, marginTop: 2 },
  checkmark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  customSection: { paddingHorizontal: spacing[5], paddingTop: spacing[4], marginTop: spacing[3], borderTopWidth: 1 },
  customDateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dateArrow: { ...type.body },
  applyButton: { borderRadius: radius.md, paddingVertical: spacing[3], alignItems: 'center', marginTop: spacing[3] },
  applyButtonDisabled: { opacity: 0.5 },
  applyButtonText: { ...type.bodyBold, color: '#fff' },
});
