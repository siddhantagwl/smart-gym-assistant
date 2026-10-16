package expo.modules.restpip

import android.app.Activity
import android.app.PictureInPictureParams
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.text.TextUtils
import android.util.Rational
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Chronometer
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.app.PictureInPictureModeChangedInfo
import androidx.core.util.Consumer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Mini floating window (picture-in-picture) with the rest / switch countdown.
// While a rest is running JS "arms" it; leaving the app (home / recents) then
// shrinks the app into a small draggable window. JS is paused in PiP, so the
// window's content is a native overlay: a Chronometer counting down to the
// rest's end on its own (goes negative and red past 0, like the in-app timer).
class RestPipModule : Module() {
  private val main = Handler(Looper.getMainLooper())

  private var armed = false
  private var endsAtMs = 0L
  private var label = ""
  private var transition = false

  private var overlay: View? = null
  private var chronometer: Chronometer? = null
  private var listenedActivity: ComponentActivity? = null
  private val pipListener = Consumer<PictureInPictureModeChangedInfo> { info ->
    if (info.isInPictureInPictureMode) showOverlay() else hideOverlay()
  }

  private val activity: Activity?
    get() = appContext.currentActivity

  override fun definition() = ModuleDefinition {
    Name("RestPip")

    Function("arm") { endsAt: Double, text: String, isTransition: Boolean ->
      main.post {
        armed = true
        endsAtMs = endsAt.toLong()
        label = text
        transition = isTransition
        listenForPip()
        applyParams()
      }
    }

    Function("disarm") {
      main.post {
        armed = false
        applyParams()
        hideOverlay()
      }
    }

    // Android 8–11 have no auto-enter: enter PiP by hand when the user leaves.
    OnUserLeavesActivity {
      val act = activity ?: return@OnUserLeavesActivity
      if (armed && Build.VERSION.SDK_INT in Build.VERSION_CODES.O until Build.VERSION_CODES.S) {
        runCatching { act.enterPictureInPictureMode(buildParams()) }
      }
    }

    // Back from PiP (or any resume): make sure the overlay is gone.
    OnActivityEntersForeground {
      main.post {
        val act = activity
        if (act == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.N || !act.isInPictureInPictureMode) {
          hideOverlay()
        }
      }
    }

    OnDestroy {
      main.post {
        listenedActivity?.removeOnPictureInPictureModeChangedListener(pipListener)
        listenedActivity = null
        hideOverlay()
      }
    }
  }

  private fun listenForPip() {
    val act = activity as? ComponentActivity ?: return
    if (act === listenedActivity) return
    listenedActivity?.removeOnPictureInPictureModeChangedListener(pipListener)
    act.addOnPictureInPictureModeChangedListener(pipListener)
    listenedActivity = act
  }

  private fun buildParams(): PictureInPictureParams {
    val b = PictureInPictureParams.Builder().setAspectRatio(Rational(3, 2))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      b.setAutoEnterEnabled(armed).setSeamlessResizeEnabled(false)
    }
    return b.build()
  }

  private fun applyParams() {
    val act = activity ?: return
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    runCatching { act.setPictureInPictureParams(buildParams()) }
  }

  private fun showOverlay() {
    val act = activity ?: return
    val root = act.findViewById<ViewGroup>(android.R.id.content) ?: return
    hideOverlay()

    val baseColor = if (transition) Color.parseColor("#9CA3AF") else Color.parseColor("#FFC107")
    val overColor = Color.parseColor("#EF4444")

    val chrono = Chronometer(act).apply {
      base = SystemClock.elapsedRealtime() + (endsAtMs - System.currentTimeMillis())
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) isCountDown = true
      gravity = Gravity.CENTER
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(baseColor)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        setAutoSizeTextTypeUniformWithConfiguration(16, 80, 2, TypedValue.COMPLEX_UNIT_SP)
      } else {
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 36f)
      }
      setOnChronometerTickListener { c ->
        c.setTextColor(if (c.base < SystemClock.elapsedRealtime()) overColor else baseColor)
      }
      start()
    }

    val caption = TextView(act).apply {
      text = label
      gravity = Gravity.CENTER
      maxLines = 1
      ellipsize = TextUtils.TruncateAt.END
      setTextColor(Color.parseColor("#AAAAAA"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
    }

    val pad = (6 * act.resources.displayMetrics.density).toInt()
    val box = LinearLayout(act).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#0F0F0F"))
      setPadding(pad, pad, pad, pad)
      addView(chrono, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
      addView(
        caption,
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT),
      )
    }

    root.addView(box, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    overlay = box
    chronometer = chrono
  }

  private fun hideOverlay() {
    chronometer?.stop()
    chronometer = null
    val v = overlay ?: return
    (v.parent as? ViewGroup)?.removeView(v)
    overlay = null
  }
}
