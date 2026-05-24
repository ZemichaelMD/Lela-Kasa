import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SearchBar } from './SearchBar';
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
}: {
  visible: boolean;
  title: string;
  items: PickerItem[];
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
  searchable?: boolean;
}) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();

  const filtered = searchable
    ? items.filter(item =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        (item.subtitle?.toLowerCase().includes(search.toLowerCase()) ?? false),
      )
    : items;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom || spacing[6] }]}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing[4]), borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {searchable && (
            <View style={styles.searchContainer}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
              />
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, { borderBottomColor: colors.border }]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                {item.subtitle && (
                  <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No results found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
  },
  title: {
    ...type.h3,
  },
  searchContainer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  item: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  itemLabel: {
    ...type.bodyMedium,
  },
  itemSubtitle: {
    ...type.caption,
    marginTop: 2,
  },
  empty: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  emptyText: {
    ...type.body,
  },
});
