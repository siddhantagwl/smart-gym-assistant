import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
} from "react-native";

import { WeightUnit } from "@/domain/exercise";
import { getAllLibraryExercises } from "@/db/exerciseLibrary";
import {
  getAllExercises,
  getExercisesForSession,
  StoredExercise,
  updateExercise,
} from "@/db/exercises";
import { deleteSession, getAllSessions } from "@/db/sessions";
import Svg, { Polyline } from "react-native-svg";
import SetBreakdown from "@/components/SetBreakdown";

const LB_TO_KG = 0.45359237;

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
  const [sessionGym, setSessionGym] = useState("");

  // Long-press an exercise card to fix a typo'd name / sets / reps / weight / note.
  const [editing, setEditing] = useState<StoredExercise | null>(null);
  const [editName, setEditName] = useState("");
  const [editSets, setEditSets] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editUnit, setEditUnit] = useState<WeightUnit>("kg");
  const [editNote, setEditNote] = useState("");

  function openEditor(item: StoredExercise) {
    setEditing(item);
    setEditName(item.name);
    setEditSets(String(item.sets));
    setEditReps(String(item.reps));
    setEditUnit(item.weightUnit);
    setEditWeight(
      item.weightUnit === "lb"
        ? String(Math.round((item.weightKg / LB_TO_KG) * 10) / 10)
        : String(item.weightKg),
    );
    setEditNote(item.note ?? "");
  }

  // Converts the typed value so the field always shows the weight in the active unit.
  function toggleEditUnit() {
    const w = parseFloat(editWeight) || 0;
    if (editUnit === "kg") {
      setEditWeight(String(Math.round((w / LB_TO_KG) * 10) / 10));
      setEditUnit("lb");
    } else {
      setEditWeight(String(Math.round(w * LB_TO_KG * 10) / 10));
      setEditUnit("kg");
    }
  }

  function saveEdit() {
    if (!editing) return;

    const name = editName.trim() || editing.name;
    const sets = Math.max(0, parseInt(editSets, 10) || 0);
    const reps = Math.max(0, parseInt(editReps, 10) || 0);
    const weight = Math.max(0, parseFloat(editWeight) || 0);
    const weightKg =
      editUnit === "lb" ? Math.round(weight * LB_TO_KG * 10) / 10 : weight;

    // Renaming re-links the row to the matching library entry (if any) so
    // exercise history and PRs follow the corrected name.
    let exerciseLibraryId = editing.exerciseLibraryId;
    if (name !== editing.name) {
      const match = getAllLibraryExercises().find(
        (l) => l.name.trim().toLowerCase() === name.toLowerCase(),
      );
      exerciseLibraryId = match ? match.id : name;
    }

    updateExercise(editing.id, {
      name,
      exerciseLibraryId,
      sets,
      reps,
      weightKg,
      weightUnit: editUnit,
      note: editNote.trim(),
    });

    setExercises(getExercisesForSession(sessionId));
    setEditing(null);
  }

  function handleDeleteSession() {
    if (!sessionId) return;

    const exerciseCount = exercises.length;

    const performDelete = () => {
      deleteSession(sessionId);
      router.back();
    };

    const message =
      exerciseCount > 0
        ? `This session contains ${exerciseCount} exercise(s). This cannot be undone.`
        : "This cannot be undone.";

    Alert.alert("Delete session?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: performDelete },
    ]);
  }

  useEffect(() => {
    const sessions = getAllSessions();
    const s = sessions.find((x) => x.id === sessionId);

    setSessionNote(s?.note && s.note !== "__DISCARDED__" ? s.note : "");
    setSessionLabels(Array.isArray(s?.sessionLabels) ? s!.sessionLabels : []);
    setStartTime(s?.startTime ?? null);
    setEndTime(s?.endTime ?? null);
    setSessionGym(s?.gym ?? "");

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

  const totalVolume = useMemo(() => {
    return exercises.reduce(
      (sum, e) => sum + e.sets * e.reps * e.weightKg,
      0,
    );
  }, [exercises]);

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
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: 16,
        marginTop: 56,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{
          position: "absolute",
          top: 60,
          right: 16,
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: "#1a1a1a",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <Text
          style={{
            color: "#ff4d4d",
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          ✕
        </Text>
      </Pressable>
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
          <Text style={{ color: colors.text, fontSize: 20 }}>
            Session details
          </Text>
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
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>

              {sessionGym ? (
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>
                  📍 {sessionGym}
                </Text>
              ) : null}

              {endTime && (
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {new Date(startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" → "}
                  {new Date(endTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
                {!sessionLabels.includes("Sauna") && (
                  <Text style={{ color: colors.muted, marginRight: 12 }}>
                    🏋 {exercises.length} exercises
                  </Text>
                )}
                {totalVolume > 0 && (
                  <Text style={{ color: colors.muted }}>
                    💪 {Math.round(totalVolume).toLocaleString()} kg
                  </Text>
                )}
              </View>
            </>
          )}
          {Array.isArray(sessionLabels) && sessionLabels.length > 0 ? (
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}
            >
              {sessionLabels.map((label) => {
                const isSauna = label === "Sauna";
                return (
                  <View
                    key={label}
                    style={{
                      paddingVertical: 2,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      backgroundColor: isSauna ? "rgba(255,153,51,0.18)" : "#0b1f14",
                      borderWidth: 1,
                      borderColor: isSauna ? "rgba(255,153,51,0.7)" : "#39FF14",
                      marginRight: 6,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: isSauna ? "rgba(255,178,102,0.98)" : "#39FF14",
                        fontSize: 11,
                        fontWeight: "700",
                        letterSpacing: 0.3,
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 4 }}>Session</Text>
          )}
          {sessionNote ? (
            <Text
              style={{ color: colors.muted, marginTop: 4 }}
              numberOfLines={3}
            >
              Note: {sessionNote}
            </Text>
          ) : null}
        </View>
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
            const scale = new Animated.Value(1);
            const start = new Date(item.startTime);
            const end = new Date(item.endTime);
            const durationMs = end.getTime() - start.getTime();
            const durationSec = Math.max(0, Math.floor(durationMs / 1000));
            const minutes = Math.floor(durationSec / 60);
            const seconds = durationSec % 60;
            const prKey = `${item.name}__${item.reps}`;
            const previousMax = prMap[prKey] ?? 0;
            const isPR = previousMax > 0 && item.weightKg > previousMax;
            const delta = isPR
              ? (item.weightKg - previousMax).toFixed(1)
              : null;

            // Build sparkline data: this exercise's weight over time, across all rep
            // counts, in chronological order. getAllExercises() is already ordered by
            // start_time ASC and includes the current session's row — so we match by
            // name only (matching reps too would strand progressive-overload sessions,
            // where weight climbs as reps drop) and don't concat the current weight
            // (that forced it to the end and zigzagged the line for older sessions).
            const historyWeights = getAllExercises()
              .filter((ex) => ex.name === item.name)
              .map((ex) => ex.weightKg);

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
              <Animated.View
                style={{
                  transform: [{ scale }],
                  marginBottom: 12,
                }}
              >
                <Pressable
                  onPressIn={() => {
                    Animated.spring(scale, {
                      toValue: 0.97,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.spring(scale, {
                      toValue: 1,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPress={() =>
                    router.push({
                      pathname: "/exercise-details",
                      params: {
                        exerciseLibraryId: item.exerciseLibraryId,
                        name: item.name,
                      },
                    })
                  }
                  onLongPress={() => openEditor(item)}
                  style={({ pressed }) => ({
                    backgroundColor: colors.card,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: pressed ? "#2e2e2e" : colors.border,
                    paddingVertical: 18,
                    paddingHorizontal: 14,
                  })}
                >
                <View
                  style={{ flexDirection: "row", alignItems: "flex-start" }}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{ color: colors.text, fontSize: 16, flexShrink: 1 }}
                        numberOfLines={2}
                      >
                        {index + 1}. {item.name}
                      </Text>

                      {isPR && (
                        <View
                          style={{
                            marginLeft: 8,
                            marginTop: 1,
                            flexShrink: 0,
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
                            <Text
                              style={{
                                color: "#FFD700",
                                fontSize: 10,
                                fontWeight: "800",
                              }}
                            >
                              PR 🔥
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: colors.muted }}>
                      {item.sets} sets · {item.reps} reps · {item.weightKg} kg
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
                    <View style={{ flexDirection: "row", marginTop: 6 }}>
                      <View
                        style={{
                          paddingVertical: 4,
                          paddingHorizontal: 10,
                          borderRadius: 999,
                          backgroundColor: "#1a1a1a",
                          borderWidth: 1,
                          borderColor: "#333",
                          marginRight: 8,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: colors.muted,
                            fontSize: 9,
                            fontWeight: "700",
                            marginRight: 4,
                            letterSpacing: 0.5,
                          }}
                        >
                          DUR
                        </Text>
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          ⏱ {minutes}:{seconds.toString().padStart(2, "0")}
                        </Text>
                      </View>

                      <View
                        style={{
                          paddingVertical: 4,
                          paddingHorizontal: 10,
                          borderRadius: 999,
                          backgroundColor: "#0f1622",
                          borderWidth: 1,
                          borderColor: "#2a4a7a",
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: colors.muted,
                            fontSize: 9,
                            fontWeight: "700",
                            marginRight: 4,
                            letterSpacing: 0.5,
                          }}
                        >
                          REST
                        </Text>
                        <Text
                          style={{
                            color: "#6CB4FF",
                            fontSize: 11,
                            fontWeight: "600",
                          }}
                        >
                          💤 {Math.floor(item.restSeconds / 60)}:
                          {(item.restSeconds % 60).toString().padStart(2, "0")}
                        </Text>
                      </View>
                    </View>

                    {item.note ? (
                      <Text
                        style={{ color: colors.muted, marginTop: 6 }}
                        numberOfLines={3}
                      >
                        Note: {item.note}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ position: "absolute", right: 10, top: 18 }}>
                    <Text style={{ color: "#555", fontSize: 16 }}>›</Text>
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
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <Pressable
          onPress={handleDeleteSession}
          hitSlop={6}
          style={{
            marginTop: 8,
            marginBottom: 36,
            alignSelf: "center",
            paddingVertical: 8,
            paddingHorizontal: 18,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#5a2a28",
            backgroundColor: "transparent",
          }}
        >
          <Text
            style={{
              color: "#ff6b6b",
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            Delete session
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={editing !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 18,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 14,
              }}
            >
              Edit exercise
            </Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Exercise name"
              placeholderTextColor="#666"
              style={styles.input}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Sets</Text>
                <TextInput
                  value={editSets}
                  onChangeText={setEditSets}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Reps</Text>
                <TextInput
                  value={editReps}
                  onChangeText={setEditReps}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.label}>Weight</Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput
                value={editWeight}
                onChangeText={setEditWeight}
                keyboardType="decimal-pad"
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
              />
              <Pressable
                onPress={toggleEditUnit}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#333",
                  backgroundColor: "#1a1a1a",
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {editUnit}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Note</Text>
            <TextInput
              value={editNote}
              onChangeText={setEditNote}
              placeholder="optional"
              placeholderTextColor="#666"
              multiline
              style={[styles.input, { minHeight: 44, textAlignVertical: "top" }]}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable
                onPress={() => setEditing(null)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#333",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.muted, fontWeight: "700" }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={saveEdit}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: "#0f2e1f",
                  borderWidth: 1,
                  borderColor: "#1f7a4d",
                }}
              >
                <Text style={{ color: "#00ff99", fontWeight: "700" }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: "#fff",
    fontSize: 15,
    marginBottom: 4,
  },
});
