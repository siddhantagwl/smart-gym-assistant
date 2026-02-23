// domain/session.ts

// Session is an in-memory domain model.
export type Session = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  sessionLabels: string[];
  note?: string;
};

export type RecentSession = {
  id: string;
  startTime: string;
  endTime: string | null;
  sessionLabels: string[];
  source: "live" | "manual";
};