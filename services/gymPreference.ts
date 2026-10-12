// Gyms on Home's 📍 pill. Two things are remembered on the phone:
// - the selected gym, so starting a session stays one tap (falls back to the
//   gym of the most recent session when nothing was picked yet);
// - a saved gym list, so gyms added in the picker stay even before you've
//   trained there. The picker shows saved gyms + gyms from session history.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getKnownGyms } from "@/db/sessions";

const SELECTED_KEY = "selected_gym_v1";
const SAVED_KEY = "saved_gyms_v1";

export async function loadSelectedGym(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SELECTED_KEY);
    if (stored !== null) return stored;
  } catch {}
  return getKnownGyms()[0] ?? "";
}

export function saveSelectedGym(gym: string) {
  AsyncStorage.setItem(SELECTED_KEY, gym.trim()).catch(() => {});
}

async function loadSavedGyms(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function writeSavedGyms(gyms: string[]) {
  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(gyms)).catch(() => {});
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Gyms from history (most recent first), then saved-only gyms in the order added.
export async function loadGymList(): Promise<{ gym: string; usedInHistory: boolean }[]> {
  const fromHistory = getKnownGyms();
  const saved = await loadSavedGyms();
  return [
    ...fromHistory.map((gym) => ({ gym, usedInHistory: true })),
    ...saved
      .filter((g) => !fromHistory.some((h) => same(h, g)))
      .map((gym) => ({ gym, usedInHistory: false })),
  ];
}

export async function addSavedGym(gym: string): Promise<string> {
  const name = gym.trim();
  if (!name) return name;
  const saved = await loadSavedGyms();
  const existing = [...getKnownGyms(), ...saved].find((g) => same(g, name));
  if (existing) return existing; // reuse the existing spelling
  await writeSavedGyms([...saved, name]);
  return name;
}

// Only saved-only gyms can be removed; gyms in session history stay listed.
export async function removeSavedGym(gym: string) {
  const saved = await loadSavedGyms();
  await writeSavedGyms(saved.filter((g) => !same(g, gym)));
}
