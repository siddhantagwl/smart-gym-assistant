// 📍 pill above Start session. Tap → bottom sheet with your gyms (history,
// most recent first, then saved ones), "＋ New gym", and "Not set".
// Long-press a gym you haven't trained at yet to remove it.
import { ReactNode, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import BottomSheet from "@/components/ui/BottomSheet";

import { addSavedGym, loadGymList, removeSavedGym } from "@/services/gymPreference";

export default function GymPicker({
  value,
  onChange,
  renderTrigger,
}: {
  value: string;
  onChange: (gym: string) => void;
  // Custom trigger (e.g. the "at EVO fitness · change" line inside the Start
  // button); defaults to the 📍 pill.
  renderTrigger?: (openSheet: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [gyms, setGyms] = useState<{ gym: string; usedInHistory: boolean }[]>([]);

  async function refresh() {
    // A gym selected before the saved list existed gets saved now so it shows.
    if (value) await addSavedGym(value);
    setGyms(await loadGymList());
  }

  function openSheet() {
    setAdding(false);
    setDraft("");
    setOpen(true);
    refresh();
  }

  function pick(gym: string) {
    onChange(gym.trim());
    setOpen(false);
  }

  // Saves the gym to the list (so it stays even if you pick another one now)
  // and selects it.
  async function addAndPick() {
    const name = await addSavedGym(draft);
    if (name) pick(name);
  }

  function confirmRemove(gym: string, usedInHistory: boolean) {
    if (usedInHistory) {
      Alert.alert(gym, "You've trained here, so it stays in the list (your history uses it).");
      return;
    }
    Alert.alert(`Remove ${gym}?`, "It's only removed from this list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeSavedGym(gym);
          if (gym === value) onChange("");
          refresh();
        },
      },
    ]);
  }

  return (
    <>
      {renderTrigger ? (
        renderTrigger(openSheet)
      ) : (
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
      )}

      {/* Typing a new gym moves the sheet to the top, clear of the keyboard. */}
      <BottomSheet visible={open} onClose={() => setOpen(false)} raised={adding}>
        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 10 }}>
          Which gym?
        </Text>

        {gyms.map(({ gym: g, usedInHistory }) => (
          <Pressable
            key={g}
            onPress={() => pick(g)}
            onLongPress={() => confirmRemove(g, usedInHistory)}
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

        {gyms.some((g) => !g.usedInHistory) ? (
          <Text style={{ color: "#888", fontSize: 12, marginTop: 6 }}>
            Long-press a gym you haven&apos;t trained at to remove it
          </Text>
        ) : null}

        {adding ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Gym name"
              placeholderTextColor="#808080"
              autoFocus
              onSubmitEditing={() => draft.trim() && addAndPick()}
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
              onPress={addAndPick}
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
      </BottomSheet>
    </>
  );
}
