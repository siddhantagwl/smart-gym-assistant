import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, SectionList, Pressable, Linking, Animated } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ExerciseLibraryItem,
  getAllLibraryExercises,
  groupMovements,
  Movement,
} from "@/db/exerciseLibrary";
import {
  ExerciseLogSummary,
  getExerciseLogSummaries,
  getExercisesForSession,
} from "@/db/exercises";
import { getActiveSession } from "@/db/sessions";
import { addToUpNext, removeFromUpNext, useUpNext } from "@/hooks/use-up-next";
import { IconSymbol } from "@/components/ui/icon-symbol";

const colors = {
  bg: "#000",
  card: "#111",
  text: "#fff",
  sub: "#888",
  border: "#222",
};

// Whole calendar days since `iso` (0 = today); null if unparseable.
function daysSince(iso: string): number | null {
  const t = new Date(iso).getTime();
  if (!iso || Number.isNaN(t)) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (t >= startOfToday.getTime()) return 0;
  return Math.ceil((startOfToday.getTime() - t) / 86_400_000);
}

const STALE_DAYS = 14;

type Recency = "all" | "new" | "stale";

function timeAgo(iso: string): string {
  const days = daysSince(iso);
  if (days === null) return "";
  if (days === 0) return "today";
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
      setSelectedPattern(null);
      setQuery("");
      setRecency("all");
    }
  }, [params.muscle, params.t]);

  // All-time log summary per library id: drives the "Logged N× · 3d ago" /
  // "Not done yet" line and whether the row opens exercise history.
  const [logSummary, setLogSummary] = useState<Record<string, ExerciseLogSummary>>({});
  // "Not done yet" / "2+ weeks" filter, opened from the filter icon next to
  // search; combines with the muscle filter + search.
  const [recency, setRecency] = useState<Recency>("all");
  const [showFilters, setShowFilters] = useState(false);
  // Pattern filter (in the same panel): only for the selected muscle.
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const filterActive = recency !== "all" || selectedPattern !== null;

  // One row per movement; its log summary combines all equipment variants.
  const movements = useMemo(() => groupMovements(exercises), [exercises]);
  const movementSummary = (m: Movement): ExerciseLogSummary | null => {
    let count = 0;
    let last = "";
    m.variants.forEach((v) => {
      const s = logSummary[v.id];
      if (!s) return;
      count += s.count;
      if (s.lastStartTime > last) last = s.lastStartTime;
    });
    return count > 0 ? { count, lastStartTime: last } : null;
  };
  const isNew = (m: Movement) => !movementSummary(m);
  const isStale = (m: Movement) => {
    const s = movementSummary(m);
    if (!s) return false;
    const d = daysSince(s.lastStartTime);
    return d !== null && d >= STALE_DAYS;
  };
  const variantNames = (m: Movement) => m.variants.map((v) => v.name.toLowerCase());

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

    movements.forEach((m) => {
      map[m.primaryMuscle] = (map[m.primaryMuscle] || 0) + 1;
    });

    return Object.keys(map)
      .sort()
      .map((muscle) => ({
        name: muscle,
        count: map[muscle],
      }));
  }, [movements]);

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

  // Queues the movement; the equipment is picked when it loads on Home
  // (last used at that session's gym).
  const queuedIndex = (m: Movement) =>
    queued.findIndex((q) => q.movement === m.movement || q.name === m.name);

  function toggleQueued(m: Movement) {
    if (!sessionId) return;
    Haptics.selectionAsync().catch(() => {});
    const i = queuedIndex(m);
    if (i >= 0) {
      removeFromUpNext(sessionId, queued[i].name);
      showToast(`Removed ${m.name}`);
      return;
    }
    addToUpNext(sessionId, { libraryId: m.variants[0].id, name: m.name, movement: m.movement });
    showToast(
      current?.active
        ? `Up next after ${current.name}`
        : current
          ? `Queued · #${queued.length + 1}`
          : `${m.name} ready on Home`,
    );
  }

  // Row tap → movement history; chip tap → that equipment's tab.
  function openHistory(m: Movement, variantId?: string) {
    const logged = m.variants.filter((v) => logSummary[v.id]);
    const target =
      variantId ??
      [...logged].sort((a, b) =>
        (logSummary[b.id]?.lastStartTime ?? "").localeCompare(logSummary[a.id]?.lastStartTime ?? ""),
      )[0]?.id;
    if (!target) return;
    router.push({
      pathname: "/exercise-details",
      params: {
        exerciseLibraryId: target,
        name: m.name,
        ...(variantId ? { tab: variantId } : {}),
      },
    });
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

    let filtered = movements;

    if (selectedMuscle) {
      filtered = filtered.filter(m => m.primaryMuscle === selectedMuscle);
    }

    if (q) {
      filtered = filtered.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.primaryMuscle.toLowerCase().includes(q) ||
        m.variants.some((v) =>
          v.name.toLowerCase().includes(q) ||
          v.variant.toLowerCase().includes(q) ||
          v.tags.some(tag => tag.toLowerCase().includes(q))
        )
      );
    }

    if (selectedPattern) filtered = filtered.filter((m) => m.pattern === selectedPattern);

    if (recency === "new") filtered = filtered.filter(isNew);
    if (recency === "stale") filtered = filtered.filter(isStale);

    // "2+ weeks" lists the longest-neglected first; otherwise grouped by
    // pattern (movements that do the same job sit together), then by name.
    const gap = (m: Movement) => daysSince(movementSummary(m)?.lastStartTime ?? "") ?? 0;
    const sorted = [...filtered].sort((a, b) =>
      recency === "stale"
        ? gap(b) - gap(a) || a.name.localeCompare(b.name)
        : a.pattern.localeCompare(b.pattern) || a.name.localeCompare(b.name)
    );

    const map: Record<string, Movement[]> = {};

    sorted.forEach((m) => {
      const muscle = m.primaryMuscle;
      if (!map[muscle]) map[muscle] = [];
      map[muscle].push(m);
    });

    return Object.keys(map)
      .sort()
      .map((muscle) => ({
        title: muscle,
        data: map[muscle],
      }));
    // isNew/isStale only read logSummary, which is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, movements, selectedMuscle, selectedPattern, recency, logSummary]);

  // Patterns of the selected muscle, with how many movements each has.
  const musclePatterns = useMemo(() => {
    if (!selectedMuscle) return [];
    const counts = new Map<string, number>();
    movements
      .filter((m) => m.primaryMuscle === selectedMuscle)
      .forEach((m) => counts.set(m.pattern, (counts.get(m.pattern) ?? 0) + 1));
    return [...counts.entries()]
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => a.pattern.localeCompare(b.pattern));
  }, [movements, selectedMuscle]);

  // Counts follow the muscle filter so "Not done yet (3)" means "3 chest exercises".
  const recencyCounts = useMemo(() => {
    const pool = selectedMuscle
      ? movements.filter((m) => m.primaryMuscle === selectedMuscle)
      : movements;
    return { new: pool.filter(isNew).length, stale: pool.filter(isStale).length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movements, selectedMuscle, logSummary]);

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

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
      <View style={{ flex: 1, position: "relative" }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${movements.length} exercises`}
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

        <Pressable
          onPress={() => setShowFilters((v) => !v)}
          hitSlop={4}
          style={({ pressed }) => ({
            width: 44,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: showFilters || filterActive ? "#3a5eff" : colors.border,
            backgroundColor: showFilters ? "rgba(58,94,255,0.15)" : colors.card,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <IconSymbol
            name="line.3.horizontal.decrease"
            size={22}
            color={showFilters || filterActive ? "#c9d4ff" : "#888"}
          />
          {filterActive ? (
            <View
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#3a5eff",
              }}
            />
          ) : null}
        </Pressable>
      </View>

      {/* Filter panel from the icon. When closed, an active filter still shows
          as one chip so a shortened list never looks mysterious. */}
      {showFilters || recency !== "all" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: -4, marginBottom: 12 }}>
          {(
            [
              { key: "new", label: `○ Not done yet (${recencyCounts.new})` },
              { key: "stale", label: `⏳ 2+ weeks ago (${recencyCounts.stale})` },
            ] as const
          )
            .filter((f) => showFilters || recency === f.key)
            .map((f) => {
              const active = recency === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setRecency(active ? "all" : f.key)}
                  hitSlop={4}
                  style={({ pressed }) => ({
                    borderWidth: 1,
                    borderColor: active ? "#3a5eff" : "#2a2a2a",
                    backgroundColor: active ? "rgba(58,94,255,0.15)" : "transparent",
                    borderRadius: 16,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: active ? "#c9d4ff" : "#888",
                      fontSize: 12,
                      fontWeight: active ? "600" : "500",
                    }}
                  >
                    {f.label}
                    {active && !showFilters ? "  ✕" : ""}
                  </Text>
                </Pressable>
              );
            })}
          {showFilters && !selectedMuscle ? (
            <Text style={{ color: "#666", fontSize: 11, alignSelf: "center" }}>
              Pick a muscle below to filter by pattern
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
        {muscles.map((muscleObj) => {
          const active = selectedMuscle === muscleObj.name;
          return (
            <Pressable
              key={muscleObj.name}
              onPress={() => {
                setSelectedMuscle(active ? null : muscleObj.name);
                setSelectedPattern(null);
              }}
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

      {/* Pattern chips for the selected muscle: shown while the filter panel is
          open; when closed, an active pattern stays visible as one chip. */}
      {selectedMuscle && musclePatterns.length > 1 && (showFilters || selectedPattern) ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: -4, marginBottom: 12 }}>
          {musclePatterns
            .filter((p) => showFilters || p.pattern === selectedPattern)
            .map((p) => {
              const active = p.pattern === selectedPattern;
              return (
                <Pressable
                  key={p.pattern}
                  onPress={() => setSelectedPattern(active ? null : p.pattern)}
                  hitSlop={4}
                  style={({ pressed }) => ({
                    borderWidth: 1,
                    borderColor: active ? "#3a5eff" : "#2a2a2a",
                    backgroundColor: active ? "rgba(58,94,255,0.15)" : "transparent",
                    borderRadius: 16,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ color: active ? "#c9d4ff" : "#888", fontSize: 12, fontWeight: active ? "600" : "500" }}>
                    {p.pattern} ({p.count})
                    {active && !showFilters ? "  ✕" : ""}
                  </Text>
                </Pressable>
              );
            })}
        </View>
      ) : null}

      <SectionList
        sections={sections}
        stickySectionHeadersEnabled
        extraData={[queued, current, doneNames, logSummary]}
        keyExtractor={(item) => item.movement}
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
        renderItem={({ item: m, index, section }) => {
          const summary = movementSummary(m);
          // Pattern sub-header ("HORIZONTAL ROW") when it changes within a muscle.
          const patternHeader =
            recency !== "stale" && (index === 0 || section.data[index - 1].pattern !== m.pattern)
              ? m.pattern
              : null;
          const names = variantNames(m);
          const video = m.variants.find((v) => v.videoUrl)?.videoUrl;
          const single = m.variants.length === 1 ? m.variants[0] : null;
          return (
          <View>
          {patternHeader ? (
            <Text
              style={{
                color: "#6b8f73",
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 0.8,
                marginTop: index === 0 ? 2 : 12,
                marginBottom: 2,
                marginLeft: 8,
              }}
            >
              {patternHeader.toUpperCase()}
            </Text>
          ) : null}
          <Pressable
            disabled={!summary}
            onPress={() => openHistory(m)}
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
                  {m.name}
                  {sessionId && names.some((n) => doneNames.has(n)) ? (
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
                      {m.primaryMuscle}
                    </Text>
                  </View>

                  {single
                    ? single.tags.map((tag) => (
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
                          <Text style={{ color: "#aaa", fontSize: 11 }}>{tag}</Text>
                        </View>
                      ))
                    : m.variants.map((v) => {
                        // Equipment chips: logged ones are bright (with count) and
                        // open that equipment's history; unused ones are dim.
                        const vs = logSummary[v.id];
                        return (
                          <Pressable
                            key={v.id}
                            disabled={!vs}
                            onPress={() => openHistory(m, v.id)}
                            hitSlop={4}
                            style={({ pressed }) => ({
                              borderWidth: 1,
                              borderColor: vs ? "#3a5a7a" : "#262626",
                              backgroundColor: vs ? "rgba(108,180,255,0.10)" : "transparent",
                              borderRadius: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              marginRight: 6,
                              marginBottom: 4,
                              opacity: pressed ? 0.6 : 1,
                            })}
                          >
                            <Text style={{ color: vs ? "#b9dcff" : "#666", fontSize: 11 }}>
                              {v.variant}
                              {vs ? ` ·${vs.count}` : ""}
                            </Text>
                          </Pressable>
                        );
                      })}
                </View>
              </View>

              {video ? (
                <Pressable
                  onPress={() => Linking.openURL(video)}
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

              {sessionId ? renderQueueControl(m) : null}

              {summary ? (
                <Text style={{ color: "#555", fontSize: 20, marginLeft: 10 }}>›</Text>
              ) : null}
            </View>
          </Pressable>
          </View>
          );
        }}
        ListEmptyComponent={
          <Text style={{ color: colors.sub, marginTop: 24, textAlign: "center" }}>
            {recency === "new"
              ? "You've done every exercise here 💪"
              : recency === "stale"
                ? "Nothing neglected — all done in the last 2 weeks"
                : "No exercises found"}
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

  function renderQueueControl(m: Movement) {
    const isCurrent = current && variantNames(m).includes(current.name.toLowerCase());
    if (isCurrent) {
      return (
        <View style={{ ...queueBtn, borderColor: "#1f7a4d", backgroundColor: "#0f2e1f" }}>
          <Text style={{ color: "#00ff99", fontSize: 11, fontWeight: "700" }}>
            {current.active ? "NOW" : "NEXT"}
          </Text>
        </View>
      );
    }

    const pos = queuedIndex(m);
    return (
      <Pressable
        onPress={() => toggleQueued(m)}
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