import React, { useState, useEffect } from 'react';
import {
  User,
  Store,
  Phone,
  Briefcase,
  Laptop,
  KeyRound,
  ShieldCheck,
  Calendar,
  Lock,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { db } from '../services/db';
import { licenseManager } from '../services/license';
import { UserAccount, LicenseState } from '../types';

interface AccountScreenProps {
  onRenewLicense: () => void;
  onLogout: () => void;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({
  onRenewLicense,
  onLogout
}) => {
  const [user, setUser] = useState<UserAccount | null>(db.getUser());
  const [license, setLicense] = useState<LicenseState | null>(db.getLicense());
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);

  useEffect(() => {
    setUser(db.getUser());
    setLicense(db.getLicense());
  }, []);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    setPassErr(null);

    if (!user) return;

    if (user.password !== oldPassword) {
      setPassErr('كلمة المرور الحالية غير صحيحة.');
      return;
    }

    if (newPassword.length < 6) {
      setPassErr('كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassErr('كلمتا المرور غير متطابقتين.');
      return;
    }

    const updated = { ...user, password: newPassword };
    db.saveUser(updated);
    setUser(updated);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPassMsg('تم تحديث كلمة المرور بنجاح!');
    setTimeout(() => setPassMsg(null), 3000);
  };

  const remainingDays = license ? licenseManager.getRemainingDays(license) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto select-none" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-[#1E1E1E] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#2E7D32] text-white flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
              بيانات التاجر والترخيص
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              معلومات حساب المتجر، تفاصيل صلاحية الترخيص، وتغيير كلمة المرور
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-bold rounded-2xl transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Merchant Info */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <h2 className="font-extrabold text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
            <Store className="w-4 h-4 text-[#2E7D32]" />
            <span>بيانات حساب التاجر</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">اسم المالك:</span>
              <span className="font-bold text-gray-900 dark:text-white">{user?.fullName || 'غير مسجل'}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">اسم المحل:</span>
              <span className="font-bold text-gray-900 dark:text-white">{user?.shopName || 'غير مسجل'}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">رقم الهاتف:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white" dir="ltr">{user?.phone || 'غير مسجل'}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">نوع النشاط التجاري:</span>
              <span className="font-bold text-[#2E7D32] dark:text-[#66BB6A]">{user?.tradeType || 'عام'}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">نوع الجهاز المسجل:</span>
              <span className="font-bold text-gray-900 dark:text-white">{user?.deviceType || 'Windows Desktop'}</span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-gray-500">تاريخ التسجيل:</span>
              <span className="text-gray-600 dark:text-gray-400">
                {user?.registeredAt ? new Date(user.registeredAt).toLocaleDateString('ar-EG') : 'الآن'}
              </span>
            </div>
          </div>
        </div>

        {/* License Info */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="font-extrabold text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>حالة رخصة البرنامج</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">حالة الاشتراك:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  مفعل ونشط
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">المدة المتبقية:</span>
                <span className={`font-black text-sm ${remainingDays > 5 ? 'text-[#2E7D32] dark:text-[#66BB6A]' : 'text-red-600'}`}>
                  {remainingDays} يوماً
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-gray-500">تاريخ انتهاء الصلاحية:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {license?.expiresAt ? new Date(license.expiresAt).toLocaleDateString('ar-EG') : 'غير محدد'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onRenewLicense}
            className="w-full py-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#2E7D32] dark:text-[#66BB6A] border border-emerald-200 dark:border-emerald-800 text-xs font-bold rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>تجديد الترخيص أو إدخال كود جديد</span>
          </button>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
        <h2 className="font-extrabold text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-600" />
          <span>تغيير كلمة المرور</span>
        </h2>

        {passMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{passMsg}</span>
          </div>
        )}

        {passErr && (
          <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{passErr}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">كلمة المرور الحالية</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">تأكيد كلمة المرور</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              تحديث كلمة المرور
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
