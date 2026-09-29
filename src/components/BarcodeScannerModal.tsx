import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Flashlight,
  FlashlightOff,
  RotateCcw,
  Upload,
  CheckCircle2,
  AlertCircle,
  ZoomIn,
  Sparkles,
  Barcode as BarcodeIcon
} from 'lucide-react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'مسح باركود المنتج بالكاميرا'
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hardwareZoomAvailable, setHardwareZoomAvailable] = useState<boolean>(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const isScanningActiveRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // High-volume crisp signature cashier beep + haptic vibration
  const playBeep = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([70]);
      } catch {}
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.0, ctx.currentTime);

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(14, ctx.currentTime);
      compressor.attack.setValueAtTime(0, ctx.currentTime);
      compressor.release.setValueAtTime(0.08, ctx.currentTime);

      masterGain.connect(compressor);
      compressor.connect(ctx.destination);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2550, ctx.currentTime);
      gain.gain.setValueAtTime(1.0, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.16);
    } catch {}
  };

  const stopScannerEngine = () => {
    isScanningActiveRef.current = false;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch {}
    }
  };

  const stopCamera = () => {
    stopScannerEngine();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
    setTorchAvailable(false);
  };

  const handleBarcodeSuccess = (rawCode: string) => {
    const cleaned = rawCode.trim();
    if (!cleaned) return;
    stopScannerEngine();
    playBeep();
    setScannedCode(cleaned);

    setTimeout(() => {
      onScan(cleaned);
      onClose();
    }, 600);
  };

  const startScannerEngine = (video: HTMLVideoElement) => {
    stopScannerEngine();
    isScanningActiveRef.current = true;

    const retailFormats = [
      'ean_13',
      'ean_8',
      'upc_a',
      'upc_e',
      'code_128',
      'code_39',
      'code_93',
      'itf',
      'qr_code'
    ];

    // Priority 1: Native BarcodeDetector (Chrome / Android hardware accelerated)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: retailFormats
        });

        let isBusy = false;
        scanIntervalRef.current = setInterval(async () => {
          if (!isScanningActiveRef.current || !video || video.readyState < 2 || isBusy) return;
          try {
            isBusy = true;
            const detected = await barcodeDetector.detect(video);
            if (detected && detected.length > 0) {
              const raw = detected[0]?.rawValue?.trim();
              if (raw && raw.length >= 2) {
                handleBarcodeSuccess(raw);
              }
            }
          } catch {
            // Ignore frame scan errors
          } finally {
            isBusy = false;
          }
        }, 90);
        return;
      } catch (e) {
        console.warn('Native BarcodeDetector init failed, using ZXing:', e);
      }
    }

    // Priority 2: ZXing Reader
    try {
      const hints = new Map();
      const zxingFormats = [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE
      ];
      hints.set(DecodeHintType.POSSIBLE_FORMATS, zxingFormats);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints, 100);
      zxingReaderRef.current = codeReader;

      codeReader.decodeFromVideoElementContinuously(video, (result, err) => {
        if (!isScanningActiveRef.current) return;
        if (result) {
          const text = result.getText()?.trim();
          if (text && text.length >= 2) {
            handleBarcodeSuccess(text);
          }
        }
      });
    } catch (e) {
      console.warn('ZXing initialization failed:', e);
    }
  };

  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);
    setScannedCode(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('الكاميرا غير مدعومة في هذا المتصفح. يمكنك اختيار صورة الباركود من ألبوم الصور.');
      return;
    }

    let acquiredStream: MediaStream | null = null;
    let lastErr: any = null;

    const constraintList: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          advanced: [{ focusMode: 'continuous' } as any]
        } as any,
        audio: false
      },
      {
        video: {
          facingMode: targetFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
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

    for (const constraints of constraintList) {
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (acquiredStream) break;
      } catch (err: any) {
        lastErr = err;
      }
    }

    if (!acquiredStream) {
      const isDenied =
        lastErr?.name === 'NotAllowedError' ||
        lastErr?.name === 'PermissionDeniedError' ||
        String(lastErr?.message || '').toLowerCase().includes('permission') ||
        String(lastErr?.message || '').toLowerCase().includes('denied');

      setCameraError(
        isDenied
          ? 'تم رفض إذن الكاميرا. يرجى تفعيل إذن الكاميرا من إعدادات المتصفح أو رفع صورة الباركود.'
          : 'تعذر تشغيل كاميرا الجهاز. يمكنك رفع صورة للمنتج لقراءة الباركود منها مباشرة.'
      );
      setCameraActive(false);
      return;
    }

    try {
      streamRef.current = acquiredStream;
      const videoTrack = acquiredStream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities: any = typeof videoTrack.getCapabilities === 'function' ? videoTrack.getCapabilities() : {};
          if (capabilities.torch) {
            setTorchAvailable(true);
          }
          if (capabilities.zoom) {
            setHardwareZoomAvailable(true);
          }
          if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            await videoTrack.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as any]
            }).catch(() => {});
          }
        } catch {}
      }

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = acquiredStream;
        video.muted = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('autoplay', 'true');

        try {
          await video.play();
        } catch (playErr) {
          console.warn('Video play warning:', playErr);
        }

        setCameraActive(true);
        startScannerEngine(video);
      }
    } catch (e: any) {
      console.warn('Video start error:', e);
      setCameraError('تعذر عرض بث الكاميرا.');
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch failed:', err);
    }
  };

  const toggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const cycleZoom = async () => {
    const nextZoom = zoomLevel === 1 ? 1.5 : zoomLevel === 1.5 ? 2 : 1;
    setZoomLevel(nextZoom);

    if (hardwareZoomAvailable && streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          await (track as any).applyConstraints({
            advanced: [{ zoom: nextZoom }]
          });
        } catch {}
      }
    }
  };

  // Decode barcode from image file (camera capture or gallery pick)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setCameraError(null);

    try {
      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Try native BarcodeDetector on image
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'qr_code']
          });
          const detected = await barcodeDetector.detect(img);
          if (detected && detected.length > 0) {
            const raw = detected[0]?.rawValue?.trim();
            if (raw) {
              URL.revokeObjectURL(imageUrl);
              setIsProcessingImage(false);
              handleBarcodeSuccess(raw);
              return;
            }
          }
        } catch {}
      }

      // Try ZXing on image
      try {
        const codeReader = new BrowserMultiFormatReader();
        const result = await codeReader.decodeFromImageElement(img);
        if (result && result.getText()) {
          URL.revokeObjectURL(imageUrl);
          setIsProcessingImage(false);
          handleBarcodeSuccess(result.getText());
          return;
        }
      } catch {}

      URL.revokeObjectURL(imageUrl);
      setCameraError('لم يتم العثور على باركود واضح في الصورة. يرجى تجربة التقاط صورة أقرب للباركود.');
    } catch {
      setCameraError('فشل تحليل الصورة. يرجى التأكد من وضوح الباركود وإعادة المحاولة.');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] dark:text-[#66BB6A] flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                {title}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                وجّه الكاميرا نحو باركود المنتج (الخطوط والأرقام)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative bg-black h-80 sm:h-96 flex items-center justify-center overflow-hidden select-none">
          {/* Video Stream */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover transition-transform duration-200"
            style={{
              transform: !hardwareZoomAvailable && zoomLevel > 1 ? `scale(${zoomLevel})` : undefined
            }}
            playsInline
            muted
            autoPlay
          />

          {/* Scanned Success Badge */}
          {scannedCode && (
            <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-30 p-6 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div className="text-xs font-bold text-white/80 mb-1">تم التقاط الباركود بنجاح!</div>
              <div className="text-2xl font-black font-mono tracking-widest bg-black/20 px-4 py-1.5 rounded-xl border border-white/20">
                {scannedCode}
              </div>
              <div className="text-xs text-white/90 mt-2">جارٍ الإضافة لحقل المنتج...</div>
            </div>
          )}

          {/* Image Processing Loader */}
          {isProcessingImage && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs font-bold">جارٍ فك وقراءة الباركود من الصورة...</p>
            </div>
          )}

          {/* Scanner Reticle & Laser Beam */}
          {cameraActive && !scannedCode && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-48 sm:w-72 sm:h-52 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* Corner Brackets */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* Animated Red Laser Beam */}
                <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-bounce top-1/2 -translate-y-1/2 opacity-90" />

                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-[10px] font-bold tracking-wide text-white/90 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    ضع الباركود داخل الإطار
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && !cameraActive && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-zinc-950 text-white z-10">
              <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
              <p className="text-xs font-bold text-gray-200 max-w-xs mb-4 leading-relaxed">
                {cameraError}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  إعادة المحاولة
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  رفع صورة الباركود
                </button>
              </div>
            </div>
          )}

          {/* Quick Floating Controls */}
          {cameraActive && !scannedCode && (
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
              <div className="flex items-center gap-1.5">
                {/* Torch / Flashlight */}
                {torchAvailable && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-md transition-all cursor-pointer ${
                      torchOn
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                        : 'bg-black/60 text-white hover:bg-black/80'
                    }`}
                    title="تشغيل كشاف الإضاءة"
                  >
                    {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                  </button>
                )}

                {/* Zoom toggle */}
                <button
                  type="button"
                  onClick={cycleZoom}
                  className="px-2.5 h-9 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                  title="تكبير / تصغير العدسة"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>{zoomLevel}x</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Flip camera */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="w-9 h-9 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer"
                  title="تبديل الكاميرا (أمامية / خلفية)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 px-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/80 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>التقاط / رفع صورة</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
