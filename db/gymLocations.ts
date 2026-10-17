// Gym coordinates learned on the phone (services/gymLocation.ts). Not synced.
import { db } from "./database";

export type GymLocation = { gym: string; lat: number; lon: number; samples: number };

// Running average caps at this many fixes, so later fixes still nudge it.
const MAX_SAMPLES = 10;

export function getGymLocations(): GymLocation[] {
  const rows = db.getAllSync(`SELECT gym, lat, lon, samples FROM gym_locations;`) as any[];
  return rows.map((r) => ({
    gym: String(r.gym),
    lat: Number(r.lat),
    lon: Number(r.lon),
    samples: Number(r.samples) || 1,
  }));
}

// Adds a fix to the gym's averaged position.
export function addGymLocationFix(gym: string, lat: number, lon: number) {
  const prev = db.getFirstSync(`SELECT lat, lon, samples FROM gym_locations WHERE gym = ?;`, [gym]) as
    | { lat: number; lon: number; samples: number }
    | null;
  const now = new Date().toISOString();
  if (!prev) {
    db.runSync(
      `INSERT INTO gym_locations (gym, lat, lon, samples, updated_at) VALUES (?, ?, ?, 1, ?);`,
      [gym, lat, lon, now],
    );
    return;
  }
  const n = Math.min(Number(prev.samples) || 1, MAX_SAMPLES - 1);
  db.runSync(
    `UPDATE gym_locations SET lat = ?, lon = ?, samples = ?, updated_at = ? WHERE gym = ?;`,
    [(prev.lat * n + lat) / (n + 1), (prev.lon * n + lon) / (n + 1), n + 1, now, gym],
  );
}
