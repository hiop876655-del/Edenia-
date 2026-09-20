import React, { useState, useEffect } from 'react';
import {
  PackagePlus,
  Search,
  Edit2,
  Trash2,
  Barcode,
  Save,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { db } from '../services/db';
import { Product, ProductUnit, AppSettings } from '../types';
import { PRODUCT_UNITS } from '../data/tradeCategories';
import { ConfirmModal } from '../components/ConfirmModal';

interface ProductsScreenProps {
  editProductItem?: Product | null;
  onClearEditItem?: () => void;
}

export const ProductsScreen: React.FC<ProductsScreenProps> = ({
  editProductItem,
  onClearEditItem
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [search, setSearch] = useState('');

  // Form State
  const [id, setId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('المواد الغذائية والتموين');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(10);
  const [unit, setUnit] = useState<ProductUnit>('قطعة');
  const [barcode, setBarcode] = useState('');
  const [minStockAlert, setMinStockAlert] = useState<number>(5);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

  const loadData = () => {
    setProducts(db.getProducts());
    setSettings(db.getSettings());
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (editProductItem) {
      setId(editProductItem.id);
      setName(editProductItem.name);
      setDescription(editProductItem.description || '');
      setCategory(editProductItem.category);
      setPurchasePrice(editProductItem.purchase_price);
      setSellingPrice(editProductItem.selling_price);
      setQuantity(editProductItem.quantity);
      setUnit(editProductItem.unit);
      setBarcode(editProductItem.barcode || '');
      setMinStockAlert(editProductItem.min_stock_alert || 5);
    }
  }, [editProductItem]);

  const resetForm = () => {
    setId(undefined);
    setName('');
    setDescription('');
    setCategory('المواد الغذائية والتموين');
    setPurchasePrice(0);
    setSellingPrice(0);
    setQuantity(10);
    setUnit('قطعة');
    setBarcode('');
    setMinStockAlert(5);
    if (onClearEditItem) onClearEditItem();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    db.saveProduct({
      id,
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      purchase_price: Number(purchasePrice) || 0,
      selling_price: Number(sellingPrice) || 0,
      quantity: Number(quantity) || 0,
      unit: unit,
      barcode: barcode.trim(),
      min_stock_alert: Number(minStockAlert) || 5
    });

    setSuccessMsg(id ? 'تم تحديث بيانات المنتج بنجاح!' : 'تمت إضافة المنتج الجديد بنجاح إلى المخزن!');
    setTimeout(() => setSuccessMsg(null), 3000);

    resetForm();
    loadData();
  };

  const generateRandomBarcode = () => {
    const code = '622' + Math.floor(100000000 + Math.random() * 900000000);
    setBarcode(code);
  };

  const handleDeleteConfirm = () => {
    if (deleteProductId) {
      db.deleteProduct(deleteProductId);
      setDeleteProductId(null);
      loadData();
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.includes(search) || (p.barcode && p.barcode.includes(search)) || p.category.includes(search)
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto select-none" dir="rtl">
      {/* Title */}
      <div className="flex items-center justify-between bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#2E7D32] text-white flex items-center justify-center">
            <PackagePlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
              بطاقة المنتجات والأصناف
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              إضافة وتعديل بيانات المنتجات، الأسعار، الوحدات المتعددة، والباركود
            </p>
          </div>
        </div>

        {id && (
          <button
            onClick={resetForm}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إلغاء التعديل والبدء بمنتج جديد</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Top Form (Add/Edit) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <h2 className="font-extrabold text-base text-gray-900 dark:text-white">
              {id ? 'تعديل بيانات المنتج' : 'إضافة صنف جديد'}
            </h2>
            <span className="text-[11px] font-bold text-[#2E7D32] dark:text-[#66BB6A] bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
              {id ? 'وضع التعديل' : 'صنف جديد'}
            </span>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-pulse">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* Product Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                اسم المنتج / الصنف <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: شاي كيني ممتاز 250 جم"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs md:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2E7D32]"
              />
            </div>

            {/* Category & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  التصنيف / القسم
                </label>
                <input
                  type="text"
                  placeholder="المواد الغذائية"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  وحدة القياس / البيع
                </label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value as ProductUnit)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden"
                >
                  {PRODUCT_UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  سعر الشراء (التكلفة)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="0.00"
                  value={purchasePrice || ''}
                  onChange={e => setPurchasePrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  سعر البيع للجمهور
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="0.00"
                  value={sellingPrice || ''}
                  onChange={e => setSellingPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Profit Margin Preview */}
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-xs flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">هامش الربح المتوقع للوحدة:</span>
              <span className="font-extrabold text-[#2E7D32] dark:text-[#66BB6A]">
                {(sellingPrice - purchasePrice).toFixed(2)} {settings.currency_symbol}
              </span>
            </div>

            {/* Quantity & Stock Alert */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  الكمية الأولية بالمخزن
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  حد التنبيه عند النقصان
                </label>
                <input
                  type="number"
                  step="any"
                  value={minStockAlert}
                  onChange={e => setMinStockAlert(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Barcode */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  الباركود (Barcode)
                </label>
                <button
                  type="button"
                  onClick={generateRandomBarcode}
                  className="text-[11px] font-bold text-[#2E7D32] dark:text-[#66BB6A] hover:underline cursor-pointer"
                >
                  توليد باركود تلقائي
                </button>
              </div>
              <div className="relative">
                <Barcode className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="أدخل الباركود أو امسحه بالماسح"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-2 text-xs font-mono rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#2E7D32] hover:bg-[#256628] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{id ? 'حفظ التعديلات' : 'إضافة المنتج للمخزن'}</span>
            </button>
          </form>
        </div>

        {/* Right / Bottom List */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base text-gray-900 dark:text-white">
              قائمة المنتجات المسجلة ({filteredProducts.length})
            </h2>
            <div className="relative w-48 sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[550px] overflow-y-auto pr-1">
            {filteredProducts.map(p => (
              <div
                key={p.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-zinc-900/50 px-2 rounded-xl transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-gray-900 dark:text-white">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span>{p.category}</span>
                    <span>•</span>
                    <span>الكمية: <strong className="text-gray-800 dark:text-gray-200">{p.quantity} {p.unit}</strong></span>
                    <span>•</span>
                    <span>سعر البيع: <strong className="text-[#2E7D32] dark:text-[#66BB6A]">{p.selling_price.toFixed(2)} {settings.currency_symbol}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setId(p.id);
                      setName(p.name);
                      setDescription(p.description || '');
                      setCategory(p.category);
                      setPurchasePrice(p.purchase_price);
                      setSellingPrice(p.selling_price);
                      setQuantity(p.quantity);
                      setUnit(p.unit);
                      setBarcode(p.barcode || '');
                      setMinStockAlert(p.min_stock_alert || 5);
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                    title="تعديل"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteProductId(p.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteProductId}
        title="حذف الصنف"
        message="هل تريد بالتأكيد حذف هذا الصنف من قاعدة البيانات؟"
        confirmText="نعم، احذف"
        cancelText="إلغاء"
        danger={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteProductId(null)}
      />
    </div>
  );
};
