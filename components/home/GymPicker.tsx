// 📍 pill above Start session. Tap → bottom sheet with your gyms (most
// recent first), "＋ New gym", and "Not set".
import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

import { getKnownGyms } from "@/db/sessions";

export default function GymPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (gym: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [gyms, setGyms] = useState<string[]>([]);

  function openSheet() {
    const known = getKnownGyms();
    setGyms(value && !known.includes(value) ? [value, ...known] : known);
    setAdding(false);
    setDraft("");
    setOpen(true);
  }

  function pick(gym: string) {
    onChange(gym.trim());
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={openSheet}
        hitSlop={6}
        style={({ pressed }) => ({
          alignSelf: "center",
          maxWidth: "100%",
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#333",
          backgroundColor: "#141414",
          marginBottom: 10,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          numberOfLines={1}
          style={{ color: value ? "#ddd" : "#888", fontSize: 13, fontWeight: "600", flexShrink: 1 }}
        >
          📍 {value || "Pick gym"}
        </Text>
        <Text style={{ color: "#888", fontSize: 12, marginLeft: 6 }}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: "#111",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderWidth: 1,
              borderColor: "#222",
              paddingHorizontal: 18,
              paddingTop: 10,
              paddingBottom: 28,
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#333",
                marginBottom: 12,
              }}
            />
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 10 }}>
              Which gym?
            </Text>

            {gyms.map((g) => (
              <Pressable
                key={g}
                onPress={() => pick(g)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#1e1e1e",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: "#eee", fontSize: 15 }}>📍 {g}</Text>
                {g === value ? <Text style={{ color: "#4CAF50", fontSize: 15 }}>✓</Text> : null}
              </Pressable>
            ))}

            {adding ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Gym name"
                  placeholderTextColor="#666"
                  autoFocus
                  onSubmitEditing={() => draft.trim() && pick(draft)}
                  style={{
                    flex: 1,
                    backgroundColor: "#0f0f0f",
                    borderWidth: 1,
                    borderColor: "#333",
                    borderRadius: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    color: "#fff",
                    fontSize: 15,
                  }}
                />
                <Pressable
                  disabled={!draft.trim()}
                  onPress={() => pick(draft)}
                  style={{
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    justifyContent: "center",
                    backgroundColor: draft.trim() ? "#0f2e1f" : "#1a1a1a",
                    borderWidth: 1,
                    borderColor: draft.trim() ? "#1f7a4d" : "#333",
                  }}
                >
                  <Text style={{ color: draft.trim() ? "#00ff99" : "#666", fontWeight: "700" }}>Add</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setAdding(true)} style={{ paddingVertical: 12 }}>
                <Text style={{ color: "#7bc47f", fontSize: 15, fontWeight: "600" }}>＋ New gym</Text>
              </Pressable>
            )}

            {value ? (
              <Pressable onPress={() => pick("")} style={{ paddingVertical: 10 }}>
                <Text style={{ color: "#888", fontSize: 13 }}>Not set</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
