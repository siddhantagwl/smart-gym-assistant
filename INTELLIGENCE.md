# Intelligence Roadmap

Ideas for making Sadhana feel "intelligent" — i.e. surfacing things the user couldn't compute in their head from their own data, not just buzzwords. Captured for later; nothing here is built yet.

Most of the genuine value is plain math on the existing SQLite tables. LLM-tier features only earn their keep where pattern recognition or natural language is the actual value-add.

---

## Tier 1 — Pure math on existing data

No LLM. Deterministic. Fits the offline-first design (no network dependency). These are the highest value-per-effort items.

### 1.1 Progressive overload suggestions

When the user picks an exercise, instead of only showing the "Prev logged" chip (current behavior, see `components/AddExercise.tsx`), also show a *suggestion* for today's session.

**Rule (linear progression):**
- If last session: all working sets hit target reps → suggest weight + 2.5 kg, same reps.
- If last session: missed reps on 1+ sets → suggest repeat (same weight, same target).
- If last 3 sessions stalled at the same weight, all reps hit → suggest weight + 5 kg (deliberate jump).
- If last 3 sessions stalled with reps missed → suggest dropping weight 10%, going for higher rep range (e.g. 4×8 → 3×12).

**Touchpoints:**
- New helper in `db/exercises.ts` — `getProgressionSuggestion(exerciseLibraryId | name)`.
- Render alongside the "Prev logged" chip in `AddExercise`.
- Pure SQL on `exercises` table joined to itself by name/library_id.

**Why it matters:** transforms the app from a logbook into something that tells you what to do today. Standard intermediate-lifter programming, baked into the UI.

### 1.2 Estimated 1RM trend per exercise

Epley formula: `e1RM = weight × (1 + reps / 30)`.

Plot e1RM over time on `app/exercise-details.tsx`. A simple line chart (use `react-native-svg` or `victory-native`).

**Touchpoints:**
- Helper in `db/exercises.ts` — `getOneRepMaxHistory(exerciseLibraryId)` returning `{ date, e1RM }[]`.
- Chart component on the exercise-details screen.

**Why it matters:** tells you whether you're actually getting stronger or just feel like you are. Strength-training apps live and die on this graph.

### 1.3 Volume by muscle group, weekly

Sum `sets × reps × weight` per session, group by `primary_muscle` (already in `exercise_library`) and ISO week.

**Touchpoints:**
- Helper in `db/exercises.ts` — `getWeeklyVolumeByMuscle(weeks: number)`.
- New tile or section on Home: small horizontal bar chart for the current week.

**Why it matters:** catches push/pull imbalances and total-volume drift (deload signal). Already have `primary_muscle` per library row, so no schema work.

### 1.4 Plateau / stall detection

For each exercise the user has logged 4+ times, check whether the working-set max has moved in the last 4 sessions. If not, mark it as stalled.

**Touchpoints:**
- Helper in `db/exercises.ts` — `getStalledExercises()` returning `{ name, weight, sessions }[]`.
- Surface as a badge on the suggestion chip: "Bench: stalled 4×".
- Or a Home-screen card listing stalled lifts with a "try X" suggestion.

**Why it matters:** the user might not notice they've been benching 75 kg for a month. App should.

---

## Tier 2 — Heuristics

Still no LLM, just slightly more inferential.

### 2.1 Smart rest defaults per exercise

Instead of fixed `startRestTimer(90)` for sets and `startRestTimer(120)` for transitions (`components/ActiveSession.tsx`), use the user's own median rest per exercise from history. Falls back to 90s for new exercises.

**Touchpoints:**
- Helper in `db/exercises.ts` — `getMedianRestSeconds(exerciseLibraryId | name)`.
- `saveSet` in `ActiveSession.tsx` reads it and passes to `startRestTimer`.

**Why it matters:** squat wants 3 minutes, curls want 60 seconds. The data already knows; we just need to read it.

### 2.2 Fatigue / drop-off indicator

Within an active exercise, if `weightKg × reps` drops >10% from set 1 to the latest set, flag it: "Fatigue accumulating — drop-off 12%."

**Touchpoints:**
- Compute in `ActiveSession.tsx` from local `sets` state.
- Render as a small chip near the active set indicator.

**Why it matters:** signals when to drop weight or end the exercise instead of grinding into bad form.

### 2.3 Frequency / consistency pattern

Detect the user's typical training days (e.g. Mon/Wed/Fri) from the past 4 weeks of `sessions.start_time`. Surface a soft nudge on Home if a usual day passes without a session: "Usually train Wednesday — light day?"

**Touchpoints:**
- Helper in `db/sessions.ts` — `getTypicalTrainingDays()`.
- Home-screen card. Optional notification (`expo-notifications` already installed).

**Why it matters:** consistency is the lift that drives all other lifts. Cheap reminder, big behavioral payoff.

---

## Tier 3 — LLM territory

Where natural language or pattern recognition over fuzzy data is the actual value, not a gimmick. All of these would use the Claude API; budget per call applies.

### 3.1 Session debrief (recommended starting point if doing LLM)

After "Save Session", run a one-shot Claude API call with the just-completed session + the prior week's stats as context. Surface a 2-3 sentence summary on the celebration screen:

> "Strong session — bench PR at 75 kg, total volume +8% vs last week. Push:pull this week is now balanced after Tuesday's row work."

**Touchpoints:**
- New service `services/coach.ts` with one function `summarizeSession(sessionId)`.
- Render on the celebration overlay after `Finish Session`.
- Async, non-blocking — if the API fails, the celebration still works.
- Cache the summary in the session row (new `summary` column via `ensureColumn`).

**Why it matters:** a moment of personality at exactly the right time (post-workout dopamine). One call per session = predictable cost. Doesn't break offline-first because saving works without it.

**Cost shape:** ~1-2k input tokens, ~150 output tokens. Cents per session. Cache so it never runs twice for the same session.

### 3.2 Natural-language coach

In-app chat: "what should I do for shoulders today?", "did I overdo legs last week?", "compare my bench and OHP progress."

**Touchpoints:**
- New tab or modal.
- Each turn: build a context blob from recent sessions/exercises + library + the question, send to Claude.
- Stream the response.

**Why it's skip-able:** for a personal app where you already know your own history, natural-language Q&A is gimmicky. Useful if you ever distribute this to others or want a hands-free interface during workouts. Otherwise, the structured Tier 1 features deliver more value.

### 3.3 Form check via video (don't bother)

Pose detection on a recorded set, compare to ideal form. Massive engineering effort, accuracy is iffy, the user knows their own form better than any model. Skip.

---

## Recommended sequencing

If/when revisiting this, do them in this order:

1. **1.1 Progressive overload suggestions** — biggest single behavioral win. Pure math. ~1 day.
2. **1.2 e1RM trend** — visual feedback that motivates continued logging. Need to pick a chart lib. ~1-2 days.
3. **1.3 Weekly volume by muscle** — Home-screen tile that shows balance. ~half a day.
4. **2.1 Smart rest defaults** — small but quality-of-life. Half a day.
5. **3.1 Session debrief** — if you want the "AI" label, this is where to start. Cheap, async, real value. ~1 day including caching + error handling.

Skip 1.4 / 2.2 / 2.3 / 3.2 / 3.3 unless one of them itches specifically.

---

## What NOT to call intelligence

The features below are good, but they're already built — don't claim them as "AI":

- PR badge on new max (`components/ActiveSession.tsx`) — comparison.
- Streak + this-week count on Home — counting.
- Suggestion chips from library — substring filter.
- "Logged but not in library" nudge — set difference.

These are useful. They're not what users mean when they say "intelligent." Tier 1 above is the real bar.
