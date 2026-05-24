import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';

export function SegmentControl({
  segments,
  activeIndex,
  onChange,
}: {
  segments: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceMuted }]}>
      {segments.map((segment, index) => (
        <TouchableOpacity
          key={segment}
          style={[
            styles.segment,
            index === 0 && styles.segmentFirst,
            index === segments.length - 1 && styles.segmentLast,
            index === activeIndex && { backgroundColor: colors.primary },
          ]}
          onPress={() => onChange(index)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              { color: index === activeIndex ? colors.textInverse : colors.textSecondary },
            ]}
          >
            {segment}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 2,
    marginHorizontal: spacing[5],
    marginVertical: spacing[3],
  },
  segment: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentFirst: {},
  segmentLast: {},
  segmentActive: {
  },
  segmentText: {
    ...type.caption,
    fontWeight: '600',
  },
});
