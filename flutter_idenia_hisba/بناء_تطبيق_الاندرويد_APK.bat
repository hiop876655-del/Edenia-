@echo off
chcp 65001 >nul
echo ========================================================
echo    بناء تطبيق أندرويد (APK) لمشروع ايدينيا - حِسبة
echo ========================================================
echo.
echo جاري التحقق من بيئة عمل Flutter...
flutter --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] تنبيه: لم يتم العثور على Flutter مثبت على جهازك.
    echo يمكنك تثبيته مجاناً من: https://docs.flutter.dev/get-started/install
    pause
    exit /b
)

echo [1/3] جاري تحميل الحزم والمكتبات (pub get)...
flutter pub get

echo [2/3] جاري تجميع ملف الـ APK المستقل (Release)...
flutter build apk --release --split-per-abi

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo تم بناء تطبيق الأندرويد بنجاح!
    echo ستجد ملف الـ APK الجاهز للتثبيت في المسار:
    echo build\app\outputs\flutter-apk\app-arm64-v8a-release.apk
    echo ========================================================
) else (
    echo [!] حدث خطأ أثناء تجميع الـ APK.
)

pause
