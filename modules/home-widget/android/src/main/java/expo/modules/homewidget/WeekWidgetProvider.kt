package expo.modules.homewidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar

// Home-screen strip: this week's M–S dots shaded by sets (same shades as the
// History dots), training days this week, and a Start button.
// Data: JS (services/homeWidget.ts) stores {"yyyy-mm-dd": sets} for recent
// training days via HomeWidgetModule; the week itself is computed here at
// render time so it rolls over without the app.
class WeekWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ids.forEach { manager.updateAppWidget(it, render(context)) }
  }

  companion object {
    const val PREFS = "sadhana_home_widget"
    const val KEY_DAYS = "days"
    const val KEY_TARGET = "target_days"
    private const val DEFAULT_TARGET_DAYS = 3

    private val DOTS = intArrayOf(
      R.id.week_d0, R.id.week_d1, R.id.week_d2, R.id.week_d3, R.id.week_d4, R.id.week_d5, R.id.week_d6,
    )
    private val LETTERS = intArrayOf(
      R.id.week_l0, R.id.week_l1, R.id.week_l2, R.id.week_l3, R.id.week_l4, R.id.week_l5, R.id.week_l6,
    )
    // components/ConsistencyDots.tsx SHADES / level().
    private val SHADES = arrayOf("#262626", "#1e4a33", "#27744d", "#3BAF75", "#7EE2AD")

    private fun level(sets: Int): Int = when {
      sets < 12 -> 1
      sets < 18 -> 2
      sets < 23 -> 3
      else -> 4
    }

    private fun key(c: Calendar): String =
      "%04d-%02d-%02d".format(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH))

    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, WeekWidgetProvider::class.java))
      ids.forEach { manager.updateAppWidget(it, render(context)) }
    }

    private fun openApp(context: Context, requestCode: Int, path: String): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("sadhana://$path")).apply {
        setPackage(context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      }
      return PendingIntent.getActivity(
        context, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
    }

    fun render(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.week_widget)
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val raw = prefs.getString(KEY_DAYS, null)
      val targetDays = prefs.getInt(KEY_TARGET, DEFAULT_TARGET_DAYS)
      val days = runCatching { JSONObject(raw ?: "{}") }.getOrDefault(JSONObject())

      val today = Calendar.getInstance()
      val todayKey = key(today)
      val day = (today.clone() as Calendar).apply {
        // Back to Monday.
        add(Calendar.DAY_OF_MONTH, -((get(Calendar.DAY_OF_WEEK) + 5) % 7))
      }

      var trained = 0
      var future = false
      for (i in 0 until 7) {
        val k = key(day)
        val isToday = k == todayKey
        val color = when {
          days.has(k) -> SHADES[level(days.optInt(k, 0))].also { trained++ }
          else -> SHADES[0]
        }
        views.setTextViewText(DOTS[i], if (!days.has(k) && isToday) "○" else "●")
        views.setTextColor(DOTS[i], Color.parseColor(if (!days.has(k) && isToday) "#999999" else color))
        views.setTextColor(LETTERS[i], Color.parseColor(if (isToday) "#FFFFFF" else if (future) "#555555" else "#888888"))
        if (isToday) future = true
        day.add(Calendar.DAY_OF_MONTH, 1)
      }

      views.setTextViewText(R.id.week_count, "$trained/wk")
      views.setTextColor(R.id.week_count, Color.parseColor(if (trained >= targetDays) "#3BAF75" else "#FFFFFF"))

      views.setOnClickPendingIntent(R.id.week_dots, openApp(context, 1, "history"))
      views.setOnClickPendingIntent(R.id.week_count, openApp(context, 1, "history"))
      views.setOnClickPendingIntent(R.id.week_start, openApp(context, 2, ""))
      return views
    }
  }
}
