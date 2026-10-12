// The gym picked on Home (📍 pill above Start session). Remembered across
// launches so starting a session stays one tap; falls back to the gym of the
// most recent session when nothing was picked yet.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getKnownGyms } from "@/db/sessions";

const KEY = "selected_gym_v1";

export async function loadSelectedGym(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored !== null) return stored;
  } catch {}
  return getKnownGyms()[0] ?? "";
}

export function saveSelectedGym(gym: string) {
  AsyncStorage.setItem(KEY, gym.trim()).catch(() => {});
}
