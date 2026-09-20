import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Minus,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  PackagePlus,
  Check,
  X
} from 'lucide-react';
import { db } from '../services/db';
import { Product, AppSettings } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface InventoryScreenProps {
  onOpenAddProduct: () => void;
  onOpenEditProduct: (product: Product) => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  onOpenAddProduct,
  onOpenEditProduct
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Adjust stock dialog state
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('توريد جديد');

  // Delete product confirm state
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

  const loadData = () => {
    setProducts(db.getProducts());
    setSettings(db.getSettings());
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = ['الكل', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.includes(search) || (p.barcode && p.barcode.includes(search)) || p.category.includes(search);
    const matchesCategory = selectedCategory === 'الكل' || p.category === selectedCategory;
    const isLow = p.quantity <= (p.min_stock_alert || settings.low_stock_threshold);
    const matchesLow = !filterLowStockOnly || isLow;

    return matchesSearch && matchesCategory && matchesLow;
  });

  const totalStockValue = filteredProducts.reduce((sum, p) => sum + (p.purchase_price * p.quantity), 0);
  const totalItemsCount = filteredProducts.reduce((sum, p) => sum + p.quantity, 0);

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;

    db.adjustStockQuantity(adjustModalProduct.id, adjustDelta, adjustReason);
    setAdjustModalProduct(null);
    loadData();
  };

  const handleDeleteConfirm = () => {
    if (deleteProductId) {
      db.deleteProduct(deleteProductId);
      setDeleteProductId(null);
      loadData();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto select-none" dir="rtl">
      {/* Top Bar: Title & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#2E7D32] text-white flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
              إدارة المخزن والمخزون
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              متابعة الكميات، أسعار الشراء والبيع، وحساب قيمة رأس المال المخزن
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-4 py-2 rounded-2xl text-left">
            <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">إجمالي قيمة المخزون</div>
            <div className="text-base font-black text-[#2E7D32] dark:text-[#66BB6A]">
              {totalStockValue.toFixed(2)} {settings.currency_symbol}
            </div>
          </div>

          <button
            onClick={onOpenAddProduct}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold rounded-2xl shadow-xs transition-all cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>صنف جديد</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث باسم الصنف أو الباركود أو التصنيف..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 text-xs md:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2E7D32]"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 focus:outline-hidden"
            >
              {categories.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>

            <button
              onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors shrink-0 cursor-pointer ${
                filterLowStockOnly
                  ? 'bg-red-500 text-white border-red-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              النواقص فقط
            </button>
          </div>
        </div>
      </div>

      {/* Products Inventory Table */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500 text-xs">
            لا توجد أصناف مطابقة للبحث.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">اسم المنتج</th>
                  <th className="py-3 px-4">القسم / التصنيف</th>
                  <th className="py-3 px-4">الكمية الحالية</th>
                  <th className="py-3 px-4">سعر الشراء</th>
                  <th className="py-3 px-4">سعر البيع</th>
                  <th className="py-3 px-4">قيمة الصنف</th>
                  <th className="py-3 px-4">حالة المخزون</th>
                  <th className="py-3 px-4 text-center">إجراءات المخزن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredProducts.map(prod => {
                  const isLow = prod.quantity <= (prod.min_stock_alert || settings.low_stock_threshold);
                  const isOutOfStock = prod.quantity <= 0;
                  const itemStockValue = prod.purchase_price * prod.quantity;

                  return (
                    <tr key={prod.id} className="hover:bg-gray-50 dark:hover:bg-zinc-900/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {prod.name}
                        </div>
                        {prod.barcode && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            باركود: {prod.barcode}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {prod.category}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                          {prod.quantity}
                        </span>{' '}
                        <span className="text-[11px] text-gray-500 font-medium">{prod.unit}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                        {prod.purchase_price.toFixed(2)} {settings.currency_symbol}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                        {prod.selling_price.toFixed(2)} {settings.currency_symbol}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#2E7D32] dark:text-[#66BB6A]">
                        {itemStockValue.toFixed(2)} {settings.currency_symbol}
                      </td>
                      <td className="py-3 px-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                            نفد تماماً
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            منخفض ({prod.quantity})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            متوفر
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick Adjust Quantity Button */}
                          <button
                            onClick={() => {
                              setAdjustModalProduct(prod);
                              setAdjustDelta(1);
                              setAdjustReason('توريد بضاعة جديدة');
                            }}
                            title="تعديل أو زيادة الكمية"
                            className="p-1.5 text-[#2E7D32] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </button>

                          {/* Edit Product */}
                          <button
                            onClick={() => onOpenEditProduct(prod)}
                            title="تعديل بيانات الصنف"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Product */}
                          <button
                            onClick={() => setDeleteProductId(prod.id)}
                            title="حذف الصنف"
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                تعديل كمية المخزن ({adjustModalProduct.name})
              </h3>
              <button
                onClick={() => setAdjustModalProduct(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl text-xs space-y-1">
                <div>الكمية الحالية: <span className="font-bold">{adjustModalProduct.quantity} {adjustModalProduct.unit}</span></div>
                <div>الكمية بعد التعديل: <span className="font-bold text-[#2E7D32] dark:text-[#66BB6A]">{adjustModalProduct.quantity + adjustDelta} {adjustModalProduct.unit}</span></div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  مقدار الزيادة أو النقص
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustDelta(prev => prev - 1)}
                    className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    required
                    value={adjustDelta}
                    onChange={e => setAdjustDelta(Number(e.target.value))}
                    className="w-full text-center py-2 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustDelta(prev => prev + 1)}
                    className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  سبب الحركة
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="مثال: شراء فاتورة جديدة، إتلاف، جرد..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                حفظ التعديل في المخزن
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Product Delete */}
      <ConfirmModal
        isOpen={!!deleteProductId}
        title="حذف المنتج من المخزن"
        message="هل أنت متأكد من حذف هذا المنتج نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="نعم، احذف المنتج"
        cancelText="إلغاء"
        danger={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteProductId(null)}
      />
    </div>
  );
};
