import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, ViewStyle } from "react-native";
import { radius as radiusToken } from "../theme";
import { useTheme } from "../context/ThemeContext";

export function Skeleton({
  width,
  height,
  radius = radiusToken.md,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as any, height: height as any, borderRadius: radius, opacity, backgroundColor: colors.surfaceMuted },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
  },
});
