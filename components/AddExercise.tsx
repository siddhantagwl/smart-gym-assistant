import { useMemo, useState, useEffect, useRef } from "react";
import { Animated } from "react-native";
import { View, Text, Pressable, TextInput, Keyboard } from "react-native";

type AddExerciseProps = {
  titleColor: string;
  accentColor: string;

  suggestions: string[];

  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;
  note: string;

  onNoteChange: (text: string) => void;
  onSelectExercise: (name: string) => void;
  onExerciseNameChange: (text: string) => void;

  onRepsMinus: () => void;
  onRepsPlus: () => void;

  onWeightMinus: () => void;
  onWeightPlus: () => void;

  onSave: () => void;

  onSaveSet: () => void;
  onStartSet: () => void;
  isExerciseActive: boolean;

  onRepsCommit: (v: number) => void;
  onWeightCommit: (v: number) => void;

  lastTime?: {
    sets: number;
    reps: number;
    weightKg: number;
    sessionLabels?: string[];
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          onPress={onMinus}
          style={{
            width: 34,
            height: 34,
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
                fontSize: 20,
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
            height: 34,
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
  suggestions,
  exerciseName,
  sets,
  reps,
  weightKg,
  note,
  onNoteChange,
  onSelectExercise,
  onExerciseNameChange,
  onRepsMinus,
  onRepsPlus,
  onWeightMinus,
  onWeightPlus,
  onSave,
  onSaveSet,
  onStartSet,
  isExerciseActive,
  onRepsCommit,
  onWeightCommit,
  lastTime,
}: AddExerciseProps) {
  const [showNote, setShowNote] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);

  const [isSetInProgress, setIsSetInProgress] = useState(false);

  const lastChipScale = useRef(new Animated.Value(1)).current;
  const prevSetCount = useRef(sets);

  useEffect(() => {
    if (sets > prevSetCount.current) {
      lastChipScale.setValue(0.8);

      Animated.spring(lastChipScale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }

    prevSetCount.current = sets;
  }, [sets]);

  const filteredSuggestions = useMemo(() => {
    const query = exerciseName.trim().toLowerCase();
    if (!query) return [];

    return suggestions
      .filter((name) => name.toLowerCase().includes(query))
      .filter((name) => name.toLowerCase() !== query); // remove exact match
  }, [exerciseName, suggestions]);

  const isExactMatch = useMemo(() => {
    const q = exerciseName.trim().toLowerCase();
    if (!q) return false;
    return suggestions.some((name) => name.trim().toLowerCase() === q);
  }, [exerciseName, suggestions]);

  const canStart = exerciseName.trim().length > 0;
  const canFinish = sets > 0;
  const mainDisabled = isExerciseActive ? !canFinish : !canStart;

  return (
    <View style={{ width: "100%" }}>
      <View
        style={{
          backgroundColor: "#111",
          borderRadius: 12,
          padding: 12,
          overflow: "visible",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: titleColor, fontSize: 16 }}>
            {mode === "manual" ? "Add exercise (manual)" : "Add exercise"}
          </Text>
        </View>
        <View style={{ marginBottom: 8 }}>
          {/* Input Row */}
          <View style={{ position: "relative" }}>
            <TextInput
              value={exerciseName}
              onChangeText={(text) => {
                onExerciseNameChange(text);
              }}
              placeholder="Type exercise name"
              placeholderTextColor="#666"
              onFocus={() => setIsNameFocused(true)}
              onBlur={() => setIsNameFocused(false)}
              style={{
                borderWidth: 1,
                borderColor: "#222",
                borderRadius: 8,
                height: 44,
                paddingLeft: 12,
                paddingRight: 40,
                color: "#fff",
                backgroundColor: "#0f0f0f",
              }}
            />

            {exerciseName.trim().length > 0 && isNameFocused && (
              <Pressable
                onPress={() => {
                  onExerciseNameChange("");
                  Keyboard.dismiss();
                }}
                style={{
                  position: "absolute",
                  right: 10,
                  top: 12,
                }}
              >
                <Text style={{ color: "#ff4d4f", fontSize: 16 }}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* Chips */}
          {exerciseName.trim() && !isExactMatch && filteredSuggestions.length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 8,
              }}
            >
              {filteredSuggestions.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => {
                    onSelectExercise(name);
                    Keyboard.dismiss();
                  }}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: "#1c1c1c",
                    borderWidth: 1,
                    borderColor: "#2a2a2a",
                  }}
                >
                  <Text style={{ color: "#ddd", fontSize: 12 }}>{name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

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
            <Text style={{ color: "#FFC107", fontSize: 12, fontWeight: "500" }}>
              Prev logged · {lastTime.sets}×{lastTime.reps} · {lastTime.weightKg}kg
            </Text>
          </View>
        ) : (
          <View style={{ height: 8 }} />
        )}


        <View
          style={{
            flexDirection: "row",
            gap: 12,
            width: "100%",
          }}
        >
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

          <View style={{ flex: 1 }}>
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
        </View>

        <View style={{ height: 12 }} />

        {isExerciseActive ? (
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <Pressable
              onPress={() => {
                if (!isSetInProgress) {
                  onStartSet(); // 🔥 stop any running rest in parent
                  setIsSetInProgress(true);
                }
              }}
              disabled={isSetInProgress}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: isSetInProgress ? "#2a2a2a" : "#0f2e1f",
                borderWidth: 1,
                borderColor: isSetInProgress ? "#2a2a2a" : "#1f7a4d",
                opacity: isSetInProgress ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  color: isSetInProgress ? "#aaa" : "#00ff99",
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Start Set {sets + 1}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (isSetInProgress) {
                  onSaveSet();
                  setIsSetInProgress(false);
                }
              }}
              disabled={!isSetInProgress}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: isSetInProgress ? "#5a1a1a" : "#2a2a2a",
                opacity: isSetInProgress ? 1 : 0.6,
              }}
            >
              <Text
                style={{
                  color: isSetInProgress ? "#ff4d4f" : "#666",
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                Finish Set
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isExerciseActive && sets > 0 ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {Array.from({ length: sets }).map((_, i) => {
              const isLast = i === sets - 1;

              const ChipWrapper = isLast ? Animated.View : View;

              return (
                <ChipWrapper
                  key={i}
                  style={[
                    {
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      backgroundColor: "rgba(0, 150, 255, 0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(0, 150, 255, 0.5)",
                    },
                    isLast && {
                      transform: [{ scale: lastChipScale }],
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: "#4da6ff",
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    Set {i + 1}
                  </Text>
                </ChipWrapper>
              );
            })}
          </View>
        ) : null}

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

        <View style={{ height: 4 }} />


        {!isExerciseActive ? (
          <Pressable
            onPress={onSave}
            disabled={!canStart}
            style={{
              backgroundColor: !canStart ? "#333" : "#222",
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: "center",
              opacity: !canStart ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                color: !canStart ? "#bbb" : "#fff",
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Start Exercise
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onSave}
            disabled={!canFinish}
            style={{
              backgroundColor: !canFinish ? "#333" : "#222",
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: "center",
              opacity: !canFinish ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                color: !canFinish ? "#bbb" : "#fff",
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Finish Exercise
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
