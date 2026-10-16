package expo.modules.restlive

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
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
class RestLiveModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  companion object {
    private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"
  }

  override fun definition() = ModuleDefinition {
    Name("RestLive")

    Function("post") { tag: String, channelId: String, title: String, body: String, endsAtMs: Double ->
      val ctx = context
      val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.apply {
        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
      }
      val tap = launch?.let {
        PendingIntent.getActivity(ctx, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      }

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
