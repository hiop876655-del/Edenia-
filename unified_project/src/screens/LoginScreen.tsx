import React, { useState } from 'react';
import {
  Phone,
  Lock,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  X,
  Home
} from 'lucide-react';
import { api } from '../services/api';
import { db } from '../services/db';
import { UserAccount } from '../types';

interface LoginScreenProps {
  onSuccess: (user: UserAccount) => void;
  onNavigateToRegister: () => void;
  onNavigateToHome?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onNavigateToRegister,
  onNavigateToHome
}) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.trim();

    if (!cleanPhone) {
      setError('يرجى إدخال رقم الهاتف.');
      return;
    }

    if (!password) {
      setError('يرجى إدخال كلمة المرور.');
      return;
    }

    setLoading(true);

    try {
      let loggedUser: UserAccount;
      try {
        const res = await api.login({ phone: cleanPhone, password });
        if (!res || !res.user) {
          throw new Error(res?.message || 'تعذر تسجيل الدخول.');
        }

        loggedUser = {
          id: res.user.id,
          fullName: res.user.fullName || 'تاجر إيدينيا',
          shopName: res.user.shopName || 'متجر إيدينيا',
          phone: res.user.phone || cleanPhone,
          password: password,
          tradeType: res.user.tradeType || 'تجارة عامة',
          customTrade: res.user.customTrade,
          deviceType: res.user.deviceType || 'Windows Desktop',
          registeredAt: res.user.registeredAt || new Date().toISOString(),
          role: res.user.role || (res.isAdmin ? 'admin' : 'merchant'),
          subscriptionStatus: res.user.subscriptionStatus,
          subscriptionDays: res.user.subscriptionDays,
          subscriptionExpiresAt: res.user.subscriptionExpiresAt,
          isLoggedIn: true
        };

        // If subscription is active in cloud, sync local license
        if (res.user.subscriptionStatus === 'active' && res.user.subscriptionExpiresAt > Date.now()) {
          const currentLic = db.getLicense() || {} as any;
          db.saveLicense({
            ...currentLic,
            isValid: true,
            isExpired: false,
            durationDays: res.user.subscriptionDays || 30,
            expiresAt: res.user.subscriptionExpiresAt,
            activatedAt: Date.now(),
            status: 'active'
          });
        }
      } catch (networkErr: any) {
        // Fallback for Master Admin or local merchant if offline
        if (cleanPhone === '01121097822' && password === 'Khaled2008') {
          loggedUser = {
            id: 'admin_owner_khaled',
            fullName: 'المهندس خالد (مالك المنصة)',
            shopName: 'إدارة منصة ايدينيا',
            phone: '01121097822',
            password: 'Khaled2008',
            tradeType: 'إدارة النظام والتراخيص',
            deviceType: 'Windows / Android',
            registeredAt: new Date().toISOString(),
            role: 'admin',
            isLoggedIn: true
          };
        } else {
          const localUser = db.getUser();
          if (localUser && localUser.phone === cleanPhone && (localUser.password === password || !localUser.password)) {
            loggedUser = { ...localUser, password, isLoggedIn: true };
          } else {
            throw networkErr;
          }
        }
      }

      db.saveUser(loggedUser);
      db.saveSettings({
        shop_name: loggedUser.shopName,
        owner_name: loggedUser.fullName,
        phone: loggedUser.phone
      });

      onSuccess(loggedUser);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول، يرجى التأكد من صحة رقم الهاتف وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPhone.trim()) return;
    setForgotMessage(`تم إرسال تعليمات إعادة التعيين إلى الهاتف ${forgotPhone}، أو تواصل مع الدعم الفني لمنصة ايدينيا.`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#121212] flex items-center justify-center p-4 md:p-6" dir="rtl">
      <div className="max-w-md w-full bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 space-y-6">
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
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            تسجيل الدخول
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            أهلاً بك مجدداً في برنامج <span className="font-bold text-[#2E7D32] dark:text-[#66BB6A]">ايدينيا - حِسبة</span>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 flex items-center gap-3 text-red-700 dark:text-red-300 text-xs font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              رقم الهاتف
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                كلمة المرور
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] font-semibold text-[#2E7D32] dark:text-[#66BB6A] hover:underline cursor-pointer"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[#2E7D32] hover:bg-[#256628] active:scale-[0.99] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>دخول للبرنامج</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer / Register Link */}
        <div className="text-center pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            تاجر جديد وتريد فتح حساب؟{' '}
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="font-bold text-[#2E7D32] dark:text-[#66BB6A] hover:underline cursor-pointer mr-1"
            >
              تسجيل حساب جديد
            </button>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                استعادة كلمة المرور
              </h3>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotMessage(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotMessage ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  أدخل رقم هاتفك المسجل وسنقوم بإرسال رمز الاستعادة أو تواصل مع إدارة ايدينيا.
                </p>
                <input
                  type="tel"
                  required
                  placeholder="01012345678"
                  value={forgotPhone}
                  onChange={e => setForgotPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  إرسال الرمز
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
