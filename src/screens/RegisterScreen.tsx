import React, { useState } from 'react';
import {
  User,
  Store,
  Phone,
  Lock,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Laptop,
  Smartphone,
  Home
} from 'lucide-react';
import { TRADE_CATEGORIES } from '../data/tradeCategories';
import { api } from '../services/api';
import { db } from '../services/db';
import { UserAccount } from '../types';

interface RegisterScreenProps {
  onSuccess: (user: UserAccount) => void;
  onNavigateToLogin: () => void;
  onNavigateToHome?: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onSuccess,
  onNavigateToLogin,
  onNavigateToHome
}) => {
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedTrade, setSelectedTrade] = useState('');
  const [customTrade, setCustomTrade] = useState('');
  const [tradeSearch, setTradeSearch] = useState('');
  const [isTradeDropdownOpen, setIsTradeDropdownOpen] = useState(false);
  const [deviceType, setDeviceType] = useState(
    typeof window !== 'undefined' && navigator.userAgent.includes('Windows')
      ? 'Windows Desktop'
      : typeof window !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent)
      ? 'Android Mobile'
      : 'Windows Desktop'
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter trade categories based on search input
  const filteredCategories = TRADE_CATEGORIES.filter(cat =>
    cat.name.includes(tradeSearch) || cat.group.includes(tradeSearch)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!fullName.trim() || fullName.trim().split(/\s+/).length < 2) {
      setError('يرجى كتابة الاسم الثلاثي بالكامل.');
      return;
    }

    if (!shopName.trim()) {
      setError('يرجى إدخال اسم المحل أو النشاط التجاري.');
      return;
    }

    if (!phone.trim() || phone.trim().length < 8) {
      setError('يرجى إدخال رقم هاتف صالح.');
      return;
    }

    if (!password || password.length < 6) {
      setError('كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام.');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين، يرجى إعادة التأكد.');
      return;
    }

    if (!selectedTrade) {
      setError('يرجى اختيار نوع النشاط التجاري من القائمة.');
      return;
    }

    if (selectedTrade === 'أخرى' && !customTrade.trim()) {
      setError('يرجى كتابة نوع النشاط التجاري الخاص بك.');
      return;
    }

    setLoading(true);

    try {
      const finalTradeName = selectedTrade === 'أخرى' ? `أخرى: ${customTrade.trim()}` : selectedTrade;

      // Online registration to sync with Owner's Admin Control Panel
      const res = await api.register({
        fullName: fullName.trim(),
        shopName: shopName.trim(),
        phone: phone.trim(),
        password: password,
        tradeType: finalTradeName,
        customTrade: customTrade.trim(),
        deviceType: deviceType,
        osDetails: navigator.userAgent
      });

      const userAccount: UserAccount = {
        id: res.user.id,
        fullName: res.user.fullName,
        shopName: res.user.shopName,
        phone: res.user.phone,
        password: password,
        tradeType: res.user.tradeType,
        customTrade: res.user.customTrade,
        deviceType: deviceType,
        registeredAt: new Date().toISOString(),
        isLoggedIn: true
      };

      // Save locally with pending license (strictly locked until approved by admin)
      db.saveUser(userAccount);
      db.saveLicense({
        isValid: false,
        isExpired: true,
        durationDays: 0,
        expiresAt: 0,
        status: 'pending',
        phone: userAccount.phone
      } as any);
      db.saveSettings({
        shop_name: shopName.trim(),
        owner_name: fullName.trim(),
        phone: phone.trim()
      });

      onSuccess(userAccount);
    } catch (err: any) {
      setError(err.message || 'تعذر تسجيل الحساب، يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#121212] flex items-center justify-center p-4 md:p-6" dir="rtl">
      <div className="max-w-xl w-full bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 space-y-6">
        {/* Top bar with back to home */}
        {onNavigateToHome && (
          <div className="flex justify-start">
            <button
              type="button"
              onClick={onNavigateToHome}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>العودة للرئيسية</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2E7D32] text-white font-black text-2xl shadow-md mb-1">
            ح
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            إنشاء حساب تاجر جديد
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            سجل بيانات محلك التجاري للانضمام إلى منظومة <span className="font-bold text-[#2E7D32] dark:text-[#66BB6A]">ايدينيا - حِسبة</span>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 flex items-center gap-3 text-red-700 dark:text-red-300 text-xs font-semibold animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                الاسم الثلاثي للمالك <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمد علي"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-2.5 text-xs md:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2E7D32]"
                />
              </div>
            </div>

            {/* Shop Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                اسم المحل أو النشاط <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Store className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="مثال: سوبر ماركت البركة"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-2.5 text-xs md:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2E7D32]"
                />
              </div>
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              رقم الهاتف (للتواصل والدخول) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                required
                dir="ltr"
                placeholder="01012345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full pr-10 pl-3.5 py-2.5 text-xs md:text-sm text-right rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2E7D32]"
              />
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-2.5 text-xs md:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2E7D32]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                تأكيد كلمة المرور <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-2.5 text-xs md:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2E7D32]"
                />
              </div>
            </div>
          </div>

          {/* Trade Category Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              نوع النشاط التجاري <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTradeDropdownOpen(!isTradeDropdownOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs md:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white text-right cursor-pointer"
              >
                <span>{selectedTrade || 'اضغط لاختيار نوع النشاط التجاري...'}</span>
                <Search className="w-4 h-4 text-gray-400" />
              </button>

              {isTradeDropdownOpen && (
                <div className="absolute top-full right-0 left-0 mt-1.5 z-40 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2 max-h-60 overflow-y-auto">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="ابحث في أكثر من 50 نشاطاً تجارياً..."
                      value={tradeSearch}
                      onChange={e => setTradeSearch(e.target.value)}
                      className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-hidden"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    {filteredCategories.map(cat => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          setSelectedTrade(cat.id === 'other' ? 'أخرى' : cat.name);
                          setIsTradeDropdownOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                          selectedTrade === cat.name || (cat.id === 'other' && selectedTrade === 'أخرى')
                            ? 'bg-[#2E7D32] text-white font-bold'
                            : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span className="text-[10px] opacity-70">{cat.group}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Trade manual field if "أخرى" selected */}
            {selectedTrade === 'أخرى' && (
              <div className="pt-2 animate-in fade-in duration-200">
                <input
                  type="text"
                  required
                  placeholder="اكتب نوع نشاطك التجاري هنا..."
                  value={customTrade}
                  onChange={e => setCustomTrade(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 text-gray-900 dark:text-white focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Device Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              نوع الجهاز الأساسي
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeviceType('Windows Desktop')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  deviceType === 'Windows Desktop'
                    ? 'border-[#2E7D32] bg-emerald-50 dark:bg-emerald-950/40 text-[#2E7D32] dark:text-[#66BB6A]'
                    : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>كمبيوتر (Windows)</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceType('Android Mobile')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  deviceType === 'Android Mobile'
                    ? 'border-[#2E7D32] bg-emerald-50 dark:bg-emerald-950/40 text-[#2E7D32] dark:text-[#66BB6A]'
                    : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>هاتف (Android)</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[#2E7D32] hover:bg-[#256628] active:scale-[0.99] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>إنشاء الحساب والتفعيل</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer / Login Link */}
        <div className="text-center pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            لديك حساب مسجل بالفعل؟{' '}
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="font-bold text-[#2E7D32] dark:text-[#66BB6A] hover:underline cursor-pointer mr-1"
            >
              تسجيل الدخول
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
