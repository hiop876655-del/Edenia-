import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '../services/db';
import { ScreenType, LicenseState, UserAccount } from '../types';

interface SplashScreenProps {
  onComplete: (nextScreen: ScreenType) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [statusText, setStatusText] = useState('جاري فحص قاعدة البيانات المحلية...');

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatusText('التحقق من جلسة المستخدم والترخيص...');

      setTimeout(() => {
        const user = db.getUser();
        const license = db.getLicense();

        if (!user) {
          onComplete('home');
          return;
        }

        if (!license || !license.isValid) {
          onComplete('activation');
          return;
        }

        const now = Date.now();
        if (now >= license.expiresAt) {
          onComplete('expired');
          return;
        }

        onComplete('dashboard');
      }, 1000);
    }, 1200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#121212] flex flex-col items-center justify-center p-6 select-none" dir="rtl">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        {/* App Logo */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-950/40 border-2 border-amber-400/40 bg-gradient-to-b from-[#0e2c21] to-[#081b14] p-1 flex items-center justify-center">
            <img
              src="/assets/idenia_hisba_logo.png"
              alt="ايدينيا - حِسبة"
              className="w-full h-full object-cover rounded-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icon-512.png';
              }}
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-zinc-900">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            ايدينيا - حِسبة
          </h1>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            المنصة الذكية لإدارة الحسابات والمخازن التجارية
          </p>
        </div>

        {/* Loading Spinner & Status */}
        <div className="space-y-3 pt-6">
          <div className="w-10 h-10 border-3 border-[#2E7D32]/30 border-t-[#2E7D32] rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 animate-pulse">
            {statusText}
          </p>
        </div>

        {/* Platform badges */}
        <div className="pt-8 flex items-center justify-center gap-3 text-[11px] text-gray-400 dark:text-gray-600">
          <span>تطبيق أصلي يدعم Android و Windows</span>
          <span>•</span>
          <span>Offline SQLite Storage</span>
        </div>
      </div>
    </div>
  );
};
