// Google Apps Script backing Sadhana's Sheets sync (bound to the Sheet).
// Constants SHARED_SECRET, SPREADSHEET_ID, SHEET_SESSIONS, SHEET_EXERCISES and
// SHEET_EXERCISES_LIB live in a separate file in the Apps Script project and
// are intentionally NOT in this repo (it's public).
//
// Deploy: Apps Script editor → paste this file over Code.gs → Deploy →
// Manage deployments → ✏️ Edit → Version: New version → Deploy. Editing the
// existing deployment keeps the web-app URL the app already uses.

// Exercise fields added after the original 11-column layout. Written by
// header name (headers are created on first push if missing) so existing
// columns never shift. Restore (doGet → sheetToJson) reads by header, so
// these round-trip without further changes.
const EXTRA_EXERCISE_FIELDS = ["weight_unit", "rest_periods", "set_log"];
const BASE_EXERCISE_COLUMNS = 11;

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.secret !== SHARED_SECRET) {
      return error("Unauthorized");
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sessionsSheet = ss.getSheetByName(SHEET_SESSIONS);
    const exercisesSheet = ss.getSheetByName(SHEET_EXERCISES);

    const existingSessionIds = getExistingIds(sessionsSheet);
    const existingExerciseIds = getExistingIds(exercisesSheet);
    const exerciseHeaders = ensureHeaders(
      exercisesSheet,
      EXTRA_EXERCISE_FIELDS,
      BASE_EXERCISE_COLUMNS
    );

    const debug = body.debug === true;
    const debugInfo = debug
      ? {
          existingSessionsCount: existingSessionIds.size,
          existingExercisesCount: existingExerciseIds.size,
          existingSessionsSample: Array.from(existingSessionIds).slice(0, 5),
          existingExercisesSample: Array.from(existingExerciseIds).slice(0, 5),
          incomingSessionsCount: Array.isArray(body.sessions) ? body.sessions.length : 0,
          incomingExercisesCount: Array.isArray(body.exercises) ? body.exercises.length : 0,
          exerciseHeaders: exerciseHeaders,
        }
      : null;

    let newSessions = 0;
    let newExercises = 0;

    // add session to the sheet
    body.sessions.forEach((s) => {
      const sid = String(s.id).trim();
      if (!sid) return;
      if (existingSessionIds.has(sid)) return;

      sessionsSheet.appendRow([
        sid,
        s.start_time,
        s.end_time || "",
        JSON.stringify(s.session_labels || []), // new structure
        s.source || "live",
        s.note || "",
      ]);

      existingSessionIds.add(sid);
      newSessions++;
    });

    // add exercises to the sheet
    body.exercises.forEach((e) => {
      const eid = String(e.id).trim();
      if (!eid) return;
      if (existingExerciseIds.has(eid)) return;

      // Original columns, positional exactly as before.
      const row = [
        eid,
        String(e.session_id).trim(),
        e.exercise_library_id || "",
        e.name,
        e.sets,
        e.reps,
        e.weight_kg,
        e.rest_seconds || 0,
        e.start_time || "",
        e.end_time || "",
        e.note || "",
      ];

      // Newer fields, placed under their header.
      const extras = {
        weight_unit: e.weight_unit || "kg",
        rest_periods: asJsonText(e.rest_periods),
        set_log: asJsonText(e.set_log),
      };
      while (row.length < exerciseHeaders.length) row.push("");
      EXTRA_EXERCISE_FIELDS.forEach((field) => {
        const col = exerciseHeaders.indexOf(field);
        if (col >= 0) row[col] = extras[field];
      });

      exercisesSheet.appendRow(row);

      existingExerciseIds.add(eid);
      newExercises++;
    });

    return success({
      msg: `Inserted ${newSessions} sessions, ${newExercises} exercises`,
      debug: debugInfo,
    });
  } catch (err) {
    return error(err.toString());
  }
}

// Makes sure each name in `fields` has a header cell in row 1, appending any
// missing ones after the last used header (never inside the first
// `minColumns`, which positional data owns). Returns the full header list.
function ensureHeaders(sheet, fields, minColumns) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map((h) => String(h).trim());

  // Trim trailing blank header cells so new ones go right after real headers.
  while (headers.length && headers[headers.length - 1] === "") headers.pop();
  while (headers.length < minColumns) headers.push("");

  fields.forEach((field) => {
    if (headers.indexOf(field) >= 0) return;
    headers.push(field);
    sheet.getRange(1, headers.length).setValue(field);
  });

  return headers;
}

// App sends JSON arrays as strings already; accept raw arrays too.
function asJsonText(v) {
  if (v === undefined || v === null || v === "") return "[]";
  return typeof v === "string" ? v : JSON.stringify(v);
}

function getExistingIds(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set(); // only header exists

  const ids = sheet
    .getRange(2, 1, lastRow - 1, 1) // column A, skip header
    .getValues()
    .flat();

  return new Set(
    ids
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0)
  );
}

function success(payload) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, ...payload }))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, msg }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ---------------------------------------------------------

function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ?type=library → only return the exercise library
  if (e && e.parameter && e.parameter.type === "library") {
    const exerciseLibSheet = ss.getSheetByName(SHEET_EXERCISES_LIB);
    const exerciseLib = sheetToJson(exerciseLibSheet);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, exerciseLib }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Default: full payload for restore
  const sessionsSheet = ss.getSheetByName("sessions");
  const exercisesSheet = ss.getSheetByName("exercises");
  const exerciseLibSheet = ss.getSheetByName(SHEET_EXERCISES_LIB);

  const sessions = sheetToJson(sessionsSheet);
  const exercises = sheetToJson(exercisesSheet);
  const exerciseLib = sheetToJson(exerciseLibSheet);

  return ContentService
    .createTextOutput(JSON.stringify({ sessions, exercises, exerciseLib }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToJson(sheet) {
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();

  return rows
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    })
    .filter(obj => {
      // Remove completely empty rows
      if (!obj.id) return false;

      // Optional: trim string IDs
      if (typeof obj.id === "string" && obj.id.trim() === "") return false;

      return true;
    });
}

function getExerciseLibrary() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const exerciseLibSheet = ss.getSheetByName(SHEET_EXERCISES_LIB);

  const exerciseLib = sheetToJson(exerciseLibSheet);

  return ContentService
    .createTextOutput(JSON.stringify({ ok:true, exerciseLib }))
    .setMimeType(ContentService.MimeType.JSON);

}
