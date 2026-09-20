import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/models.dart';

class PrinterService {
  static Future<void> printThermalReceipt({
    required Sale sale,
    required AppSettings settings,
  }) async {
    final pdf = pw.Document();

    // 80mm = 226 points width, 58mm = 164 points width
    final pageWidth = settings.receiptWidthMm == 58 ? 58 * PdfPageFormat.mm : 80 * PdfPageFormat.mm;

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat(pageWidth, double.infinity, marginAll: 8),
        build: (pw.Context context) {
          return pw.Directionality(
            textDirection: pw.TextDirection.rtl,
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.center,
              children: [
                // Header
                pw.Text(
                  settings.storeName,
                  style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
                ),
                pw.SizedBox(height: 2),
                pw.Text(settings.address, style: const pw.TextStyle(fontSize: 9)),
                pw.Text('هاتف: ${settings.phone}', style: const pw.TextStyle(fontSize: 9)),
                pw.SizedBox(height: 6),
                pw.Divider(thickness: 1),

                // Invoice Info
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('فاتورة #: ${sale.invoiceNumber}', style: const pw.TextStyle(fontSize: 9)),
                    pw.Text(sale.date.split('T')[0], style: const pw.TextStyle(fontSize: 9)),
                  ],
                ),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('العميل: ${sale.customerName}', style: const pw.TextStyle(fontSize: 9)),
                    pw.Text(sale.paymentType == 'cash' ? 'نقدي' : 'آجل', style: const pw.TextStyle(fontSize: 9)),
                  ],
                ),
                pw.SizedBox(height: 4),
                pw.Divider(thickness: 0.5),

                // Table Header
                pw.Row(
                  children: [
                    pw.Expanded(flex: 3, child: pw.Text('الصنف', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold))),
                    pw.Expanded(flex: 1, child: pw.Text('الكمية', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold))),
                    pw.Expanded(flex: 2, child: pw.Text('السعر', textAlign: pw.TextAlign.left, style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold))),
                  ],
                ),
                pw.SizedBox(height: 2),

                // Items List
                ...sale.items.map((item) {
                  return pw.Padding(
                    padding: const pw.EdgeInsets.symmetric(vertical: 2),
                    child: pw.Row(
                      children: [
                        pw.Expanded(flex: 3, child: pw.Text(item.productName, style: const pw.TextStyle(fontSize: 8))),
                        pw.Expanded(flex: 1, child: pw.Text('${item.quantity}', textAlign: pw.TextAlign.center, style: const pw.TextStyle(fontSize: 8))),
                        pw.Expanded(flex: 2, child: pw.Text('${item.total.toStringAsFixed(2)} ${settings.currency}', textAlign: pw.TextAlign.left, style: const pw.TextStyle(fontSize: 8))),
                      ],
                    ),
                  );
                }).toList(),

                pw.Divider(thickness: 0.5),

                // Totals
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('الإجمالي:', style: const pw.TextStyle(fontSize: 9)),
                    pw.Text('${sale.totalAmount.toStringAsFixed(2)} ${settings.currency}', style: const pw.TextStyle(fontSize: 9)),
                  ],
                ),
                if (sale.discount > 0)
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('الخصم:', style: const pw.TextStyle(fontSize: 9)),
                      pw.Text('-${sale.discount.toStringAsFixed(2)} ${settings.currency}', style: const pw.TextStyle(fontSize: 9)),
                    ],
                  ),
                pw.SizedBox(height: 2),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('المبلغ النهائي:', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                    pw.Text('${sale.finalAmount.toStringAsFixed(2)} ${settings.currency}', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                  ],
                ),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('المدفوع:', style: const pw.TextStyle(fontSize: 9)),
                    pw.Text('${sale.paidAmount.toStringAsFixed(2)} ${settings.currency}', style: const pw.TextStyle(fontSize: 9)),
                  ],
                ),
                if (sale.remainingAmount > 0)
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('المتبقي (آجل):', style: pw.TextStyle(fontSize: 9, color: PdfColors.red900)),
                      pw.Text('${sale.remainingAmount.toStringAsFixed(2)} ${settings.currency}', style: pw.TextStyle(fontSize: 9, color: PdfColors.red900)),
                    ],
                  ),

                pw.SizedBox(height: 6),
                pw.Divider(thickness: 1),

                // Footer
                pw.Text(
                  settings.receiptFooter,
                  textAlign: pw.TextAlign.center,
                  style: const pw.TextStyle(fontSize: 8),
                ),
                pw.SizedBox(height: 4),
                pw.BarcodeWidget(
                  data: sale.invoiceNumber,
                  barcode: pw.Barcode.code128(),
                  width: 120,
                  height: 30,
                ),
              ],
            ),
          );
        },
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }
}
