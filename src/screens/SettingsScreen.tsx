import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  DollarSign,
  Printer,
  Moon,
  Sun,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Cloud,
  Database,
  Sparkles,
  ArrowRight,
  Zap
} from 'lucide-react';
import { db } from '../services/db';
import { AppSettings, ScreenType } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface SettingsScreenProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onNavigate?: (screen: ScreenType) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  isDarkMode,
  onToggleTheme,
  onNavigate
}) => {
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setSettings(db.getSettings());
  }, []);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveSettings(settings);
    setSuccessMsg('تم حفظ وتطبيق الإعدادات بنجاح!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleFactoryReset = () => {
    db.clearAllData();
    window.location.reload();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto select-none" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-800 text-white flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
              إعدادات النظام والطباعة
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              تخصيص بيانات المتجر، العملة، قوالب الفواتير الحرارية، والمظهر
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-pulse">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shop Info Card */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <h2 className="font-extrabold text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
            <Store className="w-4 h-4 text-[#2E7D32]" />
            <span>بيانات المحل التجاري</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">اسم المحل / النشاط</label>
              <input
                type="text"
                required
                value={settings.shop_name}
                onChange={e => handleChange('shop_name', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">اسم المالك</label>
              <input
                type="text"
                value={settings.owner_name}
                onChange={e => handleChange('owner_name', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">رقم هاتف التواصل</label>
              <input
                type="tel"
                value={settings.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white text-right"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">العنوان / الفرع</label>
              <input
                type="text"
                value={settings.address}
                onChange={e => handleChange('address', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Currency & Financial Card */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <h2 className="font-extrabold text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>العملة والمخزون</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">اسم العملة</label>
              <input
                type="text"
                value={settings.currency_name}
                onChange={e => handleChange('currency_name', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">رمز العملة (المختصر)</label>
              <input
                type="text"
                value={settings.currency_symbol}
                onChange={e => handleChange('currency_symbol', e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">تنبيه انخفاض المخزون (أقل من)</label>
              <input
                type="number"
                value={settings.low_stock_threshold}
                onChange={e => handleChange('low_stock_threshold', Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Invoice Thermal Format Card */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <h2 className="font-extrabold text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
            <Printer className="w-4 h-4 text-purple-600" />
            <span>قالب الفاتورة الحرارية (80mm / 58mm)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">نص رأس الفاتورة (Header)</label>
              <input
                type="text"
                value={settings.invoice_header}
                onChange={e => handleChange('invoice_header', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">نص تذييل الفاتورة (Footer)</label>
              <input
                type="text"
                value={settings.invoice_footer}
                onChange={e => handleChange('invoice_footer', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Cloud Database Setup Card */}
        <div className="bg-gradient-to-r from-emerald-900/10 via-teal-900/10 to-blue-900/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-blue-950/40 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-900/20">
              <Cloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm text-gray-900 dark:text-white">
                  ربط السحابة المستقلة للتاجر (BYOD)
                </h2>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  سعة غير محدودة مدى الحياة
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed">
                اربط متجرك بقاعدتك السحابية الخاصة مع مشاهدة فيديو الشرح لنسخ الرابط والمفتاح والاتصال التلقائي بين جميع أجهزتك.
              </p>
            </div>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('cloud_database_setup')}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-900/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>إعداد وربط السحابة</span>
              <ArrowRight className="w-4 h-4 mr-1" />
            </button>
          )}
        </div>

        {/* Theme & Display */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-extrabold text-sm text-gray-900 dark:text-white">
              المظهر العام (الوضع الليلي / الفاتح)
            </h2>
            <p className="text-xs text-gray-500">
              الوضع الحالي: {isDarkMode ? 'الوضع الليلي (Dark Mode)' : 'الوضع الفاتح الرسمي (Light Mode)'}
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-2xl cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-600" />}
            <span>تبديل المظهر</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 hover:bg-red-100 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة ضبط المصنع ومسح البيانات</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={showResetConfirm}
        title="إعادة ضبط المصنع"
        message="تحذير شديد: سيتم مسح كافة المنتجات والفواتير والعملاء والبيانات المسجلة والعودة للحالة الأولية."
        confirmText="نعم، امسح كل شيء"
        cancelText="إلغاء"
        danger={true}
        onConfirm={handleFactoryReset}
        onClose={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
