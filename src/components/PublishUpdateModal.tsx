import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Send,
  History,
  Info,
  ShieldAlert,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { updateService } from '../services/updates';
import { APP_VERSION, APP_BUILD_NUMBER } from '../config/version';
import { SystemReleaseRecord } from '../services/firebase';

interface PublishUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublished?: (message: string) => void;
}

export const PublishUpdateModal: React.FC<PublishUpdateModalProps> = ({
  isOpen,
  onClose,
  onPublished
}) => {
  const [currentRelease, setCurrentRelease] = useState<SystemReleaseRecord | null>(null);
  const [history, setHistory] = useState<SystemReleaseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [version, setVersion] = useState<string>('v1.2.1');
  const [buildNumber, setBuildNumber] = useState<number>(APP_BUILD_NUMBER + 1);
  const [releaseTitle, setReleaseTitle] = useState<string>('تحديث شامل: إصلاح تسجيل الدخول ودعم التحديثات السحابية المباشرة');
  const [releaseNotes, setReleaseNotes] = useState<string>(
    `• حل مشكلة تسجيل الدخول السحابي ومطابقة كلمات المرور بنسبة 100%.\n• إضافة نظام التحديثات السحابية المباشرة (OTA Live Updates).\n• إمكانية كشف وتعديل ومشاركة كلمات المرور للتجار عبر الواتساب من لوحة التحكم.\n• تحسين أداء استجابة النظام وسرعة استخراج التقارير وفواتير الكاشير.`
  );
  const [isForceUpdate, setIsForceUpdate] = useState<boolean>(false);
  const [publishedBy, setPublishedBy] = useState<string>('المهندس خالد (مالك المنصة)');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentBuild = updateService.getCurrentBuild();
      const currentVer = updateService.getCurrentVersion();
      const res = await updateService.checkForUpdates();
      if (res.latestRelease) {
        setCurrentRelease(res.latestRelease);
        const latestBuildNum = Number(res.latestRelease.buildNumber) || currentBuild;
        const nextBuild = Math.max(latestBuildNum, currentBuild) + 1;
        setBuildNumber(nextBuild);
        setVersion(`v1.2.${nextBuild % 100}`);
      } else {
        const nextBuild = currentBuild + 1;
        setBuildNumber(nextBuild);
        setVersion(`v1.2.${nextBuild % 100}`);
      }
      const allReleases = await updateService.getReleasesHistory();
      setHistory(allReleases);
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل بيانات الإصدارات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!version.trim() || !releaseTitle.trim()) {
      setError('يرجى كتابة رقم الإصدار وعنوان التحديث.');
      return;
    }

    setPublishing(true);
    try {
      await updateService.publishRelease({
        version: version.trim(),
        buildNumber: Number(buildNumber) || (APP_BUILD_NUMBER + 1),
        releaseTitle: releaseTitle.trim(),
        releaseNotes: releaseNotes.trim(),
        isForceUpdate: Boolean(isForceUpdate),
        publishedBy: publishedBy.trim()
      });

      const msg = `تم نشر التحديث (${version.trim()}) سحابياً بنجاح! سيصل لجميع الأجهزة فور فتح التطبيق أو من صفحة التحديثات.`;
      setSuccessMessage(msg);
      onPublished?.(msg);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'فشل نشر التحديث سحابياً، تأكد من اتصال الإنترنت.');
    } finally {
      setPublishing(false);
    }
  };

  const handleQuickIncrement = () => {
    setBuildNumber(prev => prev + 1);
    setVersion(prev => {
      const parts = prev.replace(/^v/, '').split('.');
      if (parts.length === 3) {
        const patch = parseInt(parts[2], 10) + 1;
        return `v${parts[0]}.${parts[1]}.${patch}`;
      }
      return `v${parts[0] || '1'}.${parts[1] || '0'}.1`;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span>نشر وإدارة التحديثات السحابية</span>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                  OTA Publisher
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                أي تحديث تنشره هنا يظهر فوراً على شاشات التجار لتحديث البرنامج دون الحاجة لإعادة التثبيت
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Success / Error Alerts */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center gap-2 font-bold">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Live Version Badge */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold">التحديث المنشور حالياً بالسحابة:</span>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                  {currentRelease?.version || `v${APP_VERSION}`}
                </span>
                <span>{currentRelease?.releaseTitle || 'الإصدار الأساسي المعتمد'}</span>
              </div>
            </div>
            {currentRelease?.publishedAt && (
              <span className="text-[11px] text-gray-400 font-mono">
                نُشر: {new Date(currentRelease.publishedAt).toLocaleDateString('ar-EG')}
              </span>
            )}
          </div>

          {/* Publish Form */}
          <form onSubmit={handlePublish} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Version String */}
              <div className="space-y-1 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700 dark:text-gray-300">رقم الإصدار:</label>
                  <button
                    type="button"
                    onClick={handleQuickIncrement}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+1 تلقائي</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  placeholder="v1.2.1"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono font-bold text-gray-900 dark:text-white text-xs"
                />
              </div>

              {/* Build Number */}
              <div className="space-y-1 sm:col-span-1">
                <label className="font-bold text-gray-700 dark:text-gray-300">رقم البناء (Build):</label>
                <input
                  type="number"
                  value={buildNumber}
                  onChange={e => setBuildNumber(parseInt(e.target.value, 10) || 0)}
                  placeholder="121"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono font-bold text-gray-900 dark:text-white text-xs"
                />
              </div>

              {/* Publisher */}
              <div className="space-y-1 sm:col-span-1">
                <label className="font-bold text-gray-700 dark:text-gray-300">الناشر:</label>
                <input
                  type="text"
                  value={publishedBy}
                  onChange={e => setPublishedBy(e.target.value)}
                  placeholder="المهندس خالد"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-xs"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="font-bold text-gray-700 dark:text-gray-300">عنوان التحديث الرئيسي:</label>
              <input
                type="text"
                value={releaseTitle}
                onChange={e => setReleaseTitle(e.target.value)}
                placeholder="مثال: تحديث شامل: تحسين الأداء وإضافة مزايا جديدة"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-bold text-gray-900 dark:text-white text-xs"
              />
            </div>

            {/* Release Notes */}
            <div className="space-y-1">
              <label className="font-bold text-gray-700 dark:text-gray-300">
                سجل الميزات والتعديلات (Changelog):
              </label>
              <textarea
                rows={4}
                value={releaseNotes}
                onChange={e => setReleaseNotes(e.target.value)}
                placeholder="اكتب النقاط التي تم تعديلها أو إضافتها في هذا الإصدار..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-xs leading-relaxed"
              ></textarea>
            </div>

            {/* Options */}
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <input
                type="checkbox"
                id="forceUpdate"
                checked={isForceUpdate}
                onChange={e => setIsForceUpdate(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
              <label htmlFor="forceUpdate" className="text-amber-900 dark:text-amber-200 font-bold cursor-pointer">
                تحديث إجباري عند تشغيل البرنامج (يطلب من التاجر التحديث فوراً لمواصلة العمل)
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={publishing}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>{publishing ? 'جاري نشر التحديث السحابي...' : '🚀 نشر التحديث السحابي لجميع المستخدمين الآن'}</span>
              </button>
            </div>
          </form>

          {/* Previous Releases History */}
          {history.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                <History className="w-4 h-4 text-emerald-600" />
                <span>سجل الإصدارات السابقة المنشورة</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map(item => (
                  <div
                    key={item.id || item.version}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-bold">
                        <span className="font-mono text-emerald-600">{item.version}</span>
                        <span>{item.releaseTitle}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        الناشر: {item.publishedBy} • {new Date(item.publishedAt).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                    {item.isForceUpdate && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded text-[10px] font-bold">
                        إجباري
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 font-bold text-xs hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
