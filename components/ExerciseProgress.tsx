// Key stats + progression chart for one exercise's history (exercise-details).
import { useMemo, useState } from "react";
import { GestureResponderEvent, Pressable, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { StoredExercise } from "@/db/exercises";

const SURFACE = "#111";
const SERIES = "#43a047"; // validated (dataviz) against the #111 card in dark mode
const GRID = "#222";
const INK = "#fff";
const INK_2 = "#aaa";
const INK_3 = "#777";
const UP = "#7bc47f";
const DOWN = "#ff6b6b";

const CHART_H = 150;
const PAD = { top: 16, right: 40, bottom: 22, left: 44 };

type Metric = "weight" | "e1rm" | "volume";
const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "e1rm", label: "Est. 1RM", unit: "kg" },
  { key: "volume", label: "Volume", unit: "kg" },
];

// Epley; a 1-rep set is its own 1RM.
function e1rm(weightKg: number, reps: number) {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function fmt(n: number) {
  if (n >= 10000) return `${round1(n / 1000)}k`;
  return Number.isInteger(round1(n)) ? String(round1(n)) : round1(n).toFixed(1);
}

function shortDate(iso: string, withYear = false) {
  return new Date(iso).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

function daysAgo(iso: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const t = new Date(iso).getTime();
  if (t >= start.getTime()) return "today";
  const d = Math.ceil((start.getTime() - t) / 86_400_000);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

function metricValue(e: StoredExercise, m: Metric) {
  if (m === "weight") return e.weightKg;
  if (m === "e1rm") return e1rm(e.weightKg, e.reps);
  return e.sets * e.reps * e.weightKg;
}

export default function ExerciseProgress({
  history,
}: {
  history: StoredExercise[];
}) {
  // history arrives newest-first (getExercisesByLibraryIds); charts read oldest-first.
  const chrono = useMemo(
    () =>
      [...history]
        .filter((e) => !Number.isNaN(new Date(e.startTime).getTime()))
        .reverse(),
    [history],
  );

  const stats = useMemo(() => {
    if (chrono.length === 0) return null;
    const latest = chrono[chrono.length - 1];
    const first = chrono[0];

    // Ties go to the most recent occurrence.
    let best = chrono[0];
    let bestE1 = chrono[0];
    chrono.forEach((e) => {
      if (e.weightKg >= best.weightKg) best = e;
      if (e1rm(e.weightKg, e.reps) >= e1rm(bestE1.weightKg, bestE1.reps))
        bestE1 = e;
    });

    const monthAgo = Date.now() - 30 * 86_400_000;
    const last30 = chrono.filter(
      (e) => new Date(e.startTime).getTime() >= monthAgo,
    ).length;

    return {
      latest,
      first,
      best,
      bestE1,
      bestE1Value: e1rm(bestE1.weightKg, bestE1.reps),
      delta: latest.weightKg - first.weightKg,
      last30,
    };
  }, [chrono]);

  const [metric, setMetric] = useState<Metric>("weight");

  if (!stats) return null;
  const { latest, first, best, bestE1, bestE1Value, delta, last30 } = stats;

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ color: INK_3, fontSize: 12, marginBottom: 12 }}>
        {last30} in the last 30 days · first logged{" "}
        {shortDate(first.startTime, true)}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <StatTile
          label="Best weight"
          value={`${fmt(best.weightKg)} kg`}
          sub={`× ${best.reps} · ${shortDate(best.startTime)}`}
        />
        <StatTile
          label="Est. 1RM"
          value={`${fmt(bestE1Value)} kg`}
          sub={`from ${fmt(bestE1.weightKg)} × ${bestE1.reps}`}
        />
        <StatTile
          label="Last time"
          value={`${fmt(latest.weightKg)} kg × ${latest.reps}`}
          sub={`${latest.sets} sets · ${daysAgo(latest.startTime)}`}
        />
        <StatTile
          label="Progress"
          value={
            chrono.length < 2
              ? "—"
              : `${delta > 0 ? "▲ +" : delta < 0 ? "▼ " : ""}${fmt(delta)} kg`
          }
          valueColor={
            chrono.length < 2 || delta === 0 ? INK : delta > 0 ? UP : DOWN
          }
          sub={
            chrono.length < 2 ? "log it again to see" : "first → last weight"
          }
        />
      </View>

      {chrono.length >= 2 ? (
        <View
          style={{
            marginTop: 12,
            backgroundColor: SURFACE,
            borderRadius: 12,
            paddingTop: 10,
            paddingHorizontal: 8,
            paddingBottom: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 4,
              marginBottom: 4,
            }}
          >
            <Text style={{ color: INK_2, fontSize: 12, fontWeight: "600" }}>
              Progression
            </Text>
            <View style={{ flexDirection: "row", gap: 4 }}>
              {METRICS.map((m) => {
                const on = m.key === metric;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setMetric(m.key)}
                    hitSlop={{ top: 8, bottom: 8, left: 3, right: 3 }}
                    style={{
                      paddingVertical: 3,
                      paddingHorizontal: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: on ? "#444" : "transparent",
                      backgroundColor: on ? "#1e1e1e" : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: on ? INK : INK_3,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ProgressChart
            key={metric}
            points={chrono}
            metric={metric}
            unit={METRICS.find((m) => m.key === metric)!.unit}
          />
        </View>
      ) : null}
    </View>
  );
}

function StatTile({
  label,
  value,
  sub,
  valueColor = INK,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
}) {
  return (
    <View
      style={{
        flexBasis: "48%",
        flexGrow: 1,
        backgroundColor: SURFACE,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ color: INK_3, fontSize: 12, fontWeight: "600" }}>
        {label}
      </Text>
      <Text
        style={{
          color: valueColor,
          fontSize: 18,
          fontWeight: "700",
          marginTop: 2,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={{ color: INK_2, fontSize: 12, marginTop: 2 }}
        numberOfLines={1}
      >
        {sub}
      </Text>
    </View>
  );
}

function ProgressChart({
  points,
  metric,
  unit,
}: {
  points: StoredExercise[];
  metric: Metric;
  unit: string;
}) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (width === 0) return null;
    const values = points.map((p) => metricValue(p, metric));
    const times = points.map((p) => new Date(p.startTime).getTime());

    let lo = Math.min(...values);
    let hi = Math.max(...values);
    if (hi === lo) {
      lo -= Math.max(1, lo * 0.05);
      hi += Math.max(1, hi * 0.05);
    }
    const padV = (hi - lo) * 0.12;
    lo = Math.max(0, lo - padV);
    hi += padV;

    const t0 = times[0];
    const t1 = times[times.length - 1];
    const plotW = width - PAD.left - PAD.right;
    const plotH = CHART_H - PAD.top - PAD.bottom;
    // Time-scaled x so gaps in training show; fall back to even spacing if
    // everything shares one timestamp.
    const xAt = (i: number) =>
      PAD.left +
      (t1 > t0
        ? ((times[i] - t0) / (t1 - t0)) * plotW
        : (i / (points.length - 1)) * plotW);
    const yAt = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH;

    const xy = values.map((v, i) => [xAt(i), yAt(v)] as const);
    const line = xy
      .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");
    const baseY = PAD.top + plotH;
    const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${baseY} L${xy[0][0].toFixed(1)},${baseY} Z`;

    let maxIdx = 0;
    values.forEach((v, i) => {
      if (v >= values[maxIdx]) maxIdx = i;
    });

    return {
      values,
      xy,
      line,
      area,
      lo,
      hi,
      baseY,
      maxIdx,
      gridYs: [hi, (hi + lo) / 2, lo].map((v) => ({ v, y: yAt(v) })),
    };
  }, [width, points, metric]);

  function pick(e: GestureResponderEvent) {
    if (!geo) return;
    const x = e.nativeEvent.locationX;
    let idx = 0;
    geo.xy.forEach(([px], i) => {
      if (Math.abs(px - x) < Math.abs(geo.xy[idx][0] - x)) idx = i;
    });
    setSelected(idx);
  }

  const last = points.length - 1;
  const sel = selected ?? last;
  const selPoint = points[sel];

  return (
    <View>
      {/* Readout: defaults to the latest point; scrub the chart to inspect others. */}
      <Text
        style={{
          color: INK,
          fontSize: 13,
          fontWeight: "600",
          paddingHorizontal: 4,
        }}
      >
        {geo ? `${fmt(geo.values[sel])} ${unit}` : " "}
        <Text style={{ color: INK_2, fontWeight: "400" }}>
          {"  "}
          {fmt(selPoint.weightKg)} kg × {selPoint.reps} · {selPoint.sets} sets ·{" "}
          {shortDate(selPoint.startTime, true)}
        </Text>
      </Text>

      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        // Tap or drag to inspect. Children are pointerEvents="none" so
        // locationX is always relative to this container; vertical drags can
        // still be taken over by the parent ScrollView.
        onStartShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        style={{ height: CHART_H, marginTop: 4 }}
      >
        <View pointerEvents="none" style={{ flex: 1 }}>
          {geo ? (
            <Svg width={width} height={CHART_H}>
              {geo.gridYs.map((g, i) => (
                <Line
                  key={i}
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={g.y}
                  y2={g.y}
                  stroke={GRID}
                  strokeWidth={1}
                />
              ))}

              <Path d={geo.area} fill={SERIES} fillOpacity={0.1} />
              <Path
                d={geo.line}
                stroke={SERIES}
                strokeWidth={2}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {selected !== null ? (
                <Line
                  x1={geo.xy[sel][0]}
                  x2={geo.xy[sel][0]}
                  y1={PAD.top}
                  y2={geo.baseY}
                  stroke="#555"
                  strokeWidth={1}
                />
              ) : null}

              {/* Best point gets a hollow marker; selected/latest a filled dot with a surface ring. */}
              {geo.maxIdx !== sel ? (
                <Circle
                  cx={geo.xy[geo.maxIdx][0]}
                  cy={geo.xy[geo.maxIdx][1]}
                  r={4}
                  fill={SURFACE}
                  stroke={SERIES}
                  strokeWidth={2}
                />
              ) : null}
              <Circle
                cx={geo.xy[sel][0]}
                cy={geo.xy[sel][1]}
                r={5}
                fill={SERIES}
                stroke={SURFACE}
                strokeWidth={2}
              />
            </Svg>
          ) : null}

          {geo ? (
            <>
              {geo.gridYs.map((g, i) => (
                <Text
                  key={i}
                  style={{
                    position: "absolute",
                    left: 0,
                    width: PAD.left - 6,
                    top: g.y - 7,
                    textAlign: "right",
                    color: INK_3,
                    fontSize: 12,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {fmt(g.v)}
                </Text>
              ))}

              {/* Direct label on the best point only, if it isn't the selected one. */}
              {geo.maxIdx !== sel ? (
                <Text
                  style={{
                    position: "absolute",
                    left: Math.max(
                      0,
                      Math.min(geo.xy[geo.maxIdx][0] - 40, width - PAD.right - 40),
                    ),
                    width: 80,
                    top: Math.max(0, geo.xy[geo.maxIdx][1] - 20),
                    textAlign: "center",
                    color: INK_2,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  best {fmt(geo.values[geo.maxIdx])}
                </Text>
              ) : null}

              <Text
                style={{
                  position: "absolute",
                  left: PAD.left,
                  bottom: 0,
                  color: INK_3,
                  fontSize: 12,
                }}
              >
                {shortDate(points[0].startTime, true)}
              </Text>
              <Text
                style={{
                  position: "absolute",
                  right: PAD.right - 8,
                  bottom: 0,
                  color: INK_3,
                  fontSize: 12,
                }}
              >
                {shortDate(points[last].startTime, true)}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}
