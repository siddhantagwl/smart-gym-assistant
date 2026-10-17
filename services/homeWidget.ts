// Feeds the home-screen "this week" widget (modules/home-widget): training
// days of the last two weeks with their sets. Same rules as the History dots —
// discarded and sauna-only sessions don't count. Called on boot and whenever
// the app goes to the background, so the widget reflects any change.
import { getExerciseCountForSession, getSetTotalsBySession } from "@/db/exercises";
import { getAllSessions } from "@/db/sessions";
import { setWidgetDays } from "@/modules/home-widget";

const DAYS_BACK = 14;

function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function refreshHomeWidget(): void {
  try {
    const since = Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000;
    const setTotals = getSetTotalsBySession();
    const days: Record<string, number> = {};
    getAllSessions()
      .filter((s) => s.note !== "__DISCARDED__" && new Date(s.startTime).getTime() >= since)
      .filter(
        (s) => getExerciseCountForSession(s.id) > 0 || s.sessionLabels.some((l) => l !== "Sauna"),
      )
      .forEach((s) => {
        const key = isoDay(new Date(s.startTime));
        days[key] = (days[key] ?? 0) + (setTotals[s.id] ?? 0);
      });
    setWidgetDays(days);
  } catch (e) {
    if (__DEV__) console.log("[widget] refresh failed:", e);
  }
}
