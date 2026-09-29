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
  Upload,
  Smartphone,
  QrCode,
  Layers
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { db } from '../services/db';
import { Product, AppSettings, UserAccount } from '../types';
import {
  sendStationBarcodeScanInFirebase,
  pingStationPhonePresenceInFirebase
} from '../services/firebase';

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

  // Station Pairing state (Link this phone specifically to a PC station e.g. POS-1, POS-2)
  const [stationId, setStationId] = useState<string>(() => {
    return localStorage.getItem('idenia_paired_station_id') || 'POS-1';
  });
  const [isStationModalOpen, setIsStationModalOpen] = useState<boolean>(false);
  const [stationInput, setStationInput] = useState<string>('');

  // Camera state & multi-lens switching
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState<number>(0);
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
    const handleDb = () => loadData();
    window.addEventListener('idenia_db_changed', handleDb);
    return () => window.removeEventListener('idenia_db_changed', handleDb);
  }, []);

  // Ping phone presence to paired station in Firestore every 10 seconds
  useEffect(() => {
    const phone = user?.phone || db.getUser()?.phone;
    if (!phone) return;

    pingStationPhonePresenceInFirebase(phone, stationId, 'هاتف الكاشير');
    const interval = setInterval(() => {
      pingStationPhonePresenceInFirebase(phone, stationId, 'هاتف الكاشير');
    }, 12000);

    return () => clearInterval(interval);
  }, [user?.phone, stationId]);

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
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
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

  // Enumerate video devices to detect multiple lenses on mobile
  const enumerateCameras = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAvailableVideoDevices(videoInputs);
        return videoInputs;
      }
    } catch (err) {
      console.warn('Could not enumerate cameras:', err);
    }
    return [];
  };

  // Start native camera with reliable mobile initialization & lens selection
  const startCamera = async (
    targetFacing: 'environment' | 'user' = facingMode,
    forcedDeviceId?: string
  ) => {
    stopCamera();
    setCameraError(null);
    setIsPermissionDenied(false);
    setIsStartingCamera(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('الكاميرا غير مدعومة في هذا المتصفح أو بيئة التشغيل الحالية.');
      setIsStartingCamera(false);
      return;
    }

    let acquiredStream: MediaStream | null = null;
    let lastErr: any = null;

    // If a specific camera device ID is requested (e.g. switching between rear lenses):
    if (forcedDeviceId) {
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: forcedDeviceId } },
          audio: false
        });
      } catch (err) {
        console.warn('Forced deviceId stream failed, trying fallback:', err);
      }
    }

    if (!acquiredStream) {
      // Progressive constraint fallback list
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

      for (const constraints of constraintConfigs) {
        try {
          acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (acquiredStream) break;
        } catch (err: any) {
          lastErr = err;
          console.warn('Camera fallback attempt with constraints:', constraints, err);
        }
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

      // Check if torch/flash is supported on active track
      const videoTrack = acquiredStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = typeof videoTrack.getCapabilities === 'function' ? videoTrack.getCapabilities() : {};
        if (capabilities.torch) {
          setTorchAvailable(true);
        }
      }

      // Update camera devices list for lens switching
      enumerateCameras().catch(() => {});

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = acquiredStream;
        video.muted = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('autoplay', 'true');

        // Robust video frame synchronization: wait for video dimensions before calling play
        // This solves the black screen on mobile Chrome/Android where play() was resolving before video frames arrived
        await new Promise<void>(resolve => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            resolve();
          } else {
            const onMeta = () => {
              video.removeEventListener('loadedmetadata', onMeta);
              resolve();
            };
            video.addEventListener('loadedmetadata', onMeta);
            setTimeout(resolve, 800);
          }
        });

        try {
          await video.play();
        } catch (playErr) {
          console.warn('Video play caught:', playErr);
        }

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

  // Switch between physical lenses (e.g. multiple back cameras on modern phones)
  const switchRearLens = async () => {
    const devices = availableVideoDevices.length > 0 ? availableVideoDevices : await enumerateCameras();
    if (devices.length <= 1) {
      // Toggle facing mode if only 1 device known
      toggleCameraFacing();
      return;
    }

    const nextIndex = (currentDeviceIndex + 1) % devices.length;
    setCurrentDeviceIndex(nextIndex);
    const targetDevice = devices[nextIndex];
    if (targetDevice && targetDevice.deviceId) {
      await startCamera(facingMode, targetDevice.deviceId);
    } else {
      await startCamera(facingMode);
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
    } catch (err) {
      console.warn('Torch constraint error:', err);
    }
  };

  // Toggle Facing Mode (Back vs Front)
  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Continuous Barcode Reader Scanner Loop
  const startScannerLoop = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    if (!zxingReaderRef.current) {
      zxingReaderRef.current = new BrowserMultiFormatReader();
    }

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const result = await zxingReaderRef.current?.decodeFromVideoElement(videoRef.current);
        if (result && result.getText()) {
          handleBarcodeScanned(result.getText());
        }
      } catch {
        // Normal if frame has no barcode
      }
    }, 180);
  };

  // Handle scanned barcode according to active mode and send to paired PC station
  const handleBarcodeScanned = (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    const now = Date.now();
    // Debounce duplicate scans within 1.5 seconds
    if (lastScannedBarcodeRef.current === clean && now - lastScanTimestampRef.current < 1500) {
      return;
    }

    lastScannedBarcodeRef.current = clean;
    lastScanTimestampRef.current = now;

    // Check if the scanned barcode is actually a Station Pairing QR Code from PC screen!
    try {
      if (clean.includes('IDENIA_POS_PAIRING') || clean.startsWith('{')) {
        const parsed = JSON.parse(clean);
        if (parsed.type === 'IDENIA_POS_PAIRING' && parsed.stationId) {
          const newStation = parsed.stationId.toUpperCase();
          setStationId(newStation);
          localStorage.setItem('idenia_paired_station_id', newStation);
          playBeep('sale');
          alert(`تم ربط الهاتف بنجاح بمحطة (${newStation})! الآن أي صنف تمسحه سيدخل في فاتورة هذه الشاشة مباشرة.`);
          return;
        }
      }
    } catch {}

    // Find product in store inventory
    const currentProducts = db.getProducts();
    const targetProduct = currentProducts.find(
      p => p.barcode && p.barcode.trim().toLowerCase() === clean.toLowerCase()
    );

    const phone = user?.phone || db.getUser()?.phone || '';

    // 1. Send barcode to the paired PC station in Firestore cloud in real-time
    if (phone) {
      sendStationBarcodeScanInFirebase(phone, stationId, {
        barcode: clean,
        mode,
        productName: targetProduct ? targetProduct.name : `صنف #${clean}`
      }).catch(console.warn);
    }

    // 2. Broadcast locally via localStorage / BroadcastChannel for zero-latency local pairing
    try {
      const stationScanPayload = JSON.stringify({
        type: 'STATION_BARCODE_SCANNED',
        barcode: clean,
        stationId: stationId.toUpperCase(),
        mode,
        timestamp: now
      });
      localStorage.setItem(`idenia_station_scan_${stationId.toUpperCase()}`, stationScanPayload);
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(`idenia_station_${stationId.toUpperCase()}`);
        bc.postMessage({ barcode: clean, mode, timestamp: now });
        bc.close();
      }
    } catch {}

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
        message: `تم إرسال الباركود (${clean}) لمحطة (${stationId}). الصنف غير مسجل بالمخزن.`
      });
      return;
    }

    playBeep(mode === 'sale' ? 'sale' : 'return');
    setScanCount(prev => prev + 1);

    setLastScannedProduct({
      product: targetProduct,
      time: now,
      mode,
      message: `تم إرسال الصنف فوراً إلى فاتورة محطة (${stationId}) بنجاح!`
    });
  };

  // Decode from native photo upload
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async event => {
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
              alert('لم يتم العثور على باركود واضح في الصورة الملتقطة.');
            }
          } catch {
            alert('تعذر قراءة الباركود من الصورة.');
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    handleBarcodeScanned(manualBarcode.trim());
    setManualBarcode('');
    setIsManualInputOpen(false);
  };

  const handleSelectStation = (newStation: string) => {
    const clean = newStation.trim().toUpperCase() || 'POS-1';
    setStationId(clean);
    localStorage.setItem('idenia_paired_station_id', clean);
    setIsStationModalOpen(false);
    playBeep('sale');
  };

  // Auto-start camera on mount
  useEffect(() => {
    startCamera('environment');
    return () => stopCamera();
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
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        {/* Station Pairing Badge with Switch Button */}
        <button
          onClick={() => {
            setStationInput(stationId);
            setIsStationModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/90 hover:bg-emerald-500 backdrop-blur-md border border-emerald-400/40 text-[11px] font-black text-white shadow-md cursor-pointer transition-all active:scale-95"
          title="اضغط لتبديل محطة الكاشير المربوطة"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
          <span>نقطة: {stationId}</span>
          <span className="text-[10px] bg-white/20 px-1 py-0.5 rounded text-emerald-100">تبديل 🔄</span>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Switch Rear Lens Button (solves multi-camera black screen) */}
          <button
            onClick={switchRearLens}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all cursor-pointer"
            title="تبديل العدسة الخلفية (إذا ظهرت شاشة سوداء)"
          >
            <Layers className="w-4 h-4 text-emerald-300" />
          </button>

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
            title="تصوير مباشر للباركود"
          >
            <Camera className="w-4 h-4 text-emerald-300" />
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
      <div className="relative flex-1 w-full h-full min-h-[300px] flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="w-full h-full object-cover min-h-[300px]"
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
                className="absolute left-0 right-0 h-0.5 shadow-lg bg-emerald-400 shadow-emerald-400/80 animate-scan-laser"
                style={{
                  animation: 'scanLaser 2s ease-in-out infinite alternate'
                }}
              />

              {/* Center target dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full opacity-60 bg-emerald-400" />
              </div>
            </div>

            <p className="mt-4 text-xs font-bold text-white/90 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg text-center">
              وجّه الكاميرا نحو الباركود لإرساله فوراً إلى محطة <span className="text-emerald-400 font-black">({stationId})</span>
            </p>
          </div>
        )}

        {/* Live Scanned Product Feedback Toast Card */}
        {lastScannedProduct && (
          <div className="absolute top-16 left-4 right-4 z-30 max-w-md mx-auto animate-in slide-in-from-top-4 duration-200">
            <div className="p-3.5 rounded-2xl backdrop-blur-xl border shadow-2xl flex items-center gap-3 bg-emerald-950/85 border-emerald-500/50 text-emerald-100">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] text-white/70">
                  <span>تم الإرسال لمحطة {stationId}</span>
                  <span className="font-mono text-[10px]">
                    #{lastScannedProduct.product.barcode}
                  </span>
                </div>
                <h4 className="font-black text-sm text-white truncate mt-0.5">
                  {lastScannedProduct.product.name}
                </h4>
                <p className="text-[11px] font-bold text-emerald-300 mt-0.5">
                  {lastScannedProduct.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Camera Permission / Error Fallback Screen */}
        {cameraError && (
          <div className="absolute inset-0 z-30 bg-black/95 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            <div className="max-w-sm w-full space-y-4 my-auto bg-zinc-900/90 border border-zinc-700 p-6 rounded-3xl backdrop-blur-xl">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg">
                <Camera className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="font-black text-base md:text-lg text-white">
                  كاميرا قارئ الباركود
                </h3>
                <p className="text-xs text-gray-300">
                  {cameraError}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={switchRearLens}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  <span>تبديل عدسة الكاميرا الخلفية 🔄</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Camera className="w-4 h-4" />
                  <span>التقاط صورة للباركود بالكاميرا فوراً</span>
                </button>

                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="w-full py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>إعادة محاولة فتح الكاميرا</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Bar */}
      <footer className="z-20 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-white/90">
          <span>العمليات المرسلة: </span>
          <span className="text-emerald-400 font-mono font-black">{scanCount} أصناف</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsManualInputOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>إدخال يدوي</span>
          </button>

          <button
            onClick={() => setIsStationModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>تبديل الكاشير ({stationId})</span>
          </button>
        </div>
      </footer>

      {/* Station Switcher Modal */}
      {isStationModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-white">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-sm">تبديل محطة الكاشير المربوطة</h3>
              </div>
              <button
                onClick={() => setIsStationModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              اختر محطة الكاشير أو الكمبيوتر الذي تريد إرسال الأصناف إليه فوراً:
            </p>

            {/* Quick Station Select Chips */}
            <div className="grid grid-cols-3 gap-2">
              {['POS-1', 'POS-2', 'POS-3'].map(preset => (
                <button
                  key={preset}
                  onClick={() => handleSelectStation(preset)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    stationId === preset
                      ? 'bg-emerald-600 text-white shadow-md border-2 border-emerald-400'
                      : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700 border border-zinc-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Custom Station ID input */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800">
              <label className="text-[11px] font-bold text-gray-400">
                أو اكتب كود المحطة يدويًا:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={stationInput}
                  onChange={e => setStationInput(e.target.value)}
                  placeholder="مثال: POS-4 أو كاشير 2"
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono"
                />
                <button
                  onClick={() => handleSelectStation(stationInput)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl cursor-pointer"
                >
                  ربط
                </button>
              </div>
            </div>

            <div className="p-3 bg-zinc-800/80 rounded-2xl border border-zinc-700 text-[11px] text-gray-300 space-y-1">
              <div className="font-bold text-emerald-400 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" />
                <span>الربط الفوري بكاميرا الهاتف:</span>
              </div>
              <p className="text-[10px] text-gray-400">
                يمكنك أيضاً توجيه كاميرا الهاتف نحو رمز QR المعروض في شاشة الكمبيوتر وسيتم الربط تلقائياً!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Barcode Input Modal */}
      {isManualInputOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-emerald-400" />
                <span>إدخال الباركود يدوياً</span>
              </h3>
              <button
                onClick={() => setIsManualInputOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="text"
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                placeholder="اكتب أرقام الباركود..."
                autoFocus
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono text-center tracking-widest text-sm"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualInputOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
                >
                  إرسال للفاتورة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
