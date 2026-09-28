import React, { useState, useEffect } from 'react';
import {
  X,
  Crown,
  Camera,
  Smartphone,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { UserAccount } from '../types';
import { api } from '../services/api';
import { db } from '../services/db';

interface CameraUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  onUnlocked?: () => void;
}

export const CameraUpgradeModal: React.FC<CameraUpgradeModalProps> = ({
  isOpen,
  onClose,
  user,
  onUnlocked = () => {}
}) => {
  const [checking, setChecking] = useState(false);
  const [unlockedNotice, setUnlockedNotice] = useState(false);

  // Check if camera feature is already active on open
  useEffect(() => {
    if (!isOpen || !user?.phone) return;
    const isCamActive = Boolean(
      user.role === 'admin' ||
      user.phone === '01121097822' ||
      (user.cameraFeatureEnabled && (!user.cameraFeatureExpiresAt || user.cameraFeatureExpiresAt === 0 || user.cameraFeatureExpiresAt > Date.now()))
    );

    if (isCamActive) {
      setUnlockedNotice(true);
      const timer = setTimeout(() => {
        onUnlocked();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleManualCheck = async () => {
    if (!user?.phone) return;
    setChecking(true);
    try {
      const statusRes: any = await api.checkMerchantStatus(user.phone);
      if (statusRes && statusRes.cameraFeatureEnabled) {
        const isCamActive = Boolean(
          statusRes.cameraFeatureEnabled &&
          (!statusRes.cameraFeatureExpiresAt || statusRes.cameraFeatureExpiresAt === 0 || statusRes.cameraFeatureExpiresAt > Date.now())
        );

        if (isCamActive) {
          const updatedUser = {
            ...user,
            cameraFeatureEnabled: true,
            cameraFeatureExpiresAt: statusRes.cameraFeatureExpiresAt || 0
          };
          db.saveUser(updatedUser);
          setUnlockedNotice(true);
          setTimeout(() => {
            onUnlocked();
          }, 800);
          return;
        }
      }
      alert('الميزة لم يتم تفعيلها بعد من قبل الإدارة. يرجى التواصل مع الإدارة للتفعيل.');
    } catch {
      alert('تعذر التحقق من التفعيل، تأكد من الاتصال بالإنترنت.');
    } finally {
      setChecking(false);
    }
  };

  const adminPhone = '01121097822';
  const whatsappUrl = `https://wa.me/201121097822?text=${encodeURIComponent(
    `السلام عليكم يا بشمهندس خالد، أرغب في ترقية وتفعيل ميزة (كاميرا هاتف الكاشير اللاسلكية الذكية) لحسابي في إيدينيا:\n- اسم التاجر: ${
      user?.fullName || 'تاجر'
    }\n- اسم المحل: ${user?.shopName || 'المحل'}\n- رقم الهاتف: ${
      user?.phone || ''
    }`
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
      dir="rtl"
    >
      <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-amber-200 dark:border-amber-900/60 relative overflow-hidden space-y-6">
        {/* Top Decorative Background Glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ميزة احترافية خاصة (VIP)</span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white mt-0.5">
                قارئ باركود الكاميرا اللاسلكي
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {unlockedNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 animate-in zoom-in-95">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="font-black text-sm">تم فتح وتفعيل الميزة لحسابك بنجاح!</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300">جاري فتح كاميرا الكاشير فوراً...</div>
            </div>
          </div>
        )}

        {/* Feature Overview & Description */}
        <div className="space-y-3 relative z-10 text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <p className="font-semibold text-gray-800 dark:text-gray-200">
            حوّل أي هاتف ذكي في يدك إلى ماسح باركود لاسلكي فائق الدقة، متصل مباشرة وفورياً مع جهاز الكمبيوتر ومنظومة الكاشير في محلك دون أي أسلاك أو أجهزة إضافية!
          </p>

          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
            <h4 className="font-black text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>أهم إمكانيات ميزة كاميرا الهاتف الذكية:</span>
            </h4>

            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>وضع البيع الذكي:</strong> تصوير باركود أي سلعة بالهاتف يخصمها فوراً من رصيد المخزن ويدرجها في فاتورة الكاشير على الكمبيوتر مع صفارة تأكيد لحظية.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>وضع الاسترجاع الفوري:</strong> عند استرجاع سلعة من عميل، مجرد تصوير الباركود يزيد رصيد المخزن فورياً من 48 إلى 49 دون الحاجة للدخول وتعديل الأصناف يدوياً.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>واجهة كاميرا نقية وسريعة:</strong> شاشة كاملة عالية الدقة خالية من أي مشتتات مصممة خصيصاً للعمل الشاق داخل المحلات والسوبرماركت.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* WhatsApp Call to Action & Check Buttons */}
        <div className="pt-2 space-y-2.5 relative z-10">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-xs md:text-sm rounded-2xl shadow-lg shadow-emerald-700/25 active:scale-[0.99] transition-all cursor-pointer"
          >
            <MessageSquare className="w-5 h-5" />
            <span>طلب فتح وترقية الميزة عبر واتساب ({adminPhone})</span>
          </a>

          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-2xl border border-gray-200 dark:border-zinc-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'جاري التحقق من السحابة...' : 'التحقق من حالة تفعيل الميزة الآن'}</span>
          </button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>يتم التفعيل والتسليم الفوري من قبل الإدارة بعد التواصل</span>
          </div>
        </div>
      </div>
    </div>
  );
};
