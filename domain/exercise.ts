// domain/exercise.ts

export type WeightUnit = "kg" | "lb";

// One set as logged at Finish Set (weight always stored in kg).
export type SetEntry = {
  reps: number;
  weightKg: number;
  weightUnit?: WeightUnit;
  durationSec?: number;
};

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
  restPeriods?: number[]; // each rest between sets, seconds
  setLog?: SetEntry[]; // each set's reps × weight
  startTime: string;
  endTime: string;
  note?: string;
};