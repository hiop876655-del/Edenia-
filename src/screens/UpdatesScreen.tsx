import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  Wifi,
  WifiOff,
  History,
  HardDrive
} from 'lucide-react';
import { updateService, UpdateCheckResult } from '../services/updates';
import { APP_VERSION, APP_BUILD_NUMBER, APP_RELEASE_NAME, APP_LAST_UPDATED } from '../config/version';
import { SystemReleaseRecord } from '../services/firebase';
import { checkRealInternetConnection } from '../services/network';
import { ScreenType } from '../types';

interface UpdatesScreenProps {
  onNavigateBack?: () => void;
  onNavigate?: (screen: ScreenType) => void;
}

export const UpdatesScreen: React.FC<UpdatesScreenProps> = ({ onNavigateBack, onNavigate }) => {
  const [checking, setChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [releasesHistory, setReleasesHistory] = useState<SystemReleaseRecord[]>([]);

  // Installing state & progress
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStepText, setUpdateStepText] = useState('');
  const [justUpdated, setJustUpdated] = useState(false);

  const checkUpdates = async () => {
    setChecking(true);
    try {
      const online = await checkRealInternetConnection(2500);
      setIsOnline(online);
      const res = await updateService.checkForUpdates();
      setUpdateResult(res);

      if (online) {
        const history = await updateService.getReleasesHistory();
        setReleasesHistory(history);
      }
    } catch (err: any) {
      setUpdateResult({
        hasUpdate: false,
        currentVersion: APP_VERSION,
        currentBuild: APP_BUILD_NUMBER,
        latestRelease: null,
        isForced: false,
        isOnline: false,
        error: err.message || 'تعذر التحقق من التحديثات السحابية.'
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Check if we just updated in this session
    try {
      if (sessionStorage.getItem('idenia_just_updated') === 'true') {
        setJustUpdated(true);
        sessionStorage.removeItem('idenia_just_updated');
      }
    } catch {
      // Non-blocking
    }

    checkUpdates();
  }, []);

  const currentVerDisplay = updateResult?.currentVersion || updateService.getCurrentVersion();
  const currentBuildDisplay = updateResult?.currentBuild || updateService.getCurrentBuild();

  const handleApplyUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await updateService.applyLiveUpdate(
        updateResult?.latestRelease,
        (step, percent) => {
          setUpdateStepText(step);
          setUpdateProgress(percent);
        }
      );
    } catch (err) {
      alert('حدث خطأ أثناء تطبيق التحديث، يرجى المحاولة لاحقاً.');
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1E1E1E] p-4 md:p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              title="الرجوع"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1B5E20] to-[#2E7D32] flex items-center justify-center text-white shadow-md shadow-emerald-900/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span>تحديثات البرنامج السحابية</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                OTA Live Updates
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              تلقي وتثبيت أحدث ميزات وتعديلات البرنامج فور نشرها من الإدارة دون الحاجة لإعادة التثبيت
            </p>
          </div>
        </div>

        {/* Check Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={checkUpdates}
            disabled={checking || isUpdating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'جاري الفحص السحابي...' : 'فحص التحديثات الآن'}</span>
          </button>
        </div>
      </div>

      {/* Just Updated Success Toast */}
      {justUpdated && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <div className="text-sm font-black">تم تحديث البرنامج بنجاح! 🎉</div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
              تم تحميل أحدث نسخة من الكود مع الحفاظ التام والكامل على جميع فواتيرك وبياناتك ومخزنك.
            </div>
          </div>
        </div>
      )}

      {/* Grid Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Installed Version Card */}
        <div className="bg-white dark:bg-[#1E1E1E] p-4 md:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold">الإصدار المثبت حالياً</span>
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white font-mono flex items-baseline gap-2">
            <span>{currentVerDisplay.startsWith('v') ? currentVerDisplay : `v${currentVerDisplay}`}</span>
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 font-sans">
              (بناء #{currentBuildDisplay})
            </span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>آخر تدقيق: {APP_LAST_UPDATED}</span>
          </div>
        </div>

        {/* Cloud Connection Status */}
        <div className="bg-white dark:bg-[#1E1E1E] p-4 md:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold">حالة الاتصال السحابي</span>
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            {isOnline ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>متصل بالسحابة (مباشر)</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>غير متصل بالإنترنت</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {isOnline ? 'جاهز لاستقبال التحديثات المنشورة فوراً' : 'يلزم الاتصال بالإنترنت لجلب التحديثات الجديدة'}
          </p>
        </div>

        {/* Data Protection Shield */}
        <div className="bg-white dark:bg-[#1E1E1E] p-4 md:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold">سلامة البيانات</span>
            <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-base font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>حماية 100% للبيانات</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            التحديثات السحابية تقوم بتحديث واجهة وكود النظام دون المساس بأي من بياناتك
          </p>
        </div>
      </div>

      {/* Update Card: Available OR Up-to-date */}
      {updateResult?.hasUpdate && updateResult.latestRelease ? (
        <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-zinc-950 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>تحديث جديد منشور ومتاح الآن!</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-2">
                {updateResult.latestRelease.releaseTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-200/80 mt-1 font-mono">
                <span className="bg-white/10 px-2 py-0.5 rounded font-bold">
                  {updateResult.latestRelease.version} (بناء #{updateResult.latestRelease.buildNumber})
                </span>
                <span>•</span>
                <span>
                  نُشر بتاريخ: {new Date(updateResult.latestRelease.publishedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>•</span>
                <span>الناشر: {updateResult.latestRelease.publishedBy || 'إدارة منصة ايدينيا'}</span>
              </div>
            </div>

            {updateResult.isForced && (
              <span className="self-start sm:self-auto px-3 py-1 bg-red-500/30 border border-red-400/40 text-red-200 text-xs font-bold rounded-xl">
                تحديث أمني وإجباري
              </span>
            )}
          </div>

          {/* Release Notes / Changes */}
          <div className="bg-black/30 backdrop-blur-xs border border-white/10 rounded-2xl p-4 md:p-5 space-y-3 relative z-10">
            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Info className="w-4 h-4" />
              <span>ما الجديد في هذا التحديث (سجل التحسينات):</span>
            </div>
            <div className="text-sm text-gray-200 whitespace-pre-line leading-relaxed pr-2 border-r-2 border-emerald-500/50">
              {updateResult.latestRelease.releaseNotes || 'تحسينات عامة في الأداء واستقرار النظام وإصلاحات برمجية.'}
            </div>
          </div>

          {/* Action Button & Progress */}
          <div className="space-y-3 relative z-10">
            {isUpdating ? (
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-200">
                  <span className="font-bold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>{updateStepText}</span>
                  </span>
                  <span className="font-mono font-bold">{updateProgress}%</span>
                </div>
                <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-300 shadow-lg shadow-emerald-500/50"
                    style={{ width: `${updateProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleApplyUpdate}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black py-4 px-8 rounded-2xl shadow-xl shadow-emerald-950/40 text-base active:scale-98 transition-all cursor-pointer"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  <span>تحديث البرنامج الآن (فوري وسلس)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              البرنامج يعمل بأحدث إصدار رسمي مستقر
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              أنت تستخدم أحدث نسخة معتمدة ({currentVerDisplay.startsWith('v') ? currentVerDisplay : `v${currentVerDisplay}`}). عندما تقوم إدارة المنصة بنشر أي كود أو ميزة جديدة، ستظهر لك هنا فوراً لتثبيتها بنقرة واحدة.
            </p>
          </div>
        </div>
      )}

      {/* History of Previous Releases */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-base">
          <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>سجل الإصدارات والتحديثات السابقة</span>
        </div>

        {releasesHistory.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-6">
            لا توجد إصدارات مؤرشفة سابقة حالياً، النظام يعمل بالإصدار الأساسي ({currentVerDisplay.startsWith('v') ? currentVerDisplay : `v${currentVerDisplay}`}).
          </div>
        ) : (
          <div className="space-y-3">
            {releasesHistory.map(rel => {
              const isCurrent = Number(rel.buildNumber) === Number(currentBuildDisplay);
              return (
                <div
                  key={rel.id || rel.version}
                  className={`p-4 rounded-2xl border space-y-1.5 ${
                    isCurrent
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                      : 'bg-gray-50 dark:bg-zinc-900/60 border-gray-200 dark:border-gray-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                        {rel.version}
                      </span>
                      <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                        {rel.releaseTitle}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                          إصدارك الحالي 🟢
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {new Date(rel.publishedAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  {rel.releaseNotes && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                      {rel.releaseNotes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
