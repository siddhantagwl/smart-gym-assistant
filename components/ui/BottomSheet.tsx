// Sheet that slides up and rests on top of the app's tab bar (Home / History /
// …) instead of the very bottom of the screen, where it was hidden behind the
// tab bar and Android's navigation area. Only for screens inside the tab
// navigator (uses its tab bar height).
//
// Height is capped to the space between the status bar and the tab bar, and
// the content scrolls inside when it's taller — so a long sheet never runs
// under the status bar or gets cut off.
//
// Swipe down to close: drag from the handle, or from anywhere once the
// content is scrolled to the top (otherwise the drag scrolls the content).
// Released after a long or fast swipe it closes; a short drag springs back.
//
// `raised`: show the sheet at the top of the screen instead — use it while a
// text field is focused. On Android the keyboard isn't reported to Modal
// windows (and the app is edge-to-edge, so nothing resizes), so a bottom
// sheet can't move above the keyboard; the top of the screen is always clear.
// Swipe-to-close is off while raised.
import { ReactNode, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 0.9;

export default function BottomSheet({
  visible,
  onClose,
  raised = false,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  raised?: boolean;
  children: ReactNode;
}) {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const GAP = 12;
  const maxHeight =
    screenHeight - insets.top - GAP - (raised ? GAP : tabBarHeight + GAP);

  // Drag state. Refs keep the PanResponder stable across renders.
  const translateY = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const raisedRef = useRef(raised);
  raisedRef.current = raised;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Take over only clear downward drags, and only when the content is at
        // its top — otherwise the ScrollView keeps the gesture.
        onMoveShouldSetPanResponderCapture: (_, g) =>
          !raisedRef.current &&
          g.dy > 8 &&
          Math.abs(g.dy) > Math.abs(g.dx) * 1.5 &&
          scrollY.current <= 0,
        onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) {
            Animated.timing(translateY, {
              toValue: screenHeight,
              duration: 180,
              useNativeDriver: true,
            }).start(() => onCloseRef.current());
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () =>
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [translateY, screenHeight],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: raised ? "flex-start" : "flex-end",
          paddingTop: raised ? insets.top + 12 : 0,
          paddingBottom: raised ? 0 : tabBarHeight,
        }}
      >
        <Animated.View
          {...pan.panHandlers}
          style={{
            marginHorizontal: 6,
            marginTop: raised ? 0 : insets.top + GAP,
            maxHeight,
            // Also shrink to the space actually left (in case the modal window
            // doesn't extend under the status bar on some devices).
            flexShrink: 1,
            transform: [{ translateY }],
          }}
        >
          {/* Inner Pressable swallows taps so they don't close the sheet. */}
          <Pressable
            onPress={() => {}}
            style={{
              flexShrink: 1,
              backgroundColor: "#111",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#222",
              overflow: "hidden",
            }}
          >
            {/* Handle: a taller strip so it's easy to grab and drag down. */}
            <View style={{ paddingTop: 10, paddingBottom: 12, alignItems: "center" }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#444" }} />
            </View>
            <ScrollView
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 18 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              scrollEventThrottle={16}
              onScroll={(e) => {
                scrollY.current = e.nativeEvent.contentOffset.y;
              }}
            >
              {children}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
