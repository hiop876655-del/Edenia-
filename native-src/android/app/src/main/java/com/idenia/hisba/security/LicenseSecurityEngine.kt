package com.idenia.hisba.security

import android.annotation.SuppressLint
import android.content.Context
import android.os.SystemClock
import android.provider.Settings
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * 🔒 محرك الأمان وحماية التراخيص الأصلي للأندرويد (Kotlin Native)
 * - قفل الترخيص برقم المعرف الفريد للهاتف (Hardware Device ID)
 * - حرق الكود لمرة واحدة فقط عبر السيرفر المركزي
 * - كشف التلاعب بساعة الهاتف (Anti-Clock Tampering Engine)
 * - تشفير رخصة العمل محلياً بتقنية AES-256-GCM
 */
class LicenseSecurityEngine(private val context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val securePrefs = EncryptedSharedPreferences.create(
        context,
        "idenia_secure_vault",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    private val serverBaseUrl = "https://ais-pre-vaesdwpr4sazietbkzcxia-98514862508.asia-northeast1.run.app"

    @SuppressLint("HardwareIds")
    fun getHardwareDeviceId(): String {
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "UNKNOWN_DEV"
        val md = MessageDigest.getInstance("SHA-256")
        val hash = md.digest((androidId + "IDENIA_HISBA_SALT_2026").toByteArray())
        return hash.joinToString("") { "%02x".format(it) }.take(16).uppercase()
    }

    /**
     * تفعيل الكود مع السيرفر لمرة واحدة فقط واحتراقه
     */
    suspend fun activateLicenseCode(
        code: String,
        phone: String,
        shopName: String,
        fullName: String
    ): ActivationResult = withContext(Dispatchers.IO) {
        try {
            val url = URL("$serverBaseUrl/api/license/activate")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            conn.doOutput = true
            conn.connectTimeout = 8000
            conn.readTimeout = 8000

            val payload = JSONObject().apply {
                put("code", code.trim().uppercase())
                put("phone", phone.trim())
                put("shopName", shopName.trim())
                put("fullName", fullName.trim())
                put("deviceType", "Android Native App (Hardware ID: ${getHardwareDeviceId()})")
            }

            conn.outputStream.use { os ->
                os.write(payload.toString().toByteArray(Charsets.UTF_8))
            }

            val responseCode = conn.responseCode
            val responseBody = (if (responseCode in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader()?.use { it.readText() } ?: ""

            val json = JSONObject(responseBody)

            if (responseCode == 200 && json.optBoolean("success")) {
                val lic = json.getJSONObject("license")
                val expiresAt = lic.getLong("expiresAt")
                val createdAt = lic.getLong("createdAt")
                val durationLabel = lic.optString("durationLabel", "محدد")

                // حفظ الشهادة المشفرة محلياً
                securePrefs.edit()
                    .putString("KEY_LIC_CODE", code.trim().uppercase())
                    .putLong("KEY_EXPIRES_AT", expiresAt)
                    .putLong("KEY_CREATED_AT", createdAt)
                    .putString("KEY_DURATION_LABEL", durationLabel)
                    .putString("KEY_BOUND_DEVICE_ID", getHardwareDeviceId())
                    .putLong("KEY_LAST_RECORDED_TIME", System.currentTimeMillis())
                    .putLong("KEY_BOOT_ELAPSED_TICKS", SystemClock.elapsedRealtime())
                    .apply()

                return@withContext ActivationResult.Success(
                    code = code,
                    durationLabel = durationLabel,
                    expiresAt = expiresAt
                )
            } else {
                val errorMsg = json.optString("message", "فشل التفعيل، تأكد من صحة الكود أو الاتصال بالإنترنت")
                return@withContext ActivationResult.Error(errorMsg)
            }
        } catch (e: Exception) {
            return@withContext ActivationResult.Error("تعذر الاتصال بخادم التراخيص. يلزم توفر إنترنت لثوانٍ معدودة للتفعيل ومطابقة التوقيت العالمي.")
        }
    }

    /**
     * فحص صلاحية الترخيص محلياً في وضع الأوفلاين 100% مع كشف التلاعب
     */
    fun verifyLocalOfflineLicense(): LicenseState {
        val code = securePrefs.getString("KEY_LIC_CODE", null) ?: return LicenseState.NotActivated
        val boundDeviceId = securePrefs.getString("KEY_BOUND_DEVICE_ID", null)

        // 1. فحص بصمة الجهاز
        if (boundDeviceId != getHardwareDeviceId()) {
            return LicenseState.Tampered("تم رصد تشغيل التطبيق على جهاز آخر مختلف عن الجهاز المرخص له.")
        }

        val expiresAt = securePrefs.getLong("KEY_EXPIRES_AT", 0L)
        val lastRecordedTime = securePrefs.getLong("KEY_LAST_RECORDED_TIME", 0L)
        val currentTime = System.currentTimeMillis()

        // 2. كشف إرجاع ساعة الهاتف للوراء (Anti-Clock Tampering)
        if (currentTime < lastRecordedTime - 120_000) { // سماحية دقيقتين فقط
            return LicenseState.Tampered("تم رصد تلاعب بساعة الجهاز (تم إرجاع الوقت للخلف). يرجى ضبط الساعة الحقيقية.")
        }

        // 3. فحص انتهاء المدة
        if (currentTime >= expiresAt) {
            return LicenseState.Expired
        }

        // تحديث آخر وقت مسجل في الخزينة المشفرة
        securePrefs.edit().putLong("KEY_LAST_RECORDED_TIME", currentTime).apply()

        val remainingDays = Math.max(0, (expiresAt - currentTime) / (1000 * 60 * 60 * 24))
        return LicenseState.Active(code, remainingDays, expiresAt)
    }

    sealed class ActivationResult {
        data class Success(val code: String, val durationLabel: String, val expiresAt: Long) : ActivationResult()
        data class Error(val message: String) : ActivationResult()
    }

    sealed class LicenseState {
        object NotActivated : LicenseState()
        data class Active(val code: String, val remainingDays: Long, val expiresAt: Long) : LicenseState()
        object Expired : LicenseState()
        data class Tampered(val reason: String) : LicenseState()
    }
}
