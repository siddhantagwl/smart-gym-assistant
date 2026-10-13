// Last 12 weeks at a glance, pinned at the top of History: one column per
// week (oldest on the left), one dot per day, Monday at the top. A day you
// trained is green — brighter for more sets — and empty days are faint; days
// after today are left blank. Tap a day to see what you did; tap again to hide.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

const WEEKS = 12;
const DOT = 12;
const GAP = 4;
const TARGET_DAYS = 3; // a week "on target" has this many training days

// Shades for 1 – 4 workload levels (sets that day). Your sessions run about
// 9 – 25 sets, so the steps split that range.
const SHADES = ["#262626", "#1e4a33", "#27744d", "#3BAF75", "#7EE2AD"];
function level(sets: number): number {
  if (sets <= 0) return 1; // logged (e.g. manual, no sets) still counts
  if (sets < 12) return 1;
  if (sets < 18) return 2;
  if (sets < 23) return 3;
  return 4;
}

export type DayInfo = {
  sets: number;
  minutes: number;
  muscles: string[];
  gyms: string[];
};

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export default function ConsistencyDots({
  days,
  now = new Date(),
}: {
  days: Map<string, DayInfo>; // dayKey() → that day's workouts
  now?: Date;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const first = new Date(monday);
  first.setDate(monday.getDate() - (WEEKS - 1) * 7);

  const columns = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(first);
      date.setDate(first.getDate() + w * 7 + d);
      const key = dayKey(date);
      const future = date.getTime() > today.getTime();
      const info = future ? undefined : days.get(key);
      return { key, date, future, info, isToday: date.getTime() === today.getTime() };
    }),
  );
  const weekCounts = columns.map((col) => col.filter((c) => c.info).length);
  const total = weekCounts.reduce((a, b) => a + b, 0);
  const onTarget = weekCounts.filter((n) => n >= TARGET_DAYS).length;
  const thisWeek = weekCounts[WEEKS - 1];

  const picked = selected ? columns.flat().find((c) => c.key === selected) : undefined;
  let detail = "";
  if (picked) {
    const date = picked.date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const i = picked.info;
    detail = i
      ? [
          date,
          i.muscles.join(", ") || "Workout",
          i.sets ? `${i.sets} sets` : "",
          i.minutes ? `${i.minutes} min` : "",
          i.gyms.length ? `📍 ${i.gyms.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : `${date} · rest day`;
  }

  return (
    <View
      style={{
        backgroundColor: "#161616",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#222",
        padding: 12,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ gap: GAP, marginRight: 6 }}>
          {DAY_LETTERS.map((l, i) => (
            <Text
              key={i}
              style={{ color: "#888", fontSize: 12, height: DOT, lineHeight: DOT, width: 12 }}
            >
              {l}
            </Text>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: GAP }}>
          {columns.map((col, w) => (
            <View key={w} style={{ gap: GAP }}>
              {col.map((c) => (
                <Pressable
                  key={c.key}
                  disabled={c.future}
                  hitSlop={2}
                  onPress={() => setSelected((s) => (s === c.key ? null : c.key))}
                  style={{
                    width: DOT,
                    height: DOT,
                    borderRadius: 3,
                    backgroundColor: c.future
                      ? "transparent"
                      : SHADES[c.info ? level(c.info.sets) : 0],
                    borderWidth: c.key === selected || c.isToday ? 1 : 0,
                    borderColor: c.key === selected ? "#fff" : "#999",
                  }}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: "#999", fontSize: 12 }}>Last 12 weeks</Text>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
            {total} {total === 1 ? "day" : "days"}
          </Text>
          <Text style={{ color: "#999", fontSize: 12, marginTop: 4 }} numberOfLines={1}>
            {TARGET_DAYS}+ day weeks
          </Text>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
            {onTarget} / {WEEKS}
          </Text>
          <Text style={{ color: "#999", fontSize: 12, marginTop: 4 }}>This week</Text>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
            {thisWeek} {thisWeek === 1 ? "day" : "days"}
          </Text>
        </View>
      </View>

      {/* One line under the grid: the tapped day, or the shade legend. */}
      <View style={{ marginTop: 10, minHeight: 16, justifyContent: "center" }}>
        {picked ? (
          <Text numberOfLines={2} style={{ color: "#ddd", fontSize: 12 }}>
            {detail}
          </Text>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text numberOfLines={1} style={{ color: "#888", fontSize: 12, flex: 1 }}>
              Tap a day for details
            </Text>
            <Text style={{ color: "#888", fontSize: 12, marginRight: 4 }}>fewer sets</Text>
            {SHADES.slice(1).map((c) => (
              <View
                key={c}
                style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c, marginHorizontal: 1.5 }}
              />
            ))}
            <Text style={{ color: "#888", fontSize: 12, marginLeft: 4 }}>more</Text>
          </View>
        )}
      </View>
    </View>
  );
}
