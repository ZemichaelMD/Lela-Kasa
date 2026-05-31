import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing, type } from '../theme';

interface OfflineLimitedViewProps {
  message?: string;
}

/**
 * Reusable component shown when users try to load content
 * that isn't available in offline mode.
 *
 * Usage:
 *   <OfflineLimitedView />
 *   <OfflineLimitedView message="Can't load inventory while offline" />
 */
export function OfflineLimitedView({ message }: OfflineLimitedViewProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.textMuted} />
      </View>
      <Text style={[styles.text, { color: colors.textMuted }]}>
        {message ?? "Offline mode, can't view"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[10],
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  text: {
    ...type.body,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
});
