import { View, Text, Pressable, ScrollView } from "react-native";
import { useState, useEffect } from "react";

import { initDb } from "@/db/schema";
import ActiveSession from "@/components/ActiveSession";

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

  useEffect(() => {
    initDb();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 28,
        }}
        keyboardShouldPersistTaps="handled"
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
          <ActiveSession
            activeSession={activeSession}
            onEnd={() => setActiveSession(null)}
            colors={{ text: colors.text, accent: colors.accent }}
            suggestedExercises={suggestedExercises}
          />
        )}
      </ScrollView>
    </View>
  );
}