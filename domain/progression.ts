// "Try today" target for an exercise, from its last few logged sessions.
// Pure + deterministic so it can be reasoned about (and tested) on its own.
//
// Rules, newest session first (r0 = last time, r1 = the time before, r2 …):
//   stalled  r0, r1, r2 all same weight AND same reps   → add weight, same reps
//   held     r0, r1 same weight, r0 reps ≥ r1 reps       → add weight, same reps
//   dropped  r0, r1 same weight, r0 reps < r1 reps       → same weight, aim for r1's reps
//   default  (new/heavier weight, or one session)        → same weight, +1 rep
//   bodyweight (r0 weight 0)                              → +1 rep
// Weight steps are 2.5 kg, or 5 lb when the user logs this machine in lb.
import { WeightUnit } from "@/domain/exercise";

export type ProgressionInput = { weightKg: number; reps: number };

export type ProgressionKind = "stalled" | "held" | "dropped" | "beat" | "bodyweight";

export type ProgressionSuggestion = {
  weightKg: number;
  reps: number;
  kind: ProgressionKind;
  reason: string;
};

const LB_PER_KG = 1 / 0.45359237;

export const kgToLb = (kg: number) => Math.round(kg * LB_PER_KG * 10) / 10;
export const lbToKg = (lb: number) => Math.round((lb / LB_PER_KG) * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

function addStep(weightKg: number, unit: WeightUnit): number {
  if (unit === "lb") return lbToKg(Math.round(kgToLb(weightKg)) + 5);
  return round1(weightKg + 2.5);
}

function fmtWeight(weightKg: number, unit: WeightUnit) {
  return unit === "lb" ? `${kgToLb(weightKg)} lb` : `${round1(weightKg)} kg`;
}

export function suggestNext(
  recent: ProgressionInput[],
  unit: WeightUnit = "kg",
): ProgressionSuggestion | null {
  const [r0, r1, r2] = recent;
  if (!r0 || r0.reps <= 0) return null;

  if (r0.weightKg <= 0) {
    return {
      weightKg: 0,
      reps: r0.reps + 1,
      kind: "bodyweight",
      reason: `One more rep than last time (${r0.reps})`,
    };
  }

  const w = fmtWeight(r0.weightKg, unit);

  if (
    r1 &&
    r2 &&
    r0.weightKg === r1.weightKg &&
    r1.weightKg === r2.weightKg &&
    r0.reps === r1.reps &&
    r1.reps === r2.reps
  ) {
    return {
      weightKg: addStep(r0.weightKg, unit),
      reps: r0.reps,
      kind: "stalled",
      reason: `Same ${w} × ${r0.reps} for 3 sessions — time to add weight`,
    };
  }

  if (r1 && r0.weightKg === r1.weightKg && r0.reps >= r1.reps) {
    return {
      weightKg: addStep(r0.weightKg, unit),
      reps: r0.reps,
      kind: "held",
      reason: `Held ${w} twice — add weight`,
    };
  }

  if (r1 && r0.weightKg === r1.weightKg && r0.reps < r1.reps) {
    return {
      weightKg: r0.weightKg,
      reps: r1.reps,
      kind: "dropped",
      reason: `Reps dipped last time — repeat ${w} and hit ${r1.reps}`,
    };
  }

  return {
    weightKg: r0.weightKg,
    reps: r0.reps + 1,
    kind: "beat",
    reason:
      r1 && r0.weightKg > r1.weightKg
        ? `New weight — build up one rep at a time`
        : `Beat last time by one rep`,
  };
}
