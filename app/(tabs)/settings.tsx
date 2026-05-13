import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";

import { getAllExercises } from "@/db/exercises";
import { getLoggedExercisesNotInLibrary } from "@/db/exerciseLibrary";
import { exportAllDataToFile } from "@/db/export";
import { getAllSessions } from "@/db/sessions";
import {
  getLastGoogleSheetsSync,
  syncToGoogleSheets,
  restoreFromGoogleSheets,
  syncExerciseLibrary,
  getLastExerciseLibrarySync,
  isSyncConfigured,
  getSpreadsheetUrl,
} from "@/services/googleSheetsSync";

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

export default function SettingsScreen() {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showExercises, setShowExercises] = useState(false);
  const [lastLibrarySync, setLastLibrarySync] = useState<string | null>(null);
  const [librarySyncing, setLibrarySyncing] = useState(false);
  const [unsyncedNames, setUnsyncedNames] = useState<
    { name: string; count: number; lastLogged: string }[]
  >([]);

  useFocusEffect(
    useCallback(() => {
      getLastGoogleSheetsSync().then(setLastSync);
      getLastExerciseLibrarySync().then(setLastLibrarySync);
      setUnsyncedNames(getLoggedExercisesNotInLibrary());
    }, [])
  );

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

  async function onRestore() {
    if (restoring) return;

    Alert.alert(
      "Restore workout history",
      "This wipes local sessions and exercises and re-imports them from Google Sheets. Your exercise library is not affected. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            try {
              setRestoring(true);
              await restoreFromGoogleSheets();
              Alert.alert("Restore complete", "Database restored successfully.");
            } catch (e) {
              Alert.alert("Restore failed", String(e));
            } finally {
              setRestoring(false);
            }
          },
        },
      ]
    );
  }

  const sessions = getAllSessions();
  const exercises = getAllExercises();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={{ flex: 1, padding: 24 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 18 }}>Settings</Text>
        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 15 }}>
          v{Constants.expoConfig?.version ?? "—"}
        </Text>
      </View>

      {!isSyncConfigured() && (
        <View
          style={{
            backgroundColor: "rgba(229, 57, 53, 0.15)",
            borderColor: "#e53935",
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#ff8a80", fontSize: 13, fontWeight: "600" }}>
            Sync not configured
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 12,
              marginTop: 4,
              lineHeight: 16,
            }}
          >
            EXPO_PUBLIC_GSHEETS_WEBHOOK_URL or EXPO_PUBLIC_GSHEETS_SECRET is
            missing from this build. Sheets sync, restore, and library sync
            will all fail. Set both vars in .env (local builds) or via EAS
            env (cloud builds), then rebuild.
          </Text>
        </View>
      )}

      <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 8 }}>
        Local backup
      </Text>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <Pressable
          onPress={onExport}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: "#1DB954",
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: "center",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: "#000", fontSize: 13, fontWeight: "600" }}>
            Export
          </Text>
          <Text style={{ color: "rgba(0,0,0,0.6)", fontSize: 10, marginTop: 2 }}>
            save JSON
          </Text>
        </Pressable>

        <Pressable
          onPress={onShare}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: "#444",
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: "center",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
            Share
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 2 }}>
            send backup
          </Text>
        </Pressable>
      </View>

      <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 8 }}>
        Google Sheets
      </Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={async () => {
            if (syncing) return;

            try {
              setSyncing(true);
              await syncToGoogleSheets();
              const ts = await getLastGoogleSheetsSync();
              setLastSync(ts);
              Alert.alert("Sync complete", "Workout history synced to Google Sheets.");
            } catch (e) {
              Alert.alert("Sync failed", String(e));
            } finally {
              setSyncing(false);
            }
          }}
          disabled={syncing}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: syncing ? "#1f5fa8" : "#2D8CFF",
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: "center",
            opacity: syncing ? 0.6 : pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
            {syncing ? "Pushing…" : "Push history"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 2 }}>
            ↑ to Sheets
          </Text>
        </Pressable>

        <Pressable
          onPress={onRestore}
          disabled={restoring}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: restoring ? "#4a1a1a" : "#8B1E1E",
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: "center",
            opacity: restoring ? 0.6 : pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
            {restoring ? "Restoring…" : "Restore history"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 2 }}>
            ↓ from Sheets
          </Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            if (librarySyncing) return;

            try {
              setLibrarySyncing(true);
              const count = await syncExerciseLibrary();
              const ts = await getLastExerciseLibrarySync();
              setLastLibrarySync(ts);
              setUnsyncedNames(getLoggedExercisesNotInLibrary());
              Alert.alert("Library synced", `${count} exercises in library.`);
            } catch (e) {
              Alert.alert("Library sync failed", String(e));
            } finally {
              setLibrarySyncing(false);
            }
          }}
          disabled={librarySyncing}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: librarySyncing ? "#3a3a3a" : "#5a5a5a",
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: "center",
            opacity: librarySyncing ? 0.6 : pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
            {librarySyncing ? "Syncing…" : "Pull library"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 2 }}>
            ↓ from Sheets
          </Text>
        </Pressable>
      </View>

      {(lastSync || lastLibrarySync) && (
        <View style={{ marginTop: 10 }}>
          {lastSync && (
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              History last pushed: {formatDateTime(lastSync)}
            </Text>
          )}
          {lastLibrarySync && (
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 }}>
              Library last pulled: {formatDateTime(lastLibrarySync)}
            </Text>
          )}
        </View>
      )}

      {getSpreadsheetUrl() && (
        <Pressable
          onPress={() => Linking.openURL(getSpreadsheetUrl()!)}
          style={{ marginTop: 10, alignSelf: "flex-start" }}
        >
          <Text style={{ color: "#4da6ff", fontSize: 12 }}>
            Open spreadsheet ↗
          </Text>
        </Pressable>
      )}

      {unsyncedNames.length > 0 && (
        <View
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#333",
            backgroundColor: "#0d0d0d",
          }}
        >
          <Text style={{ color: "#FFC107", fontSize: 13, marginBottom: 6 }}>
            Logged but not in library ({unsyncedNames.length})
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              marginBottom: 8,
            }}
          >
            Add these to your Google Sheet&apos;s library tab, then sync.
          </Text>
          {unsyncedNames.map((u) => (
            <Text
              key={u.name}
              style={{
                color: "#ddd",
                fontSize: 12,
                paddingVertical: 2,
              }}
            >
              · {u.name} ({u.count}×)
            </Text>
          ))}
        </View>
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
              {showSessions ? "▼ Sessions" : "▶ Sessions"} ({sessions.length})
            </Text>
          </Pressable>

          {showSessions && (
            <Text style={{ color: "#aaa", fontSize: 11 }}>
              {JSON.stringify(sessions, null, 2)}
            </Text>
          )}

          <View style={{ height: 20 }} />

          <Pressable
            onPress={() => setShowExercises((v) => !v)}
            style={{ marginTop: 16, marginBottom: 6 }}
          >
            <Text style={{ color: "#fff", fontSize: 12 }}>
              {showExercises ? "▼ Exercises" : "▶ Exercises"} ({exercises.length})
            </Text>
          </Pressable>

          {showExercises && (
            <Text style={{ color: "#aaa", fontSize: 11 }}>
              {JSON.stringify(exercises, null, 2)}
            </Text>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <View style={{ marginTop: 24, alignItems: "center" }}>
        <Text
          style={{
            color: "rgba(255,255,255,0.3)",
            fontSize: 11,
            textAlign: "center",
            lineHeight: 16,
            maxWidth: 280,
          }}
        >
          {"Sadhana ("}
          <Text
            style={{
              backgroundColor: "rgba(255,153,51,0.18)",
              color: "rgba(255,200,140,0.9)",
            }}
          >
            {"साधना"}
          </Text>
          {") — Sanskrit for daily, disciplined practice."}
        </Text>
      </View>
      </View>
    </SafeAreaView>
  );
}
