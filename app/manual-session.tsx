import {
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { useRouter } from "expo-router";
import { insertManualSession } from "@/db/sessions";

const colors = {
  bg: "#0b0b0b",
  text: "#fff",
  sub: "#aaa",
  border: "#222",
  accent: "#3a5eff",
  success: "#22c55e",
};

export default function ManualSessionScreen() {
  const router = useRouter();
  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [workoutType, setWorkoutType] = useState<
    "push" | "pull" | "legs" | "other"
  >("push");
  const [note, setNote] = useState("");
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState("3");
  const [exReps, setExReps] = useState("10");
  const [exWeight, setExWeight] = useState("");
  const [exNote, setExNote] = useState("");
  const [exercises, setExercises] = useState<
    {
      id: string;
      name: string;
      sets: number;
      reps: number;
      weightKg: number;
      note?: string;
    }[]
  >([]);
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.text, fontSize: 22, marginBottom: 4 }}>
          Add session
        </Text>
        <Text style={{ color: colors.sub, fontSize: 14 }}>
          Manual log
        </Text>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.sub, marginBottom: 6 }}>
          Session date
        </Text>

        <Pressable
          onPress={() => setShowPicker(true)}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            padding: 12,
          }}
        >
          <Text style={{ color: colors.text }}>
            {date.toDateString()}
          </Text>
        </Pressable>
      </View>

      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: colors.sub, marginBottom: 8 }}>
          Workout type
        </Text>

        <View style={{ flexDirection: "row" }}>
          {["push", "pull", "legs", "other"].map((type) => {
            const selected = workoutType === type;

            return (
              <Pressable
                key={type}
                onPress={() => setWorkoutType(type as any)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? "rgba(58,94,255,0.15)" : "transparent",
                  marginRight: 8,
                }}
              >
                <Text
                  style={{
                    color: selected ? colors.accent : colors.sub,
                    fontSize: 14,
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: colors.sub, marginBottom: 6 }}>
          Session note (optional)
        </Text>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Anything to remember about this session"
          placeholderTextColor="#666"
          multiline
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            padding: 12,
            color: colors.text,
            minHeight: 40,
            textAlignVertical: "top",
          }}
        />
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: colors.text, fontSize: 18, marginBottom: 8 }}>
          Exercises
        </Text>

        {exercises.length === 0 ? (
          <Text style={{ color: colors.sub, marginBottom: 8 }}>
            No exercises added yet
          </Text>
        ) : (
          exercises.map((ex, idx) => (
            <View
              key={ex.id}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 10,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: colors.text }}>
                {idx + 1}. {ex.name}
              </Text>
              <Text style={{ color: colors.sub, fontSize: 12 }}>
                {ex.sets} × {ex.reps} @ {ex.weightKg} kg
              </Text>
              {ex.note ? (
                <Text style={{ color: colors.sub, fontSize: 12 }}>
                  Note: {ex.note}
                </Text>
              ) : null}
            </View>
          ))
        )}

        <Pressable
          onPress={() => setShowAddExercise(true)}
          style={{
            marginTop: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.accent,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ color: colors.accent }}>
            + Add exercise
          </Text>
        </Pressable>
        {showAddExercise && (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
              marginTop: 12,
            }}
          >
            <Text style={{ color: colors.sub, marginBottom: 6 }}>Exercise name</Text>
            <TextInput
              value={exName}
              onChangeText={setExName}
              placeholder="e.g. Bench press"
              placeholderTextColor="#666"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 6,
                padding: 10,
                color: colors.text,
                marginBottom: 10,
              }}
            />

            <View style={{ flexDirection: "row", marginBottom: 10 }}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={{ color: colors.sub, marginBottom: 4 }}>Sets</Text>
                <TextInput
                  value={exSets}
                  onChangeText={setExSets}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 6,
                    padding: 10,
                    color: colors.text,
                  }}
                />
              </View>

              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={{ color: colors.sub, marginBottom: 4 }}>Reps</Text>
                <TextInput
                  value={exReps}
                  onChangeText={setExReps}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 6,
                    padding: 10,
                    color: colors.text,
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.sub, marginBottom: 4 }}>Weight (kg)</Text>
                <TextInput
                  value={exWeight}
                  onChangeText={setExWeight}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 6,
                    padding: 10,
                    color: colors.text,
                  }}
                />
              </View>
            </View>

            <Text style={{ color: colors.sub, marginBottom: 4 }}>Note (optional)</Text>
            <TextInput
              value={exNote}
              onChangeText={setExNote}
              placeholder="Optional"
              placeholderTextColor="#666"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 6,
                padding: 10,
                color: colors.text,
                marginBottom: 12,
              }}
            />

            <View style={{ flexDirection: "row" }}>
              <Pressable
                onPress={() => {
                  if (!exName.trim()) return;
                  setExercises((prev) => [
                    ...prev,
                    {
                      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                      name: exName.trim(),
                      sets: Number(exSets) || 0,
                      reps: Number(exReps) || 0,
                      weightKg: Number(exWeight) || 0,
                      note: exNote.trim() || undefined,
                    },
                  ]);
                  setExName("");
                  setExSets("3");
                  setExReps("10");
                  setExWeight("");
                  setExNote("");
                  setShowAddExercise(false);
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: colors.accent,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: colors.accent }}>Save</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowAddExercise(false)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Pressable
          onPress={() => {
            if (exercises.length === 0) {
              router.back();
              return;
            }

            Alert.alert(
              "Discard session?",
              "You have added exercises. This will discard the session.",
              [
                { text: "Keep editing", style: "cancel" },
                {
                  text: "Discard",
                  style: "destructive",
                  onPress: () => router.back(),
                },
              ]
            );
          }}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text }}>
            Cancel
          </Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          disabled={exercises.length === 0}
          onPress={() => {
            try {
              insertManualSession({
                date,
                workoutType,
                note,
                exercises,
              });

              setShowSuccess(true);
              setTimeout(() => {
                router.back();
              }, 1500);
            } catch (e) {
              setShowSuccess(false);
            }
          }}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderRadius: 10,
            backgroundColor:
              exercises.length === 0 ? colors.border : colors.success,
            opacity: exercises.length === 0 ? 0.4 : 1,
          }}
        >
          <Text style={{ color: "#000", fontSize: 16, fontWeight: "600" }}>
            Save
          </Text>
        </Pressable>
      </View>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="calendar"
          onChange={(_, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      </ScrollView>

      {showSuccess && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: colors.bg,
              borderRadius: 16,
              paddingVertical: 20,
              paddingHorizontal: 28,
              borderWidth: 1,
              borderColor: colors.success,
            }}
          >
            <Text style={{ color: colors.success, fontSize: 18, fontWeight: "600" }}>
              ✓ Session saved
            </Text>
          </View>
        </View>
      )}

    </KeyboardAvoidingView>
  );
}