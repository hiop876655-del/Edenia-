#!/usr/bin/env python3
import os
import sys
import shutil
import hashlib
import base64
import subprocess
import zipfile

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(WORKSPACE_ROOT, "dist")
PUBLIC_DIR = os.path.join(WORKSPACE_ROOT, "public")
DOWNLOADS_DIR = os.path.join(WORKSPACE_ROOT, "downloads")

print(f"[1/4] Checking Dist Build at: {DIST_DIR}")
if not os.path.exists(os.path.join(DIST_DIR, "index.html")):
    print("Running npm run build...")
    subprocess.run(["npm", "run", "build"], cwd=WORKSPACE_ROOT, check=True)

os.makedirs(DOWNLOADS_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(DIST_DIR, exist_ok=True)

# ----------------- 1. BUILD 100% OFFLINE ANDROID APK WITH OFFICIAL APKSIGNER & ZIPALIGN -----------------
print("[2/4] Assembling & Signing 100% Offline Android APK (v1 + v2 + v3 Schemes + 4-Byte ZipAlign)...")
apk_template = os.path.join(PUBLIC_DIR, "idenia-hisba.apk")
if not os.path.exists(apk_template):
    apk_template = os.path.join(DOWNLOADS_DIR, "idenia-hisba.apk")

apk_stage_dir = "/tmp/apk_full_stage"
shutil.rmtree(apk_stage_dir, ignore_errors=True)
os.makedirs(apk_stage_dir, exist_ok=True)

# Unpack existing APK template structure (DEX, manifest, res, arsc)
with zipfile.ZipFile(apk_template, 'r') as zf:
    zf.extractall(apk_stage_dir)

# Remove old META-INF signatures
shutil.rmtree(os.path.join(apk_stage_dir, "META-INF"), ignore_errors=True)

# Clear and populate assets
shutil.rmtree(os.path.join(apk_stage_dir, "assets"), ignore_errors=True)
assets_root = os.path.join(apk_stage_dir, "assets")
assets_www = os.path.join(apk_stage_dir, "assets", "www")
os.makedirs(assets_root, exist_ok=True)
os.makedirs(assets_www, exist_ok=True)

# Copy all dist assets into both assets/ and assets/www/
for item in os.listdir(DIST_DIR):
    if item.endswith(".apk") or item.endswith(".exe") or item.endswith(".zip") or item.endswith(".idsig"):
        continue
    s = os.path.join(DIST_DIR, item)
    d1 = os.path.join(assets_root, item)
    d2 = os.path.join(assets_www, item)
    if os.path.isdir(s):
        shutil.copytree(s, d1, dirs_exist_ok=True)
        shutil.copytree(s, d2, dirs_exist_ok=True)
    else:
        shutil.copy2(s, d1)
        shutil.copy2(s, d2)

# Pack unsigned APK with resources.arsc UNCOMPRESSED (standard Android compliance)
unsigned_apk = "/tmp/idenia_unsigned.apk"
if os.path.exists(unsigned_apk):
    os.remove(unsigned_apk)

with zipfile.ZipFile(unsigned_apk, "w") as zf:
    for root, dirs, files in os.walk(apk_stage_dir):
        for f in sorted(files):
            full_p = os.path.join(root, f)
            rel_p = os.path.relpath(full_p, apk_stage_dir)
            if rel_p == "resources.arsc" or rel_p.endswith(".so"):
                zf.write(full_p, rel_p, compress_type=zipfile.ZIP_STORED)
            else:
                zf.write(full_p, rel_p, compress_type=zipfile.ZIP_DEFLATED)

# Align with zipalign 4
aligned_apk = "/tmp/idenia_aligned.apk"
if os.path.exists(aligned_apk):
    os.remove(aligned_apk)
subprocess.run(["zipalign", "-p", "-f", "4", unsigned_apk, aligned_apk], check=True)

# Ensure Keystore exists
keystore_path = "/tmp/idenia.keystore"
if not os.path.exists(keystore_path):
    subprocess.run([
        "keytool", "-genkey", "-v", "-keystore", keystore_path,
        "-alias", "idenia", "-keyalg", "RSA", "-keysize", "2048",
        "-validity", "10000", "-storepass", "ideniapass", "-keypass", "ideniapass",
        "-dname", "CN=IdeniaHisba, OU=Idenia, O=Idenia, L=Cairo, ST=Cairo, C=EG"
    ], check=True)

# Sign with apksigner (v1, v2, and v3)
final_apk_path = os.path.join(DOWNLOADS_DIR, "idenia-hisba.apk")
if os.path.exists(final_apk_path):
    os.remove(final_apk_path)

subprocess.run([
    "apksigner", "sign",
    "--ks", keystore_path,
    "--ks-pass", "pass:ideniapass",
    "--key-pass", "pass:ideniapass",
    "--ks-key-alias", "idenia",
    "--v1-signing-enabled", "true",
    "--v2-signing-enabled", "true",
    "--v3-signing-enabled", "true",
    "--out", final_apk_path,
    aligned_apk
], check=True)

# Verify APK signature
v_res = subprocess.run(["apksigner", "verify", "--verbose", final_apk_path], capture_output=True, text=True, check=True)
print("Apk Verification Results:\n" + v_res.stdout)

# Copy to public and dist
shutil.copy2(final_apk_path, os.path.join(PUBLIC_DIR, "idenia-hisba.apk"))
shutil.copy2(final_apk_path, os.path.join(DIST_DIR, "idenia-hisba.apk"))
print(f"✅ Android APK built & verified: {final_apk_path} ({os.path.getsize(final_apk_path):,} bytes)")


# ----------------- 2. BUILD WINDOWS SETUP EXE & PORTABLE APP -----------------
print("[3/4] Preparing Windows Native App Bundle & Rebuilding NSIS Setup.exe...")
win_stage_dir = "/tmp/win_stage"
shutil.rmtree(win_stage_dir, ignore_errors=True)
os.makedirs(win_stage_dir, exist_ok=True)

# Copy full dist to app/dist
win_app_dir = os.path.join(win_stage_dir, "app")
os.makedirs(win_app_dir, exist_ok=True)

for item in os.listdir(DIST_DIR):
    if item.endswith(".apk") or item.endswith(".exe") or item.endswith(".zip") or item.endswith(".idsig"):
        continue
    s = os.path.join(DIST_DIR, item)
    d = os.path.join(win_app_dir, item)
    if os.path.isdir(s):
        shutil.copytree(s, d, dirs_exist_ok=True)
    else:
        shutil.copy2(s, d)

# Copy icon
icon_src = os.path.join(PUBLIC_DIR, "app_icon.ico")
if not os.path.exists(icon_src):
    icon_src = os.path.join(PUBLIC_DIR, "favicon.ico")
icon_dst = os.path.join(win_stage_dir, "app_icon.ico")
if os.path.exists(icon_src):
    shutil.copy2(icon_src, icon_dst)

# Create direct Windows launcher batch and vbs (standalone desktop kiosk/window)
launcher_bat = os.path.join(win_stage_dir, "IdeniaHisba.bat")
with open(launcher_bat, "w", encoding="utf-8") as f:
    f.write("""@echo off
chcp 65001 > nul
set "CURRENT_DIR=%~dp0"
set "APP_PATH=%CURRENT_DIR%app\\index.html"

:: 1. Try Microsoft Edge in App Mode (Pre-installed on Windows 10/11)
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%APP_PATH%" --window-size=1280,800 --window-position=100,50
    exit /b 0
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%APP_PATH%" --window-size=1280,800 --window-position=100,50
    exit /b 0
)

:: 2. Try Google Chrome in App Mode
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app="%APP_PATH%" --window-size=1280,800 --window-position=100,50
    exit /b 0
)
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --app="%APP_PATH%" --window-size=1280,800 --window-position=100,50
    exit /b 0
)

:: 3. Fallback default browser
start "" "%APP_PATH%"
exit /b 0
""")

launcher_vbs = os.path.join(win_stage_dir, "IdeniaHisba.vbs")
with open(launcher_vbs, "w", encoding="utf-8") as f:
    f.write("""Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & WshShell.CurrentDirectory & "\\IdeniaHisba.bat" & Chr(34), 0
Set WshShell = Nothing
""")

# Copy native C# source files if present
native_win_src = os.path.join(WORKSPACE_ROOT, "native-src", "windows")
if os.path.exists(native_win_src):
    shutil.copytree(native_win_src, os.path.join(win_stage_dir, "src_csharp"), dirs_exist_ok=True)

# Write NSIS script for professional installation
nsis_script_path = "/tmp/IdeniaHisba_Installer.nsi"
icon_path_safe = icon_dst if os.path.exists(icon_dst) else ""
icon_clause = f'Icon "{icon_dst}"\nUninstallIcon "{icon_dst}"' if os.path.exists(icon_dst) else ""

nsis_script = f"""
!define PRODUCT_NAME "ايدينيا - حِسبة"
!define PRODUCT_VERSION "1.2.1"
!define PRODUCT_PUBLISHER "م/ خالد - Idenia Tech"
!define PRODUCT_DIR_REGKEY "Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\IdeniaHisba.vbs"
!define PRODUCT_UNINST_KEY "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${{PRODUCT_NAME}}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

SetCompressor /SOLID zlib
Name "${{PRODUCT_NAME}} ${{PRODUCT_VERSION}}"
OutFile "{os.path.join(DOWNLOADS_DIR, 'IdeniaHisba_Setup.exe')}"
InstallDir "$LOCALAPPDATA\\IdeniaHisba"
InstallDirRegKey HKLM "${{PRODUCT_DIR_REGKEY}}" ""
ShowInstDetails show
ShowUnInstDetails show
RequestExecutionLevel user

{icon_clause}

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  File /r "{win_stage_dir}/*"
  
  CreateDirectory "$SMPROGRAMS\\${{PRODUCT_NAME}}"
  CreateShortCut "$SMPROGRAMS\\${{PRODUCT_NAME}}\\${{PRODUCT_NAME}}.lnk" "$INSTDIR\\IdeniaHisba.vbs" "" "$INSTDIR\\app_icon.ico" 0
  CreateShortCut "$DESKTOP\\${{PRODUCT_NAME}}.lnk" "$INSTDIR\\IdeniaHisba.vbs" "" "$INSTDIR\\app_icon.ico" 0
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\\uninstall.exe"
  WriteRegStr HKLM "${{PRODUCT_DIR_REGKEY}}" "" "$INSTDIR\\IdeniaHisba.vbs"
  WriteRegStr ${{PRODUCT_UNINST_ROOT_KEY}} "${{PRODUCT_UNINST_KEY}}" "DisplayName" "$(^Name)"
  WriteRegStr ${{PRODUCT_UNINST_ROOT_KEY}} "${{PRODUCT_UNINST_KEY}}" "UninstallString" "$INSTDIR\\uninstall.exe"
  WriteRegStr ${{PRODUCT_UNINST_ROOT_KEY}} "${{PRODUCT_UNINST_KEY}}" "DisplayIcon" "$INSTDIR\\app_icon.ico"
  WriteRegStr ${{PRODUCT_UNINST_ROOT_KEY}} "${{PRODUCT_UNINST_KEY}}" "DisplayVersion" "${{PRODUCT_VERSION}}"
  WriteRegStr ${{PRODUCT_UNINST_ROOT_KEY}} "${{PRODUCT_UNINST_KEY}}" "Publisher" "${{PRODUCT_PUBLISHER}}"
SectionEnd

Section "Uninstall"
  RMDir /r "$SMPROGRAMS\\${{PRODUCT_NAME}}"
  Delete "$DESKTOP\\${{PRODUCT_NAME}}.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKLM "${{PRODUCT_DIR_REGKEY}}"
  DeleteRegKey ${{PRODUCT_UNINST_ROOT_KEY}} "${{PRODUCT_UNINST_KEY}}"
SectionEnd

Function .onInstSuccess
  ExecShell "" "$INSTDIR\\IdeniaHisba.vbs"
FunctionEnd
"""

with open(nsis_script_path, "w", encoding="utf-8") as f:
    f.write(nsis_script)

print("Running makensis...")
subprocess.run(["makensis", nsis_script_path], check=True)

setup_exe_path = os.path.join(DOWNLOADS_DIR, "IdeniaHisba_Setup.exe")
shutil.copy2(setup_exe_path, os.path.join(PUBLIC_DIR, "IdeniaHisba_Setup.exe"))
shutil.copy2(setup_exe_path, os.path.join(DIST_DIR, "IdeniaHisba_Setup.exe"))
print(f"✅ Windows Setup.exe built: {setup_exe_path} ({os.path.getsize(setup_exe_path):,} bytes)")

# ----------------- 3. REBUILD WINDOWS ZIP PACKAGE -----------------
print("[4/4] Creating Windows Setup ZIP Archive...")
zip_pkg_path = os.path.join(DOWNLOADS_DIR, "idenia-hisba-windows-setup.zip")
guide_text = """=====================================================
نظام ايدينيا - حِسبة (إصدار الويندوز المباشر والمستقل)
=====================================================

خطوات التثبيت والتشغيل:
1. انقر نقراً مزدوجاً فوق ملف (IdeniaHisba_Setup.exe).
2. سيتم تثبيت البرنامج تلقائياً وإضافة اختصار مباشر على سطح المكتب وقائمة ابدأ.
3. يعمل البرنامج بالكامل محلياً 100% دون الحاجة إلى اتصال بالإنترنت أو تثبيت برامج إضافية.
4. ميزة التحديثات السحابية الحية (OTA) ومزامنة السحابة مفعلة تلقائياً.

للدعم الفني والاستفسار:
المهندس / خالد (مطور النظام)
هاتف / واتساب: 01121097822
=====================================================
"""

guide_path = "/tmp/دليل_التثبيت_والتشغيل.txt"
with open(guide_path, "w", encoding="utf-8") as f:
    f.write(guide_text)

with zipfile.ZipFile(zip_pkg_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(setup_exe_path, "IdeniaHisba_Setup.exe")
    zf.write(guide_path, "دليل_التثبيت_والتشغيل.txt")
    # Also add the portable launcher and app folder for instant portable run
    zf.write(launcher_bat, "IdeniaHisba.bat")
    zf.write(launcher_vbs, "IdeniaHisba.vbs")
    if os.path.exists(icon_dst):
        zf.write(icon_dst, "app_icon.ico")
    for root, dirs, files in os.walk(win_app_dir):
        for f in files:
            fp = os.path.join(root, f)
            rp = os.path.relpath(fp, win_stage_dir)
            zf.write(fp, rp)

shutil.copy2(zip_pkg_path, os.path.join(PUBLIC_DIR, "idenia-hisba-windows-setup.zip"))
shutil.copy2(zip_pkg_path, os.path.join(DIST_DIR, "idenia-hisba-windows-setup.zip"))
print(f"✅ Windows ZIP Package created: {zip_pkg_path} ({os.path.getsize(zip_pkg_path):,} bytes)")

print("\n🚀 ALL PACKAGES BUILT & UPDATED SUCCESSFULLY!")
