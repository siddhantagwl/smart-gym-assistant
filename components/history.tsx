import { View, Text } from "react-native";

type StoredSession = {
  id: string;
  start_time: string;
  end_time: string;
};

type HistoryProps = {
  sessions: StoredSession[];
};

function formatDuration(start: string, end: string): string {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  const diffMinutes = Math.floor((endMs - startMs) / 60000);

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return `${hours}h ${minutes}m`;
}

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
            {new Date(s.start_time).toLocaleDateString("en-GB")}{"     "}
            {new Date(s.start_time).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" – "}
            {new Date(s.end_time).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {"  ·  "}
            {formatDuration(s.start_time, s.end_time)}
          </Text>
        ))
      )}
    </View>
  );
}