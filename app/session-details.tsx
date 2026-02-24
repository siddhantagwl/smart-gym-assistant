import { View, Text, Pressable, FlatList, Alert } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getAllSessions, deleteSession } from "@/db/sessions";
import { getExercisesForSession, getAllExercises, StoredExercise } from "@/db/exercise";
import Svg, { Polyline } from "react-native-svg";


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
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);

  function handleDeleteSession() {
    if (!sessionId) return;

    const exerciseCount = exercises.length;

    const performDelete = () => {
      deleteSession(sessionId);
      router.back();
    };

    if (exerciseCount > 0) {
      Alert.alert(
        "Delete session?",
        `This session contains ${exerciseCount} exercise(s). This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: performDelete },
        ]
      );
    } else {
      performDelete();
    }
  }

  useEffect(() => {
    const sessions = getAllSessions();
    const s = sessions.find((x) => x.id === sessionId);

    setSessionNote(s?.note && s.note !== "__DISCARDED__" ? s.note : "");
    setSessionLabels(Array.isArray(s?.sessionLabels) ? s!.sessionLabels : []);
    setStartTime(s?.startTime ?? null);
    setEndTime(s?.endTime ?? null);

    if (!sessionId) {
      setExercises([]);
      setSessionNote("");
      return;
    }

    setExercises(getExercisesForSession(sessionId));
  }, [sessionId]);

  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) return null;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.round(diffMs / 60000));
  }, [startTime, endTime]);

  // Compute PR map per (exerciseName + reps) -> max historical weight excluding current session
  const prMap = useMemo(() => {
    const all = getAllExercises();
    const map: Record<string, number> = {};

    all.forEach((ex) => {
      if (ex.sessionId === sessionId) return; // exclude current session

      const key = `${ex.name}__${ex.reps}`; // PR is weight at same reps
      if (!map[key] || ex.weightKg > map[key]) {
        map[key] = ex.weightKg;
      }
    });

    return map;
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
          <Text style={{ color: colors.text, fontSize: 20 }}>Session details</Text>
          {startTime && (
            <>
              <Text
                style={{
                  color: "#E0E0E0",
                  fontSize: 15,
                  fontWeight: "600",
                  marginTop: 2,
                }}
              >
                {new Date(startTime).toLocaleDateString([], {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>

              {endTime && (
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {" → "}
                  {new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}

              <View
                style={{
                  flexDirection: "row",
                  marginTop: 6,
                  marginBottom: 6,
                  alignItems: "center",
                }}
              >
                {durationMinutes !== null && (
                  <Text style={{ color: colors.muted, marginRight: 12 }}>
                    ⏱ {durationMinutes} min
                  </Text>
                )}
                <Text style={{ color: colors.muted }}>
                  🏋 {exercises.length} exercises
                </Text>
              </View>
            </>
          )}
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
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "#1a0f0f",
            borderWidth: 1,
            borderColor: "#ff3b30",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#ff3b30",
              fontSize: 24,
              fontWeight: "700",
            }}
          >
            ×
          </Text>
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
          renderItem={({ item, index }) => {
            const currentTime = new Date(item.createdAt);
            const prKey = `${item.name}__${item.reps}`;
            const previousMax = prMap[prKey] ?? 0;
            const isPR = previousMax > 0 && item.weightKg > previousMax;
            const delta = isPR ? (item.weightKg - previousMax).toFixed(1) : null;

            // Build sparkline data (historical weights for same exercise + reps)
            const historyWeights = getAllExercises()
              .filter(
                (ex) =>
                  ex.name === item.name &&
                  ex.reps === item.reps &&
                  ex.sessionId !== sessionId
              )
              .map((ex) => ex.weightKg)
              .concat(item.weightKg); // include current

            let sparkPoints: string | null = null;

            if (historyWeights.length > 1) {
              const max = Math.max(...historyWeights);
              const min = Math.min(...historyWeights);
              const range = max - min || 1;

              const width = 70;
              const height = 30;

              sparkPoints = historyWeights
                .map((w, i) => {
                  const x = (i / (historyWeights.length - 1)) * width;
                  const y = height - ((w - min) / range) * height;
                  return `${x},${y}`;
                })
                .join(" ");
            }

            return (
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: 18,
                  paddingHorizontal: 14,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                      <Text style={{ color: colors.text, fontSize: 16 }}>
                        {index + 1}. {item.name}
                      </Text>

                      {isPR && (
                        <View
                          style={{
                            marginLeft: 8,
                          }}
                        >
                          <View
                            style={{
                              paddingVertical: 2,
                              paddingHorizontal: 8,
                              borderRadius: 999,
                              backgroundColor: "#1a1400",
                              borderWidth: 1,
                              borderColor: "#FFD700",
                            }}
                          >
                            <Text style={{ color: "#FFD700", fontSize: 10, fontWeight: "800" }}>
                              PR 🔥
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: colors.muted }}>
                      {item.sets} sets  ·  {item.reps} reps  ·  {item.weightKg} kg
                    </Text>
                    {isPR && delta !== null && (
                      <Text
                        style={{
                          color: "#FFD700",
                          fontSize: 11,
                          marginTop: 4,
                          fontWeight: "600",
                        }}
                      >
                        +{delta} kg over last best ({previousMax} kg)
                      </Text>
                    )}
                    <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
                      Logged at {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>

                    {item.note ? (
                      <Text style={{ color: colors.muted, marginTop: 6 }} numberOfLines={3}>
                        Note: {item.note}
                      </Text>
                    ) : null}
                  </View>

                  {sparkPoints && (
                    <>
                      <View
                        style={{
                          width: 2,
                          backgroundColor: colors.border,
                          marginHorizontal: 6,
                          alignSelf: "stretch",
                          opacity: 0.9,
                        }}
                      />
                      <View
                        style={{
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Svg width={70} height={30}>
                          <Polyline
                            points={sparkPoints}
                            fill="none"
                            stroke={isPR ? "#39FF14" : "#888"}
                            strokeWidth="1.5"
                          />
                        </Svg>
                      </View>
                    </>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <Pressable
          onPress={handleDeleteSession}
          style={{
            marginTop: 8,
            marginBottom: 36,
            paddingVertical: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#ff3b30",
            alignItems: "center",
            backgroundColor: "#140d0d",
          }}
        >
          <Text
            style={{
              color: "#ff3b30",
              fontSize: 15,
              fontWeight: "700",
            }}
          >
            Delete Session
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
