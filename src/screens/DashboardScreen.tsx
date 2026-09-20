import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Boxes,
  Users,
  CreditCard,
  ShoppingCart,
  PackagePlus,
  UserPlus,
  BadgeDollarSign,
  AlertTriangle,
  Calendar,
  Receipt,
  Zap,
  CheckCircle2,
  HardDrive,
  Printer,
  ShieldCheck
} from 'lucide-react';
import { db } from '../services/db';
import { DashboardStats, AppSettings, Sale, ScreenType } from '../types';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onOpenNewSale: () => void;
  onOpenAddProduct: () => void;
  onOpenAddCustomer: () => void;
  onOpenRecordPayment: () => void;
  onViewInvoice: (sale: Sale) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  onOpenNewSale,
  onOpenAddProduct,
  onOpenAddCustomer,
  onOpenRecordPayment,
  onViewInvoice
}) => {
  const [stats, setStats] = useState<DashboardStats>(db.getDashboardStats());
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [recentSales, setRecentSales] = useState<Sale[]>(db.getSales().slice(0, 5));

  useEffect(() => {
    setStats(db.getDashboardStats());
    setSettings(db.getSettings());
    setRecentSales(db.getSales().slice(0, 5));
  }, []);

  const statCards = [
    {
      title: 'مبيعات اليوم',
      value: `${stats.todaySales.toFixed(2)} ${settings.currency_symbol}`,
      subtitle: `${stats.todayInvoicesCount} فواتير مسجلة اليوم`,
      icon: ShoppingCart,
      color: 'bg-emerald-50 dark:bg-emerald-950/40 text-[#2E7D32] dark:text-[#66BB6A] border-emerald-200 dark:border-emerald-800/60'
    },
    {
      title: 'أرباح اليوم الصافية',
      value: `${stats.todayProfit.toFixed(2)} ${settings.currency_symbol}`,
      subtitle: 'هامش الربح بعد خصم التكلفة',
      icon: TrendingUp,
      color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
    },
    {
      title: 'إجمالي الديون المعلقة',
      value: `${stats.totalDebts.toFixed(2)} ${settings.currency_symbol}`,
      subtitle: 'مستحقات آجلة لدى العملاء',
      icon: CreditCard,
      color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
    },
    {
      title: 'قيمة بضاعة المخزن',
      value: `${stats.inventoryValue.toFixed(2)} ${settings.currency_symbol}`,
      subtitle: 'بسعر الشراء الفعلي',
      icon: Boxes,
      color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60'
    },
    {
      title: 'أصناف المخزن',
      value: `${stats.productsCount} صنف`,
      subtitle: stats.lowStockCount > 0 ? `${stats.lowStockCount} منتجات قاربت على النفاد` : 'المخزون في المستوى الآمن',
      icon: PackagePlus,
      color: stats.lowStockCount > 0
        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60'
        : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/60'
    },
    {
      title: 'العملاء المسجلين',
      value: `${stats.customersCount} عميل`,
      subtitle: 'سجل العملاء والتعاملات',
      icon: Users,
      color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60'
    }
  ];

  return (
    <div className="p-3 md:p-5 space-y-4 max-w-7xl mx-auto select-none" dir="rtl">
      {/* Native App Top Header Card (Operational Terminal Banner) */}
      <div className="bg-gradient-to-r from-zinc-900 via-emerald-950 to-zinc-900 text-white p-4 md:p-5 rounded-2xl border border-zinc-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h1 className="text-base md:text-lg font-black text-white">
              محطة العمليات والمبيعات (POS Terminal)
            </h1>
            <span className="bg-emerald-800/80 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-600/50">
              Offline 100%
            </span>
          </div>
          <p className="text-xs text-zinc-400 flex items-center gap-2">
            <span>متجر: <strong className="text-white">{settings.shop_name}</strong></span>
            <span>•</span>
            <span>العملة: <strong className="text-white">{settings.currency_symbol}</strong></span>
            <span>•</span>
            <span>طابعة الفواتير: <strong className="text-emerald-300">{settings.print_thermal_width} حراري</strong></span>
          </p>
        </div>
      </div>

      {/* 4 App-Style Touch Action Tiles (POS / Inventory / Customers / Payments) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={onOpenNewSale}
          className="flex flex-col items-center justify-center p-3.5 bg-gradient-to-tr from-[#1B5E20] to-[#2E7D32] hover:from-[#17521c] hover:to-[#256629] text-white rounded-2xl shadow-md shadow-emerald-800/20 active:scale-95 transition-all cursor-pointer group"
        >
          <ShoppingCart className="w-6 h-6 mb-1 text-emerald-200 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-black">كاشير بيع جديد</span>
          <span className="text-[10px] text-emerald-200 font-mono mt-0.5">[F2]</span>
        </button>

        <button
          onClick={onOpenAddProduct}
          className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-[#1E1E1E] hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xs active:scale-95 transition-all cursor-pointer group"
        >
          <PackagePlus className="w-6 h-6 mb-1 text-[#2E7D32] dark:text-[#66BB6A] group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold">إضافة صنف للمخزن</span>
          <span className="text-[10px] text-gray-400 font-mono mt-0.5">[F3]</span>
        </button>

        <button
          onClick={onOpenAddCustomer}
          className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-[#1E1E1E] hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xs active:scale-95 transition-all cursor-pointer group"
        >
          <UserPlus className="w-6 h-6 mb-1 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold">تسجيل عميل جديد</span>
          <span className="text-[10px] text-gray-400 font-mono mt-0.5">[F5]</span>
        </button>

        <button
          onClick={onOpenRecordPayment}
          className="flex flex-col items-center justify-center p-3.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 rounded-2xl shadow-2xs active:scale-95 transition-all cursor-pointer group"
        >
          <BadgeDollarSign className="w-6 h-6 mb-1 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold">سداد دفعة دين</span>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono mt-0.5">[F6]</span>
        </button>
      </div>

      {/* Low Stock Warning Alert if any */}
      {stats.lowStockCount > 0 && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-xs font-bold text-red-900 dark:text-red-200">
              تنبيه المخزون: {stats.lowStockCount} أصناف قاربت على النفاد، يرجى التزويد.
            </span>
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-xs font-bold text-red-700 dark:text-red-300 underline cursor-pointer shrink-0"
          >
            عرض النواقص
          </button>
        </div>
      )}

      {/* 6 Key Financial & Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-[#1E1E1E] p-3.5 md:p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs flex items-start justify-between gap-2"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  {card.title}
                </span>
                <div className="text-base md:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                  {card.value}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">
                  {card.subtitle}
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border shrink-0 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Sales Invoices Journal */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#2E7D32] dark:text-[#66BB6A]" />
            <h2 className="font-extrabold text-sm text-gray-900 dark:text-white">
              أرشيف الفواتير الحديثة
            </h2>
          </div>
          <button
            onClick={() => onNavigate('sales')}
            className="text-xs font-bold text-[#2E7D32] dark:text-[#66BB6A] hover:underline cursor-pointer"
          >
            فتح الكاشير (F2)
          </button>
        </div>

        {recentSales.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-xs">
            لا توجد فواتير مسجلة اليوم حتى الآن. اضغط على "كاشير بيع جديد" لإصدار أول فاتورة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">العميل</th>
                  <th className="py-2.5 px-3">طريقة الدفع</th>
                  <th className="py-2.5 px-3">الأصناف</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                  <th className="py-2.5 px-3">الربح</th>
                  <th className="py-2.5 px-3">الوقت</th>
                  <th className="py-2.5 px-3 text-center">الإيصال الحراري</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50/80 dark:hover:bg-zinc-900/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-900 dark:text-white">
                      {sale.invoice_number}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-gray-200">
                      {sale.customer_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          sale.payment_type === 'cash'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {sale.payment_type === 'cash' ? 'نقدي' : 'آجل'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                      {sale.items_count} صنف
                    </td>
                    <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white">
                      {sale.total.toFixed(2)} {settings.currency_symbol}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      + {sale.profit.toFixed(2)} {settings.currency_symbol}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">
                      {new Date(sale.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onViewInvoice(sale)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#2E7D32] dark:text-[#66BB6A] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg cursor-pointer transition-colors"
                      >
                        <Printer className="w-3 h-3" />
                        <span>طباعة</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
