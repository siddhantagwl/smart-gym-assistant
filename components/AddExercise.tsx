import { ReactNode, useMemo, useState, useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { Animated } from "react-native";
import { View, Text, Pressable, TextInput, Keyboard, ScrollView } from "react-native";
import { SetEntry, WeightUnit } from "@/domain/exercise";
import { formatSetLabel, formatSetLoad, SetColumn } from "@/components/SetBreakdown";

const KG_PER_LB = 0.45359237;

function kgToLb(kg: number): number {
  return Math.round((kg / KG_PER_LB) * 10) / 10;
}

function lbToKg(lb: number): number {
  return Math.round(lb * KG_PER_LB * 10) / 10;
}

type AddExerciseProps = {
  titleColor: string;
  accentColor: string;

  // One entry per movement; `search` = movement + variant names, lowercased.
  suggestions: { key: string; label: string; search: string; count: number }[];
  // Every library variant name, to recognise an exact pick.
  knownNames: string[];

  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;
  weightUnit: WeightUnit;
  note: string;

  onNoteChange: (text: string) => void;
  onSelectMovement: (movementKey: string) => void;

  // Equipment chips for the picked movement (only shown before the exercise
  // starts; switching equipment mid-exercise isn't supported).
  variants?: { id: string; label: string }[] | null;
  selectedVariantId?: string | null;
  onSelectVariant?: (libraryId: string) => void;

  // "⚠ Horizontal row already done today …" (domain/patternCoverage.ts).
  overlapHint?: string | null;
  onExerciseNameChange: (text: string) => void;

  onRepsMinus: () => void;
  onRepsPlus: () => void;

  onWeightMinus: () => void;
  onWeightPlus: () => void;

  onWeightUnitChange: (u: WeightUnit) => void;

  // setStartedAt: when the auto-saved in-flight set began (lets Undo restore it).
  onSave: (autoSaveSetInProgress?: boolean, setStartedAt?: Date | null) => void;

  // setStartedAt lets the parent log the set's duration.
  onSaveSet: (setStartedAt?: Date | null) => void;
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
    otherGym?: string | null; // set when "Prev logged" comes from another gym's machine
  } | null;

  // "/db" for dumbbells (logged per dumbbell), else "".
  weightSuffix?: string;

  // Live per-set breakdown under the set chips (reps × weight, rests between).
  setLog?: SetEntry[];
  restPeriods?: number[];

  // Undo of Finish Exercise: when the exercise re-activates with a new `key`,
  // restore this set state instead of auto-starting set 1.
  restoreSetState?: { key: number; inProgress: boolean; startedAt: string | null } | null;

  // "Try today" target (domain/progression.ts). Opt-in: tapping applies it.
  suggestion?: { weightKg: number; reps: number; reason: string } | null;
  onApplySuggestion?: () => void;

  mode?: "live" | "manual";
};

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
  onCommit,
}: {
  label: ReactNode;
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
      {typeof label === "string" ? (
        <Text style={{ color: "#aaa", marginBottom: 6, fontSize: 12 }}>{label}</Text>
      ) : (
        <View style={{ marginBottom: 6 }}>{label}</View>
      )}
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
  knownNames,
  exerciseName,
  sets,
  reps,
  weightKg,
  weightUnit,
  note,
  onNoteChange,
  onSelectMovement,
  variants,
  selectedVariantId,
  onSelectVariant,
  overlapHint,
  onExerciseNameChange,
  onRepsMinus,
  onRepsPlus,
  onWeightMinus,
  onWeightPlus,
  onWeightUnitChange,
  onSave,
  onSaveSet,
  onStartSet,
  isExerciseActive,
  onRepsCommit,
  onWeightCommit,
  lastTime,
  suggestion,
  onApplySuggestion,
  restoreSetState,
  weightSuffix = "",
  setLog,
  restPeriods,
}: AddExerciseProps) {
  const isLb = weightUnit === "lb";
  const displayedWeight = isLb ? kgToLb(weightKg) : weightKg;

  function stepWeight(direction: 1 | -1) {
    if (isLb) {
      // Step by 2.5 lb in lb mode (matches the 1.13 kg increment of a typical
      // small plate pair). Convert through kg so storage stays canonical.
      const nextLb = Math.max(0, Math.round((displayedWeight + direction * 2.5) * 10) / 10);
      onWeightCommit(lbToKg(nextLb));
    } else if (direction === 1) {
      onWeightPlus();
    } else {
      onWeightMinus();
    }
  }
  const [showNote, setShowNote] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);

  const [isSetInProgress, setIsSetInProgress] = useState(false);

  // Timestamp-based set timer: visible counter is cosmetic; elapsed is
  // derived from wall-clock so background throttling can't drift it.
  const setStartRef = useRef<Date | null>(null);
  const [setNow, setSetNow] = useState<Date | null>(null);
  const setPulse = useRef(new Animated.Value(0)).current;

  const lastChipScale = useRef(new Animated.Value(1)).current;
  const setStripRef = useRef<ScrollView>(null);
  const prevSetCount = useRef(sets);
  const prevExerciseActive = useRef(isExerciseActive);

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

  // Auto-start set 1 when the exercise becomes active, so the user lands
  // directly on "Finish Set" instead of needing to press "Start Set 1".
  // Exception: re-activation from Undo restores the pre-finish set state.
  const appliedRestoreKey = useRef<number | null>(null);
  useEffect(() => {
    if (!prevExerciseActive.current && isExerciseActive) {
      if (restoreSetState && restoreSetState.key !== appliedRestoreKey.current) {
        appliedRestoreKey.current = restoreSetState.key;
        const startedAt =
          restoreSetState.inProgress && restoreSetState.startedAt
            ? new Date(restoreSetState.startedAt)
            : null;
        setIsSetInProgress(restoreSetState.inProgress);
        setStartRef.current = restoreSetState.inProgress ? startedAt ?? new Date() : null;
        setSetNow(restoreSetState.inProgress ? new Date() : null);
      } else {
        setIsSetInProgress(true);
        setStartRef.current = new Date();
        setSetNow(new Date());
      }
    }
    if (prevExerciseActive.current && !isExerciseActive) {
      setStartRef.current = null;
      setSetNow(null);
    }
    prevExerciseActive.current = isExerciseActive;
    // Only on the activation edge; restoreSetState is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExerciseActive]);

  useEffect(() => {
    if (!isSetInProgress) return;

    const id = setInterval(() => setSetNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [isSetInProgress]);

  useEffect(() => {
    if (!isSetInProgress) {
      setPulse.setValue(0);
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(setPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(setPulse, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [isSetInProgress]);

  const setElapsedSeconds =
    isSetInProgress && setStartRef.current && setNow
      ? Math.max(
          0,
          Math.floor((setNow.getTime() - setStartRef.current.getTime()) / 1000),
        )
      : 0;

  const filteredSuggestions = useMemo(() => {
    const query = exerciseName.trim().toLowerCase();
    if (!query) return [];

    return suggestions
      .filter((s) => s.search.includes(query))
      .sort(
        (a, b) =>
          Number(!a.label.toLowerCase().startsWith(query)) -
            Number(!b.label.toLowerCase().startsWith(query)) || a.label.localeCompare(b.label),
      )
      .slice(0, 12);
  }, [exerciseName, suggestions]);

  const isExactMatch = useMemo(() => {
    const q = exerciseName.trim().toLowerCase();
    if (!q) return false;
    return knownNames.some((name) => name.trim().toLowerCase() === q);
  }, [exerciseName, knownNames]);

  // One button toggles Start Set ↔ Finish Set. A second tap within 700ms is
  // ignored so a double-tap can't finish a set and immediately start the next.
  const lastSetTapRef = useRef(0);
  function onSetButton() {
    const now = Date.now();
    if (now - lastSetTapRef.current < 700) return;
    lastSetTapRef.current = now;

    if (isSetInProgress) {
      onSaveSet(setStartRef.current);
      setIsSetInProgress(false);
      setStartRef.current = null;
      setSetNow(null);
    } else {
      onStartSet(); // stop any running rest in parent
      setIsSetInProgress(true);
      setStartRef.current = new Date();
      setSetNow(new Date());
    }
  }

  // Finish Exercise is hold-to-confirm: a quick tap only shows a hint.
  const HOLD_MS = 600;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const [holdHint, setHoldHint] = useState(false);
  const holdHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (holdHintTimer.current) clearTimeout(holdHintTimer.current);
  }, []);

  function finishExerciseNow() {
    // If a set is mid-flight, treat Finish Exercise as "Finish Set + Finish Exercise"
    // so the user doesn't silently lose the last set they just performed.
    const autoSave = isSetInProgress;
    const startedAt = setStartRef.current;
    if (autoSave) {
      setIsSetInProgress(false);
      setStartRef.current = null;
      setSetNow(null);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSave(autoSave, startedAt);
  }

  const canStart = exerciseName.trim().length > 0;
  // Allow Finish Exercise when a set is mid-flight too — that set will be auto-saved.
  const canFinish = sets > 0 || isSetInProgress;
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
              {filteredSuggestions.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => {
                    onSelectMovement(s.key);
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
                  <Text style={{ color: "#ddd", fontSize: 12 }}>
                    {s.label}
                    {s.count > 1 ? <Text style={{ color: "#777" }}>{`  ·${s.count}`}</Text> : null}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Equipment for the picked movement; last used at this gym is preselected. */}
          {!isExerciseActive && variants && variants.length > 1 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {variants.map((v) => {
                const on = v.id === selectedVariantId;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => onSelectVariant?.(v.id)}
                    hitSlop={4}
                    style={({ pressed }) => ({
                      paddingVertical: 5,
                      paddingHorizontal: 11,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: on ? "#2E7D5A" : "#2a2a2a",
                      backgroundColor: on ? "rgba(46,125,90,0.18)" : "transparent",
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text style={{ color: on ? "#cfe9d4" : "#aaa", fontSize: 12, fontWeight: on ? "700" : "500" }}>
                      {v.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {!isExerciseActive && overlapHint ? (
            <Text style={{ color: "#FFC107", fontSize: 11, marginTop: 8, lineHeight: 16 }}>
              {overlapHint}
            </Text>
          ) : null}

          {exerciseName.trim() && !isExactMatch && filteredSuggestions.length === 0 ? (
            <Text
              style={{
                color: "#888",
                fontSize: 11,
                marginTop: 8,
                fontStyle: "italic",
              }}
            >
              New exercise — will be saved as typed
            </Text>
          ) : null}
        </View>

        {mode === "live" && exerciseName.trim() && lastTime ? (
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <View
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: "rgba(255, 193, 7, 0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 193, 7, 0.5)",
                }}
              >
                <Text style={{ color: "#FFC107", fontSize: 12, fontWeight: "500" }}>
                  Prev logged · {lastTime.sets}×{lastTime.reps} ·{" "}
                  {isLb ? `${kgToLb(lastTime.weightKg)}lb` : `${lastTime.weightKg}kg`}
                  {weightSuffix}
                  {lastTime.otherGym ? ` · @ ${lastTime.otherGym}` : ""}
                </Text>
              </View>

              {suggestion ? (() => {
                const onTarget =
                  reps === suggestion.reps &&
                  Math.abs(weightKg - suggestion.weightKg) < 0.05;
                const w =
                  suggestion.weightKg <= 0
                    ? "BW"
                    : (isLb
                        ? `${kgToLb(suggestion.weightKg)}lb`
                        : `${suggestion.weightKg}kg`) + weightSuffix;
                return (
                  <Pressable
                    disabled={onTarget || !onApplySuggestion}
                    onPress={onApplySuggestion}
                    hitSlop={4}
                    style={({ pressed }) => ({
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: onTarget ? "#1f7a4d" : "#3a5eff",
                      backgroundColor: onTarget
                        ? "rgba(0, 255, 150, 0.10)"
                        : "rgba(58, 94, 255, 0.14)",
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: onTarget ? "#4dffa6" : "#c9d4ff",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {onTarget
                        ? `🎯 On target · ${suggestion.reps}×${w}`
                        : `🎯 Try ${suggestion.reps}×${w} · tap`}
                    </Text>
                  </Pressable>
                );
              })() : null}
            </View>

            {suggestion ? (
              <Text style={{ color: "#888", fontSize: 11, marginTop: 4 }}>
                {suggestion.reason}
              </Text>
            ) : null}
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
              label={
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {(["kg", "lb"] as const).map((u) => {
                    const active = weightUnit === u;
                    return (
                      <Pressable
                        key={u}
                        onPress={() => {
                          if (!active) onWeightUnitChange(u);
                        }}
                        style={{
                          paddingVertical: 2,
                          paddingHorizontal: 8,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: active ? "#4CAF50" : "#222",
                          backgroundColor: active
                            ? "rgba(76,175,80,0.12)"
                            : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            color: active ? "#4CAF50" : "#777",
                            fontSize: 11,
                            fontWeight: active ? "700" : "500",
                            letterSpacing: 0.4,
                          }}
                        >
                          {u.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {weightSuffix ? (
                    <Text style={{ color: "#888", fontSize: 11, alignSelf: "center" }}>
                      per db
                    </Text>
                  ) : null}
                </View>
              }
              value={displayedWeight}
              onMinus={() => stepWeight(-1)}
              onPlus={() => stepWeight(1)}
              onCommit={(v) => {
                if (v < 0) return;
                onWeightCommit(isLb ? lbToKg(v) : v);
              }}
            />
          </View>
        </View>

        <View style={{ height: 12 }} />

        {isExerciseActive ? (
          <Pressable
            onPress={onSetButton}
            style={({ pressed }) => ({
              paddingVertical: 18,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              backgroundColor: isSetInProgress ? "#5a1a1a" : "#0f1f2e",
              borderColor: isSetInProgress ? "#7a2a2a" : "#1f4d7a",
              marginBottom: 12,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                color: isSetInProgress ? "#ff4d4f" : "#0099ff",
                fontSize: 17,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
              }}
            >
              {isSetInProgress
                ? `● Finish Set ${sets + 1} · ${Math.floor(setElapsedSeconds / 60)}:${(setElapsedSeconds % 60)
                    .toString()
                    .padStart(2, "0")}`
                : `▶ Start Set ${sets + 1}`}
            </Text>
          </Pressable>
        ) : null}

        {isExerciseActive && (sets > 0 || isSetInProgress) ? (
          // One sideways-scrolling row (never wraps); jumps to the newest set.
          <ScrollView
            ref={setStripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={() => setStripRef.current?.scrollToEnd({ animated: true })}
            style={{ marginBottom: 12 }}
            contentContainerStyle={{ alignItems: "flex-start", columnGap: 8 }}
          >
            {Array.from({ length: sets }).map((_, i) => {
              const isLast = i === sets - 1;

              const ChipWrapper = isLast ? Animated.View : View;
              const entry = setLog?.[i];
              const rest = restPeriods?.[i];
              // Rest after set i is only known once the next set has started.
              const showRest = rest != null && (i < sets - 1 || isSetInProgress);

              return (
                <SetColumn
                  key={i}
                  load={entry ? formatSetLoad(entry) : undefined}
                  rest={showRest ? rest : null}
                  chip={
                <ChipWrapper
                  style={[
                    {
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      backgroundColor: "rgba(0, 255, 150, 0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(0, 255, 150, 0.5)",
                    },
                    isLast && {
                      transform: [{ scale: lastChipScale }],
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: "#4dffa6",
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {formatSetLabel(i, entry)}
                  </Text>
                </ChipWrapper>
                  }
                />
              );
            })}

            {isSetInProgress ? (
              <SetColumn
                load={formatSetLoad({ reps, weightKg, weightUnit })}
                chip={
              <Animated.View
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: "rgba(0, 255, 153, 0.10)",
                  borderWidth: 1,
                  borderColor: setPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      "rgba(0, 255, 153, 0.4)",
                      "rgba(0, 255, 153, 0.95)",
                    ],
                  }),
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Animated.View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: "#00ff99",
                    opacity: setPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 1],
                    }),
                  }}
                />
                <Text
                  style={{
                    color: "#00ff99",
                    fontSize: 12,
                    fontWeight: "600",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  Set {sets + 1} · {Math.floor(setElapsedSeconds / 60)}:
                  {(setElapsedSeconds % 60).toString().padStart(2, "0")}
                </Text>
              </Animated.View>
                }
              />
            ) : null}
          </ScrollView>
        ) : null}

        {/* Collapsed with text: the button itself previews the note (one line),
            so it's obvious something was written and what. */}
        {!showNote && note.trim() ? (
          <Pressable
            onPress={() => setShowNote(true)}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              maxWidth: "100%",
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(255, 193, 7, 0.5)",
              backgroundColor: "rgba(255, 193, 7, 0.10)",
              marginBottom: 12,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 12 }}>📝 </Text>
            <Text
              numberOfLines={1}
              style={{ color: "#f5e6b8", fontSize: 12, flexShrink: 1 }}
            >
              {note.trim()}
            </Text>
            <Text style={{ color: "#a08a4a", fontSize: 12 }}>  · edit</Text>
          </Pressable>
        ) : (
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
              {showNote ? (note.trim() ? "Done" : "Hide note") : "Add note"}
            </Text>
          </Pressable>
        )}

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
            onPress={() => onSave()}
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
            disabled={!canFinish}
            delayLongPress={HOLD_MS}
            onPressIn={() => {
              holdProgress.setValue(0);
              Animated.timing(holdProgress, {
                toValue: 1,
                duration: HOLD_MS,
                useNativeDriver: false,
              }).start();
            }}
            onPressOut={() => {
              holdProgress.stopAnimation();
              holdProgress.setValue(0);
            }}
            onPress={() => {
              // Released before HOLD_MS: just explain.
              setHoldHint(true);
              if (holdHintTimer.current) clearTimeout(holdHintTimer.current);
              holdHintTimer.current = setTimeout(() => setHoldHint(false), 1500);
            }}
            onLongPress={finishExerciseNow}
            style={{
              alignSelf: "flex-end",
              marginTop: 10,
              minWidth: 200,
              overflow: "hidden",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: !canFinish ? "#2a2a2a" : "#444",
              backgroundColor: "#161616",
              paddingVertical: 10,
              paddingHorizontal: 14,
              alignItems: "center",
              opacity: !canFinish ? 0.5 : 1,
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: holdProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
                backgroundColor: "rgba(255,255,255,0.14)",
              }}
            />
            <Text
              style={{
                color: holdHint ? "#FFC107" : !canFinish ? "#777" : "#ddd",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {holdHint
                ? "Keep holding to finish"
                : isSetInProgress
                  ? `Hold · finish set ${sets + 1} & exercise`
                  : "Hold to finish exercise"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
