// One-off (Oct 2026): add the exercises from your coach's plan that weren't
// in the library. Most are new equipment variants of existing movements
// (Front Squat → Squat, Sideways → Lat Pulldown, Plate → Front Raise,
// Javelin → Shoulder Press); Thruster, Power Clean and Triceps Pushaway are
// new movements. Patterns deliberately reuse existing ones (Thruster =
// Squat / press, Power Clean = Hinge) so the session builder treats them as
// alternatives instead of pushing them onto every session.
// Run `addCoachExercises_2026_10` with DRY_RUN_COACH = true first; existing
// ids are skipped, so it's safe to run again. Then Pull library in the app.
const DRY_RUN_COACH = true;

const COACH_EXERCISES_2026_10 = [
  {"id": "barbell_front_squat", "name": "Barbell Front Squat", "primary_muscle": "Legs", "tags": ["push", "legs", "quads", "compound", "barbell", "glutes", "glute-maximus"], "movement": "squat", "movement_name": "Squat", "variant": "Barbell · Front", "pattern": "Squat / press"},
  {"id": "barbell_thruster", "name": "Barbell Thruster", "primary_muscle": "Legs", "tags": ["push", "legs", "quads", "shoulders", "compound", "barbell", "front-delts", "triceps"], "movement": "thruster", "movement_name": "Thruster", "variant": "Barbell", "pattern": "Squat / press"},
  {"id": "barbell_power_clean", "name": "Barbell Power Clean", "primary_muscle": "Legs", "tags": ["pull", "legs", "back", "traps", "compound", "barbell", "hamstrings", "glutes", "glute-maximus"], "movement": "power_clean", "movement_name": "Power Clean", "variant": "Barbell", "pattern": "Hinge"},
  {"id": "sideways_lat_pulldown", "name": "Sideways Lat Pulldown", "primary_muscle": "Back", "tags": ["pull", "back", "compound", "cable", "lats"], "movement": "lat_pulldown", "movement_name": "Lat Pulldown", "variant": "Cable · Sideways", "pattern": "Vertical pull"},
  {"id": "cable_triceps_pushaway", "name": "Cable Triceps Pushaway", "primary_muscle": "Triceps", "tags": ["push", "triceps", "isolation", "cable", "long-head"], "movement": "triceps_pushaway", "movement_name": "Triceps Pushaway", "variant": "Cable", "pattern": "Overhead extension"},
  {"id": "plate_front_raise", "name": "Plate Front Raise", "primary_muscle": "Shoulders", "tags": ["push", "shoulders", "isolation", "plate", "front-delts"], "movement": "front_raise", "movement_name": "Front Raise", "variant": "Plate", "pattern": "Front raise"},
  {"id": "dumbbell_javelin_press", "name": "Dumbbell Javelin Press", "primary_muscle": "Shoulders", "tags": ["push", "shoulders", "compound", "dumbbell", "front-delts", "triceps", "core"], "movement": "shoulder_press", "movement_name": "Shoulder Press", "variant": "Dumbbell · Javelin", "pattern": "Overhead press"},
];

function addCoachExercises_2026_10() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_EXERCISES_LIB);
  const log = [];
  const mode = DRY_RUN_COACH ? "[DRY RUN] would" : "";
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((h) => String(h).trim());
  ["id", "name", "primary_muscle", "tags", "movement", "movement_name", "variant", "pattern"].forEach((h) => {
    if (headers.indexOf(h) < 0) throw new Error(`library tab has no "${h}" header`);
  });
  const idCol = headers.indexOf("id");
  const existing = new Set(values.slice(1).map((r) => String(r[idCol]).trim()).filter(Boolean));

  let added = 0;
  COACH_EXERCISES_2026_10.forEach((ex) => {
    if (existing.has(ex.id)) return log.push(`skip ${ex.id} (already in library)`);
    const row = new Array(headers.length).fill("");
    Object.keys(ex).forEach((k) => {
      const c = headers.indexOf(k);
      if (c >= 0) row[c] = k === "tags" ? "[" + ex.tags.map((t) => JSON.stringify(t)).join(", ") + "]" : ex[k];
    });
    const v = headers.indexOf("video_url");
    if (v >= 0) row[v] = "";
    log.push(`${mode} add ${ex.name} → ${ex.movement_name} · ${ex.variant} (${ex.pattern})`);
    if (!DRY_RUN_COACH) sheet.appendRow(row);
    added++;
  });
  log.push(`${mode} add ${added} exercises`);
  log.push(DRY_RUN_COACH ? "DRY RUN — nothing changed. Set DRY_RUN_COACH = false and run again." : "Done.");
  Logger.log(log.join("\n"));
  return log;
}
