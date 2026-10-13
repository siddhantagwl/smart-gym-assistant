// Per-set breakdown: one column per set — "Set N · 0:38" chip, reps × weight
// under it, then the rest taken after that set (blue, like the REST chips
// elsewhere). Columns sit in a single sideways-scrolling row so it never wraps.
// Static version for Session details / exercise history; the live version in
// AddExercise reuses SetColumn around its animated chips.
import { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

import { SetEntry } from "@/domain/exercise";

const KG_PER_LB = 0.45359237;

export function formatSetLoad(e: SetEntry): string {
  if (e.weightKg <= 0) return `${e.reps} reps`;
  const w =
    e.weightUnit === "lb"
      ? `${Math.round((e.weightKg / KG_PER_LB) * 10) / 10}lb`
      : `${Math.round(e.weightKg * 10) / 10}`;
  return `${e.reps}×${w}`;
}

// "Set 2 · 0:38" — duration (time under the set) when it was logged.
export function formatSetLabel(index: number, e?: SetEntry): string {
  return e?.durationSec != null ? `Set ${index + 1} · ${formatRest(e.durationSec)}` : `Set ${index + 1}`;
}

export function formatRest(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// Chip on top, load underneath, then the rest after this set.
// `chip` lets the live view pass its animated chip.
export function SetColumn({
  chip,
  load,
  rest,
}: {
  chip: ReactNode;
  load?: string;
  rest?: number | null;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      {chip}
      {load ? (
        <Text
          style={{
            color: "#ddd",
            fontSize: 12,
            fontWeight: "600",
            marginTop: 3,
            fontVariant: ["tabular-nums"],
          }}
        >
          {load}
        </Text>
      ) : null}
      {rest != null ? (
        <Text
          style={{
            color: "#6CB4FF",
            fontSize: 12,
            fontWeight: "600",
            marginTop: 2,
            fontVariant: ["tabular-nums"],
          }}
        >
          💤{formatRest(rest)}
        </Text>
      ) : null}
    </View>
  );
}

export function SetChip({ label, small }: { label: string; small?: boolean }) {
  return (
    <View
      style={{
        paddingVertical: small ? 2 : 4,
        paddingHorizontal: small ? 8 : 10,
        borderRadius: 999,
        backgroundColor: "rgba(0, 255, 150, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(0, 255, 150, 0.5)",
      }}
    >
      <Text style={{ color: "#4dffa6", fontSize: small ? 11 : 12, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

// Static breakdown for saved exercises. Renders nothing for rows logged
// before per-set logging existed, or edited afterwards (long-press edit in
// Session details) so the log no longer matches: set count differs, or the
// last set isn't the row's reps × weight (the row summary is the last set).
export default function SetBreakdown({
  setLog,
  restPeriods,
  sets,
  reps,
  weightKg,
}: {
  setLog?: SetEntry[];
  restPeriods?: number[];
  sets: number;
  reps: number;
  weightKg: number;
}) {
  if (!setLog || setLog.length === 0 || setLog.length !== sets) return null;
  const last = setLog[setLog.length - 1];
  if (last.reps !== reps || Math.abs(last.weightKg - weightKg) > 0.05) return null;
  const rests = restPeriods ?? [];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 8 }}
      contentContainerStyle={{ alignItems: "flex-start", columnGap: 8 }}
    >
      {setLog.map((entry, i) => (
        <SetColumn
          key={i}
          chip={<SetChip label={formatSetLabel(i, entry)} small />}
          load={formatSetLoad(entry)}
          rest={i < setLog.length - 1 ? rests[i] : null}
        />
      ))}
    </ScrollView>
  );
}
