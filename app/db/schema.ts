import { db } from "./database";

export function initDb() {
    db.execSync(`
        CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL
        );
    `);
}
