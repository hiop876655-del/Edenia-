import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Smartphone,
  QrCode,
  ScanLine,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';

interface MobileScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
}

export const MobileScannerModal: React.FC<MobileScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'bridge'>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Play audio beep on scan
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  const handleScanSuccess = (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;
    playBeep();
    setLastScanned(clean);
    onBarcodeDetected(clean);

    // Broadcast across windows/tabs/mobile sessions
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('idenia_pos_barcode_sync');
        bc.postMessage({ type: 'BARCODE_SCANNED', barcode: clean, time: Date.now() });
        bc.close();
      }
      localStorage.setItem('idenia_last_scanned_barcode_event', JSON.stringify({ barcode: clean, t: Date.now() }));
    } catch {}

    setTimeout(() => {
      setLastScanned(null);
    }, 2000);
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('الكاميرا غير مدعومة في هذا المتصفح أو البيئة.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startBarcodeDetection();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(err.message || 'تعذر الوصول إلى الكاميرا. تأكد من إعطاء إذن الكاميرا للمتصفح.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Detection loop using BarcodeDetector if available
  const startBarcodeDetection = () => {
    if (typeof (window as any).BarcodeDetector !== 'undefined') {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
      });

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue && rawValue !== lastScanned) {
              handleScanSuccess(rawValue);
            }
          }
        } catch {
          // Frame error ignore
        }
      }, 350);
    }
  };

  useEffect(() => {
    if (isOpen && activeMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode]);

  // Listen to remote barcode sync events
  useEffect(() => {
    if (!isOpen) return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'idenia_last_scanned_barcode_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.barcode) {
            handleScanSuccess(parsed.barcode);
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copySyncLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none" dir="rtl">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2E7D32] text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                قارئ الباركود الذكي (كاميرا الموبايل)
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                امسح بالهاتف ليضاف الصنف فوراً لفاتورة الكاشير
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 p-2 gap-2 bg-gray-50/50 dark:bg-zinc-900/50">
          <button
            onClick={() => setActiveMode('camera')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'camera'
                ? 'bg-[#2E7D32] text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>كاميرا هذا الجهاز</span>
          </button>
          <button
            onClick={() => {
              stopCamera();
              setActiveMode('bridge');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'bridge'
                ? 'bg-[#2E7D32] text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>ربط هاتف خارجي</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {activeMode === 'camera' ? (
            <div className="space-y-4">
              {/* Video Scanner Viewport */}
              <div className="relative w-full h-56 bg-black rounded-2xl overflow-hidden flex items-center justify-center border-2 border-emerald-500/40">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />

                {/* Laser scan animation overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-48 h-32 border-2 border-emerald-400/80 rounded-xl relative shadow-lg">
                    <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[11px] font-bold text-white bg-black/60 px-3 py-1 rounded-full mt-3">
                    وجّه الباركود داخل المستطيل
                  </span>
                </div>

                {lastScanned && (
                  <div className="absolute inset-0 bg-emerald-950/80 flex flex-col items-center justify-center text-white space-y-1 animate-in zoom-in-90 duration-150">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    <span className="font-black text-sm">تم التقاط الباركود!</span>
                    <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded">#{lastScanned}</span>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError} - يمكنك إدخال الكود يدوياً بالأسفل.</span>
                </div>
              )}

              {/* Fast barcode test/manual entry */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                  <span>إدخال الباركود السريع (يدوي أو عبر مسدس الليزر):</span>
                  <span className="text-[10px] text-gray-400">اضغط Enter للإضافة الفورية</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="اكتب رقم الباركود (مثال: 58241)..."
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && manualCode.trim()) {
                        handleScanSuccess(manualCode.trim());
                        setManualCode('');
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => {
                      if (manualCode.trim()) {
                        handleScanSuccess(manualCode.trim());
                        setManualCode('');
                      }
                    }}
                    className="px-4 py-2 bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    إرسال للفاتورة
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Bridge to external mobile phone */
            <div className="space-y-4 text-center">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
                <Smartphone className="w-10 h-10 text-[#2E7D32] dark:text-[#66BB6A] mx-auto" />
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  استخدم كاميرا هاتفك كقارئ باركود لاسلكي مجاني
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  افتح نفس الرابط على متصفح هاتفك أو تطبيق الأندرويد، وجّه كاميرا الموبايل على أي صنف، وسيضاف لحظياً على جهاز الكمبيوتر بدون الحاجة لشراء جهاز ماسح ليزر بآلاف الجنيهات!
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl flex items-center justify-between text-xs border border-gray-200 dark:border-gray-800">
                <span className="font-mono text-gray-500 truncate max-w-[220px]" dir="ltr">
                  {currentUrl}
                </span>
                <button
                  onClick={copySyncLink}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'تم النسخ' : 'نسخ الرابط'}</span>
                </button>
              </div>

              <div className="text-[11px] text-gray-400 space-y-1 text-right bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40">
                <div className="font-bold text-blue-700 dark:text-blue-300">💡 تعليمات الربط السريع:</div>
                <div>1. افتح الرابط على موبايلك واضغط على زر "قارئ الباركود".</div>
                <div>2. صوّر أي منتج في المحل، وسيصدر الكمبيوتر صوت "بيب" ويضيف المنتج فوراً.</div>
                <div>3. إذا صوّرت نفس الصنف مرتين تزيد كميته في الفاتورة تلقائياً.</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
          <span className="text-gray-500 text-[11px] flex items-center gap-1">
            <ScanLine className="w-3.5 h-3.5 text-emerald-600" />
            <span>نظام المسح اللاسلكي الفوري نشط</span>
          </span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl font-bold cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
