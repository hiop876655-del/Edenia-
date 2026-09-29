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
import { SmartVoidModal } from '../components/SmartVoidModal';
import { StationPairingCard } from '../components/StationPairingCard';

interface SalesScreenProps {
  onShowReceipt: (sale: Sale) => void;
}

export const SalesScreen: React.FC<SalesScreenProps> = ({ onShowReceipt }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [saleToVoid, setSaleToVoid] = useState<Sale | null>(null);

  // POS Station ID (e.g. POS-1, POS-2) for dedicated phone camera pairing
  const [stationId, setStationId] = useState<string>(() => {
    return localStorage.getItem('idenia_pos_station_id') || 'POS-1';
  });

  const handleStationChange = (newStationId: string) => {
    setStationId(newStationId);
    localStorage.setItem('idenia_pos_station_id', newStationId);
  };

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
    const handleDbChanged = () => loadData();
    window.addEventListener('idenia_db_changed', handleDbChanged);
    return () => window.removeEventListener('idenia_db_changed', handleDbChanged);
  }, []);

  // Listen for barcode scan events from external scanners, camera cashier screen, or other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'idenia_last_scanned_barcode_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.barcode) {
            if (parsed.mode === 'sale') {
              handleBarcodeDetected(parsed.barcode);
            } else if (parsed.mode === 'return') {
              handleBarcodeReturn(parsed.barcode);
            }
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [products]);

  // Audio Beep
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, it) => sum + it.total_price, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const remaining = Math.max(0, total - (Number(paidAmount) || 0));

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const currentCustDebt = selectedCustomer ? (selectedCustomer.remaining_debt || 0) : 0;

  // Payment type switch handlers:
  // When cash: auto-set paid amount to total invoice
  // When debt: auto-set paid amount (downpayment) to 0!
  const handleSelectPaymentType = (type: 'cash' | 'debt') => {
    setPaymentType(type);
    if (type === 'cash') {
      setPaidAmount(total);
    } else {
      setPaidAmount(0); // For debt: downpayment starts at 0!
    }
  };

  // Keep cash paid amount in sync with total when total changes in cash mode
  useEffect(() => {
    if (paymentType === 'cash') {
      setPaidAmount(total);
    }
  }, [total]);

  const addToCart = (product: Product, playAudio = false) => {
    if (product.quantity <= 0) {
      setErrorMessage(`عفواً، لقد نفد مخزون الصنف (${product.name}) بالكامل من المخزن (الكمية: 0)!`);
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }

    if (playAudio) playBeep();

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

  // Handler for Barcode Detection from Scanner or Search
  const handleBarcodeDetected = (scannedCode: string) => {
    const clean = scannedCode.trim();
    if (!clean) return;

    const found = products.find(p => p.barcode && p.barcode.trim().toLowerCase() === clean.toLowerCase());
    if (found) {
      addToCart(found, true);
      setSuccessMessage(`تم التقاط الصنف وإضافته للفاتورة: ${found.name}`);
      setTimeout(() => setSuccessMessage(null), 2500);
    } else {
      setErrorMessage(`لم يتم العثور على منتج مسجل بالباركود (${clean}) في المخزن.`);
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  // Handler for Barcode Return / Restock from Phone Camera or Scanner
  const handleBarcodeReturn = (scannedCode: string) => {
    const clean = scannedCode.trim();
    if (!clean) return;

    const allProds = db.getProducts();
    const found = allProds.find(p => p.barcode && p.barcode.trim().toLowerCase() === clean.toLowerCase());
    if (found) {
      // 1. Refresh products list
      loadData();
      playBeep();

      // 2. If this item is currently in the active cart, decrease it by 1 or remove it
      setCart(prev => {
        const inCart = prev.find(it => it.product_id === found.id);
        if (inCart) {
          if (inCart.quantity <= 1) {
            return prev.filter(it => it.product_id !== found.id);
          }
          return prev.map(it =>
            it.product_id === found.id
              ? {
                  ...it,
                  quantity: it.quantity - 1,
                  total_price: (it.quantity - 1) * it.selling_price,
                  profit: (it.quantity - 1) * (it.selling_price - it.purchase_price)
                }
              : it
          );
        }
        return prev;
      });

      setSuccessMessage(`🔄 استرجاع: تم استرجاع صنف (${found.name}) وإعادته إلى رصيد المخزن بنجاح!`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } else {
      setErrorMessage(`وصل طلب استرجاع لصنف غير مسجل بالباركود: ${clean}`);
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  // Auto-detect barcode entered directly into search box
  useEffect(() => {
    const trimmed = productSearch.trim();
    if (trimmed && trimmed.length >= 4) {
      const match = products.find(p => p.barcode && p.barcode.trim().toLowerCase() === trimmed.toLowerCase());
      if (match) {
        addToCart(match, true);
        setProductSearch('');
        setSuccessMessage(`تم التقاط وإضافة الصنف بالباركود: ${match.name}`);
        setTimeout(() => setSuccessMessage(null), 2500);
      }
    }
  }, [productSearch, products]);

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
            <div className="bg-white dark:bg-[#1E1E1E] p-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="ابحث باسم المنتج، الصنف، أو اكتب / امسح الباركود..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full text-xs bg-transparent border-none focus:outline-hidden text-gray-900 dark:text-white"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer px-1.5"
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
                    onClick={() => {
                      if (isOutOfStock) {
                        setErrorMessage(`عفواً، لقد نفد مخزون الصنف (${prod.name}) بالكامل من المخزن (0)!`);
                        setTimeout(() => setErrorMessage(null), 3000);
                      } else {
                        addToCart(prod, true);
                      }
                    }}
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
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-gray-400">{prod.category}</span>
                        {prod.barcode && (
                          <span className="font-mono bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 px-1 py-0.5 rounded text-[9px] font-semibold border border-gray-200 dark:border-zinc-700">
                            #{prod.barcode}
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs text-gray-900 dark:text-white line-clamp-2">
                        {prod.name}
                      </h4>
                    </div>

                    <div className="pt-2.5 flex items-center justify-between border-t border-gray-100 dark:border-gray-800/80 mt-2">
                      <div className="font-black text-xs text-[#2E7D32] dark:text-[#66BB6A]">
                        {prod.selling_price.toFixed(2)} {settings.currency_symbol}
                      </div>

                      <div className="text-[10px]">
                        {isOutOfStock ? (
                          <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-extrabold text-[9px]">
                            نفد المخزون (0)
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            المتاح: <strong className="text-gray-900 dark:text-white font-black">{prod.quantity}</strong>
                          </span>
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#2E7D32]" />
                    <span>تحديد العميل</span>
                  </label>
                  {selectedCustomerId && currentCustDebt > 0 && (
                    <span className="text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                      حسابه السابق: {currentCustDebt.toFixed(2)} {settings.currency_symbol}
                    </span>
                  )}
                </div>

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
                    onClick={() => handleSelectPaymentType('cash')}
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
                    onClick={() => handleSelectPaymentType('debt')}
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
                    value={paidAmount}
                    onChange={e => setPaidAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white font-bold text-[#2E7D32]"
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3.5 bg-gray-50 dark:bg-zinc-900 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>المجموع الإجمالي للأصناف:</span>
                  <span className="font-bold">{subtotal.toFixed(2)} {settings.currency_symbol}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-red-500 font-bold">
                    <span>قيمة الخصم:</span>
                    <span>- {discount.toFixed(2)} {settings.currency_symbol}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-800 pt-1.5">
                  <span>صافي الفاتورة الحالية:</span>
                  <span className="text-[#2E7D32] dark:text-[#66BB6A]">{total.toFixed(2)} {settings.currency_symbol}</span>
                </div>

                {/* Smart Customer Account Analysis */}
                {selectedCustomerId && currentCustDebt > 0 && (
                  <div className="flex justify-between text-amber-700 dark:text-amber-400 font-bold bg-amber-50/70 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                    <span>حساب العميل السابق:</span>
                    <span>{currentCustDebt.toFixed(2)} {settings.currency_symbol}</span>
                  </div>
                )}

                {paidAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                    <span>المبلغ المستلم الآن:</span>
                    <span>{paidAmount.toFixed(2)} {settings.currency_symbol}</span>
                  </div>
                )}

                {paidAmount < total ? (
                  <div className="flex justify-between text-xs font-bold text-amber-600 dark:text-amber-400 border-t border-gray-200 dark:border-gray-800 pt-1">
                    <span>يُضاف لدين العميل (متبقي الفاتورة):</span>
                    <span>+ {(total - paidAmount).toFixed(2)} {settings.currency_symbol}</span>
                  </div>
                ) : paidAmount > total ? (
                  <div className="flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 border-t border-gray-200 dark:border-gray-800 pt-1">
                    <span>يُخصم من الدين القديم (فائض نقدية):</span>
                    <span>- {(paidAmount - total).toFixed(2)} {settings.currency_symbol}</span>
                  </div>
                ) : null}

                {selectedCustomerId && (
                  <div className="flex justify-between font-extrabold text-xs pt-1.5 border-t border-dashed border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                    <span>إجمالي حساب العميل النهائي:</span>
                    <span className={(currentCustDebt + Math.max(0, total - paidAmount) - Math.max(0, paidAmount - total)) > 0 ? 'text-red-600 dark:text-red-400 font-black' : 'text-emerald-600 font-black'}>
                      {Math.max(0, currentCustDebt + Math.max(0, total - paidAmount) - Math.max(0, paidAmount - total)).toFixed(2)} {settings.currency_symbol}
                    </span>
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

            {/* Dedicated Station Barcode Phone Pairing Box */}
            <StationPairingCard
              stationId={stationId}
              onStationIdChange={handleStationChange}
              merchantPhone={db.getUser()?.phone || ''}
              onBarcodeReceived={(barcode, mode) => {
                if (mode === 'sale') {
                  handleBarcodeDetected(barcode);
                } else if (mode === 'return') {
                  handleBarcodeReturn(barcode);
                }
              }}
            />
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
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onShowReceipt(sale)}
                          className="p-1.5 text-gray-500 hover:text-[#2E7D32] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer transition-colors"
                          title="عرض وطباعة الإيصال الحراري"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const hasCompoundActions = Boolean(
                              (sale.paid_towards_previous_debt && sale.paid_towards_previous_debt > 0) ||
                              (sale.customer_id && sale.payment_type === 'debt' && sale.paid_amount > 0 && sale.remaining_amount > 0) ||
                              (sale.customer_id && sale.paid_amount > sale.total)
                            );

                            if (hasCompoundActions) {
                              setSaleToVoid(sale);
                            } else {
                              const res = db.voidInvoice(sale.id, 'all');
                              if (res.success) {
                                setSuccessMessage(res.message);
                                loadData();
                                setTimeout(() => setSuccessMessage(null), 3500);
                              } else {
                                setErrorMessage(res.message);
                                setTimeout(() => setErrorMessage(null), 3000);
                              }
                            }
                          }}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                          title="إلغاء الفاتورة واسترجاع الأصناف للمخزن"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Smart Void Invoice Modal */}
      <SmartVoidModal
        sale={saleToVoid}
        settings={settings}
        isOpen={!!saleToVoid}
        onClose={() => setSaleToVoid(null)}
        onConfirmVoid={(saleId, mode) => {
          const res = db.voidInvoice(saleId, mode);
          if (res.success) {
            setSuccessMessage(res.message);
            loadData();
            setTimeout(() => setSuccessMessage(null), 3500);
          } else {
            setErrorMessage(res.message);
            setTimeout(() => setErrorMessage(null), 3000);
          }
        }}
      />
    </div>
  );
};
