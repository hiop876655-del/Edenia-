using System;
using System.IO;
using System.Management;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Idenia.Hisba.Security
{
    /// <summary>
    /// 🛡️ محرك الحماية والتراخيص الأصلي لنظام ويندوز (C# .NET Native)
    /// - قفل الترخيص برقم المعالج (CPU ID) واللوحة الأم (Motherboard UUID)
    /// - حرق الكود لمرة واحدة فقط عبر السيرفر المركزي
    /// - كشف التلاعب بساعة الويندوز (Anti-Clock Tampering)
    /// - تشفير الرخصة داخل ملف ثنائي محمي بـ DPAPI (Windows Data Protection)
    /// </summary>
    public static class HardwareSecurity
    {
        private static readonly string ServerBaseUrl = "https://ais-pre-vaesdwpr4sazietbkzcxia-98514862508.asia-northeast1.run.app";
        private static readonly string LicenseFilePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "IdeniaHisba",
            "license.dat"
        );

        /// <summary>
        /// استخراج البصمة الرقمية للكمبيوتر (Hardware Fingerprint)
        /// </summary>
        public static string GetHardwareId()
        {
            try
            {
                string cpuId = "";
                string mbSerial = "";

                // 1. استخراج معرف المعالج
                using (var searcher = new ManagementObjectSearcher("SELECT ProcessorId FROM Win32_Processor"))
                {
                    foreach (var item in searcher.Get())
                    {
                        cpuId = item["ProcessorId"]?.ToString() ?? "";
                        break;
                    }
                }

                // 2. استخراج سيريال اللوحة الأم
                using (var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BaseBoard"))
                {
                    foreach (var item in searcher.Get())
                    {
                        mbSerial = item["SerialNumber"]?.ToString() ?? "";
                        break;
                    }
                }

                string raw = $"{cpuId}#{mbSerial}#IDENIA_HISBA_2026";
                using (var sha256 = SHA256.Create())
                {
                    byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(raw));
                    return BitConverter.ToString(bytes).Replace("-", "").Substring(0, 16);
                }
            }
            catch
            {
                return Environment.MachineName + "_SECURE_ID";
            }
        }

        /// <summary>
        /// تفعيل الكود مع السيرفر المركزي
        /// </summary>
        public static async Task<(bool Success, string Message, long ExpiresAt)> ActivateLicenseAsync(
            string code,
            string phone,
            string shopName,
            string fullName)
        {
            try
            {
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
                var payload = new
                {
                    code = code.Trim().ToUpper(),
                    phone = phone.Trim(),
                    shopName = shopName.Trim(),
                    fullName = fullName.Trim(),
                    deviceType = $"Windows PC Native (.NET 8 - HWID: {GetHardwareId()})"
                };

                var content = new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");
                var response = await client.PostAsync($"{ServerBaseUrl}/api/license/activate", content);
                var body = await response.Content.ReadAsStringAsync();
                var json = JObject.Parse(body);

                if (response.IsSuccessStatusCode && json["success"]?.Value<bool>() == true)
                {
                    var lic = json["license"];
                    long expiresAt = lic["expiresAt"].Value<long>();
                    long createdAt = lic["createdAt"].Value<long>();
                    string durationLabel = lic["durationLabel"]?.ToString() ?? "محدد";

                    // تشفير وحفظ الشهادة محلياً في ويندوز باستخدام Windows DPAPI
                    var certData = new
                    {
                        Code = code.Trim().ToUpper(),
                        ExpiresAt = expiresAt,
                        CreatedAt = createdAt,
                        DurationLabel = durationLabel,
                        HardwareId = GetHardwareId(),
                        LastRecordedTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                    };

                    SaveEncryptedLicense(JsonConvert.SerializeObject(certData));
                    return (true, "تم تفعيل البرنامج بنجاح!", expiresAt);
                }
                else
                {
                    string msg = json["message"]?.ToString() ?? "فشل تفعيل الترخيص";
                    return (false, msg, 0);
                }
            }
            catch (Exception ex)
            {
                return (false, $"تعذر الاتصال بالخادم: {ex.Message}. تأكد من توفر إنترنت لثوانٍ معدودة للتفعيل ومطابقة التوقيت.", 0);
            }
        }

        /// <summary>
        /// التحقق من صلاحية الترخيص محلياً في وضع الأوفلاين 100%
        /// </summary>
        public static (bool IsValid, string StatusText, long RemainingDays) VerifyLocalOfflineLicense()
        {
            try
            {
                if (!File.Exists(LicenseFilePath))
                    return (false, "البرنامج غير مفعل", 0);

                string jsonStr = ReadEncryptedLicense();
                var cert = JObject.Parse(jsonStr);

                string boundHwid = cert["HardwareId"]?.ToString() ?? "";
                if (boundHwid != GetHardwareId())
                    return (false, "تم رصد محاولة تشغيل الترخيص على جهاز مختلف!", 0);

                long expiresAt = cert["ExpiresAt"]?.Value<long>() ?? 0;
                long lastTime = cert["LastRecordedTime"]?.Value<long>() ?? 0;
                long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

                // كشف إرجاع ساعة الويندوز
                if (now < lastTime - 120000)
                {
                    return (false, "تم رصد تلاعب بساعة الجهاز (تم إرجاع الوقت للخلف). يرجى ضبط الساعة الصحيحة.", 0);
                }

                if (now >= expiresAt)
                {
                    return (false, "انتهت فترة صلاحية هذا الترخيص.", 0);
                }

                // تحديث آخر وقت مسجل
                cert["LastRecordedTime"] = now;
                SaveEncryptedLicense(cert.ToString());

                long remainingDays = Math.Max(0, (expiresAt - now) / (1000 * 60 * 60 * 24));
                return (true, "الترخيص ساري", remainingDays);
            }
            catch
            {
                return (false, "فشل قراءة شهادة الترخيص", 0);
            }
        }

        private static void SaveEncryptedLicense(string plainText)
        {
            string dir = Path.GetDirectoryName(LicenseFilePath)!;
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);

            byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
            byte[] cipherBytes = ProtectedData.Protect(plainBytes, null, DataProtectionScope.CurrentUser);
            File.WriteAllBytes(LicenseFilePath, cipherBytes);
        }

        private static string ReadEncryptedLicense()
        {
            byte[] cipherBytes = File.ReadAllBytes(LicenseFilePath);
            byte[] plainBytes = ProtectedData.Unprotect(cipherBytes, null, DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(plainBytes);
        }
    }
}
