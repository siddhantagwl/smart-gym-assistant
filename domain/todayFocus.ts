// "Today's focus" on Home: which muscle groups to train next, from the user's
// own recent sessions. Pure + deterministic (caller passes `now`).
//
// 1. Window = sessions in the 8 weeks before the LAST session (not before
//    today), so a long break doesn't erase the user's pattern.
// 2. Split mode: if the user repeats the same muscle combos (each seen ≥2×,
//    covering ≥60% of the window), suggest the combo done longest ago whose
//    muscles aren't recovering — i.e. continue the rotation.
// 3. Otherwise: the regularly-trained muscle with the longest gap, plus the
//    muscle it's most often paired with.
// Recovering = trained today or yesterday. A break of 7+ days adds an
// "ease back in" note.

export type TrainingLogEntry = { startTime: string; muscles: string[] };

export type MuscleStatus = {
  muscle: string;
  daysSince: number;
  recovering: boolean;
};

export type TodayFocus = {
  focus: string[];
  reason: string;
  // Present when the user hasn't trained for a while.
  comeback: { daysOff: number; note: string } | null;
  trainedToday: string[] | null;
  muscles: MuscleStatus[]; // regular muscles, longest gap first
  rotation: string[][] | null; // detected split, in the order it was last done (oldest first)
};

const WINDOW_DAYS = 56;
const MAX_SESSIONS = 12;
const IGNORED = new Set(["Cardio", "Sauna"]);

function dayIndex(d: Date) {
  // Local calendar day number, so a late-night session counts as that day.
  return Math.floor(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86_400_000,
  );
}

const keyOf = (muscles: string[]) => [...muscles].sort().join(" + ");

export function computeTodayFocus(
  log: TrainingLogEntry[],
  now: Date = new Date(),
): TodayFocus | null {
  const today = dayIndex(now);
  const sessions = log
    .map((s) => ({
      day: dayIndex(new Date(s.startTime)),
      muscles: Array.from(new Set(s.muscles.filter((m) => m && !IGNORED.has(m)))),
    }))
    .filter((s) => s.muscles.length > 0 && !Number.isNaN(s.day) && s.day <= today)
    .sort((a, b) => b.day - a.day);

  if (sessions.length === 0) return null;

  const lastDay = sessions[0].day;
  const window = sessions
    .filter((s) => s.day >= lastDay - WINDOW_DAYS)
    .slice(0, MAX_SESSIONS);

  // Days since each muscle was last trained (over all history).
  const lastTrained = new Map<string, number>();
  sessions.forEach((s) =>
    s.muscles.forEach((m) => {
      if (!lastTrained.has(m)) lastTrained.set(m, s.day);
    }),
  );
  const daysSince = (m: string) => today - (lastTrained.get(m) ?? -Infinity);
  const isRecovering = (m: string) => daysSince(m) <= 1;

  // "Regular" = shows up at least twice in the window (or once if the window is tiny).
  const freq = new Map<string, number>();
  window.forEach((s) => s.muscles.forEach((m) => freq.set(m, (freq.get(m) ?? 0) + 1)));
  const minFreq = window.length >= 4 ? 2 : 1;
  const regular = [...freq.keys()].filter((m) => (freq.get(m) ?? 0) >= minFreq);

  const muscles: MuscleStatus[] = regular
    .map((m) => ({ muscle: m, daysSince: daysSince(m), recovering: isRecovering(m) }))
    .sort((a, b) => b.daysSince - a.daysSince || a.muscle.localeCompare(b.muscle));

  const daysOff = today - lastDay;
  const comeback =
    daysOff >= 21
      ? { daysOff, note: "Long break — ease back in: lighter weights, fewer sets" }
      : daysOff >= 7
        ? { daysOff, note: "Been a week+ — go ~10% lighter today" }
        : null;

  const trainedToday = daysOff === 0 ? sessions[0].muscles : null;

  // ----- Split mode -----
  const comboCount = new Map<string, number>();
  const comboLastDay = new Map<string, number>();
  const comboMuscles = new Map<string, string[]>();
  window.forEach((s) => {
    const k = keyOf(s.muscles);
    comboCount.set(k, (comboCount.get(k) ?? 0) + 1);
    if (!comboLastDay.has(k)) comboLastDay.set(k, s.day);
    comboMuscles.set(k, [...s.muscles].sort());
  });
  const recurring = [...comboCount.keys()].filter((k) => (comboCount.get(k) ?? 0) >= 2);
  const covered = window.filter((s) => recurring.includes(keyOf(s.muscles))).length;
  const isSplit = recurring.length >= 1 && window.length >= 3 && covered / window.length >= 0.6;

  if (isSplit) {
    const byOldest = [...recurring].sort(
      (a, b) => (comboLastDay.get(a) ?? 0) - (comboLastDay.get(b) ?? 0),
    );
    const ready = byOldest.filter((k) => !(comboMuscles.get(k) ?? []).some(isRecovering));
    const pick = ready[0] ?? byOldest[0];
    const ago = today - (comboLastDay.get(pick) ?? today);
    const rotation = byOldest.map((k) => comboMuscles.get(k) ?? []);

    let reason: string;
    if (ready.length === 0) {
      reason = "Everything in your rotation was hit in the last 2 days — consider a rest or light day";
    } else if (recurring.length === 1) {
      reason = `Your usual session · last done ${agoText(ago)}`;
    } else {
      reason = `Next in your rotation · last done ${agoText(ago)}`;
    }

    return {
      focus: comboMuscles.get(pick) ?? [],
      reason,
      comeback,
      trainedToday,
      muscles,
      rotation: recurring.length >= 2 ? rotation : null,
    };
  }

  // ----- Muscle mode -----
  const candidates = muscles.filter((m) => !m.recovering);
  if (candidates.length === 0) {
    return {
      focus: muscles.length ? [muscles[0].muscle] : [],
      reason: "Everything you train regularly was hit in the last 2 days — consider a rest or light day",
      comeback,
      trainedToday,
      muscles,
      rotation: null,
    };
  }

  const first = candidates[0].muscle;
  // Partner = the non-recovering muscle most often trained alongside `first`;
  // ties go to the one with the longer gap.
  const pairCount = new Map<string, number>();
  window.forEach((s) => {
    if (!s.muscles.includes(first)) return;
    s.muscles.forEach((m) => {
      if (m !== first && !isRecovering(m)) pairCount.set(m, (pairCount.get(m) ?? 0) + 1);
    });
  });
  const partner = [...pairCount.entries()].sort(
    (a, b) => b[1] - a[1] || daysSince(b[0]) - daysSince(a[0]) || a[0].localeCompare(b[0]),
  )[0]?.[0];

  return {
    focus: partner ? [first, partner] : [first],
    reason: `${first} is your longest gap · ${agoText(daysSince(first))}`,
    comeback,
    trainedToday,
    muscles,
    rotation: null,
  };
}

function agoText(days: number) {
  if (!Number.isFinite(days)) return "never";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
