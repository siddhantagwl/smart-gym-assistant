// Working sets per muscle over the last 7 days, shown in the 🎯 Today's
// focus sheet. A common guideline for growth is ~10–20 hard sets per muscle
// per week; below/above is flagged as "low"/"high" (text, not colour only).

export type MuscleVolume = {
  muscle: string;
  sets: number;
  zone: "low" | "target" | "high";
};

export const WEEKLY_SET_TARGET = { low: 10, high: 20 };

const IGNORED = new Set(["Cardio", "Sauna"]);

// `setsByMuscle`: sets logged in the window. `alsoShow`: muscles to list even
// at 0 (the ones you train regularly), so a skipped muscle is visible.
export function weeklyVolume(
  setsByMuscle: Record<string, number>,
  alsoShow: string[] = [],
): MuscleVolume[] {
  const muscles = new Set<string>([...Object.keys(setsByMuscle), ...alsoShow]);
  return [...muscles]
    .filter((m) => m && !IGNORED.has(m))
    .map((muscle) => {
      const sets = setsByMuscle[muscle] ?? 0;
      const zone: MuscleVolume["zone"] =
        sets < WEEKLY_SET_TARGET.low ? "low" : sets > WEEKLY_SET_TARGET.high ? "high" : "target";
      return { muscle, sets, zone };
    })
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle));
}
