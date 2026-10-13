import { Session } from "@/domain/session";
import { TodayFocus } from "@/domain/todayFocus";
import { MuscleVolume } from "@/domain/weeklyVolume";
import { PlannedExercise } from "@/domain/sessionBuilder";
import { addToUpNext } from "@/hooks/use-up-next";
import TodayFocusCard from "@/components/home/TodayFocusCard";
import GymPicker from "@/components/home/GymPicker";
import { View, Text, Pressable } from "react-native";


export default function IdleMode(props: {
  colors: { text: string; accent: string };
  onStart: (session: Session) => void;
  onLogSauna: () => void;
  todayFocus?: TodayFocus | null;
  weekly?: MuscleVolume[];
  plan?: PlannedExercise[];
  gym: string;
  onGymChange: (gym: string) => void;
}) {
  const { colors, onStart, onLogSauna, todayFocus, weekly, plan, gym, onGymChange } = props;

  // Starts a session; with a plan, its exercises go into Up next in order
  // (the first one loads into the picker as soon as the session mounts).
  function startSession(planned: PlannedExercise[] = []) {
    const session: Session = {
      id: Date.now().toString(),
      startTime: new Date(),
      endTime: null,
      sessionLabels: [],
      gym,
    };
    onStart(session);
    planned.forEach((p) => addToUpNext(session.id, { libraryId: p.libraryId, name: p.name }));
  }

  return (
    <View style={{ width: "100%", paddingHorizontal: 24 }}>
      {todayFocus && todayFocus.focus.length > 0 ? (
        <TodayFocusCard
          focus={todayFocus}
          weekly={weekly ?? []}
          plan={plan ?? []}
          onStartPlan={(items) => startSession(items)}
        />
      ) : null}

      {/* Start session and the gym are separate buttons side by side, so
          changing the gym can't start a session by accident. */}
      <View style={{ flexDirection: "row", alignItems: "stretch", gap: 10 }}>
        <Pressable
          onPress={() => startSession()}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: colors.accent,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: "#000", fontSize: 18, fontWeight: "700" }}>Start session</Text>
        </Pressable>

        <GymPicker
          value={gym}
          onChange={onGymChange}
          renderTrigger={(openGym) => (
            <Pressable
              onPress={openGym}
              hitSlop={4}
              style={({ pressed }) => ({
                maxWidth: 140,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#333",
                backgroundColor: "#141414",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text numberOfLines={1} style={{ color: gym ? "#ddd" : "#888", fontSize: 13, fontWeight: "600", flexShrink: 1 }}>
                📍 {gym || "Gym"}
              </Text>
              <Text style={{ color: "#888", fontSize: 12, marginLeft: 4 }}>▾</Text>
            </Pressable>
          )}
        />
      </View>

      <Pressable onPress={onLogSauna} hitSlop={8} style={{ alignSelf: "center", marginTop: 12, paddingVertical: 4 }}>
        <Text style={{ color: "rgba(255,178,102,0.95)", fontSize: 13, fontWeight: "500" }}>
          + log sauna
        </Text>
      </Pressable>
    </View>
  );
}
