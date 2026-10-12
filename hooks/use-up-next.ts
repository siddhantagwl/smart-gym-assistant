// "Up next" queue for the active session. Lets the Exercises tab queue
// library exercises while the Home tab's ActiveSession pulls them into the
// exercise picker when it's free (between exercises). Module-level store so
// both tabs share it without lifting ActiveSession's state; persisted to
// AsyncStorage so the queue survives Android killing the app mid-session.
import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UpNextItem = { libraryId: string; name: string };

// What ActiveSession is showing right now, so the Exercises tab can label
// rows "Now" / "Next" without reaching into ActiveSession's state.
export type UpNextCurrent = { name: string; active: boolean } | null;

type UpNextState = {
  sessionId: string | null;
  items: UpNextItem[];
  current: UpNextCurrent;
};

const STORAGE_KEY = "up_next_queue_v1";

let state: UpNextState = { sessionId: null, items: [], current: null };
const listeners = new Set<() => void>();

function emit(next: UpNextState) {
  state = next;
  listeners.forEach((l) => l());
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ sessionId: state.sessionId, items: state.items }),
  ).catch(() => {});
}

// Queue belongs to one session; anything left over from an older session is dropped.
function itemsFor(sessionId: string): UpNextItem[] {
  return state.sessionId === sessionId ? state.items : [];
}

const sameName = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw || state.sessionId !== null) return;
    const saved = JSON.parse(raw);
    if (typeof saved?.sessionId === "string" && Array.isArray(saved.items)) {
      state = { ...state, sessionId: saved.sessionId, items: saved.items };
      listeners.forEach((l) => l());
    }
  })
  .catch(() => {});

export function addToUpNext(sessionId: string, item: UpNextItem) {
  const items = itemsFor(sessionId);
  if (items.some((i) => sameName(i.name, item.name))) return;
  emit({ ...state, sessionId, items: [...items, item] });
}

export function removeFromUpNext(sessionId: string, name: string) {
  const items = itemsFor(sessionId);
  emit({ ...state, sessionId, items: items.filter((i) => !sameName(i.name, name)) });
}

// Put an item back at the head of the queue (used when a not-yet-started
// picker selection is swapped out for a queued one).
export function pushFrontUpNext(sessionId: string, item: UpNextItem) {
  const items = itemsFor(sessionId).filter((i) => !sameName(i.name, item.name));
  emit({ ...state, sessionId, items: [item, ...items] });
}

export function takeUpNext(sessionId: string, name?: string): UpNextItem | null {
  const items = itemsFor(sessionId);
  const picked = name ? items.find((i) => sameName(i.name, name)) : items[0];
  if (!picked) return null;
  emit({ ...state, sessionId, items: items.filter((i) => i !== picked) });
  return picked;
}

export function clearUpNext() {
  emit({ sessionId: null, items: [], current: null });
}

export function setUpNextCurrent(current: UpNextCurrent) {
  const prev = state.current;
  if (prev?.name === current?.name && prev?.active === current?.active) return;
  state = { ...state, current };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUpNext(): UpNextState {
  return useSyncExternalStore(subscribe, () => state);
}

export function useUpNextItems(sessionId: string | null): UpNextItem[] {
  const s = useUpNext();
  return sessionId && s.sessionId === sessionId ? s.items : EMPTY;
}

const EMPTY: UpNextItem[] = [];
