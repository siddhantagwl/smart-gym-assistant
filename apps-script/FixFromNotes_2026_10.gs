// One-off (Oct 2026): fix logged data that your notes say was wrong, and
// clean up session labels. Run manually: select `fixFromNotes_2026_10` → Run
// with DRY_RUN_NOTES = true first. Safe to run more than once.
//
// 1. Library: add 3 missing variants (Decline Press · Barbell, Overhead
//    Triceps Extension · Cable Straight Bar, Front Raise · Barbell).
// 2. Exercises: relink 9 rows logged as the wrong equipment (per their
//    notes) and fix the name of 2 "dips" rows. Row "barbell, total 40" also
//    gets weight 40.
// 3. Sessions: labels Quadriceps / Hamstrings / Glutes / Calves → Legs, and
//    add muscles that were trained but not labelled (Cardio never added).
// The phone applies the same 2 + 3 on next launch (db/migrations.ts, v2)
// and gets 1 via Pull library. Keep the two in sync.
const DRY_RUN_NOTES = true;

const NOTES_LIBRARY_ADDS = [
  { id: "decline_barbell_bench_press", name: "Decline Barbell Bench Press", primary_muscle: "Chest",
    tags: ["push", "chest", "compound", "barbell", "lower-chest", "triceps", "front-delts"],
    movement: "decline_press", movement_name: "Decline Press", variant: "Barbell", pattern: "Decline press" },
  { id: "cable_straight_bar_overhead_triceps_extension", name: "Cable Straight Bar Overhead Triceps Extension", primary_muscle: "Triceps",
    tags: ["push", "triceps", "isolation", "cable", "long-head"],
    movement: "overhead_triceps_extension", movement_name: "Overhead Triceps Extension", variant: "Cable · Straight Bar", pattern: "Overhead extension" },
  { id: "barbell_front_raise", name: "Barbell Front Raise", primary_muscle: "Shoulders",
    tags: ["push", "shoulders", "isolation", "barbell", "front-delts"],
    movement: "front_raise", movement_name: "Front Raise", variant: "Barbell", pattern: "Front raise" },
];

// exercise row id → [exercise_library_id, name, weight_kg (optional)]
const NOTES_RELINKS = {
  "1772050757911": ["cable_rope_overhead_triceps_extension", "Cable Rope Overhead Triceps Extension"], // "it wasnt machine"
  "1772051334330": ["seated_dip", "Seated Dip"], // "seated dip"
  "1778681268410": ["barbell_front_raise", "Barbell Front Raise"], // "barbell"
  "1788781688521": ["cable_straight_bar_overhead_triceps_extension", "Cable Straight Bar Overhead Triceps Extension"], // "straight bar"
  "1790246053991": ["incline_dumbbell_press", "Incline Dumbbell Press"], // "dumbbell"
  "1790247136313": ["cable_crossover", "Cable Crossover"], // "with cables"
  "1791723963538": ["incline_barbell_bench_press", "Incline Barbell Bench Press"], // "barbell"
  "1791724484132": ["decline_barbell_bench_press", "Decline Barbell Bench Press", 40], // "barbell, total 40"
  "1791807965410": ["dumbbell_romanian_deadlift", "Dumbbell Romanian Deadlift"], // "dumbbell"
  "1771961539920": ["dips", "Dips"], // name was "dips"
  "1789476940807": ["dips", "Dips"], // name was "dips"
};

const LEGACY_MUSCLES = { Quadriceps: "Legs", Hamstrings: "Legs", Glutes: "Legs", Calves: "Legs" };

// Same rule as domain/muscles.ts cleanSessionLabels().
function cleanLabels_(labels, trained) {
  const out = [];
  const add = (m) => {
    const t = String(m).trim();
    const n = LEGACY_MUSCLES[t] || t;
    if (n && out.indexOf(n) < 0) out.push(n);
  };
  labels.forEach(add);
  trained.filter((m) => m !== "Cardio" && m !== "Sauna").forEach(add);
  return out;
}

function fixFromNotes_2026_10() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const libSheet = ss.getSheetByName(SHEET_EXERCISES_LIB);
  const exSheet = ss.getSheetByName(SHEET_EXERCISES);
  const sesSheet = ss.getSheetByName(SHEET_SESSIONS);
  const log = [];
  const mode = DRY_RUN_NOTES ? "[DRY RUN] would" : "";
  const table = (sheet) => {
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map((h) => String(h).trim());
    return { values, headers, col: (h) => headers.indexOf(h) };
  };

  // ---- 1. library ----
  const lib = table(libSheet);
  const muscleById = {};
  for (let i = 1; i < lib.values.length; i++) {
    const id = String(lib.values[i][lib.col("id")]).trim();
    if (id) muscleById[id] = String(lib.values[i][lib.col("primary_muscle")]).trim();
  }
  NOTES_LIBRARY_ADDS.forEach((a) => {
    if (muscleById[a.id]) return log.push(`library: ${a.id} already exists — skipped`);
    const row = new Array(lib.headers.length).fill("");
    Object.keys(a).forEach((k) => {
      const c = lib.col(k);
      if (c >= 0) row[c] = k === "tags" ? "[" + a.tags.map((t) => JSON.stringify(t)).join(", ") + "]" : a[k];
    });
    log.push(`library: ${mode} add ${a.name} → ${a.movement_name} · ${a.variant}`);
    if (!DRY_RUN_NOTES) libSheet.appendRow(row);
    muscleById[a.id] = a.primary_muscle;
  });

  // ---- 2. exercises ----
  const ex = table(exSheet);
  ["id", "session_id", "exercise_library_id", "name", "weight_kg"].forEach((h) => {
    if (ex.col(h) < 0) throw new Error(`exercises tab has no "${h}" header`);
  });
  const trainedBySession = {};
  for (let i = 1; i < ex.values.length; i++) {
    const r = ex.values[i];
    const id = String(r[ex.col("id")]).trim();
    if (!id) continue;
    let libId = String(r[ex.col("exercise_library_id")]).trim();
    const fix = NOTES_RELINKS[id];
    if (fix) {
      const [newLib, newName, newWeight] = fix;
      const changes = [];
      if (libId !== newLib) changes.push(["exercise_library_id", newLib]);
      if (String(r[ex.col("name")]) !== newName) changes.push(["name", newName]);
      if (newWeight !== undefined && Number(r[ex.col("weight_kg")]) !== newWeight) changes.push(["weight_kg", newWeight]);
      if (changes.length) {
        log.push(`exercises row ${i + 1}: ${mode} "${r[ex.col("name")]}" → ${changes.map(([k, v]) => `${k}=${v}`).join(", ")}`);
        if (!DRY_RUN_NOTES) changes.forEach(([k, v]) => exSheet.getRange(i + 1, ex.col(k) + 1).setValue(v));
      }
      libId = newLib;
    }
    const sid = String(r[ex.col("session_id")]).trim();
    if (muscleById[libId]) (trainedBySession[sid] = trainedBySession[sid] || []).push(muscleById[libId]);
  }

  // ---- 3. session labels ----
  const ses = table(sesSheet);
  let labelled = 0;
  for (let i = 1; i < ses.values.length; i++) {
    const r = ses.values[i];
    const sid = String(r[ses.col("id")]).trim();
    if (!sid) continue;
    let labels = [];
    try { labels = JSON.parse(String(r[ses.col("session_labels")]) || "[]"); } catch (e) { continue; }
    if (labels.indexOf("Sauna") >= 0) continue;
    const cleaned = cleanLabels_(labels, trainedBySession[sid] || []);
    if (JSON.stringify(cleaned) === JSON.stringify(labels)) continue;
    labelled++;
    log.push(`sessions row ${i + 1} (${String(r[ses.col("start_time")]).slice(0, 10)}): ${mode} set labels ${JSON.stringify(labels)} → ${JSON.stringify(cleaned)}`);
    if (!DRY_RUN_NOTES) sesSheet.getRange(i + 1, ses.col("session_labels") + 1).setValue(JSON.stringify(cleaned));
  }

  log.push(`${mode} relabel ${labelled} sessions`);
  log.push(DRY_RUN_NOTES ? "DRY RUN — nothing changed. Set DRY_RUN_NOTES = false and run again." : "Done.");
  Logger.log(log.join("\n"));
  return log;
}
