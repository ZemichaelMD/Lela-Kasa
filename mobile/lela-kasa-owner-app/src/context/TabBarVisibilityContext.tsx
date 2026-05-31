import React, { createContext, useContext, useRef, useCallback } from "react";
import { Animated } from "react-native";

interface TabBarVisibilityContextValue {
  /** Call on any scroll event to animate the tab bar up/down */
  onScroll: Animated.WithAnimatedValue<
    (event: { nativeEvent: { contentOffset: { y: number } } }) => void
  >;
  /** Shared Animated.Value driven by scroll — read it in the tab bar to translate */
  translateY: Animated.Value;
}

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue>({
  onScroll: () => {},
  translateY: new Animated.Value(0),
});

export function useTabBarVisibility() {
  return useContext(TabBarVisibilityContext);
}

export function TabBarVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const onScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const diff = currentY - lastOffset.current;

      if (diff > 8 && currentY > 60) {
        // Scrolling down — hide tab bar (animate down by 120)
        Animated.spring(translateY, {
          toValue: 120,
          useNativeDriver: true,
          speed: 20,
          bounciness: 4,
        }).start();
      } else if (diff < -8 || currentY < 20) {
        // Scrolling up or at top — show tab bar
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 4,
        }).start();
      }
      lastOffset.current = currentY;
    },
    [translateY],
  );

  return (
    <TabBarVisibilityContext.Provider value={{ onScroll, translateY }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}
