import { View, Text, ScrollView, Pressable, Animated } from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Session } from "@/domain/session";
import { StoredSession, getActiveSession, insertSession, endSession, getWorkoutStats, getTrainingLog } from "@/db/sessions";
import { computeTodayFocus, TodayFocus } from "@/domain/todayFocus";

import IdleMode from "@/components/home/IdleMode";
import ActiveMode from "@/components/home/ActiveMode";
import RecentSessions from "@/components/RecentSessions";
import PendingMode, { PendingSessionUI } from "@/components/home/PendingMode";
import LogSaunaModal from "@/components/home/LogSaunaModal";

type HomeMode = "idle" | "pending" | "active";

const colors = {
  background: "#0F0F0F",
  text: "#FFFFFF",
  accent: "#4CAF50",
};


export default function HomeScreen() {
  const [activeSession, setActiveSession] = useState<Session | null>(null); // “In-progress session that the user is currently working on” state
  const [pendingSession, setPendingSession] = useState<StoredSession | null>(null); // “DB knows about it, but it hasn’t started yet” state
  const [saunaOpen, setSaunaOpen] = useState(false);
  const [recentRefreshKey, setRecentRefreshKey] = useState(0);
  const [lang, setLang] = useState<"en" | "sa">("en");
  const insets = useSafeAreaInsets();
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerTranslate = useRef(new Animated.Value(20)).current;
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // After Finish Set / Finish Exercise / Undo, bring the session card's top
  // (total time + rest ring) back into view.
  const scrollRef = useRef<ScrollView>(null);
  const activeTopRef = useRef(0);
  const scrollToSessionTop = useCallback(() => {
    // Next frame, so the rest ring that just appeared is laid out first.
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, activeTopRef.current - 8), animated: true });
    });
  }, []);

  const onTitlePress = useCallback(() => {
    setLang((l) => (l === "en" ? "sa" : "en"));
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    Animated.parallel([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(bannerTranslate, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    bannerTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(bannerOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(bannerTranslate, { toValue: 20, duration: 250, useNativeDriver: true }),
      ]).start();
    }, 5000);
  }, [bannerOpacity, bannerTranslate]);

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  const mode: HomeMode = activeSession
    ? "active"
    : pendingSession
    ? "pending"
    : "idle";

  // Re-derive on every focus so deletions made in session-details (or any
  // other screen) are reflected when the user returns to Home.
  const [stats, setStats] = useState<{ thisWeek: number; currentStreak: number } | null>(null);

  const [todayFocus, setTodayFocus] = useState<TodayFocus | null>(null);

  useFocusEffect(
    useCallback(() => {
      setStats(activeSession ? null : getWorkoutStats());
      setTodayFocus(activeSession ? null : computeTodayFocus(getTrainingLog()));
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
        ref={scrollRef}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 28,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={onTitlePress}
          style={{ alignItems: "center", marginTop: 48, marginBottom: 24 }}
        >
          <View
            style={{
              paddingHorizontal: lang === "sa" ? 20 : 0,
              paddingVertical: lang === "sa" ? 6 : 0,
              borderRadius: 14,
              backgroundColor: lang === "sa" ? "rgba(255,153,51,0.18)" : "transparent",
            }}
          >
            <Text
              style={{
                color: lang === "sa" ? "rgba(255,200,140,0.98)" : colors.text,
                fontSize: 44,
                fontWeight: "300",
                letterSpacing: lang === "sa" ? 2 : 4,
              }}
            >
              {lang === "sa" ? "साधना" : "Sadhana"}
            </Text>
          </View>
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
          <View
            style={{ width: "100%" }}
            onLayout={(e) => {
              activeTopRef.current = e.nativeEvent.layout.y;
            }}
          >
            <ActiveMode
              session={activeSession}
              onEnd={() => setActiveSession(null)}
              colors={{ text: colors.text, accent: colors.accent }}
              onScrollToTop={scrollToSessionTop}
            />
          </View>
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
            todayFocus={todayFocus}
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
            onLogSauna={() => setSaunaOpen(true)}
          />
        )}

        {mode !== "active" && (
          <View style={{ width: "100%", paddingHorizontal: 24, marginTop: 24 }}>
            <RecentSessions key={recentRefreshKey} limit={3} />
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: insets.bottom + 16,
          opacity: bannerOpacity,
          transform: [{ translateY: bannerTranslate }],
          backgroundColor: "rgba(20,14,6,0.96)",
          borderWidth: 1,
          borderColor: "rgba(255,153,51,0.45)",
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 14,
        }}
      >
        <Text
          style={{
            color: "rgba(255,222,184,0.95)",
            fontSize: 13,
            fontStyle: "italic",
            lineHeight: 19,
            textAlign: "center",
          }}
        >
          <Text style={{ fontStyle: "normal", fontWeight: "600", color: "rgba(255,178,102,1)" }}>
            साधना
          </Text>
          {" — Sanskrit for daily, disciplined practice. The work you return to until it becomes who you are."}
        </Text>
      </Animated.View>

      <LogSaunaModal
        visible={saunaOpen}
        onClose={() => setSaunaOpen(false)}
        onSaved={() => {
          setSaunaOpen(false);
          setStats(getWorkoutStats());
          setRecentRefreshKey((k) => k + 1);
        }}
      />
    </View>
  );
}