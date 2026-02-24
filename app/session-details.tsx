import { View, Text, Pressable, FlatList } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getAllSessions } from "@/db/sessions";
import { getExercisesForSession, StoredExercise } from "@/db/exercise";

const colors = {
  background: "#0F0F0F",
  text: "#FFFFFF",
  card: "#161616",
  muted: "#AAA",
  border: "#222",
  accent: "#4CAF50",
};

export default function SessionDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const sessionId = useMemo(() => {
    const v = params.sessionId;
    return typeof v === "string" ? v : "";
  }, [params.sessionId]);

  const [exercises, setExercises] = useState<StoredExercise[]>([]);
  const [sessionNote, setSessionNote] = useState<string>("");
  const [sessionLabels, setSessionLabels] = useState<string[]>([]);

  useEffect(() => {
    const sessions = getAllSessions();
    const s = sessions.find((x) => x.id === sessionId);

    setSessionNote(s?.note && s.note !== "__DISCARDED__" ? s.note : "");
    setSessionLabels(Array.isArray(s?.sessionLabels) ? s!.sessionLabels : []);

    if (!sessionId) {
      setExercises([]);
      setSessionNote("");
      return;
    }

    setExercises(getExercisesForSession(sessionId));
  }, [sessionId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 16, marginTop: 56 }}>
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
          {Array.isArray(sessionLabels) && sessionLabels.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
              {sessionLabels.map((label) => (
                <View
                  key={label}
                  style={{
                    paddingVertical: 2,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: "#0b1f14",
                    borderWidth: 1,
                    borderColor: "#39FF14",
                    marginRight: 6,
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#39FF14",
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 0.3,
                    }}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 4 }}>Session</Text>
          )}
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
