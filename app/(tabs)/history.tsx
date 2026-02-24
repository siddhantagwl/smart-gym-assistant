/**
 * First time you open History, screen mounts and runs useEffect, which calls load.
 * load queries the database for all sessions, enriches them with exercise counts, and updates the rows state.
 * This causes a re-render, and you see the list of sessions.
 * After you add a new sessions from Home and navigate to History, the screen is already mounted,
 * you tap history, which triggers useFocusEffect, which calls load again, refreshing the list with the new session included.
 */

import { View, Text, Pressable, FlatList } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";

import { getAllSessions, StoredSession } from "@/db/sessions";
import { getExerciseCountForSession } from "@/db/exercise";

const colors = {
  background: "#0F0F0F",
  text: "#FFFFFF",
  card: "#161616",
  muted: "#AAA",
  border: "#222",
  accent: "#4CAF50",
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function durationMinutes(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  const mins = Math.max(0, Math.round(ms / 60000));
  return `${mins} min`;
}

type Row = StoredSession & { exerciseCount: number };

export default function HistoryScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);

  // useCallback will ensure that the load function is stable across renders,
  // so that we can safely use it in useEffect and useFocusEffect without causing unnecessary re-renders or infinite loops.
  const load = useCallback(() => {

    const sessions = getAllSessions();

    const enriched = sessions
      .map((s) => ({
        ...s,
        exerciseCount: getExerciseCountForSession(s.id),
      }))
      .sort((a, b) => {
        const at = new Date(a.startTime).getTime();
        const bt = new Date(b.startTime).getTime();
        return bt - at;
      });

    setRows(enriched);
  }, []);

  // render historyscreen for fisrt time.
  // load will query db and update rows state, which will
  // trigger a re-render with the loaded sessions.
  // also, whenever we navigate back to this screen from the modal,
  // we want to refresh the list, so we call load in useFocusEffect as well.
  // this way, we ensure that the history screen always shows the latest sessions data.
  useEffect(() => {
    load();
  }, [load]);

  // Expo Router’s hook for navigation focus.
  // when the screen comes into focus (e.g., after navigating back from the modal), we call load to refresh the sessions list.
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 56 }}>
      <View
        style={{
          paddingHorizontal: 16,
          marginBottom: 12,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.text, fontSize: 22 }}>
          History
        </Text>

        <View style={{ flexDirection: "row" }}>
          <Pressable
            onPress={() => router.push("/manual-session")}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.accent,
              marginRight: 8,
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 14 }}>
              + Add session
            </Text>
          </Pressable>

          <Pressable
            onPress={load}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 14 }}>
              Refresh
            </Text>
          </Pressable>
        </View>
      </View>

      {rows.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text style={{ color: colors.muted, fontSize: 16 }}>
            No sessions yet. Start one from Home.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const start = new Date(item.startTime);
            const end = item.endTime ? new Date(item.endTime) : null;
            const isDiscarded = item.note === "__DISCARDED__";

            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/session-details",
                    params: { sessionId: item.id },
                  })
                }
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isDiscarded ? "#3a1f1f" : colors.border,
                  padding: 14,
                  marginBottom: 12,
                  opacity: isDiscarded ? 0.55 : 1,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>
                    {formatDate(start)}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {item.source === "manual" && (
                      <View
                        style={{
                          paddingVertical: 2,
                          paddingHorizontal: 8,
                          borderRadius: 999,
                          backgroundColor: "rgba(76,175,80,0.15)",
                          borderWidth: 1,
                          borderColor: colors.accent,
                          marginRight: 8,
                        }}
                      >
                        <Text style={{ color: colors.accent, fontSize: 12 }}>
                          Manual
                        </Text>
                      </View>
                    )}

                    {isDiscarded && (
                      <View
                        style={{
                          paddingVertical: 2,
                          paddingHorizontal: 8,
                          borderRadius: 999,
                          backgroundColor: "rgba(229,57,53,0.15)",
                          borderWidth: 1,
                          borderColor: "#e53935",
                          marginRight: 8,
                        }}
                      >
                        <Text style={{ color: "#e53935", fontSize: 12 }}>
                          Discarded
                        </Text>
                      </View>
                    )}

                    {Array.isArray(item.sessionLabels) && item.sessionLabels.length > 0 ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {item.sessionLabels.map((label) => (
                          <View
                            key={label}
                            style={{
                              paddingVertical: 4,
                              paddingHorizontal: 12,
                              borderRadius: 999,
                              backgroundColor: "#0b1f14",
                              borderWidth: 1.5,
                              borderColor: "#39FF14",
                              marginRight: 6,
                              marginBottom: 6,
                            }}
                          >
                            <Text style={{ color: "#39FF14", fontSize: 10, fontWeight: "800", letterSpacing: 0.2 }}>
                              {label}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View
                        style={{
                          paddingVertical: 3,
                          paddingHorizontal: 10,
                          borderRadius: 999,
                          backgroundColor: "#0f0f0f",
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.muted, fontSize: 12 }}>
                          No labels
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={{ color: colors.muted, marginBottom: item.note ? 6 : 10 }}>
                  {formatTime(start)}{end ? ` to ${formatTime(end)}` : ""}{end ? `  ·  ${durationMinutes(start, end)}` : ""}
                </Text>

                {item.note && !isDiscarded ? (
                  <Text style={{ color: colors.muted, marginBottom: 10 }} numberOfLines={2}>
                    Note: {item.note}
                  </Text>
                ) : null}

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.muted }}>
                    {item.exerciseCount} exercises
                  </Text>
                  <Text style={{ color: colors.accent }}>
                    →
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
