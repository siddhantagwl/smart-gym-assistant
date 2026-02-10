// domain/session.ts

// Session is an in-memory domain model.
export type Session = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  sessionLabel?: string | null;
  note?: string;
};

export type RecentSession = {
  id: string;
  startTime: string;
  endTime: string | null;
  sessionLabel: string | null;
  source: "live" | "manual";
};