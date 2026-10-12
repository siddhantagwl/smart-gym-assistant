// Which movement patterns ("Horizontal row", "Vertical pull"…) a session has
// covered, per muscle. Movements sharing a pattern do the same job, so doing
// two of them in one session is usually doubling up while another pattern
// for that muscle stays untrained. Hints only — never blocking.
import { ExerciseLibraryItem } from "@/db/exerciseLibrary";

export type PatternStatus = { pattern: string; count: number; done: string[] };
export type MuscleCoverage = { muscle: string; patterns: PatternStatus[] };

const IGNORED_MUSCLES = new Set(["Cardio"]);

// Patterns per muscle that exist in the library, alphabetical.
function libraryPatterns(library: ExerciseLibraryItem[]): Map<string, string[]> {
  const map = new Map<string, Set<string>>();
  library.forEach((l) => {
    if (IGNORED_MUSCLES.has(l.primaryMuscle)) return;
    const set = map.get(l.primaryMuscle) ?? new Set<string>();
    set.add(l.pattern);
    map.set(l.primaryMuscle, set);
  });
  const out = new Map<string, string[]>();
  map.forEach((set, muscle) => out.set(muscle, [...set].sort((a, b) => a.localeCompare(b))));
  return out;
}

// `doneLibraryIds`: library ids logged this session, in order (repeats allowed).
export function sessionCoverage(
  doneLibraryIds: string[],
  library: ExerciseLibraryItem[],
): MuscleCoverage[] {
  const byId = new Map(library.map((l) => [l.id, l]));
  const all = libraryPatterns(library);
  const muscles: string[] = [];
  const done = new Map<string, Map<string, string[]>>(); // muscle → pattern → movement names

  doneLibraryIds.forEach((id) => {
    const item = byId.get(id);
    if (!item || IGNORED_MUSCLES.has(item.primaryMuscle)) return;
    if (!done.has(item.primaryMuscle)) {
      done.set(item.primaryMuscle, new Map());
      muscles.push(item.primaryMuscle);
    }
    const pats = done.get(item.primaryMuscle)!;
    pats.set(item.pattern, [...(pats.get(item.pattern) ?? []), item.movementName]);
  });

  return muscles.map((muscle) => {
    const pats = done.get(muscle)!;
    return {
      muscle,
      patterns: (all.get(muscle) ?? []).map((pattern) => ({
        pattern,
        count: pats.get(pattern)?.length ?? 0,
        done: pats.get(pattern) ?? [],
      })),
    };
  });
}

// Heads-up for the exercise being picked: its pattern was already done this
// session. Returns null when there's nothing to say.
export function overlapHint(
  pickedLibraryId: string | null,
  doneLibraryIds: string[],
  library: ExerciseLibraryItem[],
): { pattern: string; doneNames: string[]; openPatterns: string[] } | null {
  const picked = library.find((l) => l.id === pickedLibraryId);
  if (!picked || IGNORED_MUSCLES.has(picked.primaryMuscle)) return null;
  const coverage = sessionCoverage(doneLibraryIds, library).find(
    (c) => c.muscle === picked.primaryMuscle,
  );
  const same = coverage?.patterns.find((p) => p.pattern === picked.pattern);
  if (!coverage || !same || same.count === 0) return null;
  return {
    pattern: picked.pattern,
    doneNames: [...new Set(same.done)],
    openPatterns: coverage.patterns.filter((p) => p.count === 0).map((p) => p.pattern),
  };
}
