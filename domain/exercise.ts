// domain/exercise.ts

export type Exercise = {
  id: string;
  sessionId: string;
  exerciseLibraryId: string; // stable reference to exercise library
  name: string; // snapshot display name
  sets: number;
  reps: number;
  weightKg: number;
  restSeconds: number;
  startTime: string;
  endTime: string;
  note?: string;
};