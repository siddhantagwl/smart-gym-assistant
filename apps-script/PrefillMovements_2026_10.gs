// One-off (Oct 2026): pre-fill the exercise library's movement / equipment
// grouping. Run manually from the Apps Script editor: select
// `prefillMovements_2026_10` → Run (DRY_RUN_MOVEMENTS first).
//
// Adds three headers to the library tab if missing — movement, movement_name,
// variant — and fills them ONLY where the cell is empty, so anything you
// correct by hand in the Sheet is never overwritten. ids never change.
//   movement       groups variants of the same exercise (e.g. "squat")
//   movement_name  what the app shows for the group ("Squat")
//   variant        the equipment chip label ("Barbell", "Machine · Hack")
// New library rows later: fill these three columns yourself; an empty
// movement makes the app treat the row as its own single-variant movement.
const DRY_RUN_MOVEMENTS = true;

const MOVEMENTS_2026_10 = {
  barbell_bent_over_row: ["bent_over_row", "Bent-Over Row", "Barbell"],
  underhand_barbell_bent_over_row: ["bent_over_row", "Bent-Over Row", "Barbell \u00b7 Underhand"],
  single_arm_dumbbell_row: ["bent_over_row", "Bent-Over Row", "Dumbbell \u00b7 Single-Arm"],
  seated_cable_row: ["seated_row", "Seated Row", "Cable"],
  seated_cable_row_wide: ["seated_row", "Seated Row", "Cable \u00b7 Wide"],
  seated_cable_row_narrow: ["seated_row", "Seated Row", "Cable \u00b7 Narrow"],
  iso_lateral_row_machine: ["seated_row", "Seated Row", "Machine \u00b7 Iso-Lateral"],
  iso_lateral_low_row_machine: ["seated_row", "Seated Row", "Machine \u00b7 Iso-Lateral Low"],
  lever_row_machine: ["seated_row", "Seated Row", "Machine \u00b7 Lever"],
  barbell_bicep_curl: ["bicep_curl", "Bicep Curl", "Barbell"],
  ez_bar_bicep_curl: ["bicep_curl", "Bicep Curl", "EZ-Bar"],
  dumbbell_bicep_curl: ["bicep_curl", "Bicep Curl", "Dumbbell"],
  seated_incline_dumbbell_bicep_curl: ["bicep_curl", "Bicep Curl", "Dumbbell \u00b7 Incline"],
  cable_bicep_curl: ["bicep_curl", "Bicep Curl", "Cable"],
  behind_the_back_cable_curl: ["bicep_curl", "Bicep Curl", "Cable \u00b7 Behind-the-Back"],
  barbell_bench_press: ["bench_press", "Bench Press", "Barbell"],
  dumbbell_bench_press: ["bench_press", "Bench Press", "Dumbbell"],
  iso_lateral_bench_press_machine: ["bench_press", "Bench Press", "Machine \u00b7 Iso-Lateral"],
  chest_press_machine: ["chest_press", "Chest Press", "Machine"],
  iso_lateral_chest_press_machine: ["chest_press", "Chest Press", "Machine \u00b7 Iso-Lateral"],
  incline_chest_press: ["incline_press", "Incline Press", "Machine"],
  iso_lateral_incline_chest_press_machine: ["incline_press", "Incline Press", "Machine \u00b7 Iso-Lateral"],
  dual_incline_chest_press_machine: ["incline_press", "Incline Press", "Machine \u00b7 Dual"],
  machine_pec_deck_fly: ["chest_fly", "Chest Fly", "Machine \u00b7 Pec Deck"],
  dumbbell_chest_fly: ["chest_fly", "Chest Fly", "Dumbbell"],
  cable_crossover: ["chest_fly", "Chest Fly", "Cable \u00b7 Crossover"],
  crunch: ["crunch", "Crunch", "Bodyweight"],
  machine_crunch: ["crunch", "Crunch", "Machine"],
  cable_crunches: ["crunch", "Crunch", "Cable"],
  barbell_wrist_curl: ["wrist_curl", "Wrist Curl", "Barbell"],
  cable_wrist_curl: ["wrist_curl", "Wrist Curl", "Cable"],
  standing_calf_raise_machine: ["calf_raise", "Calf Raise", "Machine \u00b7 Standing"],
  seated_calf_raise_machine: ["calf_raise", "Calf Raise", "Machine \u00b7 Seated"],
  barbell_squat: ["squat", "Squat", "Barbell"],
  smith_machine_squat: ["squat", "Squat", "Smith"],
  hack_squat_machine: ["squat", "Squat", "Machine \u00b7 Hack"],
  pendulum_squat: ["squat", "Squat", "Machine \u00b7 Pendulum"],
  dumbbell_goblet_squat: ["squat", "Squat", "Dumbbell \u00b7 Goblet"],
  barbell_overhead_press: ["shoulder_press", "Shoulder Press", "Barbell"],
  dumbbell_shoulder_press: ["shoulder_press", "Shoulder Press", "Dumbbell"],
  shoulder_press_machine: ["shoulder_press", "Shoulder Press", "Machine"],
  iso_lateral_shoulder_press_machine: ["shoulder_press", "Shoulder Press", "Machine \u00b7 Iso-Lateral"],
  dumbbell_lateral_raise: ["lateral_raise", "Lateral Raise", "Dumbbell"],
  machine_lateral_raise: ["lateral_raise", "Lateral Raise", "Machine"],
  cable_side_delts: ["lateral_raise", "Lateral Raise", "Cable"],
  front_raise: ["front_raise", "Front Raise", "Dumbbell"],
  cable_front_raise: ["front_raise", "Front Raise", "Cable"],
  barbell_shrug: ["shrug", "Shrug", "Barbell"],
  dumbbell_shrug: ["shrug", "Shrug", "Dumbbell"],
  cable_shrug: ["shrug", "Shrug", "Cable"],
  cable_rope_triceps_pushdown: ["triceps_pushdown", "Triceps Pushdown", "Cable \u00b7 Rope"],
  cable_straight_bar_triceps_pushdown: ["triceps_pushdown", "Triceps Pushdown", "Cable \u00b7 Straight Bar"],
  cable_single_arm_tricep_pushdown: ["triceps_pushdown", "Triceps Pushdown", "Cable \u00b7 Single-Arm"],
  underhand_tricep_pushdown: ["triceps_pushdown", "Triceps Pushdown", "Cable \u00b7 Underhand"],
  cable_rope_overhead_triceps_extension: ["overhead_triceps_extension", "Overhead Triceps Extension", "Cable \u00b7 Rope"],
  machine_overhead_triceps_extension: ["overhead_triceps_extension", "Overhead Triceps Extension", "Machine"],
  lying_triceps_extension: ["lying_triceps_extension", "Lying Triceps Extension", "Barbell"],
  dumbbell_lying_triceps_extension: ["lying_triceps_extension", "Lying Triceps Extension", "Dumbbell"],
  dips: ["dips", "Dips", "Bodyweight"],
  seated_dip: ["dips", "Dips", "Machine \u00b7 Seated"],
  dead_hang: ["dead_hang", "Dead Hang", "Bodyweight"],
  iso_lateral_high_row_machine: ["high_row", "High Row", "Machine \u00b7 Iso-Lateral"],
  lat_pulldown: ["lat_pulldown", "Lat Pulldown", "Cable"],
  t_bar_row: ["t_bar_row", "T-Bar Row", "Machine"],
  chin_up: ["chin_up", "Chin-Up", "Bodyweight"],
  straight_arm_pulldown: ["straight_arm_pulldown", "Straight-Arm Pulldown", "Cable"],
  deadlift_conventional: ["deadlift", "Deadlift", "Barbell"],
  pull_up: ["pull_up", "Pull-Up", "Bodyweight"],
  dumbbell_hammer_curl: ["hammer_curl", "Hammer Curl", "Dumbbell"],
  machine_preacher_curl: ["preacher_curl", "Preacher Curl", "Machine"],
  concentration_curl: ["concentration_curl", "Concentration Curl", "Dumbbell"],
  cycling: ["cycling", "Cycling", "Machine"],
  treadmill_running: ["treadmill_running", "Treadmill Running", "Machine"],
  elliptical_trainer: ["elliptical", "Elliptical", "Machine"],
  push_up: ["push_up", "Push-Up", "Bodyweight"],
  iso_lateral_decline_press_machine: ["decline_press", "Decline Press", "Machine \u00b7 Iso-Lateral"],
  leg_raise: ["leg_raise", "Leg Raise", "Bodyweight"],
  plank: ["plank", "Plank", "Bodyweight"],
  romanian_deadlift: ["romanian_deadlift", "Romanian Deadlift", "Barbell"],
  machine_leg_curl: ["leg_curl", "Leg Curl", "Machine"],
  machine_hip_abduction: ["hip_abduction", "Hip Abduction", "Machine"],
  hip_thrust: ["hip_thrust", "Hip Thrust", "Barbell"],
  machine_rear_kick: ["rear_kick", "Rear Kick", "Machine"],
  machine_hip_adduction: ["hip_adduction", "Hip Adduction", "Machine"],
  machine_leg_extension: ["leg_extension", "Leg Extension", "Machine"],
  leg_press_machine: ["leg_press", "Leg Press", "Machine"],
  bulgarian_split_squat: ["bulgarian_split_squat", "Bulgarian Split Squat", "Dumbbell"],
  rear_delt_fly: ["rear_delt_fly", "Rear Delt Fly", "Machine"],
  face_pull: ["face_pull", "Face Pull", "Cable"],
  arnold_press: ["arnold_press", "Arnold Press", "Dumbbell"],
  cable_upright_row: ["upright_row", "Upright Row", "Cable"],
  machine_triceps_press: ["triceps_press", "Triceps Press", "Machine"],
  arm_extension: ["arm_extension", "Arm Extension", "Machine"],
  close_grip_bench_press: ["close_grip_bench_press", "Close-Grip Bench Press", "Barbell"],
};

function prefillMovements_2026_10() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_EXERCISES_LIB);
  const log = [];
  const mode = DRY_RUN_MOVEMENTS ? "[DRY RUN] would" : "";
  const fields = ["movement", "movement_name", "variant"];

  let headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map((h) => String(h).trim());
  while (headers.length && headers[headers.length - 1] === "") headers.pop();
  fields.forEach((f) => {
    if (headers.indexOf(f) >= 0) return;
    headers.push(f);
    log.push(`${mode} add header "${f}" in column ${headers.length}`);
    if (!DRY_RUN_MOVEMENTS) sheet.getRange(1, headers.length).setValue(f);
  });

  const idCol = headers.indexOf("id");
  if (idCol < 0) throw new Error('library tab has no "id" header');
  const values = sheet.getDataRange().getValues();
  let filled = 0;
  const unmapped = [];
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][idCol]).trim();
    if (!id) continue;
    const m = MOVEMENTS_2026_10[id];
    if (!m) { unmapped.push(id); continue; }
    fields.forEach((f, k) => {
      const col = headers.indexOf(f);
      const current = col < values[i].length ? String(values[i][col]).trim() : "";
      if (current) return; // hand edits win
      filled++;
      if (!DRY_RUN_MOVEMENTS) sheet.getRange(i + 1, col + 1).setValue(m[k]);
    });
  }
  log.push(`${mode} fill ${filled} empty cells (movement / movement_name / variant)`);
  if (unmapped.length) log.push(`not in the map, left empty (fill by hand): ${unmapped.join(", ")}`);
  log.push(DRY_RUN_MOVEMENTS ? "DRY RUN — nothing changed. Set DRY_RUN_MOVEMENTS = false and run again." : "Done.");
  Logger.log(log.join("\n"));
  return log;
}
