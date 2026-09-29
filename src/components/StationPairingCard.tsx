import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Smartphone, Wifi, WifiOff, QrCode, CheckCircle2, RefreshCw, Edit2, Zap } from 'lucide-react';
import {
  subscribeToStationBarcodeScanInFirebase,
  subscribeToStationPhonePresenceInFirebase
} from '../services/firebase';

interface StationPairingCardProps {
  stationId: string;
  onStationIdChange: (newStationId: string) => void;
  merchantPhone: string;
  onBarcodeReceived: (barcode: string, mode: 'sale' | 'return') => void;
}

export const StationPairingCard: React.FC<StationPairingCardProps> = ({
  stationId,
  onStationIdChange,
  merchantPhone,
  onBarcodeReceived
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isPhoneConnected, setIsPhoneConnected] = useState<boolean>(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string>('');
  const [lastScannedItem, setLastScannedItem] = useState<{ barcode: string; time: number } | null>(null);
  const [isEditingStation, setIsEditingStation] = useState<boolean>(false);
  const [customStationInput, setCustomStationInput] = useState<string>(stationId);

  // Generate QR Code containing pairing information
  useEffect(() => {
    const pairingPayload = JSON.stringify({
      type: 'IDENIA_POS_PAIRING',
      stationId: stationId.toUpperCase(),
      merchantPhone: merchantPhone.replace(/[^0-9]/g, '')
    });

    QRCode.toDataURL(pairingPayload, {
      width: 140,
      margin: 1,
      color: {
        dark: '#1B5E20',
        light: '#FFFFFF'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.warn('QR Code generation error:', err));
  }, [stationId, merchantPhone]);

  // Subscribe to phone presence for this station
  useEffect(() => {
    if (!merchantPhone) return;

    const unsubscribePresence = subscribeToStationPhonePresenceInFirebase(
      merchantPhone,
      stationId,
      presence => {
        setIsPhoneConnected(presence.isConnected);
        if (presence.deviceName) setConnectedDeviceName(presence.deviceName);
      }
    );

    return () => unsubscribePresence();
  }, [merchantPhone, stationId]);

  // Subscribe to live cloud barcode scans targeted to this station
  useEffect(() => {
    if (!merchantPhone) return;

    const unsubscribeScans = subscribeToStationBarcodeScanInFirebase(
      merchantPhone,
      stationId,
      scan => {
        if (scan && scan.barcode) {
          setLastScannedItem({ barcode: scan.barcode, time: Date.now() });
          onBarcodeReceived(scan.barcode, scan.mode || 'sale');
        }
      }
    );

    // Also listen locally via BroadcastChannel/LocalStorage in case on same network
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `idenia_station_scan_${stationId.toUpperCase()}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.barcode) {
            setLastScannedItem({ barcode: parsed.barcode, time: Date.now() });
            onBarcodeReceived(parsed.barcode, parsed.mode || 'sale');
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsubscribeScans();
      window.removeEventListener('storage', handleStorage);
    };
  }, [merchantPhone, stationId, onBarcodeReceived]);

  const handleSaveStation = () => {
    const clean = customStationInput.trim().toUpperCase() || 'POS-1';
    onStationIdChange(clean);
    setIsEditingStation(false);
  };

  return (
    <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs p-4 space-y-3 select-none text-right">
      {/* Top Header of Card */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isPhoneConnected
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-[#2E7D32] dark:text-[#66BB6A]'
              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
          }`}>
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>قارئ باركود الهاتف المتصل</span>
              <span className="font-mono text-[10px] bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                {stationId}
              </span>
            </h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              ربط هاتف كاشير محدد بنقطة البيع هذه فقط
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5">
          {isPhoneConnected ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-[#2E7D32] dark:text-[#66BB6A] border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>متصل بنشاط</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700">
              <WifiOff className="w-3 h-3" />
              <span>في انتظار الربط</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Content: QR Code & Live status */}
      <div className="flex items-center gap-3">
        {/* QR Code thumbnail */}
        <div className="relative shrink-0 p-1.5 bg-white rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-xl"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 flex items-center justify-center">
              <QrCode className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          )}
          {isPhoneConnected && (
            <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Pairing Instructions & Live Scanned Item */}
        <div className="flex-1 space-y-1.5 min-w-0">
          {isPhoneConnected ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <Wifi className="w-3.5 h-3.5" />
                <span>الهاتف جاهز للالتقاط المباشر</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-tight">
                أي باركود يُمسح من الهاتف يدخل فوراً في فاتورة هذه الشاشة حصراً.
              </p>
              {lastScannedItem && (
                <div className="mt-1 p-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[10px] text-emerald-800 dark:text-emerald-300 font-mono font-bold flex items-center justify-between">
                  <span>آخر صنف ملتقط:</span>
                  <span className="bg-white dark:bg-zinc-800 px-1 rounded shadow-2xs">#{lastScannedItem.barcode}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                افتح <strong className="text-[#2E7D32]">كاميرا الكاشير</strong> من هاتفك وامسح رمز الـ QR أو ادخل كود المحطة <span className="font-mono font-black text-gray-900 dark:text-white bg-gray-100 dark:bg-zinc-800 px-1 rounded">({stationId})</span>.
              </p>
              <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                ⚡ يمنع أي تداخل بين الكاشيرات؛ كل هاتف يتحكم بنقطته فقط.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer controls: Station Switch / Edit */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
        {isEditingStation ? (
          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              value={customStationInput}
              onChange={e => setCustomStationInput(e.target.value)}
              placeholder="مثال: POS-1 أو كاشير 1"
              className="flex-1 px-2.5 py-1 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white font-mono"
            />
            <button
              onClick={handleSaveStation}
              className="px-3 py-1 bg-[#2E7D32] text-white rounded-xl font-bold cursor-pointer hover:bg-[#256628]"
            >
              حفظ
            </button>
            <button
              onClick={() => setIsEditingStation(false)}
              className="px-2 py-1 text-gray-500 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              إلغاء
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500">كود المحطة:</span>
              <span className="font-mono font-black text-xs text-gray-900 dark:text-white">{stationId}</span>
              <button
                onClick={() => {
                  setCustomStationInput(stationId);
                  setIsEditingStation(true);
                }}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                title="تعديل اسم أو رقم المحطة"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {['POS-1', 'POS-2', 'POS-3'].map(preset => (
                <button
                  key={preset}
                  onClick={() => onStationIdChange(preset)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    stationId === preset
                      ? 'bg-[#2E7D32] text-white shadow-2xs'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
