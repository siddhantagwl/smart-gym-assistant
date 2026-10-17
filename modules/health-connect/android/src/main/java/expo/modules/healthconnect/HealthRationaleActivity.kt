package expo.modules.healthconnect

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.widget.TextView

// Shown by Health Connect when you ask why Sadhana wants access.
class HealthRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val pad = (24 * resources.displayMetrics.density).toInt()
    setContentView(
      TextView(this).apply {
        setPadding(pad, pad * 2, pad, pad)
        setBackgroundColor(Color.parseColor("#0F0F0F"))
        setTextColor(Color.WHITE)
        textSize = 16f
        text = "Sadhana reads heart rate and active calories recorded by your watch, " +
          "only for the time of each gym session, to show average and peak heart rate " +
          "in Session details. It never writes to Health Connect and the data stays on this phone."
      },
    )
  }
}
