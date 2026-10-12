// Rest countdown target after Finish Set, by exercise type (library tags).
// The countdown is only a target — actual rest is still measured from
// wall-clock, so going over/under never loses data.
//   compound  (squat, bench, rows…) → 2:30
//   isolation (curls, raises…)      → 1:15
//   cardio                          → 1:00
//   anything else / unknown         → 1:30 (the old fixed default)

export type RestTarget = { seconds: number; label: string };

export const DEFAULT_REST: RestTarget = { seconds: 90, label: "default" };

export function restTargetFor(tags: string[] | null | undefined): RestTarget {
  const t = new Set((tags ?? []).map((x) => x.trim().toLowerCase()));
  if (t.has("compound")) return { seconds: 150, label: "compound" };
  if (t.has("isolation")) return { seconds: 75, label: "isolation" };
  if (t.has("cardio")) return { seconds: 60, label: "cardio" };
  return DEFAULT_REST;
}
