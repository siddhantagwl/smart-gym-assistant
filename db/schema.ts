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
            name TEXT NOT NULL,
            sets INTEGER NOT NULL,
            reps INTEGER NOT NULL,
            weight_kg REAL NOT NULL,
            rest_seconds INTEGER NOT NULL DEFAULT 0,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            note TEXT NOT NULL DEFAULT '',
            FOREIGN KEY (session_id) REFERENCES sessions(id)
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

    seedExerciseLibrary();

}

export function wipeDatabase() {
  db.execSync("DELETE FROM exercises;");
  db.execSync("DELETE FROM sessions;");
  console.log("Database wiped completely.");
}