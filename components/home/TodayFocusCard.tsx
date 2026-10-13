// Home (idle): one-line "🎯 Today: Back + Biceps ›" pill. Tapping it opens a
// bottom sheet with the reason, sets per muscle over the last 7 days,
// per-muscle days-since, and links to the Exercises tab filtered by muscle.
// Logic lives in domain/todayFocus.ts and domain/weeklyVolume.ts.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import BottomSheet from "@/components/ui/BottomSheet";
import { useRouter } from "expo-router";

import { TodayFocus } from "@/domain/todayFocus";
import { MuscleVolume, WEEKLY_SET_TARGET } from "@/domain/weeklyVolume";

const BAR_TARGET = "#43a047"; // validated (dataviz) on the #111 sheet
const BAR_OFF = "#FFC107"; // low / high — always labelled in text too

export default function TodayFocusCard({
  focus,
  weekly,
}: {
  focus: TodayFocus;
  weekly: MuscleVolume[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function openMuscle(muscle: string) {
    setOpen(false);
    // `t` makes repeat taps re-apply the filter even if the param is unchanged.
    router.navigate({ pathname: "/exercises", params: { muscle, t: String(Date.now()) } });
  }

  const focusSet = new Set(focus.focus);
  const heading = focus.trainedToday ? "Next" : "Today";

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        style={({ pressed }) => ({
          alignSelf: "center",
          maxWidth: "100%",
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 7,
          paddingHorizontal: 14,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#2E7D5A",
          backgroundColor: "rgba(46,125,90,0.14)",
          marginBottom: 14,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{ color: "#cfe9d4", fontSize: 14, fontWeight: "600", flexShrink: 1 }}
          numberOfLines={1}
        >
          🎯 {heading}: {focus.focus.join(" + ")}
        </Text>
        {focus.comeback ? <Text style={{ color: "#FFC107", fontSize: 13 }}>  ⚠</Text> : null}
        <Text style={{ color: "#7bc47f", fontSize: 16, marginLeft: 6 }}>›</Text>
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>

        <Text style={{ color: "#7bc47f", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
          {focus.trainedToday ? "NEXT UP" : "TODAY'S FOCUS"}
        </Text>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 4 }}>
          {focus.focus.join(" + ")}
        </Text>
        <Text style={{ color: "#aaa", fontSize: 13, marginTop: 4 }}>{focus.reason}</Text>

        {focus.trainedToday ? (
          <Text style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
            Already trained today: {focus.trainedToday.join(" + ")}
          </Text>
        ) : null}

        {focus.comeback ? (
          <Text style={{ color: "#FFC107", fontSize: 13, marginTop: 8 }}>
            ⚠ {focus.comeback.daysOff} days off · {focus.comeback.note}
          </Text>
        ) : null}

        {weekly.length > 0 ? (
          <View style={{ marginTop: 14 }}>
            <Text style={{ color: "#777", fontSize: 11, marginBottom: 6 }}>
              Sets this week (last 7 days) · target {WEEKLY_SET_TARGET.low}–{WEEKLY_SET_TARGET.high}
            </Text>
            {weekly.map((w) => {
              const scale = Math.max(WEEKLY_SET_TARGET.high + 4, ...weekly.map((x) => x.sets));
              return (
                <Pressable
                  key={w.muscle}
                  onPress={() => openMuscle(w.muscle)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 3,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ color: "#ccc", fontSize: 12, width: 78 }} numberOfLines={1}>
                    {w.muscle}
                  </Text>
                  <View style={{ flex: 1, height: 8, justifyContent: "center" }}>
                    {/* target band 10–20 as a faint track */}
                    <View
                      style={{
                        position: "absolute",
                        left: `${(WEEKLY_SET_TARGET.low / scale) * 100}%`,
                        width: `${((WEEKLY_SET_TARGET.high - WEEKLY_SET_TARGET.low) / scale) * 100}%`,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "rgba(67,160,71,0.12)",
                      }}
                    />
                    {w.sets > 0 ? (
                      <View
                        style={{
                          width: `${(w.sets / scale) * 100}%`,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: w.zone === "target" ? BAR_TARGET : BAR_OFF,
                        }}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={{
                      color: "#ddd",
                      fontSize: 12,
                      width: 64,
                      textAlign: "right",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {w.sets}
                    {w.zone !== "target" ? (
                      <Text style={{ color: "#999", fontSize: 10 }}> {w.zone}</Text>
                    ) : null}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {focus.muscles.length > 0 ? (
          <>
            <Text style={{ color: "#777", fontSize: 11, marginTop: 14, marginBottom: 6 }}>
              Days since trained · tap to see exercises
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {focus.muscles.map((m) => {
                const isFocus = focusSet.has(m.muscle);
                return (
                  <Pressable
                    key={m.muscle}
                    onPress={() => openMuscle(m.muscle)}
                    style={({ pressed }) => ({
                      paddingVertical: 5,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: isFocus ? "#2E7D5A" : "#2a2a2a",
                      backgroundColor: isFocus ? "rgba(46,125,90,0.18)" : "transparent",
                      opacity: pressed ? 0.6 : m.recovering ? 0.55 : 1,
                    })}
                  >
                    <Text style={{ color: isFocus ? "#cfe9d4" : "#aaa", fontSize: 12 }}>
                      {m.muscle} · {m.recovering ? "recovering" : `${m.daysSince}d`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </BottomSheet>
    </>
  );
}
