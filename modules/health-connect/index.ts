// Read-only Health Connect (Android): watch heart rate + calories for a
// session — over the overlapping watch workout when there is one. Native side:
// android/src/main/java/expo/modules/healthconnect/HealthConnectModule.kt.
// null where the module isn't built (iOS, web, Expo Go).
import { requireOptionalNativeModule } from "expo";

export type WatchStats = {
  avgBpm: number | null;
  maxBpm: number | null;
  samples: number | null;
  activeKcal: number | null;
  totalKcal: number | null;
  // The window the numbers cover: the overlapping watch workout, else the session.
  fromWatchWorkout: boolean;
  workoutTitle: string | null;
  windowStartMs: number;
  windowEndMs: number;
};

type HealthConnectNative = {
  isAvailable(): boolean;
  hasPermissions(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  sessionStats(startMs: number, endMs: number): Promise<WatchStats | null>;
};

export const HealthConnect = requireOptionalNativeModule<HealthConnectNative>("HealthConnect");
