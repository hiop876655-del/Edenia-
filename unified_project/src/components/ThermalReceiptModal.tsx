import React, { useRef } from 'react';
import { Printer, X, Check, Share2, Copy } from 'lucide-react';
import { Sale, AppSettings } from '../types';

interface ThermalReceiptModalProps {
  sale: Sale | null;
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  sale,
  settings,
  isOpen,
  onClose
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    let text = `================================\n`;
    text += `       ${settings.shop_name}       \n`;
    text += `   ${settings.phone} | ${settings.address}   \n`;
    text += `================================\n`;
    text += `رقم الفاتورة: ${sale.invoice_number}\n`;
    text += `التاريخ: ${new Date(sale.created_at).toLocaleString('ar-EG')}\n`;
    text += `العميل: ${sale.customer_name}\n`;
    text += `نوع الدفع: ${sale.payment_type === 'cash' ? 'نقدي' : 'آجل'}\n`;
    text += `--------------------------------\n`;
    sale.items.forEach(it => {
      text += `${it.product_name} x ${it.quantity} = ${(it.total_price).toFixed(2)} ${settings.currency_symbol}\n`;
    });
    text += `--------------------------------\n`;
    text += `الإجمالي: ${sale.subtotal.toFixed(2)} ${settings.currency_symbol}\n`;
    if (sale.discount > 0) text += `الخصم: ${sale.discount.toFixed(2)} ${settings.currency_symbol}\n`;
    text += `الصافي: ${sale.total.toFixed(2)} ${settings.currency_symbol}\n`;
    text += `المدفوع: ${sale.paid_amount.toFixed(2)} ${settings.currency_symbol}\n`;
    if (sale.remaining_amount > 0) {
      text += `المتبقي (دين): ${sale.remaining_amount.toFixed(2)} ${settings.currency_symbol}\n`;
    }
    text += `================================\n`;
    text += `${settings.invoice_footer}\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#2E7D32] dark:text-[#66BB6A]" />
            <h3 className="font-bold text-base text-gray-900 dark:text-white">
              إيصال الفاتورة الحرارية
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Box */}
        <div className="p-6 overflow-y-auto max-h-[70vh] flex justify-center bg-gray-100 dark:bg-black/30">
          <div
            ref={receiptRef}
            className="w-[300px] bg-white text-black p-4 font-mono text-xs shadow-md border border-gray-300 rounded-sm leading-relaxed select-text"
            dir="rtl"
          >
            {/* Store Branding */}
            <div className="text-center pb-3 border-b border-dashed border-gray-400 space-y-1">
              <h2 className="text-base font-extrabold tracking-wide text-black">
                {settings.shop_name}
              </h2>
              <p className="text-[11px] text-gray-700">{settings.invoice_header}</p>
              <p className="text-[10px] text-gray-600">
                هاتف: {settings.phone} | {settings.address}
              </p>
            </div>

            {/* Invoice Meta */}
            <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="font-bold">رقم الفاتورة:</span>
                <span>{sale.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ:</span>
                <span>{new Date(sale.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
              <div className="flex justify-between">
                <span>الوقت:</span>
                <span>{new Date(sale.created_at).toLocaleTimeString('ar-EG')}</span>
              </div>
              <div className="flex justify-between">
                <span>العميل:</span>
                <span className="font-bold">{sale.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span>طريقة الدفع:</span>
                <span className="font-bold">
                  {sale.payment_type === 'cash' ? 'نقدي كاش' : 'آجل (حساب)'}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-dashed border-gray-400">
              <div className="grid grid-cols-12 font-bold text-[11px] pb-1 border-b border-gray-300">
                <span className="col-span-6 text-right">الصنف</span>
                <span className="col-span-2 text-center">الكمية</span>
                <span className="col-span-2 text-center">السعر</span>
                <span className="col-span-2 text-left">الإجمالي</span>
              </div>
              <div className="divide-y divide-gray-100 py-1 space-y-1">
                {sale.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-[11px] pt-1">
                    <span className="col-span-6 font-medium text-right truncate">
                      {it.product_name}
                    </span>
                    <span className="col-span-2 text-center">
                      {it.quantity} {it.unit}
                    </span>
                    <span className="col-span-2 text-center">
                      {it.selling_price.toFixed(1)}
                    </span>
                    <span className="col-span-2 text-left font-bold">
                      {it.total_price.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-2.5 space-y-1.5 text-[11px] border-b border-dashed border-gray-400">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>{sale.subtotal.toFixed(2)} {settings.currency_symbol}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>الخصم:</span>
                  <span>- {sale.discount.toFixed(2)} {settings.currency_symbol}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-gray-300">
                <span>الصافي المطلوب:</span>
                <span>{sale.total.toFixed(2)} {settings.currency_symbol}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>المسدد:</span>
                <span>{sale.paid_amount.toFixed(2)} {settings.currency_symbol}</span>
              </div>
              {sale.remaining_amount > 0 && (
                <div className="flex justify-between font-bold text-red-700 bg-red-50 p-1 rounded">
                  <span>المتبقي في الذمة:</span>
                  <span>{sale.remaining_amount.toFixed(2)} {settings.currency_symbol}</span>
                </div>
              )}
            </div>

            {/* Barcode & Footer */}
            <div className="pt-3 text-center space-y-2">
              <div className="font-mono text-xs tracking-widest bg-gray-50 py-1 border border-gray-300">
                *{sale.invoice_number}*
              </div>
              <p className="text-[10px] text-gray-600">{settings.invoice_footer}</p>
              <p className="text-[9px] text-gray-400">نظام ايدينيا - حِسبة لإدارة الحسابات والمخازن</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              إغلاق
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#2E7D32] hover:bg-[#256628] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الإيصال</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
