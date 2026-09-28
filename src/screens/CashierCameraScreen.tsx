import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  ArrowRight,
  RotateCcw,
  ShoppingCart,
  PackagePlus,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  PhoneCall,
  Crown,
  Lock
} from 'lucide-react';
import { db } from '../services/db';
import { Product, AppSettings, UserAccount } from '../types';

interface CashierCameraScreenProps {
  onBack: () => void;
  user: UserAccount | null;
  onUpgradeRequest: () => void;
}

export const CashierCameraScreen: React.FC<CashierCameraScreenProps> = ({
  onBack,
  user,
  onUpgradeRequest
}) => {
  // Mode: 'sale' (default active) or 'return' (restock)
  const [mode, setMode] = useState<'sale' | 'return'>('sale');
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());

  // Camera state
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Scan feedback
  const [lastScannedProduct, setLastScannedProduct] = useState<{
    product: Product;
    time: number;
    mode: 'sale' | 'return';
    message: string;
  } | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const lastScannedBarcodeRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);

  const loadData = () => {
    setProducts(db.getProducts());
    setSettings(db.getSettings());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Audio Beep
  const playBeep = (type: 'sale' | 'return' | 'error' = 'sale') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'sale') {
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'return') {
        osc.frequency.setValueAtTime(950, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {}
  };

  // Start native camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('الكاميرا غير مدعومة في هذا المتصفح أو التطبيق.');
      }

      // Constraints optimized for barcode scanning & crystal-clear clarity
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startScannerLoop();
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      // Fallback with basic constraints if full HD fails
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
          setCameraActive(true);
          startScannerLoop();
        }
      } catch (fallbackErr: any) {
        setCameraError(
          fallbackErr.message?.includes('Permission')
            ? 'يرجى السماح للتطبيق بإذن استخدام الكاميرا للتمكن من مسح الباركود.'
            : 'تعذر تشغيل كاميرا الجهاز. تأكد من إعطاء الإذن أو عدم استخدام تطبيق آخر للكاميرا.'
        );
        setCameraActive(false);
      }
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // High-speed barcode detection loop
  const startScannerLoop = () => {
    if (typeof (window as any).BarcodeDetector !== 'undefined') {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: [
          'qr_code',
          'ean_13',
          'ean_8',
          'code_128',
          'code_39',
          'upc_a',
          'upc_e',
          'itf',
          'codabar'
        ]
      });

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw) {
              handleBarcodeScanned(raw);
            }
          }
        } catch {
          // Ignore transient frame detection error
        }
      }, 250);
    }
  };

  // Handle scanned barcode according to active mode ('sale' or 'return')
  const handleBarcodeScanned = (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    const now = Date.now();
    // Debounce duplicate scans within 1.5 seconds unless different barcode
    if (lastScannedBarcodeRef.current === clean && now - lastScanTimestampRef.current < 1500) {
      return;
    }

    lastScannedBarcodeRef.current = clean;
    lastScanTimestampRef.current = now;

    // Refresh products list to ensure up-to-date quantities
    const currentProducts = db.getProducts();
    const targetProduct = currentProducts.find(
      p => p.barcode && p.barcode.trim().toLowerCase() === clean.toLowerCase()
    );

    if (!targetProduct) {
      playBeep('error');
      setLastScannedProduct({
        product: {
          id: '',
          name: `باركود غير مسجل: ${clean}`,
          description: '',
          category: 'غير معروف',
          purchase_price: 0,
          selling_price: 0,
          quantity: 0,
          unit: 'قطعة',
          barcode: clean,
          created_at: '',
          updated_at: ''
        },
        time: now,
        mode,
        message: 'الصنف غير مسجل في المخزن! يرجى إضافته أولاً من قسم المنتجات.'
      });
      return;
    }

    if (mode === 'sale') {
      // 1. SALE MODE:
      // Deduct 1 from inventory stock and broadcast to POS cart / invoice
      if (targetProduct.quantity <= 0) {
        playBeep('error');
        setLastScannedProduct({
          product: targetProduct,
          time: now,
          mode: 'sale',
          message: `نفد المخزون! رصيد (${targetProduct.name}) في المخزن هو (0).`
        });
        return;
      }

      // Deduct from stock
      db.adjustStock(
        targetProduct.id,
        -1,
        `خصم تلقائي - كاميرا الكاشير المحمولة (${targetProduct.name})`
      );

      playBeep('sale');
      setScanCount(prev => prev + 1);

      // Broadcast event across device, tabs, and network POS sessions
      try {
        const eventPayload = {
          type: 'BARCODE_SCANNED',
          barcode: clean,
          product_id: targetProduct.id,
          product_name: targetProduct.name,
          mode: 'sale',
          time: now
        };
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('idenia_pos_barcode_sync');
          bc.postMessage(eventPayload);
          bc.close();
        }
        localStorage.setItem(
          'idenia_last_scanned_barcode_event',
          JSON.stringify(eventPayload)
        );
      } catch {}

      setLastScannedProduct({
        product: targetProduct,
        time: now,
        mode: 'sale',
        message: `تم الخصم والإضافة للفاتورة بنجاح! الرصيد المتبقي: ${targetProduct.quantity - 1}`
      });
    } else {
      // 2. RETURN / RESTOCK MODE:
      // Add 1 to inventory stock
      db.adjustStock(
        targetProduct.id,
        1,
        `استرجاع صنف للمخزن عبر كاميرا الهاتف (${targetProduct.name})`
      );

      playBeep('return');
      setScanCount(prev => prev + 1);

      // Broadcast event
      try {
        const eventPayload = {
          type: 'BARCODE_SCANNED',
          barcode: clean,
          product_id: targetProduct.id,
          product_name: targetProduct.name,
          mode: 'return',
          time: now
        };
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('idenia_pos_barcode_sync');
          bc.postMessage(eventPayload);
          bc.close();
        }
        localStorage.setItem(
          'idenia_last_scanned_barcode_event',
          JSON.stringify(eventPayload)
        );
      } catch {}

      setLastScannedProduct({
        product: targetProduct,
        time: now,
        mode: 'return',
        message: `تم استرجاع الصنف وزيادة رصيد المخزن بنجاح! الرصيد الجديد: ${targetProduct.quantity + 1}`
      });
    }

    loadData();
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none"
      dir="rtl"
    >
      {/* Top Streamlined Bar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/80 backdrop-blur-md border border-emerald-400/40 text-[11px] font-black text-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
            <span>كاميرا الكاشير نشطة</span>
          </div>

          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all cursor-pointer"
            title={soundEnabled ? 'كتم الصفارة' : 'تشغيل الصفارة'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </header>

      {/* Main Fullscreen Video Viewfinder */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="w-full h-full object-cover"
        />

        {/* Laser Targeting Viewfinder Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 border-2 border-white/40 rounded-3xl overflow-hidden shadow-2xl backdrop-brightness-105">
            {/* Viewfinder Corners */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />

            {/* Glowing Laser Scan Line */}
            <div
              className={`absolute left-0 right-0 h-0.5 shadow-lg ${
                mode === 'sale'
                  ? 'bg-emerald-400 shadow-emerald-400/80'
                  : 'bg-amber-400 shadow-amber-400/80'
              } animate-scan-laser`}
              style={{
                animation: 'scanLaser 2s ease-in-out infinite alternate'
              }}
            />

            {/* Center target dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`w-3 h-3 rounded-full opacity-60 ${
                  mode === 'sale' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </div>
          </div>

          <p className="mt-4 text-xs font-bold text-white/80 bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg text-center">
            وجّه الكاميرا نحو باركود الصنف لتنفيذ عملية{' '}
            <span
              className={
                mode === 'sale'
                  ? 'text-emerald-300 font-black'
                  : 'text-amber-300 font-black'
              }
            >
              {mode === 'sale' ? '(البيع والخصم)' : '(الاسترجاع والإضافة)'}
            </span>
          </p>
        </div>

        {/* Live Detected Scanned Product Popup Toast */}
        {lastScannedProduct && (
          <div className="absolute top-16 left-4 right-4 z-30 flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
            <div
              className={`max-w-md w-full p-4 rounded-3xl backdrop-blur-xl border shadow-2xl flex items-center gap-3.5 ${
                lastScannedProduct.mode === 'sale'
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-white'
                  : 'bg-amber-950/90 border-amber-500/50 text-white'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black ${
                  lastScannedProduct.mode === 'sale'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-600/50'
                    : 'bg-amber-500 text-white shadow-lg shadow-amber-600/50'
                }`}
              >
                {lastScannedProduct.mode === 'sale' ? (
                  <ShoppingCart className="w-6 h-6" />
                ) : (
                  <PackagePlus className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] text-white/70">
                  <span>
                    {lastScannedProduct.mode === 'sale'
                      ? 'تم تسجيل بيع الصنف'
                      : 'تم استرجاع الصنف للمخزن'}
                  </span>
                  <span className="font-mono text-[10px]">
                    #{lastScannedProduct.product.barcode}
                  </span>
                </div>
                <h4 className="font-black text-sm text-white truncate mt-0.5">
                  {lastScannedProduct.product.name}
                </h4>
                <p className="text-[11px] font-bold text-white/90 mt-0.5">
                  {lastScannedProduct.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Camera Permission / Error Fallback */}
        {cameraError && (
          <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="max-w-sm space-y-2">
              <h3 className="font-black text-base text-white">إذن الكاميرا مطلوب</h3>
              <p className="text-xs text-gray-300 leading-relaxed">{cameraError}</p>
            </div>
            <button
              onClick={startCamera}
              className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة المحاولة وتفعيل الكاميرا</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Ultra-Clean Dual Mode Controls */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
        <div className="max-w-md mx-auto space-y-3">
          {/* Scanned Badge Counter */}
          <div className="flex items-center justify-between px-3 text-[11px] text-gray-300">
            <span>العمليات المسجلة بالهاتف:</span>
            <span className="font-mono font-black text-white bg-white/10 px-2 py-0.5 rounded-lg">
              {scanCount} أصناف
            </span>
          </div>

          {/* Clean Dual Mode Buttons: [بيع (افتراضي)] & [استرجاع] */}
          <div className="grid grid-cols-2 gap-3 p-1.5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15">
            {/* Sale Button (Active by default) */}
            <button
              type="button"
              onClick={() => setMode('sale')}
              className={`flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-sm transition-all duration-200 cursor-pointer active:scale-98 ${
                mode === 'sale'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-700/50 scale-[1.02]'
                  : 'bg-transparent text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShoppingCart className="w-5 h-5 shrink-0" />
              <div className="text-right">
                <div className="text-sm font-black leading-tight">بيع (خصم من المخزن)</div>
                <div className="text-[10px] font-normal opacity-80">ينزل تلقائياً في الفاتورة</div>
              </div>
            </button>

            {/* Return / Restock Button */}
            <button
              type="button"
              onClick={() => setMode('return')}
              className={`flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-sm transition-all duration-200 cursor-pointer active:scale-98 ${
                mode === 'return'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-700/50 scale-[1.02]'
                  : 'bg-transparent text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <PackagePlus className="w-5 h-5 shrink-0" />
              <div className="text-right">
                <div className="text-sm font-black leading-tight">استرجاع (إضافة للمخزن)</div>
                <div className="text-[10px] font-normal opacity-80">يزيد رصيد السلعة فوراً</div>
              </div>
            </button>
          </div>
        </div>
      </footer>

      {/* Laser Animation Keyframe Style */}
      <style>{`
        @keyframes scanLaser {
          0% {
            top: 5%;
          }
          100% {
            top: 95%;
          }
        }
      `}</style>
    </div>
  );
};
