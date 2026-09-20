import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  User,
  CreditCard,
  DollarSign,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  History,
  QrCode,
  Package
} from 'lucide-react';
import { db } from '../services/db';
import { Product, Customer, Sale, SaleItem, AppSettings } from '../types';

interface SalesScreenProps {
  onShowReceipt: (sale: Sale) => void;
}

export const SalesScreen: React.FC<SalesScreenProps> = ({ onShowReceipt }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);

  // Active Cart State
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('عميل نقدي');
  const [paymentType, setPaymentType] = useState<'cash' | 'debt'>('cash');
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Search & Barcode
  const [productSearch, setProductSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = () => {
    setProducts(db.getProducts());
    setCustomers(db.getCustomers());
    setSettings(db.getSettings());
    setSalesHistory(db.getSales());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate totals
  const subtotal = cart.reduce((sum, it) => sum + it.total_price, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const remaining = Math.max(0, total - (Number(paidAmount) || 0));

  // Auto-set paid amount to total when cash payment
  useEffect(() => {
    if (paymentType === 'cash') {
      setPaidAmount(total);
    }
  }, [total, paymentType]);

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      setErrorMessage(`المنتج (${product.name}) غير متوفر حالياً في المخزن!`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setCart(prev => {
      const existing = prev.find(it => it.product_id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.quantity) {
          setErrorMessage(`الكمية المطلوبة تتجاوز الرصيد المتوفر في المخزن (${product.quantity})`);
          setTimeout(() => setErrorMessage(null), 3000);
          return prev;
        }
        return prev.map(it =>
          it.product_id === product.id
            ? {
                ...it,
                quantity: it.quantity + 1,
                total_price: (it.quantity + 1) * it.selling_price,
                profit: (it.quantity + 1) * (it.selling_price - it.purchase_price)
              }
            : it
        );
      }

      const newItem: SaleItem = {
        id: `temp_${Date.now()}_${Math.random()}`,
        sale_id: '',
        product_id: product.id,
        product_name: product.name,
        unit: product.unit,
        quantity: 1,
        purchase_price: product.purchase_price,
        selling_price: product.selling_price,
        total_price: product.selling_price,
        profit: product.selling_price - product.purchase_price
      };

      return [...prev, newItem];
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > prod.quantity) {
      setErrorMessage(`الكمية المتاحة في المخزن فقط ${prod.quantity}`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setCart(prev =>
      prev.map(it =>
        it.product_id === productId
          ? {
              ...it,
              quantity: newQty,
              total_price: newQty * it.selling_price,
              profit: newQty * (it.selling_price - it.purchase_price)
            }
          : it
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(it => it.product_id !== productId));
  };

  const resetCart = () => {
    setCart([]);
    setSelectedCustomerId('');
    setCustomCustomerName('عميل نقدي');
    setPaymentType('cash');
    setDiscount(0);
    setPaidAmount(0);
    setNotes('');
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setErrorMessage('سلة المبيعات فارغة، أضف أصنافاً أولاً!');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    let customerName = customCustomerName;
    if (selectedCustomerId) {
      const c = customers.find(x => x.id === selectedCustomerId);
      if (c) customerName = c.name;
    }

    if (paymentType === 'debt' && !selectedCustomerId && (!customCustomerName || customCustomerName === 'عميل نقدي')) {
      setErrorMessage('البيع بالآجل يتطلب تحديد عميل مسجل أو كتابة اسم العميل!');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    const res = db.processSale({
      customer_id: selectedCustomerId || undefined,
      customer_name: customerName,
      discount: Number(discount) || 0,
      paid_amount: Number(paidAmount) || 0,
      payment_type: paymentType,
      notes: notes.trim(),
      items: cart
    });

    if (!res.success || !res.sale) {
      setErrorMessage(res.error || 'فشلت عملية البيع');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setSuccessMessage(`تم إصدار الفاتورة رقم ${res.sale.invoice_number} وحفظها بنجاح!`);
    loadData();
    resetCart();

    // Show thermal receipt
    onShowReceipt(res.sale);
  };

  const filteredProducts = products.filter(p =>
    p.name.includes(productSearch) || (p.barcode && p.barcode.includes(productSearch)) || p.category.includes(productSearch)
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto select-none" dir="rtl">
      {/* Tabs Header */}
      <div className="flex items-center justify-between bg-white dark:bg-[#1E1E1E] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#2E7D32] text-white flex items-center justify-center">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
              نقطة البيع وإصدار الفواتير (POS)
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              بيع نقدي وآجل، خصومات، وطباعة إيصال الفاتورة الحراري فورياً
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
              activeTab === 'pos'
                ? 'bg-[#2E7D32] text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            نقطة البيع الحالية
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#2E7D32] text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            سجل الفواتير السابقة ({salesHistory.length})
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-center gap-2 text-red-700 dark:text-red-300 text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-pulse">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Product Grid for Fast Selection */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search and Barcode Input */}
            <div className="bg-white dark:bg-[#1E1E1E] p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث باسم المنتج، الصنف، أو امسح الباركود..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full text-xs bg-transparent border-none focus:outline-hidden text-gray-900 dark:text-white"
              />
              {productSearch && (
                <button
                  onClick={() => setProductSearch('')}
                  className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer px-2"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Products Quick Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto p-1">
              {filteredProducts.map(prod => {
                const inCart = cart.find(it => it.product_id === prod.id);
                const isOutOfStock = prod.quantity <= 0;

                return (
                  <div
                    key={prod.id}
                    onClick={() => !isOutOfStock && addToCart(prod)}
                    className={`relative p-3 rounded-2xl border transition-all select-none flex flex-col justify-between text-right ${
                      isOutOfStock
                        ? 'bg-gray-100 dark:bg-zinc-900/40 border-gray-200 dark:border-gray-800 opacity-60 cursor-not-allowed'
                        : inCart
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700 shadow-xs hover:border-[#2E7D32] cursor-pointer'
                        : 'bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-gray-800 hover:border-emerald-400 shadow-2xs hover:shadow-xs cursor-pointer'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2 left-2 w-5 h-5 bg-[#2E7D32] text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs">
                        {inCart.quantity}
                      </span>
                    )}

                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-400">{prod.category}</div>
                      <h4 className="font-extrabold text-xs text-gray-900 dark:text-white line-clamp-2">
                        {prod.name}
                      </h4>
                    </div>

                    <div className="pt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800/80 mt-2">
                      <div className="font-black text-xs text-[#2E7D32] dark:text-[#66BB6A]">
                        {prod.selling_price.toFixed(2)} {settings.currency_symbol}
                      </div>

                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        {isOutOfStock ? (
                          <span className="text-red-500 font-bold">نفد</span>
                        ) : (
                          <span>المتاح: <strong>{prod.quantity}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Invoice Cart & Checkout Summary */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2E7D32]" />
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                    فاتورة البيع الحالية ({cart.length} أصناف)
                  </h3>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={resetCart}
                    className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إفراغ السلة</span>
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    السلة فارغة. اختر أصنافاً من القائمة لإضافتها للفاتورة.
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.product_id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="space-y-0.5 flex-1">
                        <div className="font-bold text-xs text-gray-900 dark:text-white">
                          {item.product_name}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {item.selling_price.toFixed(2)} × {item.quantity} = {item.total_price.toFixed(2)} {settings.currency_symbol}
                        </div>
                      </div>

                      {/* Quantity buttons */}
                      <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-red-600 rounded-md cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-extrabold text-xs px-1 text-gray-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-[#2E7D32] rounded-md cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer"
                        title="حذف الصنف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Customer Selection */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>تحديد العميل</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedCustomerId}
                    onChange={e => {
                      setSelectedCustomerId(e.target.value);
                      if (e.target.value) setCustomCustomerName('');
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                  >
                    <option value="">-- عميل جديد / نقدي --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.remaining_debt > 0 ? `(عليه: ${c.remaining_debt})` : ''}
                      </option>
                    ))}
                  </select>

                  {!selectedCustomerId && (
                    <input
                      type="text"
                      placeholder="اسم العميل (اختياري)..."
                      value={customCustomerName}
                      onChange={e => setCustomCustomerName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                    />
                  )}
                </div>
              </div>

              {/* Payment Type Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  طريقة الدفع
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('cash')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      paymentType === 'cash'
                        ? 'bg-[#2E7D32] text-white border-[#2E7D32]'
                        : 'bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>دفع نقدي (كاش)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('debt')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      paymentType === 'debt'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>دفع آجل (دين)</span>
                  </button>
                </div>
              </div>

              {/* Discount & Paid Amount Calculation */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-500">الخصم (إن وجد)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discount || ''}
                    onChange={e => setDiscount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-500">
                    {paymentType === 'cash' ? 'المدفوع نقداً' : 'المقدم المستلم'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paidAmount || ''}
                    onChange={e => setPaidAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white font-bold text-[#2E7D32]"
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>المجموع الإجمالي:</span>
                  <span>{subtotal.toFixed(2)} {settings.currency_symbol}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-red-500 font-bold">
                    <span>قيمة الخصم:</span>
                    <span>- {discount.toFixed(2)} {settings.currency_symbol}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-800 pt-1.5">
                  <span>الصافي المطلوب:</span>
                  <span className="text-[#2E7D32] dark:text-[#66BB6A]">{total.toFixed(2)} {settings.currency_symbol}</span>
                </div>
                {paymentType === 'debt' && (
                  <div className="flex justify-between text-xs font-bold text-amber-600 border-t border-gray-200 dark:border-gray-800 pt-1">
                    <span>المتبقي الآجل للدين:</span>
                    <span>{remaining.toFixed(2)} {settings.currency_symbol}</span>
                  </div>
                )}
              </div>

              {/* Complete Sale Button */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleCheckout}
                className="w-full py-3 bg-[#2E7D32] hover:bg-[#256628] active:scale-[0.99] text-white font-black text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" />
                <span>حفظ وطباعة الفاتورة الحرارية</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Sales History View */
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
              سجل الفواتير الصادرة
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">رقم الفاتورة</th>
                  <th className="py-3 px-4">اسم العميل</th>
                  <th className="py-3 px-4">نوع الدفع</th>
                  <th className="py-3 px-4">الإجمالي</th>
                  <th className="py-3 px-4">الربح</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4 text-center">إيصال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {salesHistory.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-zinc-900/60">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">
                      {sale.invoice_number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">
                      {sale.customer_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sale.payment_type === 'cash'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sale.payment_type === 'cash' ? 'نقدي' : 'آجل'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-[#2E7D32]">
                      {sale.total.toFixed(2)} {settings.currency_symbol}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      + {sale.profit.toFixed(2)} {settings.currency_symbol}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(sale.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onShowReceipt(sale)}
                        className="p-1.5 text-gray-500 hover:text-[#2E7D32] rounded-lg cursor-pointer"
                        title="طباعة الإيصال"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
