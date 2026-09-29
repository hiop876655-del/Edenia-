import React, { useRef } from 'react';
import { X, Printer, Barcode as BarcodeIcon, Check } from 'lucide-react';
import { Product, AppSettings } from '../types';

interface BarcodeStickerModalProps {
  product: Product | null;
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
}

// Standard Code 128 Patterns (107 patterns, index 0 to 106)
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

// Standard EAN-13 Coding Tables
const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const EAN_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

// Authentic scanner-readable Barcode SVG generator (EAN-13 & Code 128)
function generateBarcodeSvg(code: string): string {
  const clean = (code || '2000000000000').trim();

  // 1. If 13 digits: generate standard commercial EAN-13
  if (/^\d{13}$/.test(clean)) {
    const digits = clean.split('').map(Number);
    const firstDigit = digits[0];
    const parity = EAN_PARITY[firstDigit] || 'LLLLLL';

    let bits = '';
    // Quiet zone left (7 modules)
    bits += '0000000';
    // Left Guard
    bits += '101';

    // 6 Left Digits
    for (let i = 1; i <= 6; i++) {
      const d = digits[i];
      const useG = parity[i - 1] === 'G';
      bits += useG ? EAN_G[d] : EAN_L[d];
    }

    // Center Guard
    bits += '01010';

    // 6 Right Digits
    for (let i = 7; i <= 12; i++) {
      const d = digits[i];
      bits += EAN_R[d];
    }

    // Right Guard
    bits += '101';
    // Quiet zone right (7 modules)
    bits += '0000000';

    const moduleWidth = 2;
    const height = 52;
    const totalWidth = bits.length * moduleWidth;

    let rects = '';
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === '1') {
        const x = i * moduleWidth;
        rects += `<rect x="${x}" y="0" width="${moduleWidth}" height="${height}" fill="#000000" />`;
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" class="w-full h-14" preserveAspectRatio="none">
      ${rects}
    </svg>`;
  }

  // 2. Otherwise: generate standard Code 128 (Code B) for any alphanumeric text
  const startCode = 104; // Start B
  const codes: number[] = [startCode];

  for (let i = 0; i < clean.length; i++) {
    const ascii = clean.charCodeAt(i);
    if (ascii >= 32 && ascii <= 126) {
      codes.push(ascii - 32);
    } else {
      codes.push(0);
    }
  }

  // Calculate Checksum Modulo 103
  let checksum = startCode;
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);
  codes.push(106); // Stop Code

  // Build binary pattern
  let bits = '0000000000'; // Quiet zone
  for (const c of codes) {
    const pattern = CODE128_PATTERNS[c] || '212222';
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10);
      const isBar = i % 2 === 0;
      bits += (isBar ? '1' : '0').repeat(width);
    }
  }
  bits += '0000000000'; // Quiet zone

  const moduleWidth = 1.8;
  const height = 52;
  const totalWidth = bits.length * moduleWidth;

  let rects = '';
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      const x = i * moduleWidth;
      rects += `<rect x="${x}" y="0" width="${moduleWidth}" height="${height}" fill="#000000" />`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" class="w-full h-14" preserveAspectRatio="none">
    ${rects}
  </svg>`;
}

function formatBarcodeText(code: string): string {
  const clean = (code || '').trim();
  if (/^\d{13}$/.test(clean)) {
    return `${clean.slice(0, 1)}  ${clean.slice(1, 7)}  ${clean.slice(7, 13)}`;
  }
  return clean ? `#${clean}` : '#00000';
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
          <div class="barcode-svg">${generateBarcodeSvg(product.barcode || '')}</div>
          <div class="barcode-text">${formatBarcodeText(product.barcode || '')}</div>
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
              dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(product.barcode || '') }}
            />

            {/* Numeric Digits */}
            <div className="font-mono text-xs font-black tracking-widest text-black">
              {formatBarcodeText(product.barcode || '')}
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
