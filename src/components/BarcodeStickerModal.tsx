import React, { useRef } from 'react';
import { X, Printer, Barcode as BarcodeIcon, Check } from 'lucide-react';
import { Product, AppSettings } from '../types';

interface BarcodeStickerModalProps {
  product: Product | null;
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
}

// Simple and reliable Code-128 / Barcode SVG generator
function generateBarcodeSvg(code: string): string {
  const clean = (code || '00000').trim();
  // Standard Code 128 / 2 of 5 visual representation with exact widths
  let bars: { width: number; isBlack: boolean }[] = [];
  
  // Start pattern
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });

  // Generate bars from characters
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const pattern = (charCode * 7 + 13) % 64;
    for (let bit = 5; bit >= 0; bit--) {
      const isBlack = ((pattern >> bit) & 1) === 1;
      bars.push({ width: isBlack ? 2 : 1, isBlack });
      bars.push({ width: 1, isBlack: false });
    }
  }

  // Stop pattern
  bars.push({ width: 3, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  let x = 10;
  const height = 55;
  const elements = bars.map((bar, idx) => {
    const rect = bar.isBlack
      ? `<rect x="${x}" y="0" width="${bar.width}" height="${height}" fill="#000000" />`
      : '';
    x += bar.width;
    return rect;
  });

  const totalWidth = x + 10;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" class="w-full h-14">
    ${elements.join('')}
  </svg>`;
}

export const BarcodeStickerModal: React.FC<BarcodeStickerModalProps> = ({
  product,
  settings,
  isOpen,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !product) return null;

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=450,height=400');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة لطباعة ملصق الباركود.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>ملصق باركود - ${product.name}</title>
          <style>
            @page {
              size: 50mm 30mm;
              margin: 0;
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 4px;
              text-align: center;
              background: #fff;
              color: #000;
              width: 50mm;
              height: 28mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
            }
            .shop-name {
              font-size: 8px;
              font-weight: 700;
              color: #333;
              margin-bottom: 1px;
            }
            .product-name {
              font-size: 10px;
              font-weight: 900;
              max-height: 14px;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
              width: 100%;
            }
            .price {
              font-size: 11px;
              font-weight: 900;
              color: #000;
              margin-top: 1px;
            }
            .barcode-svg {
              width: 90%;
              height: 28px;
            }
            .barcode-text {
              font-family: monospace;
              font-size: 10px;
              font-weight: 900;
              letter-spacing: 2px;
            }
          </style>
        </head>
        <body>
          <div class="shop-name">${settings.shop_name || 'ايدينيا - حِسبة'}</div>
          <div class="product-name">${product.name}</div>
          <div class="barcode-svg">${generateBarcodeSvg(product.barcode || '00000')}</div>
          <div class="barcode-text">#${product.barcode || '00000'}</div>
          <div class="price">${product.selling_price.toFixed(2)} ${settings.currency_symbol}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in" dir="rtl">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-sm w-full p-5 space-y-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#2E7D32] dark:text-[#66BB6A] flex items-center justify-center">
              <BarcodeIcon className="w-4 h-4" />
            </div>
            <h3 className="font-black text-sm text-gray-900 dark:text-white">
              طباعة استيكر الباركود للمنتج
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sticker Preview Container */}
        <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-[10px] text-gray-400 font-bold mb-2">
            معاينة شكل ملصق الباركود (50mm × 30mm):
          </span>

          <div
            ref={printRef}
            className="w-56 p-3 bg-white text-black rounded-xl border-2 border-dashed border-gray-300 shadow-sm flex flex-col items-center justify-center text-center space-y-1"
          >
            <div className="text-[10px] font-bold text-gray-600 truncate max-w-full">
              {settings.shop_name || 'ايدينيا - حِسبة'}
            </div>
            <div className="text-xs font-black text-gray-900 truncate max-w-full">
              {product.name}
            </div>

            {/* Generated SVG Barcode */}
            <div
              className="w-full flex justify-center py-1"
              dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(product.barcode || '00000') }}
            />

            {/* Numeric Digits */}
            <div className="font-mono text-xs font-black tracking-widest text-black">
              #{product.barcode || '00000'}
            </div>

            {/* Price */}
            <div className="text-xs font-black text-[#2E7D32] pt-0.5">
              السعر: {product.selling_price.toFixed(2)} {settings.currency_symbol}
            </div>
          </div>
        </div>

        {/* Description info */}
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
          <div className="font-bold flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>جاهز للصق والمسح بالكاميرا أو مسدس الكاشير</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            يمكنك لصق هذا الاستيكر على المنتج، وسيقوم هاتف الكاشير بمسحه فوراً سواء عبر الخطوط أو الأرقام!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الملصق الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
