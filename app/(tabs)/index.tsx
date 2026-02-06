import { View, Text, Pressable } from "react-native";
import { useState } from "react";
import { useEffect } from "react";
import { initDb } from "@/db/schema";
import { insertSession, insertExercise } from "@/db/sessions";

const colors = {
  background: "#0F0F0F",
  text: "#FFFFFF",
  accent: "#4CAF50",
};

type Session = {
  id: string;
  startTime: Date;
  endTime: Date | null;
};


export default function HomeScreen() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);

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
        Siddhant's Gym Log
      </Text>

      {!activeSession ? (
        <Pressable
          onPress={() => setActiveSession({
            id: Date.now().toString(),
            startTime: new Date(),
            endTime: null
          })}
          style={{
            backgroundColor: colors.accent,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 19}}>
            Start Session
          </Text>
        </Pressable>
      ) : (
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.text, fontSize: 16, marginBottom: 16 }}>
            Session started at{" "}
            {activeSession.startTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>

          <View style={{ marginBottom: 16, width: "100%", paddingHorizontal: 24 }}>
            <Text style={{ color: colors.text, marginBottom: 8 }}>Add exercise</Text>
            <Pressable onPress={() => setExerciseName("Bench Press")} style={{ marginBottom: 6 }}>
              <Text style={{ color: "#aaa" }}>Name: {exerciseName || "tap to set example"}</Text>
            </Pressable>
            <Text style={{ color: "#aaa" }}>Sets: {sets}  Reps: {reps}</Text>
            <Pressable
              onPress={() => {
                if (!activeSession || !exerciseName) return;
                insertExercise({
                  id: Date.now().toString(),
                  sessionId: activeSession.id,
                  name: exerciseName,
                  sets,
                  reps,
                });
                setExerciseName("");
              }}
              style={{
                backgroundColor: colors.accent,
                paddingVertical: 10,
                borderRadius: 6,
                marginTop: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#000" }}>Save Exercise</Text>
            </Pressable>
          </View>

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