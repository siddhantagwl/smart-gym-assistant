// One-off library cleanup (Oct 2026). Run manually from the Apps Script
// editor: select `cleanupLibrary_2026_10` → Run. Safe to run more than once.
//
// 1. Library fixes: Barbell Shrug → Traps; Deadlift → Back; equipment tag on
//    Seated Dip + Arm Extension.
// 2. Adds 8 exercises that were logged but missing from the library.
// 3. Relinks 13 logged exercise rows (by exercise id) to their library entry
//    (name + exercise_library_id). The app applies the same relink to its
//    local DB on next launch (db/migrations.ts) — keep the two in sync.
//
// DRY_RUN = true only logs what would change (View → Logs / Execution log).
// Set it to false and run again to apply.
const DRY_RUN = true;

const LIBRARY_FIXES = {
  barbell_shrug: {
    primary_muscle: "Traps",
    tags: ["pull", "traps", "isolation", "barbell", "upper-traps"],
  },
  deadlift_conventional: { primary_muscle: "Back" },
  seated_dip: {
    tags: ["push", "triceps", "compound", "machine", "lateral-head", "medial-head", "lower-chest"],
  },
  arm_extension: {
    tags: ["push", "triceps", "isolation", "machine", "lateral-head", "medial-head"],
  },
};

const LIBRARY_ADDITIONS = [
  { id: "cable_front_raise", name: "Cable Front Raise", primary_muscle: "Shoulders", tags: ["push", "shoulders", "isolation", "cable", "front-delts"] },
  { id: "seated_cable_row_narrow", name: "Seated Cable Row (Narrow Grip)", primary_muscle: "Back", tags: ["pull", "back", "compound", "cable", "lats", "rhomboids"] },
  { id: "cable_bicep_curl", name: "Cable Bicep Curl", primary_muscle: "Biceps", tags: ["pull", "biceps", "isolation", "cable", "short-head", "long-head"] },
  { id: "cable_wrist_curl", name: "Cable Wrist Curl", primary_muscle: "Forearms", tags: ["pull", "forearms", "isolation", "cable", "forearm-flexors"] },
  { id: "cable_upright_row", name: "Cable Upright Row", primary_muscle: "Shoulders", tags: ["pull", "shoulders", "compound", "cable", "lateral-delts", "traps"] },
  { id: "cable_shrug", name: "Cable Shrug", primary_muscle: "Traps", tags: ["pull", "traps", "isolation", "cable", "upper-traps"] },
  { id: "hack_squat_machine", name: "Hack Squat Machine", primary_muscle: "Legs", tags: ["push", "legs", "quads", "compound", "machine", "glute-maximus"] },
  { id: "shoulder_press_machine", name: "Shoulder Press Machine", primary_muscle: "Shoulders", tags: ["push", "shoulders", "compound", "machine", "front-delts", "triceps"] },
];

// exercise row id → [exercise_library_id, name]
const EXERCISE_RELINKS = {
  "1782132173225": ["cable_front_raise", "Cable Front Raise"], // was "Front Raise cable"
  "1783599011245": ["dumbbell_lateral_raise", "Dumbbell Lateral Raise"], // "Dumbbell Side Delts"
  "1785411552152": ["cable_crunches", "Cable Crunches"], // "abs and stretch"
  "1787509647373": ["seated_cable_row_narrow", "Seated Cable Row (Narrow Grip)"], // "Seated Cable Row narrow"
  "1787512424434": ["cable_bicep_curl", "Cable Bicep Curl"], // "cable bicep curl"
  "1787512720184": ["cable_wrist_curl", "Cable Wrist Curl"], // "cable forearm curl"
  "1787570661376": ["barbell_bench_press", "Barbell Bench Press"], // unnamed warm-up, 24 Aug
  "1788177950202": ["cable_upright_row", "Cable Upright Row"], // "upright row"
  "1788178455746": ["cable_shrug", "Cable Shrug"], // "cable shrugs"
  "1790077845000": ["cable_bicep_curl", "Cable Bicep Curl"], // "cable bicep curl"
  "1790249083436": ["cable_crunches", "Cable Crunches"], // "abs"
  "1791052716076": ["hack_squat_machine", "Hack Squat Machine"], // "hack squat machine"
  "1791055996584": ["shoulder_press_machine", "Shoulder Press Machine"], // "Shoulder Press Machine"
};

function cleanupLibrary_2026_10() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const libSheet = ss.getSheetByName(SHEET_EXERCISES_LIB);
  const exSheet = ss.getSheetByName(SHEET_EXERCISES);
  const log = [];
  const mode = DRY_RUN ? "[DRY RUN] would" : "";

  // ---- library: fixes + additions (all by header name) ----
  const lib = readTable_(libSheet);
  const libCol = (name) => lib.headers.indexOf(name) + 1;
  ["id", "name", "primary_muscle", "tags"].forEach((h) => {
    if (libCol(h) < 1) throw new Error(`library tab has no "${h}" header`);
  });

  Object.keys(LIBRARY_FIXES).forEach((id) => {
    const rowIdx = lib.rowById[id];
    if (!rowIdx) return log.push(`library: ${id} not found — skipped`);
    const fix = LIBRARY_FIXES[id];
    Object.keys(fix).forEach((field) => {
      const value = field === "tags" ? tagsText_(fix[field]) : fix[field];
      const cell = libSheet.getRange(rowIdx, libCol(field));
      if (String(cell.getValue()) === String(value)) return;
      log.push(`library ${id}.${field}: ${mode} set ${cell.getValue()} → ${value}`);
      if (!DRY_RUN) cell.setValue(value);
    });
  });

  LIBRARY_ADDITIONS.forEach((add) => {
    if (lib.rowById[add.id]) return log.push(`library: ${add.id} already exists — skipped`);
    const row = new Array(lib.headers.length).fill("");
    row[libCol("id") - 1] = add.id;
    row[libCol("name") - 1] = add.name;
    row[libCol("primary_muscle") - 1] = add.primary_muscle;
    row[libCol("tags") - 1] = tagsText_(add.tags);
    if (libCol("video_url") > 0) row[libCol("video_url") - 1] = "";
    log.push(`library: ${mode} add ${add.id} (${add.name}, ${add.primary_muscle})`);
    if (!DRY_RUN) libSheet.appendRow(row);
  });

  // ---- exercises: relink by row id ----
  const ex = readTable_(exSheet);
  const exCol = (name) => ex.headers.indexOf(name) + 1;
  ["id", "exercise_library_id", "name"].forEach((h) => {
    if (exCol(h) < 1) throw new Error(`exercises tab has no "${h}" header`);
  });

  Object.keys(EXERCISE_RELINKS).forEach((exId) => {
    const rowIdx = ex.rowById[exId];
    if (!rowIdx) return log.push(`exercises: row ${exId} not found — skipped`);
    const [libId, name] = EXERCISE_RELINKS[exId];
    const idCell = exSheet.getRange(rowIdx, exCol("exercise_library_id"));
    const nameCell = exSheet.getRange(rowIdx, exCol("name"));
    if (String(idCell.getValue()) === libId && String(nameCell.getValue()) === name) return;
    log.push(`exercises row ${rowIdx} (${exId}): ${mode} relink "${nameCell.getValue()}" → ${name} [${libId}]`);
    if (!DRY_RUN) {
      idCell.setValue(libId);
      nameCell.setValue(name);
    }
  });

  log.push(DRY_RUN ? "DRY RUN — nothing changed. Set DRY_RUN = false and run again to apply." : "Done.");
  Logger.log(log.join("\n"));
  return log;
}

// Same text format as the existing library cells: ["pull", "back", …]
function tagsText_(tags) {
  return "[" + tags.map((t) => JSON.stringify(t)).join(", ") + "]";
}

// Header list + map of id → 1-based sheet row (data starts at row 2).
function readTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((h) => String(h).trim());
  const idCol = headers.indexOf("id");
  const rowById = {};
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][idCol]).trim();
    if (id) rowById[id] = i + 1;
  }
  return { headers, rowById };
}
