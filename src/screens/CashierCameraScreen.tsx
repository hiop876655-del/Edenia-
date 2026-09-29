import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  ArrowRight,
  ShoppingCart,
  PackagePlus,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Keyboard,
  X,
  Info,
  ExternalLink,
  Upload
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
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
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Manual Barcode Input modal
  const [isManualInputOpen, setIsManualInputOpen] = useState<boolean>(false);
  const [manualBarcode, setManualBarcode] = useState<string>('');

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
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Safe stream stopping
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
    setTorchAvailable(false);
  };

  // Start native camera with progressive multi-stage fallback
  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);
    setIsPermissionDenied(false);
    setIsStartingCamera(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('الكاميرا غير مدعومة في هذا المتصفح أو بيئة التشغيل الحالية.');
      setIsStartingCamera(false);
      return;
    }

    // Constraint configurations from high-clarity to basic universal
    const constraintConfigs: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      },
      {
        video: {
          facingMode: targetFacing
        },
        audio: false
      },
      {
        video: {
          facingMode: targetFacing === 'environment' ? 'user' : 'environment'
        },
        audio: false
      },
      {
        video: true,
        audio: false
      }
    ];

    let acquiredStream: MediaStream | null = null;
    let lastErr: any = null;

    for (const constraints of constraintConfigs) {
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (acquiredStream) break;
      } catch (err: any) {
        lastErr = err;
        console.warn('Camera fallback attempt with constraints:', constraints, err);
      }
    }

    if (!acquiredStream) {
      console.warn('Camera stream could not be acquired:', lastErr);
      const isDenied =
        lastErr?.name === 'NotAllowedError' ||
        lastErr?.name === 'PermissionDeniedError' ||
        lastErr?.name === 'PermissionDismissedError' ||
        String(lastErr?.message || '').toLowerCase().includes('permission') ||
        String(lastErr?.message || '').toLowerCase().includes('denied');

      setIsPermissionDenied(isDenied);
      setCameraError(
        isDenied
          ? 'تم حظر أو رفض إذن استخدام الكاميرا من قبل المتصفح أو النظام.'
          : 'تعذر تشغيل كاميرا الجهاز. تأكد من إعطاء الإذن أو استخدم خيار التصوير المباشر بالأسفل.'
      );
      setCameraActive(false);
      setIsStartingCamera(false);
      return;
    }

    try {
      streamRef.current = acquiredStream;

      // Check if torch/flash is supported on track
      const videoTrack = acquiredStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = typeof videoTrack.getCapabilities === 'function' ? videoTrack.getCapabilities() : {};
        if (capabilities.torch) {
          setTorchAvailable(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = acquiredStream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        startScannerLoop();
      }
    } catch (playErr: any) {
      console.warn('Video playback error:', playErr);
      setCameraError('تعذر عرض بث الفيديو للكاميرا.');
    } finally {
      setIsStartingCamera(false);
    }
  };

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch not supported or failed:', e);
    }
  };

  // Toggle Camera Front / Back
  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Dual Barcode Scanner Loop: Native BarcodeDetector + ZXing Fallback
  const startScannerLoop = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    const hasNativeDetector = typeof (window as any).BarcodeDetector !== 'undefined';
    let nativeDetector: any = null;

    if (hasNativeDetector) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
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
      } catch {
        nativeDetector = null;
      }
    }

    if (!zxingReaderRef.current) {
      zxingReaderRef.current = new BrowserMultiFormatReader();
    }

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      // 1. Try Native BarcodeDetector (High performance hardware-accelerated)
      if (nativeDetector) {
        try {
          const barcodes = await nativeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw) {
              handleBarcodeScanned(raw);
              return;
            }
          }
        } catch {
          // Fall through to ZXing
        }
      }

      // 2. Try ZXing Multi-Format Frame Scanning (Universal fallback)
      if (zxingReaderRef.current && videoRef.current.readyState >= 2) {
        try {
          const zxResult = await zxingReaderRef.current.decodeFromVideoElement(videoRef.current);
          if (zxResult && zxResult.getText()) {
            handleBarcodeScanned(zxResult.getText());
          }
        } catch {
          // Frame not containing barcode -> Normal
        }
      }
    }, 200);
  };

  // Decode from native photo upload (bypasses browser WebRTC permission restrictions)
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;

        const img = new Image();
        img.onload = async () => {
          try {
            if (!zxingReaderRef.current) {
              zxingReaderRef.current = new BrowserMultiFormatReader();
            }
            const zxResult = await zxingReaderRef.current.decodeFromImageElement(img);
            if (zxResult && zxResult.getText()) {
              handleBarcodeScanned(zxResult.getText());
            } else {
              alert('لم يتم العثور على باركود واضح في الصورة الملتقطة. يرجى التأكد من وضوح خطوط الباركود وإعادة التصوير.');
            }
          } catch {
            alert('تعذر قراءة الباركود من الصورة. يرجى التأكد من تسليط الكاميرا على الباركود بوضوح.');
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Photo decode error:', err);
    } finally {
      if (e.target) e.target.value = '';
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    handleBarcodeScanned(manualBarcode.trim());
    setManualBarcode('');
    setIsManualInputOpen(false);
  };

  useEffect(() => {
    startCamera('environment');
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none"
      dir="rtl"
    >
      {/* Hidden Native Camera File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoCapture}
      />

      {/* Top Streamlined Bar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {cameraActive && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/80 backdrop-blur-md border border-emerald-400/40 text-[11px] font-black text-white shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              <span>كاميرا الكاشير نشطة</span>
            </div>
          )}

          {/* Torch Toggle */}
          {torchAvailable && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                torchOn ? 'bg-amber-500 text-black' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={torchOn ? 'إطفاء الكشاف' : 'تشغيل الكشاف'}
            >
              {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
            </button>
          )}

          {/* Native Camera Capture Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all cursor-pointer"
            title="التقاط صورة للباركود بكاميرا الهاتف"
          >
            <Camera className="w-4 h-4 text-emerald-300" />
          </button>

          {/* Switch Camera Front / Back */}
          <button
            onClick={toggleCameraFacing}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all cursor-pointer"
            title="تبديل الكاميرا (خلفية / أمامية)"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          {/* Manual Barcode Input button */}
          <button
            onClick={() => setIsManualInputOpen(true)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all cursor-pointer"
            title="إدخال باركود يدوياً"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Sound Mute Toggle */}
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
        {cameraActive && (
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
                    ? 'text-emerald-400 font-black'
                    : 'text-amber-400 font-black'
                }
              >
                {mode === 'sale' ? '(البيع والخصم)' : '(الاسترجاع والإضافة)'}
              </span>
            </p>
          </div>
        )}

        {/* Live Scanned Product Feedback Toast Card */}
        {lastScannedProduct && (
          <div className="absolute top-16 left-4 right-4 z-30 max-w-md mx-auto animate-in slide-in-from-top-4 duration-200">
            <div
              className={`p-3.5 rounded-2xl backdrop-blur-xl border shadow-2xl flex items-center gap-3 ${
                lastScannedProduct.product.id
                  ? lastScannedProduct.mode === 'sale'
                    ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-100'
                    : 'bg-amber-950/85 border-amber-500/50 text-amber-100'
                  : 'bg-rose-950/85 border-rose-500/50 text-rose-100'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  lastScannedProduct.product.id
                    ? lastScannedProduct.mode === 'sale'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {lastScannedProduct.product.id ? (
                  lastScannedProduct.mode === 'sale' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <PackagePlus className="w-6 h-6" />
                  )
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] text-white/70">
                  <span>
                    {lastScannedProduct.product.id
                      ? lastScannedProduct.mode === 'sale'
                        ? 'تم تسجيل بيع الصنف'
                        : 'تم استرجاع الصنف للمخزن'
                      : 'تنبيه'}
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

        {/* Camera Permission / Error Fallback Screen with Clear Step-by-Step Guide */}
        {cameraError && (
          <div className="absolute inset-0 z-30 bg-black/95 flex flex-col items-center justify-center p-4 sm:p-6 text-center overflow-y-auto">
            <div className="max-w-md w-full space-y-4 my-auto">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-950/80 border border-amber-600/60 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-900/30">
                <Camera className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-black text-base md:text-lg text-white">
                  {isPermissionDenied ? 'إذن استخدام الكاميرا مطلوب' : 'تعذر تشغيل الكاميرا'}
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {cameraError}
                </p>
              </div>

              {/* Step-by-Step Permission Instruction Box */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-right space-y-2 text-xs text-gray-200">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>خطوات السماح بالكاميرا على هاتفك:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-gray-300 leading-normal pr-1">
                  <li>
                    اضغط على أيقونة <strong>(القفل 🔒 أو إعدادات الموقع ⚙️)</strong> بجانب رابط الموقع في أعلى المتصفح.
                  </li>
                  <li>
                    اضغط على <strong>«أذونات الموقع / Permissions»</strong> ثم <strong>«الكاميرا / Camera»</strong>.
                  </li>
                  <li>
                    اختر <strong>«سماح / Allow»</strong> لتفعيل الكاميرا.
                  </li>
                  <li>
                    اضغط على زر <strong>«إعادة المحاولة وتفعيل الكاميرا»</strong> بالأسفل.
                  </li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* 1. Native Camera Capture (Instant Bypass) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>📸 تصوير الباركود بكاميرا الهاتف (بدون إذن متصفح)</span>
                </button>

                {/* 2. Retry Live Stream */}
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  disabled={isStartingCamera}
                  className="w-full py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isStartingCamera ? 'animate-spin' : ''}`} />
                  <span>{isStartingCamera ? 'جاري محاولة فتح الكاميرا...' : 'إعادة المحاولة وتفعيل البث الحي'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {/* Switch to Front Camera as fallback */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = facingMode === 'environment' ? 'user' : 'environment';
                      setFacingMode(next);
                      startCamera(next);
                    }}
                    className="py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span>الكاميرا {facingMode === 'environment' ? 'الأمامية' : 'الخلفية'}</span>
                  </button>

                  {/* Manual Barcode Input button */}
                  <button
                    type="button"
                    onClick={() => setIsManualInputOpen(true)}
                    className="py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                    <span>إدخال يدوي</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Ultra-Clean Dual Mode Controls */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
        <div className="max-w-md mx-auto space-y-3">
          {/* Scanned Badge Counter & Quick Actions */}
          <div className="flex items-center justify-between px-3 text-[11px] text-gray-300">
            <span>العمليات المسجلة بالهاتف:</span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>تصوير</span>
              </button>
              <button
                type="button"
                onClick={() => setIsManualInputOpen(true)}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
              >
                إدخال يدوي
              </button>
              <span className="font-mono font-black text-white bg-white/10 px-2 py-0.5 rounded-lg">
                {scanCount} أصناف
              </span>
            </div>
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

      {/* Manual Barcode Input Dialog Modal */}
      {isManualInputOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in" dir="rtl">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-sm w-full p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 font-black text-sm">
                <Keyboard className="w-4 h-4 text-amber-400" />
                <span>إدخال رقم الباركود يدوياً</span>
              </div>
              <button
                onClick={() => setIsManualInputOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 block mb-1 font-bold">
                  اكتب رقم الباركود لتنفيذ عملية ({mode === 'sale' ? 'البيع والخصم' : 'الاسترجاع والإضافة'}):
                </label>
                <input
                  type="text"
                  autoFocus
                  value={manualBarcode}
                  onChange={e => setManualBarcode(e.target.value)}
                  placeholder="مثال: 6221234567890"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white text-center font-mono font-bold text-sm focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-colors cursor-pointer"
                >
                  تنفيذ العملية
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualInputOpen(false)}
                  className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
