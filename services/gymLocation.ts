// Gym auto-detect by GPS (foreground only — no background tracking). Off in
// Workout preferences → both functions do nothing.
// - learnGymLocation(gym): on Start session, remember where this gym is. The
//   first call asks for location permission (in context); the session starts
//   either way.
// - detectGym(): on Home (idle), the known gym within NEAR_M of you, if any.
import * as Location from "expo-location";

import { addGymLocationFix, getGymLocations, GymLocation } from "@/db/gymLocations";
import { getPrefs } from "@/services/preferences";

const NEAR_M = 250; // "at this gym"
const MAX_FIX_ACCURACY_M = 100; // ignore worse fixes when learning

function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearest(lat: number, lon: number, gyms: GymLocation[]): { gym: string; m: number } | null {
  let best: { gym: string; m: number } | null = null;
  gyms.forEach((g) => {
    const m = distanceM(lat, lon, g.lat, g.lon);
    if (!best || m < best.m) best = { gym: g.gym, m };
  });
  return best;
}

async function currentFix(): Promise<Location.LocationObject | null> {
  const recent = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000, requiredAccuracy: 200 });
  return recent ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
}

export async function detectGym(): Promise<string | null> {
  try {
    if (!getPrefs().gymAutoDetect) return null;
    const gyms = getGymLocations();
    if (gyms.length === 0) return null;
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const fix = await currentFix();
    if (!fix) return null;
    const n = nearest(fix.coords.latitude, fix.coords.longitude, gyms);
    return n && n.m <= NEAR_M ? n.gym : null;
  } catch {
    return null;
  }
}

export async function learnGymLocation(gym: string): Promise<void> {
  if (!gym.trim() || !getPrefs().gymAutoDetect) return;
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return;
    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    if ((fix.coords.accuracy ?? Infinity) > MAX_FIX_ACCURACY_M) return;
    const { latitude: lat, longitude: lon } = fix.coords;
    // A different known gym right here: the pick was probably a mistake —
    // don't teach the wrong spot.
    const other = nearest(lat, lon, getGymLocations().filter((g) => g.gym !== gym));
    if (other && other.m <= NEAR_M) return;
    addGymLocationFix(gym, lat, lon);
  } catch {
    // No fix / permission — nothing learned this time.
  }
}
