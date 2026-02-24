function formatDateTime(ts: string) {
  const d = new Date(ts);

  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
import { View, Text, Pressable, Alert } from "react-native";
import { useEffect, useState } from "react";
import * as Sharing from "expo-sharing";
import { exportAllDataToFile } from "@/db/export";
import { syncToGoogleSheets, getLastGoogleSheetsSync } from "@/services/googleSheetsSync";
import { ScrollView } from "react-native";
import { getAllSessions } from "@/db/sessions";
import { getAllExercises } from "@/db/exercise";

export default function SettingsScreen() {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showExercises, setShowExercises] = useState(false);

  useEffect(() => {
    getLastGoogleSheetsSync().then(setLastSync);
  }, []);

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

  function showAllSessions() {
    const allSessions = JSON.stringify(getAllSessions(), null, 2);
    console.debug(allSessions);
    return allSessions
  }
  
  function showAllExercises() {
    const allExercises = JSON.stringify(getAllExercises(), null, 2);
    console.debug(allExercises);
    return allExercises
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
      <View style={{ height: 12 }} />

      <Pressable
        onPress={async () => {
          if (syncing) return;

          try {
            setSyncing(true);
            await syncToGoogleSheets();
            const ts = await getLastGoogleSheetsSync();
            setLastSync(ts);
            Alert.alert("Sync complete", "Data synced to Google Sheets");
          } catch (e) {
            Alert.alert("Sync failed", String(e));
          } finally {
            setSyncing(false);
          }
        }}
        style={({ pressed }) => ({
          backgroundColor: syncing ? "#1f5fa8" : "#2D8CFF",
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: "center",
          opacity: syncing ? 0.6 : pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>
          {syncing ? "Syncing…" : "Sync to Google Sheets"}
        </Text>
      </Pressable>
      {lastSync && (
        <Text
          style={{
            marginTop: 10,
            color: "rgba(255,255,255,0.6)",
            fontSize: 12,
          }}
        >
          Last synced at: {formatDateTime(lastSync)}
        </Text>
      )}

      <View style={{ height: 16 }} />

      <Pressable
        onPress={() => setShowDebug((v) => !v)}
        style={{
          backgroundColor: "#222",
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#333",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 14 }}>
          {showDebug ? "Hide Debug JSON" : "Show Debug JSON"}
        </Text>
      </Pressable>

      {showDebug && (
        <ScrollView
          style={{
            marginTop: 24,
            borderTopWidth: 1,
            borderTopColor: "#222",
            paddingTop: 16,
          }}
        >
          <Text style={{ color: "#ff4d4d", fontSize: 14, marginBottom: 12 }}>
            DEV DEBUG PANEL
          </Text>

          <Pressable
            onPress={() => setShowSessions((v) => !v)}
            style={{ marginBottom: 6 }}
          >
            <Text style={{ color: "#fff", fontSize: 12 }}>
              {showSessions ? "▼ Sessions" : "▶ Sessions"}
            </Text>
          </Pressable>

          {showSessions && (
            <Text style={{ color: "#aaa", fontSize: 11 }}>
              {showAllSessions()}
            </Text>
          )}

          <View style={{ height: 20 }} />

          <Pressable
            onPress={() => setShowExercises((v) => !v)}
            style={{ marginTop: 16, marginBottom: 6 }}
          >
            <Text style={{ color: "#fff", fontSize: 12 }}>
              {showExercises ? "▼ Exercises" : "▶ Exercises"}
            </Text>
          </Pressable>

          {showExercises && (
            <Text style={{ color: "#aaa", fontSize: 11 }}>
              {showAllExercises()}
            </Text>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}