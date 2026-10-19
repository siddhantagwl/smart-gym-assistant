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
// 4. Add-ons (split mode): a rotation muscle that was skipped the last time
//    its combo was done (e.g. no shrugs on the last leg day) and is now due
//    (7+ days, not recovering) is added to today with one exercise and the
//    reason — at most 2, longest gap first.

export type TrainingLogEntry = { startTime: string; muscles: string[] };

export type MuscleStatus = {
  muscle: string;
  daysSince: number;
  recovering: boolean;
};

export type FocusAddOn = { muscle: string; reason: string };

export type TodayFocus = {
  focus: string[];
  reason: string;
  // Small extras on top of `focus` (see 4. above); [] when none.
  addOns: FocusAddOn[];
  // Present when the user hasn't trained for a while.
  comeback: { daysOff: number; note: string } | null;
  trainedToday: string[] | null;
  muscles: MuscleStatus[]; // regular muscles, longest gap first
  rotation: string[][] | null; // detected split, in the order it was last done (oldest first)
};

const WINDOW_DAYS = 56;
const ADD_ON_DAYS = 7; // a skipped rotation muscle is "due" after this many days
const MAX_ADD_ONS = 2;
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

  // A combo was "last done" on the latest session that trained at least half
  // of its muscles — not only an exact label match. Otherwise a leg day
  // labelled "Legs + Shoulders" doesn't count for the usual "Legs + Shoulders
  // + Traps", and that combo gets suggested again 3 days later.
  // comboLastMuscles: what that session actually trained (for add-ons).
  const comboLastMuscles = new Map<string, string[]>();
  sessions.forEach((s) => {
    recurring.forEach((k) => {
      const combo = comboMuscles.get(k) ?? [];
      const hit = combo.filter((m) => s.muscles.includes(m)).length;
      if (hit * 2 >= combo.length && s.day > (comboLastDay.get(k) ?? -Infinity)) {
        comboLastDay.set(k, s.day);
        comboLastMuscles.set(k, s.muscles);
      }
    });
  });

  if (isSplit) {
    const byOldest = [...recurring].sort(
      (a, b) => (comboLastDay.get(a) ?? 0) - (comboLastDay.get(b) ?? 0),
    );
    const ready = byOldest.filter((k) => !(comboMuscles.get(k) ?? []).some(isRecovering));
    const pick = ready[0] ?? byOldest[0];
    const ago = today - (comboLastDay.get(pick) ?? today);
    const rotation = byOldest.map((k) => comboMuscles.get(k) ?? []);

    // Add-ons: rotation muscles skipped last time their combo was done, now due.
    const focusMuscles = comboMuscles.get(pick) ?? [];
    const addOns: (FocusAddOn & { gap: number })[] = [];
    if (ready.length > 0) {
      recurring.forEach((k) => {
        const combo = comboMuscles.get(k) ?? [];
        const lastDone = comboLastMuscles.get(k) ?? combo;
        combo
          .filter((m) => !lastDone.includes(m))
          .forEach((m) => {
            const gap = daysSince(m);
            if (focusMuscles.includes(m) || isRecovering(m) || gap < ADD_ON_DAYS) return;
            if (addOns.some((a) => a.muscle === m)) return;
            addOns.push({
              muscle: m,
              gap,
              reason: `skipped on your last ${combo.join(" + ")} day (${dayLabel(comboLastDay.get(k) ?? today)}) · last trained ${agoText(gap)}`,
            });
          });
      });
    }

    let reason: string;
    if (ready.length === 0) {
      reason = "Everything in your rotation was hit in the last 2 days — consider a rest or light day";
    } else if (recurring.length === 1) {
      reason = `Your usual session · last done ${agoText(ago)}`;
    } else {
      reason = `Next in your rotation · last done ${agoText(ago)}`;
    }

    return {
      focus: focusMuscles,
      reason,
      addOns: addOns
        .sort((a, b) => b.gap - a.gap)
        .slice(0, MAX_ADD_ONS)
        .map(({ muscle, reason: why }) => ({ muscle, reason: why })),
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
      addOns: [],
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
    addOns: [],
    comeback,
    trainedToday,
    muscles,
    rotation: null,
  };
}

// dayIndex() → "Thu 16 Oct".
function dayLabel(day: number) {
  return new Date(day * 86_400_000).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function agoText(days: number) {
  if (!Number.isFinite(days)) return "never";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
