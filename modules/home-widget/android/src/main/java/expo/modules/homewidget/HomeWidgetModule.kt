package expo.modules.homewidget

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HomeWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HomeWidget")

    // daysJson: {"yyyy-mm-dd": sets} for recent training days; targetDays:
    // days/week that turn the count green (Workout preferences).
    Function("setDays") { daysJson: String, targetDays: Int ->
      val ctx = requireNotNull(appContext.reactContext)
      ctx.getSharedPreferences(WeekWidgetProvider.PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(WeekWidgetProvider.KEY_DAYS, daysJson)
        .putInt(WeekWidgetProvider.KEY_TARGET, targetDays)
        .apply()
      WeekWidgetProvider.refreshAll(ctx)
    }
  }
}
