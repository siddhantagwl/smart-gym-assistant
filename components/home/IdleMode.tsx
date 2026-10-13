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

      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          marginBottom: 16,
          textAlign: "center",
        }}
      >
        Ready to train
      </Text>

      <GymPicker value={gym} onChange={onGymChange} />

      <Pressable
        onPress={() => startSession()}
        style={{
          backgroundColor: colors.accent,
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#000", fontSize: 18, fontWeight: "600" }}>
          Start session
        </Text>
      </Pressable>

      <Pressable
        onPress={onLogSauna}
        style={({ pressed }) => ({
          marginTop: 10,
          paddingVertical: 11,
          borderRadius: 8,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "rgba(255,153,51,0.45)",
          backgroundColor: pressed ? "rgba(255,153,51,0.12)" : "transparent",
        })}
      >
        <Text style={{ color: "rgba(255,178,102,0.95)", fontSize: 15, fontWeight: "500" }}>
          Log sauna
        </Text>
      </Pressable>
    </View>
  );
}
