#!/usr/bin/env python3
import urllib.request
import zipfile
import os
import shutil
import subprocess
import json
import struct

repo_root = os.getcwd()
dist_dir = os.path.join(repo_root, 'dist')
public_dir = os.path.join(repo_root, 'downloads')
os.makedirs(public_dir, exist_ok=True)

print("=== 1. Starting Electron Standalone Windows Desktop Packaging ===")
win_work = '/tmp/win_build_electron'
shutil.rmtree(win_work, ignore_errors=True)
os.makedirs(win_work, exist_ok=True)

# 1. Download official Electron 28.2.0 win32-x64 binary
electron_zip = '/tmp/electron-v28.2.0-win32-x64.zip'
if not os.path.exists(electron_zip) or os.path.getsize(electron_zip) < 10000000:
    print('Downloading Electron 28.2.0 64-bit Windows Native Runtime...')
    url = 'https://github.com/electron/electron/releases/download/v28.2.0/electron-v28.2.0-win32-x64.zip'
    urllib.request.urlretrieve(url, electron_zip)

app_files = os.path.join(win_work, 'app_files')
os.makedirs(app_files, exist_ok=True)

print('Extracting Electron standalone runtime...')
with zipfile.ZipFile(electron_zip, 'r') as z:
    z.extractall(app_files)

# Rename executable to IdeniaHisba.exe
os.rename(os.path.join(app_files, 'electron.exe'), os.path.join(app_files, 'IdeniaHisba.exe'))

# Remove default app asar
def_app = os.path.join(app_files, 'resources', 'default_app.asar')
if os.path.exists(def_app):
    os.remove(def_app)

# 2. Create resources/app
app_dir = os.path.join(app_files, 'resources', 'app')
os.makedirs(app_dir, exist_ok=True)

pkg_json = {
    "name": "idenia-hisba",
    "productName": "Idenia Hisba",
    "version": "1.0.0",
    "description": "نظام الكاشير والمخازن ايدينيا حِسبة",
    "main": "main.js"
}
with open(os.path.join(app_dir, 'package.json'), 'w', encoding='utf-8') as f:
    json.dump(pkg_json, f, indent=2, ensure_ascii=False)

main_js = """const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'ايدينيا - حِسبة [نظام الكاشير والمخزن]',
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#18181B',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: false
    }
  });

  Menu.setApplicationMenu(null);
  win.maximize();

  const indexPath = path.join(__dirname, 'dist', 'index.html');
  win.loadFile(indexPath);

  win.once('ready-to-show', () => {
    win.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
"""
with open(os.path.join(app_dir, 'main.js'), 'w', encoding='utf-8') as f:
    f.write(main_js)

# Generate icon if needed
icon_ico = '/tmp/app_icon.ico'
if not os.path.exists(icon_ico):
    print('Generating desktop icon...')
    subprocess.run("convert -size 256x256 xc:'#2E7D32' -fill white -gravity center -pointsize 140 -annotate 0 'ح' /tmp/app_icon.png", shell=True, check=True)
    subprocess.run("convert /tmp/app_icon.png -define icon:auto-resize=64,48,32,16 /tmp/app_icon.ico", shell=True, check=True)

shutil.copy2(icon_ico, os.path.join(app_dir, 'icon.ico'))
shutil.copy2(icon_ico, os.path.join(app_files, 'app_icon.ico'))

# Copy dist files to resources/app/dist
dist_dest = os.path.join(app_dir, 'dist')
os.makedirs(dist_dest, exist_ok=True)
for item in os.listdir(dist_dir):
    if item.endswith(('.apk', '.zip', '.exe', '.idsig', '.map')):
        continue
    s = os.path.join(dist_dir, item)
    d = os.path.join(dist_dest, item)
    if os.path.isdir(s):
        shutil.copytree(s, d, dirs_exist_ok=True)
    else:
        shutil.copy2(s, d)

# 3. Create NSIS Installer
setup_output = os.path.join(win_work, 'IdeniaHisba_Setup.exe')

nsi_template = r"""Unicode True
Name "Idenia Hisba - ايدينيا حِسبة"
OutFile "__OUTFILE__"
InstallDir "$LOCALAPPDATA\Programs\IdeniaHisba"
InstallDirRegKey HKCU "Software\IdeniaHisba" "InstallDir"
RequestExecutionLevel user
Icon "__ICON__"

Page directory
Page instfiles

UninstPage uninstConfirm
UninstPage instfiles

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  File /r "__APPFILES__\*.*"

  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; Shortcuts
  CreateDirectory "$SMPROGRAMS\Idenia Hisba"
  CreateShortcut "$SMPROGRAMS\Idenia Hisba\Idenia Hisba.lnk" "$INSTDIR\IdeniaHisba.exe" "" "$INSTDIR\app_icon.ico"
  CreateShortcut "$SMPROGRAMS\Idenia Hisba\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  CreateShortcut "$DESKTOP\Idenia Hisba.lnk" "$INSTDIR\IdeniaHisba.exe" "" "$INSTDIR\app_icon.ico"

  ; Registry for Add/Remove Programs
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\IdeniaHisba" "DisplayName" "Idenia Hisba (نظام الكاشير والمخازن)"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\IdeniaHisba" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\IdeniaHisba" "DisplayIcon" "$INSTDIR\app_icon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\IdeniaHisba" "Publisher" "Idenia Systems"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\IdeniaHisba" "DisplayVersion" "1.0.0"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Idenia Hisba.lnk"
  RMDir /r "$SMPROGRAMS\Idenia Hisba"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\IdeniaHisba"
SectionEnd
"""

nsi_content = nsi_template.replace("__OUTFILE__", setup_output).replace("__APPFILES__", app_files).replace("__ICON__", icon_ico)
nsi_file = os.path.join(win_work, 'installer.nsi')
with open(nsi_file, 'w', encoding='utf-8') as f:
    f.write(nsi_content)

print('Compiling Electron NSIS Setup executable with makensis...')
res = subprocess.run(['makensis', nsi_file], capture_output=True, text=True)
if res.returncode != 0:
    print('NSIS Error:\n', res.stderr, res.stdout)
    raise RuntimeError('makensis failed')

print('IdeniaHisba_Setup.exe generated successfully! Size:', os.path.getsize(setup_output))
shutil.copy2(setup_output, os.path.join(public_dir, 'IdeniaHisba_Setup.exe'))

zip_dir = os.path.join(win_work, 'zip_contents')
os.makedirs(zip_dir, exist_ok=True)
shutil.copy2(setup_output, os.path.join(zip_dir, 'IdeniaHisba_Setup.exe'))

guide_text = """برنامج ايدينيا - حِسبة (نظام الكاشير والحسابات والمخزن)
تطبيق ويندوز المكتبي المستقل (Electron Native Desktop App)
======================================================

مميزات التطبيق المكتبي المستقل:
1. يعمل بشكل مباشر ومستقل تماماً مثل برامج الكاشير الاحترافية.
2. بدون أي استخدام لمتصفح إيدج (Microsoft Edge) وبدون طلب أي برامج إضافية.
3. لا يتطلب أي اتصال بسيرفرات محليّة (No localhost / No 127.0.0.1) لتجنب أي أخطاء.
4. أوفلاين 100% ويقوم بحفظ بيانات المبيعات والمخزن داخل جهازك بأمان تام.

خطوات التثبيت:
1. اضغط نقرة مزدوجة على "IdeniaHisba_Setup.exe".
2. اختر مكان التثبيت ثم اضغط "تثبيت".
3. ستظهر أيقونة التطبيق الرسمية "Idenia Hisba" على سطح المكتب وقائمة ابدأ.
"""
with open(os.path.join(zip_dir, 'دليل_التثبيت_والتشغيل.txt'), 'w', encoding='utf-8') as f:
    f.write(guide_text)

win_zip_out = os.path.join(public_dir, 'idenia-hisba-windows-setup.zip')
if os.path.exists(win_zip_out):
    os.remove(win_zip_out)
subprocess.run(['zip', '-r', win_zip_out, '.'], cwd=zip_dir, stdout=subprocess.DEVNULL, check=True)
print(f'SUCCESS! Electron Windows ZIP generated at: {win_zip_out} (size: {os.path.getsize(win_zip_out)} bytes)')

# ----------------------------------------------------
# 2. BUILD PRODUCTION ANDROID APK (UNIVERSAL COMPATIBLE)
# ----------------------------------------------------
print("\n=== 2. Starting Android APK Packaging (Universal Compatibility) ===")
apk_work = '/tmp/apk_build_universal'
shutil.rmtree(apk_work, ignore_errors=True)
os.makedirs(apk_work, exist_ok=True)

base_apk_path = '/tmp/apk_build/base.apk'
if not os.path.exists(base_apk_path):
    base_apk_path = os.path.join(repo_root, 'public', 'idenia-hisba.apk')
work_apk = os.path.join(apk_work, 'work.apk')
aligned_apk = os.path.join(apk_work, 'aligned.apk')
shutil.copyfile(base_apk_path, work_apk)

# 1. Extract AndroidManifest.xml and resources.arsc for patching
manifest_data = None
arsc_data = None
with zipfile.ZipFile(base_apk_path, 'r') as z:
    manifest_data = bytearray(z.read('AndroidManifest.xml'))
    arsc_data = bytearray(z.read('resources.arsc'))

# Patch AndroidManifest.xml:
# name=18 (compileSdkVersion), name=55 (platformBuildVersionCode), name=15 (targetSdkVersion)
# Change 36 -> 33 (Android 13, universally recognized by all Android 5.0 - 15+ devices)
for offset in range(0, len(manifest_data) - 20, 4):
    ns, name, rawVal, size, res_dtype, val = struct.unpack('<IIIHHI', manifest_data[offset:offset+20])
    if size == 8 and name in [15, 18, 55] and val == 36:
        struct.pack_into('<I', manifest_data, offset + 16, 33)

# Patch codename string 16 -> 13 in UTF-16LE
old_codename = '16'.encode('utf-16le')
new_codename = '13'.encode('utf-16le')
c_idx = manifest_data.find(old_codename)
if c_idx != -1:
    manifest_data[c_idx:c_idx+len(new_codename)] = new_codename

patched_manifest_path = os.path.join(apk_work, 'AndroidManifest.xml')
with open(patched_manifest_path, 'wb') as f:
    f.write(manifest_data)

# Patch resources.arsc: replace app name 'Karui' with 'Hisba'
arsc_data = arsc_data.replace(b'Karui', b'Hisba')
patched_arsc_path = os.path.join(apk_work, 'resources.arsc')
with open(patched_arsc_path, 'wb') as f:
    f.write(arsc_data)

# 2. Clean work APK from old signature and assets
subprocess.run(['zip', '-d', work_apk, 'META-INF/*'], stdout=subprocess.DEVNULL)
subprocess.run(['zip', '-d', work_apk, 'assets/*'], stdout=subprocess.DEVNULL)
subprocess.run(['zip', '-d', work_apk, 'AndroidManifest.xml'], stdout=subprocess.DEVNULL)
subprocess.run(['zip', '-d', work_apk, 'resources.arsc'], stdout=subprocess.DEVNULL)

# 3. Inject patched AndroidManifest.xml
curr = os.getcwd()
os.chdir(apk_work)
subprocess.run(['zip', '-9', 'work.apk', 'AndroidManifest.xml'], stdout=subprocess.DEVNULL, check=True)

# 4. Inject patched resources.arsc with STORED (0% COMPRESSION) - CRUCIAL FOR PARSING!
subprocess.run(['zip', '-0', 'work.apk', 'resources.arsc'], stdout=subprocess.DEVNULL, check=True)

# 5. Inject Web Assets from dist with Android WebView optimizations
new_assets = os.path.join(apk_work, 'assets')
os.makedirs(new_assets, exist_ok=True)
www_assets = os.path.join(new_assets, 'www')
os.makedirs(www_assets, exist_ok=True)

# Copy dist files to assets and assets/www
shutil.copytree(dist_dir, www_assets, dirs_exist_ok=True, ignore=shutil.ignore_patterns('*.apk', '*.zip', '*.exe', '*.idsig'))
shutil.copytree(dist_dir, new_assets, dirs_exist_ok=True, ignore=shutil.ignore_patterns('*.apk', '*.zip', '*.exe', '*.idsig'))

# Read original dist/index.html
with open(os.path.join(dist_dir, 'index.html'), 'r', encoding='utf-8') as f:
    orig_html = f.read()

# Transform index.html for Android WebView local file loading:
# Remove type="module" and crossorigin attributes which cause CORS blocks over file://
android_html = orig_html.replace('type="module"', '').replace('crossorigin', '')
android_html = android_html.replace('src="./assets/', 'src="assets/').replace('href="./assets/', 'href="assets/')

# Inject error diagnostic overlay
error_diagnostic = """
    <script>
      window.onerror = function(msg, url, line, col, error) {
        var d = document.getElementById('android-error-overlay');
        if (!d) {
          d = document.createElement('div');
          d.id = 'android-error-overlay';
          d.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#18181B;color:#EF4444;padding:20px;z-index:999999;font-family:sans-serif;font-size:13px;overflow:auto;text-align:left;dir:ltr;';
          document.body.appendChild(d);
        }
        d.innerHTML = '<h3 style="color:#FFF;margin:0 0 10px 0;">Android Runtime Error</h3><p><b>Error:</b> ' + msg + '</p><p><b>URL:</b> ' + url + ' (Line: ' + line + ')</p><pre style="background:#27272A;padding:10px;color:#A1A1AA;white-space:pre-wrap;">' + (error && error.stack ? error.stack : '') + '</pre>';
      };
      window.addEventListener('unhandledrejection', function(e) {
        window.onerror('Unhandled Rejection: ' + e.reason, '', 0, 0, e.reason);
      });
    </script>
"""
android_html = android_html.replace('<head>', '<head>' + error_diagnostic)

# Write transformed index.html to both assets/index.html and assets/www/index.html
with open(os.path.join(new_assets, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(android_html)
with open(os.path.join(www_assets, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(android_html)

subprocess.run(['zip', '-r', '-9', 'work.apk', 'assets'], stdout=subprocess.DEVNULL, check=True)
os.chdir(curr)

# 6. Run zipalign and apksigner if available
if shutil.which('zipalign') and shutil.which('apksigner'):
    print('Running zipalign on APK...')
    subprocess.run(['zipalign', '-f', '-v', '4', work_apk, aligned_apk], stdout=subprocess.DEVNULL, check=True)

    keystore = '/tmp/idenia.keystore'
    print('Signing APK with apksigner (v1 + v2 + v3)...')
    sign_cmd = [
        'apksigner', 'sign',
        '--ks', keystore,
        '--ks-pass', 'pass:hisba2026',
        '--ks-key-alias', 'ideniakey',
        '--v1-signing-enabled', 'true',
        '--v2-signing-enabled', 'true',
        '--v3-signing-enabled', 'true',
        aligned_apk
    ]
    subprocess.run(sign_cmd, check=True)
    target_apk = aligned_apk
else:
    print('zipalign/apksigner not found, using updated direct package...')
    target_apk = work_apk

final_apk_out = os.path.join(public_dir, 'idenia-hisba.apk')
shutil.copy2(target_apk, final_apk_out)
print(f'SUCCESS! Android APK ready at: {final_apk_out} (size: {os.path.getsize(final_apk_out)} bytes)')

print("\n=== ALL BUILDS COMPLETED SUCCESSFULLY ===")
