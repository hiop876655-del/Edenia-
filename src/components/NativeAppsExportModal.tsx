import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Terminal,
  Code2,
  Download,
  Copy,
  Check,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Lock,
  Layers,
  FileCode,
  FolderArchive,
  X,
  ExternalLink,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface NativeAppsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NativeAppsExportModal: React.FC<NativeAppsExportModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'windows' | 'android' | 'comparison'>('windows');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [downloadingPlatform, setDownloadingPlatform] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleDownloadZip = async (platform: string, filename: string) => {
    try {
      setDownloadingPlatform(platform);
      const res = await fetch(`/api/native/download/${platform}`, {
        cache: 'no-store'
      });
      if (!res.ok) {
        throw new Error(`خطأ بالخادم (${res.status})`);
      }
      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error('الملف المستلم فارغ');
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err: any) {
      console.warn('Direct blob download fallback to new window:', err);
      // Fallback
      window.location.href = `/api/native/download/${platform}`;
    } finally {
      setDownloadingPlatform(null);
    }
  };

  const windowsBuildCmd = `dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o ./dist-exe`;
  const androidBuildCmd = `./gradlew assembleRelease`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" dir="rtl">
      <div className="bg-white dark:bg-[#181818] rounded-3xl max-w-4xl w-full border border-gray-200 dark:border-zinc-800 shadow-2xl p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  مركز التطبيقات والبرامج الأصلية الخام (100% Native Source)
                </h2>
                <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  خالٍ من المتصفحات تماماً
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                أكواد C# .NET 8 لويندوز و Kotlin لأندرويد مبرمجة للتجميع المباشر إلى ملفات EXE و APK مستقلة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-100 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('windows')}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'windows'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>برنامج الويندوز الأصلي (C# .NET 8 EXE)</span>
          </button>

          <button
            onClick={() => setActiveTab('android')}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'android'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>تطبيق الأندرويد الأصلي (Kotlin APK)</span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>الفرق بين التطبيق الأصلي وتطبيقات الويب</span>
          </button>
        </div>

        {/* TAB 1: WINDOWS NATIVE (.NET 8 C#) */}
        {activeTab === 'windows' && (
          <div className="space-y-5">
            {/* Info Card */}
            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-black text-sm">
                  <Laptop className="w-5 h-5 text-blue-600" />
                  <span>برنامج C# .NET 8 WPF للكمبيوتر المكتبي</span>
                </div>
                <span className="text-[10px] font-bold bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2.5 py-0.5 rounded-full font-mono">
                  100% Native EXE
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                مشروع ويندوز كامل مبني بلغة **C#** وواجهات **WPF** وقاعدة بيانات محلية **SQLite**. يخاطب المعالج والرامات وطابعات الكاشير الحرارية وقارئ الباركود عبر الـ USB مباشرة بدون أي متصفح.
              </p>
            </div>

            {/* Architecture Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 dark:text-white">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span>قفل البصمة الرقمية</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  ربط الترخيص بسيريال اللوحة الأم والمعالج (Motherboard UUID + CPU ID).
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 dark:text-white">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>تشفير الرخصة DPAPI</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  تشفير بيانات الترخيص بشهادة أمان ويندوز المشفرة داخل ملف binary محمي.
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 dark:text-white">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  <span>ملف تنفيذي واحد</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  تجميع البرنامج في ملف <code className="font-mono text-xs">Idenia-Hisba.exe</code> واحد مستقل ذاتياً.
                </p>
              </div>
            </div>

            {/* Build Command Box */}
            <div className="p-4 bg-zinc-900 text-zinc-100 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>أمر بناء ملف الـ EXE المستقل على ويندوز (Terminal / PowerShell):</span>
                </span>
                <button
                  onClick={() => copyToClipboard(windowsBuildCmd, 'win_cmd')}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 bg-zinc-800 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                >
                  {copiedSection === 'win_cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'win_cmd' ? 'تم النسخ' : 'نسخ الأمر'}</span>
                </button>
              </div>

              <div className="bg-black/60 p-3 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto text-left" dir="ltr">
                {windowsBuildCmd}
              </div>
            </div>

            {/* Source Files Structure */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-gray-900 dark:text-white">
                <FolderArchive className="w-4 h-4 text-blue-600" />
                <span>ملفات السورس كود لويندوز (المسار: <code className="font-mono text-blue-600">/native-src/windows/</code>):</span>
              </div>
              <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5 font-mono text-right list-disc pr-5">
                <li><strong className="text-gray-900 dark:text-white">IdeniaHisba.csproj</strong> - إعدادات البناء المستقل وحزم SQLite و ESC/POS</li>
                <li><strong className="text-gray-900 dark:text-white">MainWindow.xaml / xaml.cs</strong> - واجهات الكاشير ونقاط البيع السريعة</li>
                <li><strong className="text-gray-900 dark:text-white">Security/HardwareSecurity.cs</strong> - محرك البصمة الرقمية وحرق الكود والتوقيت</li>
                <li><strong className="text-gray-900 dark:text-white">Database/LocalDatabase.cs</strong> - قاعدة بيانات SQLite المحلية الأوفلاين</li>
              </ul>
            </div>

            {/* Direct Download ZIP Button */}
            <div className="flex items-center justify-between p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl">
              <div className="text-xs space-y-0.5">
                <div className="font-black text-blue-900 dark:text-blue-100">تحميل حزمة مشروع الويندوز كاملة (.NET 8 C#)</div>
                <div className="text-blue-700 dark:text-blue-300 text-[11px]">ملف ZIP مضغوط يحتوي على كامل الكود ومكتبات SQLite لفتحه وبنائه بضغطة زر</div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadZip('windows', 'idenia-windows-csharp-source.zip')}
                disabled={downloadingPlatform === 'windows'}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Download className={`w-4 h-4 ${downloadingPlatform === 'windows' ? 'animate-bounce' : ''}`} />
                <span>{downloadingPlatform === 'windows' ? 'جاري التحميل...' : 'تحميل ملف ZIP لويندوز'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ANDROID NATIVE (KOTLIN) */}
        {activeTab === 'android' && (
          <div className="space-y-5">
            {/* Info Card */}
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-black text-sm">
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  <span>تطبيق Android Kotlin الأصلي مع Jetpack Compose</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                  100% Native APK
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                مشروع أندرويد ستوديو متكامل مكتوب بلغة **Kotlin** وأحدث مكتبات أندرويد الرسمية من جوجل (**Jetpack Compose** و **Room Database**). يُترجم مباشرة إلى لغة الآلة (Machine Code) كملف **APK** حقيقي.
              </p>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 dark:text-white">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>قاعدة بيانات Room</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  حفظ الأصناف والفواتير والديون محلياً أوفلاين في الهاتف.
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>حماية التوقيت والساعة</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  منع إرجاع ساعة الهاتف للوراء وقفل الترخيص بهوية Android_ID.
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 dark:text-white">
                  <Code2 className="w-4 h-4 text-purple-600" />
                  <span>قارئ باركود الكاميرا</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  دمج Google ML Kit لمسح الباركود بسرعة فائقة عبر الكاميرا.
                </p>
              </div>
            </div>

            {/* Build Command Box */}
            <div className="p-4 bg-zinc-900 text-zinc-100 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>أمر بناء وتوليد ملف الـ APK الأصلي (Android Studio Terminal):</span>
                </span>
                <button
                  onClick={() => copyToClipboard(androidBuildCmd, 'apk_cmd')}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 bg-zinc-800 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                >
                  {copiedSection === 'apk_cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'apk_cmd' ? 'تم النسخ' : 'نسخ الأمر'}</span>
                </button>
              </div>

              <div className="bg-black/60 p-3 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto text-left" dir="ltr">
                {androidBuildCmd}
              </div>
            </div>

            {/* Source Files Structure */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-gray-900 dark:text-white">
                <FolderArchive className="w-4 h-4 text-emerald-600" />
                <span>ملفات السورس كود لأندرويد (المسار: <code className="font-mono text-emerald-600">/native-src/android/</code>):</span>
              </div>
              <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5 font-mono text-right list-disc pr-5">
                <li><strong className="text-gray-900 dark:text-white">app/build.gradle.kts</strong> - إعدادات الحزم و Compose و Room Database</li>
                <li><strong className="text-gray-900 dark:text-white">AndroidManifest.xml</strong> - أذونات الكاميرا والبلوتوث والطباعة</li>
                <li><strong className="text-gray-900 dark:text-white">MainActivity.kt</strong> - واجهات التطبيق الرئيسية والكاشير بالـ Compose</li>
                <li><strong className="text-gray-900 dark:text-white">security/LicenseSecurityEngine.kt</strong> - التشفير وحرق الكود والبصمة</li>
                <li><strong className="text-gray-900 dark:text-white">data/AppDatabase.kt</strong> - قاعدة بيانات Room وجداول الأصناف والفواتير</li>
              </ul>
            </div>

            {/* Direct Download ZIP Button */}
            <div className="flex items-center justify-between p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl">
              <div className="text-xs space-y-0.5">
                <div className="font-black text-emerald-900 dark:text-emerald-100">تحميل حزمة مشروع الأندرويد كاملة (Kotlin & Jetpack Compose)</div>
                <div className="text-emerald-700 dark:text-emerald-300 text-[11px]">ملف ZIP جاهز لفتحه في Android Studio وتوليد ملف APK مباشرة</div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadZip('android', 'idenia-android-kotlin-source.zip')}
                disabled={downloadingPlatform === 'android'}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Download className={`w-4 h-4 ${downloadingPlatform === 'android' ? 'animate-bounce' : ''}`} />
                <span>{downloadingPlatform === 'android' ? 'جاري التحميل...' : 'تحميل ملف ZIP لأندرويد'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: COMPARISON (WHY NATIVE IS BETTER) */}
        {activeTab === 'comparison' && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 rounded-2xl">
              <h3 className="text-sm font-black text-purple-950 dark:text-purple-200 mb-2">
                مقارنة تقنية واضحة بين البرامج الأصلية الخام (Native) وتطبيقات الويب (Web/PWA)
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                لكي تكون على دراية كاملة بما بنيناه ولماذا تعتبر البرامج الأصلية في مجلد <code className="font-mono">native-src</code> هي الخيار الأقوى والأكثر أماناً لنقاط البيع:
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-zinc-800">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-white font-black border-b border-gray-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3">وجه المقارنة</th>
                    <th className="p-3 text-emerald-600 dark:text-emerald-400">البرامج الأصلية الخام (Native C# & Kotlin)</th>
                    <th className="p-3 text-gray-500">تطبيقات الويب / المتصفح (Web / PWA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 text-gray-700 dark:text-gray-300">
                  <tr>
                    <td className="p-3 font-bold">الاعتماد على المتصفح</td>
                    <td className="p-3 text-emerald-600 font-bold">❌ لا علاقة لها بالمتصفح نهائياً (تخاطب المعالج مباشرة)</td>
                    <td className="p-3">تفتح داخل محرك Chromium أو WebView</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">صيغة الملف الناتج</td>
                    <td className="p-3 font-bold text-blue-600 font-mono">ملف Setup.exe حقيقي وملف APK حقيقي</td>
                    <td className="p-3 font-mono">رابط ويب أو اختصار نافذة</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">الطباعة الحرارية وقارئ الباركود</td>
                    <td className="p-3 text-emerald-600 font-bold">مباشرة وسريعة وفورية عبر منافذ USB و COM Ports</td>
                    <td className="p-3">تعتمد على نافذة طباعة المتصفح التقليدية</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">حماية الكود ومنع التعديل</td>
                    <td className="p-3 text-emerald-600 font-bold">مترجم لملفات ثنائية (Binary Machine Code) غير قابلة للقراءة</td>
                    <td className="p-3">ملفات JavaScript قابلة للفحص</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">قفل الترخيص بالجهاز</td>
                    <td className="p-3 text-emerald-600 font-bold">بصمة عتاد حقيقية (سيريال اللوحة الأم والمعالج)</td>
                    <td className="p-3">تعتمد على ملفات تعريف الارتباط أو LocalStorage</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Direct Full Download Banner */}
            <div className="flex items-center justify-between p-4 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-2xl">
              <div className="text-xs space-y-0.5">
                <div className="font-black text-purple-900 dark:text-purple-100">تحميل الحزمة البرمجية الكاملة (الويندوز + الأندرويد)</div>
                <div className="text-purple-700 dark:text-purple-300 text-[11px]">ملف ZIP موحد يشمل مشاريع C# .NET 8 و Kotlin Jetpack Compose مع التعليمات</div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadZip('all', 'idenia-complete-native-sources.zip')}
                disabled={downloadingPlatform === 'all'}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                <Download className={`w-4 h-4 ${downloadingPlatform === 'all' ? 'animate-bounce' : ''}`} />
                <span>{downloadingPlatform === 'all' ? 'جاري التحميل...' : 'تحميل كافة المشاريع (ZIP)'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
