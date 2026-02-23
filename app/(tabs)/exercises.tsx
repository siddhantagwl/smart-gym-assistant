import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, SectionList, Pressable, Linking, Animated } from "react-native";
import { getAllLibraryExercises, ExerciseLibraryItem } from "../../db/exerciseLibrary";

const colors = {
  bg: "#000",
  card: "#111",
  text: "#fff",
  sub: "#888",
  border: "#222",
};

export default function ExercisesScreen() {
  console.debug("Rendering ExercisesScreen");
  const [query, setQuery] = useState("");
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const clearAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const data = getAllLibraryExercises();
    setExercises(data);
  }, []);

  useEffect(() => {
    Animated.timing(clearAnim, {
      toValue: query.length > 0 ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [query]);

  // searching happens here - filter, sort, and group exercises into sections
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = q
      ? exercises.filter((e) =>
          e.name.toLowerCase().includes(q) ||
          e.primaryMuscle.toLowerCase().includes(q) ||
          e.tags.some(tag => tag.toLowerCase().includes(q))
        )
      : exercises;

    const sorted = [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const map: Record<string, ExerciseLibraryItem[]> = {};

    sorted.forEach((ex) => {
      const letter = ex.name[0].toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(ex);
    });

    return Object.keys(map)
      .sort()
      .map((letter) => ({
        title: letter,
        data: map[letter],
      }));
  }, [query, exercises]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, marginTop: 32 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
        Exercises
      </Text>

      <View style={{ position: "relative", marginBottom: 12 }}>
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
            paddingRight: 36,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />

        <Animated.View
          pointerEvents={query.length > 0 ? "auto" : "none"}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: [
              { translateY: -10 },
              {
                scale: clearAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
            opacity: clearAnim,
          }}
        >
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: "#ff5c5c", fontSize: 16, fontWeight: "600" }}>
              ✕
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      <SectionList
        sections={sections}
        stickySectionHeadersEnabled
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <Text
            style={{
              color: "#aaa",
              fontSize: 14,
              fontWeight: "600",
              marginTop: 16,
              marginBottom: 6,
            }}
          >
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              marginLeft: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 17 }}>
                  {item.name}
                </Text>

                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: "#2ecc71",
                      backgroundColor: "rgba(46,204,113,0.15)",
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      marginRight: 6,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ color: "#7bed9f", fontSize: 11, fontWeight: "500" }}>
                      {item.primaryMuscle}
                    </Text>
                  </View>

                  {item.tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        borderWidth: 1,
                        borderColor: "#333",
                        backgroundColor: "rgba(255,255,255,0.04)",
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        marginRight: 6,
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ color: "#aaa", fontSize: 11 }}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {item.videoUrl ? (
                <Pressable
                  onPress={() => Linking.openURL(item.videoUrl)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#3a5eff",
                      backgroundColor: "rgba(58,94,255,0.12)",
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: "#9bb0ff", fontSize: 11, fontWeight: "500" }}>
                      ▶ video ↗
                    </Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
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