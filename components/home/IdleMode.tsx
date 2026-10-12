import { Session } from "@/domain/session";
import { TodayFocus } from "@/domain/todayFocus";
import TodayFocusCard from "@/components/home/TodayFocusCard";
import GymPicker from "@/components/home/GymPicker";
import { View, Text, Pressable } from "react-native";


export default function IdleMode(props: {
  colors: { text: string; accent: string };
  onStart: (session: Session) => void;
  onLogSauna: () => void;
  todayFocus?: TodayFocus | null;
  gym: string;
  onGymChange: (gym: string) => void;
}) {
  const { colors, onStart, onLogSauna, todayFocus, gym, onGymChange } = props;

  return (
    <View style={{ width: "100%", paddingHorizontal: 24 }}>
      {todayFocus && todayFocus.focus.length > 0 ? (
        <TodayFocusCard focus={todayFocus} />
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
        onPress={() => {
          const session: Session = {
            id: Date.now().toString(),
            startTime: new Date(),
            endTime: null,
            sessionLabels: [],
            gym,
          };
          onStart(session);
        }}
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
