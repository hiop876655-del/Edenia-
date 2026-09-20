import React, { useState } from 'react';
import {
  Store,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  ShieldCheck,
  HardDrive,
  Laptop,
  Smartphone,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  LogIn,
  UserPlus,
  Download
} from 'lucide-react';
import { ScreenType, UserAccount, LicenseState } from '../types';
import { StandalonePackagesModal } from '../components/StandalonePackagesModal';
import { NativeAppsExportModal } from '../components/NativeAppsExportModal';

interface HomeScreenProps {
  user?: UserAccount | null;
  license?: LicenseState | null;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onNavigate?: (screen: ScreenType) => void;
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user = null,
  license = null,
  darkMode = false,
  onToggleDarkMode = () => {},
  onNavigate,
  onNavigateToLogin,
  onNavigateToRegister
}) => {
  const [isPackagesModalOpen, setIsPackagesModalOpen] = useState(false);
  const [isNativeModalOpen, setIsNativeModalOpen] = useState(false);

  const navigate = (screen: ScreenType) => {
    if (screen === 'login' && onNavigateToLogin) {
      onNavigateToLogin();
    } else if (screen === 'register' && onNavigateToRegister) {
      onNavigateToRegister();
    } else if (onNavigate) {
      onNavigate(screen);
    }
  };

  const isMerchantLoggedIn = !!user && user.isLoggedIn;
  const isLicensed = !!license && license.isValid;

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#121212] text-[#212121] dark:text-gray-100 flex flex-col justify-between transition-colors selection:bg-[#2E7D32] selection:text-white" dir="rtl">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#1E1E1E]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2E7D32] text-white font-black text-xl flex items-center justify-center shadow-xs">
              ح
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg md:text-xl text-[#2E7D32] dark:text-[#66BB6A] tracking-tight">
                  ايدينيا - حِسبة
                </span>
                <span className="text-[10px] md:text-[11px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full">
                  النسخة التجارية v1.0
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium hidden sm:block">
                المنصة الرسمية: <strong className="text-gray-700 dark:text-gray-300">ايدينيا</strong>
              </p>
            </div>
          </div>

          {/* Quick Actions & Dark Mode */}
          <div className="flex items-center gap-3">
            {/* Native Source Studio Button */}
            <button
              onClick={() => setIsNativeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تحميل البرامج الأصلية (APK & EXE)</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleDarkMode}
              title={darkMode ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
              className="p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>

            {/* Direct Login or App Access */}
            {isMerchantLoggedIn ? (
              <button
                onClick={() => navigate(isLicensed ? 'dashboard' : 'activation')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <span>الدخول لبرنامج المحل</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate('login')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12 w-full">
        {/* Hero Section */}
        <section className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#2E7D32] dark:text-[#66BB6A] text-xs font-extrabold shadow-2xs">
            <Sparkles className="w-4 h-4" />
            <span>برنامج الحسابات والمخزن التجاري اليدوي بدون تعقيد</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
            إدارة متكاملة لمخزنك ومبيعاتك وديونك في برنامج واحد
          </h1>

          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
            تطبيق تجاري احترافي وسريع صُمم خصيصاً لأصحاب المحلات والأنشطة التجارية في الوطن العربي. إدارة فورية لنقاط البيع، طباعة الفواتير الحرارية، جرد المخزون، ودفتر الديون، ويعمل بكفاءة عالية وبدون الحاجة لإنترنت.
          </p>

          {/* Action Area: Changes dynamically based on merchant logged-in state */}
          {isMerchantLoggedIn ? (
            <div className="pt-4 max-w-lg mx-auto bg-white dark:bg-[#1E1E1E] border-2 border-[#2E7D32] p-5 rounded-3xl shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-right">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-[#2E7D32] flex items-center justify-center font-black">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-gray-900 dark:text-white">
                      {user?.shopName || 'المحل التجاري'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      مرحباً بك: {user?.fullName} ({user?.phone})
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-[#2E7D32] dark:text-[#66BB6A] px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  حساب مسجل ✓
                </span>
              </div>

              <button
                onClick={() => navigate(isLicensed ? 'dashboard' : 'activation')}
                className="w-full py-4 bg-[#2E7D32] hover:bg-[#256628] active:scale-[0.99] text-white font-black text-base rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <span>الدخول إلى برنامج المحل (المخزن ونقاط البيع)</span>
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <button
                onClick={() => navigate('login')}
                className="w-full sm:w-1/2 py-3.5 px-6 bg-[#2E7D32] hover:bg-[#256628] active:scale-[0.99] text-white font-black text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>

              <button
                onClick={() => navigate('register')}
                className="w-full sm:w-1/2 py-3.5 px-6 bg-white dark:bg-[#1E1E1E] hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 font-extrabold text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#2E7D32] dark:text-[#66BB6A]" />
                <span>تسجيل تاجر جديد</span>
              </button>
            </div>
          )}
        </section>

        {/* Feature Grid (Clean 6 Core Capabilities) */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
              كل ما تحتاجه لإدارة نشاطك التجاري بكل دقة
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              واجهات واضحة وأزرار سهلة ونماذج إدخال مباشرة وسريعة
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: POS & Printing */}
            <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xs hover:shadow-xs transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#2E7D32] dark:text-[#66BB6A] flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-gray-900 dark:text-white">
                نقطة البيع وإصدار الفواتير (POS)
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                إصدار فواتير بيع نقدي وآجل، خصومات فورية، قارئ باركود سريع، وطباعة فورية للإيصالات الحرارية قياس 80mm و 57mm.
              </p>
            </div>

            {/* Card 2: Inventory */}
            <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xs hover:shadow-xs transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-gray-900 dark:text-white">
                إدارة المخزن وتنبيهات النواقص
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                إضافة وتصنيف المنتجات، جرد فوري، وتنبيهات ذكية عند وصول أي صنف للحد الأدنى لتجنب نفاد البضائع.
              </p>
            </div>

            {/* Card 3: Debts & Customers */}
            <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xs hover:shadow-xs transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-gray-900 dark:text-white">
                دفتر الديون والعملاء (الشكك)
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                كشف حساب مالي تفصيلي لكل عميل، تسجيل الدفعات الجزئية والمسددة، وتحديث المتبقي آلياً مع كشوفات للطباعة.
              </p>
            </div>

            {/* Card 4: Financial Reports */}
            <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xs hover:shadow-xs transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-gray-900 dark:text-white">
                التقارير المالية وصافي الأرباح
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                تحليل فوري لإجمالي المبيعات، حساب الأرباح الصافية بعد خصم تكلفة الشراء، ورصد الأصناف الأكثر حركة ومبيعاً.
              </p>
            </div>

            {/* Card 5: Anti-Tamper Time Security */}
            <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xs hover:shadow-xs transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-gray-900 dark:text-white">
                حماية التوقيت وتراخيص الاستخدام لمرة واحدة
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                نظام ترخيص مشفر يعتمد على توقيت الخادم الحقيقي، وكل كود مخصص لمرة واحدة فقط ويقفل على حساب المحل.
              </p>
            </div>

            {/* Card 6: Backup & Offline */}
            <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xs hover:shadow-xs transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <HardDrive className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-gray-900 dark:text-white">
                يعمل بدون إنترنت (100% Offline)
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                بعد التسجيل والتفعيل، يعمل التطبيق محلياً بالكامل بدون الحاجة لإنترنت، مع تصدير واسترجاع النسخ الاحتياطية.
              </p>
            </div>
          </div>
        </section>

        {/* Multi-Platform Banner */}
        <section className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-[#1E1E1E] p-6 md:p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2E7D32] text-white text-[10px] font-black">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>تطبيق أصلي مستقل للكمبيوتر والهاتف</span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
              يعمل على أجهزة كمبيوتر Windows وهواتف Android
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 max-w-xl">
              يمكن تثبيت التطبيق مباشرة على سطح المكتب (Windows) وعلى شاشة الهاتف (Android) ليعمل كنافذة برنامج مستقلة بدون متصفح.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <button
              onClick={() => setIsPackagesModalOpen(true)}
              className="flex items-center gap-2 bg-[#2E7D32] hover:bg-[#256628] text-white px-5 py-3 rounded-2xl font-black text-xs shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تحميل وتثبيت البرنامج المستقل</span>
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#1E1E1E] border-t border-gray-200 dark:border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#2E7D32] text-white flex items-center justify-center font-black text-xs">
              ح
            </div>
            <span>
              جميع الحقوق محفوظة © {new Date().getFullYear()} - المنصة الأم: <strong className="text-gray-800 dark:text-gray-200">ايدينيا</strong> | تطبيق <strong className="text-[#2E7D32] dark:text-[#66BB6A]">ايدينيا - حِسبة</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <button onClick={() => navigate('login')} className="hover:text-[#2E7D32] cursor-pointer">
              تسجيل الدخول
            </button>
            <span>•</span>
            <button onClick={() => navigate('register')} className="hover:text-[#2E7D32] cursor-pointer">
              تسجيل تاجر جديد
            </button>
            <span>•</span>
            <button onClick={() => navigate('admin')} className="text-gray-400 hover:text-amber-600 transition-colors cursor-pointer flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>لوحة الإدارة</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Standalone Packages Hub Modal */}
      <StandalonePackagesModal
        isOpen={isPackagesModalOpen}
        onClose={() => setIsPackagesModalOpen(false)}
      />

      {/* 100% Native Studio Modal */}
      <NativeAppsExportModal
        isOpen={isNativeModalOpen}
        onClose={() => setIsNativeModalOpen(false)}
      />
    </div>
  );
};
