// Sheet that slides up and rests on top of the app's tab bar (Home / History /
// …) instead of the very bottom of the screen, where it was hidden behind the
// tab bar and Android's navigation area. Only for screens inside the tab
// navigator (uses its tab bar height).
//
// `raised`: show the sheet at the top of the screen instead — use it while a
// text field is focused. On Android the keyboard isn't reported to Modal
// windows (and the app is edge-to-edge, so nothing resizes), so a bottom
// sheet can't move above the keyboard; the top of the screen is always clear.
import { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
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
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: 18,
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
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
