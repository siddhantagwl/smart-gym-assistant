import { View, Text, ScrollView } from "react-native";
import { useState, useEffect } from "react";

import { Session } from "@/domain/session";
import { StoredSession, getActiveSession, insertSession, endSession } from "@/db/sessions";

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

  const mode: HomeMode = activeSession
    ? "active"
    : pendingSession
    ? "pending"
    : "idle";

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
        <Text style={{ color: colors.text, fontSize: 28, marginBottom: 20, marginTop: 40 }}>
          Train. Log. Progress.
        </Text>

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
              });
              setPendingSession(null);
            }}
            onDiscard={(sessionId) => {
              endSession(sessionId, new Date(), "__DISCARDED__");
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
                sessionLabel: null,
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