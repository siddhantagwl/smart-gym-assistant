import { useState } from "react";
import { Keyboard } from "react-native";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";

type AddExerciseProps = {
  titleColor: string;
  accentColor: string;

  workoutLabel: string;
  suggestions: string[];

  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;
  note: string;

  onNoteChange: (text: string) => void;
  onSelectExercise: (name: string) => void;

  onSetsMinus: () => void;
  onSetsPlus: () => void;

  onRepsMinus: () => void;
  onRepsPlus: () => void;

  onWeightMinus: () => void;
  onWeightPlus: () => void;

  onSave: () => void;

  onSetsCommit: (v: number) => void;
  onRepsCommit: (v: number) => void;
  onWeightCommit: (v: number) => void;

  lastTime?: {
    sets: number;
    reps: number;
    weightKg: number;
    workoutType: string;
    sessionStartTime: string;
  } | null;

  mode?: "live" | "manual";
};

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
  onCommit,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  onCommit: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  function commit() {
    const n = Number(draft);
    if (!Number.isNaN(n)) onCommit(n);
    setEditing(false);
    Keyboard.dismiss();
  }

  return (
    <View style={{ width: "100%" }}>
      <Text style={{ color: "#aaa", marginBottom: 6, fontSize: 12 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Pressable
          onPress={onMinus}
          style={{
            width: 34,
            height: 40,
            borderRadius: 8,
            backgroundColor: "#222",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18 }}>-</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setDraft(String(value));
            setEditing(true);
          }}
          style={{
            minWidth: 64,
            height: 40,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: editing ? "#444" : "#222",
            backgroundColor: "#111",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 10,
          }}
        >
          {editing ? (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              keyboardType="number-pad"
              autoFocus
              onBlur={commit}
              style={{
                color: "#fff",
                fontSize: 16,
                padding: 0,
                margin: 0,
                textAlign: "center",
                width: "100%",
              }}
            />
          ) : (
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontVariant: ["tabular-nums"],
              }}
            >
              {value}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={onPlus}
          style={{
            width: 34,
            height: 40,
            borderRadius: 8,
            backgroundColor: "#222",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18 }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AddExercise({
  mode = "live",
  titleColor,
  accentColor,
  workoutLabel,
  suggestions,
  exerciseName,
  sets,
  reps,
  weightKg,
  note,
  onNoteChange,
  onSelectExercise,
  onSetsMinus,
  onSetsPlus,
  onRepsMinus,
  onRepsPlus,
  onWeightMinus,
  onWeightPlus,
  onSave,
  onSetsCommit,
  onRepsCommit,
  onWeightCommit,
  lastTime,
}: AddExerciseProps) {
  const [showNote, setShowNote] = useState(false);

  return (
    <View style={{ width: "100%", paddingHorizontal: 16, marginBottom: 14 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: "#222",
          backgroundColor: "#111",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: titleColor, fontSize: 16 }}>
            {mode === "manual" ? "Add exercise (manual)" : "Add exercise"}
          </Text>
          <Text style={{ color: "#aaa", fontSize: 12 }}>{workoutLabel}</Text>
        </View>

        <Text style={{ color: "#aaa", marginBottom: 6, fontSize: 12 }}>Exercise</Text>

        <TextInput
          value={exerciseName}
          onChangeText={onSelectExercise}
          placeholder="Type exercise name"
          placeholderTextColor="#666"
          style={{
            borderWidth: 1,
            borderColor: "#222",
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
            color: "#fff",
            backgroundColor: "#0f0f0f",
            marginBottom: 8,
          }}
        />

        {mode === "live" && exerciseName.trim() && lastTime ? (
          <View
            style={{
              alignSelf: "flex-start",
              marginBottom: 10,
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: "rgba(255, 193, 7, 0.12)",
              borderWidth: 1,
              borderColor: "rgba(255, 193, 7, 0.5)",
            }}
          >
            <Text
              style={{
                color: "#FFC107",
                fontSize: 12,
                fontWeight: "500",
              }}
            >
              Last time · {lastTime.sets}×{lastTime.reps} · {lastTime.weightKg}kg · {lastTime.workoutType}
            </Text>
          </View>
        ) : (
          <View style={{ height: 8 }} />
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {suggestions.map((name) => (
            <Pressable
              key={name}
              onPress={() => onSelectExercise(name)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: exerciseName === name ? accentColor : "#222",
              }}
            >
              <Text style={{ color: exerciseName === name ? "#000" : "#fff", fontSize: 12 }}>
                {name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ height: 12 }} />

        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Stepper
              label="Sets"
              value={sets}
              onMinus={onSetsMinus}
              onPlus={onSetsPlus}
              onCommit={(v) => {
                if (v > 0) onSetsCommit(v);
              }}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Stepper
              label="Reps"
              value={reps}
              onMinus={onRepsMinus}
              onPlus={onRepsPlus}
              onCommit={(v) => {
                if (v > 0) onRepsCommit(v);
              }}
            />
          </View>
        </View>

        <View style={{ height: 10 }} />

        <View style={{ width: "100%" }}>
          <Stepper
            label="Kg"
            value={weightKg}
            onMinus={onWeightMinus}
            onPlus={onWeightPlus}
            onCommit={(v) => {
              if (v >= 0) onWeightCommit(v);
            }}
          />
        </View>

        <View style={{ height: 12 }} />

        <Pressable
          onPress={() => setShowNote((v) => !v)}
          style={{
            alignSelf: "flex-start",
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#222",
            backgroundColor: "#0f0f0f",
            marginBottom: showNote ? 10 : 12,
          }}
        >
          <Text style={{ color: accentColor, fontSize: 12 }}>
            {showNote ? "Hide note" : "Add note"}
          </Text>
        </Pressable>

        {showNote ? (
          <TextInput
            value={note}
            onChangeText={onNoteChange}
            placeholder="How did it feel?"
            placeholderTextColor="#666"
            style={{
              borderWidth: 1,
              borderColor: "#222",
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
              color: "#fff",
              backgroundColor: "#0f0f0f",
              marginBottom: 12,
            }}
          />
        ) : null}

        <Pressable
          onPress={onSave}
          style={{
            backgroundColor: accentColor,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#000", fontSize: 14 }}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}
