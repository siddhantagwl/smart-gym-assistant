// Mini floating window (Android picture-in-picture) showing the rest / switch
// countdown when you leave the app mid-rest. Native side:
// android/src/main/java/expo/modules/restpip/RestPipModule.kt. No-op where the
// module isn't built (iOS, web, Expo Go).
import { requireOptionalNativeModule } from "expo";

type RestPipNative = {
  arm(endsAtMs: number, label: string, transition: boolean): void;
  disarm(): void;
};

const RestPip = requireOptionalNativeModule<RestPipNative>("RestPip");

// Leaving the app from now on opens the mini window, counting down to `endsAt`.
export function armRestPip(endsAt: Date, label: string, kind: "set" | "transition"): void {
  RestPip?.arm(endsAt.getTime(), label, kind === "transition");
}

// No rest running: leaving the app behaves normally again.
export function disarmRestPip(): void {
  RestPip?.disarm();
}
