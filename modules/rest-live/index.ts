// Native "resting" notification with a self-ticking countdown (Android 16
// Live Update: status-bar chip + Samsung Now Bar). Native side:
// android/src/main/java/expo/modules/restlive/RestLiveModule.kt.
// null where the module isn't built (iOS, web, Expo Go) — callers fall back.
import { requireOptionalNativeModule } from "expo";

type RestLiveNative = {
  post(tag: string, channelId: string, title: string, body: string, endsAtMs: number): void;
  canPromote(): boolean;
};

export const RestLive = requireOptionalNativeModule<RestLiveNative>("RestLive");
