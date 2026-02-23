import { useEffect, useState } from "react";
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
    note: string | null;
    createdAt: string;
  }[];
  sessionStart: Date;
  textColor: string;
}) {

  function minutesBetween(a: Date, b: Date) {
    const ms = a.getTime() - b.getTime();
    return Math.max(0, Math.round(ms / 60000));
  }

  if (exercises.length === 0) return null;

  return (
    <View style={{ width: "100%", paddingHorizontal: 24, marginTop: 1 }}>

      {[...exercises].reverse().map((e, reversedIndex) => {
        const index = exercises.findIndex(x => x.id === e.id);

        const serialNumber = exercises.length - reversedIndex;

        const currentTime = new Date(e.createdAt);
        const baseTime =
          index === 0
            ? sessionStart
            : new Date(exercises[index - 1].createdAt);

        const minutes = minutesBetween(currentTime, baseTime);

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
              ⏱ {minutes} min
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
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState(10);

  const [showSessionNote, setShowSessionNote] = useState(false);
  const [exerciseNote, setExerciseNote] = useState("");
  const [sessionNote, setSessionNote] = useState("");
  const [latest, setLatest] = useState<LatestExercise | null>(null);

  const [savedFlash, setSavedFlash] = useState(false);

  const [sessionExercises, setSessionExercises] = useState<
    {
      id: string;
      name: string;
      sets: number;
      reps: number;
      weightKg: number;
      note: string | null;
      createdAt: string;
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

  function minutesBetween(a: Date, b: Date) {
    const ms = a.getTime() - b.getTime();
    return Math.max(0, Math.round(ms / 60000));
  }

  function formatDurationMinutes(totalMinutes: number) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  const [now, setNow] = useState(new Date());
  const pulse = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 60000); // 60 seconds

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(pulse, {
        toValue: 0,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start();
  }, [now]);

  const totalSessionMinutes = minutesBetween(
    now,
    activeSession.startTime
  );

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
        <Text style={{ color: colors.text, fontSize: 16, marginBottom: 12 }}>Confirm muscles trained</Text>

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
            onPress={() => setShowLabelConfirm(false)}
            style={{
              flex: 0.35,
              paddingVertical: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#444",
              backgroundColor: "#cf3a0d",
              marginRight: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ddd", fontSize: 15 }}>
              Back
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
              flex: 0.65,
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
          ⏱ Total time · {formatDurationMinutes(totalSessionMinutes)}
        </Text>
      </Animated.View>

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
          onSetsMinus={() => setSets((s) => Math.max(1, s - 1))}
          onSetsPlus={() => setSets((s) => s + 1)}
          onRepsMinus={() => setReps((r) => Math.max(1, r - 1))}
          onRepsPlus={() => setReps((r) => r + 1)}
          onWeightMinus={() =>
            setWeightKg((w) => Math.max(0, Math.round((w - 0.5) * 10) / 10))
          }
          onWeightPlus={() => setWeightKg((w) => Math.round((w + 0.5) * 10) / 10)}
          onNoteChange={(text) => setExerciseNote(text)}
          onSave={() => {
            if (!exerciseName) return;

            insertExercise({
              id: Date.now().toString(),
              sessionId: activeSession.id,
              name: exerciseName,
              sets,
              reps,
              weightKg,
              note: exerciseNote,
            });

            const rows = getExercisesForSession(activeSession.id);
            setSessionExercises(rows);

            setExerciseName("");
            setExerciseNote("");

            setSets(3);
            setReps(10);
            setWeightKg(10);

            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1500);
          }}
          onWeightCommit={(v) => setWeightKg(v)}
          onSetsCommit={(v) => setSets(v)}
          onRepsCommit={(v) => setReps(v)}
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

      {savedFlash ? (
        <Text style={{ color: "#4CAF50", marginBottom: 6 }}>
          ✓ Exercise saved
        </Text>
      ) : null}

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
              Exercises this session ({sessionExercises.length})
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