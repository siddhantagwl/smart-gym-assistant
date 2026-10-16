/**
 * First time you open History, screen mounts and runs useEffect, which calls load.
 * load queries the database for all sessions, enriches them with exercise counts, and updates the rows state.
 * This causes a re-render, and you see the list of sessions.
 * After you add a new sessions from Home and navigate to History, the screen is already mounted,
 * you tap history, which triggers useFocusEffect, which calls load again, refreshing the list with the new session included.
 */

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, SectionList, Text, View } from "react-native";

import ConsistencyDots, { DayInfo, dayKey } from "@/components/ConsistencyDots";

import { getExerciseCountForSession, getSetTotalsBySession } from "@/db/exercises";
import { getAllSessions, StoredSession } from "@/db/sessions";

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

type Row = StoredSession & { exerciseCount: number; sets: number };

export default function HistoryScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [gymFilter, setGymFilter] = useState<string | null>(null);

  // useCallback will ensure that the load function is stable across renders,
  // so that we can safely use it in useEffect and useFocusEffect without causing unnecessary re-renders or infinite loops.
  const load = useCallback(() => {
    const sessions = getAllSessions();
    const setTotals = getSetTotalsBySession();

    // Discarded sessions stay in the database (and the Sheet) but aren't shown.
    const enriched = sessions
      .filter((s) => s.note !== "__DISCARDED__")
      .map((s) => ({
        ...s,
        exerciseCount: getExerciseCountForSession(s.id),
        sets: setTotals[s.id] ?? 0,
      }))
      .sort((a, b) => {
        const at = new Date(a.startTime).getTime();
        const bt = new Date(b.startTime).getTime();
        return bt - at;
      });

    setRows(enriched);
  }, []);

  // Gyms in use, most recent first (rows are newest-first).
  const gyms = useMemo(
    () => [...new Set(rows.map((r) => r.gym).filter(Boolean))],
    [rows],
  );

  // A gym that no longer appears (e.g. renamed) falls back to All.
  const activeGym = gymFilter && gyms.includes(gymFilter) ? gymFilter : null;
  const visible = useMemo(
    () => (activeGym ? rows.filter((r) => r.gym === activeGym) : rows),
    [rows, activeGym],
  );

  // One-line summary for the selected gym.
  const gymStats = useMemo(() => {
    if (!activeGym || visible.length === 0) return null;
    const sets = visible.reduce((n, r) => n + r.sets, 0);
    const timed = visible.filter((r) => r.endTime);
    const avgMin = timed.length
      ? Math.round(
          timed.reduce(
            (n, r) => n + (new Date(r.endTime!).getTime() - new Date(r.startTime).getTime()) / 60000,
            0,
          ) / timed.length,
        )
      : null;
    const last = new Date(visible[0].startTime).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return { sets, avgMin, last };
  }, [activeGym, visible]);

  // Newest month first; rows are already newest-first.
  const sections = useMemo(() => {
    const out: { title: string; data: Row[] }[] = [];
    visible.forEach((r) => {
      const title = new Date(r.startTime)
        .toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        .toUpperCase();
      const last = out[out.length - 1];
      if (last && last.title === title) last.data.push(r);
      else out.push({ title, data: [r] });
    });
    return out;
  }, [visible]);

  // Each day with a workout, for the dots (sauna-only sessions don't count).
  const days = useMemo(() => {
    const out = new Map<string, DayInfo>();
    visible
      .filter((r) => r.exerciseCount > 0 || r.sessionLabels.some((l) => l !== "Sauna"))
      .forEach((r) => {
        const start = new Date(r.startTime);
        const key = dayKey(start);
        const d = out.get(key) ?? { sets: 0, minutes: 0, muscles: [], gyms: [] };
        d.sets += r.sets;
        if (r.endTime) {
          d.minutes += Math.max(0, Math.round((new Date(r.endTime).getTime() - start.getTime()) / 60000));
        }
        r.sessionLabels
          .filter((l) => l !== "Sauna" && !d.muscles.includes(l))
          .forEach((l) => d.muscles.push(l));
        if (r.gym && !d.gyms.includes(r.gym)) d.gyms.push(r.gym);
        out.set(key, d);
      });
    return out;
  }, [visible]);

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
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 56 }}
    >
      <View
        style={{
          paddingHorizontal: 16,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 22 }}>
            History
          </Text>

          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor: "rgba(0,150,255,0.12)",
              borderWidth: 1,
              borderColor: "#00B3FF",
            }}
          >
            <Text
              style={{
                color: "#00B3FF",
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 0.4,
              }}
            >
              {visible.length} SESSIONS
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          {gyms.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1, marginRight: 10 }}
            >
              {[null, ...gyms].map((g) => {
                const on = g === activeGym;
                return (
                  <Pressable
                    key={g ?? "__all__"}
                    onPress={() => setGymFilter(g)}
                    style={{
                      paddingVertical: 5,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: on ? "#00B3FF" : colors.border,
                      backgroundColor: on ? "rgba(0,150,255,0.12)" : "#141414",
                      marginRight: 6,
                      maxWidth: 140,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        color: on ? "#00B3FF" : colors.muted,
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {g ?? "All"}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <Pressable
            onPress={() => router.push("/manual-session")}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.accent,
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 14 }}>
              + Add session
            </Text>
          </Pressable>
        </View>

        {gymStats && (
          <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 13, marginTop: 10 }}>
            📍 {activeGym} · {visible.length} {visible.length === 1 ? "session" : "sessions"} · {gymStats.sets} sets
            {gymStats.avgMin !== null ? ` · avg ${gymStats.avgMin} min` : ""} · last {gymStats.last}
          </Text>
        )}
      </View>

      {/* Stays put; only the sessions below scroll. */}
      {rows.length > 0 && (
        <View style={{ paddingHorizontal: 16 }}>
          <ConsistencyDots days={days} />
        </View>
      )}

      {rows.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text style={{ color: colors.muted, fontSize: 16 }}>
            No sessions yet. Start one from Home.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text
              style={{
                color: "#999",
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 0.6,
                marginTop: 6,
                marginBottom: 8,
              }}
            >
              {section.title} · {section.data.length}
            </Text>
          )}
          renderItem={({ item }) => {
            const start = new Date(item.startTime);
            const end = item.endTime ? new Date(item.endTime) : null;

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
                  borderColor: colors.border,
                  padding: 14,
                  marginBottom: 12,
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
                  <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 16,
                        marginRight: 8,
                      }}
                    >
                      {formatDate(start)}
                    </Text>

                    {end ? (
                      <View
                        style={{
                          paddingVertical: 3,
                          paddingHorizontal: 12,
                          borderRadius: 999,
                          backgroundColor: "#1a1a1a",
                          borderWidth: 1,
                          borderColor: colors.border,
                          marginRight: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          ⏱ {durationMinutes(start, end)}
                        </Text>
                      </View>
                    ) : null}

                    <View
                      style={{
                        paddingVertical: 3,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        backgroundColor: "#141414",
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        🏋 {item.exerciseCount}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
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

                    <Text
                      style={{
                        color: colors.muted,
                        fontSize: 18,
                        fontWeight: "700",
                        opacity: 0.6,
                      }}
                    >
                      ›
                    </Text>
                  </View>
                </View>

                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.muted,
                    marginBottom: item.note ? 6 : 10,
                  }}
                >
                  {formatTime(start)}
                  {end ? ` to ${formatTime(end)}` : ""}
                  {item.gym ? `  ·  📍 ${item.gym}` : ""}
                </Text>

                {item.note ? (
                  <Text
                    style={{ color: colors.muted, marginBottom: 10 }}
                    numberOfLines={2}
                  >
                    Note: {item.note}
                  </Text>
                ) : null}


                {Array.isArray(item.sessionLabels) &&
                item.sessionLabels.length > 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    {item.sessionLabels.map((label) => {
                      const isSauna = label === "Sauna";
                      return (
                        <View
                          key={label}
                          style={{
                            paddingVertical: 4,
                            paddingHorizontal: 12,
                            borderRadius: 999,
                            backgroundColor: isSauna ? "rgba(255,153,51,0.18)" : "rgba(46,125,90,0.18)",
                            borderWidth: 1,
                            borderColor: isSauna ? "rgba(255,153,51,0.7)" : "#3BAF75",
                            marginRight: 6,
                            marginBottom: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: isSauna ? "rgba(255,178,102,0.98)" : "#3BAF75",
                              fontSize: 12,
                              fontWeight: "800",
                              letterSpacing: 0.2,
                            }}
                          >
                            {label}
                          </Text>
                        </View>
                      );
                    })}
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
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      No labels
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
