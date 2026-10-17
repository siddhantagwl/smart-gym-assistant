// Native "resting" notification with a self-ticking countdown (Android 16
// Live Update) and +30s / Skip rest buttons. Native side:
// android/src/main/java/expo/modules/restlive/RestLiveModule.kt.
// null where the module isn't built (iOS, web, Expo Go) — callers fall back.
import { NativeModule, requireOptionalNativeModule } from "expo";

type RestLiveEvents = {
  // A button was tapped; read it with consumeAction() (also covers cold start).
  onRestAction: (event: { action: string }) => void;
};

declare class RestLiveNative extends NativeModule<RestLiveEvents> {
  post(
    tag: string,
    channelId: string,
    title: string,
    body: string,
    endsAtMs: number,
    actionIds: string[],
    actionTitles: string[],
  ): void;
  canPromote(): boolean;
  consumeAction(): string | null;
}

export const RestLive = requireOptionalNativeModule<RestLiveNative>("RestLive");
