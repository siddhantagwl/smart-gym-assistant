// is for logged session exercises, not library.
import { db } from "@/db/database";
import { Exercise, SetEntry, WeightUnit } from "@/domain/exercise";

export type StoredExercise = {
  id: string;
  sessionId: string;
  exerciseLibraryId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  weightUnit: WeightUnit;
  note: string;
  restSeconds: number;
  restPeriods?: number[]; // only populated by queries that select rest_periods
  setLog?: SetEntry[]; // likewise for set_log
  sessionGym?: string; // only populated by getExercisesByLibraryIds
  startTime: string;
  endTime: string;
};

// not a domain model as its exercise + session for UI layer
export type LatestExercise = {
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  weightUnit: WeightUnit;
  note: string;
  sessionStartTime: string;
  sessionLabels: string[];
  gym: string; // gym of that session ('' = unknown)
};

function normaliseUnit(v: unknown): WeightUnit {
  return v === "lb" ? "lb" : "kg";
}

// rest_periods arrives as a JSON string (SQLite), an array (Sheets restore)
// or nothing (older rows); always hand back clean whole seconds.
function parseRestPeriods(v: unknown): number[] {
  let arr: unknown = v;
  if (typeof v === "string") {
    try {
      arr = JSON.parse(v);
    } catch {
      return [];
    }
  }
  return Array.isArray(arr)
    ? arr.map(Number).filter((n) => Number.isFinite(n) && n >= 0).map(Math.round)
    : [];
}

function parseSetLog(v: unknown): SetEntry[] {
  let arr: unknown = v;
  if (typeof v === "string") {
    try {
      arr = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x: any) => ({
      reps: Number(x?.reps),
      weightKg: Number(x?.weightKg),
      weightUnit: normaliseUnit(x?.weightUnit),
      ...(Number.isFinite(Number(x?.durationSec)) ? { durationSec: Number(x.durationSec) } : {}),
    }))
    .filter((x) => Number.isFinite(x.reps) && Number.isFinite(x.weightKg));
}

export function insertExercise(exercise: Exercise) {
  db.runSync(
    `
    INSERT INTO exercises (id, session_id, exercise_library_id, name, sets, reps, weight_kg, weight_unit, rest_seconds, rest_periods, set_log, start_time, end_time, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      exercise.id,
      exercise.sessionId,
      exercise.exerciseLibraryId,
      exercise.name,
      exercise.sets,
      exercise.reps,
      exercise.weightKg,
      exercise.weightUnit ?? "kg",
      exercise.restSeconds ?? 0,
      JSON.stringify(exercise.restPeriods ?? []),
      JSON.stringify(exercise.setLog ?? []),
      exercise.startTime,
      exercise.endTime,
      exercise.note ?? "",
    ]
  );
}

export type ExerciseEdit = Pick<
  StoredExercise,
  "name" | "exerciseLibraryId" | "sets" | "reps" | "weightKg" | "weightUnit" | "note"
>;

export function updateExercise(id: string, edit: ExerciseEdit) {
  db.runSync(
    `
    UPDATE exercises
    SET name = ?, exercise_library_id = ?, sets = ?, reps = ?, weight_kg = ?, weight_unit = ?, note = ?
    WHERE id = ?;
    `,
    [
      edit.name,
      edit.exerciseLibraryId,
      edit.sets,
      edit.reps,
      edit.weightKg,
      edit.weightUnit,
      edit.note,
      id,
    ]
  );
}

// Used by Undo after Finish Exercise.
export function deleteExercise(id: string) {
  db.runSync(`DELETE FROM exercises WHERE id = ?;`, [id]);
}

//todo: change the functio nn name to reflect that this is for all exercises, not just for a session
export function getAllExercises(): StoredExercise[] {
  const rows = db.getAllSync(
    `
    SELECT id, session_id, exercise_library_id, name, sets, reps, weight_kg, weight_unit, rest_seconds, rest_periods, set_log, start_time, end_time, note
    FROM exercises
    ORDER BY start_time ASC;
    `
  ) as any[];

  return rows.map((r) => ({
    id: String(r.id),
    sessionId: String(r.session_id),
    exerciseLibraryId: String(r.exercise_library_id),
    name: String(r.name),
    sets: Number(r.sets),
    reps: Number(r.reps),
    weightKg: Number(r.weight_kg),
    weightUnit: normaliseUnit(r.weight_unit),
    restSeconds: Number(r.rest_seconds),
    restPeriods: parseRestPeriods(r.rest_periods),
    setLog: parseSetLog(r.set_log),
    startTime: String(r.start_time),
    endTime: String(r.end_time),
    note: r.note ? String(r.note) : "",
  }));
}

export function getExercisesForSession(sessionId: string): StoredExercise[] {
  const rows = db.getAllSync(
    `SELECT id, session_id, exercise_library_id, name, sets, reps, weight_kg, weight_unit, rest_seconds, rest_periods, set_log, start_time, end_time, note
     FROM exercises
     WHERE session_id = ?
     ORDER BY start_time ASC;`,
    [sessionId]
  ) as any[];

  return rows.map((r) => ({
    id: String(r.id),
    sessionId: String(r.session_id),
    exerciseLibraryId: String(r.exercise_library_id),
    name: String(r.name),
    sets: Number(r.sets),
    reps: Number(r.reps),
    weightKg: Number(r.weight_kg),
    weightUnit: normaliseUnit(r.weight_unit),
    restSeconds: Number(r.rest_seconds),
    restPeriods: parseRestPeriods(r.rest_periods),
    setLog: parseSetLog(r.set_log),
    startTime: String(r.start_time),
    endTime: String(r.end_time),
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

// `gym` (optional): only look at sessions from that gym — used for
// gym-scoped equipment (machine/cable/smith, see domain/movement.ts).
export function getLatestExerciseByName(
  exerciseName: string,
  gym?: string | null
): LatestExercise | null {
  const trimmed = exerciseName.trim();
  if (!trimmed) return null;

  const row = db.getFirstSync(
    `
    SELECT
      e.name as name,
      e.sets as sets,
      e.reps as reps,
      e.weight_kg as weight_kg,
      e.weight_unit as weight_unit,
      e.note as note,
      s.start_time as session_start_time,
      s.session_labels as session_labels,
      s.gym as session_gym
    FROM exercises e
    JOIN sessions s ON s.id = e.session_id
    WHERE LOWER(e.name) = LOWER(?)${gym ? " AND s.gym = ?" : ""}
    ORDER BY s.start_time DESC, e.rowid DESC
    LIMIT 1;
    `,
    gym ? [trimmed, gym] : [trimmed]
  ) as any;

  if (!row) return null;

  return {
    name: String(row.name),
    sets: Number(row.sets),
    reps: Number(row.reps),
    weightKg: Number(row.weight_kg),
    weightUnit: normaliseUnit(row.weight_unit),
    note: row.note ? String(row.note) : "",
    sessionStartTime: String(row.session_start_time),
    sessionLabels: row.session_labels ? JSON.parse(row.session_labels) : [],
    gym: row.session_gym ? String(row.session_gym) : "",
  };
}

// Last few logged rows of an exercise (newest first) for progression
// suggestions. Discarded sessions are ignored, same as the PR check.
export function getRecentExerciseRows(
  exerciseName: string,
  limit: number = 3,
  gym?: string | null
): { weightKg: number; reps: number }[] {
  const trimmed = exerciseName.trim();
  if (!trimmed) return [];

  const rows = db.getAllSync(
    `
    SELECT e.weight_kg as weight_kg, e.reps as reps
    FROM exercises e
    JOIN sessions s ON s.id = e.session_id
    WHERE LOWER(e.name) = LOWER(?) AND s.note != '__DISCARDED__'${gym ? " AND s.gym = ?" : ""}
    ORDER BY s.start_time DESC, e.rowid DESC
    LIMIT ?;
    `,
    gym ? [trimmed, gym, limit] : [trimmed, limit]
  ) as { weight_kg: number; reps: number }[];

  return rows.map((r) => ({ weightKg: Number(r.weight_kg), reps: Number(r.reps) }));
}

// Which of these library ids (variants of one movement) was logged most
// recently — at `gym` if given and found there, otherwise anywhere.
export function getLastUsedVariant(libraryIds: string[], gym: string): string | null {
  if (libraryIds.length === 0) return null;
  const placeholders = libraryIds.map(() => "?").join(",");
  const base = `
    SELECT e.exercise_library_id AS id
    FROM exercises e
    JOIN sessions s ON s.id = e.session_id
    WHERE e.exercise_library_id IN (${placeholders}) AND s.note != '__DISCARDED__'`;
  const order = ` ORDER BY e.start_time DESC LIMIT 1;`;

  if (gym) {
    const atGym = db.getFirstSync(base + ` AND s.gym = ?` + order, [...libraryIds, gym]) as
      | { id: string }
      | null;
    if (atGym) return String(atGym.id);
  }
  const anywhere = db.getFirstSync(base + order, libraryIds) as { id: string } | null;
  return anywhere ? String(anywhere.id) : null;
}

// Heaviest logged weight; null when there's no history (at `gym`, if given).
export function getMaxWeightForExercise(exerciseName: string, gym?: string | null): number | null {
  const trimmed = exerciseName.trim();
  if (!trimmed) return null;

  const row = db.getFirstSync(
    `
    SELECT MAX(e.weight_kg) as max_w
    FROM exercises e
    JOIN sessions s ON s.id = e.session_id
    WHERE LOWER(e.name) = LOWER(?) AND s.note != '__DISCARDED__'${gym ? " AND s.gym = ?" : ""};
    `,
    gym ? [trimmed, gym] : [trimmed]
  ) as { max_w: number | null } | undefined;

  return row?.max_w ?? null;
}

export function insertExerciseRaw(row: any) {
  db.runSync(
    `
    INSERT INTO exercises
    (id, session_id, exercise_library_id, name, sets, reps, weight_kg, weight_unit, rest_seconds, rest_periods, set_log, start_time, end_time, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      row.id,
      row.session_id,
      row.exercise_library_id ?? row.name,
      row.name,
      Number(row.sets),
      Number(row.reps),
      Number(row.weight_kg),
      normaliseUnit(row.weight_unit),
      Number(row.rest_seconds || 0),
      JSON.stringify(parseRestPeriods(row.rest_periods)),
      JSON.stringify(parseSetLog(row.set_log)),
      row.start_time,
      row.end_time,
      row.note || "",
    ]
  );
}

export type ExerciseLogSummary = { count: number; lastStartTime: string };

// Per-library-id log count + most recent start, for the Exercises tab's
// "done / not done yet" hints. Keyed the same way as getExercisesByLibraryId
// so the count matches what the history screen lists.
export function getExerciseLogSummaries(): Record<string, ExerciseLogSummary> {
  const rows = db.getAllSync(
    `
    SELECT exercise_library_id AS lib_id, COUNT(*) AS cnt, MAX(start_time) AS last
    FROM exercises
    GROUP BY exercise_library_id;
    `
  ) as { lib_id: string; cnt: number; last: string | null }[];

  const map: Record<string, ExerciseLogSummary> = {};
  rows.forEach((r) => {
    map[String(r.lib_id)] = { count: Number(r.cnt), lastStartTime: r.last ? String(r.last) : "" };
  });
  return map;
}

// History of several library ids (the variants of one movement), newest
// first, with each row's session gym.
export function getExercisesByLibraryIds(libraryIds: string[]): StoredExercise[] {
  if (libraryIds.length === 0) return [];
  const rows = db.getAllSync(
    `
    SELECT e.id, e.session_id, e.exercise_library_id, e.name, e.sets, e.reps, e.weight_kg, e.weight_unit,
           e.rest_seconds, e.rest_periods, e.set_log, e.start_time, e.end_time, e.note, s.gym AS session_gym
    FROM exercises e
    LEFT JOIN sessions s ON s.id = e.session_id
    WHERE e.exercise_library_id IN (${libraryIds.map(() => "?").join(",")})
    ORDER BY e.start_time DESC;
    `,
    libraryIds
  ) as any[];

  return rows.map((r) => ({
    id: String(r.id),
    sessionId: String(r.session_id),
    exerciseLibraryId: String(r.exercise_library_id),
    name: String(r.name),
    sets: Number(r.sets),
    reps: Number(r.reps),
    weightKg: Number(r.weight_kg),
    weightUnit: normaliseUnit(r.weight_unit),
    restSeconds: Number(r.rest_seconds),
    restPeriods: parseRestPeriods(r.rest_periods),
    setLog: parseSetLog(r.set_log),
    startTime: String(r.start_time),
    endTime: String(r.end_time),
    note: r.note ? String(r.note) : "",
    sessionGym: r.session_gym ? String(r.session_gym) : "",
  }));
}
