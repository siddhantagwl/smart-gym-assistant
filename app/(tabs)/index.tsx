import { View, Text, Pressable } from "react-native";
import { useState, useEffect } from "react";

import { initDb } from "@/db/schema";
import { insertSession, insertExercise } from "@/db/sessions";
import AddExercise from "@/components/AddExercise";

type WorkoutType = "Push" | "Pull" | "Legs";

const colors = {
  background: "#0F0F0F",
  text: "#FFFFFF",
  accent: "#4CAF50",
};

type Session = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  workoutType: WorkoutType;
};

const suggestedExercises: Record<WorkoutType, string[]> = {
  Push: [
    "Bench Press",
    "Overhead Press",
    "Incline Dumbbell Press",
    "Lateral Raises",
    "Triceps Pushdown",
  ],
  Pull: ["Pull Ups", "Barbell Row", "Lat Pulldown", "Face Pull", "Biceps Curl"],
  Legs: ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raises"],
};

export default function HomeScreen() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState(1);

  useEffect(() => {
    initDb();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ color: colors.text, fontSize: 28, marginBottom: 20 }}>
        Siddhant&apos;s Gym Log
      </Text>

      {!activeSession ? (
        <View style={{ width: "100%", paddingHorizontal: 24 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Choose today&apos;s workout
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            {(["Push", "Pull", "Legs"] as WorkoutType[]).map((t) => (
              <Pressable
                key={t}
                onPress={() =>
                  setActiveSession({
                    id: Date.now().toString(),
                    startTime: new Date(),
                    endTime: null,
                    workoutType: t,
                  })
                }
                style={{
                  flex: 1,
                  backgroundColor: colors.accent,
                  paddingVertical: 12,
                  borderRadius: 6,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#000", fontSize: 16 }}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ alignItems: "center" }}>
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
            onSelectExercise={(name) => setExerciseName(name)}
            onSetsMinus={() => setSets((s) => Math.max(1, s - 1))}
            onSetsPlus={() => setSets((s) => s + 1)}
            onRepsMinus={() => setReps((r) => Math.max(1, r - 1))}
            onRepsPlus={() => setReps((r) => r + 1)}
            onWeightMinus={() => setWeightKg((w) => Math.max(0, Math.round((w - 2.5) * 10) / 10))}
            onWeightPlus={() => setWeightKg((w) => Math.round((w + 2.5) * 10) / 10)}
            onSave={() => {
              if (!exerciseName) return;
              insertExercise({
                id: Date.now().toString(),
                sessionId: activeSession.id,
                name: exerciseName,
                sets,
                reps,
                weightKg,
              });
              setExerciseName("");
            }}
          />

          <Pressable
            onPress={() =>
               setActiveSession((prev) => {
                if (!prev) return null;
                const finishedSession = { ...prev, endTime: new Date() };

                insertSession(finishedSession);
                console.log("Session saved:", finishedSession);

                return null;
              })
            }
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
      )}

    </View>
  );
}