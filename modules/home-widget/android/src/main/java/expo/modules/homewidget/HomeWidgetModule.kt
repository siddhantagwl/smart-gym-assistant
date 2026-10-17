package expo.modules.homewidget

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HomeWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HomeWidget")

    // daysJson: {"yyyy-mm-dd": sets} for recent training days.
    Function("setDays") { daysJson: String ->
      val ctx = requireNotNull(appContext.reactContext)
      ctx.getSharedPreferences(WeekWidgetProvider.PREFS, Context.MODE_PRIVATE)
        .edit().putString(WeekWidgetProvider.KEY_DAYS, daysJson).apply()
      WeekWidgetProvider.refreshAll(ctx)
    }
  }
}
