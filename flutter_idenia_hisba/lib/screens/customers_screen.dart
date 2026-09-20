import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/database_helper.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({Key? key}) : super(key: key);

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  List<Customer> customers = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  Future<void> _loadCustomers() async {
    setState(() => isLoading = true);
    final list = await DatabaseHelper.instance.getCustomers();
    setState(() {
      customers = list;
      isLoading = false;
    });
  }

  void _recordDebtPaymentDialog(Customer customer) {
    final amountCtrl = TextEditingController();
    final notesCtrl = TextEditingController(text: 'سداد دفعة نقدية');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('سداد دفعة من دين (${customer.name})'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('إجمالي الدين الحالي: ${customer.totalDebt.toStringAsFixed(2)} ج.م',
                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
            const SizedBox(height: 12),
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: const InputDecoration(labelText: 'المبلغ المسدد نقداً', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: notesCtrl,
              decoration: const InputDecoration(labelText: 'ملاحظات الدفعة', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          ElevatedButton(
            onPressed: () async {
              final amount = double.tryParse(amountCtrl.text) ?? 0.0;
              if (amount <= 0) return;

              final payment = DebtPayment(
                customerId: customer.id!,
                customerName: customer.name,
                amount: amount,
                date: DateTime.now().toIso8601String(),
                notes: notesCtrl.text,
              );

              await DatabaseHelper.instance.recordDebtPayment(payment);
              Navigator.pop(ctx);
              _loadCustomers();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('تم تسجيل سداد مبلغ $amount ج.م للعميل بنجاح'), backgroundColor: const Color(0xFF2E7D32)),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2E7D32), foregroundColor: Colors.white),
            child: const Text('تأكيد السداد'),
          ),
        ],
      ),
    );
  }

  void _addCustomerDialog() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final initialDebtCtrl = TextEditingController(text: '0');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('إضافة عميل جديد'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'اسم العميل')),
              TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'رقم الهاتف')),
              TextField(controller: addressCtrl, decoration: const InputDecoration(labelText: 'العنوان / المنطقة')),
              TextField(controller: initialDebtCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'الرصيد الافتتاحي (مديونية سابقة)')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          ElevatedButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;
              final cust = Customer(
                name: nameCtrl.text.trim(),
                phone: phoneCtrl.text.trim(),
                address: addressCtrl.text.trim(),
                totalDebt: double.tryParse(initialDebtCtrl.text) ?? 0.0,
              );
              await DatabaseHelper.instance.insertCustomer(cust);
              Navigator.pop(ctx);
              _loadCustomers();
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2E7D32), foregroundColor: Colors.white),
            child: const Text('حفظ العميل'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addCustomerDialog,
        icon: const Icon(Icons.person_add),
        label: const Text('إضافة عميل (F5)'),
        backgroundColor: const Color(0xFF2E7D32),
        foregroundColor: Colors.white,
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : customers.isEmpty
              ? const Center(child: Text('لا يوجد عملاء مسجلين حالياً'))
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: customers.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final c = customers[index];
                    final hasDebt = c.totalDebt > 0;

                    return Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: hasDebt ? Colors.amber.shade300 : Colors.grey.shade200),
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: hasDebt ? Colors.amber.shade50 : Colors.green.shade50,
                          child: Icon(Icons.person, color: hasDebt ? Colors.amber.shade800 : Colors.green.shade800),
                        ),
                        title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('هاتف: ${c.phone.isNotEmpty ? c.phone : "غير مسجل"} • ${c.address}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '${c.totalDebt.toStringAsFixed(2)} ج.م',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: hasDebt ? Colors.red.shade800 : Colors.green.shade800,
                                  ),
                                ),
                                Text(hasDebt ? 'مدين' : 'خالص', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                              ],
                            ),
                            const SizedBox(width: 8),
                            if (hasDebt)
                              ElevatedButton(
                                onPressed: () => _recordDebtPaymentDialog(c),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.green.shade50,
                                  foregroundColor: const Color(0xFF1B5E20),
                                  elevation: 0,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                ),
                                child: const Text('سداد', style: TextStyle(fontSize: 12)),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
