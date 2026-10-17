// Raw key → JSON-string store behind services/preferences.ts.
import { db } from "./database";

export function getAllPreferenceRows(): Record<string, string> {
  const rows = db.getAllSync(`SELECT key, value FROM preferences;`) as { key: string; value: string }[];
  const out: Record<string, string> = {};
  rows.forEach((r) => (out[String(r.key)] = String(r.value)));
  return out;
}

export function setPreferenceRow(key: string, value: string) {
  db.runSync(
    `INSERT INTO preferences (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [key, value],
  );
}

export function clearPreferenceRows() {
  db.runSync(`DELETE FROM preferences;`);
}
