import { View, Text, Pressable, Alert } from "react-native";
import * as Sharing from "expo-sharing";
import { exportAllDataToFile } from "@/db/export";

export default function SettingsScreen() {
  async function onExport() {
    try {
      const path = await exportAllDataToFile();
      console.log("Exported data to:", path);
      Alert.alert("Export complete", `Backup saved to:\n${path}`);
    } catch (e) {
      Alert.alert("Export failed", String(e));
    }
  }

  async function onShare() {
    try {
      const path = await exportAllDataToFile();

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Sharing not available on this device");
        return;
      }

      await Sharing.shareAsync(path, {
        dialogTitle: "Share gym backup",
        mimeType: "application/json",
      });
    } catch (e) {
      Alert.alert("Share failed", String(e));
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, marginTop: 24, backgroundColor: "#000" }}>
      <Text style={{ color: "#fff", fontSize: 18, marginBottom: 16 }}>
        Settings
      </Text>

      <Pressable
        onPress={onExport}
        style={{
          backgroundColor: "#1DB954",
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#000", fontSize: 16 }}>
          Export workout data
        </Text>
      </Pressable>
      <View style={{ height: 12 }} />

      <Pressable
        onPress={onShare}
        style={{
          backgroundColor: "#444",
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>
          Share backup
        </Text>
      </Pressable>
    </View>
  );
}