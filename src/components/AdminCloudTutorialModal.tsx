import React, { useState, useEffect } from 'react';
import {
  X,
  Video,
  Image as ImageIcon,
  Link as LinkIcon,
  Check,
  RefreshCw,
  ExternalLink,
  Play,
  Sparkles,
  Info,
  CheckCircle2,
  FileVideo
} from 'lucide-react';
import { cloudDatabaseService } from '../services/cloudDatabase';
import { DatabaseTutorialSettings } from '../types';

interface AdminCloudTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (msg: string) => void;
}

export const AdminCloudTutorialModal: React.FC<AdminCloudTutorialModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [providerRegisterUrl, setProviderRegisterUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load existing settings
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setSuccess(false);

      cloudDatabaseService.getTutorialSettings().then(settings => {
        setVideoUrl(settings.videoUrl || '');
        setThumbnailUrl(settings.thumbnailUrl || '');
        setTitle(settings.title || 'شرح كيفية إنشاء وربط قاعدة بياناتك السحابية المجانية في دقيقتين');
        setDescription(settings.description || 'اتبع الخطوات في الفيديو لإنشاء مشروعك السحابي الخاص ونسخ رابط المشروع والمفتاح وربطهما فوراً.');
        setProviderRegisterUrl(settings.providerRegisterUrl || 'https://supabase.com/dashboard/sign-up');
      }).catch(err => {
        console.warn('Failed to load tutorial settings:', err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await cloudDatabaseService.saveTutorialSettings({
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
        title: title.trim(),
        description: description.trim(),
        providerRegisterUrl: providerRegisterUrl.trim()
      });

      setSuccess(true);
      if (onSaved) {
        onSaved('تم حفظ وتحديث إعدادات فيديو شرح ربط السحابة سحابياً بنجاح!');
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'تعذر حفظ الإعدادات، يرجى التحقق من اتصال الإنترنت.');
    } finally {
      setSaving(false);
    }
  };

  const previewEmbed = videoUrl ? cloudDatabaseService.formatVideoEmbedUrl(videoUrl) : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn select-none overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-2xl w-full border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                إعدادات فيديو شرح ربط السحابة للتاجر
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ضع رابط الفيديو من Google Drive أو YouTube مع صورة مصغرة تظهر لجميع التجار
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs font-bold">جاري تحميل إعدادات الفيديو الحالية...</span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              {error && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-red-800 dark:text-red-300 text-xs font-bold">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>تم حفظ الإعدادات سحابياً بنجاح وتطبيقها على المنصة!</span>
                </div>
              )}

              {/* 1. Google Drive / Video URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <FileVideo className="w-4 h-4 text-emerald-600" />
                  <span>1. رابط فيديو الشرح (Google Drive / YouTube / MP4):</span>
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="مثال: https://drive.google.com/file/d/1a2b3c4d5e/view?usp=sharing"
                  dir="ltr"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>
                    يدعم روابط Google Drive (تأكد من جعل المشاركة "أي شخص لديه الرابط يمكنه المشاهدة").
                  </span>
                </div>
              </div>

              {/* 2. Thumbnail URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>2. رابط الصورة المصغرة للفيديو (Thumbnail Poster):</span>
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={e => setThumbnailUrl(e.target.value)}
                  placeholder="https://example.com/thumbnail.jpg"
                  dir="ltr"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-gray-400">
                  تظهر كغلاف أنيق للفيديو قبل أن يضغط التاجر على زر التشغيل.
                </p>
              </div>

              {/* 3. Video Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  3. عنوان الفيديو الرئيسي:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="شرح كيفية إنشاء وربط قاعدة بياناتك السحابية المجانية في دقيقتين"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* 4. Provider Signup URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-emerald-600" />
                  <span>4. رابط موقع تسجيل قاعدة البيانات (الزر الأخضر للتاجر):</span>
                </label>
                <input
                  type="url"
                  value={providerRegisterUrl}
                  onChange={e => setProviderRegisterUrl(e.target.value)}
                  placeholder="https://supabase.com/dashboard/sign-up"
                  dir="ltr"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Live Preview Box */}
              {previewEmbed && previewEmbed.embedUrl && (
                <div className="p-3.5 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-2">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-600" />
                    <span>معاينة فورية لتضمين الفيديو:</span>
                  </span>
                  <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-gray-300 dark:border-zinc-700">
                    <iframe
                      src={previewEmbed.embedUrl}
                      title="معاينة الفيديو"
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-900/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ سحابياً...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ الإعدادات ونشرها لجميع التجار</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
