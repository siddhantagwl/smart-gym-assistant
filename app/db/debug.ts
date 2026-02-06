import { db } from "./database";

export function logAllSessions() {
  const rows = db.getAllSync(
    "SELECT id, start_time, end_time FROM sessions ORDER BY start_time DESC;"
  );

  console.log("DB sessions:", rows);
}