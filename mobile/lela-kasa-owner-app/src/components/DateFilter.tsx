import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Presets } from "react-native-pulsar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarSheet } from "./CalendarSheet";
import { useTheme } from "../context/ThemeContext";
import { t } from "../lib/i18n";
import { radius, spacing } from "../theme";

export type DatePreset = "today" | "week" | "month";

interface DateFilterProps {
  visible: boolean;
  selected: DatePreset | string;
  onSelect: (preset: DatePreset | string) => void;
  onClose: () => void;
  showCustom?: boolean;
  customFrom?: string;
  customTo?: string;
  onCustomChange?: (from: string, to: string) => void;
  onApplyCustom?: () => void;
  label: string;
  extraPills?: {
    key: string;
    labelKey: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[];
}

const presets: {
  key: DatePreset;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "today", labelKey: "today", icon: "today-outline" },
  { key: "week", labelKey: "thisWeek", icon: "calendar-outline" },
  { key: "month", labelKey: "thisMonth", icon: "calendar-number-outline" },
];

export function DateFilter({
  selected,
  onSelect,
  onClose,
  showCustom,
  customFrom,
  customTo,
  onCustomChange,
  onApplyCustom,
  label,
  extraPills,
}: DateFilterProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (expanded) {
      fadeAnim.setValue(0);
      slideAnim.setValue(-60);
      setModalVisible(true);
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 240,
          mass: 0.75,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 240,
          mass: 0.75,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [expanded, fadeAnim, slideAnim]);

  function handleToggle() {
    if (Platform.OS !== "web") {
      try {
        Presets.flick();
      } catch {}
    }
    setExpanded((prev) => !prev);
  }

  function handleSelect(key: DatePreset | string) {
    if (Platform.OS !== "web") {
      try {
        Presets.System.selection();
      } catch {}
    }
    setExpanded(false);
    onSelect(key);
    onClose();
  }

  function handleCustomTap() {
    if (Platform.OS !== "web") {
      try {
        Presets.System.selection();
      } catch {}
    }
    setExpanded(false);
    setShowCalendar(true);
  }

  function handleApplyCustom(from: string, to: string) {
    onCustomChange?.(from, to);
    onApplyCustom?.();
    setShowCalendar(false);
  }

  const allPills = [
    ...presets.map((p) => ({ ...p, onPress: () => handleSelect(p.key) })),
    ...(extraPills ?? []).map((p) => ({
      ...p,
      onPress: () => handleSelect(p.key),
    })),
    ...(showCustom
      ? [
          {
            key: "custom",
            labelKey: "custom" as string,
            icon: "options-outline" as keyof typeof Ionicons.glyphMap,
            onPress: handleCustomTap,
          },
        ]
      : []),
  ];

  return (
    <View style={st.wrapper}>
      <TouchableOpacity
        style={[
          st.trigger,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={handleToggle}
        activeOpacity={0.75}
      >
        <Ionicons
          name="calendar-number-outline"
          size={15}
          color={colors.primary}
        />
        <Text style={[st.triggerText, { color: colors.textPrimary }]}>
          {label}
        </Text>
        <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
      </TouchableOpacity>

      {modalVisible && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="none"
          onRequestClose={handleToggle}
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={handleToggle}>
            <Animated.View style={[st.modalBackdrop, { opacity: fadeAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              st.pillBar,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
                paddingTop: insets.top + spacing[2],
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={st.pillBarContent}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={st.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {allPills.map(({ key, labelKey, onPress, icon }) => {
                  const isActive = selected === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        st.pill,
                        isActive && { backgroundColor: colors.primary },
                        !isActive && {
                          backgroundColor: colors.surfaceMuted,
                          borderWidth: 1,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={onPress}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={icon as any}
                        size={14}
                        color={
                          isActive ? colors.textInverse : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          st.pillText,
                          {
                            color: isActive
                              ? colors.textInverse
                              : colors.textSecondary,
                          },
                          isActive && { fontWeight: "700" },
                        ]}
                      >
                        {t((labelKey || key) as any)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={[st.closeIcon, { backgroundColor: colors.surfaceMuted }]}
                onPress={handleToggle}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Modal>
      )}

      {showCalendar && (
        <CalendarSheet
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          rangeFrom={customFrom ?? ""}
          rangeTo={customTo ?? ""}
          onApply={handleApplyCustom}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrapper: {
    zIndex: 10,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: "700",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent",
  },
  pillBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing[2],
    paddingHorizontal: spacing[4],
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  pillBarContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingRight: spacing[2],
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "500",
  },
  closeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing[1],
  },
});
