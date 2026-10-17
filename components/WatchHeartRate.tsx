// "♥ avg 128 · peak 161 bpm · 312 kcal" under a session's stats — read from
// Health Connect (the watch app writes it; modules/health-connect), over the
// watch workout's start/stop when one overlaps the session (matches Zepp).
// kcal = total calories (what Zepp shows), else active. Long-press shows what
// was used. Before access is granted it's a small "connect" link; with no
// watch data for the session it renders nothing.
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Text } from "react-native";

import { HealthConnect, WatchStats } from "@/modules/health-connect";

type State = { kind: "hidden" } | { kind: "connect" } | { kind: "stats"; stats: WatchStats };

export default function WatchHeartRate({ start, end }: { start: string | null; end: string | null }) {
  const [state, setState] = useState<State>({ kind: "hidden" });

  const load = useCallback(async () => {
    if (!HealthConnect?.isAvailable() || !start || !end) return setState({ kind: "hidden" });
    if (!(await HealthConnect.hasPermissions())) return setState({ kind: "connect" });
    const stats = await HealthConnect.sessionStats(new Date(start).getTime(), new Date(end).getTime());
    setState(stats && stats.samples && stats.avgBpm ? { kind: "stats", stats } : { kind: "hidden" });
  }, [start, end]);

  useEffect(() => {
    load().catch(() => setState({ kind: "hidden" }));
  }, [load]);

  if (state.kind === "hidden") return null;

  if (state.kind === "connect") {
    return (
      <Pressable
        onPress={() => {
          HealthConnect?.requestPermissions()
            .then(() => load())
            .catch(() => {});
        }}
        hitSlop={8}
        style={{ alignSelf: "flex-start", marginBottom: 6 }}
      >
        <Text style={{ color: "#888", fontSize: 13 }}>♥ Show heart rate from your watch ›</Text>
      </Pressable>
    );
  }

  const s = state.stats;
  const kcal = s.totalKcal || s.activeKcal;
  const clock = (ms: number) =>
    new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  function showDetails() {
    Alert.alert(
      "Watch data",
      [
        s.fromWatchWorkout
          ? `Watch workout${s.workoutTitle ? ` "${s.workoutTitle}"` : ""}`
          : "No watch workout found — session times used",
        `${clock(s.windowStartMs)} – ${clock(s.windowEndMs)} (${Math.round((s.windowEndMs - s.windowStartMs) / 60000)} min)`,
        `Heart rate: avg ${Math.round(s.avgBpm ?? 0)} · peak ${Math.round(s.maxBpm ?? 0)} · ${s.samples ?? 0} readings`,
        `Calories: total ${s.totalKcal ? Math.round(s.totalKcal) : "—"} · active ${s.activeKcal ? Math.round(s.activeKcal) : "—"}`,
      ].join("\n"),
    );
  }

  return (
    <Pressable onLongPress={showDetails} style={{ alignSelf: "flex-start", marginBottom: 6 }}>
      <Text style={{ color: "#AAA" }} numberOfLines={1}>
        {/* ≈: Zepp shares coarser (≈ per-minute) heart rate with Health Connect
            than its own graph uses, so avg / peak are a few beats off the watch
            app's; calories come straight from the watch workout. */}
        <Text style={{ color: "#ef4444" }}>♥</Text> ≈ avg {Math.round(s.avgBpm ?? 0)}
        {s.maxBpm ? ` · peak ${Math.round(s.maxBpm)}` : ""} bpm
        {kcal ? ` · ${Math.round(kcal)} kcal` : ""}
      </Text>
    </Pressable>
  );
}
