import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { SetEntry } from "@/domain/exercise";
import { RestLive } from "@/modules/rest-live";

// Rest-done alert + the over-time nudge: long vibration so it's hard to miss.
// Android locks a channel's vibration once created, hence "-v2"; the old
// "rest-timer" (short buzz) is deleted.
const REST_CHANNEL_ID = "rest-timer-v2";
const OLD_REST_CHANNEL_ID = "rest-timer";
// "Resting…" notice posted when a rest starts — pops up (HIGH importance) but
// no sound/vibration on the phone; a normal (not ongoing) notification so watch
// apps (Zepp etc.) forward it. Android can't raise an existing channel's
// importance, hence "-v2"; the old DEFAULT-importance "rest-status" is deleted.
const REST_STATUS_CHANNEL_ID = "rest-status-v2";
const OLD_REST_STATUS_CHANNEL_ID = "rest-status";
// One identifier for both the start notice and the end alert, so the end
// alert replaces the notice instead of stacking under it.
const REST_ID = "rest";
// Second buzz if you're still resting this long after the timer ends. Its own
// identifier: a second scheduled "rest" would replace the end alert.
const NUDGE_ID = "rest-nudge";
const NUDGE_AFTER_SECONDS = 30;

// Default expo-notifications behavior is to suppress notifications while the
// app is foregrounded. We want the buzz even if the user is staring at the
// rest screen — so let them through.
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    // The start notice pops up like the alert, just without sound.
    const quiet = n.request.content.data?.quiet === true;
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: !quiet,
      shouldSetBadge: false,
    };
  },
});

let setupRan = false;

// False when Android would swallow the rest alert: the app's notification
// permission is off, or the user switched off the "Rest timer" channel.
// Settings shows a red "Notifications off" line — otherwise this fails silently.
export async function restNotificationsEnabled(): Promise<boolean> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return false;
    if (Platform.OS === "android") {
      const channel = await Notifications.getNotificationChannelAsync(REST_CHANNEL_ID);
      if (channel && channel.importance === Notifications.AndroidImportance.NONE) return false;
    }
    return true;
  } catch {
    return true; // can't tell — don't nag
  }
}

// Idempotent: requests permission, configures the Android channel.
// Called once on app boot. Safe to call again — the OS no-ops on dupes.
export async function setupNotifications(): Promise<boolean> {
  if (setupRan) return true;
  setupRan = true;

  if (Platform.OS === "android") {
    await Notifications.deleteNotificationChannelAsync(OLD_REST_CHANNEL_ID).catch(() => {});
    await Notifications.setNotificationChannelAsync(REST_CHANNEL_ID, {
      name: "Rest timer",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 600, 200, 600, 200, 600],
      lightColor: "#FFC107",
      sound: "default",
    });
    await Notifications.deleteNotificationChannelAsync(OLD_REST_STATUS_CHANNEL_ID).catch(() => {});
    await Notifications.setNotificationChannelAsync(REST_STATUS_CHANNEL_ID, {
      name: "Rest in progress",
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      enableVibrate: false,
      vibrationPattern: null,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (existing.canAskAgain === false) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

// What the rest notifications say. Kept to the timer + exercise: the watch
// (Amazfit Bip 6) screen is small. For a "set" rest: the exercise in progress
// and its sets so far; for a "transition": the exercise just finished.
export type RestDetails = {
  exercise: string;
  log: SetEntry[];
};

function fmtMinSec(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function restTexts(kind: "set" | "transition", total: number, d: RestDetails) {
  if (kind === "set") {
    const next = d.log.length + 1;
    return {
      start: { title: `Rest ${fmtMinSec(total)}`, body: `${d.exercise} · set ${next} next` },
      done: { title: `Rest done · Set ${next}`, body: d.exercise },
      nudge: { title: `Rest +${fmtMinSec(NUDGE_AFTER_SECONDS)} · Set ${next}`, body: d.exercise },
    };
  }
  return {
    start: { title: `Switch ${fmtMinSec(total)}`, body: `${d.exercise} done` },
    done: { title: "Next exercise", body: `${d.exercise} done` },
    nudge: { title: `Switch +${fmtMinSec(NUDGE_AFTER_SECONDS)}`, body: "Start the next exercise" },
  };
}

// All rest-notification calls run one after another, so a stop followed by an
// immediate start (Finish Set → new rest) can't dismiss the new notice.
let queue: Promise<void> = Promise.resolve();
function enqueue(fn: () => Promise<void>) {
  queue = queue.then(fn).catch((err) => {
    if (__DEV__) console.log(`[notif] rest notification failed:`, err);
  });
}

async function clearRest() {
  for (const id of [REST_ID, NUDGE_ID]) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await Notifications.dismissNotificationAsync(id).catch(() => {});
  }
}

function alertTrigger(seconds: number): Notifications.NotificationTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds,
    repeats: false,
    channelId: Platform.OS === "android" ? REST_CHANNEL_ID : undefined,
  };
}

// Posts the silent "resting" notice now, schedules the alert for when the rest
// ends (same identifier, so it replaces the notice) and a nudge 30s later.
// `seconds` is what's left; `total` the full target. Replaces any previous
// rest notifications — invariant: at most one rest's notifications at a time.
export function showRestNotifications(
  seconds: number,
  total: number,
  kind: "set" | "transition",
  details: RestDetails,
): void {
  enqueue(async () => {
    await clearRest();
    if (seconds <= 0) return;
    const t = restTexts(kind, total, details);
    if (RestLive) {
      // Native: countdown ticks by itself in the shade / lock screen, and on
      // Android 16 shows as a Live Update chip. Same "rest" slot, so the alert
      // below still replaces it.
      RestLive.post(REST_ID, REST_STATUS_CHANNEL_ID, t.start.title, t.start.body, Date.now() + seconds * 1000);
    } else {
      await Notifications.scheduleNotificationAsync({
        identifier: REST_ID,
        content: { title: t.start.title, body: t.start.body, sound: false, data: { quiet: true } },
        trigger: Platform.OS === "android" ? { channelId: REST_STATUS_CHANNEL_ID } : null,
      });
    }
    await Notifications.scheduleNotificationAsync({
      identifier: REST_ID,
      content: { title: t.done.title, body: t.done.body, sound: "default" },
      trigger: alertTrigger(seconds),
    });
    await Notifications.scheduleNotificationAsync({
      identifier: NUDGE_ID,
      content: { title: t.nudge.title, body: t.nudge.body, sound: "default" },
      trigger: alertTrigger(seconds + NUDGE_AFTER_SECONDS),
    });
    if (__DEV__) console.log(`[notif] rest-${kind} notice posted, alert in ${seconds}s`);
  });
}

// Cancels the pending alert + nudge and removes them from the shade (and so
// from the watch).
export function clearRestNotifications(): void {
  enqueue(clearRest);
}
