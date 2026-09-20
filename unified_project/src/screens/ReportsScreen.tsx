import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Printer,
  Download,
  FileSpreadsheet,
  Award,
  PackageCheck,
  CreditCard,
  Boxes,
  ArrowUpRight
} from 'lucide-react';
import { db } from '../services/db';
import { AppSettings, Sale, Product } from '../types';

export const ReportsScreen: React.FC = () => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setSettings(db.getSettings());
    setSales(db.getSales());
    setProducts(db.getProducts());
  }, []);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  const filteredSales = sales.filter(s => {
    const time = new Date(s.created_at).getTime();
    if (period === 'today') return time >= todayStart;
    if (period === 'week') return time >= weekStart;
    if (period === 'month') return time >= monthStart;
    return true;
  });

  const periodSalesTotal = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const periodProfitTotal = filteredSales.reduce((sum, s) => sum + s.profit, 0);
  const periodInvoicesCount = filteredSales.length;
  const periodCashSales = filteredSales.filter(s => s.payment_type === 'cash').reduce((sum, s) => sum + s.total, 0);
  const periodDebtSales = filteredSales.filter(s => s.payment_type === 'debt').reduce((sum, s) => sum + s.total, 0);

  // Top selling products calculation
  const productSoldMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  filteredSales.forEach(s => {
    s.items.forEach(it => {
      if (!productSoldMap[it.product_name]) {
        productSoldMap[it.product_name] = { name: it.product_name, qty: 0, revenue: 0 };
      }
      productSoldMap[it.product_name].qty += it.quantity;
      productSoldMap[it.product_name].revenue += it.total_price;
    });
  });

  const topSoldProducts = Object.values(productSoldMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto select-none" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
              التقارير المالية والأرباح
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              تحليل شامل لحجم المبيعات، صافي الأرباح، وحركة النشاط التجاري
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period buttons */}
          {(['today', 'week', 'month', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                period === p
                  ? 'bg-[#2E7D32] text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {p === 'today' ? 'اليوم' : p === 'week' ? 'آخر 7 أيام' : p === 'month' ? 'آخر 30 يوماً' : 'كل الفترات'}
            </button>
          ))}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-2xl transition-colors cursor-pointer mr-2"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-gray-500">إجمالي المبيعات</span>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {periodSalesTotal.toFixed(2)} {settings.currency_symbol}
          </div>
          <div className="text-[11px] text-gray-400">{periodInvoicesCount} فواتير مباعة</div>
        </div>

        <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-gray-500">صافي الأرباح</span>
          <div className="text-2xl font-black text-[#2E7D32] dark:text-[#66BB6A]">
            + {periodProfitTotal.toFixed(2)} {settings.currency_symbol}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold">
            هامش ربح: {periodSalesTotal > 0 ? ((periodProfitTotal / periodSalesTotal) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-gray-500">المبيعات النقدية (الكاش)</span>
          <div className="text-2xl font-black text-blue-600">
            {periodCashSales.toFixed(2)} {settings.currency_symbol}
          </div>
          <div className="text-[11px] text-gray-400">سيولة فورية محصلة</div>
        </div>

        <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-gray-500">المبيعات الآجلة (ديون جديدة)</span>
          <div className="text-2xl font-black text-amber-600">
            {periodDebtSales.toFixed(2)} {settings.currency_symbol}
          </div>
          <div className="text-[11px] text-gray-400">مستحقات آجلة للتحصيل</div>
        </div>
      </div>

      {/* Breakdown: Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="font-extrabold text-base text-gray-900 dark:text-white">
              الأصناف الأكثر مبيعاً في هذه الفترة
            </h2>
          </div>

          {topSoldProducts.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">
              لا توجد مبيعات في الفترة المحددة.
            </div>
          ) : (
            <div className="space-y-3">
              {topSoldProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#2E7D32] text-white text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-gray-900 dark:text-white">{p.name}</div>
                      <div className="text-[10px] text-gray-400">الكمية المباعة: {p.qty} وحدة</div>
                    </div>
                  </div>

                  <div className="font-bold text-xs text-[#2E7D32] dark:text-[#66BB6A]">
                    {p.revenue.toFixed(2)} {settings.currency_symbol}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial Health Summary */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[#2E7D32]" />
            <h2 className="font-extrabold text-base text-gray-900 dark:text-white">
              ملخص الموقف المالي للمحل
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900">
              <span className="text-gray-600 dark:text-gray-300">اسم المنشأة:</span>
              <span className="font-bold text-gray-900 dark:text-white">{settings.shop_name}</span>
            </div>

            <div className="flex justify-between p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900">
              <span className="text-gray-600 dark:text-gray-300">العملة الأساسية:</span>
              <span className="font-bold text-gray-900 dark:text-white">{settings.currency_name} ({settings.currency_symbol})</span>
            </div>

            <div className="flex justify-between p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900">
              <span className="text-gray-600 dark:text-gray-300">نظام التشغيل:</span>
              <span className="font-bold text-[#2E7D32] dark:text-[#66BB6A]">ايدينيا - حِسبة (مخزن وحسابات يدوي)</span>
            </div>

            <div className="flex justify-between p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900">
              <span className="text-gray-600 dark:text-gray-300">حالة قاعدة البيانات:</span>
              <span className="font-bold text-emerald-600">متصلة محلياً (SQLite / LocalStorage)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
