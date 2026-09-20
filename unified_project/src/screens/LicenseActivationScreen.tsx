import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  ShieldCheck,
  Store,
  Phone,
  User,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Home,
  LogOut,
  Sparkles,
  ExternalLink,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { db } from '../services/db';
import { LicenseState, UserAccount } from '../types';

interface LicenseActivationScreenProps {
  user: UserAccount | null;
  onSuccess: (license: LicenseState) => void;
  onLogout: () => void;
  onNavigateToHome?: () => void;
}

export const LicenseActivationScreen: React.FC<LicenseActivationScreenProps> = ({
  user,
  onSuccess,
  onLogout,
  onNavigateToHome
}) => {
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error' | 'warning'>('info');
  const [isActivated, setIsActivated] = useState(false);

  const adminPhone = '01121097822';
  const merchantName = user?.fullName || 'تاجر إيدينيا';
  const shopName = user?.shopName || 'المحل التجاري';
  const phone = user?.phone || '';

  // WhatsApp Pre-filled message as requested
  const whatsappMessage = `السلام عليكم أ/ خالد، أنا التاجر ${merchantName} صاحب (${shopName}) - رقم الهاتف (${phone})، قمت بالتسجيل في برنامج إيدينيا وأرغب في تفعيل الاشتراك.`;
  const whatsappUrl = `https://wa.me/201121097822?text=${encodeURIComponent(whatsappMessage)}`;

  // Real-time automatic polling every 5 seconds to detect immediate admin activation
  useEffect(() => {
    if (!phone) return;

    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await api.checkMerchantStatus(phone);
        if (!isMounted) return;

        if (res.exists && res.status === 'active' && res.subscriptionExpiresAt > Date.now()) {
          setIsActivated(true);
          setStatusType('success');
          setStatusMessage(`تم تفعيل اشتراكك بنجاح لمدة ${res.subscriptionDays || 30} يوماً! جاري الدخول للبرنامج...`);

          const now = Date.now();
          const licenseState: LicenseState = {
            durationDays: res.subscriptionDays || 30,
            createdAt: res.subscriptionActivatedAt || now,
            expiresAt: res.subscriptionExpiresAt,
            activatedAt: res.subscriptionActivatedAt || now,
            remainingMs: Math.max(0, res.subscriptionExpiresAt - now),
            isValid: true,
            isExpired: false,
            lastKnownTimestamp: now,
            status: 'active'
          };

          db.saveLicense(licenseState);
          if (user) {
            db.saveUser({
              ...user,
              subscriptionStatus: 'active',
              subscriptionDays: res.subscriptionDays,
              subscriptionExpiresAt: res.subscriptionExpiresAt
            });
          }

          setTimeout(() => {
            if (isMounted) onSuccess(licenseState);
          }, 1500);
        } else if (res.status === 'frozen') {
          setStatusType('error');
          setStatusMessage('تم إيقاف وتجميد الحساب مؤقتاً من قبل إدارة المنصة. تواصل مع أ/ خالد للتفاصيل.');
        }
      } catch (err) {
        // Continue polling silently
      }
    };

    // Run first check immediately
    checkStatus();

    const interval = setInterval(checkStatus, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [phone, onSuccess, user]);

  const handleManualCheck = async () => {
    if (!phone) return;
    setChecking(true);
    setStatusMessage(null);

    try {
      const res = await api.checkMerchantStatus(phone);

      if (res.exists && res.status === 'active' && res.subscriptionExpiresAt > Date.now()) {
        setIsActivated(true);
        setStatusType('success');
        setStatusMessage(`تم تفعيل اشتراكك بنجاح لمدة ${res.subscriptionDays || 30} يوماً!`);

        const now = Date.now();
        const licenseState: LicenseState = {
          durationDays: res.subscriptionDays || 30,
          createdAt: res.subscriptionActivatedAt || now,
          expiresAt: res.subscriptionExpiresAt,
          activatedAt: res.subscriptionActivatedAt || now,
          remainingMs: Math.max(0, res.subscriptionExpiresAt - now),
          isValid: true,
          isExpired: false,
          lastKnownTimestamp: now,
          status: 'active'
        };

        db.saveLicense(licenseState);
        if (user) {
          db.saveUser({
            ...user,
            subscriptionStatus: 'active',
            subscriptionDays: res.subscriptionDays,
            subscriptionExpiresAt: res.subscriptionExpiresAt
          });
        }

        setTimeout(() => {
          onSuccess(licenseState);
        }, 1200);
      } else if (res.status === 'frozen') {
        setStatusType('error');
        setStatusMessage('الحساب مجمد حالياً من قبل الإدارة. يرجى مراسلة أ/ خالد عبر واتساب.');
      } else if (res.status === 'expired') {
        setStatusType('warning');
        setStatusMessage('انتهت فترة اشتراكك السابقة. تواصل مع الإدارة لتجديد الاشتراك.');
      } else {
        setStatusType('info');
        setStatusMessage('حسابك ما زال بانتظار التفعيل. بعد مراسلة الإدارة سيتم فتح البرنامج تلقائياً.');
      }
    } catch (err: any) {
      setStatusType('error');
      setStatusMessage('تعذر الاتصال بالإنترنت للتحقق من حالة الحساب.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-gray-50 dark:from-[#0f1712] dark:via-[#121212] dark:to-[#171c19] flex items-center justify-center p-4 md:p-6 select-none" dir="rtl">
      <div className="max-w-xl w-full bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 space-y-6 relative overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600"></div>

        {/* Top bar with Navigation */}
        <div className="flex items-center justify-between pt-1">
          {onNavigateToHome && (
            <button
              type="button"
              onClick={onNavigateToHome}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>الرئيسية</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>بانتظار تفعيل الإدارة</span>
          </div>
        </div>

        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-[#2E7D32] dark:text-[#66BB6A] shadow-md mb-1 relative">
            <ShieldCheck className="w-10 h-10" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            حسابك مسجل بنجاح!
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
            لتفعيل اشتراكك وبدء تشغيل برنامج <strong className="text-[#2E7D32] dark:text-[#66BB6A]">ايدينيا - حِسبة</strong>، يرجى التواصل مع إدارة المنصة عبر واتساب لتفعيل الحساب بالمدة المطلوبة.
          </p>
        </div>

        {/* Registered Merchant Summary Box */}
        <div className="bg-gray-50 dark:bg-zinc-900/60 rounded-2xl p-4 border border-gray-200/80 dark:border-zinc-800 space-y-3">
          <div className="text-xs font-black text-gray-700 dark:text-gray-300 flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-2">
            <span>بيانات المحل المسجلة:</span>
            <span className="text-[11px] text-gray-500 font-normal">منصة إيدينيا الرسمية</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-gray-400 block text-[11px]">اسم التاجر:</span>
              <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
                <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{merchantName}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-gray-400 block text-[11px]">اسم المحل:</span>
              <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
                <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{shopName}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-gray-400 block text-[11px]">رقم الهاتف:</span>
              <div className="flex items-center gap-1.5 font-bold font-mono text-gray-800 dark:text-gray-200" dir="ltr">
                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{phone}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-gray-400 block text-[11px]">نوع النشاط:</span>
              <div className="font-bold text-gray-800 dark:text-gray-200 truncate">
                {user?.tradeType || 'تجاري عام'}
              </div>
            </div>
          </div>
        </div>

        {/* Direct WhatsApp Contact Button (Highlight Action) */}
        <div className="space-y-3 pt-1">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.99] text-white font-black text-base shadow-lg shadow-green-600/25 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <MessageSquare className="w-6 h-6 fill-white" />
            <span>تواصل مع أ/ خالد على الواتساب للتفعيل</span>
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>

          <p className="text-center text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            رقم إدارة المنصة المباشر: <strong className="font-mono text-gray-800 dark:text-gray-200" dir="ltr">01121097822</strong> (م/ خالد)
          </p>
        </div>

        {/* Live Auto-Check & Status Alerts */}
        <div className="space-y-3 pt-2">
          {statusMessage && (
            <div className={`p-4 rounded-2xl flex items-start gap-3 text-xs font-bold transition-all ${
              statusType === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 animate-bounce'
                : statusType === 'error'
                ? 'bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                : statusType === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                : 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300'
            }`}>
              {statusType === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">
                <span>{statusMessage}</span>
              </div>
            </div>
          )}

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checking || isActivated}
            className="w-full py-3 px-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'جاري الفحص المباشر من الخادم...' : 'فحص حالة التفعيل الآن (تحديث مباشر)'}</span>
          </button>
        </div>

        {/* Footer & Logout */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>الفحص التلقائي يعمل كل 4 ثوانٍ</span>
          </div>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );
};
