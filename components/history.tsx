// app/components/History.tsx
import { View, Text } from "react-native";

type StoredSession = {
  id: string;
  start_time: string;
  end_time: string;
};

type HistoryProps = {
  sessions: StoredSession[];
};

export function History({ sessions }: HistoryProps) {
  return (
    <View style={{ marginTop: 40, width: "100%", paddingHorizontal: 24 }}>
      <Text style={{ color: "#fff", fontSize: 18, marginBottom: 12 }}>
        History
      </Text>

      {sessions.length === 0 ? (
        <Text style={{ color: "#888" }}>No sessions yet</Text>
      ) : (
        sessions.map((s) => (
          <Text key={s.id} style={{ color: "#fff", marginBottom: 6 }}>
            {new Date(s.start_time).toLocaleDateString()}{" "}
            {new Date(s.start_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" – "}
            {new Date(s.end_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        ))
      )}
    </View>
  );
}