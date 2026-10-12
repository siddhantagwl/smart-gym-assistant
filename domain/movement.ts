// Movement = the exercise ("Squat"); variant = how it was done today
// ("Barbell", "Machine · Hack"). Library rows are variants; rows sharing a
// `movement` id form one movement. Ids never change, so logged history keeps
// pointing at its variant.

export type Equipment =
  | "barbell"
  | "ez-bar"
  | "dumbbell"
  | "smith"
  | "cable"
  | "machine"
  | "bodyweight"
  | "other";

// First match wins: "smith" before "machine" (Smith rows carry both tags),
// "ez-bar" before "barbell".
const EQUIPMENT_ORDER: Equipment[] = [
  "smith",
  "ez-bar",
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
];

export function equipmentOf(tags: string[]): Equipment {
  const t = new Set(tags.map((x) => x.trim().toLowerCase()));
  return EQUIPMENT_ORDER.find((e) => t.has(e)) ?? "other";
}

const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: "Barbell",
  "ez-bar": "EZ-Bar",
  dumbbell: "Dumbbell",
  smith: "Smith",
  cable: "Cable",
  machine: "Machine",
  bodyweight: "Bodyweight",
  other: "Other",
};

export function equipmentLabel(e: Equipment): string {
  return EQUIPMENT_LABEL[e];
}

// Plates, bars and dumbbells weigh the same everywhere; machine stacks, cable
// pulleys and Smith bars don't. Gym-scoped equipment only compares history
// from the same gym (Prev logged, Try today, PRs).
export function isGymScoped(e: Equipment): boolean {
  return e === "machine" || e === "cable" || e === "smith";
}

// Dumbbell weights are logged per dumbbell.
export function weightUnitSuffix(e: Equipment): string {
  return e === "dumbbell" ? "/db" : "";
}
