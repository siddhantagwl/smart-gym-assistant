import { db } from "./database";

type Session = {
  id: string;
  startTime: Date;
  endTime: Date;
  workoutType: string;
  note: string;
};

export function insertSession(session: Session) {
  db.runSync(
    `
    INSERT INTO sessions (id, start_time, end_time, workout_type, note)
    VALUES (?, ?, ?, ?, ?);
    `,
    [
      session.id,
      session.startTime.toISOString(),
      session.endTime.toISOString(),
      session.workoutType,
      session.note,
    ]
  );
}

export type StoredSession = {
  id: string;
  startTime: string;
  endTime: string;
  workoutType: string;
  note: string;
};

export function getAllSessions(): StoredSession[] {
  const rows = db.getAllSync(
    `
    SELECT id, start_time, end_time, workout_type, note
    FROM sessions
    ORDER BY start_time DESC;
    `
  ) as any[];

  return rows.map((r) => ({
    id: String(r.id),
    startTime: String(r.start_time),
    endTime: String(r.end_time),
    workoutType: r.workout_type ? String(r.workout_type) : "Unknown",
    note: r.note ? String(r.note) : "",
  }));
}

export type ExerciseInput = {
  id: string;
  sessionId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  note: string;
};

export function insertExercise(exercise: ExerciseInput) {
  db.runSync(
    `
    INSERT INTO exercises (id, session_id, name, sets, reps, weight_kg, note)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    [
      exercise.id,
      exercise.sessionId,
      exercise.name,
      exercise.sets,
      exercise.reps,
      exercise.weightKg,
      exercise.note,
    ]
  );
}

export type StoredExercise = {
  id: string;
  sessionId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  note: string;
};

export function getExercisesForSession(sessionId: string): StoredExercise[] {
  const rows = db.getAllSync(
    `SELECT id, session_id, name, sets, reps, weight_kg, note
     FROM exercises
     WHERE session_id = ?
     ORDER BY rowid ASC;`,
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
  }));
}

export function getExerciseCountForSession(sessionId: string): number {
  const row = db.getFirstSync(
    `SELECT COUNT(1) as c FROM exercises WHERE session_id = ?;`,
    [sessionId]
  ) as any;

  return row ? Number(row.c) : 0;
}
