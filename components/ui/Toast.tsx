// Small message that fades in at the bottom of a screen and disappears on
// its own — for confirmations that don't need a tap ("Library pulled · 132
// exercises"). Errors that need reading should still use Alert.
//
//   const toast = useToast();
//   toast.show("Saved");
//   return <View>…{toast.element}</View>;   // render last, inside the screen root
import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Text } from "react-native";

export function useToast(durationMs: number = 2400): {
  show: (message: string) => void;
  element: ReactNode;
} {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function show(next: string) {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() =>
        setMessage(null),
      );
    }, durationMs);
  }

  const element = message ? (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        right: 16,
        alignItems: "center",
        opacity,
      }}
    >
      <Text
        numberOfLines={3}
        style={{
          color: "#c9d4ff",
          fontSize: 13,
          fontWeight: "600",
          textAlign: "center",
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 999,
          overflow: "hidden",
          backgroundColor: "#1a2240",
          borderWidth: 1,
          borderColor: "#3a5eff",
        }}
      >
        {message}
      </Text>
    </Animated.View>
  ) : null;

  return { show, element };
}
