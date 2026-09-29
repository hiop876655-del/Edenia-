import React, { useState, useEffect } from 'react';
import { RotateCcw, Package, BadgeDollarSign, X, Check, CheckSquare, Square } from 'lucide-react';
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
  // Two distinct checkboxes as requested by the user:
  // 1. voidItems: Return products to inventory
  // 2. voidDebtPayment: Void debt payment / debt settlement
  const [voidItems, setVoidItems] = useState(false);
  const [voidDebtPayment, setVoidDebtPayment] = useState(false);

  // Reset checkboxes whenever modal opens or sale changes
  useEffect(() => {
    if (isOpen) {
      setVoidItems(false);
      setVoidDebtPayment(false);
    }
  }, [isOpen, sale?.id]);

  if (!isOpen || !sale) return null;

  const excessPayment = sale.paid_towards_previous_debt || Math.max(0, sale.paid_amount - sale.total);
  const isAnyOptionSelected = voidItems || voidDebtPayment;

  const handleConfirm = () => {
    if (!isAnyOptionSelected) return;

    let mode: 'all' | 'items_only' | 'payment_only' = 'all';
    if (voidItems && voidDebtPayment) {
      mode = 'all';
    } else if (voidItems && !voidDebtPayment) {
      mode = 'items_only';
    } else if (!voidItems && voidDebtPayment) {
      mode = 'payment_only';
    }

    onConfirmVoid(sale.id, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in" dir="rtl">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-800 text-right select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-red-50 dark:bg-red-950/40 border-b border-red-100 dark:border-red-900/50">
          <div className="flex items-center gap-2.5 text-red-700 dark:text-red-400">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/60 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-black text-base">إلغاء واسترجاع الفاتورة الذكي</h3>
              <p className="text-xs text-red-600/80 dark:text-red-300">
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

        {/* Invoice Summary Box */}
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
            {excessPayment > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold border-t border-gray-200 dark:border-gray-700 pt-1.5">
                <span>سداد من الحساب السابق (دين):</span>
                <span>{excessPayment.toFixed(2)} {settings.currency_symbol}</span>
              </div>
            )}
            {sale.remaining_amount > 0 && (
              <div className="flex justify-between text-red-600 dark:text-red-400 font-bold border-t border-gray-200 dark:border-gray-700 pt-1.5">
                <span>متبقي آجل مسجل كدين:</span>
                <span>{sale.remaining_amount.toFixed(2)} {settings.currency_symbol}</span>
              </div>
            )}
          </div>

          {/* 2 Selective Checkboxes */}
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-800 dark:text-gray-200 block">
              حدد العمليات المراد إلغاؤها (يمكنك تحديد خيار أو كلاهما معاً):
            </label>

            {/* Checkbox 1: Void Items / Stock Return */}
            <div
              onClick={() => setVoidItems(!voidItems)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                voidItems
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400">
                {voidItems ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="space-y-1">
                <div className="font-black text-xs flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. استرجاع المشتريات إلى المخزن</span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  إعادة جميع الأصناف المباعة في هذه الفاتورة ({sale.items_count || sale.items?.length || 0} قطعة) فوراً إلى كميات المخزن ورصيد الأصناف.
                </div>
              </div>
            </div>

            {/* Checkbox 2: Void Debt / Payment */}
            <div
              onClick={() => setVoidDebtPayment(!voidDebtPayment)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                voidDebtPayment
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400">
                {voidDebtPayment ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="space-y-1">
                <div className="font-black text-xs flex items-center gap-1.5">
                  <BadgeDollarSign className="w-3.5 h-3.5 text-amber-600" />
                  <span>2. إلغاء تسديد الدين والمعاملة المالية</span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {excessPayment > 0
                    ? `إلغاء دفعة سداد الدين (${excessPayment.toFixed(2)} ${settings.currency_symbol}) وإعادتها لحساب العميل.`
                    : `إلغاء المعاملة المالية والديون المسجلة مع هذه الفاتورة في حساب العميل.`}
                </div>
              </div>
            </div>

            {voidItems && voidDebtPayment && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-[11px] font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>سيتم إلغاء الفاتورة بالكامل (استرجاع البضاعة للمخزن + إلغاء الدفعات).</span>
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
            disabled={!isAnyOptionSelected}
            onClick={handleConfirm}
            className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
              isAnyOptionSelected
                ? 'text-white bg-red-600 hover:bg-red-700 active:scale-98 shadow-md cursor-pointer'
                : 'text-gray-400 bg-gray-200 dark:bg-zinc-800 dark:text-gray-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>تأكيد تنفيذ الإلغاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};
