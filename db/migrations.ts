// One-time data migrations on the local DB, tracked with SQLite's
// PRAGMA user_version so each runs exactly once per install (and never
// re-applies over later edits). Schema changes stay in schema.ts
// (ensureColumn); this file is for fixing data.
import { db } from "./database";

// Oct 2026 library cleanup: exercises logged under names that weren't in the
// library, relinked by exercise row id → [exercise_library_id, name].
// Mirrors EXERCISE_RELINKS in apps-script/Cleanup_2026_10.gs (the Sheet side).
const RELINKS_2026_10: Record<string, [string, string]> = {
  "1782132173225": ["cable_front_raise", "Cable Front Raise"],
  "1783599011245": ["dumbbell_lateral_raise", "Dumbbell Lateral Raise"],
  "1785411552152": ["cable_crunches", "Cable Crunches"],
  "1787509647373": ["seated_cable_row_narrow", "Seated Cable Row (Narrow Grip)"],
  "1787512424434": ["cable_bicep_curl", "Cable Bicep Curl"],
  "1787512720184": ["cable_wrist_curl", "Cable Wrist Curl"],
  "1787570661376": ["barbell_bench_press", "Barbell Bench Press"],
  "1788177950202": ["cable_upright_row", "Cable Upright Row"],
  "1788178455746": ["cable_shrug", "Cable Shrug"],
  "1790077845000": ["cable_bicep_curl", "Cable Bicep Curl"],
  "1790249083436": ["cable_crunches", "Cable Crunches"],
  "1791052716076": ["hack_squat_machine", "Hack Squat Machine"],
  "1791055996584": ["shoulder_press_machine", "Shoulder Press Machine"],
};

export function runDataMigrations() {
  const row = db.getFirstSync(`PRAGMA user_version;`) as { user_version: number } | null;
  const version = row?.user_version ?? 0;

  if (version < 1) {
    db.execSync("BEGIN;");
    try {
      Object.entries(RELINKS_2026_10).forEach(([id, [libraryId, name]]) => {
        db.runSync(`UPDATE exercises SET exercise_library_id = ?, name = ? WHERE id = ?;`, [
          libraryId,
          name,
          id,
        ]);
      });
      db.execSync(`PRAGMA user_version = 1;`);
      db.execSync("COMMIT;");
    } catch (err) {
      db.execSync("ROLLBACK;");
      throw err;
    }
  }
}
