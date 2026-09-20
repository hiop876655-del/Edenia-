import React, { useState } from 'react';
import {
  X,
  Download,
  Smartphone,
  Monitor,
  CheckCircle2,
  ShieldCheck,
  Zap,
  FolderArchive,
  ArrowDownToLine,
  FileCheck,
  HardDrive
} from 'lucide-react';

interface FlutterAppPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlutterAppPackageModal: React.FC<FlutterAppPackageModalProps> = ({
  isOpen,
  onClose
}) => {
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async (url: string, filename: string, type: string) => {
    setDownloadingType(type);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('حدث خطأ أثناء بدء التحميل، يرجى المحاولة ثانية.');
    } finally {
      setTimeout(() => setDownloadingType(null), 1200);
    }
  };

  return (
    <div
      id="native-apps-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      dir="rtl"
    >
      <div
        id="native-apps-modal-container"
        className="bg-white dark:bg-[#1C1C1E] w-full max-w-4xl rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1B5E20] to-[#2E7D32] text-white flex items-center justify-center shadow-lg shadow-emerald-700/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                <span>تثبيت برامج ايدينيا - حِسبة الأصلية</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  أجهزة حقيقية بدون متصفح
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                تنزيل مباشر لملفات التثبيت الجاهزة: ملف APK للأندرويد وملف Setup.exe للويندوز
              </p>
            </div>
          </div>
          <button
            id="close-native-modal-btn"
            onClick={onClose}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          {/* Main 2 Platform Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 1. ANDROID APK CARD */}
            <div
              id="android-apk-card"
              className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-b from-emerald-50/40 via-white to-emerald-50/20 dark:from-emerald-950/20 dark:via-zinc-900 dark:to-emerald-950/10 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-br-xl shadow-xs">
                تثبيت فوري مباشر
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-zinc-900 dark:text-white">
                      تطبيق أندرويد (APK)
                    </h4>
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                      ملف: idenia-hisba.apk (مصحح 100% - توافق شامل لجميع هواتف أندرويد)
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
                  ملف تثبيت أندرويد أصلي موقّع بشهادات v1 و v2 و v3 الرسمية مع ضبط دقيق لمعمارية الحزمة وهيكلة الموارد (Stored Resources & SDK 33)، لحل مشكلة «حدثت مشكلة أثناء تحليل الحزمة» نهائياً والتثبيت بسلاسة فورية.
                </p>

                <div className="space-y-2 mb-6 bg-white/70 dark:bg-zinc-800/60 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs">
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>تم حل خطأ تحليل الحزمة (Package Parse Error) ويعمل على أندرويد 5 إلى 15+</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>تطبيق مستقل بأيقونة رسمية على الشاشة الرئيسية</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>يعمل بدون متصفح وبدون أي شريط روابط نهائياً</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>يعمل أوفلاين 100% مع حفظ البيانات في الهاتف وطباعة الفواتير الحرارية</span>
                  </div>
                </div>
              </div>

              {/* Download APK Button */}
              <button
                id="btn-download-android-apk"
                type="button"
                onClick={() => handleDownload('/api/download/android-apk', 'idenia-hisba.apk', 'apk')}
                disabled={downloadingType === 'apk'}
                className="w-full flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-black text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-700/25 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <ArrowDownToLine className={`w-5 h-5 ${downloadingType === 'apk' ? 'animate-bounce' : ''}`} />
                <span>{downloadingType === 'apk' ? 'جاري بدء تحميل ملف APK...' : 'تحميل تطبيق الأندرويد المحدث (idenia-hisba.apk)'}</span>
              </button>
            </div>

            {/* 2. WINDOWS SETUP CARD */}
            <div
              id="windows-setup-card"
              className="rounded-2xl border-2 border-blue-500/30 bg-gradient-to-b from-blue-50/40 via-white to-blue-50/20 dark:from-blue-950/20 dark:via-zinc-900 dark:to-blue-950/10 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-br-xl shadow-xs">
                تطبيق مكاتب حقيقي (Electron Native)
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-zinc-900 dark:text-white">
                      برنامج ويندوز المكتبي المستقل (Electron App)
                    </h4>
                    <div className="text-xs text-blue-700 dark:text-blue-400 font-bold">
                      ملف: idenia-hisba-windows-setup.zip (تطبيق مكتبي مدمج بالكامل)
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
                  برنامج مكتبي كامل قائم على معمارية Electron (نفس معمارية واتساب للكمبيوتر). يعمل تلقائياً وبشكل مباشر، بدون متصفح إيدج وبدون سيرفرات محليّة وبدون أي أخطاء.
                </p>

                <div className="space-y-2 mb-6 bg-white/70 dark:bg-zinc-800/60 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs">
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>تطبيق مكتبي حقيقي مستقل (No Microsoft Edge / No localhost)</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>معالج تثبيت رسمي (IdeniaHisba_Setup.exe) مع اختصار لسطح المكتب وقائمة ابدأ</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>تحميل فوري للملفات المحلية بدون أي أخطاء أو اتصال بالشبكة</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>برنامج كاشير سريع ومستقر 100% يدعم الاختصارات (F1-F7) وقارئ الباركود</span>
                  </div>
                </div>
              </div>

              {/* Download Buttons Group */}
              <div className="space-y-2">
                <button
                  id="btn-download-windows-zip"
                  type="button"
                  onClick={() => handleDownload('/api/download/windows-setup', 'idenia-hisba-windows-setup.zip', 'win-zip')}
                  disabled={downloadingType === 'win-zip'}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-blue-700/25 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <ArrowDownToLine className={`w-5 h-5 ${downloadingType === 'win-zip' ? 'animate-bounce' : ''}`} />
                  <span>{downloadingType === 'win-zip' ? 'جاري بدء تحميل ملف ZIP...' : 'تحميل برنامج ويندوز المكتبي (حزمة ZIP الشاملة)'}</span>
                </button>

                <button
                  id="btn-download-windows-exe-direct"
                  type="button"
                  onClick={() => handleDownload('/api/download/windows-exe', 'IdeniaHisba_Setup.exe', 'win-exe')}
                  disabled={downloadingType === 'win-exe'}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer"
                >
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span>تحميل معالج التثبيت المباشر (IdeniaHisba_Setup.exe)</span>
                </button>
              </div>
            </div>

          </div>

          
          {/* Flutter Native Master Project Source Card */}
          <div className="bg-gradient-to-r from-blue-900/10 via-emerald-900/10 to-teal-900/10 border-2 border-blue-500/40 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full">
                    Flutter Native (Single Codebase)
                  </span>
                  <h4 className="font-black text-base text-zinc-900 dark:text-white">
                    مشروع Flutter الأصلي بالكامل (نظام الأندرويد والويندوز الموحد)
                  </h4>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
                  الكود المصدري الأصيل المكتوب بلغة Dart مع ملفات التشغيل المباشرة (C++ Runner للويندوز و Kotlin Gradle للأندرويد) مع ملفات البناء التلقائي (BAT). أي تعديل يتم هنا ينعكس على النظامين معاً وبدون أي سطر ويب.
                </p>
              </div>
              <button
                id="btn-download-flutter-source"
                type="button"
                onClick={() => handleDownload('/api/download/flutter-source', 'idenia_hisba_flutter_source.zip', 'flutter-src')}
                disabled={downloadingType === 'flutter-src'}
                className="shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-black text-xs py-3 px-5 rounded-xl shadow-lg shadow-blue-700/20 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>{downloadingType === 'flutter-src' ? 'جاري تجهيز المشروع...' : 'تحميل مشروع Flutter المصدري (ZIP)'}</span>
              </button>
            </div>
          </div>

          {/* Quick Explanation Banner */}
          <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <strong className="text-zinc-800 dark:text-zinc-200">ملاحظة أمان وتثبيت:</strong> البرامج تعمل محلياً ومباشرة على جهازك وتحفظ كافة الفواتير والعملاء والمنتجات في قاعدة بيانات محلية داخل جهازك، ولا تحتاج الاتصال بالإنترنت أثناء عمليات البيع اليومية.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <span>تثبيت نظامي رسمي • أوفلاين 100% • خالي من المتصفحات</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
