import { db } from "./database";

type Session = {
  id: string;
  startTime: Date;
  endTime: Date;
};

export function insertSession(session: Session) {
  db.runSync(
    `
    INSERT INTO sessions (id, start_time, end_time)
    VALUES (?, ?, ?);
    `,
    [
      session.id,
      session.startTime.toISOString(),
      session.endTime.toISOString(),
    ]
  );
}

export type StoredSession = {
  id: string;
  start_time: string;
  end_time: string;
};

export function getAllSessions(): StoredSession[] {
  return db.getAllSync(
    `
    SELECT id, start_time, end_time
    FROM sessions
    ORDER BY start_time DESC;
    `
  ) as StoredSession[];
}

export type ExerciseInput = {
  id: string;
  sessionId: string;
  name: string;
  sets: number;
  reps: number;
};

export function insertExercise(exercise: ExerciseInput) {
  db.runSync(
    `
    INSERT INTO exercises (id, session_id, name, sets, reps)
    VALUES (?, ?, ?, ?, ?);
    `,
    [
      exercise.id,
      exercise.sessionId,
      exercise.name,
      exercise.sets,
      exercise.reps,
    ]
  );
}