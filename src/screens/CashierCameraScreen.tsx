import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  ArrowRight,
  ShoppingCart,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
  RefreshCw,
  Flashlight,
  FlashlightOff,
  Keyboard,
  X,
  Smartphone,
  QrCode,
  Layers,
  PackageCheck,
  ZoomIn,
  Focus
} from 'lucide-react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
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
  user
}) => {
  // Mode: 'sale' (إضافة لفاتورة البيع الحالية) or 'return' (استرجاع وإعادة للمخزن)
  const [mode, setMode] = useState<'sale' | 'return'>('sale');
  const [, setProducts] = useState<Product[]>([]);
  const [, setSettings] = useState<AppSettings>(db.getSettings());

  // Station Pairing state (Link this phone specifically to a PC station e.g. POS-1, POS-2)
  const [stationId, setStationId] = useState<string>(() => {
    return localStorage.getItem('idenia_paired_station_id') || 'POS-1';
  });
  const [isStationModalOpen, setIsStationModalOpen] = useState<boolean>(false);
  const [stationInput, setStationInput] = useState<string>('');

  // Camera state & multi-lens switching
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState<number>(0);
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Zoom controls (1x / 1.5x / 2x) for sharp macro barcode reading without blurring
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hardwareZoomAvailable, setHardwareZoomAvailable] = useState<boolean>(false);
  const [focusRingCoords, setFocusRingCoords] = useState<{ x: number; y: number } | null>(null);

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
  const isScanningActiveRef = useRef<boolean>(false);
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

  // High-Volume Piercing Supermarket Cashier Beeper (100% Volume + Haptic Vibrate)
  const playBeep = (type: 'sale' | 'return' | 'error' = 'sale') => {
    // 1. Mobile Tactile Haptic Vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (type === 'sale') navigator.vibrate([70]);
        else if (type === 'return') navigator.vibrate([45, 50, 90]);
        else navigator.vibrate([160]);
      } catch {}
    }

    if (!soundEnabled) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Max Gain Master Output
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.0, ctx.currentTime);

      // Supermarket Beeper Dynamics Compressor (makes the beep razor sharp & loud)
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(14, ctx.currentTime);
      compressor.attack.setValueAtTime(0, ctx.currentTime);
      compressor.release.setValueAtTime(0.08, ctx.currentTime);

      masterGain.connect(compressor);
      compressor.connect(ctx.destination);

      if (type === 'sale') {
        // High-pitch 2550 Hz crystal chime (Zebra / Honeywell signature scanner beep)
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
      } else if (type === 'return') {
        // Dual ascending cheerful chime for return/restock
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(1200, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(1900, ctx.currentTime + 0.12);
        osc2.frequency.setValueAtTime(1900, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.95, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(masterGain);
        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.24);
        osc2.stop(ctx.currentTime + 0.24);
      } else {
        // Low double buzz for warning
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.85, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
      }
    } catch {}
  };

  // Safe stream stopping
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

  // Start native camera with HD resolution, Macro & Continuous Autofocus
  const startCamera = async (
    targetFacing: 'environment' | 'user' = facingMode,
    forcedDeviceId?: string
  ) => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('الكاميرا غير مدعومة في هذا المتصفح أو بيئة التشغيل الحالية.');
      return;
    }

    let acquiredStream: MediaStream | null = null;
    let lastErr: any = null;

    // 1. If forced lens device ID requested
    if (forcedDeviceId) {
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: forcedDeviceId },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            advanced: [{ focusMode: 'continuous' } as any]
          } as any,
          audio: false
        });
      } catch (err) {
        console.warn('Forced deviceId stream failed, trying fallback:', err);
      }
    }

    // 2. High Definition + Continuous Autofocus Constraints
    if (!acquiredStream) {
      const constraintConfigs: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            advanced: [
              { focusMode: 'continuous' } as any,
              { exposureMode: 'continuous' } as any,
              { whiteBalanceMode: 'continuous' } as any
            ]
          } as any,
          audio: false
        },
        {
          video: {
            facingMode: targetFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            advanced: [{ focusMode: 'continuous' } as any]
          } as any,
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

      setCameraError(
        isDenied
          ? 'تم حظر أو رفض إذن استخدام الكاميرا من قبل المتصفح أو الجهاز.'
          : 'تعذر تشغيل كاميرا الجهاز. تأكد من إعطاء إذن الكاميرا أو استخدم زر الالتقاط السريع.'
      );
      setCameraActive(false);
      return;
    }

    try {
      streamRef.current = acquiredStream;

      // Inspect hardware capabilities: Torch, Zoom, Autofocus
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
          // Enforce continuous autofocus if supported
          if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            await videoTrack.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as any]
            }).catch(() => {});
          }
        } catch {}
      }

      enumerateCameras().catch(() => {});

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
    } catch (playErr: any) {
      console.warn('Video playback error:', playErr);
      setCameraError('تعذر عرض بث الفيديو للكاميرا.');
    }
  };

  // Safe, Dual-Engine Barcode & AI Visual Number Scanner
  const startScannerEngine = (video: HTMLVideoElement) => {
    stopScannerEngine();
    isScanningActiveRef.current = true;

    // Standard commercial barcodes: exclude noisy formats to eliminate false scans
    const standardRetailFormats = [
      'ean_13',
      'ean_8',
      'upc_a',
      'upc_e',
      'code_128',
      'code_39',
      'qr_code'
    ];

    // LAYER A: Native Hardware-Accelerated BarcodeDetector (Chrome/Android built-in)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: standardRetailFormats
        });

        let isBusy = false;
        scanIntervalRef.current = setInterval(async () => {
          if (!isScanningActiveRef.current || !video || video.readyState < 2 || isBusy) return;
          try {
            isBusy = true;
            const detected = await barcodeDetector.detect(video);
            if (detected && detected.length > 0) {
              const raw = detected[0]?.rawValue?.trim();
              if (raw && raw.length >= 3) {
                handleBarcodeScanned(raw);
              }
            }
          } catch {
            // Frame detection error ignored
          } finally {
            isBusy = false;
          }
        }, 80); // 80ms cycle = ~12.5 scans per second for lightning fast barcode detection
      } catch (err) {
        console.warn('Native BarcodeDetector not available, using ZXing continuous reader:', err);
      }
    } else {
      // LAYER B: ZXing continuous reader with tuned retail hints (fallback if BarcodeDetector absent)
      try {
        if (!zxingReaderRef.current) {
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.QR_CODE
          ]);
          hints.set(DecodeHintType.TRY_HARDER, true);
          zxingReaderRef.current = new BrowserMultiFormatReader(hints);
        }
        zxingReaderRef.current.decodeFromVideoElementContinuously(video, (result, err) => {
          if (!isScanningActiveRef.current) return;
          if (result && result.getText()) {
            const clean = result.getText().trim();
            if (clean && clean.length >= 3) {
              handleBarcodeScanned(clean);
            }
          }
        });
      } catch (err) {
        console.warn('ZXing decodeFromVideoElementContinuously error:', err);
      }
    }
  };

  // Zoom control (1x / 1.5x / 2x)
  const applyZoom = async (level: number) => {
    setZoomLevel(level);
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      if (hardwareZoomAvailable) {
        await (track as any).applyConstraints({
          advanced: [{ zoom: level }]
        });
      }
    } catch (err) {
      console.warn('Hardware zoom error:', err);
    }
  };

  const cycleZoom = () => {
    if (zoomLevel === 1) applyZoom(1.5);
    else if (zoomLevel === 1.5) applyZoom(2);
    else applyZoom(1);
  };

  // Tap on viewfinder to refocus camera
  const handleTapToFocus = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusRingCoords({ x, y });
    setTimeout(() => setFocusRingCoords(null), 900);

    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const caps: any = track.getCapabilities ? track.getCapabilities() : {};
      if (caps.focusMode && (caps.focusMode.includes('continuous') || caps.focusMode.includes('manual'))) {
        await (track as any).applyConstraints({
          advanced: [{ focusMode: 'continuous' } as any]
        });
      }
    } catch {}
  };

  // Switch between physical lenses (e.g. multiple back cameras on modern phones)
  const switchRearLens = async () => {
    const devices = availableVideoDevices.length > 0 ? availableVideoDevices : await enumerateCameras();
    if (devices.length <= 1) {
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

  // Handle scanned barcode according to active mode (Sale vs Return) and send to paired PC station
  const handleBarcodeScanned = (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    const now = Date.now();
    // Debounce duplicate scans of SAME barcode within 1.5 seconds
    if (lastScannedBarcodeRef.current === clean && now - lastScanTimestampRef.current < 1500) {
      return;
    }

    lastScannedBarcodeRef.current = clean;
    lastScanTimestampRef.current = now;

    // Check if the scanned barcode is a Station Pairing QR Code from PC screen
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

    // 1. Broadcast to cloud & local PC station immediately
    if (phone) {
      sendStationBarcodeScanInFirebase(phone, stationId, {
        barcode: clean,
        mode,
        productName: targetProduct ? targetProduct.name : `صنف #${clean}`
      }).catch(console.warn);
    }

    try {
      const stationScanPayload = JSON.stringify({
        type: 'STATION_BARCODE_SCANNED',
        barcode: clean,
        stationId: stationId.toUpperCase(),
        mode,
        timestamp: now
      });
      localStorage.setItem(`idenia_station_scan_${stationId.toUpperCase()}`, stationScanPayload);
      localStorage.setItem('idenia_last_scanned_barcode_event', stationScanPayload);
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(`idenia_station_${stationId.toUpperCase()}`);
        bc.postMessage({ barcode: clean, mode, timestamp: now });
        bc.close();
      }
    } catch {}

    // 2. Process according to active mode ('sale' vs 'return')
    if (mode === 'return') {
      // --- وضع الاسترجاع: إعادة المنتج للمخزن وزيادة الكمية ---
      if (targetProduct) {
        const currentQty = Number(targetProduct.quantity) || 0;
        const newQty = currentQty + 1;
        const updatedProduct: Product = {
          ...targetProduct,
          quantity: newQty,
          updated_at: new Date().toISOString()
        };
        db.saveProduct(updatedProduct);
        loadData();

        playBeep('return');
        setScanCount(prev => prev + 1);

        setLastScannedProduct({
          product: updatedProduct,
          time: now,
          mode: 'return',
          message: `🔄 تم استرجاع الصنف وإعادته للمخزن (+1)! الرصيد بالمخزن الآن: ${newQty}`
        });
      } else {
        playBeep('error');
        setLastScannedProduct({
          product: {
            id: '',
            name: `كود غير مسجل: ${clean}`,
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
          mode: 'return',
          message: `تنبيه: الكود (${clean}) غير مسجل في المخزن. تم إرساله لمحطة (${stationId}).`
        });
      }
    } else {
      // --- وضع البيع: إضافة المنتج لفاتورة البيع الحالية ---
      if (targetProduct) {
        playBeep('sale');
        setScanCount(prev => prev + 1);

        setLastScannedProduct({
          product: targetProduct,
          time: now,
          mode: 'sale',
          message: `تم التعرف بنجاح وإرسال الصنف لفاتورة محطة (${stationId})!`
        });
      } else {
        playBeep('error');
        setLastScannedProduct({
          product: {
            id: '',
            name: `كود غير مسجل: ${clean}`,
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
          mode: 'sale',
          message: `تم التعرف على الكود (${clean}) وإرساله لمحطة (${stationId}). الصنف غير مسجل بالمخزن.`
        });
      }
    }
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

        // Try BarcodeDetector / ZXing on captured photo
        const img = new Image();
        img.onload = async () => {
          // Priority 1: Native BarcodeDetector
          if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
            try {
              const detector = new (window as any).BarcodeDetector();
              const detected = await detector.detect(img);
              if (detected && detected.length > 0) {
                const code = detected[0]?.rawValue?.trim();
                if (code) {
                  handleBarcodeScanned(code);
                  return;
                }
              }
            } catch {}
          }

          // Priority 2: ZXing fallback
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
            alert('تعذر قراءة الباركود من الصورة. يرجى التقاط صورة أوضح للباركود.');
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
          {/* Zoom Toggle Button (1x / 1.5x / 2x) */}
          <button
            onClick={cycleZoom}
            className={`px-2.5 py-1.5 rounded-full backdrop-blur-md text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
              zoomLevel > 1
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title="تقريب الكاميرا لقراءة الباركود بدقة من مسافة مريحة"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>{zoomLevel}x</span>
          </button>

          {/* Switch Rear Lens Button */}
          <button
            onClick={switchRearLens}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all cursor-pointer"
            title="تبديل العدسة الخلفية"
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
            title={soundEnabled ? 'كتم الصفارة' : 'تشغيل الصفارة (صوت عالي)'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </header>

      {/* Main Fullscreen Video Viewfinder */}
      <div
        onClick={handleTapToFocus}
        className="relative flex-1 w-full h-full min-h-[300px] flex items-center justify-center bg-black overflow-hidden cursor-crosshair"
      >
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          style={{
            transform: zoomLevel > 1 && !hardwareZoomAvailable ? `scale(${zoomLevel})` : 'none',
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out'
          }}
          className="w-full h-full object-cover min-h-[300px]"
        />

        {/* Tap to Focus Ring Visual Indicator */}
        {focusRingCoords && (
          <div
            className="absolute pointer-events-none w-14 h-14 border-2 border-amber-400 rounded-full animate-ping z-30 flex items-center justify-center"
            style={{
              top: focusRingCoords.y - 28,
              left: focusRingCoords.x - 28
            }}
          >
            <Focus className="w-6 h-6 text-amber-300" />
          </div>
        )}

        {/* Laser Targeting Viewfinder Overlay */}
        {cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
            <div className={`relative w-72 h-72 sm:w-80 sm:h-80 border-2 rounded-3xl overflow-hidden shadow-2xl backdrop-brightness-105 transition-colors duration-300 ${
              mode === 'sale'
                ? 'border-emerald-400/60'
                : 'border-amber-400/60'
            }`}>
              {/* Viewfinder Corners */}
              <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-2xl ${
                mode === 'sale' ? 'border-emerald-400' : 'border-amber-400'
              }`} />
              <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-2xl ${
                mode === 'sale' ? 'border-emerald-400' : 'border-amber-400'
              }`} />
              <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-2xl ${
                mode === 'sale' ? 'border-emerald-400' : 'border-amber-400'
              }`} />
              <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-2xl ${
                mode === 'sale' ? 'border-emerald-400' : 'border-amber-400'
              }`} />

              {/* Glowing Fast Laser Scan Line */}
              <div
                className={`absolute left-0 right-0 h-0.5 shadow-lg ${
                  mode === 'sale'
                    ? 'bg-emerald-400 shadow-emerald-400/80'
                    : 'bg-amber-400 shadow-amber-400/80'
                }`}
                style={{
                  animation: 'scanLaser 1.5s ease-in-out infinite alternate'
                }}
              />

              {/* Center target dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-3 h-3 rounded-full opacity-70 ${
                  mode === 'sale' ? 'bg-emerald-400' : 'bg-amber-400'
                }`} />
              </div>
            </div>

            {/* Mode Banner Indicator */}
            <p className={`mt-4 text-xs font-black backdrop-blur-md px-4 py-1.5 rounded-full border shadow-lg text-center transition-all ${
              mode === 'sale'
                ? 'bg-emerald-950/80 border-emerald-400/40 text-emerald-200'
                : 'bg-amber-950/80 border-amber-400/40 text-amber-200'
            }`}>
              {mode === 'sale'
                ? `🛒 وضع البيع: وجّه الكاميرا نحو الكود (${stationId})`
                : `🔄 وضع الاسترجاع: وجّه الكاميرا لاسترجاع الصنف (+1)`}
            </p>
          </div>
        )}

        {/* Live Scanned Product Feedback Toast Card */}
        {lastScannedProduct && (
          <div className="absolute top-16 left-4 right-4 z-30 max-w-md mx-auto animate-in slide-in-from-top-4 duration-200">
            <div className={`p-3.5 rounded-2xl backdrop-blur-xl border shadow-2xl flex items-center gap-3 ${
              lastScannedProduct.mode === 'sale'
                ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100'
                : 'bg-amber-950/90 border-amber-500/60 text-amber-100'
            }`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                lastScannedProduct.mode === 'sale'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {lastScannedProduct.mode === 'sale' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <PackageCheck className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] text-white/70">
                  <span>
                    {lastScannedProduct.mode === 'sale' ? `محطة ${stationId}` : 'إعادة للمخزن'}
                  </span>
                  <span className="font-mono text-[10px]">
                    #{lastScannedProduct.product.barcode}
                  </span>
                </div>
                <h4 className="font-black text-sm text-white truncate mt-0.5">
                  {lastScannedProduct.product.name}
                </h4>
                <p className={`text-[11px] font-bold mt-0.5 ${
                  lastScannedProduct.mode === 'sale' ? 'text-emerald-300' : 'text-amber-300'
                }`}>
                  {lastScannedProduct.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Camera Error Fallback Screen */}
        {cameraError && (
          <div className="absolute inset-0 z-30 bg-black/95 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            <div className="max-w-sm w-full space-y-4 my-auto bg-zinc-900/90 border border-zinc-700 p-6 rounded-3xl backdrop-blur-xl">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg">
                <Camera className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="font-black text-base md:text-lg text-white">
                  قارئ باركود الكاشير
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
                  <span>تبديل عدسة الكاميرا 🔄</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Camera className="w-4 h-4" />
                  <span>التقاط صورة للباركود فوراً</span>
                </button>

                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="w-full py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>إعادة تشغيل الكاميرا</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- THE TWO BOTTOM BUTTONS: بيع (Sale) vs استرجاع (Return) --- */}
      <div className="z-20 px-3 pt-2.5 pb-2 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {/* زر بيع */}
          <button
            type="button"
            onClick={() => {
              setMode('sale');
              playBeep('sale');
            }}
            className={`py-3 px-4 rounded-2xl flex items-center justify-center gap-2.5 font-black transition-all cursor-pointer active:scale-98 ${
              mode === 'sale'
                ? 'bg-gradient-to-r from-[#2E7D32] to-green-600 text-white shadow-xl shadow-emerald-950/70 ring-2 ring-emerald-400 scale-[1.02]'
                : 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              mode === 'sale' ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400'
            }`}>
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-right leading-tight min-w-0">
              <span className="text-sm font-black">بيع</span>
              <span className="text-[10px] font-normal opacity-85 truncate">إضافة لفاتورة البيع</span>
            </div>
            {mode === 'sale' && (
              <span className="mr-auto w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </button>

          {/* زر استرجاع */}
          <button
            type="button"
            onClick={() => {
              setMode('return');
              playBeep('return');
            }}
            className={`py-3 px-4 rounded-2xl flex items-center justify-center gap-2.5 font-black transition-all cursor-pointer active:scale-98 ${
              mode === 'return'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xl shadow-amber-950/70 ring-2 ring-amber-400 scale-[1.02]'
                : 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              mode === 'return' ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400'
            }`}>
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-right leading-tight min-w-0">
              <span className="text-sm font-black">استرجاع</span>
              <span className="text-[10px] font-normal opacity-85 truncate">إعادة للمخزن</span>
            </div>
            {mode === 'return' && (
              <span className="mr-auto w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Bottom Floating Bar */}
      <footer className="z-20 px-4 py-3 bg-black flex items-center justify-between gap-3 border-t border-white/10">
        <div className="text-xs font-bold text-white/90">
          <span>العمليات: </span>
          <span className="text-emerald-400 font-mono font-black">{scanCount} مسح</span>
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
            <span>نقطة ({stationId})</span>
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
                <span>إدخال الباركود يدوياً ({mode === 'sale' ? 'بيع' : 'استرجاع للمخزن'})</span>
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
                  className={`px-5 py-2 text-white text-xs font-black rounded-xl shadow-md cursor-pointer ${
                    mode === 'sale'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-amber-600 hover:bg-amber-500'
                  }`}
                >
                  {mode === 'sale' ? 'إرسال للفاتورة' : 'استرجاع للمخزن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
