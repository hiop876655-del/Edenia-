import React from 'react';
import {
  X,
  PackagePlus,
  Users,
  TrendingUp,
  Settings,
  DatabaseBackup,
  UserCheck,
  Moon,
  Sun,
  LogOut,
  Home,
  Sparkles,
  Cloud
} from 'lucide-react';
import { ScreenType } from '../types';

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenType) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export const MobileMoreDrawer: React.FC<MobileMoreDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  isDarkMode,
  onToggleTheme,
  onLogout
}) => {
  if (!isOpen) return null;

  const handleNav = (screen: ScreenType) => {
    onNavigate(screen);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in" dir="rtl">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-sm p-5 space-y-4 border-t sm:border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
            كافة أقسام البرنامج
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 font-bold hover:bg-emerald-50 hover:text-[#2E7D32] transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#2E7D32]" />
            <span>الصفحة الرئيسية</span>
          </button>

          <button
            onClick={() => handleNav('products')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 font-bold hover:bg-emerald-50 hover:text-[#2E7D32] transition-colors cursor-pointer"
          >
            <PackagePlus className="w-4 h-4 text-[#2E7D32]" />
            <span>المنتجات</span>
          </button>

          <button
            onClick={() => handleNav('customers')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 font-bold hover:bg-emerald-50 hover:text-[#2E7D32] transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>العملاء</span>
          </button>

          <button
            onClick={() => handleNav('reports')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 font-bold hover:bg-emerald-50 hover:text-[#2E7D32] transition-colors cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span>التقارير والأرباح</span>
          </button>

          <button
            onClick={() => handleNav('settings')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 font-bold hover:bg-emerald-50 hover:text-[#2E7D32] transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-gray-600" />
            <span>الإعدادات والطباعة</span>
          </button>

          <button
            onClick={() => handleNav('cloud_database_setup')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60 hover:shadow-xs transition-all cursor-pointer"
          >
            <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>ربط السحابة المستقلة</span>
          </button>

          <button
            onClick={() => handleNav('backup')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 font-bold hover:bg-emerald-50 hover:text-[#2E7D32] transition-colors cursor-pointer"
          >
            <DatabaseBackup className="w-4 h-4 text-teal-600" />
            <span>النسخ الاحتياطي</span>
          </button>

          <button
            onClick={() => handleNav('account')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 font-bold hover:bg-emerald-50 hover:text-[#2E7D32] transition-colors cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>بيانات الحساب</span>
          </button>

          <button
            onClick={() => handleNav('updates')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60 hover:shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>تحديثات البرنامج</span>
          </button>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-gray-600" />}
            <span>{isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );
};
