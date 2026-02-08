import { db } from "./database";
import { EXERCISE_LIBRARY } from "./exercise_list_data";

export function seedExerciseLibrary() {
  EXERCISE_LIBRARY.forEach((ex) => {
    db.runSync(
      `
      INSERT OR IGNORE INTO exercise_library
      (id, name, video_url, primary_muscle, tags)
      VALUES (?, ?, ?, ?, ?);
      `,
      [
        ex.id,
        ex.name,
        ex.video_url ?? null,
        ex.primary_muscle,
        ex.tags,
      ]
    );
  });
}