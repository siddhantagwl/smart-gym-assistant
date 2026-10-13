// Sheet that slides up and rests on top of the app's tab bar (Home / History /
// …) instead of the very bottom of the screen, where it was hidden behind the
// tab bar and Android's navigation area. Only for screens inside the tab
// navigator (uses its tab bar height).
//
// Height is capped to the space between the status bar and the tab bar, and
// the content scrolls inside when it's taller — so a long sheet never runs
// under the status bar or gets cut off.
//
// `raised`: show the sheet at the top of the screen instead — use it while a
// text field is focused. On Android the keyboard isn't reported to Modal
// windows (and the app is edge-to-edge, so nothing resizes), so a bottom
// sheet can't move above the keyboard; the top of the screen is always clear.
import { ReactNode } from "react";
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
        {/* Inner Pressable swallows taps so they don't close the sheet. */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: "#111",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#222",
            marginHorizontal: 6,
            marginTop: raised ? 0 : insets.top + GAP,
            maxHeight,
            // Also shrink to the space actually left (in case the modal window
            // doesn't extend under the status bar on some devices).
            flexShrink: 1,
            paddingTop: 10,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#333",
              marginBottom: 12,
            }}
          />
          <ScrollView
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 18 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
