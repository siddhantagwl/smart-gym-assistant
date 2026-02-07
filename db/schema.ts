import { db } from "./database";

export function initDb() {
    db.execSync(`
        CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL
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
        FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
    `);

    try {
        db.execSync(`ALTER TABLE exercises ADD COLUMN weight_kg REAL NOT NULL DEFAULT 0;`);
    } catch (e) {
        // ignore if column already exists
    }
}
