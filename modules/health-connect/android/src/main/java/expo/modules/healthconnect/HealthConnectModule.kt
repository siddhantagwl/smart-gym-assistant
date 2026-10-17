package expo.modules.healthconnect

import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.time.Instant

// Read-only Health Connect: heart rate (avg / peak / sample count) and
// calories for a session — written there by the watch app (Zepp for the
// Bip 6). When a watch workout (e.g. Zepp "Free training") overlaps the
// session, its start/stop is the window, so the numbers match the watch app;
// otherwise the session's own start/end. Sadhana writes nothing, so no
// duplicate workouts.
class HealthConnectModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  private val permissions = hashSetOf(
    HealthPermission.getReadPermission(HeartRateRecord::class),
    HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
    HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
    HealthPermission.getReadPermission(ExerciseSessionRecord::class),
  )

  private var launcher: AppContextActivityResultLauncher<HashSet<String>, Set<String>>? = null

  // Expo's activity-result API around Health Connect's permission contract.
  private class RequestPermissions : AppContextActivityResultContract<HashSet<String>, Set<String>> {
    private val inner = PermissionController.createRequestPermissionResultContract()
    override fun createIntent(context: Context, input: HashSet<String>): Intent = inner.createIntent(context, input)
    override fun parseResult(input: HashSet<String>, resultCode: Int, intent: Intent?): Set<String> =
      inner.parseResult(resultCode, intent)
  }

  private fun available(): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
      HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

  override fun definition() = ModuleDefinition {
    Name("HealthConnect")

    RegisterActivityContracts {
      launcher = registerForActivityResult(RequestPermissions())
    }

    Function("isAvailable") { available() }

    AsyncFunction("hasPermissions") Coroutine { ->
      if (!available()) return@Coroutine false
      HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions().containsAll(permissions)
    }

    AsyncFunction("requestPermissions") Coroutine { ->
      val l = launcher
      if (!available() || l == null) return@Coroutine false
      l.launch(permissions).containsAll(permissions)
    }

    AsyncFunction("sessionStats") Coroutine { startMs: Double, endMs: Double ->
      if (!available()) return@Coroutine null
      val client = HealthConnectClient.getOrCreate(context)
      val start = Instant.ofEpochMilli(startMs.toLong())
      val end = Instant.ofEpochMilli(endMs.toLong())

      // The watch workout overlapping this session the most, if any.
      val workouts = client.readRecords(
        ReadRecordsRequest(
          ExerciseSessionRecord::class,
          TimeRangeFilter.between(start.minusSeconds(3 * 3600), end.plusSeconds(3 * 3600)),
        ),
      ).records
      fun overlapMs(w: ExerciseSessionRecord): Long =
        maxOf(0L, minOf(w.endTime, end).toEpochMilli() - maxOf(w.startTime, start).toEpochMilli())
      val workout = workouts.filter { overlapMs(it) > 0 }.maxByOrNull { overlapMs(it) }
      val from = workout?.startTime ?: start
      val to = workout?.endTime ?: end

      val result = client.aggregate(
        AggregateRequest(
          metrics = setOf(
            HeartRateRecord.BPM_AVG,
            HeartRateRecord.BPM_MAX,
            HeartRateRecord.MEASUREMENTS_COUNT,
            ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL,
            TotalCaloriesBurnedRecord.ENERGY_TOTAL,
          ),
          timeRangeFilter = TimeRangeFilter.between(from, to),
        ),
      )
      mapOf(
        "avgBpm" to result[HeartRateRecord.BPM_AVG]?.toDouble(),
        "maxBpm" to result[HeartRateRecord.BPM_MAX]?.toDouble(),
        "samples" to result[HeartRateRecord.MEASUREMENTS_COUNT]?.toDouble(),
        "activeKcal" to result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories,
        "totalKcal" to result[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories,
        "fromWatchWorkout" to (workout != null),
        "workoutTitle" to workout?.title,
        "windowStartMs" to from.toEpochMilli().toDouble(),
        "windowEndMs" to to.toEpochMilli().toDouble(),
      )
    }
  }
}
