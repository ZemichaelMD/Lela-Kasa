// * Compact row height
// * Better touch targets
// * Rounded “card” list
// * Cleaner selected state
// * Reduced bottom whitespace
// * Slightly improved visual hierarchy
// * More native iOS/Android picker feel

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { SearchBar } from "./SearchBar";
import { ModalSheet } from "./ModalSheet";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, type } from "../theme";

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
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!searchable) return items;

    const q = search.trim().toLowerCase();

    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q),
    );
  }, [items, search, searchable]);

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={title}
      maxHeightFraction={0.78}
    >
      <View style={styles.container}>
        {searchable && (
          <View style={styles.searchWrap}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search..."
            />
          </View>
        )}

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name="search-outline"
              size={28}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No results found
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.list,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {filtered.map((item, index) => {
              const isSelected = item.id === selectedId;
              const isLast = index === filtered.length - 1;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.75}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={[
                    styles.item,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                    isSelected && {
                      backgroundColor: colors.surfaceTinted,
                    },
                  ]}
                >
                  <View style={styles.itemContent}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.itemLabel,
                        {
                          color: isSelected
                            ? colors.primary
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>

                    {!!item.subtitle && (
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.itemSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.subtitle}
                      </Text>
                    )}
                  </View>

                  {isSelected ? (
                    <View
                      style={[
                        styles.checkWrap,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textMuted}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  modal: {
    padding: spacing[4],
    height: "auto",
  },
  container: {
    paddingBottom: spacing[6],
  },

  searchWrap: {
    marginBottom: spacing[3],
  },

  scrollContent: {
    paddingBottom: spacing[1],
  },

  list: {
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
  },

  item: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },

  itemContent: {
    flex: 1,
  },

  itemLabel: {
    ...type.bodyMedium,
    fontWeight: "600",
  },

  itemSubtitle: {
    ...type.caption,
    marginTop: 2,
  },

  checkWrap: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[8],
    gap: spacing[2],
  },

  emptyText: {
    ...type.body,
  },
});
