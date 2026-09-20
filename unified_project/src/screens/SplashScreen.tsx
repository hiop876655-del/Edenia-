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
          <div className="w-24 h-24 rounded-3xl bg-[#2E7D32] shadow-xl shadow-emerald-700/20 flex items-center justify-center text-white font-black text-5xl">
            ح
          </div>
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full shadow-md">
            <ShieldCheck className="w-5 h-5" />
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
