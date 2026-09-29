import React, { useState } from 'react';
import { X, Printer, Barcode as BarcodeIcon, Check, Layers, LayoutGrid, FileText, Eye, EyeOff } from 'lucide-react';
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

// Authentic scanner-readable Barcode SVG generator (EAN-13 & Code 128) with compact mini label lines
function generateBarcodeSvg(code: string): string {
  const clean = (code || '2000000000000').trim();

  // 1. If 13 digits: generate standard commercial EAN-13
  if (/^\d{13}$/.test(clean)) {
    const digits = clean.split('').map(Number);
    const firstDigit = digits[0];
    const parity = EAN_PARITY[firstDigit] || 'LLLLLL';

    let bits = '';
    bits += '0000000'; // Quiet zone left
    bits += '101';     // Left Guard

    for (let i = 1; i <= 6; i++) {
      const d = digits[i];
      const useG = parity[i - 1] === 'G';
      bits += useG ? EAN_G[d] : EAN_L[d];
    }

    bits += '01010'; // Center Guard

    for (let i = 7; i <= 12; i++) {
      const d = digits[i];
      bits += EAN_R[d];
    }

    bits += '101';     // Right Guard
    bits += '0000000'; // Quiet zone right

    const moduleWidth = 1.4;
    const height = 28;
    const totalWidth = bits.length * moduleWidth;

    let rects = '';
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === '1') {
        const x = i * moduleWidth;
        rects += `<rect x="${x}" y="0" width="${moduleWidth}" height="${height}" fill="#000000" />`;
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" class="w-full h-6" preserveAspectRatio="none">
      ${rects}
    </svg>`;
  }

  // 2. Otherwise: generate standard Code 128 (Code B)
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

  let checksum = startCode;
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);
  codes.push(106); // Stop Code

  let bits = '0000000000';
  for (const c of codes) {
    const pattern = CODE128_PATTERNS[c] || '212222';
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10);
      const isBar = i % 2 === 0;
      bits += (isBar ? '1' : '0').repeat(width);
    }
  }
  bits += '0000000000';

  const moduleWidth = 1.3;
  const height = 28;
  const totalWidth = bits.length * moduleWidth;

  let rects = '';
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      const x = i * moduleWidth;
      rects += `<rect x="${x}" y="0" width="${moduleWidth}" height="${height}" fill="#000000" />`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" class="w-full h-6" preserveAspectRatio="none">
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

// A4 Capacity Constant for Compact Mini Stickers (5 cols x 13 rows)
const STICKERS_PER_A4_PAGE = 65;

export const BarcodeStickerModal: React.FC<BarcodeStickerModalProps> = ({
  product,
  settings,
  isOpen,
  onClose
}) => {
  const [quantity, setQuantity] = useState<number>(10);
  const [paperMode, setPaperMode] = useState<'sheet' | 'roll'>('sheet');
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showShopName, setShowShopName] = useState<boolean>(true);

  if (!isOpen || !product) return null;

  const totalPages = paperMode === 'sheet' ? Math.ceil(quantity / STICKERS_PER_A4_PAGE) : 1;

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=900,height=700');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة لطباعة ملصقات الباركود.');
      return;
    }

    const shopTitle = settings.shop_name || 'ايدينيا - حِسبة';
    const productName = product.name;
    const barcodeSvg = generateBarcodeSvg(product.barcode || '');
    const barcodeText = formatBarcodeText(product.barcode || '');
    const priceText = `${product.selling_price.toFixed(2)} ${settings.currency_symbol}`;

    if (paperMode === 'sheet') {
      // Chunk quantity into A4 pages (65 stickers per page max)
      const pageChunks: number[] = [];
      let remainingQty = quantity;
      while (remainingQty > 0) {
        const countForThisPage = Math.min(remainingQty, STICKERS_PER_A4_PAGE);
        pageChunks.push(countForThisPage);
        remainingQty -= countForThisPage;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8" />
            <title>طباعة ملصقات الباركود المصغرة (${quantity}) - ${productName}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                margin: 0;
                padding: 0;
                background: #fff;
                color: #000;
                -webkit-print-color-adjust: exact;
              }
              .a4-page {
                width: 210mm;
                height: 297mm;
                padding: 5mm 4mm;
                box-sizing: border-box;
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 2mm 1.5mm;
                page-break-after: always;
                break-after: page;
                align-content: start;
                overflow: hidden;
              }
              .sticker-card {
                border: 0.8px dashed #888;
                border-radius: 3px;
                padding: 2px 1.5px;
                text-align: center;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                align-items: center;
                height: 20mm;
                box-sizing: border-box;
                overflow: hidden;
                background: #fff;
              }
              .shop-name {
                font-size: 6.5pt;
                font-weight: 700;
                color: #444;
                line-height: 1;
                max-width: 100%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .product-name {
                font-size: 7.5pt;
                font-weight: 900;
                color: #000;
                line-height: 1;
                max-width: 100%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .barcode-box {
                width: 95%;
                height: 16px;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0.5px 0;
              }
              .barcode-box svg {
                width: 100%;
                height: 100%;
              }
              .barcode-text {
                font-family: monospace;
                font-size: 6.5pt;
                font-weight: 900;
                letter-spacing: 1px;
                line-height: 1;
              }
              .price-tag {
                font-size: 7.5pt;
                font-weight: 900;
                color: #000;
                line-height: 1;
              }
            </style>
          </head>
          <body>
            ${pageChunks.map((chunkSize) => `
              <div class="a4-page">
                ${Array.from({ length: chunkSize }).map(() => `
                  <div class="sticker-card">
                    ${showShopName ? `<div class="shop-name">${shopTitle}</div>` : ''}
                    <div class="product-name">${productName}</div>
                    <div class="barcode-box">${barcodeSvg}</div>
                    <div class="barcode-text">${barcodeText}</div>
                    ${showPrice ? `<div class="price-tag">${priceText}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            `).join('')}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
    } else {
      // Single Label Thermal Roll (Compact Mini Roll)
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8" />
            <title>رول باركود حراري مصغر (${quantity}) - ${productName}</title>
            <style>
              @page {
                size: 38mm 22mm;
                margin: 0;
              }
              body {
                font-family: system-ui, -apple-system, sans-serif;
                margin: 0;
                padding: 0;
                background: #fff;
                color: #000;
                -webkit-print-color-adjust: exact;
              }
              .sticker-card {
                width: 38mm;
                height: 22mm;
                padding: 2px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                align-items: center;
                text-align: center;
                page-break-after: always;
                break-after: page;
              }
              .shop-name {
                font-size: 6.5pt;
                font-weight: 700;
                color: #333;
                line-height: 1;
              }
              .product-name {
                font-size: 7.5pt;
                font-weight: 900;
                max-height: 10px;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                width: 100%;
                line-height: 1;
              }
              .price {
                font-size: 8pt;
                font-weight: 900;
                color: #000;
                line-height: 1;
              }
              .barcode-svg {
                width: 95%;
                height: 18px;
              }
              .barcode-text {
                font-family: monospace;
                font-size: 7pt;
                font-weight: 900;
                letter-spacing: 1px;
                line-height: 1;
              }
            </style>
          </head>
          <body>
            ${Array.from({ length: quantity }).map(() => `
              <div class="sticker-card">
                ${showShopName ? `<div class="shop-name">${shopTitle}</div>` : ''}
                <div class="product-name">${productName}</div>
                <div class="barcode-svg">${barcodeSvg}</div>
                <div class="barcode-text">${barcodeText}</div>
                ${showPrice ? `<div class="price">${priceText}</div>` : ''}
              </div>
            `).join('')}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
    }
    printWindow.document.close();
  };

  const setQtySafely = (val: number) => {
    const clamped = Math.max(1, Math.min(500, val));
    setQuantity(clamped);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-4 animate-in fade-in" dir="rtl">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-lg w-full p-5 space-y-4 text-right max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#2E7D32] dark:text-[#66BB6A] flex items-center justify-center shadow-xs">
              <BarcodeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm md:text-base text-gray-900 dark:text-white">
                طباعة ملصقات الباركود المصغرة
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                حجم مصغر دقيق للأقلام والأكياس والمنتجات الصغيرة والكبيرة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Mode Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>نوع ورق الطباعة:</span>
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-zinc-900 rounded-2xl">
            <button
              type="button"
              onClick={() => setPaperMode('sheet')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                paperMode === 'sheet'
                  ? 'bg-white dark:bg-zinc-800 text-[#2E7D32] dark:text-[#66BB6A] shadow-xs font-black'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ورق A4 (65 ملصق/ورقة)</span>
            </button>
            <button
              type="button"
              onClick={() => setPaperMode('roll')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                paperMode === 'roll'
                  ? 'bg-white dark:bg-zinc-800 text-[#2E7D32] dark:text-[#66BB6A] shadow-xs font-black'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>رول حراري مصغر (38×22)</span>
            </button>
          </div>
        </div>

        {/* Print Content Customization Toggles (Show/Hide Price & Store Name) */}
        <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
          <span className="text-xs font-extrabold text-gray-800 dark:text-gray-200 block">
            خيارات المظهر على الملصق:
          </span>
          <div className="grid grid-cols-2 gap-2">
            {/* Toggle Price */}
            <button
              type="button"
              onClick={() => setShowPrice(!showPrice)}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                showPrice
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-[#2E7D32] dark:text-[#66BB6A]'
                  : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-gray-700 text-gray-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {showPrice ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>سعر المنتج</span>
              </div>
              <span className="text-[10px] font-black">{showPrice ? 'مُفعّل' : 'مخفي'}</span>
            </button>

            {/* Toggle Store Name */}
            <button
              type="button"
              onClick={() => setShowShopName(!showShopName)}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                showShopName
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-[#2E7D32] dark:text-[#66BB6A]'
                  : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-gray-700 text-gray-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {showShopName ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>اسم المحل</span>
              </div>
              <span className="text-[10px] font-black">{showShopName ? 'مُفعّل' : 'مخفي'}</span>
            </button>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="space-y-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <span>عدد الملصقات المطلوب طباعتها:</span>
            </label>
            <span className="text-xs font-black text-[#2E7D32] dark:text-[#66BB6A]">
              {quantity} {quantity === 1 ? 'ملصق' : 'ملصقات'}
              {paperMode === 'sheet' && ` (${totalPages} ${totalPages === 1 ? 'ورقة A4' : 'صفحات A4'})`}
            </span>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[10, 30, 65, 130].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setQtySafely(num)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  quantity === num
                    ? 'bg-[#2E7D32] text-white shadow-xs scale-105'
                    : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-500'
                }`}
              >
                {num === 65 ? '65 (ورقة)' : num === 130 ? '130 (ورقتين)' : `${num} ملصق`}
              </button>
            ))}

            {/* Custom Input */}
            <div className="flex items-center gap-1 mr-auto">
              <span className="text-[11px] text-gray-500 font-bold">مخصص:</span>
              <input
                type="number"
                min={1}
                max={500}
                value={quantity}
                onChange={(e) => setQtySafely(parseInt(e.target.value, 10) || 1)}
                className="w-16 py-1 px-2 text-center text-xs font-black border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2E7D32]"
              />
            </div>
          </div>
        </div>

        {/* Interactive Compact Sticker Preview */}
        <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl flex flex-col items-center justify-center space-y-2">
          <div className="flex items-center justify-between w-full text-[11px] text-gray-500 dark:text-gray-400 font-bold px-1">
            <span>معاينة المقاس المصغر الحقيقي (Mini Label):</span>
            <span className="text-[#2E7D32] dark:text-[#66BB6A] font-black">
              مناسب للأقلام والعلب الصغيرة
            </span>
          </div>

          {paperMode === 'sheet' ? (
            /* Mini A4 Grid Preview (5 cols x N rows) */
            <div className="w-full bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-gray-300 dark:border-gray-800 shadow-inner max-h-52 overflow-y-auto">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                {Array.from({ length: Math.min(quantity, 15) }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-1 bg-white text-black rounded-md border border-dashed border-gray-300 flex flex-col items-center justify-between text-center h-[52px] shadow-2xs"
                  >
                    {showShopName && (
                      <div className="text-[7px] font-bold text-gray-600 truncate max-w-full leading-tight">
                        {settings.shop_name || 'ايدينيا - حِسبة'}
                      </div>
                    )}
                    <div className="text-[8px] font-black text-gray-900 truncate max-w-full leading-tight">
                      {product.name}
                    </div>
                    <div
                      className="w-full flex justify-center py-0.5"
                      dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(product.barcode || '') }}
                    />
                    <div className="font-mono text-[7px] font-black tracking-tighter text-black leading-none">
                      {formatBarcodeText(product.barcode || '')}
                    </div>
                    {showPrice && (
                      <div className="text-[7.5px] font-black text-[#2E7D32] leading-tight">
                        {product.selling_price.toFixed(2)} {settings.currency_symbol}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {quantity > 15 && (
                <div className="text-center text-[10px] text-gray-400 font-bold mt-2">
                  + {quantity - 15} ملصق إضافي بنفس الحجم المصغر (موزعة على {totalPages} صفحة A4)...
                </div>
              )}
            </div>
          ) : (
            /* Single Roll Sticker Preview */
            <div className="w-44 p-2 bg-white text-black rounded-lg border-2 border-dashed border-gray-300 shadow-xs flex flex-col items-center justify-center text-center space-y-0.5">
              {showShopName && (
                <div className="text-[9px] font-bold text-gray-600 truncate max-w-full">
                  {settings.shop_name || 'ايدينيا - حِسبة'}
                </div>
              )}
              <div className="text-xs font-black text-gray-900 truncate max-w-full">
                {product.name}
              </div>

              <div
                className="w-full flex justify-center py-0.5"
                dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(product.barcode || '') }}
              />

              <div className="font-mono text-[10px] font-black tracking-wider text-black">
                {formatBarcodeText(product.barcode || '')}
              </div>

              {showPrice && (
                <div className="text-xs font-black text-[#2E7D32] pt-0.5">
                  {product.selling_price.toFixed(2)} {settings.currency_symbol}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
          <div className="font-bold flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>توفير أقصى: الورقة الـ A4 تتسع لـ 65 ملصقاً مصغراً منسقاً!</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            تم ضبط الأبعاد الدقيقة لتلصق على أرق المنتجات، مع تقسيم تلقائي للورق عند طلب أكثر من 65 ملصقاً.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة ({quantity}) ملصق الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
