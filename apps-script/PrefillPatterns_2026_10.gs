// One-off (Oct 2026): add a `pattern` column to the exercise library — what
// a movement actually trains within its muscle ("Horizontal row", "Vertical
// pull", "Fly"…). Movements with the same pattern do the same job, so the app
// can warn when you double up in a session and show which patterns are still
// open. Run manually: select `prefillPatterns_2026_10` → Run with
// DRY_RUN_PATTERNS = true first. Fills ONLY empty cells (by movement), so
// your own edits are kept; safe to run again. New library rows: fill
// `pattern` yourself (empty = the movement counts as its own pattern).
const DRY_RUN_PATTERNS = true;

const PATTERNS_BY_MOVEMENT_2026_10 = {
  bench_press: "Flat press",
  chest_press: "Flat press",
  push_up: "Flat press",
  decline_press: "Decline press",
  incline_press: "Incline press",
  chest_fly: "Fly",
  lat_pulldown: "Vertical pull",
  pull_up: "Vertical pull",
  chin_up: "Vertical pull",
  seated_row: "Horizontal row",
  bent_over_row: "Horizontal row",
  chest_supported_row: "Horizontal row",
  t_bar_row: "Horizontal row",
  high_row: "High row",
  pullover: "Lat isolation",
  straight_arm_pulldown: "Lat isolation",
  deadlift: "Hinge",
  back_extension: "Hinge",
  dead_hang: "Grip / hang",
  bicep_curl: "Curl",
  concentration_curl: "Curl",
  preacher_curl: "Preacher curl",
  hammer_curl: "Hammer curl",
  triceps_pushdown: "Pushdown / kickback",
  arm_extension: "Pushdown / kickback",
  triceps_kickback: "Pushdown / kickback",
  overhead_triceps_extension: "Overhead extension",
  lying_triceps_extension: "Skull crusher",
  dips: "Press / dip",
  triceps_press: "Press / dip",
  close_grip_bench_press: "Press / dip",
  shoulder_press: "Overhead press",
  arnold_press: "Overhead press",
  lateral_raise: "Lateral raise",
  upright_row: "Lateral raise",
  front_raise: "Front raise",
  rear_delt_fly: "Rear delt",
  face_pull: "Rear delt",
  shrug: "Shrug",
  squat: "Squat / press",
  leg_press: "Squat / press",
  lunge: "Lunge",
  bulgarian_split_squat: "Lunge",
  leg_extension: "Knee extension",
  leg_curl: "Leg curl",
  romanian_deadlift: "Hinge",
  hip_thrust: "Hip extension",
  rear_kick: "Hip extension",
  hip_abduction: "Abduction",
  hip_adduction: "Adduction",
  calf_raise: "Calves",
  crunch: "Flexion",
  leg_raise: "Flexion",
  plank: "Anti-extension",
  side_plank: "Obliques",
  woodchopper: "Obliques",
  pallof_press: "Obliques",
  wrist_curl: "Wrist curl",
  farmers_carry: "Grip / carry",
  cycling: "Cardio",
  treadmill_running: "Cardio",
  elliptical: "Cardio",
  stair_climber: "Cardio",
  rowing_machine: "Cardio",
};

function prefillPatterns_2026_10() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_EXERCISES_LIB);
  const log = [];
  const mode = DRY_RUN_PATTERNS ? "[DRY RUN] would" : "";

  let headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map((h) => String(h).trim());
  while (headers.length && headers[headers.length - 1] === "") headers.pop();
  if (headers.indexOf("pattern") < 0) {
    headers.push("pattern");
    log.push(`${mode} add header "pattern" in column ${headers.length}`);
    if (!DRY_RUN_PATTERNS) sheet.getRange(1, headers.length).setValue("pattern");
  }
  const idCol = headers.indexOf("id");
  const movCol = headers.indexOf("movement");
  const patCol = headers.indexOf("pattern");
  if (idCol < 0 || movCol < 0) throw new Error('library tab needs "id" and "movement" headers');

  const values = sheet.getDataRange().getValues();
  let filled = 0;
  const unmapped = [];
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][idCol]).trim();
    if (!id) continue;
    const current = patCol < values[i].length ? String(values[i][patCol]).trim() : "";
    if (current) continue; // hand edits win
    const movement = String(values[i][movCol]).trim() || id;
    const pattern = PATTERNS_BY_MOVEMENT_2026_10[movement];
    if (!pattern) { unmapped.push(id); continue; }
    filled++;
    if (!DRY_RUN_PATTERNS) sheet.getRange(i + 1, patCol + 1).setValue(pattern);
  }
  log.push(`${mode} fill ${filled} empty pattern cells`);
  if (unmapped.length) log.push(`no pattern known, left empty (fill by hand): ${unmapped.join(", ")}`);
  log.push(DRY_RUN_PATTERNS ? "DRY RUN — nothing changed. Set DRY_RUN_PATTERNS = false and run again." : "Done.");
  Logger.log(log.join("\n"));
  return log;
}
