import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  BadgeDollarSign,
  History,
  Calendar,
  Filter,
  User
} from 'lucide-react';
import { db } from '../services/db';
import { Debt, DebtPayment, AppSettings } from '../types';

export const DebtsScreen: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [search, setSearch] = useState('');

  // Quick Pay Modal
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState<string>('سداد آجل');

  const loadData = () => {
    setDebts(db.getDebts());
    setPayments(db.getDebtPayments());
    setSettings(db.getSettings());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || payAmount <= 0) return;

    db.recordDebtPayment(selectedDebt.customer_id, payAmount, payNotes, selectedDebt.id);
    setSelectedDebt(null);
    setPayAmount(0);
    loadData();
  };

  const filteredDebts = debts.filter(d =>
    d.customer_name.includes(search)
  );

  const pendingDebts = filteredDebts.filter(d => d.status !== 'paid');
  const totalPendingAmount = debts.reduce((sum, d) => sum + d.remaining_amount, 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
              الديون والمستحقات الآجلة
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              متابعة مديونيات العملاء، تحصيل الدفعات، وسجل السداد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-4 py-2 rounded-2xl text-left">
            <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">إجمالي المتبقي للتحصيل</div>
            <div className="text-base font-black text-amber-700 dark:text-amber-400">
              {totalPendingAmount.toFixed(2)} {settings.currency_symbol}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-[#2E7D32] text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            الديون القائمة ({pendingDebts.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#2E7D32] text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            سجل التحصيلات السابقة ({payments.length})
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="بحث باسم العميل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'pending' ? (
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
          {pendingDebts.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              رائع! لا توجد ديون قائمة أو مستحقات معلقة حالياً.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="py-3 px-4">اسم العميل</th>
                    <th className="py-3 px-4">أصل مبلغ الدين</th>
                    <th className="py-3 px-4">المسدد منه</th>
                    <th className="py-3 px-4">المتبقي المطلوب</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">تاريخ الدين</th>
                    <th className="py-3 px-4 text-center">إجراء التحصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {pendingDebts.map(debt => (
                    <tr key={debt.id} className="hover:bg-gray-50 dark:hover:bg-zinc-900/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                        {debt.customer_name}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {debt.amount.toFixed(2)} {settings.currency_symbol}
                      </td>
                      <td className="py-3 px-4 text-emerald-600 font-semibold">
                        {debt.paid_amount.toFixed(2)} {settings.currency_symbol}
                      </td>
                      <td className="py-3 px-4 font-black text-red-600 text-sm">
                        {debt.remaining_amount.toFixed(2)} {settings.currency_symbol}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          {debt.status === 'partial' ? 'سداد جزئي' : 'معلق بالكامل'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(debt.created_at).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedDebt(debt);
                            setPayAmount(debt.remaining_amount);
                          }}
                          className="px-3 py-1.5 bg-[#2E7D32] hover:bg-[#256628] text-white font-bold text-[11px] rounded-xl cursor-pointer"
                        >
                          تحصيل دفعة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Payments History */
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">اسم العميل</th>
                  <th className="py-3 px-4">المبلغ المستلم</th>
                  <th className="py-3 px-4">البيان / ملاحظات</th>
                  <th className="py-3 px-4">تاريخ التحصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-zinc-900/60">
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                      {p.customer_name}
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">
                      + {p.amount.toFixed(2)} {settings.currency_symbol}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {p.notes || 'سداد دفعة'}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(p.payment_date).toLocaleString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-gray-200 dark:border-gray-800">
            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
              تحصيل من العميل: {selectedDebt.customer_name}
            </h3>

            <form onSubmit={handlePaySubmit} className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl text-xs space-y-1">
                <div>أصل الدين: {selectedDebt.amount.toFixed(2)} {settings.currency_symbol}</div>
                <div>المتبقي المطلوب: <strong className="text-red-600">{selectedDebt.remaining_amount.toFixed(2)} {settings.currency_symbol}</strong></div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  المبلغ المستلم نقداً
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  max={selectedDebt.remaining_amount}
                  required
                  value={payAmount || ''}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-bold text-[#2E7D32] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  البيان
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDebt(null)}
                  className="w-1/2 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-[#2E7D32] hover:bg-[#256628] text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  تأكيد التحصيل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
