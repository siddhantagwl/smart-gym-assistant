// Last 12 weeks at a glance, for the top of History: one column per week
// (Monday at the top, oldest week on the left), one dot per day — green when
// you trained, faint when you didn't. Days after today are left empty.
import { Text, View } from "react-native";

const WEEKS = 12;
const DOT = 12;
const GAP = 4;

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function ConsistencyDots({
  trainedDays,
  now = new Date(),
}: {
  trainedDays: Set<string>; // dayKey() of each day with a workout
  now?: Date;
}) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const first = new Date(monday);
  first.setDate(monday.getDate() - (WEEKS - 1) * 7);

  let count = 0;
  const columns = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = new Date(first);
      day.setDate(first.getDate() + w * 7 + d);
      const future = day.getTime() > today.getTime();
      const trained = !future && trainedDays.has(dayKey(day));
      if (trained) count++;
      return { key: d, future, trained, isToday: day.getTime() === today.getTime() };
    }),
  );
  const thisWeek = columns[WEEKS - 1].filter((c) => c.trained).length;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#161616",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#222",
        padding: 12,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", gap: GAP }}>
        {columns.map((col, w) => (
          <View key={w} style={{ gap: GAP }}>
            {col.map((c) => (
              <View
                key={c.key}
                style={{
                  width: DOT,
                  height: DOT,
                  borderRadius: 3,
                  backgroundColor: c.future ? "transparent" : c.trained ? "#3BAF75" : "#262626",
                  borderWidth: c.isToday ? 1 : 0,
                  borderColor: "#ddd",
                }}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ color: "#999", fontSize: 12 }}>Last 12 weeks</Text>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 2 }}>
          {count} {count === 1 ? "day" : "days"}
        </Text>
        <Text style={{ color: "#999", fontSize: 12, marginTop: 2 }}>
          avg {(count / WEEKS).toFixed(1)} / week
        </Text>
        <Text style={{ color: "#999", fontSize: 12, marginTop: 8 }}>This week</Text>
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 2 }}>
          {thisWeek} {thisWeek === 1 ? "day" : "days"}
        </Text>
      </View>
    </View>
  );
}
