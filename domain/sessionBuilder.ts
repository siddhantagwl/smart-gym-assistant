// "Build today's session": for the muscles Today's focus suggests, pick
// exercises that cover the patterns you haven't trained in the last 7 days,
// on equipment you haven't used this week (preferring what you've used at
// this gym). Pure — callers pass the library, recent logs and `now`.
//
// Per muscle: rank its patterns — isometric holds (dead hang…) always last,
// then not done this week first, compound before isolation, fewest sets — and
// take 3 (big muscles) or 2 (small). Per pattern: score each variant —
// skip ones done this week if anything else exists, + used at this gym,
// + used before at all, + days since last used — and take the best.

export type BuilderLibraryItem = {
  id: string;
  name: string;
  primaryMuscle: string;
  pattern: string;
  variant: string;
  movementName: string;
  tags: string[];
};

export type BuilderLogEntry = {
  libraryId: string;
  startTime: string; // ISO
  gym: string;
  sets: number;
};

export type PlannedExercise = {
  muscle: string;
  pattern: string;
  libraryId: string;
  name: string;
  reason: string;
};

const BIG_MUSCLES = new Set(["Back", "Chest", "Legs", "Shoulders"]);
const WEEK_MS = 7 * 86_400_000;
const DAY_MS = 86_400_000;

function patternRank(items: BuilderLibraryItem[]): number {
  // 0 = mostly compound, 1 = isolation, 2 = isometric / holds
  const compound = items.filter((i) => i.tags.includes("compound")).length;
  const isometric = items.filter((i) => i.tags.includes("isometric")).length;
  if (isometric === items.length) return 2;
  return compound * 2 >= items.length ? 0 : 1;
}

export function buildSession(
  muscles: string[],
  library: BuilderLibraryItem[],
  log: BuilderLogEntry[],
  gym: string,
  now: Date = new Date(),
): PlannedExercise[] {
  const t = now.getTime();
  const byId = new Map(library.map((l) => [l.id, l]));
  const lastUsed = new Map<string, number>(); // libraryId → ms
  const usedAtGym = new Set<string>();
  const weekSetsByPattern = new Map<string, number>(); // `${muscle}|${pattern}` → sets
  const weekVariants = new Set<string>();

  log.forEach((e) => {
    const item = byId.get(e.libraryId);
    const ms = new Date(e.startTime).getTime();
    if (!item || Number.isNaN(ms) || ms > t) return;
    lastUsed.set(e.libraryId, Math.max(lastUsed.get(e.libraryId) ?? 0, ms));
    if (gym && e.gym === gym) usedAtGym.add(e.libraryId);
    if (t - ms <= WEEK_MS) {
      weekVariants.add(e.libraryId);
      const k = `${item.primaryMuscle}|${item.pattern}`;
      weekSetsByPattern.set(k, (weekSetsByPattern.get(k) ?? 0) + (e.sets || 0));
    }
  });

  const out: PlannedExercise[] = [];
  muscles.forEach((muscle) => {
    const items = library.filter((l) => l.primaryMuscle === muscle);
    const patterns = new Map<string, BuilderLibraryItem[]>();
    items.forEach((i) => patterns.set(i.pattern, [...(patterns.get(i.pattern) ?? []), i]));

    const ranked = [...patterns.entries()]
      .map(([pattern, vs]) => ({
        pattern,
        variants: vs,
        weekSets: weekSetsByPattern.get(`${muscle}|${pattern}`) ?? 0,
        rank: patternRank(vs),
      }))
      .sort(
        (a, b) =>
          Number(a.rank === 2) - Number(b.rank === 2) ||
          Number(a.weekSets > 0) - Number(b.weekSets > 0) ||
          a.rank - b.rank ||
          a.weekSets - b.weekSets ||
          a.pattern.localeCompare(b.pattern),
      );

    ranked.slice(0, BIG_MUSCLES.has(muscle) ? 3 : 2).forEach(({ pattern, variants, weekSets }) => {
      const pool = variants.some((v) => !weekVariants.has(v.id))
        ? variants.filter((v) => !weekVariants.has(v.id))
        : variants;
      const score = (v: BuilderLibraryItem) => {
        const last = lastUsed.get(v.id);
        const daysSince = last ? Math.min(60, (t - last) / DAY_MS) : 0;
        return (usedAtGym.has(v.id) ? 100 : 0) + (last ? 50 : 0) + daysSince;
      };
      const pick = [...pool].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0];
      if (!pick) return;

      const doneThisWeek = variants.filter((v) => weekVariants.has(v.id)).map((v) => v.variant);
      const p = pattern.toLowerCase();
      const reason =
        weekSets === 0
          ? `${p} · not done this week`
          : weekVariants.has(pick.id)
            ? `${p} · done this week, least so far`
            : `${p} · ${doneThisWeek.join(", ")} this week → ${pick.variant}`;
      out.push({ muscle, pattern, libraryId: pick.id, name: pick.name, reason });
    });
  });
  return out;
}
