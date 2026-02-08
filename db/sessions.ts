import { db } from "./database";

// Session is an in memory domain model.
type Session = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  workoutType: string;
  note: string;
};

export function insertSession(session: Session) {
  db.runSync(
    `
    INSERT INTO sessions (id, start_time, end_time, workout_type, note, source)
    VALUES (?, ?, ?, ?, ?, ?);
    `,
    [
      session.id,
      session.startTime.toISOString(),
      session.endTime ? session.endTime.toISOString() : null,
      session.workoutType,
      session.note,
      "live",
    ]
  );
}

// StoredSession is the shape of session data as stored in the database.
export type StoredSession = {
  id: string;
  startTime: string;
  endTime: string | null;
  workoutType: string;
  note: string;
  source: "live" | "manual";
};

export function getAllSessions(): StoredSession[] {
  const rows = db.getAllSync(
    `
    SELECT id, start_time, end_time, workout_type, note, source
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
    source: (r.source as "live" | "manual") || "live",
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
  createdAt: string;
};

export function insertExercise(exercise: ExerciseInput) {
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
      exercise.note,
      new Date().toISOString(),
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
  createdAt: string;
};

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

export type LatestExercise = {
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  note: string;
  sessionStartTime: string;
  workoutType: string;
};

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
    workoutType: row.workout_type ? String(row.workout_type) : "Unknown",
  };
}

export function getActiveSession(): StoredSession | null {
  const row = db.getFirstSync(
    `
    SELECT id, start_time, end_time, workout_type, note, source
    FROM sessions
    WHERE end_time IS NULL
    LIMIT 1;
    `
  ) as any;

  if (!row) return null;

  return {
    id: String(row.id),
    startTime: String(row.start_time),
    endTime: row.end_time ? String(row.end_time) : null,
    workoutType: row.workout_type ? String(row.workout_type) : "Unknown",
    note: row.note ? String(row.note) : "",
    source: (row.source as "live" | "manual") || "live",
  };
}

export function endSession(sessionId: string, endTime: Date, note: string) {
  db.runSync(
    `
    UPDATE sessions
    SET end_time = ?, note = ?
    WHERE id = ?;
    `,
    [endTime.toISOString(), note, sessionId]
  );
}

export function insertManualSession(params: {
  date: Date;
  workoutType: string;
  note: string;
  exercises: {
    name: string;
    sets: number;
    reps: number;
    weightKg: number;
    note?: string;
  }[];
}) {
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const startTime = params.date.toISOString();
  const endTime = startTime;

  db.execSync("BEGIN TRANSACTION;");

  try {
    // 1) Insert session
    db.runSync(
      `
      INSERT INTO sessions (id, start_time, end_time, workout_type, note, source)
      VALUES (?, ?, ?, ?, ?, ?);
      `,
      [sessionId, startTime, endTime, params.workoutType, params.note || "", "manual"]
    );

    // 2) Insert exercises
    params.exercises.forEach((ex, idx) => {
      const exerciseId = `${sessionId}-ex-${idx}`;
      const createdAt = new Date(
        params.date.getTime() + idx * 60 * 1000
      ).toISOString();

      db.runSync(
        `
        INSERT INTO exercises
          (id, session_id, name, sets, reps, weight_kg, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          exerciseId,
          sessionId,
          ex.name,
          ex.sets,
          ex.reps,
          ex.weightKg,
          ex.note || "",
          createdAt,
        ]
      );
    });

    db.execSync("COMMIT;");
    return sessionId;
  } catch (err) {
    db.execSync("ROLLBACK;");
    throw err;
  }
}