import { db } from "@/db/database";
import { Exercise } from "@/domain/exercise";

export type StoredExercise = {
  id: string;
  sessionId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  note: string;
  createdAt: string;
};

// not a domain model as its exercise + session for UI layer
export type LatestExercise = {
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  note: string;
  sessionStartTime: string;
  sessionLabel: string | null;
};

export function insertExercise(exercise: Exercise) {
  db.runSync(
    `
    INSERT INTO exercises (id, session_id, name, sets, reps, weight_kg, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      exercise.id,
      exercise.sessionId,
      exercise.name,
      exercise.sets,
      exercise.reps,
      exercise.weightKg,
      exercise.note ?? "",
      new Date().toISOString(),
    ]
  );
}

export function getAllExercises(): StoredExercise[] {
  const rows = db.getAllSync(
    `
    SELECT id, session_id, name, sets, reps, weight_kg, note, created_at
    FROM exercises
    ORDER BY created_at ASC;
    `
  ) as any[];

  return rows.map((r) => ({
    id: String(r.id),
    sessionId: String(r.session_id),
    name: String(r.name),
    sets: Number(r.sets),
    reps: Number(r.reps),
    weightKg: Number(r.weight_kg),
    note: r.note ? String(r.note) : "",
    createdAt: String(r.created_at),
  }));
}

export function getExercisesForSession(sessionId: string): StoredExercise[] {
  const rows = db.getAllSync(
    `SELECT id, session_id, name, sets, reps, weight_kg, note, created_at
     FROM exercises
     WHERE session_id = ?
     ORDER BY created_at ASC;`,
    [sessionId]
  ) as any[];

  return rows.map((r) => ({
    id: String(r.id),
    sessionId: String(r.session_id),
    name: String(r.name),
    sets: Number(r.sets),
    reps: Number(r.reps),
    weightKg: Number(r.weight_kg),
    note: r.note ? String(r.note) : "",
    createdAt: String(r.created_at),
  }));
}

export function getExerciseCountForSession(sessionId: string): number {
  const row = db.getFirstSync(
    `SELECT COUNT(1) as c FROM exercises WHERE session_id = ?;`,
    [sessionId]
  ) as any;

  return row ? Number(row.c) : 0;
}

export function getLatestExerciseByName(exerciseName: string): LatestExercise | null {
  const trimmed = exerciseName.trim();
  if (!trimmed) return null;

  const row = db.getFirstSync(
    `
    SELECT
      e.name as name,
      e.sets as sets,
      e.reps as reps,
      e.weight_kg as weight_kg,
      e.note as note,
      s.start_time as session_start_time,
      s.workout_type as workout_type
    FROM exercises e
    JOIN sessions s ON s.id = e.session_id
    WHERE LOWER(e.name) = LOWER(?)
    ORDER BY s.start_time DESC, e.rowid DESC
    LIMIT 1;
    `,
    [trimmed]
  ) as any;

  if (!row) return null;

  return {
    name: String(row.name),
    sets: Number(row.sets),
    reps: Number(row.reps),
    weightKg: Number(row.weight_kg),
    note: row.note ? String(row.note) : "",
    sessionStartTime: String(row.session_start_time),
    sessionLabel: row.workout_type ? String(row.workout_type) : null,
  };
}