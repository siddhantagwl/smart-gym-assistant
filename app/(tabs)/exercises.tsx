import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import { getAllExercises, ExerciseLibraryItem } from "../../db/exerciseLibrary";

const colors = {
  bg: "#000",
  card: "#111",
  text: "#fff",
  sub: "#888",
  border: "#222",
};

export default function ExercisesScreen() {
  const [query, setQuery] = useState("");
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);

  useEffect(() => {
    const data = getAllExercises();
    setExercises(data);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;

    return exercises.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.primaryMuscle.toLowerCase().includes(q) ||
      e.tags.toLowerCase().includes(q)
    );
  }, [query, exercises]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, marginTop: 32 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
        Exercises
      </Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search exercises"
        placeholderTextColor="#666"
        style={{
          backgroundColor: colors.card,
          color: colors.text,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 12,
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 16 }}>
              {item.name}
            </Text>
            <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
              {item.primaryMuscle} · {item.tags}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: colors.sub, marginTop: 24, textAlign: "center" }}>
            No exercises found
          </Text>
        }
      />
    </View>
  );
}