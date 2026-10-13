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

// Follow-up clarified by the user: exercise row id → fields to set.
// Mirrors NOTES2_FIXES in apps-script/FixNotes2_2026_10.gs.
const NOTES2_FIXES_2026_10: Record<
  string,
  { weight_kg?: number; note?: string; exercise_library_id?: string; name?: string }
> = {
  // 6 Jul Lat Pulldown on a different ("dual") machine: weight estimated for
  // the regular pulldown from the sessions around it.
  "1783338839560": {
    weight_kg: 42.5,
    note: "dual machine; logged 50 kg, estimated 42.5 kg on the regular pulldown",
  },
  // 17 May "switch this with row machine".
  "1779023171200": {
    exercise_library_id: "iso_lateral_row_machine",
    name: "Iso-Lateral Row Machine",
  },
};

// Last clean-ups confirmed by the user: 15 Feb lateral raise was both
// dumbbells (20 → 10 per dumbbell; also in FixNotes2_2026_10.gs), and the
// 9 Jul session had no chest work (label removed by hand in the Sheet).
const LATERAL_RAISE_FIX = { id: "1771168514228", weightKg: 10, note: "logged 20 kg = both dumbbells; 10 per dumbbell" };
const DROP_LABEL = { sessionId: "1783595515984", label: "Chest" };

// 13 Oct 2026: the hold-to-finish bug started the queued Lat Pulldown on
// finger release (set 1 ran 230 s). Set 1 → 44 s, start moved to when it
// really began. Mirrors apps-script/FixAutoStart_2026_10_13.gs.
const AUTOSTART_FIX_2026_10_13 = {
  id: "1791889222346",
  startTime: "2026-10-13T10:52:23.044Z",
  setLog:
    '[{"reps":8,"weightKg":60,"weightUnit":"kg","durationSec":44},{"reps":8,"weightKg":60,"weightUnit":"kg","durationSec":46},{"reps":8,"weightKg":60,"weightUnit":"kg","durationSec":42}]',
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

  if (version < 3) {
    db.execSync("BEGIN;");
    try {
      Object.entries(NOTES2_FIXES_2026_10).forEach(([id, fields]) => {
        Object.entries(fields).forEach(([column, value]) => {
          // Column names come from the constant above, never from data.
          db.runSync(`UPDATE exercises SET ${column} = ? WHERE id = ?;`, [value, id]);
        });
      });
      db.execSync(`PRAGMA user_version = 3;`);
      db.execSync("COMMIT;");
    } catch (err) {
      db.execSync("ROLLBACK;");
      throw err;
    }
  }

  if (version < 4) {
    db.execSync("BEGIN;");
    try {
      db.runSync(`UPDATE exercises SET weight_kg = ?, note = ? WHERE id = ?;`, [
        LATERAL_RAISE_FIX.weightKg,
        LATERAL_RAISE_FIX.note,
        LATERAL_RAISE_FIX.id,
      ]);
      const row = db.getFirstSync(`SELECT session_labels FROM sessions WHERE id = ?;`, [
        DROP_LABEL.sessionId,
      ]) as { session_labels: string | null } | null;
      if (row) {
        try {
          const labels = JSON.parse(row.session_labels ?? "[]");
          if (Array.isArray(labels) && labels.includes(DROP_LABEL.label)) {
            db.runSync(`UPDATE sessions SET session_labels = ? WHERE id = ?;`, [
              JSON.stringify(labels.filter((l: string) => l !== DROP_LABEL.label)),
              DROP_LABEL.sessionId,
            ]);
          }
        } catch {}
      }
      db.execSync(`PRAGMA user_version = 4;`);
      db.execSync("COMMIT;");
    } catch (err) {
      db.execSync("ROLLBACK;");
      throw err;
    }
  }

  if (version < 5) {
    db.execSync("BEGIN;");
    try {
      db.runSync(`UPDATE exercises SET start_time = ?, set_log = ? WHERE id = ?;`, [
        AUTOSTART_FIX_2026_10_13.startTime,
        AUTOSTART_FIX_2026_10_13.setLog,
        AUTOSTART_FIX_2026_10_13.id,
      ]);
      db.execSync(`PRAGMA user_version = 5;`);
      db.execSync("COMMIT;");
    } catch (err) {
      db.execSync("ROLLBACK;");
      throw err;
    }
  }
}
