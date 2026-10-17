package expo.modules.restlive

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// The "resting" notification with a countdown that ticks on its own (system
// chronometer counting down to the rest's end — no JS needed). Ongoing and
// requested as promoted, so on Android 16 it's a Live Update (status-bar chip
// on Pixel-style UIs). Samsung One UI 8.5 accepts the promotion
// (PROMOTED_ONGOING) but doesn't show third-party apps in its chip / Now Bar;
// there the countdown ticks in the shade and on the lock screen. Zepp still
// forwards it to the watch despite being ongoing.
//
// Posted under tag "rest", id 0 — the same slot expo-notifications uses for
// identifier "rest" — so the scheduled rest-done alert replaces it and
// Notifications.dismissNotificationAsync("rest") clears it.
//
// Action buttons (+30s / Skip rest) open the app with an intent extra; the
// module picks it up (new intent or cold start), emits "onRestAction" and
// keeps it for consumeAction() in case JS wasn't listening yet.
class RestLiveModule : Module() {
  private var pendingAction: String? = null
  private var pendingAt = 0L

  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  companion object {
    private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"
    private const val EXTRA_REST_ACTION = "expo.modules.restlive.ACTION"
    // A tap older than this is stale (e.g. the session screen never mounted).
    private const val PENDING_TTL_MS = 60_000L
  }

  private fun takeAction(intent: Intent?) {
    val action = intent?.getStringExtra(EXTRA_REST_ACTION) ?: return
    intent.removeExtra(EXTRA_REST_ACTION)
    pendingAction = action
    pendingAt = SystemClock.elapsedRealtime()
    sendEvent("onRestAction", mapOf("action" to action))
  }

  override fun definition() = ModuleDefinition {
    Name("RestLive")

    Events("onRestAction")

    OnCreate { takeAction(appContext.currentActivity?.intent) }
    OnNewIntent { intent -> takeAction(intent) }
    OnActivityEntersForeground { takeAction(appContext.currentActivity?.intent) }

    // The last button tapped (within PENDING_TTL_MS), once.
    Function("consumeAction") {
      val action = pendingAction?.takeIf { SystemClock.elapsedRealtime() - pendingAt < PENDING_TTL_MS }
      pendingAction = null
      action
    }

    Function("post") { tag: String, channelId: String, title: String, body: String, endsAtMs: Double,
                       actionIds: List<String>, actionTitles: List<String> ->
      val ctx = context
      fun openApp(requestCode: Int, action: String?): PendingIntent? {
        val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName) ?: return null
        launch.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        if (action != null) launch.putExtra(EXTRA_REST_ACTION, action)
        return PendingIntent.getActivity(
          ctx, requestCode, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
      }
      val tap = openApp(0, null)

      val builder = Notification.Builder(ctx, channelId)
        .setSmallIcon(ctx.applicationInfo.icon)
        .setContentTitle(title)
        .setContentText(body)
        .setWhen(endsAtMs.toLong())
        .setShowWhen(true)
        .setUsesChronometer(true)
        .setChronometerCountDown(true)
        .setOngoing(true)
        .setCategory(Notification.CATEGORY_STOPWATCH)
        // Not sensitive: show the countdown on the lock screen even when the
        // lock screen hides notification content.
        .setVisibility(Notification.VISIBILITY_PUBLIC)
        .setContentIntent(tap)
      // = Notification.Builder.setRequestPromotedOngoing(true) (Android 16);
      // set via the extra because the builder method isn't in this compileSdk.
      builder.addExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })

      actionIds.zip(actionTitles).forEachIndexed { i, (id, title) ->
        val pi = openApp(100 + i, id) ?: return@forEachIndexed
        builder.addAction(Notification.Action.Builder(null, title, pi).build())
      }

      val nm = ctx.getSystemService(NotificationManager::class.java)
      nm.notify(tag, 0, builder.build())
    }

    // True when Android will show it as a Live Update (Android 16+, not
    // switched off for this app).
    Function("canPromote") {
      if (Build.VERSION.SDK_INT < 36) return@Function false
      context.getSystemService(NotificationManager::class.java).canPostPromotedNotifications()
    }
  }
}
