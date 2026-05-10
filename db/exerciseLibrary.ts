// read exercise library from db

import { db } from "./database";

export type ExerciseLibraryItem = {
  id: string;
  name: string;
  videoUrl: string;
  primaryMuscle: string;
  tags: string[];
};

export function getAllLibraryExercises(): ExerciseLibraryItem[] {
  const rows = db.getAllSync(
    `SELECT id, name, video_url, primary_muscle, tags FROM exercise_library;`
  ) as any[];

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    videoUrl: String(r.video_url),
    primaryMuscle: String(r.primary_muscle),
    tags: (() => {
      try {
        return JSON.parse(r.tags ?? "[]");
      } catch {
        return [];
      }
    })(),
  }));
}

// Full-replace the exercise_library table from rows fetched via Apps Script
// GET ?type=library. Sheet is authoritative — local entries not in payload
// are wiped. Wrapped in a transaction; rolls back on any failure.
export function replaceExerciseLibrary(rows: any[]) {
  db.execSync("BEGIN TRANSACTION;");
  try {
    db.execSync("DELETE FROM exercise_library;");

    rows.forEach((r) => {
      const id = String(r.id ?? "").trim();
      if (!id) return;

      // Tags arrive as a JSON string from the sheet. Re-stringify safely.
      let tags = "[]";
      const raw = r.tags;
      if (typeof raw === "string" && raw.trim().length > 0) {
        try {
          tags = JSON.stringify(JSON.parse(raw));
        } catch {
          tags = "[]";
        }
      } else if (Array.isArray(raw)) {
        tags = JSON.stringify(raw);
      }

      db.runSync(
        `INSERT INTO exercise_library (id, name, video_url, primary_muscle, tags)
         VALUES (?, ?, ?, ?, ?);`,
        [
          id,
          String(r.name ?? ""),
          r.video_url ? String(r.video_url) : "",
          String(r.primary_muscle ?? ""),
          tags,
        ]
      );
    });

    db.execSync("COMMIT;");
  } catch (err) {
    db.execSync("ROLLBACK;");
    throw err;
  }
}

// Names that have been logged but don't exist in exercise_library
// (matched by either id or name, since Pass 1 stuffs the typed name into
// exercise_library_id as a synthetic ID for unknown exercises).
export type UnsyncedExerciseName = {
  name: string;
  count: number;
  lastLogged: string;
};

export function getLoggedExercisesNotInLibrary(): UnsyncedExerciseName[] {
  const rows = db.getAllSync(
    `SELECT e.name AS name, COUNT(*) AS count, MAX(e.start_time) AS last_logged
     FROM exercises e
     JOIN sessions s ON s.id = e.session_id
     WHERE s.note != '__DISCARDED__'
       AND NOT EXISTS (
         SELECT 1 FROM exercise_library l
         WHERE l.id = e.exercise_library_id OR l.name = e.name
       )
     GROUP BY e.name
     ORDER BY MAX(e.start_time) DESC;`
  ) as any[];

  return rows.map((r) => ({
    name: String(r.name),
    count: Number(r.count),
    lastLogged: String(r.last_logged ?? ""),
  }));
}