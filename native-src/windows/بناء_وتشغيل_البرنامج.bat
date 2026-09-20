@echo off
chcp 65001 >nul
echo =======================================================
echo    مشروع ايدينيا - حِسبة لويندوز (C# .NET 8 WPF Native)
echo =======================================================
echo.
echo جاري التحقق من بيئة عمل .NET 8...
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] تنبيه: لم يتم العثور على .NET SDK مثبت على جهازك.
    echo يمكنك تحميله مجانا من موقع مايكروسوفت: https://dotnet.microsoft.com/download/dotnet/8.0
    echo أو فتح ملف المشروع IdeniaHisba.sln داخل برنامج Visual Studio 2022.
    pause
    exit /b
)

echo [1/2] بناء التطبيق وتوليد ملف EXE مستقل (Single File Executable)...
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o ./dist-exe

if %errorlevel% equ 0 (
    echo.
    echo =======================================================
    echo تم بناء البرنامج بنجاح!
    echo ستجد ملف التشغيل المستقل في المجلد dist-exe باسم:
    echo IdeniaHisba.exe
    echo =======================================================
    echo.
) else (
    echo [!] حدث خطأ أثناء البناء، تأكد من اتصال الإنترنت لتنزيل حزم NuGet (SQLite).
)

pause
