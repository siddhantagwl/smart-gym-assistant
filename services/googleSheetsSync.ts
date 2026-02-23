import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllSessions } from "@/db/sessions";
import { getAllExercises } from "@/db/exercise";

const WEBHOOK_URL = process.env.EXPO_PUBLIC_GSHEETS_WEBHOOK_URL!;
const SHARED_SECRET = process.env.EXPO_PUBLIC_GSHEETS_SECRET!;

const LAST_SYNC_KEY = "last_google_sheets_sync";

export async function syncToGoogleSheets() {
  if (!WEBHOOK_URL || !SHARED_SECRET) {
    throw new Error("Google Sheets sync is not configured");
  }

  const sessions = getAllSessions();
  const exercises = getAllExercises();

  const payload = {
    secret: SHARED_SECRET,

    sessions: sessions.map((s) => ({
      id: s.id,
      start_time: s.startTime,
      end_time: s.endTime,
      duration_min: s.endTime
        ? Math.round(
            (new Date(s.endTime).getTime() -
              new Date(s.startTime).getTime()) / 60000
          )
        : "",
      sessionLabels: s.sessionLabels,
      source: s.source,
      note: s.note,
    })),

    exercises: exercises.map((e) => ({
      id: e.id,
      session_id: e.sessionId,
      created_at: e.createdAt,
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      weight_kg: e.weightKg,
      note: e.note,
    })),
  };

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.msg || "Sync failed");
  }

  await AsyncStorage.setItem(
    LAST_SYNC_KEY,
    new Date().toISOString()
  );

  return true;
}

export async function getLastGoogleSheetsSync(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}