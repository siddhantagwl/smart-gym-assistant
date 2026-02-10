import { RecentSession, Session } from "@/domain/session";
import { db } from "./database";

// StoredSession is the shape of session data as stored in the database.
// its not a domain model, since it uses strings for dates and has some DB specific fields like 'source'.
export type StoredSession = {
  id: string;
  startTime: string;
  endTime: string | null;
  sessionLabel: string | null;
  note: string;
  source: "live" | "manual";
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
      session.sessionLabel ?? null,
      session.note ?? "",
      "live",
    ]
  );
}

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
    endTime: r.end_time ? String(r.end_time) : null,
    sessionLabel: r.workout_type ? String(r.workout_type) : null,
    note: r.note ? String(r.note) : "",
    source: (r.source as "live" | "manual") || "live",
  }));
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
    sessionLabel: row.workout_type ? String(row.workout_type) : null,
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
  sessionLabel: string;
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
      [sessionId, startTime, endTime, params.sessionLabel, params.note || "", "manual"]
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
          exerciseId, sessionId, ex.name, ex.sets, ex.reps, ex.weightKg, ex.note || "", createdAt,
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

export function getRecentSessions(limit: number = 3): RecentSession[] {
  const safeLimit = Math.max(1, Math.min(10, Number(limit) || 3));

  const rows = db.getAllSync(
    `
    SELECT id, start_time, end_time, workout_type, source
    FROM sessions
    WHERE note != '__DISCARDED__'
    ORDER BY start_time DESC
    LIMIT ?;
    `,
    [safeLimit]
  ) as any[];

  return rows.map((r) => ({
    id: String(r.id),
    startTime: String(r.start_time),
    endTime: r.end_time ? String(r.end_time) : null,
    sessionLabel: r.workout_type ? String(r.workout_type) : null,
    source: (r.source as "live" | "manual") || "live",
  }));
}