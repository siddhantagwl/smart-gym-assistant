import { View, Text, Pressable } from "react-native";

type AddExerciseProps = {
  titleColor: string;
  accentColor: string;

  workoutLabel: string;
  suggestions: string[];

  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;

  onSelectExercise: (name: string) => void;

  onSetsMinus: () => void;
  onSetsPlus: () => void;

  onRepsMinus: () => void;
  onRepsPlus: () => void;

  onWeightMinus: () => void;
  onWeightPlus: () => void;

  onSave: () => void;
};

export default function AddExercise({
  titleColor,
  accentColor,
  workoutLabel,
  suggestions,
  exerciseName,
  sets,
  reps,
  weightKg,
  onSelectExercise,
  onSetsMinus,
  onSetsPlus,
  onRepsMinus,
  onRepsPlus,
  onWeightMinus,
  onWeightPlus,
  onSave,
}: AddExerciseProps) {
  return (
    <View style={{ marginBottom: 16, width: "100%", paddingHorizontal: 24 }}>
      <Text style={{ color: titleColor, marginBottom: 6 }}>Add exercise</Text>

      <Text style={{ color: "#aaa", marginBottom: 10 }}>
        Workout: {workoutLabel}
      </Text>

      <Text style={{ color: "#aaa", marginBottom: 8 }}>
        Selected: {exerciseName || "None"}
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {suggestions.map((name) => (
          <Pressable
            key={name}
            onPress={() => onSelectExercise(name)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 6,
              backgroundColor: exerciseName === name ? accentColor : "#222",
            }}
          >
            <Text style={{ color: exerciseName === name ? "#000" : "#fff" }}>
              {name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ color: "#aaa", marginBottom: 8 }}>
        Sets: {sets}   Reps: {reps}   Weight: {weightKg} kg
      </Text>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <Pressable
          onPress={onSetsMinus}
          style={{
            flex: 1,
            backgroundColor: "#222",
            paddingVertical: 10,
            borderRadius: 6,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff" }}>Sets -</Text>
        </Pressable>
        <Pressable
          onPress={onSetsPlus}
          style={{
            flex: 1,
            backgroundColor: "#222",
            paddingVertical: 10,
            borderRadius: 6,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff" }}>Sets +</Text>
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <Pressable
          onPress={onRepsMinus}
          style={{
            flex: 1,
            backgroundColor: "#222",
            paddingVertical: 10,
            borderRadius: 6,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff" }}>Reps -</Text>
        </Pressable>
        <Pressable
          onPress={onRepsPlus}
          style={{
            flex: 1,
            backgroundColor: "#222",
            paddingVertical: 10,
            borderRadius: 6,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff" }}>Reps +</Text>
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <Pressable
          onPress={onWeightMinus}
          style={{
            flex: 1,
            backgroundColor: "#222",
            paddingVertical: 10,
            borderRadius: 6,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff" }}>Kg -</Text>
        </Pressable>
        <Pressable
          onPress={onWeightPlus}
          style={{
            flex: 1,
            backgroundColor: "#222",
            paddingVertical: 10,
            borderRadius: 6,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff" }}>Kg +</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={onSave}
        style={{
          backgroundColor: accentColor,
          paddingVertical: 10,
          borderRadius: 6,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#000" }}>Save Exercise</Text>
      </Pressable>
    </View>
  );
}
