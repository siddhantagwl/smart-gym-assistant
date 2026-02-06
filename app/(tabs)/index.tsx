import { View, Text, Pressable } from "react-native";
import { useState } from "react";

const colors = {
  background: "#0F0F0F",
  text: "#FFFFFF",
  accent: "#4CAF50",
};

export default function HomeScreen() {
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

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

      {!sessionStartTime ? (
        <Pressable
          onPress={() => setSessionStartTime(new Date())}
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
        <Text style={{ color: colors.text, fontSize: 16 }}>
          Session started at{" "}
          {sessionStartTime?.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      )}
    </View>
  );
}