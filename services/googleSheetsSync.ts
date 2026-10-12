import { db } from "@/db/database";
import { getAllExercises, getExerciseIds, insertExerciseRaw } from "@/db/exercises";
import { replaceExerciseLibrary } from "@/db/exerciseLibrary";
import {
  getAllSessions,
  getSessionIds,
  insertSessionRaw,
  setSessionGym,
} from "@/db/sessions";
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

// Optional: direct URL of the user's spreadsheet for quick browser access.
// Independent of sync config — sync works without it; this is just a UI link.
export function getSpreadsheetUrl(): string | null {
  return process.env.EXPO_PUBLIC_GSHEETS_SPREADSHEET_URL || null;
}

export async function syncToGoogleSheets() {
  if (!WEBHOOK_URL || !SHARED_SECRET) {
    throw new Error("Google Sheets sync is not configured");
  }

  // Oldest first: the Apps Script appends rows in the order received, so this
  // keeps the Sheet in date order. (getAllSessions() is newest-first for the UI.)
  const sessions = [...getAllSessions()].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
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
      // Stored by header in the Sheet (apps-script/Code.gs, EXTRA_SESSION_FIELDS).
      gym: s.gym ?? "",
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
      weight_unit: e.weightUnit,
      rest_seconds: e.restSeconds ?? 0,
      // Stored only if the Sheet's exercises tab has a "rest_periods" column.
      rest_periods: JSON.stringify(e.restPeriods ?? []),
      // Likewise needs a "set_log" column header in the Sheet.
      set_log: JSON.stringify(e.setLog ?? []),
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

// "Restore history" — a non-destructive merge from the Sheet (it used to wipe
// the phone and re-import, which lost anything the Sheet didn't have, e.g.
// per-set logs pushed before the script stored them):
// - sessions / exercises in the Sheet but not on the phone are added (by id),
//   so a new or reset phone still gets everything;
// - a gym filled in the Sheet is copied onto the matching session (Sheet wins,
//   so gyms can be filled in / corrected there);
// - nothing on the phone is deleted, and existing rows aren't otherwise changed.
export async function restoreFromGoogleSheets(): Promise<{
  newSessions: number;
  newExercises: number;
  gymsUpdated: number; // sessions whose gym was set/changed (not distinct gyms)
}> {
  const res = await fetch(WEBHOOK_URL);
  const data = await res.json();

  const { sessions, exercises } = data;
  if (!Array.isArray(sessions) || !Array.isArray(exercises)) {
    throw new Error("Unexpected response from Google Sheets");
  }

  const sessionIds = getSessionIds();
  const exerciseIds = getExerciseIds();
  let newSessions = 0;
  let newExercises = 0;
  let gymsUpdated = 0;

  db.execSync("BEGIN;");
  try {
    sessions.forEach((s: any) => {
      const id = String(s.id ?? "").trim();
      if (!id) return;
      if (!sessionIds.has(id)) {
        insertSessionRaw(s);
        sessionIds.add(id);
        newSessions++;
        return;
      }
      const gym = String(s.gym ?? "").trim();
      if (gym && setSessionGym(id, gym)) gymsUpdated++;
    });

    exercises.forEach((e: any) => {
      const id = String(e.id ?? "").trim();
      if (!id || exerciseIds.has(id)) return;
      insertExerciseRaw(e);
      exerciseIds.add(id);
      newExercises++;
    });

    db.execSync("COMMIT;");
  } catch (err) {
    db.execSync("ROLLBACK;");
    throw err;
  }

  return { newSessions, newExercises, gymsUpdated };
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