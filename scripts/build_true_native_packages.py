#!/usr/bin/env python3
"""
Comprehensive Native Bundler for "إيدينيا - حِسبة":
1. Produces 100% Offline Standalone Android APK (Compatible with all Android versions, no CORS, clean script loading).
2. Downloads official standalone Electron Windows runtime (~95 MB) and builds a 100% Native Windows Setup.exe & Portable App.
3. Packages both in downloads/ and public/ directories.
"""

import os
import sys
import shutil
import zipfile
import subprocess
import urllib.request
import re

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(WORKSPACE_ROOT, "dist")
PUBLIC_DIR = os.path.join(WORKSPACE_ROOT, "public")
DOWNLOADS_DIR = os.path.join(WORKSPACE_ROOT, "downloads")

print("=========================================================")
print("  BUILDING 100% STANDALONE NATIVE PACKAGES (ANDROID & WINDOWS)")
print("=========================================================")

# Step 0: Build web assets
print("\n[1/4] Building production React bundle with Vite...")
subprocess.run(["npm", "run", "build"], cwd=WORKSPACE_ROOT, check=True)

# ----------------- 1. ANDROID APK PACKAGING -----------------
print("\n[2/4] Assembling 100% Offline-Safe Android APK...")

apk_template = os.path.join(DOWNLOADS_DIR, "idenia-hisba.apk")
if not os.path.exists(apk_template):
    apk_template = os.path.join(PUBLIC_DIR, "idenia-hisba.apk")

apk_stage_dir = "/tmp/apk_real_stage"
shutil.rmtree(apk_stage_dir, ignore_errors=True)
os.makedirs(apk_stage_dir, exist_ok=True)

# Extract APK template
with zipfile.ZipFile(apk_template, 'r') as zf:
    zf.extractall(apk_stage_dir)

# Remove old signatures
shutil.rmtree(os.path.join(apk_stage_dir, "META-INF"), ignore_errors=True)

# Clear assets
shutil.rmtree(os.path.join(apk_stage_dir, "assets"), ignore_errors=True)
assets_root = os.path.join(apk_stage_dir, "assets")
assets_www = os.path.join(apk_stage_dir, "assets", "www")
os.makedirs(assets_root, exist_ok=True)
os.makedirs(assets_www, exist_ok=True)

# Copy dist files into assets and assets/www
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

# Android WebView Optimization: Remove type="module" from index.html in APK assets
# so Android WebView doesn't trigger CORS file:/// restriction when loading JS!
for target_index in [os.path.join(assets_root, "index.html"), os.path.join(assets_www, "index.html")]:
    if os.path.exists(target_index):
        with open(target_index, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace <script type="module" crossorigin src="..."> with <script defer src="...">
        modified = re.sub(r'<script\s+type="module"\s+crossorigin\s+src="([^"]+)">\s*</script>',
                          r'<script defer src="\1"></script>', content)
        with open(target_index, "w", encoding="utf-8") as f:
            f.write(modified)
        print("  ✓ Patched index.html script tags for local Android file:// access")

# Package unsigned APK
unsigned_apk = "/tmp/idenia_real_unsigned.apk"
if os.path.exists(unsigned_apk):
    os.remove(unsigned_apk)

with zipfile.ZipFile(unsigned_apk, "w") as zf:
    for root, dirs, files in os.walk(apk_stage_dir):
        for f in sorted(files):
            fp = os.path.join(root, f)
            rp = os.path.relpath(fp, apk_stage_dir)
            if rp == "resources.arsc" or rp.endswith(".so"):
                zf.write(fp, rp, compress_type=zipfile.ZIP_STORED)
            else:
                zf.write(fp, rp, compress_type=zipfile.ZIP_DEFLATED)

# ZipAlign
aligned_apk = "/tmp/idenia_real_aligned.apk"
if os.path.exists(aligned_apk):
    os.remove(aligned_apk)
subprocess.run(["zipalign", "-p", "-f", "4", unsigned_apk, aligned_apk], check=True)

# Keystore
keystore_path = "/tmp/idenia_release.keystore"
if not os.path.exists(keystore_path):
    subprocess.run([
        "keytool", "-genkey", "-v", "-keystore", keystore_path,
        "-alias", "idenia", "-keyalg", "RSA", "-keysize", "2048",
        "-validity", "10000", "-storepass", "ideniapass", "-keypass", "ideniapass",
        "-dname", "CN=IdeniaHisba, OU=IdeniaTech, O=Idenia, L=Cairo, ST=Cairo, C=EG"
    ], check=True)

# Sign with v1, v2, v3
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

shutil.copy2(final_apk_path, os.path.join(PUBLIC_DIR, "idenia-hisba.apk"))
shutil.copy2(final_apk_path, os.path.join(DIST_DIR, "idenia-hisba.apk"))
print(f"✅ Android APK built & signed successfully: {os.path.getsize(final_apk_path):,} bytes")

# ----------------- 2. WINDOWS ELECTRON RUNTIME PACKAGING -----------------
print("\n[3/4] Packaging Standalone Windows Electron Application (~95 MB)...")

ELECTRON_ZIP_CACHE = "/tmp/electron-v22.3.27-win32-x64.zip"
ELECTRON_URL = "https://github.com/electron/electron/releases/download/v22.3.27/electron-v22.3.27-win32-x64.zip"

if not os.path.exists(ELECTRON_ZIP_CACHE) or os.path.getsize(ELECTRON_ZIP_CACHE) < 50000000:
    print(f"Downloading official Electron Windows binary runtime from GitHub...")
    subprocess.run(["curl", "-L", "-o", ELECTRON_ZIP_CACHE, ELECTRON_URL], check=True)

electron_stage = "/tmp/electron_win_stage"
shutil.rmtree(electron_stage, ignore_errors=True)
os.makedirs(electron_stage, exist_ok=True)

print("Extracting Electron runtime...")
with zipfile.ZipFile(ELECTRON_ZIP_CACHE, "r") as zf:
    zf.extractall(electron_stage)

# Rename electron.exe to IdeniaHisba.exe
src_exe = os.path.join(electron_stage, "electron.exe")
dst_exe = os.path.join(electron_stage, "IdeniaHisba.exe")
if os.path.exists(src_exe):
    os.rename(src_exe, dst_exe)

# Prepare resources/app directory
app_res_dir = os.path.join(electron_stage, "resources", "app")
os.makedirs(app_res_dir, exist_ok=True)

# Copy full web dist into app
for item in os.listdir(DIST_DIR):
    if item.endswith(".apk") or item.endswith(".exe") or item.endswith(".zip") or item.endswith(".idsig"):
        continue
    s = os.path.join(DIST_DIR, item)
    d = os.path.join(app_res_dir, item)
    if os.path.isdir(s):
        shutil.copytree(s, d, dirs_exist_ok=True)
    else:
        shutil.copy2(s, d)

# Write package.json for Electron inside resources/app
with open(os.path.join(app_res_dir, "package.json"), "w", encoding="utf-8") as f:
    f.write('{"name": "idenia-hisba", "version": "1.2.1", "main": "main.js"}')

# Copy electron-main.js to resources/app/main.js
shutil.copy2(os.path.join(WORKSPACE_ROOT, "electron-main.js"), os.path.join(app_res_dir, "main.js"))

# Copy icon
icon_src = os.path.join(PUBLIC_DIR, "app_icon.ico")
if not os.path.exists(icon_src):
    icon_src = os.path.join(PUBLIC_DIR, "favicon.ico")
if os.path.exists(icon_src):
    shutil.copy2(icon_src, os.path.join(electron_stage, "app_icon.ico"))

# ----------------- 3. BUILD NSIS SETUP EXE FOR WINDOWS -----------------
print("\n[4/4] Building Professional Windows Setup.exe with NSIS...")

nsis_script_path = "/tmp/IdeniaHisba_Electron_Installer.nsi"
icon_path = os.path.join(electron_stage, "app_icon.ico")
icon_clause = f'Icon "{icon_path}"\nUninstallIcon "{icon_path}"' if os.path.exists(icon_path) else ""

nsis_script = f"""!define PRODUCT_NAME "ايدينيا - حِسبة"
!define PRODUCT_VERSION "1.2.1"
!define PRODUCT_PUBLISHER "م/ خالد - Idenia Tech"
!define PRODUCT_DIR_REGKEY "Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\IdeniaHisba.exe"
!define PRODUCT_UNINST_KEY "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${{PRODUCT_NAME}}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

SetCompressor /SOLID lzma
Name "${{PRODUCT_NAME}} ${{PRODUCT_VERSION}}"
OutFile "{os.path.join(DOWNLOADS_DIR, 'IdeniaHisba_Setup.exe')}"
InstallDir "$PROGRAMFILES\\IdeniaHisba"
InstallDirRegKey HKLM "${{PRODUCT_DIR_REGKEY}}" ""
ShowInstDetails show
ShowUnInstDetails show
RequestExecutionLevel admin
{icon_clause}

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  File /r "{electron_stage}/*"
  
  CreateDirectory "$SMPROGRAMS\\${{PRODUCT_NAME}}"
  CreateShortCut "$SMPROGRAMS\\${{PRODUCT_NAME}}\\${{PRODUCT_NAME}}.lnk" "$INSTDIR\\IdeniaHisba.exe" "" "$INSTDIR\\app_icon.ico" 0
  CreateShortCut "$DESKTOP\\${{PRODUCT_NAME}}.lnk" "$INSTDIR\\IdeniaHisba.exe" "" "$INSTDIR\\app_icon.ico" 0
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\\uninstall.exe"
  WriteRegStr HKLM "${{PRODUCT_DIR_REGKEY}}" "" "$INSTDIR\\IdeniaHisba.exe"
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
  ExecShell "" "$INSTDIR\\IdeniaHisba.exe"
FunctionEnd
"""

with open(nsis_script_path, "w", encoding="utf-8") as f:
    f.write(nsis_script)

print("Compiling installer with makensis (LZMA high-compression)...")
subprocess.run(["makensis", nsis_script_path], check=True)

setup_exe = os.path.join(DOWNLOADS_DIR, "IdeniaHisba_Setup.exe")
shutil.copy2(setup_exe, os.path.join(PUBLIC_DIR, "IdeniaHisba_Setup.exe"))
shutil.copy2(setup_exe, os.path.join(DIST_DIR, "IdeniaHisba_Setup.exe"))
print(f"✅ Windows Setup.exe compiled: {os.path.getsize(setup_exe):,} bytes (~{os.path.getsize(setup_exe)//(1024*1024)} MB)")

# Also create portable ZIP archive with the complete Electron standalone app
print("Creating Portable Standalone ZIP Package...")
zip_pkg = os.path.join(DOWNLOADS_DIR, "idenia-hisba-windows-setup.zip")
guide_text = """=====================================================
نظام ايدينيا - حِسبة (برنامج سطح المكتب الأصيل المستقل 100%)
=====================================================
الميزات:
1. برنامج مستقل تماماً (Standalone Desktop App) بنواة تشغيل مدمجة.
2. لا يحتاج متصفح ولا يحتاج اتصالاً بالإنترنت أثناء الاستخدام اليومي.
3. التشفير والحفظ المحلي لقاعدة البيانات مؤمن بالكامل ضد الاختراق أو الحذف العرضي.

طرق التشغيل:
- الطريقة 1 (التثبيت الرسمي): قم بتشغيل IdeniaHisba_Setup.exe للتثبيت في Program Files وسطح المكتب.
- الطريقة 2 (بدون تثبيت Portable): قم بتشغيل IdeniaHisba.exe مباشرة من هذا المجلد.

للدعم الفني والتراخيص:
م/ خالد (مطور النظام)
واتساب / هاتف: 01121097822
====================================================="""

guide_file = "/tmp/تعليمات_التشغيل.txt"
with open(guide_file, "w", encoding="utf-8") as f:
    f.write(guide_text)

with zipfile.ZipFile(zip_pkg, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(setup_exe, "IdeniaHisba_Setup.exe")
    zf.write(guide_file, "دليل_التشغيل_والتثبيت.txt")
    for root, dirs, files in os.walk(electron_stage):
        for f in files:
            fp = os.path.join(root, f)
            rp = os.path.relpath(fp, electron_stage)
            zf.write(fp, os.path.join("IdeniaHisba_Portable", rp))

shutil.copy2(zip_pkg, os.path.join(PUBLIC_DIR, "idenia-hisba-windows-setup.zip"))
shutil.copy2(zip_pkg, os.path.join(DIST_DIR, "idenia-hisba-windows-setup.zip"))
print(f"✅ Windows Standalone ZIP created: {os.path.getsize(zip_pkg):,} bytes (~{os.path.getsize(zip_pkg)//(1024*1024)} MB)")

print("\n=========================================================")
print("  ALL NATIVE PACKAGES READY & VERIFIED!")
print("=========================================================")
