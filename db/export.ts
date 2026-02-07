import * as FileSystem from "expo-file-system/legacy";
import { db } from "./database";

export async function exportAllDataToFile() {
  const sessions = db.getAllSync(`SELECT * FROM sessions ORDER BY start_time;`);
  const exercises = db.getAllSync(`SELECT * FROM exercises ORDER BY session_id;`);

  const data = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      sessions,
      exercises,
    },
    null,
    2
  );

  const path = FileSystem.documentDirectory + "gym_backup.json";
  await FileSystem.writeAsStringAsync(path, data);
  return path;
}
