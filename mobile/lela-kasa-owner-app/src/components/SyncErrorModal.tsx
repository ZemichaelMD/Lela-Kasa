import React, { useEffect, useRef, useState } from 'react';
import {
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
import { radius, spacing, type } from '../theme';

interface SyncErrorModalProps {
  visible: boolean;
  onLogout: () => void;
  onReset: () => void;
}

export function SyncErrorModal({ visible, onLogout, onReset }: SyncErrorModalProps) {
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

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={() => {}}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={() => {}}>
        <Animated.View style={[styles.backdrop, { backgroundColor: colors.scrim, opacity: backdropOpacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.dialog,
                {
                  backgroundColor: colors.surface,
                  transform: [{ scale }],
                  opacity,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 16 },
                  shadowOpacity: 0.2,
                  shadowRadius: 40,
                  elevation: 24,
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="warning-outline" size={28} color={colors.danger} />
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>Sync Error</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                Your offline data is incompatible with this account. This usually happens when switching between different users.
              </Text>

              <View style={styles.btnGroup}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.danger }]}
                  onPress={onLogout}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-out-outline" size={18} color="#fff" style={styles.btnIcon} />
                  <Text style={[styles.btnLabel, { color: '#fff' }]}>Logout & Switch User</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.surfaceMuted }]}
                  onPress={onReset}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textSecondary} style={styles.btnIcon} />
                  <Text style={[styles.btnLabel, { color: colors.textSecondary }]}>Delete Data & Start Over</Text>
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
  btnGroup: {
    width: '100%',
    gap: spacing[3],
  },
  btn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  btnIcon: {
    marginRight: spacing[2],
  },
  btnLabel: {
    ...type.bodyBold,
    fontSize: 15,
  },
});
