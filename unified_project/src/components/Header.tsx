import React, { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  LogOut,
  Store,
  Clock,
  Download,
  Home,
  Smartphone,
  Minus,
  Square,
  X,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { LicenseState, UserAccount, ScreenType } from '../types';
import { licenseManager, RemainingTimeFormatted } from '../services/license';
import { updateService } from '../services/updates';

interface HeaderProps {
  currentScreen?: ScreenType;
  user: UserAccount | null;
  license: LicenseState | null;
  remainingTime?: RemainingTimeFormatted;
  isDarkMode?: boolean;
  darkMode?: boolean;
  onToggleTheme?: () => void;
  onToggleDarkMode?: () => void;
  onNavigate?: (screen: ScreenType) => void;
  onLogout: () => void;
  onOpenFlutterExport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  user,
  license,
  isDarkMode,
  darkMode,
  onToggleTheme,
  onToggleDarkMode,
  onNavigate,
  onLogout,
  onOpenFlutterExport
}) => {
  const isDark = isDarkMode ?? darkMode ?? false;
  const toggle = onToggleTheme || onToggleDarkMode || (() => {});

  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<RemainingTimeFormatted>(
    licenseManager.calculateRemaining(license)
  );

  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const res = await updateService.checkForUpdates();
        if (res.hasUpdate) {
          setHasNewUpdate(true);
        }
      } catch {
        // Non-blocking
      }
    };
    checkUpdates();
    const updateInterval = setInterval(checkUpdates, 45000);
    return () => clearInterval(updateInterval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(licenseManager.calculateRemaining(license));
    }, 1000);
    return () => clearInterval(interval);
  }, [license]);

  return (
    <header className="sticky top-0 z-30 select-none bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-gray-800/80 shadow-xs transition-colors" dir="rtl">
      {/* Simulated Desktop Window Frame Bar */}
      <div className="hidden md:flex items-center justify-between px-3 py-1 bg-gray-100/90 dark:bg-zinc-900/90 border-b border-gray-200/70 dark:border-zinc-800 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ايدينيا - حِسبة [تطبيق سطح المكتب والأندرويد المستقل]</span>
          </div>
          <span className="text-gray-300 dark:text-zinc-700">•</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">SQLite محلي أوفلاين 100%</span>
        </div>

        {/* Hotkeys Bar for desktop */}
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300">F1: الرئيسية</span>
          <span className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700 text-emerald-700 dark:text-emerald-400 font-bold">F2: الكاشير</span>
          <span className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300">F3: المخزن</span>
          <span className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300">F5: العملاء</span>
        </div>

        {/* Window controls styling (pure native app feeling) */}
        <div className="flex items-center gap-1 text-gray-400">
          <span title="تصغير" className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded cursor-pointer">
            <Minus className="w-3 h-3" />
          </span>
          <span title="تكبير" className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded cursor-pointer">
            <Square className="w-2.5 h-2.5" />
          </span>
          <span title="إغلاق البرنامج" className="p-1 hover:bg-red-500 hover:text-white rounded cursor-pointer transition-colors">
            <X className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Main App Bar */}
      <div className="flex items-center justify-between px-3 md:px-5 py-2">
        {/* Brand & Shop Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-[#1B5E20] to-[#2E7D32] flex items-center justify-center text-white font-black text-lg md:text-xl shadow-md shadow-emerald-800/20">
              ح
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm md:text-base text-gray-900 dark:text-white tracking-tight">
                  ايدينيا - حِسبة
                </span>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                  Native App
                </span>
              </div>
              {user && (
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                  <Store className="w-3 h-3 text-[#2E7D32] dark:text-[#66BB6A]" />
                  <span className="font-bold text-gray-700 dark:text-gray-300">{user.shopName || 'المحل التجاري'}</span>
                  <span className="text-gray-300 dark:text-zinc-700">•</span>
                  <span>{user.fullName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Live License Countdown Timer */}
        {license && license.isValid && (
          <div className="hidden lg:flex items-center gap-2 bg-emerald-50 dark:bg-[#2E7D32]/15 text-[#2E7D32] dark:text-[#66BB6A] border border-emerald-200 dark:border-emerald-800/50 px-3 py-1 rounded-xl font-bold text-xs">
            <Clock className="w-3.5 h-3.5 shrink-0 text-[#2E7D32] dark:text-[#66BB6A]" />
            <span className="tracking-wide font-mono">
              {timeRemaining.formattedArabic}
            </span>
          </div>
        )}

        {/* Right Controls: Flutter Apps Export + Actions */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Live Update Available Badge */}
          {hasNewUpdate && onNavigate && (
            <button
              onClick={() => onNavigate('updates')}
              title="يوجد تحديث سحابي جديد متاح للنظام - اضغط لتثبيته"
              className="flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-black text-xs py-1.5 px-3 rounded-xl shadow-md shadow-teal-900/30 animate-pulse transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">تحديث متوفر ⚡</span>
              <span className="sm:hidden">تحديث ⚡</span>
            </button>
          )}

          {/* Direct Button to Open Native Apps Hub */}
          {onOpenFlutterExport && (
            <button
              onClick={onOpenFlutterExport}
              title="تحميل برامج التثبيت الأصلية (APK للأندرويد و Setup للويندوز)"
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] hover:from-[#17521c] hover:to-[#256629] text-white font-bold text-xs py-1.5 px-3 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">تحميل البرامج (APK & Setup)</span>
              <span className="sm:hidden">تحميل البرامج</span>
            </button>
          )}

          {/* Owner Admin Dashboard Button (Only for Khaled: 01121097822) */}
          {user && (user.phone === '01121097822' || user.role === 'admin') && onNavigate && (
            <button
              onClick={() => onNavigate('admin')}
              title="لوحة تحكم الإدارة (المالك)"
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">لوحة الإدارة</span>
            </button>
          )}

          {/* Home Page */}
          {onNavigate && (
            <button
              onClick={() => onNavigate('home')}
              title="الصفحة الرئيسية"
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
            </button>
          )}

          {/* Dark / Light Mode */}
          <button
            onClick={toggle}
            title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
            className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-gray-600" />
            )}
          </button>

          {/* Logout */}
          {user && (
            <button
              onClick={onLogout}
              title="تسجيل الخروج"
              className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
