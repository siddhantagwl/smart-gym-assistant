import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";

import AddExercise from "@/components/AddExercise";
import { insertExercise, insertSession } from "@/db/sessions";

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
  const [weightKg, setWeightKg] = useState(1);

  const [exerciseNote, setExerciseNote] = useState("");
  const [sessionNote, setSessionNote] = useState("");

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
        onSelectExercise={(name) => setExerciseName(name)}
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
        }}
      />

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
          const finishedSession = { ...activeSession, endTime: new Date() };

          insertSession({
            id: finishedSession.id,
            startTime: finishedSession.startTime,
            endTime: finishedSession.endTime!,
            workoutType: finishedSession.workoutType,
            note: sessionNote,
          });

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