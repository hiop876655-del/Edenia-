import React, { useState, useRef } from 'react';
import {
  DatabaseBackup,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  ShieldCheck,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { db } from '../services/db';
import { ConfirmModal } from '../components/ConfirmModal';

export const BackupScreen: React.FC = () => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = {
    products: db.getProducts().length,
    sales: db.getSales().length,
    customers: db.getCustomers().length,
    debts: db.getDebts().length,
    payments: db.getDebtPayments().length
  };

  const handleExportBackup = () => {
    try {
      const dataStr = db.exportFullBackupJSON();
      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `idenia_hisba_backup_${dateStr}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setSuccessMsg('تم تصدير وحفظ ملف النسخة الاحتياطية بنجاح على جهازك!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg('حدث خطأ أثناء تصدير النسخة الاحتياطية.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPendingRestoreData(content);
        setShowRestoreConfirm(true);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!pendingRestoreData) return;

    const ok = db.restoreFromBackupJSON(pendingRestoreData);
    if (ok) {
      setSuccessMsg('تم استرجاع قاعدة البيانات بالكامل بنجاح!');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      setErrorMsg('فشل استرجاع الملف، يرجى التأكد من أنه ملف نسخة احتياطية سليم من برنامج ايدينيا.');
    }
    setPendingRestoreData(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto select-none" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center">
            <DatabaseBackup className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
              النسخ الاحتياطي واستعادة البيانات
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              حفظ نسخة أمان لبيانات محلك التجاري واسترجاعها في أي وقت بنقرة واحدة
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

      {errorMsg && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-center gap-2 text-red-700 dark:text-red-300 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Database Statistics */}
      <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
        <h2 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-gray-500" />
          <span>إحصائيات السجلات المخزنة محلياً</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="text-lg font-black text-gray-900 dark:text-white">{stats.products}</div>
            <div className="text-[11px] text-gray-500">منتجات بالمخزن</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="text-lg font-black text-gray-900 dark:text-white">{stats.sales}</div>
            <div className="text-[11px] text-gray-500">فواتير مبيعات</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="text-lg font-black text-gray-900 dark:text-white">{stats.customers}</div>
            <div className="text-[11px] text-gray-500">عملاء مسجلين</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="text-lg font-black text-gray-900 dark:text-white">{stats.debts}</div>
            <div className="text-[11px] text-gray-500">سجلات ديون</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="text-lg font-black text-gray-900 dark:text-white">{stats.payments}</div>
            <div className="text-[11px] text-gray-500">دفعات محصلة</div>
          </div>
        </div>
      </div>

      {/* Export & Import Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-[#2E7D32] dark:text-[#66BB6A] flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
              تصدير نسخة احتياطية (Backup)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              قم بتحميل ملف JSON يحتوي على كافة المنتجات، الفواتير، أسماء العملاء، والديون لحفظها بأمان على فلاش ميموري أو جهاز الكمبيوتر.
            </p>
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full py-3 bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تحميل النسخة الاحتياطية الآن</span>
          </button>
        </div>

        {/* Import */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
              استرجاع نسخة سابقة (Restore)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              استيراد ملف نسخة احتياطية سابق لاستعادة كافة البيانات إلى البرنامج مباشرة دون فقد أي عملية تجارية.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>اختيار ملف واسترجاع البيانات</span>
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showRestoreConfirm}
        title="تأكيد استرجاع قاعدة البيانات"
        message="هل أنت متأكد من استرجاع هذا الملف؟ سيتم استبدال البيانات الحالية بالبيانات الموجودة في ملف النسخة الاحتياطية."
        confirmText="نعم، استرجع البيانات"
        cancelText="إلغاء"
        danger={false}
        onConfirm={handleConfirmRestore}
        onClose={() => {
          setShowRestoreConfirm(false);
          setPendingRestoreData(null);
        }}
      />
    </div>
  );
};
