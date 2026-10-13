// One-time data migrations on the local DB, tracked with SQLite's
// PRAGMA user_version so each runs exactly once per install (and never
// re-applies over later edits). Schema changes stay in schema.ts
// (ensureColumn); this file is for fixing data.
import { db } from "./database";
import { cleanSessionLabels } from "@/domain/muscles";

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

// Oct 2026 fixes from exercise notes ("dumbbell", "with cables", "seated
// dip"…): exercise row id → [exercise_library_id, name, weight_kg?].
// Mirrors NOTES_RELINKS in apps-script/FixFromNotes_2026_10.gs.
const NOTES_RELINKS_2026_10: Record<string, [string, string, number?]> = {
  "1772050757911": ["cable_rope_overhead_triceps_extension", "Cable Rope Overhead Triceps Extension"],
  "1772051334330": ["seated_dip", "Seated Dip"],
  "1778681268410": ["barbell_front_raise", "Barbell Front Raise"],
  "1788781688521": ["cable_straight_bar_overhead_triceps_extension", "Cable Straight Bar Overhead Triceps Extension"],
  "1790246053991": ["incline_dumbbell_press", "Incline Dumbbell Press"],
  "1790247136313": ["cable_crossover", "Cable Crossover"],
  "1791723963538": ["incline_barbell_bench_press", "Incline Barbell Bench Press"],
  "1791724484132": ["decline_barbell_bench_press", "Decline Barbell Bench Press", 40],
  "1791807965410": ["dumbbell_romanian_deadlift", "Dumbbell Romanian Deadlift"],
  "1771961539920": ["dips", "Dips"],
  "1789476940807": ["dips", "Dips"],
};

// Muscles of the 3 library variants added by that script, so label clean-up
// gives the same result even before the phone has pulled the library.
const NOTES_NEW_LIBRARY_MUSCLES: Record<string, string> = {
  decline_barbell_bench_press: "Chest",
  cable_straight_bar_overhead_triceps_extension: "Triceps",
  barbell_front_raise: "Shoulders",
};

// Session labels: legacy leg names → Legs, plus trained-but-unlabelled
// muscles (domain/muscles.ts). Sauna sessions are left alone.
function cleanAllSessionLabels() {
  const libMuscle = new Map<string, string>(Object.entries(NOTES_NEW_LIBRARY_MUSCLES));
  (db.getAllSync(`SELECT id, primary_muscle FROM exercise_library;`) as {
    id: string;
    primary_muscle: string;
  }[]).forEach((r) => libMuscle.set(String(r.id), String(r.primary_muscle)));

  const trained = new Map<string, string[]>();
  (db.getAllSync(`SELECT session_id, exercise_library_id FROM exercises ORDER BY start_time;`) as {
    session_id: string;
    exercise_library_id: string;
  }[]).forEach((r) => {
    const m = libMuscle.get(String(r.exercise_library_id));
    if (!m) return;
    const sid = String(r.session_id);
    trained.set(sid, [...(trained.get(sid) ?? []), m]);
  });

  (db.getAllSync(`SELECT id, session_labels FROM sessions;`) as {
    id: string;
    session_labels: string | null;
  }[]).forEach((s) => {
    let labels: string[] = [];
    try {
      const parsed = JSON.parse(s.session_labels ?? "[]");
      if (Array.isArray(parsed)) labels = parsed.map(String);
    } catch {
      return;
    }
    if (labels.includes("Sauna")) return;
    const cleaned = cleanSessionLabels(labels, trained.get(String(s.id)) ?? []);
    if (JSON.stringify(cleaned) !== JSON.stringify(labels)) {
      db.runSync(`UPDATE sessions SET session_labels = ? WHERE id = ?;`, [
        JSON.stringify(cleaned),
        s.id,
      ]);
    }
  });
}

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

  if (version < 2) {
    db.execSync("BEGIN;");
    try {
      Object.entries(NOTES_RELINKS_2026_10).forEach(([id, [libraryId, name, weightKg]]) => {
        if (weightKg !== undefined) {
          db.runSync(
            `UPDATE exercises SET exercise_library_id = ?, name = ?, weight_kg = ? WHERE id = ?;`,
            [libraryId, name, weightKg, id]
          );
        } else {
          db.runSync(`UPDATE exercises SET exercise_library_id = ?, name = ? WHERE id = ?;`, [
            libraryId,
            name,
            id,
          ]);
        }
      });
      cleanAllSessionLabels();
      db.execSync(`PRAGMA user_version = 2;`);
      db.execSync("COMMIT;");
    } catch (err) {
      db.execSync("ROLLBACK;");
      throw err;
    }
  }
}
