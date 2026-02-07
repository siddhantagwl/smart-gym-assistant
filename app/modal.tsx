import { View, Text, Pressable, FlatList } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { initDb } from "@/db/schema";
import { getAllSessions, getExercisesForSession, StoredExercise } from "@/db/sessions";

const colors = {
  background: "#0F0F0F",
  text: "#FFFFFF",
  card: "#161616",
  muted: "#AAA",
  border: "#222",
  accent: "#4CAF50",
};

export default function ModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const sessionId = useMemo(() => {
    const v = params.sessionId;
    return typeof v === "string" ? v : "";
  }, [params.sessionId]);

  const [exercises, setExercises] = useState<StoredExercise[]>([]);
  const [workoutType, setWorkoutType] = useState<string>("Unknown");
  const [sessionNote, setSessionNote] = useState<string>("");

  useEffect(() => {
    initDb();

    const sessions = getAllSessions();
    const s = sessions.find((x) => x.id === sessionId);
    setWorkoutType(s?.workoutType || "Unknown");
    setSessionNote(s?.note || "");

    if (!sessionId) {
      setExercises([]);
      setWorkoutType("Unknown");
      setSessionNote("");
      return;
    }

    setExercises(getExercisesForSession(sessionId));
  }, [sessionId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 16 }}>
      <View
        style={{
          paddingHorizontal: 16,
          marginBottom: 12,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Text style={{ color: colors.text, fontSize: 18 }}>Session details</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            Workout: {workoutType}
          </Text>
          {sessionNote ? (
            <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={3}>
              Note: {sessionNote}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.accent, fontSize: 16 }}>Close</Text>
        </Pressable>
      </View>

      {exercises.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text style={{ color: colors.muted, fontSize: 16 }}>
            No exercises logged for this session.
          </Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 16, marginBottom: 6 }}>
                {item.name}
              </Text>
              <Text style={{ color: colors.muted }}>
                {item.sets} sets  ·  {item.reps} reps  ·  {item.weightKg} kg
              </Text>

              {item.note ? (
                <Text style={{ color: colors.muted, marginTop: 6 }} numberOfLines={3}>
                  Note: {item.note}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}
