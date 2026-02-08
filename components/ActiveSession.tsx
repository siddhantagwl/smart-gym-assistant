import { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";

import AddExercise from "@/components/AddExercise";
import { endSession, getLatestExerciseByName, insertExercise, LatestExercise } from "@/db/sessions";

type WorkoutType = "Push" | "Pull" | "Legs";

type Session = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  workoutType: WorkoutType;
};

type Colors = {
  text: string;
  accent: string;
};

type Props = {
  activeSession: Session;
  onEnd: () => void;
  colors: Colors;
  suggestedExercises: Record<WorkoutType, string[]>;
};

export default function ActiveSession({
  activeSession,
  onEnd,
  colors,
  suggestedExercises,
}: Props) {
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState(10);

  const [exerciseNote, setExerciseNote] = useState("");
  const [sessionNote, setSessionNote] = useState("");
  const [latest, setLatest] = useState<LatestExercise | null>(null);

  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const trimmed = exerciseName.trim();
    if (!trimmed) {
      setLatest(null);
      return;
    }

    const rec = getLatestExerciseByName(trimmed);
    setLatest(rec);
  }, [exerciseName]);

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      <Text style={{ color: colors.text, fontSize: 16, marginBottom: 10 }}>
        Session started at{" "}
        {activeSession.startTime.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>

      <Text style={{ color: "#aaa", marginBottom: 12 }}>
        Workout: {activeSession.workoutType}
      </Text>

      {savedFlash ? (
        <Text style={{ color: "#4CAF50", marginBottom: 6 }}>
          ✓ Exercise saved
        </Text>
      ) : null}

      <AddExercise
        titleColor={colors.text}
        accentColor={colors.accent}
        workoutLabel={activeSession.workoutType}
        suggestions={suggestedExercises[activeSession.workoutType]}
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
      />

      {latest ? (
        <View style={{ width: "100%", paddingHorizontal: 24, marginTop: -8, marginBottom: 10 }}>
          <View
            style={{
              borderWidth: 1,
              borderColor: "#222",
              backgroundColor: "#111",
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: "#aaa", fontSize: 12, marginBottom: 4 }}>
              Last time
            </Text>

            <Text style={{ color: colors.text }}>
              {latest.sets} sets  ·  {latest.reps} reps  ·  {latest.weightKg} kg
            </Text>

            <Text style={{ color: "#aaa", marginTop: 4, fontSize: 12 }}>
              {new Date(latest.sessionStartTime).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })}{" "}
              {latest.workoutType}
            </Text>

            {latest.note ? (
              <Text style={{ color: "#aaa", marginTop: 6, fontSize: 12 }} numberOfLines={2}>
                Note: {latest.note}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <Text style={{ color: "#aaa", marginBottom: 6, marginTop: 6 }}>
        Session Note (optional)
      </Text>

      <TextInput
        value={sessionNote}
        onChangeText={setSessionNote}
        placeholder="Sleep, energy, pain, PR"
        placeholderTextColor="#666"
        style={{
          width: 320,
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

      <Pressable
        onPress={() => {
          endSession(activeSession.id, new Date(), sessionNote);
          setSessionNote("");
          onEnd();
        }}
        style={{
          backgroundColor: "#e91616",
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 6,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 19 }}>End Session</Text>
      </Pressable>
    </View>
  );
}