// domain/exercise.ts

export type Exercise = {
  id: string;
  sessionId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  note?: string;
};