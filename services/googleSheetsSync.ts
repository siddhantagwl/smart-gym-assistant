import { getAllExercises, insertExerciseRaw } from "@/db/exercises";
import { replaceExerciseLibrary } from "@/db/exerciseLibrary";
import { wipeDatabase } from "@/db/schema";
import { getAllSessions, insertSessionRaw } from "@/db/sessions";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WEBHOOK_URL = process.env.EXPO_PUBLIC_GSHEETS_WEBHOOK_URL!;
const SHARED_SECRET = process.env.EXPO_PUBLIC_GSHEETS_SECRET!;

const LAST_SYNC_KEY = "last_google_sheets_sync";
const LAST_LIBRARY_SYNC_KEY = "last_exercise_library_sync";

// `EXPO_PUBLIC_*` vars are inlined at JS-bundle time. If they're absent at
// build time (.env missing, EAS env not set), they ship as undefined and
// every sync silently fails. Use this from the UI to surface the problem.
export function isSyncConfigured(): boolean {
  return Boolean(WEBHOOK_URL && SHARED_SECRET);
}

export async function syncToGoogleSheets() {
  if (!WEBHOOK_URL || !SHARED_SECRET) {
    throw new Error("Google Sheets sync is not configured");
  }

  const sessions = getAllSessions();
  const exercises = getAllExercises();

  const payload = {
    secret: SHARED_SECRET,
    debug: false,

    sessions: sessions.map((s) => ({
      id: s.id,
      start_time: s.startTime,
      end_time: s.endTime,
      session_labels: s.sessionLabels ?? [],
      source: s.source,
      note: s.note,
    })),

    exercises: exercises.map((e) => ({
      id: e.id,
      session_id: e.sessionId,
      exercise_library_id: (e as any).exerciseLibraryId ?? "",
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
  // console.log("GSHEETS RESPONSE:", JSON.stringify(json, null, 2));
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

// Pull the exercise library from the Sheet (?type=library) and full-replace
// the local exercise_library table. Sheet is authoritative.
export async function syncExerciseLibrary(): Promise<number> {
  if (!WEBHOOK_URL || !SHARED_SECRET) {
    throw new Error("Google Sheets sync is not configured");
  }

  const res = await fetch(WEBHOOK_URL + "?type=library");
  const text = await res.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    // Apps Script returns HTML on auth/deploy errors; surface the first chunk.
    throw new Error(`Non-JSON response (status ${res.status}): ${text.slice(0, 200)}`);
  }

  if (!json.ok || !Array.isArray(json.exerciseLib)) {
    throw new Error(json.msg || "Library sync failed");
  }

  replaceExerciseLibrary(json.exerciseLib);

  await AsyncStorage.setItem(LAST_LIBRARY_SYNC_KEY, new Date().toISOString());
  return json.exerciseLib.length;
}

export async function getLastExerciseLibrarySync(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_LIBRARY_SYNC_KEY);
}