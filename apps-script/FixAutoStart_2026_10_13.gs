// One-off (13 Oct 2026): undo the side effect of the hold-to-finish bug
// (fixed in AddExercise: Start/Finish exercise buttons have distinct keys).
// Finishing T-Bar Row started the queued Lat Pulldown on finger release, so
// its set 1 ran 230 s and the exercise "started" 1 s after T-Bar Row.
// Set 1 is set to 44 s (like sets 2–3: 46, 42) and the start moved to when
// set 1 really began. Run `fixAutoStart_2026_10_13` with DRY_RUN_AUTOSTART =
// true first. The phone applies the same (db/migrations.ts, user_version 5).
const DRY_RUN_AUTOSTART = true;

const AUTOSTART_FIX = {
  id: "1791889222346",
  start_time: "2026-10-13T10:52:23.044Z",
  set_log:
    '[{"reps":8,"weightKg":60,"weightUnit":"kg","durationSec":44},{"reps":8,"weightKg":60,"weightUnit":"kg","durationSec":46},{"reps":8,"weightKg":60,"weightUnit":"kg","durationSec":42}]',
};

function fixAutoStart_2026_10_13() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_EXERCISES);
  const log = [];
  const mode = DRY_RUN_AUTOSTART ? "[DRY RUN] would" : "";
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((h) => String(h).trim());
  const col = (h) => headers.indexOf(h);
  ["id", "start_time", "set_log"].forEach((h) => {
    if (col(h) < 0) throw new Error(`exercises tab has no "${h}" header`);
  });

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][col("id")]).trim() !== AUTOSTART_FIX.id) continue;
    ["start_time", "set_log"].forEach((field) => {
      const current = values[i][col(field)];
      const currentText = current instanceof Date ? current.toISOString() : String(current);
      if (currentText === AUTOSTART_FIX[field]) return;
      log.push(`row ${i + 1} ${field}: ${mode} set ${currentText} → ${AUTOSTART_FIX[field]}`);
      if (!DRY_RUN_AUTOSTART) sheet.getRange(i + 1, col(field) + 1).setValue(AUTOSTART_FIX[field]);
    });
  }
  log.push(DRY_RUN_AUTOSTART ? "DRY RUN — nothing changed. Set DRY_RUN_AUTOSTART = false and run again." : "Done.");
  Logger.log(log.join("\n"));
  return log;
}
