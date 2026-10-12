import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getExercisesByLibraryIds } from "@/db/exercises";
import { getAllLibraryExercises } from "@/db/exerciseLibrary";
import { weightUnitSuffix } from "@/domain/movement";
import ExerciseProgress from "@/components/ExerciseProgress";
import SetBreakdown from "@/components/SetBreakdown";

// History for a movement: every equipment variant's logs, with
// "All · Barbell · Dumbbell…" tabs when more than one variant was logged.
// Stats + chart only render for a single variant so different equipment's
// weights are never mixed. `tab` (optional) opens a specific variant.
export default function ExerciseDetailsScreen() {
  const { exerciseLibraryId, name, tab } = useLocalSearchParams<{
    exerciseLibraryId: string;
    name: string;
    tab?: string;
  }>();

  const router = useRouter();

  const { title, variants, history } = useMemo(() => {
    const lib = getAllLibraryExercises();
    const item = lib.find((l) => l.id === exerciseLibraryId);
    const vs = item ? lib.filter((l) => l.movement === item.movement) : [];
    const ids = vs.length ? vs.map((v) => v.id) : exerciseLibraryId ? [exerciseLibraryId] : [];
    return {
      title: item && vs.length > 1 ? item.movementName : (name ?? item?.name ?? ""),
      variants: vs,
      history: getExercisesByLibraryIds(ids),
    };
  }, [exerciseLibraryId, name]);

  const loggedVariants = variants.filter((v) => history.some((h) => h.exerciseLibraryId === v.id));
  const showTabs = loggedVariants.length > 1;

  const [selected, setSelected] = useState<string>(() => {
    if (tab && history.some((h) => h.exerciseLibraryId === tab)) return tab;
    return showTabs ? "all" : (loggedVariants[0]?.id ?? exerciseLibraryId ?? "all");
  });

  const filtered =
    selected === "all" ? history : history.filter((h) => h.exerciseLibraryId === selected);
  const variantOf = (libraryId: string) => variants.find((v) => v.id === libraryId);

  return (
    <View style={{ flex: 1, backgroundColor: "#000", padding: 20 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: showTabs ? 12 : 20,
        }}
      >
        <Text
          numberOfLines={2}
          style={{
            color: "#fff",
            fontSize: 20,
            fontWeight: "700",
            flex: 1,
            marginRight: 12,
          }}
        >
          {title}
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "#1a1a1a",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#ff4d4d", fontSize: 16 }}>✕</Text>
        </Pressable>
      </View>

      {showTabs ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 14 }}
          contentContainerStyle={{ gap: 6 }}
        >
          {[{ id: "all", label: "All", count: history.length }, ...loggedVariants.map((v) => ({
            id: v.id,
            label: v.variant,
            count: history.filter((h) => h.exerciseLibraryId === v.id).length,
          }))].map((t) => {
            const on = t.id === selected;
            return (
              <Pressable
                key={t.id}
                onPress={() => setSelected(t.id)}
                style={{
                  paddingVertical: 5,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: on ? "#2E7D5A" : "#2a2a2a",
                  backgroundColor: on ? "rgba(46,125,90,0.18)" : "transparent",
                }}
              >
                <Text style={{ color: on ? "#cfe9d4" : "#aaa", fontSize: 12, fontWeight: on ? "700" : "500" }}>
                  {t.label} · {t.count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <ScrollView>
        <Text style={{ color: "#888", marginBottom: 4 }}>
          {filtered.length} logged sessions
        </Text>

        {selected === "all" && showTabs ? (
          <Text style={{ color: "#666", fontSize: 12, marginBottom: 14 }}>
            Stats and chart are per equipment — pick a tab above.
          </Text>
        ) : (
          <ExerciseProgress history={filtered} />
        )}

        {filtered.map((item) => {
          const durationSeconds =
            (new Date(item.endTime).getTime() -
              new Date(item.startTime).getTime()) /
            1000;

          const minutes = Math.floor(durationSeconds / 60);
          const seconds = Math.floor(durationSeconds % 60);
          const v = variantOf(item.exerciseLibraryId);
          const suffix = v ? weightUnitSuffix(v.equipment) : "";

          return (
            <View
              key={item.id}
              style={{
                backgroundColor: "#111",
                padding: 14,
                borderRadius: 12,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#aaa", fontSize: 12 }}>
                {new Date(item.startTime).toDateString()}
                {showTabs && v ? ` · ${v.variant}` : ""}
                {item.sessionGym ? ` · 📍 ${item.sessionGym}` : ""}
              </Text>

              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                  marginTop: 4,
                }}
              >
                {item.sets} sets · {item.reps} reps · {item.weightKg} kg{suffix}
                {item.weightUnit === "lb"
                  ? `  (${Math.round((item.weightKg / 0.45359237) * 10) / 10} lb)`
                  : ""}
              </Text>

              <SetBreakdown
                setLog={item.setLog}
                restPeriods={item.restPeriods}
                sets={item.sets}
                reps={item.reps}
                weightKg={item.weightKg}
              />

              <View
                style={{
                  flexDirection: "row",
                  marginTop: 8,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#1e1e1e",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: "#ccc", fontSize: 11 }}>
                    DUR {minutes}m {seconds}s
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#1e1e1e",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: "#4da6ff", fontSize: 11 }}>
                    REST {item.restSeconds}s
                  </Text>
                </View>
              </View>

              {item.note ? (
                <Text style={{ color: "#777", marginTop: 8 }}>
                  {item.note}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
