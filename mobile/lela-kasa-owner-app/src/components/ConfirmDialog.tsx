import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { palette, radius, spacing, type } from '../theme';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      setModalVisible(true);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 18,
        stiffness: 280,
        mass: 0.7,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setModalVisible(false);
      });
    }
  }, [visible]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1], extrapolate: 'clamp' });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });
  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  const confirmBg = destructive ? colors.danger : colors.primary;
  const iconBg = destructive ? colors.dangerLight : colors.primaryLight;
  const iconColor = destructive ? colors.danger : colors.primary;
  const iconName = destructive ? 'trash-outline' : 'alert-circle-outline';

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={isLoading ? undefined : onCancel}>
        <Animated.View style={[styles.backdrop, { backgroundColor: colors.scrim, opacity: backdropOpacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.dialog,
                {
                  backgroundColor: colors.surface,
                  transform: [{ scale }],
                  opacity,
                  shadowColor: palette.slate[900],
                  shadowOffset: { width: 0, height: 16 },
                  shadowOpacity: 0.2,
                  shadowRadius: 40,
                  elevation: 24,
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                <Ionicons name={iconName} size={28} color={iconColor} />
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

              <View style={styles.btns}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.surfaceMuted }]}
                  onPress={onCancel}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.btnLabel, { color: colors.textSecondary }]}>{cancelText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: confirmBg, opacity: isLoading ? 0.7 : 1 }]}
                  onPress={onConfirm}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.btnLabel, { color: '#fff' }]}>{confirmText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  dialog: {
    width: '100%',
    borderRadius: radius['2xl'],
    paddingTop: spacing[6],
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[5],
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  title: {
    ...type.h3,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  message: {
    ...type.body,
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  btns: {
    flexDirection: 'row',
    gap: spacing[3],
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    ...type.bodyBold,
    fontSize: 15,
  },
});
