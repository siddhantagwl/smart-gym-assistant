// Rest countdown target after Finish Set, by exercise type (library tags).
// Defaults below; the user can change each in Workout preferences.
// The countdown is only a target — actual rest is still measured from
// wall-clock, so going over/under never loses data.
//   compound  (squat, bench, rows…) → 2:30
//   isolation (curls, raises…)      → 1:15
//   cardio                          → 1:00
//   anything else / unknown         → 1:30 (the old fixed default)

export type RestTarget = { seconds: number; label: string };

// Seconds per type; the user's values come from Workout preferences.
export type RestTargets = { compound: number; isolation: number; cardio: number; other: number };

export const DEFAULT_REST_TARGETS: RestTargets = { compound: 150, isolation: 75, cardio: 60, other: 90 };

export function restTargetFor(
  tags: string[] | null | undefined,
  targets: RestTargets = DEFAULT_REST_TARGETS,
): RestTarget {
  const t = new Set((tags ?? []).map((x) => x.trim().toLowerCase()));
  if (t.has("compound")) return { seconds: targets.compound, label: "compound" };
  if (t.has("isolation")) return { seconds: targets.isolation, label: "isolation" };
  if (t.has("cardio")) return { seconds: targets.cardio, label: "cardio" };
  return { seconds: targets.other, label: "default" };
}
