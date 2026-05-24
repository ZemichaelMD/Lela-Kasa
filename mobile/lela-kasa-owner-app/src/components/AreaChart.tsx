import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';

interface AreaChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
}

export function AreaChart({ data, labels, height = 100, color }: AreaChartProps) {
  const { colors } = useTheme();
  const chartColor = color ?? colors.primary;

  if (!data.length || data.every((v) => v === 0)) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={[styles.emptyLine, { backgroundColor: colors.border }]} />
      </View>
    );
  }

  const max = Math.max(...data, 1);
  const points = data.map((value) => Math.max((value / max) * 100, 2));

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.chartArea}>
        {points.map((h, i) => (
          <View key={i} style={styles.barContainer}>
            <View
              style={[
                styles.bar,
                {
                  height: `${h}%`,
                  backgroundColor: chartColor,
                  opacity: 0.2 + (i / Math.max(points.length - 1, 1)) * 0.8,
                },
              ]}
            />
          </View>
        ))}
      </View>
      {labels && (
        <View style={styles.labels}>
          {labels.map((label, i) => (
            <Text key={i} style={[styles.label, { color: colors.textMuted }]}>
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80, paddingHorizontal: 4 },
  barContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: 8, borderRadius: 4, minHeight: 2 },
  emptyLine: { width: '100%', height: 2, borderRadius: 1, marginTop: 39 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 },
  label: { fontSize: 9, textAlign: 'center', flex: 1 },
});
