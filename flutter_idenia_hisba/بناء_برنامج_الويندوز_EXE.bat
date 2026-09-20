@echo off
chcp 65001 >nul
echo ========================================================
echo    بناء برنامج ويندوز المكتبي (EXE) لمشروع ايدينيا - حِسبة
echo ========================================================
echo.
echo جاري التحقق من بيئة عمل Flutter...
flutter --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] تنبيه: لم يتم العثور على Flutter مثبت على جهازك.
    pause
    exit /b
)

echo [1/3] تفعيل ميزة سطح مكتب ويندوز في فلاتر...
flutter config --enable-windows-desktop

echo [2/3] تنزيل الحزم والمكتبات (pub get)...
flutter pub get

echo [3/3] تجميع برنامج ويندوز التنفيذي (Release EXE)...
flutter build windows --release

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo تم بناء برنامج الويندوز بنجاح!
    echo ستجد مجلد البرنامج والملف التنفيذي في:
    echo build\windows\x64\runner\Release\idenia_hisba.exe
    echo ========================================================
) else (
    echo [!] حدث خطأ أثناء تجميع برنامج الويندوز.
    echo تأكد من تثبيت Visual Studio 2022 مع حزمة (Desktop development with C++).
)

pause
