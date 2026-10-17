// Workout preferences (Settings → ⚙ Workout preferences): the values that
// used to be fixed — rest targets, switch timer, notification nudge / button /
// vibration, feature switches, weekly target. Saved on the phone
// (services/preferences.ts); changes apply from the next rest / screen.
import { ReactNode } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";

import { registerRestActionCategory } from "@/services/notifications";
import { refreshHomeWidget } from "@/services/homeWidget";
import { DEFAULT_PREFS, Prefs, resetPrefs, setPref, usePrefs, Vibration } from "@/services/preferences";

const colors = {
  bg: "#000",
  card: "#111",
  border: "#222",
  text: "#fff",
  muted: "#999",
  accent: "#3BAF75",
};

function fmt(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, marginBottom: 8 }}>
        {title}
      </Text>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Row({ label, hint, right, last }: { label: string; hint?: string; right: ReactNode; last?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
        gap: 10,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15 }}>{label}</Text>
        {hint ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{hint}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function StepButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#333",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 18 }}>{label}</Text>
    </Pressable>
  );
}

// [−] value [+]
function Stepper({
  value,
  step,
  min,
  max,
  format,
  onChange,
}: {
  value: number;
  step: number;
  min: number;
  max: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <StepButton label="−" disabled={value <= min} onPress={() => onChange(Math.max(min, value - step))} />
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", minWidth: 44, textAlign: "center", fontVariant: ["tabular-nums"] }}>
        {format(value)}
      </Text>
      <StepButton label="+" disabled={value >= max} onPress={() => onChange(Math.min(max, value + step))} />
    </View>
  );
}

// One-of chips.
function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", maxWidth: 200 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={{
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: on ? colors.accent : "#333",
              backgroundColor: on ? "rgba(59,175,117,0.15)" : "transparent",
            }}
          >
            <Text style={{ color: on ? colors.accent : colors.muted, fontSize: 13, fontWeight: "700" }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: "#333", true: "rgba(59,175,117,0.6)" }}
      thumbColor={value ? colors.accent : "#888"}
    />
  );
}

export default function PreferencesScreen() {
  const p = usePrefs();

  function set<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPref(key, value);
    if (key === "plusSeconds") registerRestActionCategory();
    if (key === "weeklyTargetDays") refreshHomeWidget();
  }

  const restStepper = (key: "restCompound" | "restIsolation" | "restCardio" | "restOther" | "switchSeconds") => (
    <Stepper value={p[key]} step={15} min={15} max={600} format={fmt} onChange={(v) => set(key, v)} />
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Section title="REST TIMERS">
        <Row label="Compound" hint="squat, bench, rows…" right={restStepper("restCompound")} />
        <Row label="Isolation" hint="curls, raises…" right={restStepper("restIsolation")} />
        <Row label="Cardio" right={restStepper("restCardio")} />
        <Row label="Other" hint="untagged exercises" right={restStepper("restOther")} />
        <Row label="Switch" hint="after Finish Exercise" right={restStepper("switchSeconds")} last />
      </Section>

      <Section title="NOTIFICATIONS">
        <Row
          label="Rest-start pop-up"
          hint="Live countdown + watch buzz when a rest starts. Off = only the alert at 0."
          right={<Toggle value={p.restStartNotice} onChange={(v) => set("restStartNotice", v)} />}
        />
        <Row
          label="Nudge after rest ends"
          hint="A second buzz if you're still resting"
          right={
            <Chips
              value={p.nudgeSeconds}
              onChange={(v) => set("nudgeSeconds", v)}
              options={[
                { value: 0, label: "Off" },
                { value: 15, label: "15s" },
                { value: 30, label: "30s" },
                { value: 60, label: "60s" },
              ]}
            />
          }
        />
        <Row
          label="Extend button"
          hint="On the rest notifications"
          right={
            <Chips
              value={p.plusSeconds}
              onChange={(v) => set("plusSeconds", v)}
              options={[
                { value: 15, label: "+15s" },
                { value: 30, label: "+30s" },
                { value: 60, label: "+60s" },
              ]}
            />
          }
        />
        <Row
          label="Vibration"
          hint="Rest-done alert + nudge, on the phone. The watch buzzes per Zepp."
          right={
            <Chips<Vibration>
              value={p.vibration}
              onChange={(v) => set("vibration", v)}
              options={[
                { value: "long", label: "Long" },
                { value: "short", label: "Short" },
                { value: "pulse", label: "Pulse" },
              ]}
            />
          }
          last
        />
      </Section>

      <Section title="FEATURES">
        <Row
          label="Floating timer"
          hint="Mini window when you leave the app mid-rest"
          right={<Toggle value={p.floatingTimer} onChange={(v) => set("floatingTimer", v)} />}
        />
        <Row
          label="Volume-down = set button"
          hint="Start / Finish Set on the session screen"
          right={<Toggle value={p.volumeDownSet} onChange={(v) => set("volumeDownSet", v)} />}
        />
        <Row
          label="Gym auto-detect"
          hint="Preselect the gym you're at (GPS, app open only)"
          right={<Toggle value={p.gymAutoDetect} onChange={(v) => set("gymAutoDetect", v)} />}
        />
        <Row
          label="Heart-rate line"
          hint="♥ from your watch in Session details"
          right={<Toggle value={p.heartRateLine} onChange={(v) => set("heartRateLine", v)} />}
          last
        />
      </Section>

      <Section title="HISTORY">
        <Row
          label="Weekly target"
          hint="Training days that make a week 'on target' (History + widget)"
          right={
            <Stepper
              value={p.weeklyTargetDays}
              step={1}
              min={1}
              max={7}
              format={(v) => `${v} d`}
              onChange={(v) => set("weeklyTargetDays", v)}
            />
          }
          last
        />
      </Section>

      <Pressable
        onPress={() =>
          Alert.alert("Reset to defaults?", "All workout preferences go back to how the app started.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Reset",
              style: "destructive",
              onPress: () => {
                resetPrefs();
                registerRestActionCategory();
                refreshHomeWidget();
              },
            },
          ])
        }
        style={{ alignSelf: "center", paddingVertical: 10, paddingHorizontal: 16 }}
      >
        <Text style={{ color: "#e53935", fontSize: 14 }}>
          Reset to defaults ({fmt(DEFAULT_PREFS.restCompound)} / {fmt(DEFAULT_PREFS.restIsolation)} …)
        </Text>
      </Pressable>
    </ScrollView>
  );
}
