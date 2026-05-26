import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SearchBar } from './SearchBar';
import { ModalSheet } from './ModalSheet';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';

export interface PickerItem {
  id: string;
  label: string;
  subtitle?: string;
}

export function PickerSheet({
  visible,
  title,
  items,
  onSelect,
  onClose,
  searchable = true,
  selectedId,
}: {
  visible: boolean;
  title: string;
  items: PickerItem[];
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
  searchable?: boolean;
  selectedId?: string;
}) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const filtered = searchable
    ? items.filter(item =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        (item.subtitle?.toLowerCase().includes(search.toLowerCase()) ?? false),
      )
    : items;

  return (
    <ModalSheet visible={visible} onClose={onClose} title={title} maxHeightFraction={0.75}>
      {searchable && (
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search…" />
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No results</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((item, index) => {
            const isSelected = item.id === selectedId;
            const isLast = index === filtered.length - 1;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.item,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  isSelected && { backgroundColor: colors.surfaceTinted },
                ]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={styles.itemContent}>
                  <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                  {item.subtitle && (
                    <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                  )}
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    marginBottom: spacing[3],
  },
  list: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  itemContent: { flex: 1 },
  itemLabel: { ...type.bodyMedium },
  itemSubtitle: { ...type.caption, marginTop: 2 },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing[10],
    gap: spacing[3],
  },
  emptyText: { ...type.body },
});
