import { View, Text, ScrollView, Pressable } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";

import { Session } from "@/domain/session";
import { StoredSession, getActiveSession, insertSession, endSession, getWorkoutStats } from "@/db/sessions";

import IdleMode from "@/components/home/IdleMode";
import ActiveMode from "@/components/home/ActiveMode";
import RecentSessions from "@/components/RecentSessions";
import PendingMode, { PendingSessionUI } from "@/components/home/PendingMode";

type HomeMode = "idle" | "pending" | "active";

const colors = {
  background: "#0F0F0F",
  text: "#FFFFFF",
  accent: "#4CAF50",
};


export default function HomeScreen() {
  const [activeSession, setActiveSession] = useState<Session | null>(null); // “In-progress session that the user is currently working on” state
  const [pendingSession, setPendingSession] = useState<StoredSession | null>(null); // “DB knows about it, but it hasn’t started yet” state
  const [showMeaning, setShowMeaning] = useState(false);

  const mode: HomeMode = activeSession
    ? "active"
    : pendingSession
    ? "pending"
    : "idle";

  // Re-derive on every focus so deletions made in session-details (or any
  // other screen) are reflected when the user returns to Home.
  const [stats, setStats] = useState<{ thisWeek: number; currentStreak: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      setStats(activeSession ? null : getWorkoutStats());
    }, [activeSession])
  );

  useEffect(() => {
    const s = getActiveSession();
    if (s) setPendingSession(s);
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
        <Pressable
          onPress={() => setShowMeaning((v) => !v)}
          style={{ alignItems: "center", marginTop: 48, marginBottom: 24 }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 44,
              fontWeight: "300",
              letterSpacing: 4,
            }}
          >
            Sadhana
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 11,
              fontWeight: "500",
              letterSpacing: 4,
              marginTop: 10,
              textTransform: "uppercase",
            }}
          >
            Train · Log · Repeat
          </Text>
          {showMeaning && (
            <Text
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 12,
                fontStyle: "italic",
                letterSpacing: 0.3,
                marginTop: 16,
                maxWidth: 280,
                textAlign: "center",
                lineHeight: 18,
              }}
            >
              <Text
                style={{
                  backgroundColor: "rgba(255,153,51,0.18)",
                  color: "rgba(255,200,140,0.95)",
                  fontStyle: "normal",
                }}
              >
                {" साधना "}
              </Text>
              {" — Sanskrit for daily, disciplined practice. The work you return to until it becomes who you are."}
            </Text>
          )}
        </Pressable>

        {stats && (stats.currentStreak > 0 || stats.thisWeek > 0) ? (
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 20,
            }}
          >
            {stats.currentStreak > 0 ? (
              <View
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,107,53,0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(255,107,53,0.5)",
                }}
              >
                <Text style={{ color: "#FF6B35", fontSize: 13, fontWeight: "600" }}>
                  🔥 {stats.currentStreak} day{stats.currentStreak === 1 ? "" : "s"} streak
                </Text>
              </View>
            ) : null}

            {stats.thisWeek > 0 ? (
              <View
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: "rgba(76,175,80,0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(76,175,80,0.5)",
                }}
              >
                <Text style={{ color: "#4CAF50", fontSize: 13, fontWeight: "600" }}>
                  📅 {stats.thisWeek} this week
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {mode === "active" && activeSession && (
          <ActiveMode
            session={activeSession}
            onEnd={() => setActiveSession(null)}
            colors={{ text: colors.text, accent: colors.accent }}
          />
        )}

        {mode === "pending" && pendingSession && (
          <PendingMode
            session={{
              id: pendingSession.id,
              startTime: new Date(pendingSession.startTime),
            }}
            onResume={(s: PendingSessionUI) => {
              setActiveSession({
                id: s.id,
                startTime: s.startTime,
                endTime: null,
                sessionLabels: pendingSession?.sessionLabels ?? [],
                note: pendingSession?.note ?? "",
              });
              setPendingSession(null);
            }}
            onDiscard={(sessionId) => {
              endSession(
                sessionId,
                new Date(),
                "__DISCARDED__",
                [],
              );
              setPendingSession(null);
            }}
            colors={{ text: colors.text, accent: colors.accent }}
          />
        )}

        {mode === "idle" && (
          <IdleMode
            colors={{ text: colors.text, accent: colors.accent }}
            onStart={(session: Session) => {
              insertSession({
                id: session.id,
                startTime: session.startTime,
                endTime: session.endTime,
                sessionLabels: [],
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