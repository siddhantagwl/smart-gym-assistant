import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getExercisesByLibraryId } from "@/db/exercises";

export default function ExerciseDetailsScreen() {
  const { exerciseLibraryId, name } = useLocalSearchParams<{
    exerciseLibraryId: string;
    name: string;
  }>();

  const router = useRouter();

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!exerciseLibraryId) return;
    const rows = getExercisesByLibraryId(exerciseLibraryId);
    setHistory(rows.reverse());
  }, [exerciseLibraryId]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000", padding: 20 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
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
          {name}
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

      {/* Stats */}
      <Text style={{ color: "#888", marginBottom: 16 }}>
        {history.length} logged sessions
      </Text>

      <ScrollView>
        {history.map((item, index) => {
          const durationSeconds =
            (new Date(item.endTime).getTime() -
              new Date(item.startTime).getTime()) /
            1000;

          const minutes = Math.floor(durationSeconds / 60);
          const seconds = Math.floor(durationSeconds % 60);

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
              </Text>

              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                  marginTop: 4,
                }}
              >
                {item.sets} sets · {item.reps} reps · {item.weightKg} kg
              </Text>

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