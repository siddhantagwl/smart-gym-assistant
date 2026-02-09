import { View, Text, ScrollView } from "react-native";
import { useState, useEffect } from "react";

import PendingMode from "@/components/home/PendingMode";
import IdleMode, { WorkoutType as IdleWorkoutType, Session as IdleSession } from "@/components/home/IdleMode";
import ActiveMode from "@/components/home/ActiveMode";

import { StoredSession, getActiveSession, insertSession, endSession } from "@/db/sessions";
import RecentSessions from "@/components/RecentSessions";

type HomeMode = "idle" | "pending" | "active";

const colors = {
  background: "#0F0F0F",
  text: "#FFFFFF",
  accent: "#4CAF50",
};

type Session = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  workoutType: IdleWorkoutType;
};

const suggestedExercises: Record<IdleWorkoutType, string[]> = {
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
  const [activeSession, setActiveSession] = useState<Session | null>(null); // “In-progress session that the user is currently working on” state
  const [pendingSession, setPendingSession] = useState<StoredSession | null>(null); // “DB knows about it, but it hasn’t started yet” state

  const mode: HomeMode = activeSession
    ? "active"
    : pendingSession
    ? "pending"
    : "idle";

  useEffect(() => {
    const s = getActiveSession();
    if (s) setPendingSession(s);
  }, []);

  function resumePending() {
    if (!pendingSession) return;
    setActiveSession({
      id: pendingSession.id,
      startTime: new Date(pendingSession.startTime),
      endTime: null,
      workoutType: pendingSession.workoutType as IdleWorkoutType,
    });
    setPendingSession(null);
  }

  function discardPending() {
    if (!pendingSession) return;
    endSession(pendingSession.id, new Date(), "__DISCARDED__");
    setPendingSession(null);
  }

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
        <Text style={{ color: colors.text, fontSize: 28, marginBottom: 20, marginTop: 40 }}>
          Train. Log. Repeat.
        </Text>

        {mode === "active" && activeSession && (
          <ActiveMode
            session={activeSession}
            onEnd={() => setActiveSession(null)}
            colors={{ text: colors.text, accent: colors.accent }}
            suggestedExercises={suggestedExercises}
          />
        )}

        {mode === "pending" && pendingSession && (
          <PendingMode
            pendingSession={pendingSession}
            onResume={resumePending}
            onDiscard={discardPending}
            colors={{ text: colors.text, accent: colors.accent }}
          />
        )}

        {mode === "idle" && (
          <IdleMode
            colors={{ text: colors.text, accent: colors.accent }}
            onStart={(session: IdleSession) => {
              insertSession({
                id: session.id,
                startTime: session.startTime,
                endTime: session.endTime,
                workoutType: session.workoutType,
                note: "",
              });
              setActiveSession(session);
            }}
          />
        )}
        
        {mode !== "active" && (
          <View style={{ width: "100%", paddingHorizontal: 24, marginTop: 24 }}>
            <RecentSessions limit={3} />
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}