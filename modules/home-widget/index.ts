// Home-screen "this week" widget (Android). Native side:
// android/src/main/java/expo/modules/homewidget/. No-op where not built.
import { requireOptionalNativeModule } from "expo";

type HomeWidgetNative = {
  setDays(daysJson: string, targetDays: number): void;
};

const HomeWidget = requireOptionalNativeModule<HomeWidgetNative>("HomeWidget");

// days: "yyyy-mm-dd" → sets that day, for recent training days; targetDays:
// days/week that turn the count green.
export function setWidgetDays(days: Record<string, number>, targetDays: number): void {
  HomeWidget?.setDays(JSON.stringify(days), targetDays);
}
