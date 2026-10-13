// Session muscle labels. Older sessions were labelled with muscle names the
// library no longer uses (the Sheet library groups all leg work under
// "Legs"), and some labels missed a muscle that was actually trained (e.g.
// shrugs on a leg day without "Traps"). Same rule is mirrored in
// apps-script/FixFromNotes_2026_10.gs — keep them in sync.

const LEGACY_TO_LIBRARY: Record<string, string> = {
  Quadriceps: "Legs",
  Hamstrings: "Legs",
  Glutes: "Legs",
  Calves: "Legs",
};

// Labels that aren't a library muscle but are kept as-is.
const NOT_TRAINING = new Set(["Cardio", "Sauna"]);

export function normalizeMuscle(m: string): string {
  const t = m.trim();
  return LEGACY_TO_LIBRARY[t] ?? t;
}

// Normalised labels (order kept, no duplicates) plus any trained muscle the
// labels missed. Cardio is never added from exercises.
export function cleanSessionLabels(labels: string[], trainedMuscles: string[]): string[] {
  const out: string[] = [];
  const add = (m: string) => {
    const n = normalizeMuscle(m);
    if (n && !out.includes(n)) out.push(n);
  };
  labels.forEach(add);
  trainedMuscles.filter((m) => !NOT_TRAINING.has(m)).forEach(add);
  return out;
}
