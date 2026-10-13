import { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { getExercisesForSession } from "../../db/exercises";

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

  // What's already logged, so you can tell whether it's worth resuming.
  const done = useMemo(() => {
    try {
      return getExercisesForSession(session.id);
    } catch {
      return [];
    }
  }, [session.id]);
  const minsAgo = Math.max(0, Math.round((Date.now() - new Date(session.startTime).getTime()) / 60000));
  const ago =
    minsAgo < 60
      ? `${minsAgo} min ago`
      : minsAgo < 48 * 60
        ? `${Math.round(minsAgo / 60)} h ago`
        : `${Math.round(minsAgo / 1440)} days ago`;
  const sets = done.reduce((n, e) => n + (e.sets || 0), 0);

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
          {` · ${ago}`}
          {session.sessionLabel ? ` · ${session.sessionLabel}` : ""}
        </Text>
        <Text numberOfLines={2} style={{ color: "#999", fontSize: 13, marginTop: -6, marginBottom: 12 }}>
          {done.length === 0
            ? "No exercises logged yet"
            : `${done.length} ${done.length === 1 ? "exercise" : "exercises"} · ${sets} sets: ${done
                .map((e) => e.name)
                .join(", ")}`}
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