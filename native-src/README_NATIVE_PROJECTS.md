# 📱💻 مشروع منظومة البرامج الأصلية الخام (Native 100% - No Browser / No WebView)
## نظام ايدينيا - حِسبة (نقاط البيع وإدارة المحلات والمخازن)

---

### 1. تطبيق الأندرويد الأصلي (Android Native Kotlin)
- **المسار في المشروع:** `/native-src/android/`
- **اللغة والتقنيات:** Kotlin, Jetpack Compose, Room SQLite Database, Retrofit, AndroidX Security Crypto.
- **طريقة البناء واستخراج ملف الـ APK الحقيقي:**
  1. افتح مجلد `/native-src/android/` داخل برنامج **Android Studio**.
  2. اضغط من القائمة العلوية على: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
  3. أو من سطر الأوامر (Terminal) اكتب:
     ```bash
     ./gradlew assembleRelease
     ```
  4. ستجد ملف **`app-release.apk`** جاهزاً وموقعاً في مسار:
     `app/build/outputs/apk/release/Idenia-Hisba.apk`

---

### 2. برنامج الويندوز الأصلي المستقل (Windows Native Desktop C# .NET 8)
- **المسار في المشروع:** `/native-src/windows/`
- **اللغة والتقنيات:** C# 12, .NET 8, WPF, Microsoft.Data.Sqlite, System.Management (Hardware Locking), Direct ESC/POS Thermal Printing.
- **طريقة البناء واستخراج ملف الـ EXE الحقيقي المستقل (Single File Executable):**
  1. افتح مجلد `/native-src/windows/` في **Visual Studio** أو سطر الأوامر.
  2. قم بتشغيل أمر البناء والتجميع المستقل:
     ```bash
     dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o ./dist-exe
     ```
  3. ستجد ملف **`Idenia-Hisba.exe`** واحداً مستقلاً بحجم مجمع يعمل مباشرة على أي كمبيوتر بنظام ويندوز دون الحاجة لتثبيت أي برامج إضافية وبدون أي متصفح.
