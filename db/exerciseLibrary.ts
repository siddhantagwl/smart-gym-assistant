// read exercise library from db

import { db } from "./database";

export type ExerciseLibraryItem = {
  id: string;
  name: string;
  videoUrl: string;
  primaryMuscle: string;
  tags: string[];
};

export function getAllLibraryExercises(): ExerciseLibraryItem[] {
  const rows = db.getAllSync(
    `SELECT id, name, video_url, primary_muscle, tags FROM exercise_library;`
  ) as any[];

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    videoUrl: String(r.video_url),
    primaryMuscle: String(r.primary_muscle),
    tags: (() => {
      try {
        return JSON.parse(r.tags ?? "[]");
      } catch {
        return [];
      }
    })(),
  }));
}