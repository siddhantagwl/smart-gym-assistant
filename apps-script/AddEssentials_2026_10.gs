// One-off (Oct 2026): add the "essentials" missing from the library —
// mostly new equipment variants of movements you already have (Incline Press
// gets Barbell/Dumbbell, RDL gets Dumbbell/Smith, Leg Curl gets Seated/Lying…)
// plus a few new movements (Pullover, Kickback, Lunge, Back Extension,
// obliques, Farmer's Carry, Stair Climber, Rowing Machine).
//
// Run after PrefillMovements_2026_10 (it also creates the movement headers if
// they're missing). Select `addEssentials_2026_10` → Run with
// DRY_RUN_ESSENTIALS = true first. Rows whose id already exists are skipped,
// so it is safe to run more than once.
const DRY_RUN_ESSENTIALS = true;

const ESSENTIALS_2026_10 = [
  {"id": "incline_barbell_bench_press", "name": "Incline Barbell Bench Press", "primary_muscle": "Chest", "tags": ["push", "chest", "compound", "barbell", "upper-chest", "front-delts", "triceps"], "movement": "incline_press", "movement_name": "Incline Press", "variant": "Barbell"},
  {"id": "incline_dumbbell_press", "name": "Incline Dumbbell Press", "primary_muscle": "Chest", "tags": ["push", "chest", "compound", "dumbbell", "upper-chest", "front-delts", "triceps"], "movement": "incline_press", "movement_name": "Incline Press", "variant": "Dumbbell"},
  {"id": "assisted_pull_up_machine", "name": "Assisted Pull-Up Machine", "primary_muscle": "Back", "tags": ["pull", "back", "compound", "machine", "lats", "biceps"], "movement": "pull_up", "movement_name": "Pull-Up", "variant": "Machine · Assisted"},
  {"id": "chest_supported_dumbbell_row", "name": "Chest-Supported Dumbbell Row", "primary_muscle": "Back", "tags": ["pull", "back", "compound", "dumbbell", "lats", "rhomboids", "rear-delts"], "movement": "chest_supported_row", "movement_name": "Chest-Supported Row", "variant": "Dumbbell"},
  {"id": "chest_supported_row_machine", "name": "Chest-Supported Row Machine", "primary_muscle": "Back", "tags": ["pull", "back", "compound", "machine", "lats", "rhomboids", "rear-delts"], "movement": "chest_supported_row", "movement_name": "Chest-Supported Row", "variant": "Machine"},
  {"id": "close_grip_lat_pulldown", "name": "Close-Grip Lat Pulldown", "primary_muscle": "Back", "tags": ["pull", "back", "compound", "cable", "lats", "biceps"], "movement": "lat_pulldown", "movement_name": "Lat Pulldown", "variant": "Cable · Close Grip"},
  {"id": "single_arm_lat_pulldown", "name": "Single-Arm Lat Pulldown", "primary_muscle": "Back", "tags": ["pull", "back", "compound", "cable", "lats"], "movement": "lat_pulldown", "movement_name": "Lat Pulldown", "variant": "Cable · Single-Arm"},
  {"id": "dumbbell_pullover", "name": "Dumbbell Pullover", "primary_muscle": "Back", "tags": ["pull", "back", "isolation", "dumbbell", "lats", "chest"], "movement": "pullover", "movement_name": "Pullover", "variant": "Dumbbell"},
  {"id": "pullover_machine", "name": "Pullover Machine", "primary_muscle": "Back", "tags": ["pull", "back", "isolation", "machine", "lats"], "movement": "pullover", "movement_name": "Pullover", "variant": "Machine"},
  {"id": "dumbbell_triceps_kickback", "name": "Dumbbell Triceps Kickback", "primary_muscle": "Triceps", "tags": ["push", "triceps", "isolation", "dumbbell", "lateral-head"], "movement": "triceps_kickback", "movement_name": "Triceps Kickback", "variant": "Dumbbell"},
  {"id": "cable_triceps_kickback", "name": "Cable Triceps Kickback", "primary_muscle": "Triceps", "tags": ["push", "triceps", "isolation", "cable", "lateral-head"], "movement": "triceps_kickback", "movement_name": "Triceps Kickback", "variant": "Cable"},
  {"id": "dumbbell_walking_lunge", "name": "Dumbbell Walking Lunge", "primary_muscle": "Legs", "tags": ["push", "legs", "quads", "compound", "dumbbell", "glute-maximus"], "movement": "lunge", "movement_name": "Lunge", "variant": "Dumbbell · Walking"},
  {"id": "dumbbell_reverse_lunge", "name": "Dumbbell Reverse Lunge", "primary_muscle": "Legs", "tags": ["push", "legs", "quads", "compound", "dumbbell", "glute-maximus"], "movement": "lunge", "movement_name": "Lunge", "variant": "Dumbbell · Reverse"},
  {"id": "seated_leg_curl_machine", "name": "Seated Leg Curl", "primary_muscle": "Legs", "tags": ["pull", "legs", "hamstrings", "isolation", "machine"], "movement": "leg_curl", "movement_name": "Leg Curl", "variant": "Machine · Seated"},
  {"id": "lying_leg_curl_machine", "name": "Lying Leg Curl", "primary_muscle": "Legs", "tags": ["pull", "legs", "hamstrings", "isolation", "machine"], "movement": "leg_curl", "movement_name": "Leg Curl", "variant": "Machine · Lying"},
  {"id": "dumbbell_romanian_deadlift", "name": "Dumbbell Romanian Deadlift", "primary_muscle": "Legs", "tags": ["pull", "legs", "hamstrings", "compound", "dumbbell", "glute-maximus"], "movement": "romanian_deadlift", "movement_name": "Romanian Deadlift", "variant": "Dumbbell"},
  {"id": "smith_machine_romanian_deadlift", "name": "Smith Machine Romanian Deadlift", "primary_muscle": "Legs", "tags": ["pull", "legs", "hamstrings", "compound", "smith", "glute-maximus"], "movement": "romanian_deadlift", "movement_name": "Romanian Deadlift", "variant": "Smith"},
  {"id": "back_extension", "name": "Back Extension (Hyperextension)", "primary_muscle": "Back", "tags": ["pull", "back", "isolation", "bodyweight", "erector-spinae", "glute-maximus", "hamstrings"], "movement": "back_extension", "movement_name": "Back Extension", "variant": "Bodyweight"},
  {"id": "hip_thrust_machine", "name": "Hip Thrust Machine", "primary_muscle": "Legs", "tags": ["push", "legs", "compound", "machine", "glute-maximus"], "movement": "hip_thrust", "movement_name": "Hip Thrust", "variant": "Machine"},
  {"id": "smith_machine_hip_thrust", "name": "Smith Machine Hip Thrust", "primary_muscle": "Legs", "tags": ["push", "legs", "compound", "smith", "glute-maximus"], "movement": "hip_thrust", "movement_name": "Hip Thrust", "variant": "Smith"},
  {"id": "cable_woodchopper", "name": "Cable Woodchopper", "primary_muscle": "Core", "tags": ["core", "obliques", "isolation", "cable"], "movement": "woodchopper", "movement_name": "Woodchopper", "variant": "Cable"},
  {"id": "side_plank", "name": "Side Plank", "primary_muscle": "Core", "tags": ["core", "obliques", "isometric", "bodyweight"], "movement": "side_plank", "movement_name": "Side Plank", "variant": "Bodyweight"},
  {"id": "pallof_press", "name": "Pallof Press", "primary_muscle": "Core", "tags": ["core", "obliques", "isometric", "cable"], "movement": "pallof_press", "movement_name": "Pallof Press", "variant": "Cable"},
  {"id": "hanging_leg_raise", "name": "Hanging Leg Raise", "primary_muscle": "Core", "tags": ["core", "abs", "isolation", "bodyweight", "lower-abs"], "movement": "leg_raise", "movement_name": "Leg Raise", "variant": "Bodyweight · Hanging"},
  {"id": "farmers_carry", "name": "Farmer's Carry", "primary_muscle": "Forearms", "tags": ["carry", "forearms", "traps", "compound", "dumbbell", "grip"], "movement": "farmers_carry", "movement_name": "Farmer's Carry", "variant": "Dumbbell"},
  {"id": "stair_climber", "name": "Stair Climber", "primary_muscle": "Cardio", "tags": ["cardio", "legs", "machine"], "movement": "stair_climber", "movement_name": "Stair Climber", "variant": "Machine"},
  {"id": "rowing_machine", "name": "Rowing Machine", "primary_muscle": "Cardio", "tags": ["cardio", "back", "legs", "machine"], "movement": "rowing_machine", "movement_name": "Rowing Machine", "variant": "Machine"},
];

function addEssentials_2026_10() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_EXERCISES_LIB);
  const log = [];
  const mode = DRY_RUN_ESSENTIALS ? "[DRY RUN] would" : "";

  let headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map((h) => String(h).trim());
  while (headers.length && headers[headers.length - 1] === "") headers.pop();
  ["movement", "movement_name", "variant"].forEach((f) => {
    if (headers.indexOf(f) >= 0) return;
    headers.push(f);
    log.push(`${mode} add header "${f}"`);
    if (!DRY_RUN_ESSENTIALS) sheet.getRange(1, headers.length).setValue(f);
  });
  ["id", "name", "primary_muscle", "tags"].forEach((h) => {
    if (headers.indexOf(h) < 0) throw new Error(`library tab has no "${h}" header`);
  });

  const idCol = headers.indexOf("id");
  const existing = new Set(
    sheet.getDataRange().getValues().slice(1).map((r) => String(r[idCol]).trim()).filter(Boolean)
  );

  let added = 0;
  ESSENTIALS_2026_10.forEach((ex) => {
    if (existing.has(ex.id)) return log.push(`skip ${ex.id} (already in library)`);
    const row = new Array(headers.length).fill("");
    const set = (h, v) => { const c = headers.indexOf(h); if (c >= 0) row[c] = v; };
    set("id", ex.id);
    set("name", ex.name);
    set("video_url", "");
    set("primary_muscle", ex.primary_muscle);
    set("tags", "[" + ex.tags.map((t) => JSON.stringify(t)).join(", ") + "]");
    set("movement", ex.movement);
    set("movement_name", ex.movement_name);
    set("variant", ex.variant);
    log.push(`${mode} add ${ex.name}  →  ${ex.movement_name} · ${ex.variant}`);
    if (!DRY_RUN_ESSENTIALS) sheet.appendRow(row);
    added++;
  });

  log.push(`${mode} add ${added} exercises`);
  log.push(DRY_RUN_ESSENTIALS ? "DRY RUN — nothing changed. Set DRY_RUN_ESSENTIALS = false and run again." : "Done.");
  Logger.log(log.join("\n"));
  return log;
}
