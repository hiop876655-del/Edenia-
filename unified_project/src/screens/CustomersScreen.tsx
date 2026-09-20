import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { db } from '../services/db';
import { Customer, AppSettings, Debt, DebtPayment } from '../types';
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

  // Delete confirm
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);

  const loadData = () => {
    setCustomers(db.getCustomers());
    setSettings(db.getSettings());
  };

  useEffect(() => {
    loadData();
  }, []);

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

    db.recordDebtPayment(paymentModalCustomer.id, paymentAmount, paymentNotes);
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

            {/* Quick Action */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setPaymentModalCustomer(customer);
                  setPaymentAmount(customer.remaining_debt > 0 ? customer.remaining_debt : 0);
                  setPaymentNotes('سداد دفعة نقدية');
                }}
                className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#2E7D32] dark:text-[#66BB6A] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <BadgeDollarSign className="w-4 h-4" />
                <span>تسجيل دفعة / سداد</span>
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
    </div>
  );
};
