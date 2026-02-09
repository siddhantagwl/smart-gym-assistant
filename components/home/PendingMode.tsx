import { View, Text, Pressable } from "react-native";
import { StoredSession } from "@/db/sessions";

export default function PendingMode(props: {
  pendingSession: StoredSession;
  onResume: () => void;
  onDiscard: () => void;
  colors: { text: string; accent: string };
}) {
  const { pendingSession, onResume, onDiscard, colors } = props;

  return (
    <View style={{ width: "100%", paddingHorizontal: 24 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: "#222",
          borderRadius: 10,
          padding: 16,
          backgroundColor: "#111",
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16, marginBottom: 6 }}>
          Unfinished session found
        </Text>
        <Text style={{ color: "#aaa", marginBottom: 12 }}>
          {new Date(pendingSession.startTime).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          })}{" "}
          · {new Date(pendingSession.startTime).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · {pendingSession.workoutType}
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={onResume}
            style={{
              flex: 1,
              backgroundColor: colors.accent,
              paddingVertical: 12,
              borderRadius: 6,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#000", fontSize: 16 }}>Resume</Text>
          </Pressable>

          <Pressable
            onPress={onDiscard}
            style={{
              flex: 1,
              backgroundColor: "#8B2E2E",
              paddingVertical: 12,
              borderRadius: 6,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.text, fontSize: 16 }}>Discard</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}