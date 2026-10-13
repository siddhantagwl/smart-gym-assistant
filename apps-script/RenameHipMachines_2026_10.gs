// One-off (Oct 2026): make the hip machines' direction explicit.
//   Machine Hip Abduction (Outer) → Machine Hip Abduction (push out)
//   Machine Hip Adduction (Inner) → Machine Hip Adduction (squeeze in)
// Renames the library rows (name + movement_name) AND every logged exercise
// with those ids, because Prev logged / Try today / PRs match past entries
// by name. Run `renameHipMachines_2026_10` with DRY_RUN_RENAME = true first;
// safe to run again. The phone renames its logged entries on next launch
// (db/migrations.ts, user_version 6) and gets the library via Pull library.
const DRY_RUN_RENAME = true;

const HIP_RENAMES = {
  machine_hip_abduction: { name: "Machine Hip Abduction (push out)", movement_name: "Hip Abduction (push out)" },
  machine_hip_adduction: { name: "Machine Hip Adduction (squeeze in)", movement_name: "Hip Adduction (squeeze in)" },
};

function renameHipMachines_2026_10() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const log = [];
  const mode = DRY_RUN_RENAME ? "[DRY RUN] would" : "";

  const update = (sheet, idHeader, fields, label) => {
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map((h) => String(h).trim());
    const idCol = headers.indexOf(idHeader);
    if (idCol < 0) throw new Error(`${label} tab has no "${idHeader}" header`);
    let changed = 0;
    for (let i = 1; i < values.length; i++) {
      const rename = HIP_RENAMES[String(values[i][idCol]).trim()];
      if (!rename) continue;
      fields.forEach((f) => {
        const c = headers.indexOf(f);
        if (c < 0 || String(values[i][c]) === rename[f]) return;
        changed++;
        if (!DRY_RUN_RENAME) sheet.getRange(i + 1, c + 1).setValue(rename[f]);
      });
    }
    log.push(`${label}: ${mode} update ${changed} cells`);
  };

  update(ss.getSheetByName(SHEET_EXERCISES_LIB), "id", ["name", "movement_name"], "library");
  update(ss.getSheetByName(SHEET_EXERCISES), "exercise_library_id", ["name"], "exercises");

  log.push(DRY_RUN_RENAME ? "DRY RUN — nothing changed. Set DRY_RUN_RENAME = false and run again." : "Done.");
  Logger.log(log.join("\n"));
  return log;
}
