// domain/exercise.ts

export type Exercise = {
  id: string;
  sessionId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  restSeconds: number;
  startTime: string;
  endTime: string;
  note?: string;
};