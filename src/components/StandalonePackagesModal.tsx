import React, { useState, useEffect } from 'react';
import {
  Download,
  Laptop,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Package,
  ExternalLink,
  X,
  Lock,
  Cpu,
  Monitor,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';

interface StandalonePackagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StandalonePackagesModal: React.FC<StandalonePackagesModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct_install' | 'package_builder' | 'security'>('direct_install');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installStatus, setInstallStatus] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (!isOpen) return null;

  const appLiveUrl = "https://ais-pre-vaesdwpr4sazietbkzcxia-98514862508.asia-northeast1.run.app";
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appLiveUrl)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appLiveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallStatus('تم تثبيت البرنامج بنجاح كبرنامج أصلي على جهازك!');
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instruction for browser
      setInstallStatus('إذا لم تظهر نافذة التثبيت التلقائية، اضغط على زر (تثبيت التطبيق / Install App) بجانب شريط العنوان أو من قائمة الإعدادات (ثلاث نقاط).');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4" dir="rtl">
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl max-w-2xl w-full border border-gray-200 dark:border-gray-800 shadow-2xl p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#2E7D32] text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                بناء وتثبيت حزم البرامج الأصلية (APK & Windows EXE)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                برامج مستقلة حقيقية تعمل بدون متصفح مع تشفير الكود والتراخيص
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

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-100 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-gray-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('direct_install')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'direct_install'
                ? 'bg-white dark:bg-zinc-800 text-[#2E7D32] dark:text-[#66BB6A] shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            1. التثبيت الفوري كبرنامج
          </button>
          <button
            onClick={() => setActiveTab('package_builder')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'package_builder'
                ? 'bg-white dark:bg-zinc-800 text-[#2E7D32] dark:text-[#66BB6A] shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            2. توليد ملفات APK و EXE
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white dark:bg-zinc-800 text-[#2E7D32] dark:text-[#66BB6A] shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            3. طبقات حماية الكود
          </button>
        </div>

        {/* Status Toast */}
        {installStatus && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-2xl flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{installStatus}</span>
          </div>
        )}

        {/* TAB 1: Direct Native App Installation */}
        {activeTab === 'direct_install' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex items-center justify-between gap-4">
              <div className="space-y-1 text-right">
                <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                  تثبيت البرنامج على جهازك الآن بضغطة زر واحدة
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  يثبت البرنامج كتطبيق مستقل على سطح المكتب في الويندوز أو قائمة تطبيقات الهاتف
                </p>
              </div>

              <button
                onClick={handleNativeInstall}
                className="px-5 py-3 bg-[#2E7D32] hover:bg-[#256628] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تثبيت كبرنامج أصلي</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Windows Instructions */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2.5">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs">
                  <Laptop className="w-4 h-4" />
                  <span>طريقة التثبيت على كمبيوتر Windows:</span>
                </div>
                <ol className="text-[11px] text-gray-600 dark:text-gray-300 list-decimal pr-4 space-y-1.5 leading-relaxed">
                  <li>اضغط على زر <strong>"تثبيت كبرنامج أصلي"</strong> بالأعلى.</li>
                  <li>ستظهر لك نافذة ويندوز تسألك "تثبيت حِسبة؟" اضغط <strong>Install</strong>.</li>
                  <li>سيتم إنشاء أيقونة واختصار رسمي على سطح مكتب ويندوز ويفتح البرنامج كنافذة مستقلة بدون متصفح.</li>
                </ol>
              </div>

              {/* Android Instructions */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                  <Smartphone className="w-4 h-4" />
                  <span>طريقة التثبيت على هواتف Android:</span>
                </div>
                <ol className="text-[11px] text-gray-600 dark:text-gray-300 list-decimal pr-4 space-y-1.5 leading-relaxed">
                  <li>افتح رابط البرنامج على الهاتف واضغط "تثبيت التطبيق".</li>
                  <li>أو اضغط على خيارات المتصفح (ثلاث نقاط) واختر <strong>"تثبيت التطبيق"</strong> أو <strong>"Install App"</strong>.</li>
                  <li>سيظهر التطبيق كأيقونة أندرويد رسمية في قائمة التطبيقات ويفتح كأي تطبيق أصلي بدون متصفح.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Official Package Builder (PWABuilder / APK / EXE Generator) */}
        {activeTab === 'package_builder' && (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-xs text-indigo-900 dark:text-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>توليد حزم التثبيت الخام (Android APK & Windows EXE / MSIX):</span>
                </div>
                <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                  Microsoft Official Engine
                </span>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                منصة **Microsoft PWABuilder** الرسمية تتيح لك أخذ رابط برنامجك وتوليد ملف **`app-release.apk`** حقيقي موقع لهواتف أندرويد وملف **`Idenia-Hisba-Setup.msix / exe`** حقيقي لويندوز لتوزيعهما على الفلاشات أو رفعهما على المتاجر.
              </p>

              {/* URL Box */}
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 p-2 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={appLiveUrl}
                  className="bg-transparent text-xs text-gray-800 dark:text-gray-200 font-mono w-full px-2 outline-hidden"
                />
                <button
                  onClick={handleCopyUrl}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title="نسخ الرابط"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>

              {/* Direct Package Generation Action */}
              <div className="pt-2 flex flex-wrap gap-2.5">
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>توليد وتنزيل ملف APK وحزمة Windows الآن</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Quick Steps Guide */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
              <h4 className="font-bold text-xs text-gray-900 dark:text-white">
                خطوات تنزيل ملف الـ APK وملف الويندوز من المنصة:
              </h4>
              <ol className="text-[11px] text-gray-600 dark:text-gray-300 list-decimal pr-4 space-y-1.5 leading-relaxed">
                <li>اضغط على زر <strong>"توليد وتنزيل ملف APK وحزمة Windows الآن"</strong> بالأعلى.</li>
                <li>ستفتح لك أداة مايكروسوفت؛ اضغط على زر <strong>"Package for Android"</strong> لتحميل ملف الـ APK.</li>
                <li>اضغط على زر <strong>"Package for Windows"</strong> لتحميل ملف التثبيت المكتبي للكمبيوتر.</li>
                <li>الملفات الناتجة تكون ملفات حقيقية مجمعة (Binary) جاهزة للتثبيت المباشر على أي جهاز.</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 3: Security & Anti-Tamper Details */}
        {activeTab === 'security' && (
          <div className="space-y-3.5">
            <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
              <div className="flex items-center gap-2 font-black text-xs text-gray-900 dark:text-white">
                <Lock className="w-4 h-4 text-[#2E7D32]" />
                <span>1. إغلاق وتشفير السورس كود (Code Obfuscation & Bundling):</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                يتم ضغط وترجمة الكود بالكامل إلى ملفات ثنائية مشوشة ومدمجة، بحيث يستحيل على المستخدم أو أي مبرمج فتح الكود أو تعديل منطق الفواتير والأسعار.
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
              <div className="flex items-center gap-2 font-black text-xs text-gray-900 dark:text-white">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>2. حرق كود التفعيل فورياً (Single-Use Locked Code):</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                الكود لا يُستخدم إلا لمرة واحدة فقط؛ حيث يقوم السيرفر بحرقه وربطه برقم هاتف التاجر واسم المحل، ويستحيل إعادة تفعيله مجدداً على أي جهاز آخر.
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
              <div className="flex items-center gap-2 font-black text-xs text-gray-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>3. التوقيت الذري ومنع إرجاع ساعة الجهاز (Anti-Clock Tampering):</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                التسجيل والتفعيل يشترطان الاتصال بالإنترنت لمطابقة التوقيت العالمي بالثانية وحساب مدة الصلاحية من وقت إنشاء الكود، مع مراقبة أمنية ترصد أي تلاعب بساعة الجهاز.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
