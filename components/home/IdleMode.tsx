import { View, Text, Pressable } from "react-native";

export type WorkoutType = "Push" | "Pull" | "Legs";

export type Session = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  workoutType: WorkoutType;
};

export default function IdleMode(props: {
  colors: { text: string; accent: string };
  onStart: (session: Session) => void;
}) {
  const { colors, onStart } = props;

  return (
    <View style={{ width: "100%", paddingHorizontal: 24 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          marginBottom: 16,
          textAlign: "center",
        }}
      >
        Choose today&apos;s workout
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        {(["Push", "Pull", "Legs"] as WorkoutType[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              const session: Session = {
                id: Date.now().toString(),
                startTime: new Date(),
                endTime: null,
                workoutType: t,
              };
              onStart(session);
            }}
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
  );
}
