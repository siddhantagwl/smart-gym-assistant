// Workout preferences (Settings → Workout preferences, app/preferences.tsx).
// Stored in SQLite (db/preferences.ts) so they can be read synchronously
// anywhere (rest timer, notifications); phone-only, not synced. Defaults are
// the values the app used before they were configurable.
import { useSyncExternalStore } from "react";

import { clearPreferenceRows, getAllPreferenceRows, setPreferenceRow } from "@/db/preferences";
import { RestTargets } from "@/domain/restTarget";

export type Vibration = "long" | "short" | "pulse";

export type Prefs = {
  // Rest target after Finish Set, by exercise type (domain/restTarget.ts), seconds.
  restCompound: number;
  restIsolation: number;
  restCardio: number;
  restOther: number;
  switchSeconds: number; // timer after Finish Exercise
  nudgeSeconds: number; // second buzz this long after a rest ends; 0 = off
  plusSeconds: number; // the "+Ns" notification button
  vibration: Vibration; // rest-done alert + nudge, phone only
  restStartNotice: boolean; // "Rest 2:30" pop-up / live countdown when a rest starts
  floatingTimer: boolean; // PiP window when leaving the app mid-rest
  volumeDownSet: boolean; // volume-down = Start / Finish Set
  gymAutoDetect: boolean; // GPS preselect of the gym on Home
  weeklyTargetDays: number; // History dots + widget "on target"
  heartRateLine: boolean; // ♥ line in Session details
};

export const DEFAULT_PREFS: Prefs = {
  restCompound: 150,
  restIsolation: 75,
  restCardio: 60,
  restOther: 90,
  switchSeconds: 120,
  nudgeSeconds: 30,
  plusSeconds: 30,
  vibration: "long",
  restStartNotice: true,
  floatingTimer: true,
  volumeDownSet: true,
  gymAutoDetect: true,
  weeklyTargetDays: 3,
  heartRateLine: true,
};

let cache: Prefs | null = null;
const listeners = new Set<() => void>();

function load(): Prefs {
  const rows = getAllPreferenceRows();
  const out: Prefs = { ...DEFAULT_PREFS };
  (Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]).forEach((k) => {
    if (rows[k] === undefined) return;
    try {
      const v = JSON.parse(rows[k]);
      if (typeof v === typeof DEFAULT_PREFS[k]) (out as Record<string, unknown>)[k] = v;
    } catch {}
  });
  return out;
}

// Current preferences (sync). Use usePrefs() in components to re-render on change.
export function getPrefs(): Prefs {
  if (!cache) cache = load();
  return cache;
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  setPreferenceRow(key, JSON.stringify(value));
  cache = { ...getPrefs(), [key]: value };
  listeners.forEach((l) => l());
}

export function resetPrefs() {
  clearPreferenceRows();
  cache = { ...DEFAULT_PREFS };
  listeners.forEach((l) => l());
}

export function subscribePrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribePrefs, getPrefs);
}

// The rest-target part, in domain/restTarget.ts's shape.
export function restTargetsOf(p: Prefs): RestTargets {
  return { compound: p.restCompound, isolation: p.restIsolation, cardio: p.restCardio, other: p.restOther };
}
