import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/database_helper.dart';
import '../services/printer_service.dart';

class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({Key? key}) : super(key: key);

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  List<Sale> sales = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSales();
  }

  Future<void> _loadSales() async {
    setState(() => isLoading = true);
    final list = await DatabaseHelper.instance.getSales();
    setState(() {
      sales = list;
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : sales.isEmpty
              ? const Center(child: Text('لا توجد فواتير مسجلة في الأرشيف'))
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: sales.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final s = sales[index];
                    final isCash = s.paymentType == 'cash';

                    return Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: ExpansionTile(
                        leading: CircleAvatar(
                          backgroundColor: isCash ? Colors.green.shade50 : Colors.amber.shade50,
                          child: Icon(
                            isCash ? Icons.receipt_long : Icons.credit_card,
                            color: isCash ? const Color(0xFF2E7D32) : Colors.amber.shade800,
                          ),
                        ),
                        title: Row(
                          children: [
                            Expanded(child: Text('فاتورة #${s.invoiceNumber}', style: const TextStyle(fontWeight: FontWeight.bold))),
                            Text(
                              '${s.finalAmount.toStringAsFixed(2)} ج.م',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF2E7D32)),
                            ),
                          ],
                        ),
                        subtitle: Text('${s.customerName} • ${s.date.split('T')[0]} • ${s.paymentType == "cash" ? "نقدي" : "آجل"}'),
                        children: [
                          const Divider(height: 1),
                          Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('الأصناف في هذه الفاتورة:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                const SizedBox(height: 6),
                                ...s.items.map((i) => Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 2),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('• ${i.productName} (الكمية: ${i.quantity})'),
                                          Text('${i.total.toStringAsFixed(2)} ج.م'),
                                        ],
                                      ),
                                    )),
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    OutlinedButton.icon(
                                      onPressed: () {
                                        PrinterService.printThermalReceipt(sale: s, settings: AppSettings());
                                      },
                                      icon: const Icon(Icons.print_outlined, size: 16),
                                      label: const Text('إعادة طباعة الفاتورة الحرارية'),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
