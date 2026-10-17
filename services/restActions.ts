// +30s / Skip rest taps from the rest notifications, from both sources:
// the native live countdown (modules/rest-live, intent extra) and the expo
// alert + nudge (notification category → response). Each tap opens the app;
// the subscriber (ActiveSession) applies it to the running rest.
import * as Notifications from "expo-notifications";

import { RestLive } from "@/modules/rest-live";
import { REST_ACTION_IDS, RestAction } from "@/services/notifications";

// An expo response for a notification older than this is stale (tapped while
// no session screen was mounted) — ignore it.
const MAX_RESPONSE_AGE_MS = 15 * 60 * 1000;

function asAction(id: string | null | undefined): RestAction | null {
  return REST_ACTION_IDS.find((a) => a === id) ?? null;
}

export function subscribeRestActions(onAction: (action: RestAction) => void): () => void {
  const takeNative = () => {
    const a = asAction(RestLive?.consumeAction());
    if (a) onAction(a);
  };

  const handleResponse = (r: Notifications.NotificationResponse | null) => {
    const a = asAction(r?.actionIdentifier);
    if (!r || !a) return;
    Notifications.clearLastNotificationResponse();
    if (Date.now() - r.notification.date > MAX_RESPONSE_AGE_MS) return;
    onAction(a);
  };

  // A tap that launched / resumed the app before we subscribed.
  takeNative();
  handleResponse(Notifications.getLastNotificationResponse());

  const nativeSub = RestLive?.addListener("onRestAction", takeNative);
  const expoSub = Notifications.addNotificationResponseReceivedListener(handleResponse);
  return () => {
    nativeSub?.remove();
    expoSub.remove();
  };
}
