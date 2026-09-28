import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  CreditCard,
  Edit2,
  Trash2,
  BadgeDollarSign,
  FileText,
  CheckCircle2,
  X,
  Calendar,
  Clock,
  Printer,
  ChevronDown,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { db } from '../services/db';
import { Customer, AppSettings, Debt, DebtPayment, Sale } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface CustomersScreenProps {
  onOpenRecordPaymentForCustomer?: (customerId: string) => void;
}

export const CustomersScreen: React.FC<CustomersScreenProps> = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [search, setSearch] = useState('');

  // Add/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Payment modal state
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Statement / Daily Ledger Modal state
  const [selectedStatementCustomer, setSelectedStatementCustomer] = useState<Customer | null>(null);
  const [statementTab, setStatementTab] = useState<'daily' | 'invoices' | 'payments'>('daily');
  const [statementLedger, setStatementLedger] = useState<any[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<Sale[]>([]);
  const [customerPayments, setCustomerPayments] = useState<DebtPayment[]>([]);

  // Payment Receipt Modal State
  const [justRecordedPayment, setJustRecordedPayment] = useState<{
    customer: Customer;
    payment: DebtPayment;
  } | null>(null);

  // Delete confirm
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);

  const loadData = () => {
    setCustomers(db.getCustomers());
    setSettings(db.getSettings());
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCustomerStatement = (customer: Customer) => {
    setSelectedStatementCustomer(customer);
    const ledger = db.getCustomerDailyLedger(customer.id);
    const invoices = db.getCustomerInvoices(customer.id);
    const payments = db.getDebtPayments().filter(p => p.customer_id === customer.id);

    setStatementLedger(ledger);
    setCustomerInvoices(invoices);
    setCustomerPayments(payments);
    setStatementTab('daily');
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setNotes('');
    setIsModalOpen(false);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    db.saveCustomer({
      id: editingId || undefined,
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      total_debt: editingId ? undefined : 0,
      paid_amount: editingId ? undefined : 0,
      remaining_debt: editingId ? undefined : 0
    });

    resetForm();
    loadData();
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalCustomer || paymentAmount <= 0) return;

    const res = db.recordDebtPayment(paymentModalCustomer.id, paymentAmount, paymentNotes);
    if (res.success && res.payment) {
      setJustRecordedPayment({
        customer: paymentModalCustomer,
        payment: res.payment
      });
    }

    setPaymentModalCustomer(null);
    setPaymentAmount(0);
    setPaymentNotes('');
    loadData();
  };

  const handleDeleteConfirm = () => {
    if (deleteCustomerId) {
      db.deleteCustomer(deleteCustomerId);
      setDeleteCustomerId(null);
      loadData();
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.includes(search) || (c.phone && c.phone.includes(search))
  );

  const totalDebtsSum = customers.reduce((sum, c) => sum + c.remaining_debt, 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto select-none" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
              سجل العملاء والحسابات
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              إدارة بيانات العملاء ومتابعة المستحقات والديون والدفعات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-4 py-2 rounded-2xl text-left">
            <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">إجمالي ديون العملاء</div>
            <div className="text-base font-black text-amber-700 dark:text-amber-400">
              {totalDebtsSum.toFixed(2)} {settings.currency_symbol}
            </div>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold rounded-2xl shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة عميل</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث باسم العميل أو رقم هاتفه..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 text-xs md:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2E7D32]"
          />
        </div>
      </div>

      {/* Customers List / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => (
          <div
            key={customer.id}
            className="bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  {customer.name}
                </h3>
                {customer.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5" dir="ltr">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span>{customer.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingId(customer.id);
                    setName(customer.name);
                    setPhone(customer.phone || '');
                    setNotes(customer.notes || '');
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                  title="تعديل"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteCustomerId(customer.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Debt status badge */}
            <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">الرصيد المتبقي (الدين):</span>
              <span className={`font-extrabold text-sm ${customer.remaining_debt > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {customer.remaining_debt.toFixed(2)} {settings.currency_symbol}
              </span>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setPaymentModalCustomer(customer);
                  setPaymentAmount(customer.remaining_debt > 0 ? customer.remaining_debt : 0);
                  setPaymentNotes('سداد دفعة نقدية');
                }}
                className="py-2 px-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#2E7D32] dark:text-[#66BB6A] text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <BadgeDollarSign className="w-3.5 h-3.5" />
                <span>تسجيل دفعة</span>
              </button>

              <button
                onClick={() => openCustomerStatement(customer)}
                className="py-2 px-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>كشف الحساب والدمج</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingId ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
              </h3>
              <button onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  اسم العميل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الحاج محمود إبراهيم"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="01012345678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs text-right rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  ملاحظات أو عنوان
                </label>
                <input
                  type="text"
                  placeholder="ملاحظات اختيارية..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {editingId ? 'حفظ التعديلات' : 'إضافة العميل'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                تسجيل دفعة سداد دين
              </h3>
              <button onClick={() => setPaymentModalCustomer(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl text-xs space-y-1">
                <div>العميل: <strong className="text-gray-900 dark:text-white">{paymentModalCustomer.name}</strong></div>
                <div>الرصيد المتبقي عليه: <strong className="text-red-600">{paymentModalCustomer.remaining_debt.toFixed(2)} {settings.currency_symbol}</strong></div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  المبلغ المسدد الآن
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={paymentAmount || ''}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-bold text-[#2E7D32] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  البيان / ملاحظات الدفعة
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="سداد دفعة..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                تأكيد وقيد الدفعة في الحساب
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteCustomerId}
        title="حذف العميل"
        message="هل أنت متأكد من حذف العميل؟ لن يتم حذف الفواتير السابقة."
        confirmText="نعم، احذف"
        cancelText="إلغاء"
        danger={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteCustomerId(null)}
      />

      {/* Customer Account Statement & Daily Ledger Modal */}
      {selectedStatementCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none" dir="rtl">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <span>كشف حساب وسجل معاملات: {selectedStatementCustomer.name}</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    سجل الفواتير التاريخي والدمج اليومي التلقائي والدفعات المسددة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStatementCustomer(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Summary Cards */}
            <div className="p-4 bg-gray-50/50 dark:bg-zinc-900/40 border-b border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-[11px] text-gray-400 font-bold">إجمالي المشتريات الآجلة</div>
                <div className="text-sm font-black text-gray-900 dark:text-white mt-0.5">
                  {selectedStatementCustomer.total_debt.toFixed(2)} {settings.currency_symbol}
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">إجمالي المسدد</div>
                <div className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {selectedStatementCustomer.paid_amount.toFixed(2)} {settings.currency_symbol}
                </div>
              </div>

              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900/60">
                <div className="text-[11px] text-red-600 dark:text-red-400 font-bold">الرصيد المتبقي (الدين)</div>
                <div className="text-sm font-black text-red-700 dark:text-red-400 mt-0.5">
                  {selectedStatementCustomer.remaining_debt.toFixed(2)} {settings.currency_symbol}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 px-4 pt-2 gap-2 bg-white dark:bg-[#1E1E1E]">
              <button
                onClick={() => setStatementTab('daily')}
                className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  statementTab === 'daily'
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>الدمج اليومي التلقائي ({statementLedger.length} أيام)</span>
              </button>

              <button
                onClick={() => setStatementTab('invoices')}
                className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  statementTab === 'invoices'
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>جميع الفواتير التفصيلية ({customerInvoices.length})</span>
              </button>

              <button
                onClick={() => setStatementTab('payments')}
                className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  statementTab === 'payments'
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <BadgeDollarSign className="w-4 h-4" />
                <span>سندات سداد الدفعات ({customerPayments.length})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {statementTab === 'daily' && (
                <div className="space-y-4">
                  {statementLedger.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-xs">
                      لا توجد فواتير أو معاملات مسجلة لهذا العميل حتى الآن.
                    </div>
                  ) : (
                    statementLedger.map((dayEntry, idx) => (
                      <div
                        key={dayEntry.date || idx}
                        className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 shadow-xs"
                      >
                        {/* Day Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="font-extrabold text-xs text-gray-900 dark:text-white">
                              {dayEntry.dateFormatted}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              ({dayEntry.date})
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-500">
                              مشتريات: <strong className="text-gray-900 dark:text-white font-bold">{dayEntry.totalSales.toFixed(2)}</strong> {settings.currency_symbol}
                            </span>
                            {dayEntry.totalPaid > 0 && (
                              <span className="text-emerald-600 font-bold">
                                سداد: +{dayEntry.totalPaid.toFixed(2)} {settings.currency_symbol}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chronological Timeline */}
                        <div className="space-y-2 pr-2">
                          {/* Invoices of the day */}
                          {dayEntry.sales.map((sale: Sale) => (
                            <div
                              key={sale.id}
                              className="p-3 bg-gray-50 dark:bg-zinc-800/60 rounded-xl flex items-center justify-between text-xs border border-gray-100 dark:border-gray-800"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    فاتورة رقم {sale.invoice_number}
                                  </span>
                                  <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                                    <Clock className="w-3 h-3" />
                                    {new Date(sale.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  الأصناف: {sale.items.map(it => `${it.product_name} (${it.quantity} ${it.unit})`).join('، ')}
                                </div>
                              </div>

                              <div className="text-left font-black text-sm text-[#2E7D32] dark:text-[#66BB6A]">
                                {sale.total.toFixed(2)} {settings.currency_symbol}
                              </div>
                            </div>
                          ))}

                          {/* Payments of the day */}
                          {dayEntry.payments.map((pay: DebtPayment) => (
                            <div
                              key={pay.id}
                              className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl flex items-center justify-between text-xs border border-emerald-200 dark:border-emerald-800/60"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-emerald-800 dark:text-emerald-300">
                                    سند تسديد دفعة نقدية
                                  </span>
                                  <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-mono">
                                    <Clock className="w-3 h-3" />
                                    {new Date(pay.payment_date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {pay.notes && (
                                  <div className="text-[11px] text-emerald-700/80">
                                    البيان: {pay.notes}
                                  </div>
                                )}
                              </div>

                              <div className="text-left font-black text-sm text-emerald-700 dark:text-emerald-400">
                                - {pay.amount.toFixed(2)} {settings.currency_symbol}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {statementTab === 'invoices' && (
                <div className="space-y-3">
                  {customerInvoices.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-xs">
                      لا توجد فواتير سابقة لهذا العميل.
                    </div>
                  ) : (
                    customerInvoices.map(s => (
                      <div
                        key={s.id}
                        className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                            <span>فاتورة #{s.invoice_number}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(s.created_at).toLocaleString('ar-EG')}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500">
                            عدد الأصناف: {s.items_count} | الدفع: {s.payment_type === 'cash' ? 'نقدي' : 'آجل'}
                          </div>
                        </div>

                        <div className="text-left font-black text-sm text-[#2E7D32]">
                          {s.total.toFixed(2)} {settings.currency_symbol}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {statementTab === 'payments' && (
                <div className="space-y-3">
                  {customerPayments.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-xs">
                      لا توجد دفعات مسددة حتى الآن.
                    </div>
                  ) : (
                    customerPayments.map(p => (
                      <div
                        key={p.id}
                        className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-emerald-800 dark:text-emerald-300">
                            سند قبض رقم #{p.id.slice(-6)}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            التاريخ: {new Date(p.payment_date).toLocaleString('ar-EG')} {p.notes ? `• ${p.notes}` : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-left font-black text-sm text-emerald-600">
                            {p.amount.toFixed(2)} {settings.currency_symbol}
                          </div>
                          <button
                            onClick={() => {
                              setJustRecordedPayment({
                                customer: selectedStatementCustomer,
                                payment: p
                              });
                            }}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 rounded-lg cursor-pointer"
                            title="طباعة إيصال السند"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة كشف الحساب</span>
              </button>

              <button
                onClick={() => setSelectedStatementCustomer(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Payment Receipt / Voucher Modal */}
      {justRecordedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none" dir="rtl">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  سند قبض وتأكيد سداد
                </h3>
              </div>
              <button onClick={() => setJustRecordedPayment(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 space-y-2.5 text-xs select-text font-mono">
              <div className="text-center pb-2 border-b border-gray-200 dark:border-gray-700 space-y-0.5">
                <div className="font-black text-sm text-gray-900 dark:text-white">{settings.shop_name}</div>
                <div className="text-[10px] text-gray-500">إيصال استلام دفعة نقدية</div>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">العميل:</span>
                <span className="font-bold text-gray-900 dark:text-white">{justRecordedPayment.customer.name}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">التاريخ والوقت:</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {new Date(justRecordedPayment.payment.payment_date).toLocaleString('ar-EG')}
                </span>
              </div>

              <div className="flex justify-between py-1 border-y border-gray-200 dark:border-gray-700 text-sm font-black text-emerald-700 dark:text-emerald-400">
                <span>المبلغ المستلم:</span>
                <span>{justRecordedPayment.payment.amount.toFixed(2)} {settings.currency_symbol}</span>
              </div>

              <div className="flex justify-between text-red-600 dark:text-red-400 font-bold">
                <span>الرصيد المتبقي بالذمة:</span>
                <span>{justRecordedPayment.customer.remaining_debt.toFixed(2)} {settings.currency_symbol}</span>
              </div>

              {justRecordedPayment.payment.notes && (
                <div className="text-[10px] text-gray-400 pt-1">
                  البيان: {justRecordedPayment.payment.notes}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الإيصال</span>
              </button>
              <button
                onClick={() => setJustRecordedPayment(null)}
                className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
              >
                تم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
