// One-off (Oct 2026), follow-up to FixFromNotes: two more rows clarified by
// you. Run manually: select `fixNotes2_2026_10` → Run with DRY_RUN_NOTES2 =
// true first. Safe to run more than once. The phone applies the same on next
// launch (db/migrations.ts, user_version 3) — keep them in sync.
//
// - 6 Jul Lat Pulldown ("dual machine"): different machine, so the weight is
//   estimated for the regular pulldown from the sessions around it
//   (40 · 41.5 · 50 · — · 40 → 42.5 kg); the original goes into the note.
// - 17 May "switch this with row machine": Iso-Lateral Low Row → Iso-Lateral Row.
// - 15 Feb Dumbbell Lateral Raise logged 20 kg = both dumbbells → 10 per dumbbell.
// (The 9 Jul "Chest" label was removed by hand in the Sheet; the phone
//  removes it in user_version 4.)
const DRY_RUN_NOTES2 = true;

// exercise row id → fields to set
const NOTES2_FIXES = {
  "1783338839560": {
    weight_kg: 42.5,
    note: "dual machine; logged 50 kg, estimated 42.5 kg on the regular pulldown",
  },
  "1779023171200": {
    exercise_library_id: "iso_lateral_row_machine",
    name: "Iso-Lateral Row Machine",
  },
  "1771168514228": {
    weight_kg: 10,
    note: "logged 20 kg = both dumbbells; 10 per dumbbell",
  },
};

function fixNotes2_2026_10() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_EXERCISES);
  const log = [];
  const mode = DRY_RUN_NOTES2 ? "[DRY RUN] would" : "";
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((h) => String(h).trim());
  const col = (h) => headers.indexOf(h);

  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][col("id")]).trim();
    const fix = NOTES2_FIXES[id];
    if (!fix) continue;
    Object.keys(fix).forEach((field) => {
      const c = col(field);
      if (c < 0) throw new Error(`exercises tab has no "${field}" header`);
      if (String(values[i][c]) === String(fix[field])) return;
      log.push(`row ${i + 1} ${field}: ${mode} set "${values[i][c]}" → "${fix[field]}"`);
      if (!DRY_RUN_NOTES2) sheet.getRange(i + 1, c + 1).setValue(fix[field]);
    });
  }
  log.push(DRY_RUN_NOTES2 ? "DRY RUN — nothing changed. Set DRY_RUN_NOTES2 = false and run again." : "Done.");
  Logger.log(log.join("\n"));
  return log;
}
