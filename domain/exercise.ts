// domain/exercise.ts

export type WeightUnit = "kg" | "lb";

export type Exercise = {
  id: string;
  sessionId: string;
  exerciseLibraryId: string; // stable reference to exercise library
  name: string; // snapshot display name
  sets: number;
  reps: number;
  weightKg: number;
  weightUnit?: WeightUnit; // what the user typed in; storage stays kg
  restSeconds: number;
  startTime: string;
  endTime: string;
  note?: string;
};