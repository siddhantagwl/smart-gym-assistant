import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, SectionList, Pressable, Linking, Animated } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ExerciseLibraryItem, getAllLibraryExercises } from "@/db/exerciseLibrary";
import {
  ExerciseLogSummary,
  getExerciseLogSummaries,
  getExercisesForSession,
} from "@/db/exercises";
import { getActiveSession } from "@/db/sessions";
import { addToUpNext, removeFromUpNext, useUpNext } from "@/hooks/use-up-next";

const colors = {
  bg: "#000",
  card: "#111",
  text: "#fff",
  sub: "#888",
  border: "#222",
};

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!iso || Number.isNaN(t)) return "";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (t >= startOfToday.getTime()) return "today";
  const days = Math.ceil((startOfToday.getTime() - t) / 86_400_000);
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ExercisesScreen() {
  console.debug("Rendering ExercisesScreen");
  const [query, setQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const clearAnim = useState(new Animated.Value(0))[0];
  const router = useRouter();

  // Home's "Today's focus" links here with ?muscle=…&t=… to pre-filter.
  const params = useLocalSearchParams<{ muscle?: string; t?: string }>();
  useEffect(() => {
    if (params.muscle) {
      setSelectedMuscle(params.muscle);
      setQuery("");
    }
  }, [params.muscle, params.t]);

  // All-time log summary per library id: drives the "Logged N× · 3d ago" /
  // "Not done yet" line and whether the row opens exercise history.
  const [logSummary, setLogSummary] = useState<Record<string, ExerciseLogSummary>>({});

  // Active-session mode: when a session is open, each row gets a ＋ that
  // queues the exercise into the session's "Up next" list on Home.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [doneNames, setDoneNames] = useState<Set<string>>(new Set());
  const upNext = useUpNext();
  const queued = sessionId && upNext.sessionId === sessionId ? upNext.items : [];
  const current = sessionId ? upNext.current : null;

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const muscles = useMemo(() => {
    const map: Record<string, number> = {};

    exercises.forEach((e) => {
      map[e.primaryMuscle] = (map[e.primaryMuscle] || 0) + 1;
    });

    return Object.keys(map)
      .sort()
      .map((muscle) => ({
        name: muscle,
        count: map[muscle],
      }));
  }, [exercises]);

  // Re-read library on focus so post-sync changes appear without app reload.
  useFocusEffect(
    useCallback(() => {
      setExercises(getAllLibraryExercises());
      setLogSummary(getExerciseLogSummaries());
      const s = getActiveSession();
      setSessionId(s?.id ?? null);
      setDoneNames(
        new Set(s ? getExercisesForSession(s.id).map((e) => e.name.toLowerCase()) : []),
      );
    }, [])
  );

  function toggleQueued(item: ExerciseLibraryItem) {
    if (!sessionId) return;
    Haptics.selectionAsync().catch(() => {});
    if (queued.some((q) => q.name === item.name)) {
      removeFromUpNext(sessionId, item.name);
      showToast(`Removed ${item.name}`);
      return;
    }
    addToUpNext(sessionId, { libraryId: item.id, name: item.name });
    showToast(
      current?.active
        ? `Up next after ${current.name}`
        : current
          ? `Queued · #${queued.length + 1}`
          : `${item.name} ready on Home`,
    );
  }

  useEffect(() => {
    Animated.timing(clearAnim, {
      toValue: query.length > 0 ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [query]);

  // searching happens here - filter, sort, and group exercises into sections
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();

    let filtered = exercises;

    if (selectedMuscle) {
      filtered = filtered.filter(e => e.primaryMuscle === selectedMuscle);
    }

    if (q) {
      filtered = filtered.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        e.primaryMuscle.toLowerCase().includes(q) ||
        e.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    const sorted = [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const map: Record<string, ExerciseLibraryItem[]> = {};

    sorted.forEach((ex) => {
      const muscle = ex.primaryMuscle;
      if (!map[muscle]) map[muscle] = [];
      map[muscle].push(ex);
    });

    return Object.keys(map)
      .sort()
      .map((muscle) => ({
        title: muscle,
        data: map[muscle],
      }));
  }, [query, exercises, selectedMuscle]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, marginTop: 32 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
        Exercises
      </Text>

      {sessionId ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#2a3a7a",
            backgroundColor: "rgba(58,94,255,0.08)",
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#c9d4ff", fontSize: 12 }}>
            Session in progress · tap ＋ to add to Up next
            {queued.length > 0 ? `  (${queued.length} queued)` : ""}
          </Text>
        </View>
      ) : null}

      <View style={{ position: "relative", marginBottom: 12 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search from ${exercises.length} exercises`}
          placeholderTextColor="#666"
          style={{
            backgroundColor: colors.card,
            color: colors.text,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            paddingRight: 36,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />

        <Animated.View
          pointerEvents={query.length > 0 ? "auto" : "none"}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: [
              { translateY: -10 },
              {
                scale: clearAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
            opacity: clearAnim,
          }}
        >
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: "#ff5c5c", fontSize: 16, fontWeight: "600" }}>
              ✕
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
        {muscles.map((muscleObj) => {
          const active = selectedMuscle === muscleObj.name;
          return (
            <Pressable
              key={muscleObj.name}
              onPress={() =>
                setSelectedMuscle(active ? null : muscleObj.name)
              }
              style={{ marginRight: 8, marginBottom: 8 }}
            >
              <View
                style={{
                  borderWidth: 1,
                  borderColor: active ? "#2E7D5A" : "#333",
                  backgroundColor: active
                    ? "rgba(46,125,90,0.15)"
                    : "rgba(255,255,255,0.04)",
                  borderRadius: 16,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    color: active ? "#2E7D5A" : "#aaa",
                    fontSize: 12,
                    fontWeight: active ? "600" : "500",
                  }}
                >
                  {`${muscleObj.name} (${muscleObj.count})`}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <SectionList
        sections={sections}
        stickySectionHeadersEnabled
        extraData={[queued, current, doneNames, logSummary]}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 16,
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                color: "#aaa",
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const summary = logSummary[item.id];
          return (
          <Pressable
            disabled={!summary}
            onPress={() =>
              router.push({
                pathname: "/exercise-details",
                params: { exerciseLibraryId: item.id, name: item.name },
              })
            }
            style={({ pressed }) => ({
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              marginLeft: 8,
              backgroundColor: pressed ? "#0d0d0d" : "transparent",
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 17 }}>
                  {item.name}
                  {sessionId && doneNames.has(item.name.toLowerCase()) ? (
                    <Text style={{ color: "#4CAF50", fontSize: 12 }}>  ✓ this session</Text>
                  ) : null}
                </Text>

                {summary ? (
                  <Text style={{ color: "#7bc47f", fontSize: 12, marginTop: 3 }}>
                    ● Logged {summary.count}×
                    {timeAgo(summary.lastStartTime) ? ` · ${timeAgo(summary.lastStartTime)}` : ""}
                  </Text>
                ) : (
                  <Text style={{ color: "#666", fontSize: 12, marginTop: 3 }}>
                    ○ Not done yet
                  </Text>
                )}

                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: "#2ecc71",
                      backgroundColor: "rgba(46,204,113,0.15)",
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      marginRight: 6,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ color: "#7bed9f", fontSize: 11, fontWeight: "500" }}>
                      {item.primaryMuscle}
                    </Text>
                  </View>

                  {item.tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        borderWidth: 1,
                        borderColor: "#333",
                        backgroundColor: "rgba(255,255,255,0.04)",
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        marginRight: 6,
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ color: "#aaa", fontSize: 11 }}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {item.videoUrl ? (
                <Pressable
                  onPress={() => Linking.openURL(item.videoUrl)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#3a5eff",
                      backgroundColor: "rgba(58,94,255,0.12)",
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: "#9bb0ff", fontSize: 11, fontWeight: "500" }}>
                      ▶ video ↗
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              {sessionId ? renderQueueControl(item) : null}

              {summary ? (
                <Text style={{ color: "#555", fontSize: 20, marginLeft: 10 }}>›</Text>
              ) : null}
            </View>
          </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={{ color: colors.sub, marginTop: 24, textAlign: "center" }}>
            No exercises found
          </Text>
        }
      />

      {toast ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 16,
            alignSelf: "center",
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: "#1a2240",
            borderWidth: 1,
            borderColor: "#3a5eff",
          }}
        >
          <Text style={{ color: "#c9d4ff", fontSize: 13, fontWeight: "600" }}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );

  function renderQueueControl(item: ExerciseLibraryItem) {
    const isCurrent = current && current.name.toLowerCase() === item.name.toLowerCase();
    if (isCurrent) {
      return (
        <View style={{ ...queueBtn, borderColor: "#1f7a4d", backgroundColor: "#0f2e1f" }}>
          <Text style={{ color: "#00ff99", fontSize: 11, fontWeight: "700" }}>
            {current.active ? "NOW" : "NEXT"}
          </Text>
        </View>
      );
    }

    const pos = queued.findIndex((q) => q.name === item.name);
    return (
      <Pressable
        onPress={() => toggleQueued(item)}
        hitSlop={6}
        style={({ pressed }) => ({
          ...queueBtn,
          opacity: pressed ? 0.6 : 1,
          borderColor: pos >= 0 ? "#3a5eff" : "#333",
          backgroundColor: pos >= 0 ? "rgba(58,94,255,0.18)" : "rgba(255,255,255,0.04)",
        })}
      >
        <Text
          style={{
            color: pos >= 0 ? "#c9d4ff" : "#fff",
            fontSize: pos >= 0 ? 11 : 18,
            fontWeight: "700",
          }}
        >
          {pos >= 0 ? `#${pos + 1}` : "＋"}
        </Text>
      </Pressable>
    );
  }
}

const queueBtn = {
  marginLeft: 8,
  minWidth: 40,
  height: 32,
  paddingHorizontal: 6,
  borderRadius: 8,
  borderWidth: 1,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};