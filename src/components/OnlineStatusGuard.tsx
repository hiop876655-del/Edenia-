import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { checkRealInternetConnection } from '../services/network';

interface OnlineStatusGuardProps {
  children: React.ReactNode;
}

export const OnlineStatusGuard: React.FC<OnlineStatusGuardProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [hasCheckedInitially, setHasCheckedInitially] = useState<boolean>(false);

  const verifyConnection = useCallback(async (showLoading = false) => {
    if (showLoading) setIsChecking(true);
    try {
      const online = await checkRealInternetConnection(3000);
      setIsOnline(online);
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
      setHasCheckedInitially(true);
    }
  }, []);

  useEffect(() => {
    verifyConnection(false);

    const handleOnline = () => verifyConnection(false);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic heartbeat check every 25 seconds
    const interval = setInterval(() => {
      verifyConnection(false);
    }, 25000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [verifyConnection]);

  // If connection is lost, show full graceful blocker
  if (hasCheckedInitially && !isOnline) {
    return (
      <div className="fixed inset-0 z-50 bg-[#121212] text-white flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none" dir="rtl">
        <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-900/20">
            <WifiOff className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/40 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>منصة سحابية متزامنة لحظياً</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              يلزم وجود اتصال بالإنترنت
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              تطبيق <strong className="text-emerald-400 font-bold">ايدينيا - حِسبة</strong> يعمل عبر السحابة مباشرة لضمان المزامنة اللحظية الفورية لكافة عمليات البيع وجرد المخزن بين هاتفك وجهاز الكمبيوتر دون أي تأخير أو فقدان للبيانات.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs text-gray-400 text-right space-y-1.5">
            <div className="font-bold text-gray-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>للمتابعة واستئناف العمل:</span>
            </div>
            <p>تأكد من تفعيل شبكة Wi-Fi أو باقة الإنترنت على هاتفك / جهازك.</p>
          </div>

          <button
            onClick={() => verifyConnection(true)}
            disabled={isChecking}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] hover:from-[#17521c] hover:to-[#256629] text-white font-black text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'جاري فحص الاتصال بالإنترنت...' : 'إعادة محاولة الاتصال الآن'}</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
