import { getAllExercises, insertExerciseRaw } from "@/db/exercises";
import { wipeDatabase } from "@/db/schema";
import { getAllSessions, insertSessionRaw } from "@/db/sessions";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
            (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) /
              60000,
          )
        : "",
      sessionLabels: s.sessionLabels,
      source: s.source,
      note: s.note,
    })),

    exercises: exercises.map((e) => ({
      id: e.id,
      session_id: e.sessionId,
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      weight_kg: e.weightKg,
      rest_seconds: e.restSeconds ?? 0,
      start_time: e.startTime,
      end_time: e.endTime,
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

  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

  return true;
}

export async function getLastGoogleSheetsSync(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}

export async function restoreFromGoogleSheets() {
  const res = await fetch(WEBHOOK_URL);
  const data = await res.json();

  const { sessions, exercises } = data;

  wipeDatabase();

  sessions.forEach((s: any) => insertSessionRaw(s));
  exercises.forEach((e: any) => insertExerciseRaw(e));
}