import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../context/ThemeContext";
import { radius, spacing, type } from "../theme";

const { height: SCREEN_H } = Dimensions.get("window");

const HANDLE_HEIGHT = 12;
const HEADER_HEIGHT = 40;

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightFraction?: number;
}

export function ModalSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  maxHeightFraction = 0.85,
}: ModalSheetProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [needsScroll, setNeedsScroll] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      setModalVisible(true);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 22,
        stiffness: 240,
        mass: 0.85,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setModalVisible(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setBodyHeight(0);
      setNeedsScroll(false);
    }
  }, [visible]);

  const maxSheetHeight = SCREEN_H * maxHeightFraction;
  const footerHeight = footer ? 54 : 0;
  const availableBodyHeight =
    maxSheetHeight - HANDLE_HEIGHT - HEADER_HEIGHT - footerHeight;

  const handleBodyLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const h = e.nativeEvent.layout.height;
      setBodyHeight(h);
      setNeedsScroll(h > availableBodyHeight);
    },
    [availableBodyHeight],
  );

  const sheetHeight = Math.min(
    HANDLE_HEIGHT + HEADER_HEIGHT + bodyHeight + footerHeight,
    maxSheetHeight,
  );

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_H, 0],
    extrapolate: "clamp",
  });
  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const bodyContent = needsScroll ? (
    <ScrollView
      style={{ maxHeight: availableBodyHeight }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View>{children}</View>
  );

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        automaticOffset
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              { backgroundColor: colors.scrim, opacity: backdropOpacity },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              height: sheetHeight,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handleBar}>
            <View
              style={[styles.handle, { backgroundColor: colors.borderStrong }]}
            />
          </View>

          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} activeOpacity={0.7}>
              <View
                style={[
                  styles.closeBtn,
                  { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.body} onLayout={handleBodyLayout}>
            {bodyContent}
          </View>

          {footer ? (
            <View
              style={[
                styles.footer,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    overflow: "hidden",
  },
  handleBar: {
    alignItems: "center",
    paddingTop: spacing[2],
    paddingBottom: spacing[0],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[0],
    paddingBottom: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    ...type.h3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[0],
  },
  scrollContent: {
    paddingBottom: spacing[1],
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
