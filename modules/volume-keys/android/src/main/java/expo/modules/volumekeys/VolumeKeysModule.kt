package expo.modules.volumekeys

import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.Window
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Volume-down as a gym button. While JS has it enabled (session screen
// focused, exercise active), volume-down presses emit "onVolumeDown" and don't
// change the volume; volume-up and everything else pass through. Works by
// wrapping the activity window's callback, so no MainActivity changes. Key
// events only reach the app while it's on screen — screen off / other apps /
// PiP keep normal volume keys.
class VolumeKeysModule : Module() {
  private val main = Handler(Looper.getMainLooper())

  @Volatile private var enabled = false

  private inner class Interceptor(val original: Window.Callback) : Window.Callback by original {
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
      if (enabled && event.keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
        // One press = one event (ignore auto-repeat); swallow down and up.
        if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
          sendEvent("onVolumeDown")
        }
        return true
      }
      return original.dispatchKeyEvent(event)
    }
  }

  private fun install() {
    val window = appContext.currentActivity?.window ?: return
    val current = window.callback ?: return
    if (current is Interceptor) return
    window.callback = Interceptor(current)
  }

  override fun definition() = ModuleDefinition {
    Name("VolumeKeys")

    Events("onVolumeDown")

    Function("setEnabled") { on: Boolean ->
      enabled = on
      if (on) main.post { install() }
    }

    // Activity recreated: wrap its window again (no-op if already wrapped).
    OnActivityEntersForeground { if (enabled) main.post { install() } }
  }
}
