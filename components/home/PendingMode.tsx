import { View, Text, Pressable } from "react-native";

export type PendingSessionUI = {
  id: string;
  startTime: Date;
  sessionLabel?: string | null;
};

export default function PendingMode(props: {
  session: PendingSessionUI;
  onResume: (session: PendingSessionUI) => void;
  onDiscard: (sessionId: string) => void;
  colors: { text: string; accent: string };
}) {
  const { session, onResume, onDiscard, colors } = props;

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
          {new Date(session.startTime).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          })}{" "}
          · {new Date(session.startTime).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {session.sessionLabel ? ` · ${session.sessionLabel}` : ""}
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => onResume(session)}
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
            onPress={() => onDiscard(session.id)}
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