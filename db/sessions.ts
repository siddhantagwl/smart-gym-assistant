import { RecentSession, Session } from "@/domain/session";
import { db } from "./database";
import { cleanSessionLabels } from "@/domain/muscles";

// StoredSession is the shape of session data as stored in the database.
// its not a domain model, since it uses strings for dates and has some DB specific fields like 'source'.
export type StoredSession = {
  id: string;
  startTime: string;
  endTime: string | null;
  sessionLabels: string[];
  note: string;
  source: "live" | "manual";
  gym: string; // '' = unknown
};

export function insertSession(session: Session) {
  db.runSync(
    `
    INSERT INTO sessions (id, start_time, end_time, session_labels, note, source, gym)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    [
      session.id,
      session.startTime.toISOString(),
      session.endTime ? session.endTime.toISOString() : null,
      JSON.stringify(session.sessionLabels ?? []),
      session.note ?? "",
      "live",
      (session.gym ?? "").trim(),
    ]
  );
}

export function getAllSessions(): StoredSession[] {
  const rows = db.getAllSync(
    `
    SELECT id, start_time, end_time, session_labels, note, source, gym
    FROM sessions
    ORDER BY start_time DESC;
    `
  ) as any[];

  return rows.map((r) => ({
    id: String(r.id),
    startTime: String(r.start_time),
    endTime: r.end_time ? String(r.end_time) : null,
    sessionLabels: r.session_labels ? JSON.parse(r.session_labels) : [],
    note: r.note ? String(r.note) : "",
    source: (r.source as "live" | "manual") || "live",
    gym: r.gym ? String(r.gym) : "",
  }));
}

export function getActiveSession(): StoredSession | null {
  const row = db.getFirstSync(
    `
    SELECT id, start_time, end_time, session_labels, note, source, gym
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
    sessionLabels: row.session_labels ? JSON.parse(row.session_labels) : [],
    note: row.note ? String(row.note) : "",
    source: (row.source as "live" | "manual") || "live",
    gym: row.gym ? String(row.gym) : "",
  };
}

export function endSession(sessionId: string, endTime: Date, note: string, sessionLabels: string[]) {
  db.runSync(
    `
    UPDATE sessions
    SET end_time = ?, note = ?, session_labels = ?
    WHERE id = ?;
    `,
    [endTime.toISOString(), note, JSON.stringify(sessionLabels), sessionId]
  );
}

export function insertManualSession(params: {
  date: Date;
  sessionLabel: string | null;
  note: string;
  exercises: {
    exerciseLibraryId?: string;
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
      INSERT INTO sessions (id, start_time, end_time, session_labels, note, source)
      VALUES (?, ?, ?, ?, ?, ?);
      `,
      [sessionId, startTime, endTime, JSON.stringify(params.sessionLabel ? [params.sessionLabel] : []), params.note || "", "manual"]
    );

    // 2) Insert exercises
    params.exercises.forEach((ex, idx) => {
      const exerciseId = `${sessionId}-ex-${idx}`;

      db.runSync(
        `
        INSERT INTO exercises
          (id, session_id, exercise_library_id, name, sets, reps, weight_kg, rest_seconds, start_time, end_time, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          exerciseId,
          sessionId,
          ex.exerciseLibraryId ?? ex.name, // fallback for manual import
          ex.name,
          ex.sets,
          ex.reps,
          ex.weightKg,
          0,
          startTime,
          endTime,
          ex.note || "",
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

export function insertSaunaSession(params: {
  durationMinutes: number;
  temperatureC?: number;
}): string {
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const start = new Date();
  const end = new Date(start.getTime() + params.durationMinutes * 60_000);
  const note = params.temperatureC != null ? `${params.temperatureC}°C` : "";

  db.runSync(
    `
    INSERT INTO sessions (id, start_time, end_time, session_labels, note, source)
    VALUES (?, ?, ?, ?, ?, ?);
    `,
    [
      sessionId,
      start.toISOString(),
      end.toISOString(),
      JSON.stringify(["Sauna"]),
      note,
      "manual",
    ]
  );

  return sessionId;
}

export function getRecentSessions(limit: number = 3): RecentSession[] {
  const safeLimit = Math.max(1, Math.min(10, Number(limit) || 3));

  const rows = db.getAllSync(
    `
    SELECT id, start_time, end_time, session_labels, source
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
    sessionLabels: r.session_labels ? JSON.parse(r.session_labels) : [],
    source: (r.source as "live" | "manual") || "live",
    gym: r.gym ? String(r.gym) : "",
  }));
}

export function deleteSession(sessionId: string) {
  db.execSync("BEGIN TRANSACTION;");
  try {
    // Delete exercises first to avoid orphan rows
    db.runSync(
      `
      DELETE FROM exercises
      WHERE session_id = ?;
      `,
      [sessionId]
    );

    // Delete the session itself
    db.runSync(
      `
      DELETE FROM sessions
      WHERE id = ?;
      `,
      [sessionId]
    );

    db.execSync("COMMIT;");
  } catch (err) {
    db.execSync("ROLLBACK;");
    throw err;
  }
}

export function insertSessionRaw(row: any) {
  db.runSync(
    `
    INSERT INTO sessions
    (id, start_time, end_time, session_labels, note, source, gym)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      row.id,
      row.start_time,
      row.end_time,
      row.session_labels,
      row.note || "",
      row.source || "live",
      row.gym ? String(row.gym).trim() : "",
    ]
  );
}

// Finished, non-discarded, non-sauna sessions (newest first) with the muscles
// trained: the user-confirmed labels plus the library primary_muscle of each
// logged exercise.
// Feeds "Today's focus" on Home (domain/todayFocus.ts).
export function getTrainingLog(limit: number = 60): { startTime: string; muscles: string[] }[] {
  const sessions = db.getAllSync(
    `SELECT id, start_time, session_labels FROM sessions
     WHERE end_time IS NOT NULL
       AND note != '__DISCARDED__'
       AND session_labels NOT LIKE '%"Sauna"%'
     ORDER BY start_time DESC
     LIMIT ?;`,
    [limit]
  ) as { id: string; start_time: string; session_labels: string | null }[];

  if (sessions.length === 0) return [];

  const inferred = db.getAllSync(
    `SELECT e.session_id AS session_id, l.primary_muscle AS muscle
     FROM exercises e
     JOIN exercise_library l
       ON l.id = e.exercise_library_id OR LOWER(l.name) = LOWER(e.name)
     WHERE e.session_id IN (${sessions.map(() => "?").join(",")});`,
    sessions.map((s) => s.id)
  ) as { session_id: string; muscle: string }[];

  const bySession = new Map<string, Set<string>>();
  inferred.forEach((r) => {
    if (!r.muscle) return;
    const set = bySession.get(String(r.session_id)) ?? new Set<string>();
    set.add(String(r.muscle));
    bySession.set(String(r.session_id), set);
  });

  return sessions.map((s) => {
    let labels: string[] = [];
    try {
      const parsed = JSON.parse(s.session_labels ?? "[]");
      if (Array.isArray(parsed)) labels = parsed.map(String);
    } catch {}
    // Labels ∪ muscles of the exercises actually logged (legacy leg names →
    // Legs), so a muscle trained but not labelled still counts.
    return {
      startTime: String(s.start_time),
      muscles: cleanSessionLabels(labels, Array.from(bySession.get(String(s.id)) ?? [])),
    };
  });
}

export function getSessionIds(): Set<string> {
  const rows = db.getAllSync(`SELECT id FROM sessions;`) as { id: string }[];
  return new Set(rows.map((r) => String(r.id)));
}

// Sets a session's gym; returns true if it changed.
export function setSessionGym(sessionId: string, gym: string): boolean {
  const res = db.runSync(`UPDATE sessions SET gym = ? WHERE id = ? AND gym != ?;`, [
    gym,
    sessionId,
    gym,
  ]);
  return res.changes > 0;
}

// Working sets per library muscle for exercises started in the last `days`
// days (finished or running sessions; discarded and sauna excluded).
export function getSetsByMuscleSince(days: number = 7): Record<string, number> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = db.getAllSync(
    `SELECT l.primary_muscle AS muscle, SUM(e.sets) AS sets
     FROM exercises e
     JOIN sessions s ON s.id = e.session_id
     JOIN exercise_library l ON l.id = e.exercise_library_id
     WHERE e.start_time >= ?
       AND s.note != '__DISCARDED__'
       AND s.session_labels NOT LIKE '%"Sauna"%'
     GROUP BY l.primary_muscle;`,
    [since]
  ) as { muscle: string; sets: number }[];

  const out: Record<string, number> = {};
  rows.forEach((r) => {
    out[String(r.muscle)] = Number(r.sets) || 0;
  });
  return out;
}

// Gyms used so far, most recently used first.
export function getKnownGyms(): string[] {
  const rows = db.getAllSync(
    `SELECT gym, MAX(start_time) AS last FROM sessions
     WHERE gym != '' AND note != '__DISCARDED__'
     GROUP BY gym
     ORDER BY last DESC;`
  ) as { gym: string }[];
  return rows.map((r) => String(r.gym));
}

// Gym of a session ('' if unknown).
export function getSessionGym(sessionId: string): string {
  const row = db.getFirstSync(`SELECT gym FROM sessions WHERE id = ?;`, [sessionId]) as
    | { gym: string }
    | null;
  return row?.gym ? String(row.gym) : "";
}

export function getWorkoutStats(): { thisWeek: number; currentStreak: number } {
  // Exclude sauna sessions — they're recovery, not training, so they shouldn't
  // extend the strength-training streak or the weekly count. A day with both a
  // workout and a sauna still counts via the workout row.
  const rows = db.getAllSync(
    `SELECT start_time FROM sessions
     WHERE note != '__DISCARDED__'
       AND session_labels NOT LIKE '%"Sauna"%';`
  ) as { start_time: string }[];

  if (rows.length === 0) return { thisWeek: 0, currentStreak: 0 };

  // Group by local-day (not UTC) so a 10pm workout doesn't count as the next day.
  function localDayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const daySet = new Set(rows.map((r) => localDayKey(new Date(r.start_time))));

  // thisWeek: distinct workout days in the rolling 7-day window ending today.
  const today = new Date();
  let thisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (daySet.has(localDayKey(d))) thisWeek++;
  }

  // currentStreak: consecutive workout days back from today (or yesterday, as
  // grace if user hasn't worked out yet today). 0 if last workout was 2+ days ago.
  const todayKey = localDayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDayKey(yesterday);

  let currentStreak = 0;
  let cursor: Date | null = null;
  if (daySet.has(todayKey)) cursor = new Date(today);
  else if (daySet.has(yesterdayKey)) cursor = new Date(yesterday);

  if (cursor) {
    while (daySet.has(localDayKey(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return { thisWeek, currentStreak };
}