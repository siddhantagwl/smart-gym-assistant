import { db } from "./database";
import { seedExerciseLibrary } from "./seedExercises";
import { runDataMigrations } from "./migrations";

export function initDb() {

    db.execSync(`
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT,
            session_labels TEXT NOT NULL DEFAULT '[]',
            note TEXT NOT NULL DEFAULT '',
            source TEXT NOT NULL DEFAULT 'live'
        );
    `);

    db.execSync(`
        CREATE TABLE IF NOT EXISTS exercises (
            id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL,
            exercise_library_id TEXT NOT NULL,
            name TEXT NOT NULL,
            sets INTEGER NOT NULL,
            reps INTEGER NOT NULL,
            weight_kg REAL NOT NULL,
            rest_seconds INTEGER NOT NULL DEFAULT 0,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            note TEXT NOT NULL DEFAULT '',
            FOREIGN KEY (session_id) REFERENCES sessions(id),
            FOREIGN KEY (exercise_library_id) REFERENCES exercise_library(id)
        );
    `);

    db.execSync(`
        CREATE TABLE IF NOT EXISTS exercise_library (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            video_url TEXT,
            primary_muscle TEXT NOT NULL,
            tags TEXT NOT NULL
        );
    `);

    // Where each gym is (learned when a session starts there) — for
    // preselecting the gym on Home. Phone-only, not synced to Sheets.
    db.execSync(`
        CREATE TABLE IF NOT EXISTS gym_locations (
            gym TEXT PRIMARY KEY NOT NULL,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            samples INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL
        );
    `);

    // Migrations: bring older databases up to the current schema.
    // CREATE TABLE IF NOT EXISTS won't add columns to a pre-existing table,
    // so any column added since the original schema must be ALTER-ed in here.
    // Each ensureColumn is a no-op when the column already exists.
    ensureColumn("sessions", "session_labels", "TEXT NOT NULL DEFAULT '[]'");
    ensureColumn("sessions", "note", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("sessions", "source", "TEXT NOT NULL DEFAULT 'live'");
    // Which gym the session was at ('' = unknown / before gyms existed).
    ensureColumn("sessions", "gym", "TEXT NOT NULL DEFAULT ''");

    ensureColumn("exercises", "weight_kg", "REAL NOT NULL DEFAULT 0");
    ensureColumn("exercises", "note", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("exercises", "start_time", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("exercises", "end_time", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("exercises", "rest_seconds", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("exercises", "exercise_library_id", "TEXT NOT NULL DEFAULT ''");
    // weight_kg stays canonical; weight_unit records which unit the user
    // typed in so history can echo it back ("(220 lb)") even though storage
    // and PR/aggregation logic always use kg.
    ensureColumn("exercises", "weight_unit", "TEXT NOT NULL DEFAULT 'kg'");
    // Each rest between sets, in seconds, as a JSON array (e.g. "[95,140,160]").
    // rest_seconds stays the exercise's total; older rows default to "[]".
    ensureColumn("exercises", "rest_periods", "TEXT NOT NULL DEFAULT '[]'");
    // Movement grouping from the Sheet library (see domain/movement.ts). Empty
    // means "its own single-variant movement".
    ensureColumn("exercise_library", "movement", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("exercise_library", "movement_name", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("exercise_library", "variant", "TEXT NOT NULL DEFAULT ''");
    // What the movement trains within its muscle ("Horizontal row"); movements
    // sharing a pattern do the same job (domain/patternCoverage.ts).
    ensureColumn("exercise_library", "pattern", "TEXT NOT NULL DEFAULT ''");

    // Each set as logged at Finish Set: [{reps, weightKg, weightUnit, durationSec}].
    // The row's reps/weight_kg stay the last set's values (summary for PRs/charts).
    ensureColumn("exercises", "set_log", "TEXT NOT NULL DEFAULT '[]'");

    seedExerciseLibrary();
    runDataMigrations();

}

function ensureColumn(table: string, columnName: string, columnDef: string) {
    const cols = db.getAllSync(`PRAGMA table_info(${table});`) as { name: string }[];
    if (cols.some((c) => c.name === columnName)) return;
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${columnName} ${columnDef};`);
}
