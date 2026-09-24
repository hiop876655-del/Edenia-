import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  Play,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Key,
  ShieldCheck,
  Zap,
  ArrowRight,
  ClipboardPaste,
  Eye,
  EyeOff,
  RefreshCw,
  Server,
  Layers,
  Sparkles,
  Info,
  Check,
  Trash2,
  HardDrive,
  Copy,
  Edit3,
  Lock,
  Smartphone
} from 'lucide-react';
import { UserAccount, ScreenType, MerchantCloudConfig, DatabaseTutorialSettings } from '../types';
import { cloudDatabaseService } from '../services/cloudDatabase';

interface CloudDatabaseSetupScreenProps {
  user: UserAccount | null;
  onNavigate: (screen: ScreenType) => void;
  onSuccess?: () => void;
}

export const CloudDatabaseSetupScreen: React.FC<CloudDatabaseSetupScreenProps> = ({
  user,
  onNavigate,
  onSuccess
}) => {
  const [projectUrl, setProjectUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showProjectUrl, setShowProjectUrl] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [syncingData, setSyncingData] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cloud Config State
  const [config, setConfig] = useState<MerchantCloudConfig | null>(null);
  const [tutorialSettings, setTutorialSettings] = useState<DatabaseTutorialSettings | null>(null);

  // Video Player State
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Load initial settings and merchant cloud config
  useEffect(() => {
    const loadData = async () => {
      // 1. Get Tutorial Video Settings
      try {
        const tut = await cloudDatabaseService.getTutorialSettings();
        setTutorialSettings(tut);
      } catch (err) {
        console.warn('Tutorial load error:', err);
      }

      // 2. Get Merchant Cloud Config
      if (user?.phone) {
        const existing = await cloudDatabaseService.restoreMerchantDatabaseForDevice(user.phone);
        if (existing) {
          setConfig(existing);
          setProjectUrl(existing.projectUrl);
          setApiKey(existing.apiKey);
        }
      } else {
        const local = cloudDatabaseService.getLocalConfig();
        if (local) {
          setConfig(local);
          setProjectUrl(local.projectUrl);
          setApiKey(local.apiKey);
        }
      }
    };

    loadData();
  }, [user]);

  // Handle Copy to Clipboard
  const handleCopy = (text: string, field: 'url' | 'key') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (field === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
    }
  };

  // Handle Paste from Clipboard
  const handlePaste = async (field: 'url' | 'key') => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (field === 'url') setProjectUrl(text.trim());
        if (field === 'key') setApiKey(text.trim());
      }
    } catch {
      // Browser permission prompt or fallback
    }
  };

  // Immediate Sync Test
  const handleSyncNow = async () => {
    setSyncingData(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const ok = await cloudDatabaseService.syncAllDataToCloud(config);
      if (ok) {
        setSuccessMessage('تمت مزامنة كافة بياناتك بنجاح وحفظها سحابياً! يمكنك الآن الدخول من أي جهاز وستجد بياناتك جاهزة 100%.');
        if (config) {
          setConfig({ ...config, lastSyncedAt: Date.now() });
        }
      } else {
        setError('تعذرت المزامنة، يرجى التأكد من اتصال الإنترنت.');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء المزامنة.');
    } finally {
      setSyncingData(false);
    }
  };

  // Handle Connect
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!projectUrl.trim()) {
      setError('يرجى إدخال رابط المشروع السحابي (Project URL).');
      return;
    }
    if (!apiKey.trim()) {
      setError('يرجى إدخال المفتاح السحابي (API / Anon Key).');
      return;
    }

    setLoading(true);
    setTesting(true);

    try {
      const res = await cloudDatabaseService.connectMerchantDatabase({
        phone: user?.phone || '00000000000',
        projectUrl: projectUrl.trim(),
        apiKey: apiKey.trim(),
        shopName: user?.shopName
      });

      setConfig(res.config);
      setIsEditing(false);
      setSuccessMessage('تم ربط وتفعيل قاعدة بياناتك السحابية الخاصة بنجاح 100%! تم حفظ المفاتيح مع حسابك لتتنقل بها عبر أجهزتك.');

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال بقاعدة البيانات، يرجى مراجعة الرابط والمفتاح والمحاولة مجدداً.');
    } finally {
      setLoading(false);
      setTesting(false);
    }
  };

  // Handle Disconnect
  const handleDisconnect = async () => {
    if (window.confirm('هل أنت متأكد من رغبتك في فصل قاعدة البيانات السحابية الحالية؟ سيعمل النظام محلياً على هذا الجهاز.')) {
      await cloudDatabaseService.disconnect(user?.phone);
      setConfig(null);
      setIsEditing(false);
      setProjectUrl('');
      setApiKey('');
      setSuccessMessage('تم فصل قاعدة البيانات بنجاح.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Video embed info
  const videoEmbed = tutorialSettings?.videoUrl
    ? cloudDatabaseService.formatVideoEmbedUrl(tutorialSettings.videoUrl)
    : null;

  const providerUrl = tutorialSettings?.providerRegisterUrl || 'https://supabase.com/dashboard/sign-up';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-[#121212] dark:via-[#181818] dark:to-[#121212] py-8 px-4 md:px-8 select-none" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Breadcrumb / Back Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xs transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة التحكم الرئيسية</span>
          </button>

          <div className="flex items-center gap-2">
            {config?.isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-black border border-emerald-300 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>سحابتك الخاصة متصلة 🟢</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>بانتظار ربط السحابة ☁️</span>
              </span>
            )}
          </div>
        </div>

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ميزة التخزين السحابي المستقل (BYOD - صفر تكلفة)</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              ربط وتفعيل سحابتك المستقلة المجانية ☁️
            </h1>
            
            <p className="text-xs md:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              اربط متجرك بقاعدة بياناتك السحابية الخاصة لتحصل على سعة تخزين غير محدودة وسرعة فائقة في المزامنة بين أجهزتك المختلفة، مع أمان تام واحتفاظ كامل ببيانات تجارتك في حسابك الخاص مدى الحياة.
            </p>
          </div>
        </div>

        {/* Section 1: Video Tutorial Container with Professional Frame & Thumbnail */}
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-gray-200 dark:border-gray-800 p-5 md:p-7 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Play className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white">
                  {tutorialSettings?.title || 'فيديو شرح: كيفية ربط سحابتك السريعة في دقيقتين'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {tutorialSettings?.description || 'شاهد الفيديو واتبع الخطوات البسيطة لإنشاء مشروعك ونسخ الرابط والمفتاح.'}
                </p>
              </div>
            </div>

            {/* Direct Open Provider Website Button */}
            <a
              href={providerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
            >
              <span>إنشاء حساب وقاعدة سحابية مجانية</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Video Frame with 16:9 Aspect Ratio & Thumbnail Support */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-gray-300 dark:border-zinc-800 shadow-inner group">
            {videoEmbed && videoEmbed.embedUrl ? (
              <>
                {!isVideoPlaying && tutorialSettings?.thumbnailUrl ? (
                  // Custom Thumbnail Poster Image
                  <div className="relative w-full h-full">
                    <img
                      src={tutorialSettings.thumbnailUrl}
                      alt="فيديو شرح ربط السحابة"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                      <button
                        onClick={() => setIsVideoPlaying(true)}
                        className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                        title="تشغيل فيديو الشرح"
                      >
                        <Play className="w-7 h-7 fill-current mr-0.5" />
                      </button>
                      <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full border border-white/20">
                        اضغط لمشاهدة خطوات إنشاء وربط السحابة
                      </span>
                    </div>
                  </div>
                ) : videoEmbed.isDirectVideo ? (
                  <video
                    src={videoEmbed.embedUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <iframe
                    src={videoEmbed.embedUrl}
                    title="شرح ربط قاعدة البيانات"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </>
            ) : (
              // Fallback / Placeholder when Admin hasn't added video link yet
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-gray-400 space-y-3 bg-gradient-to-br from-zinc-900 to-zinc-950">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-emerald-400">
                  <Play className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-200">
                    {tutorialSettings?.title || 'فيديو الشرح التوضيحي قيد التجهيز'}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mt-1">
                    يمكنك الضغط على الزر الأخضر بالأعلى لفتح موقع السحابة مباشرة، ونسخ رابط مشروعك (Project URL) ومفتاحك (Anon Key) ولصقهما في الخانتين بالأسفل.
                  </p>
                </div>
                <a
                  href={providerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-bold border border-zinc-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <span>فتح منصة التخزين السحابي</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Credentials Panel / Form */}
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 shadow-xs space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                config?.isConnected && !isEditing
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400'
              }`}>
                {config?.isConnected && !isEditing ? <ShieldCheck className="w-5 h-5" /> : <Key className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <span>{config?.isConnected && !isEditing ? 'قاعدتك السحابية متصلة ومربوطة بأمان' : 'بيانات الاتصال بالسحابة'}</span>
                  {config?.isConnected && !isEditing && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {config?.isConnected && !isEditing
                    ? `مربوطة ومشفرة برقم الهاتف (${config.merchantPhone || user?.phone}) وتعمل تلقائياً على كل أجهزتك`
                    : 'الصق رابط المشروع والمفتاح المستخرجين من لوحة تحكم مشروعك السحابي'}
                </p>
              </div>
            </div>

            {config?.isConnected && !isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-gray-700 dark:text-gray-300 font-bold px-3 py-1.5 rounded-xl border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل المفاتيح</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-bold px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>فصل السحابة</span>
                </button>
              </div>
            ) : isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-gray-600 dark:text-gray-300 font-bold px-3 py-1.5 rounded-xl border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                إلغاء التعديل
              </button>
            ) : null}
          </div>

          {/* Messages */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-200 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Connected View: Masked Credentials & Sync Controls */}
          {config?.isConnected && !isEditing ? (
            <div className="space-y-6">
              
              {/* Credentials Masked Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Project URL (Masked) */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>رابط المشروع السحابي (Project URL):</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowProjectUrl(!showProjectUrl)}
                        className="text-[11px] text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        {showProjectUrl ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showProjectUrl ? 'إخفاء' : 'إظهار'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(config.projectUrl, 'url')}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedUrl ? 'تم النسخ!' : 'نسخ'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800/80 font-mono text-xs text-gray-800 dark:text-gray-200 select-all overflow-x-auto" dir="ltr">
                    {showProjectUrl
                      ? config.projectUrl
                      : 'https://••••••••••••••••.supabase.co'}
                  </div>
                </div>

                {/* 2. API / Anon Key (Masked) */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-600" />
                      <span>المفتاح السحابي العام (Anon Key):</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-[11px] text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showApiKey ? 'إخفاء' : 'إظهار'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(config.apiKey, 'key')}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey ? 'تم النسخ!' : 'نسخ'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800/80 font-mono text-xs text-gray-800 dark:text-gray-200 select-all overflow-x-auto" dir="ltr">
                    {showApiKey
                      ? config.apiKey
                      : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                  </div>
                </div>

              </div>

              {/* Status and Cross-Device Assurance */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3 text-emerald-950 dark:text-emerald-200 text-xs">
                <Smartphone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <span>مزامنة الأجهزة المتعددة نشطة ومحمية 📱💻</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      رقم الهاتف: {config.merchantPhone || user?.phone}
                    </span>
                  </div>
                  <p className="text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed text-[11px]">
                    رابط السحابة ومفتاحها مخفيان ومحفوظان في خوادم ايدينيا ومربوطان بحسابك. عند تسجيل دخولك برقم هاتفك وكلمة مرورك من أي جهاز أو كمبيوتر آخر، سيتم الاتصال بسحابتك وتحميل كافة أصناف مخزنك وفواتيرك وديونك فوراً وكأنك على نفس الجهاز!
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncingData}
                  className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-lg shadow-emerald-800/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {syncingData ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري فحص ومزامنة البيانات مع السحابة...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 text-emerald-200" />
                      <span>فحص ومزامنة البيانات الآن 🔄</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="w-full sm:w-auto py-3.5 px-6 rounded-2xl border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  الذهاب للوحة التحكم
                </button>
              </div>

            </div>
          ) : (
            /* Input / Edit Form */
            <form onSubmit={handleConnect} className="space-y-5">
              
              {isEditing && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>أنت الآن في وضع تعديل بيانات السحابة. يمكنك إدخال رابط أو مفتاح جديد ثم الضغط على حفظ.</span>
                </div>
              )}

              {/* Field 1: Project URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>1. رابط المشروع السحابي (Project URL):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handlePaste('url')}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>لصق من الحافظة</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={projectUrl}
                    onChange={e => setProjectUrl(e.target.value)}
                    placeholder="https://xyzabcdefghijklm.supabase.co"
                    dir="ltr"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  مثال: <span className="font-mono text-gray-600 dark:text-gray-300">https://abcdef123456.supabase.co</span> (تجدها في Project Settings &gt; API)
                </p>
              </div>

              {/* Field 2: API / Anon Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    <span>2. المفتاح السحابي العام (API / Anon Key):</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showApiKey ? 'إخفاء' : 'إظهار المفتاح'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePaste('key')}
                      className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>لصق من الحافظة</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    dir="ltr"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                  <div className="font-bold text-amber-900 dark:text-amber-300">
                    💡 تنبيه هام لنسخ المفتاح الصحيح من Supabase:
                  </div>
                  <p>
                    من لوحة تحكم سوبابيز اذهب إلى: <strong className="font-mono text-gray-800 dark:text-gray-200">Project Settings ➔ API ➔ Project API keys</strong>
                  </p>
                  <p>
                    انسخ مفتاح <strong className="text-emerald-700 dark:text-emerald-400">anon (public)</strong> وهو مفتاح طويل جداً يبدأ بـ <span className="font-mono text-emerald-800 dark:text-emerald-300">eyJhbGciOi...</span> (وليس المفتاح القصير الذي يبدأ بـ sb_publishable).
                  </p>
                </div>
              </div>

              {/* Submit & Test Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={loading || testing}
                  className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-lg shadow-emerald-800/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري فحص الاتصال وتجهيز السحابة...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>{isEditing ? 'حفظ وتحديث بيانات السحابة ⚡' : 'بدء فحص وربط قاعدة البيانات السحابية ⚡'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="w-full sm:w-auto py-3.5 px-5 rounded-2xl border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  المتابعة واستخدام النظام محلياً
                </button>
              </div>

              {/* Cross-Device Roaming Assurance Note */}
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3 text-blue-900 dark:text-blue-300 text-xs">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">ميزة التنقل التلقائي بين الأجهزة برقم الهاتف 📱:</div>
                  <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed text-[11px]">
                    بمجرد ربط قاعدة البيانات بنجاح هنا، يتم حفظ وتشفير مفاتيح سحابتك بشكل آمن مع رقم هاتفك ({user?.phone || 'المسجل لدينا'}). إذا فتحت المنصة من أي كمبيوتر أو هاتف آخر وسجلت دخولك برقم الهاتف وكلمة المرور، ستتصل سحابتك تلقائياً وتُحمّل كافة بياناتك دون الحاجة لإعادة إدخال أي مفاتيح مجدداً!
                  </p>
                </div>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
