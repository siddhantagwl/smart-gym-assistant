import { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, TextInput, Animated } from "react-native";

import AddExercise from "@/components/AddExercise";
import { Session } from "@/domain/session";
import { endSession } from "@/db/sessions";
import { getLatestExerciseByName, insertExercise, getExercisesForSession, LatestExercise } from "@/db/exercise";
import { getAllLibraryExercises } from "@/db/exerciseLibrary";

type Colors = {
  text: string;
  accent: string;
};

type Props = {
  activeSession: Session;
  onEnd: () => void;
  colors: Colors;
};

function SessionExerciseList({
  exercises,
  sessionStart,
  textColor,
}: {
  exercises: {
    id: string;
    name: string;
    sets: number;
    reps: number;
    weightKg: number;
    restSeconds: number;
    startTime: string;
    endTime: string;
    note: string | null;
  }[];
  sessionStart: Date;
  textColor: string;
}) {


  if (exercises.length === 0) return null;

  return (
    <View style={{ width: "100%", paddingHorizontal: 24, marginTop: 1 }}>

      {[...exercises].reverse().map((e, reversedIndex) => {
        const serialNumber = exercises.length - reversedIndex;

        const start = new Date(e.startTime);
        const end = new Date(e.endTime);
        const totalSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
        const totalMinutes = Math.round(totalSeconds / 60);

        return (
          <View
            key={e.id}
            style={{
              borderWidth: 1,
              borderColor: "#1a1a1a",
              backgroundColor: "#0e0e0e",
              borderRadius: 8,
              paddingVertical: 5,
              paddingHorizontal: 12,
              marginBottom: 6,
            }}
          >
            <Text style={{ color: textColor, fontSize: 12 }}>
              {serialNumber}. {e.name}
            </Text>

            <Text style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>
              {e.sets} sets · {e.reps} reps · {e.weightKg} kg
            </Text>

            <Text style={{ color: "#777", fontSize: 11, marginTop: 2 }}>
              ⏱ {totalMinutes} min
            </Text>

            {e.note ? (
              <Text style={{ color: "#aaa", fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                Note: {e.note}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export default function ActiveSession({activeSession, onEnd, colors,}: Props) {
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState(0);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState(10);

  const [showSessionNote, setShowSessionNote] = useState(false);
  const [exerciseNote, setExerciseNote] = useState("");
  const [sessionNote, setSessionNote] = useState("");
  const [latest, setLatest] = useState<LatestExercise | null>(null);


  const [isExerciseActive, setIsExerciseActive] = useState(false);
  const [currentExerciseStart, setCurrentExerciseStart] = useState<Date | null>(null);
  const [accumulatedRest, setAccumulatedRest] = useState(0);

  const [sessionExercises, setSessionExercises] = useState<
    {
      id: string;
      name: string;
      sets: number;
      reps: number;
      weightKg: number;
      restSeconds: number;
      startTime: string;
      endTime: string;
      note: string | null;
    }[]
  >([]);

  const [exerciseLibraryNames, setExerciseLibraryNames] = useState<string[]>([]);
  const [showExercises, setShowExercises] = useState(true);

  const [exerciseLibrary, setExerciseLibrary] = useState<
    { id: string; name: string; primaryMuscle: string; tags: string[]; videoUrl: string }[]
  >([]);

  const [showLabelConfirm, setShowLabelConfirm] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [inferredLabels, setInferredLabels] = useState<string[]>([]);

  useEffect(() => {
    const exerciseNameTrimmed = exerciseName.trim();
    if (!exerciseNameTrimmed) {
      setLatest(null);
      return;
    }

    const rec = getLatestExerciseByName(exerciseNameTrimmed);
    setLatest(rec);
  }, [exerciseName]);

  useEffect(() => {
    const rows = getExercisesForSession(activeSession.id);
    setSessionExercises(rows);
  }, [activeSession.id]);

  useEffect(() => {
    const allLibExercises = getAllLibraryExercises();
    setExerciseLibrary(allLibExercises);
    setExerciseLibraryNames(allLibExercises.map(e => e.name));
  }, []);

  function formatDuration(totalSeconds: number) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s
        .toString()
        .padStart(2, "0")}`;
    }

    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const [now, setNow] = useState(new Date());
  const pulse = useState(new Animated.Value(0))[0];

  // ----- Rest Timer State -----
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restType, setRestType] = useState<"set" | "transition" | null>(null);
  const intervalRef = useRef<number | null>(null);
  const restOpacity = useRef(new Animated.Value(1)).current;
  const restPulse = useRef(new Animated.Value(0)).current;
  const restPlannedRef = useRef<number>(0);
  function finalizeRestIfRunning(remainingSeconds: number | null) {
    // If no rest is active, nothing to finalize
    if (restSeconds === null) return;

    const planned = restPlannedRef.current || 0;
    const remaining = remainingSeconds ?? 0;

    // actual elapsed rest = planned - remaining (clamped)
    const elapsed = Math.max(0, Math.min(planned, planned - remaining));

    if (elapsed > 0) {
      setAccumulatedRest((prev) => prev + elapsed);
    }

    restPlannedRef.current = 0;
  }
  useEffect(() => {
    if (restSeconds !== null && restSeconds <= 5 && restSeconds > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(restPulse, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(restPulse, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      restPulse.setValue(0);
    }
  }, [restSeconds]);

  function startRestTimer(duration: number = 90) {
    finalizeRestIfRunning(restSeconds);

    // clear existing timer if any
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setRestSeconds(duration);
    restPlannedRef.current = duration;
    restOpacity.setValue(1);

    intervalRef.current = setInterval(() => {
      setRestSeconds(prev => {
        if (prev === null) return null;

        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // finalize the remaining rest as 0 seconds left (full planned duration elapsed)
          finalizeRestIfRunning(0);

          Animated.timing(restOpacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }).start(() => {
            setRestSeconds(null);
          });

          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  }

  function stopRestTimer() {
    // finalize using the CURRENT remaining seconds
    finalizeRestIfRunning(restSeconds);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    restPlannedRef.current = 0;
    setRestSeconds(null);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // includes -> excerise time, rest time, thiking time, walking time, phone scroll time, water break time, socializing time, etc
  function secondsBetween(a: Date, b: Date) {
    const ms = a.getTime() - b.getTime();
    return Math.max(0, Math.floor(ms / 1000));
  }
  const totalSessionSeconds = secondsBetween(now, activeSession.startTime);

  function inferLabels(): string[] {
    const labelSet = new Set<string>();

    sessionExercises.forEach(e => {
      const lib = exerciseLibrary.find(l => l.name === e.name);
      if (lib?.primaryMuscle) {
        labelSet.add(lib.primaryMuscle);
      }
    });

    return Array.from(labelSet);
  }

  if (showLabelConfirm) {
    return (
      <View
        style={{
          width: "100%",
          padding: 20,
          backgroundColor: "#0b0b0b",
          borderRadius: 14,
        }}
      >
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}>
          <Text style={{ color: colors.text, fontSize: 16 }}>
            Confirm muscles trained
          </Text>

          <Pressable
            onPress={() => setShowLabelConfirm(false)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#333",
              backgroundColor: "#141414",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#de0f0f", fontSize: 16, fontWeight: "600" }}>
              ✕
            </Text>
          </Pressable>
        </View>

        {/* Selected (Inferred + User Selected) */}
        <Text style={{ color: "#4CAF50", fontSize: 12, marginBottom: 6 }}>
          Selected
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {selectedLabels.map(label => (
            <Pressable
              key={`selected-${label}`}
              onPress={() =>
                setSelectedLabels(prev =>
                  prev.filter(l => l !== label)
                )
              }
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "#4CAF50",
                backgroundColor: "rgba(76,175,80,0.12)",
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: "#4CAF50", fontSize: 13 }}>
                {label}
                {inferredLabels.includes(label) ? " • ⚡" : ""}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Unselected Muscle Groups */}
        <Text style={{ color: "#aaa", fontSize: 12, marginTop: 12, marginBottom: 6 }}>
          Other muscle groups
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {Array.from(
            new Set(exerciseLibrary.map(e => e.primaryMuscle))
          )
            .filter(label => !selectedLabels.includes(label))
            .map(label => (
              <Pressable
                key={`unselected-${label}`}
                onPress={() =>
                  setSelectedLabels(prev => [...prev, label])
                }
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "#333",
                  backgroundColor: "transparent",
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: "#aaa", fontSize: 13 }}>
                  {label}
                  {inferredLabels.includes(label) ? " • ⚡" : ""}
                </Text>
              </Pressable>
            ))}
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 16,
          }}
        >
          <Pressable
            onPress={() => {
              endSession(
                activeSession.id,
                new Date(),
                "__DISCARDED__",
                []
              );
              setSessionNote("");
              setShowLabelConfirm(false);
              onEnd();
            }}
            style={{
              flex: 0.3,
              paddingVertical: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#e53935",
              backgroundColor: "transparent",
              marginRight: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#e53935", fontSize: 14 }}>
              Discard
            </Text>
          </Pressable>

          <Pressable
            disabled={selectedLabels.length === 0}
            onPress={() => {
              if (selectedLabels.length === 0) return;

              endSession(
                activeSession.id,
                new Date(),
                sessionNote,
                selectedLabels
              );
              setSessionNote("");
              setShowLabelConfirm(false);
              onEnd();
            }}
            style={{
              flex: 0.7,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: selectedLabels.length === 0 ? "#1e1e1e" : "#4CAF50",
              marginLeft: 8,
              alignItems: "center",
              opacity: selectedLabels.length === 0 ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                color: selectedLabels.length === 0 ? "#666" : "#fff",
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              Confirm & Save
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  //▶ Start Exercise
  function startExercise() {
    if (!exerciseName.trim()) return;

    setIsExerciseActive(true);
    setCurrentExerciseStart(new Date());
    setSets(0);
    setAccumulatedRest(0);
  }

  // 💪 Save Set
  function saveSet() {
    if (!isExerciseActive) return;
    setSets(prev => prev + 1);
    setRestType("set");
    startRestTimer(90);
  }

  // ✅ Finish Exercise
  function finishExercise() {
    if (!isExerciseActive || !currentExerciseStart) return;
    if (sets === 0) return;

    stopRestTimer();

    const endTime = new Date();

    insertExercise({
      id: Date.now().toString(),
      sessionId: activeSession.id,
      name: exerciseName,
      sets,
      reps,
      weightKg,
      note: exerciseNote,
      restSeconds: accumulatedRest,
      startTime: currentExerciseStart.toISOString(),
      endTime: endTime.toISOString(),
    });

    const rows = getExercisesForSession(activeSession.id);
    setSessionExercises(rows);

    resetExerciseState();
    setRestType("transition");
    startRestTimer(90);
  }

  // 🔄 Reset Exercise State (after finishing or canceling)
  function resetExerciseState() {
    setIsExerciseActive(false);
    setCurrentExerciseStart(null);
    setSets(0);
    setExerciseName("");
    setExerciseNote("");
    setAccumulatedRest(0);
  }

  return (
    <View
      style={{
        width: "100%",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 12,
        marginBottom: 18,
        backgroundColor: "#0b0b0b",
        borderRadius: 14,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 16, marginBottom: 9 }}>
        Session started at{" "}
        {activeSession.startTime.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>

      <Animated.View
        style={{
          marginBottom: 14,
          paddingVertical: 6,
          paddingHorizontal: 14,
          borderRadius: 20,
          backgroundColor: "rgba(76, 175, 80, 0.12)",
          borderWidth: 1,
          borderColor: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: ["rgba(76, 175, 80, 0.4)", "rgba(76, 175, 80, 0.9)"]
          }),
        }}
      >
        <Text
          style={{
            color: "#4CAF50",
            fontSize: 25,
            fontWeight: "600",
            letterSpacing: 0.3,
          }}
        >
          ⏱ Total time · {formatDuration(totalSessionSeconds)}
        </Text>
      </Animated.View>

      {restSeconds !== null ? (
        <Animated.View
          style={{
            opacity: restOpacity,
            transform: [
              {
                scale:
                  restSeconds !== null && restSeconds <= 5
                    ? restPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.05],
                      })
                    : 1,
              },
            ],
            marginBottom: 10,
            paddingVertical: 6,
            paddingHorizontal: 16,
            borderRadius: 18,
            backgroundColor:
              restType === "transition"
                ? "rgba(33,150,243,0.15)"
                : restSeconds !== null && restSeconds <= 5
                ? "rgba(255,193,7,0.28)"
                : "rgba(255,193,7,0.12)",
            borderWidth: 1,
            borderColor:
              restType === "transition"
                ? "#2196F3"
                : restSeconds !== null && restSeconds <= 5
                ? "#FFC107"
                : "rgba(255,193,7,0.7)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: "#FFC107",
              fontSize: 18,
              fontWeight: "600",
            }}
          >
            {restType === "transition" ? "🔄" : "🧘"} Rest · {Math.floor(restSeconds / 60)}:
            {(restSeconds % 60).toString().padStart(2, "0")}
          </Text>

          <Pressable
            onPress={stopRestTimer}
            style={{
              marginLeft: 16,
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#e53935",
              backgroundColor: "rgba(229,57,53,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#e53935",
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              ✕
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      <View style={{ height: 4 }} />

      <View
        style={{
          width: "100%",
          padding: 6,
          borderRadius: 12,
          backgroundColor: "#0d0d0d",
          marginBottom: 5,
        }}
      >
        <AddExercise
          titleColor={colors.text}
          accentColor={colors.accent}
          suggestions={exerciseLibraryNames}
          exerciseName={exerciseName}
          sets={sets}
          reps={reps}
          weightKg={weightKg}
          note={exerciseNote}
          onSelectExercise={(name) => {
            setExerciseName(name);
            setExerciseNote("");
          }}
          onRepsMinus={() => setReps((r) => Math.max(1, r - 1))}
          onRepsPlus={() => setReps((r) => r + 1)}
          onWeightMinus={() =>
            setWeightKg((w) => Math.max(0, Math.round((w - 0.5) * 10) / 10))
          }
          onWeightPlus={() => setWeightKg((w) => Math.round((w + 0.5) * 10) / 10)}
          onNoteChange={(text) => setExerciseNote(text)}
          onSave={() => {
            if (!isExerciseActive) {
              startExercise();
            } else {
              finishExercise();
            }
          }}
          onWeightCommit={(v) => setWeightKg(v)}
          onRepsCommit={(v) => setReps(v)}
          onSaveSet={saveSet}
          isExerciseActive={isExerciseActive}
          lastTime={
            latest
              ? {
                  sets: latest.sets,
                  reps: latest.reps,
                  weightKg: latest.weightKg,
                  sessionLabels: latest.sessionLabels,
                  sessionStartTime: String(latest.sessionStartTime),
                }
              : null
          }
        />
      </View>



      <View style={{ width: "100%" }}>
        {sessionExercises.length > 0 ? (
          <Pressable
            onPress={() => setShowExercises((v) => !v)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 24,
              marginTop: 6,
            }}
          >
            <Text style={{ color: "#aaa", fontSize: 13 }}>
              🏋 Exercises this session ({sessionExercises.length})
            </Text>
            <Text style={{ color: "#777", fontSize: 19 }}>
              {showExercises ? "▾" : "▸"}
            </Text>
          </Pressable>
        ) : null}

        {showExercises ? (
          <SessionExerciseList
            exercises={sessionExercises}
            sessionStart={activeSession.startTime}
            textColor={colors.text}
          />
        ) : null}
      </View>

      <View style={{ height: 14 }} />

      <Pressable
        onPress={() => setShowSessionNote(v => !v)}
        style={{
          alignSelf: "flex-start",
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#222",
          backgroundColor: "#0f0f0f",
          marginBottom: showSessionNote ? 8 : 14,
        }}
      >
        <Text style={{ color: "#aaa", fontSize: 12 }}>
          {showSessionNote ? "Hide session note" : "Add session note"}
        </Text>
      </Pressable>

      {showSessionNote ? (
        <TextInput
          value={sessionNote}
          onChangeText={setSessionNote}
          placeholder="Sleep, energy, pain, PR"
          placeholderTextColor="#666"
          style={{
            width: "100%",
            borderWidth: 1,
            borderColor: "#222",
            borderRadius: 6,
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: "#111",
            color: "#fff",
            marginBottom: 12,
          }}
        />
      ) : null}

      <Pressable
        onPress={() => {
          stopRestTimer();
          setRestSeconds(null);
          const inferred = inferLabels();
          setSelectedLabels(inferred);
          setInferredLabels(inferred);
          setShowLabelConfirm(true);
        }}
        style={{
          backgroundColor: "#e91616",
          paddingVertical: 10,
          paddingHorizontal: 24,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 19 }}>End Session</Text>
      </Pressable>
    </View>
  );
}