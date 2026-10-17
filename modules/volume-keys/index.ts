// Volume-down as the Start / Finish Set button on the session screen.
// Native side: android/src/main/java/expo/modules/volumekeys/VolumeKeysModule.kt.
// No-op where the module isn't built (iOS, web, Expo Go).
import { NativeModule, requireOptionalNativeModule } from "expo";

type VolumeKeysEvents = {
  onVolumeDown: () => void;
};

declare class VolumeKeysNative extends NativeModule<VolumeKeysEvents> {
  setEnabled(on: boolean): void;
}

const VolumeKeys = requireOptionalNativeModule<VolumeKeysNative>("VolumeKeys");

// While subscribed, volume-down calls `onPress` instead of lowering the volume.
export function captureVolumeDown(onPress: () => void): () => void {
  if (!VolumeKeys) return () => {};
  const sub = VolumeKeys.addListener("onVolumeDown", onPress);
  VolumeKeys.setEnabled(true);
  return () => {
    VolumeKeys.setEnabled(false);
    sub.remove();
  };
}
