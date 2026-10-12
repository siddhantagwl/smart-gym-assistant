// One-off (Oct 2026) tag clean-up for the exercise library tab. Run manually
// from the Apps Script editor: select `fixTags_2026_10` → Run with
// DRY_RUN_TAGS = true first. Only tags cells change (plus the new T-Bar row);
// safe to run more than once.
//
// 1. Add "glutes" to every row that has a glute-* tag (so searching "glutes"
//    finds Leg Press, Hip Thrust Machine, RDLs…).
// 2. Add "iso-lateral" to every row whose name says Iso-Lateral.
// 3. Smith Machine Squat: drop "machine" (Smith rows are tagged "smith").
// 4. Hip Adduction: drop "inner-thigh" (same as "adductors").
// 5. T-Bar Row split: the existing t_bar_row becomes the Machine variant
//    (drop "barbell"); add "Landmine T-Bar Row" as the Barbell · Landmine
//    variant of the same movement.
const DRY_RUN_TAGS = true;

function fixTags_2026_10() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_EXERCISES_LIB);
  const log = [];
  const mode = DRY_RUN_TAGS ? "[DRY RUN] would" : "";

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((h) => String(h).trim());
  const col = (h) => headers.indexOf(h);
  ["id", "name", "tags", "movement", "movement_name", "variant"].forEach((h) => {
    if (col(h) < 0) throw new Error(`library tab has no "${h}" header`);
  });
  const fmt = (tags) => "[" + tags.map((t) => JSON.stringify(t)).join(", ") + "]";

  let changed = 0;
  const ids = new Set();
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][col("id")]).trim();
    if (!id) continue;
    ids.add(id);
    const name = String(values[i][col("name")]);
    let tags;
    try {
      tags = JSON.parse(String(values[i][col("tags")]));
    } catch (e) {
      log.push(`skip ${id}: tags cell isn't valid JSON`);
      continue;
    }
    const before = fmt(tags);

    // 1. glutes group tag before the first glute-* tag
    const g = tags.findIndex((t) => /^glute-/.test(t));
    if (g >= 0 && tags.indexOf("glutes") < 0) tags.splice(g, 0, "glutes");
    // 2. iso-lateral after the equipment tag
    if (/iso-lateral/i.test(name) && tags.indexOf("iso-lateral") < 0) {
      const eq = tags.findIndex((t) => ["machine", "cable", "dumbbell", "barbell", "smith"].indexOf(t) >= 0);
      tags.splice(eq >= 0 ? eq + 1 : tags.length, 0, "iso-lateral");
    }
    // 3–5. specific rows
    if (id === "smith_machine_squat") tags = tags.filter((t) => t !== "machine");
    if (id === "machine_hip_adduction") tags = tags.filter((t) => t !== "inner-thigh");
    if (id === "t_bar_row") tags = tags.filter((t) => t !== "barbell");

    const after = fmt(tags);
    if (after !== before) {
      changed++;
      log.push(`${name}: ${mode} ${before} → ${after}`);
      if (!DRY_RUN_TAGS) sheet.getRange(i + 1, col("tags") + 1).setValue(after);
    }
    if (id === "t_bar_row") {
      const set = (h, v) => {
        if (String(values[i][col(h)]) === v) return;
        log.push(`${name}.${h}: ${mode} set "${values[i][col(h)]}" → "${v}"`);
        if (!DRY_RUN_TAGS) sheet.getRange(i + 1, col(h) + 1).setValue(v);
      };
      set("movement", "t_bar_row");
      set("movement_name", "T-Bar Row");
      set("variant", "Machine");
    }
  }

  if (!ids.has("landmine_t_bar_row")) {
    const row = new Array(headers.length).fill("");
    const put = (h, v) => { if (col(h) >= 0) row[col(h)] = v; };
    put("id", "landmine_t_bar_row");
    put("name", "Landmine T-Bar Row");
    put("video_url", "");
    put("primary_muscle", "Back");
    put("tags", fmt(["pull", "back", "compound", "barbell", "lats", "rhomboids"]));
    put("movement", "t_bar_row");
    put("movement_name", "T-Bar Row");
    put("variant", "Barbell · Landmine");
    log.push(`${mode} add Landmine T-Bar Row → T-Bar Row · Barbell · Landmine`);
    if (!DRY_RUN_TAGS) sheet.appendRow(row);
  } else {
    log.push("skip Landmine T-Bar Row (already in library)");
  }

  log.push(`${mode} change tags on ${changed} rows`);
  log.push(DRY_RUN_TAGS ? "DRY RUN — nothing changed. Set DRY_RUN_TAGS = false and run again." : "Done.");
  Logger.log(log.join("\n"));
  return log;
}
