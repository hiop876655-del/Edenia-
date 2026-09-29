import React, { useState } from 'react';
import { RotateCcw, PackageCheck, CreditCard, AlertTriangle, X, Check } from 'lucide-react';
import { Sale, AppSettings } from '../types';

interface SmartVoidModalProps {
  sale: Sale | null;
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onConfirmVoid: (saleId: string, mode: 'all' | 'items_only' | 'payment_only') => void;
}

export const SmartVoidModal: React.FC<SmartVoidModalProps> = ({
  sale,
  settings,
  isOpen,
  onClose,
  onConfirmVoid
}) => {
  const [selectedMode, setSelectedMode] = useState<'all' | 'items_only' | 'payment_only'>('all');

  if (!isOpen || !sale) return null;

  const hasExcessPayment = (sale.paid_towards_previous_debt || 0) > 0 || (sale.paid_amount > sale.total);
  const hasItems = sale.items && sale.items.length > 0;

  const handleConfirm = () => {
    onConfirmVoid(sale.id, selectedMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in" dir="rtl">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-800 text-right select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-red-50 dark:bg-red-950/40 border-b border-red-100 dark:border-red-900/50">
          <div className="flex items-center gap-2.5 text-red-700 dark:text-red-400">
            <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/60 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-black text-base">إلغاء واسترجاع الفاتورة الذكي</h3>
              <p className="text-[11px] text-red-600/80 dark:text-red-300">
                فاتورة رقم: <span className="font-mono font-bold">{sale.invoice_number}</span> ({sale.customer_name})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Choices */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-zinc-900/80 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 space-y-1.5">
            <div className="flex justify-between font-bold">
              <span>إجمالي قيمة المشتريات:</span>
              <span>{sale.total.toFixed(2)} {settings.currency_symbol}</span>
            </div>
            <div className="flex justify-between">
              <span>المبلغ المدفوع من العميل:</span>
              <span className="font-bold text-emerald-600">{sale.paid_amount.toFixed(2)} {settings.currency_symbol}</span>
            </div>
            {hasExcessPayment && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold border-t border-gray-200 dark:border-gray-700 pt-1.5">
                <span>سداد من الحساب السابق:</span>
                <span>{(sale.paid_towards_previous_debt || (sale.paid_amount - sale.total)).toFixed(2)} {settings.currency_symbol}</span>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <label className="text-xs font-black text-gray-800 dark:text-gray-200 block">
              اختر نوع الإلغاء المطلوب تنفيذه:
            </label>

            {/* Option 1: Void All */}
            <div
              onClick={() => setSelectedMode('all')}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                selectedMode === 'all'
                  ? 'border-red-500 bg-red-50/70 dark:bg-red-950/40 text-red-900 dark:text-red-200 shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="w-5 h-5 rounded-full border-2 border-red-500 mt-0.5 flex items-center justify-center shrink-0">
                {selectedMode === 'all' && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
              </div>
              <div className="space-y-0.5">
                <div className="font-black text-xs">إلغاء الفاتورة بالكامل (استرجاع البضاعة + إلغاء الدفع)</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  إرجاع جميع الأصناف المباعة إلى رصيد المخزن فوراً وإلغاء أي دفعات مسجلة مع الفاتورة.
                </div>
              </div>
            </div>

            {/* Option 2: Void Items Only (Keep Debt Payment) */}
            {hasExcessPayment && (
              <div
                onClick={() => setSelectedMode('items_only')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  selectedMode === 'items_only'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="w-5 h-5 rounded-full border-2 border-amber-500 mt-0.5 flex items-center justify-center shrink-0">
                  {selectedMode === 'items_only' && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                </div>
                <div className="space-y-0.5">
                  <div className="font-black text-xs">إلغاء المشتريات فقط (مع تثبيت سداد الدين)</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    استرجاع البضاعة للمخزن وتثبيت دفعة الـ {(sale.paid_towards_previous_debt || (sale.paid_amount - sale.total)).toFixed(2)} {settings.currency_symbol} كدفعة سداد لدينه السابق.
                  </div>
                </div>
              </div>
            )}

            {/* Option 3: Void Payment Only */}
            {hasExcessPayment && (
              <div
                onClick={() => setSelectedMode('payment_only')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  selectedMode === 'payment_only'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="w-5 h-5 rounded-full border-2 border-blue-500 mt-0.5 flex items-center justify-center shrink-0">
                  {selectedMode === 'payment_only' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                </div>
                <div className="space-y-0.5">
                  <div className="font-black text-xs">إلغاء سداد الدين فقط (مع الإبقاء على المشتريات)</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    الإبقاء على بيع الأصناف وإلغاء دفعة سداد الدين الإضافية من حساب العميل.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            تراجع وإغلاق
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 active:scale-98 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>تأكيد تنفيذ الإلغاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};
