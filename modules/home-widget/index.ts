// Home-screen "this week" widget (Android). Native side:
// android/src/main/java/expo/modules/homewidget/. No-op where not built.
import { requireOptionalNativeModule } from "expo";

type HomeWidgetNative = {
  setDays(daysJson: string): void;
};

const HomeWidget = requireOptionalNativeModule<HomeWidgetNative>("HomeWidget");

// days: "yyyy-mm-dd" → sets that day, for recent training days.
export function setWidgetDays(days: Record<string, number>): void {
  HomeWidget?.setDays(JSON.stringify(days));
}
