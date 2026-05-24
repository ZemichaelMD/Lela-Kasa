import React, { useState, useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type } from '../theme';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

const toasts: ToastMessage[] = [];
const listeners = new Set<(t: ToastMessage[]) => void>();

let nextId = 0;

export function showToast(message: string, type: ToastType = 'info', duration = 3000) {
  const id = ++nextId;
  toasts.push({ id, message, type });
  listeners.forEach(fn => fn([...toasts]));
  setTimeout(() => {
    const idx = toasts.findIndex(t => t.id === id);
    if (idx >= 0) {
      toasts.splice(idx, 1);
      listeners.forEach(fn => fn([...toasts]));
    }
  }, duration);
}

export function ToastContainer() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const animValues = useRef<Record<number, Animated.Value>>({});

  useEffect(() => {
    const handler = (t: ToastMessage[]) => {
      setMessages(t);
      t.forEach(msg => {
        if (!animValues.current[msg.id]) {
          animValues.current[msg.id] = new Animated.Value(0);
          Animated.sequence([
            Animated.timing(animValues.current[msg.id], {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.delay(2500),
            Animated.timing(animValues.current[msg.id], {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            delete animValues.current[msg.id];
          });
        }
      });
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (messages.length === 0) return null;

  const topOffset = Platform.OS === 'ios' ? Math.max(insets.top, 12) : 12;

  return (
    <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
      {messages.map(msg => {
        const anim = animValues.current[msg.id] ?? new Animated.Value(0);
        const bgColor = msg.type === 'success' ? colors.success : msg.type === 'error' ? colors.danger : colors.primary;
        const icon = msg.type === 'success' ? 'checkmark-circle' : msg.type === 'error' ? 'alert-circle' : 'information-circle';

        return (
          <Animated.View
            key={msg.id}
            style={[
              styles.toast,
              { backgroundColor: bgColor, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
            ]}
          >
            <Ionicons name={icon} size={20} color={colors.textInverse} />
            <Text style={[styles.message, { color: colors.textInverse }]} numberOfLines={2}>{msg.message}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: spacing[4],
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  message: {
    ...type.bodyMedium,
    flex: 1,
  },
});
