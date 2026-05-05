import { db } from "./database";
import { seedExerciseLibrary } from "./seedExercises";

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

    // Migrations: bring older databases up to the current schema.
    // CREATE TABLE IF NOT EXISTS won't add columns to a pre-existing table,
    // so any column added since the original schema must be ALTER-ed in here.
    // Each ensureColumn is a no-op when the column already exists.
    ensureColumn("sessions", "session_labels", "TEXT NOT NULL DEFAULT '[]'");
    ensureColumn("sessions", "note", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("sessions", "source", "TEXT NOT NULL DEFAULT 'live'");

    ensureColumn("exercises", "weight_kg", "REAL NOT NULL DEFAULT 0");
    ensureColumn("exercises", "note", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("exercises", "start_time", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("exercises", "end_time", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("exercises", "rest_seconds", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("exercises", "exercise_library_id", "TEXT NOT NULL DEFAULT ''");

    seedExerciseLibrary();

}

function ensureColumn(table: string, columnName: string, columnDef: string) {
    const cols = db.getAllSync(`PRAGMA table_info(${table});`) as { name: string }[];
    if (cols.some((c) => c.name === columnName)) return;
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${columnName} ${columnDef};`);
}

export function wipeDatabase() {
  db.execSync("DELETE FROM exercises;");
  db.execSync("DELETE FROM sessions;");
  console.log("Database wiped completely.");
}