import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  MessageSquare,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Store,
  Phone,
  User
} from 'lucide-react';
import { api } from '../services/api';
import { db } from '../services/db';
import { LicenseState, UserAccount } from '../types';

interface ExpiredScreenProps {
  user: UserAccount | null;
  onRenewSuccess: (license: LicenseState) => void;
  onLogout: () => void;
}

export const ExpiredScreen: React.FC<ExpiredScreenProps> = ({
  user,
  onRenewSuccess,
  onLogout
}) => {
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');

  const merchantName = user?.fullName || 'التاجر';
  const shopName = user?.shopName || 'المحل';
  const phone = user?.phone || '';

  const whatsappMessage = `السلام عليكم أ/ خالد، أنا التاجر ${merchantName} صاحب (${shopName}) - رقم الهاتف (${phone})، انتهت فترة اشتراكي في برنامج إيدينيا وأرغب في تجديد الاشتراك.`;
  const whatsappUrl = `https://wa.me/201121097822?text=${encodeURIComponent(whatsappMessage)}`;

  // Auto poll for renewal every 5 seconds
  useEffect(() => {
    if (!phone) return;

    let isMounted = true;
    const checkRenewal = async () => {
      try {
        const res = await api.checkMerchantStatus(phone);
        if (!isMounted) return;

        if (res.exists && res.status === 'active' && res.subscriptionExpiresAt > Date.now()) {
          setStatusType('success');
          setStatusMessage(`تم تجديد اشتراكك بنجاح لمدة ${res.subscriptionDays || 30} يوماً! جاري فتح البرنامج...`);

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
            if (isMounted) onRenewSuccess(licenseState);
          }, 1500);
        }
      } catch {
        // Silent poll
      }
    };

    checkRenewal();
    const interval = setInterval(checkRenewal, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [phone, onRenewSuccess, user]);

  const handleManualCheck = async () => {
    if (!phone) return;
    setChecking(true);
    setStatusMessage(null);

    try {
      const res = await api.checkMerchantStatus(phone);

      if (res.exists && res.status === 'active' && res.subscriptionExpiresAt > Date.now()) {
        setStatusType('success');
        setStatusMessage(`تم تجديد اشتراكك بنجاح!`);

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
          onRenewSuccess(licenseState);
        }, 1000);
      } else {
        setStatusType('info');
        setStatusMessage('لم يتم التجديد بعد. يرجى مراسلة الإدارة عبر واتساب لتجديد المدة.');
      }
    } catch {
      setStatusType('error');
      setStatusMessage('تعذر الاتصال بالإنترنت.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 dark:from-[#170f0f] dark:via-[#121212] dark:to-[#1a1212] flex items-center justify-center p-4 md:p-6 select-none" dir="rtl">
      <div className="max-w-xl w-full bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl border border-red-200 dark:border-red-950/80 p-6 md:p-8 space-y-6 relative overflow-hidden">
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 to-rose-600"></div>

        {/* Header Warning */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 shadow-md">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
            انتهت مدة اشتراك البرنامج
          </h1>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
            انقضت مدة الاشتراك المحددة لبرنامج <span className="font-bold text-[#2E7D32] dark:text-[#66BB6A]">ايدينيا - حِسبة</span>. بياناتك ومخزنك محفوظة بأمان تام في جهازك.
          </p>
        </div>

        {/* Merchant Summary */}
        <div className="bg-gray-50 dark:bg-zinc-900/60 rounded-2xl p-4 border border-gray-200 dark:border-zinc-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">التاجر:</span>
            <span className="font-bold text-gray-900 dark:text-white">{merchantName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">المحل:</span>
            <span className="font-bold text-gray-900 dark:text-white">{shopName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">رقم الهاتف:</span>
            <span className="font-mono font-bold text-gray-900 dark:text-white" dir="ltr">{phone}</span>
          </div>
        </div>

        {/* WhatsApp Renewal Button */}
        <div className="space-y-3 pt-1">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-base shadow-lg shadow-green-600/25 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <MessageSquare className="w-6 h-6 fill-white" />
            <span>تواصل مع أ/ خالد على الواتساب لتجديد الاشتراك</span>
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>

          <p className="text-center text-[11px] text-gray-500 font-medium">
            رقم إدارة المنصة المباشر: <strong className="font-mono text-gray-800 dark:text-gray-200" dir="ltr">01121097822</strong>
          </p>
        </div>

        {/* Status and Refresh */}
        <div className="space-y-3 pt-1">
          {statusMessage && (
            <div className={`p-4 rounded-2xl flex items-start gap-3 text-xs font-bold ${
              statusType === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200'
                : 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 text-blue-800 dark:text-blue-300'
            }`}>
              {statusType === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checking}
            className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'جاري الفحص المباشر...' : 'فحص حالة التجديد (تحديث مباشر)'}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>يتم الفحص التلقائي باستمرار</span>
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
