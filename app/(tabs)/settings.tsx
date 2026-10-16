import { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import Constants from "expo-constants";
import { useToast } from "@/components/ui/Toast";
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
import { restNotificationsEnabled } from "@/services/notifications";

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
  // Confirmations fade in at the bottom; errors still use Alert.
  const toast = useToast();
  const [showSessions, setShowSessions] = useState(false);
  const [showExercises, setShowExercises] = useState(false);
  const [lastLibrarySync, setLastLibrarySync] = useState<string | null>(null);
  const [librarySyncing, setLibrarySyncing] = useState(false);
  const [unsyncedNames, setUnsyncedNames] = useState<
    { name: string; count: number; lastLogged: string }[]
  >([]);

  const [notificationsOn, setNotificationsOn] = useState(true);

  // Also re-check when coming back from the system settings screen (that
  // returns to the app, not to this tab, so focus doesn't fire).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") restNotificationsEnabled().then(setNotificationsOn);
    });
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      restNotificationsEnabled().then(setNotificationsOn);
      getLastGoogleSheetsSync().then(setLastSync);
      getLastExerciseLibrarySync().then(setLastLibrarySync);
      setUnsyncedNames(getLoggedExercisesNotInLibrary());
    }, [])
  );

  async function onExport() {
    try {
      const path = await exportAllDataToFile();
      console.log("Exported data to:", path);
      toast.show(`Backup saved · ${path.split("/").pop()}`);
    } catch (e) {
      Alert.alert("Export failed", String(e));
    }
  }

  async function onShare() {
    try {
      const path = await exportAllDataToFile();

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        toast.show("Sharing isn't available on this device");
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
      "Adds sessions and exercises from Google Sheets that aren't on this phone, and copies gyms filled in the Sheet onto your sessions. Nothing on the phone is deleted. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            try {
              setRestoring(true);
              const r = await restoreFromGoogleSheets();
              toast.show(
                `Restored · +${r.newSessions} sessions, +${r.newExercises} exercises · ` +
                  `gym set on ${r.gymsUpdated} session${r.gymsUpdated === 1 ? "" : "s"}`,
              );
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

  // sessions are sorted start_time DESC, so [0] is the newest workout.
  const newestActivity = sessions[0]?.startTime ?? null;
  const hasUnpushed =
    newestActivity !== null &&
    (!lastSync || new Date(newestActivity) > new Date(lastSync));

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
        {/* Long-press the version to show/hide the debug JSON (dev tool). */}
        <Pressable
          onLongPress={() => setShowDebug((v) => !v)}
          delayLongPress={600}
          style={{
            paddingVertical: 3,
            paddingHorizontal: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(76,175,80,0.5)",
            backgroundColor: "rgba(76,175,80,0.12)",
          }}
        >
          <Text style={{ color: "#7bc47f", fontSize: 14, fontWeight: "600" }}>
            v{Constants.expoConfig?.version ?? "—"}
          </Text>
        </Pressable>
      </View>

      {!notificationsOn && (
        <Pressable
          onPress={() => Linking.openSettings()}
          style={{
            backgroundColor: "rgba(229, 57, 53, 0.15)",
            borderColor: "#e53935",
            borderWidth: 1,
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
            marginBottom: 16,
          }}
        >
          <Text numberOfLines={1} style={{ color: "#ff8a80", fontSize: 13, fontWeight: "600" }}>
            🔕 Rest notifications off · Open settings ›
          </Text>
        </Pressable>
      )}

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
          <Text style={{ color: "rgba(0,0,0,0.6)", fontSize: 12, marginTop: 2 }}>
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
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 }}>
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
            if (syncing || !hasUnpushed) return;

            try {
              setSyncing(true);
              await syncToGoogleSheets();
              const ts = await getLastGoogleSheetsSync();
              setLastSync(ts);
              toast.show("History pushed to Google Sheets");
            } catch (e) {
              Alert.alert("Sync failed", String(e));
            } finally {
              setSyncing(false);
            }
          }}
          disabled={syncing || !hasUnpushed}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: syncing
              ? "#1f5fa8"
              : hasUnpushed
                ? "#2D8CFF"
                : "#1a2a3a",
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: "center",
            borderWidth: 1,
            borderColor: hasUnpushed ? "#2D8CFF" : "#2a3a4a",
            opacity: syncing ? 0.6 : hasUnpushed ? (pressed ? 0.85 : 1) : 0.55,
          })}
        >
          <Text
            style={{
              color: hasUnpushed ? "#fff" : "rgba(255,255,255,0.6)",
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {syncing ? "Pushing…" : "Push history"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 }}>
            {syncing ? "↑ to Sheets" : hasUnpushed ? "↑ to Sheets" : "up to date"}
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
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 }}>
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
              toast.show(`Library pulled · ${count} exercises`);
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
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 }}>
            ↓ from Sheets
          </Text>
        </Pressable>
      </View>

      {(lastSync || lastLibrarySync) && (
        <View style={{ marginTop: 10 }}>
          {lastSync && (
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
              History last pushed: {formatDateTime(lastSync)}
            </Text>
          )}
          {lastLibrarySync && (
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>
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
              fontSize: 12,
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
            <Text style={{ color: "#aaa", fontSize: 12 }}>
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
            <Text style={{ color: "#aaa", fontSize: 12 }}>
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
            fontSize: 12,
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
      {toast.element}
    </SafeAreaView>
  );
}
