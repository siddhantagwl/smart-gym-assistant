import { Session } from "@/domain/session";
import { View, Text, Pressable } from "react-native";


export default function IdleMode(props: {
  colors: { text: string; accent: string };
  onStart: (session: Session) => void;
}) {
  const { colors, onStart } = props;

  return (
    <View style={{ width: "100%", paddingHorizontal: 24 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          marginBottom: 16,
          textAlign: "center",
        }}
      >
        Ready to train
      </Text>

      <Pressable
        onPress={() => {
          const session: Session = {
            id: Date.now().toString(),
            startTime: new Date(),
            endTime: null,
          };
          onStart(session);
        }}
        style={{
          backgroundColor: colors.accent,
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#000", fontSize: 18, fontWeight: "600" }}>
          Start session
        </Text>
      </Pressable>
    </View>
  );
}
