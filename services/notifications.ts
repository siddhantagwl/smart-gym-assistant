import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const REST_CHANNEL_ID = "rest-timer";

// Default expo-notifications behavior is to suppress notifications while the
// app is foregrounded. We want the buzz even if the user is staring at the
// rest screen — so let them through.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let setupRan = false;

// Idempotent: requests permission, configures the Android channel.
// Called once on app boot. Safe to call again — the OS no-ops on dupes.
export async function setupNotifications(): Promise<boolean> {
  if (setupRan) return true;
  setupRan = true;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(REST_CHANNEL_ID, {
      name: "Rest timer",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 150, 300],
      lightColor: "#FFC107",
      sound: "default",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (existing.canAskAgain === false) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleRestDoneNotification(
  seconds: number,
  kind: "set" | "transition"
): Promise<string | null> {
  if (seconds <= 0) return null;

  const title = kind === "transition" ? "Next exercise" : "Rest done";
  const body =
    kind === "transition" ? "Ready for the next exercise" : "Time for your next set";

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
        channelId: Platform.OS === "android" ? REST_CHANNEL_ID : undefined,
      },
    });
    if (__DEV__) console.log(`[notif] scheduled rest-${kind} in ${seconds}s, id=${id}`);
    return id;
  } catch (err) {
    if (__DEV__) console.log(`[notif] schedule failed:`, err);
    return null;
  }
}

export async function cancelRestNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or was never scheduled — nothing to do.
  }
}
