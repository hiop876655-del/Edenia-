import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../models/app_models.dart';
import '../services/database_helper.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  final TextEditingController _barcodeController = TextEditingController();
  final FocusNode _barcodeFocusNode = FocusNode();
  final List<InvoiceItem> _cartItems = [];
  final List<Customer> _customers = [];

  String _selectedCustomer = 'عميل نقدي';
  String _paymentMethod = 'cash'; // cash, credit
  double _discount = 0.0;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadCustomers();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _barcodeFocusNode.requestFocus();
    });
  }

  Future<void> _loadCustomers() async {
    final custs = await DatabaseHelper.instance.getAllCustomers();
    setState(() {
      _customers.clear();
      _customers.addAll(custs);
    });
  }

  double get _totalAmount => _cartItems.fold(0.0, (sum, item) => sum + item.subtotal);
  double get _finalAmount => (_totalAmount - _discount) > 0 ? (_totalAmount - _discount) : 0.0;

  Future<void> _handleBarcodeScan(String barcode) async {
    if (barcode.trim().isEmpty) return;

    final product = await DatabaseHelper.instance.getProductByBarcode(barcode.trim());
    _barcodeController.clear();
    _barcodeFocusNode.requestFocus();

    if (product == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('الصنف ذو الباركود [$barcode] غير مسجل في المخزن!'),
          backgroundColor: Colors.red.shade800,
        ),
      );
      return;
    }

    setState(() {
      final existingIndex = _cartItems.indexWhere((item) => item.barcode == product.barcode);
      if (existingIndex != -1) {
        _cartItems[existingIndex].quantity += 1.0;
      } else {
        _cartItems.add(InvoiceItem(
          productId: product.id,
          productName: product.name,
          barcode: product.barcode,
          quantity: 1.0,
          unitPrice: product.sellingPrice,
          costPrice: product.costPrice,
        ));
      }
    });
  }

  Future<void> _completeSale() async {
    if (_cartItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('الفاتورة فارغة، برجاء مسح أصناف أولاً.')),
      );
      return;
    }

    setState(() => _isLoading = true);

    final invoiceNum = 'INV-${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}';
    final nowStr = DateTime.now().toIso8601String();
    final paidAmount = _paymentMethod == 'cash' ? _finalAmount : 0.0;
    final remainingAmount = _paymentMethod == 'credit' ? _finalAmount : 0.0;

    final newInvoice = Invoice(
      invoiceNumber: invoiceNum,
      dateTime: nowStr,
      customerName: _selectedCustomer,
      paymentMethod: _paymentMethod,
      totalAmount: _totalAmount,
      discount: _discount,
      finalAmount: _finalAmount,
      paidAmount: paidAmount,
      remainingAmount: remainingAmount,
      items: List.from(_cartItems),
    );

    await DatabaseHelper.instance.createInvoice(newInvoice);

    setState(() {
      _cartItems.clear();
      _discount = 0.0;
      _selectedCustomer = 'عميل نقدي';
      _paymentMethod = 'cash';
      _isLoading = false;
    });

    _barcodeFocusNode.requestFocus();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Color(0xFF10B981), size: 28),
            SizedBox(width: 8),
            Text('تم حفظ الفاتورة بنجاح!'),
          ],
        ),
        content: Text('رقم الفاتورة: $invoiceNum\nالإجمالي: ${_finalAmount.toStringAsFixed(2)} ج.م\nتم خصم الكميات من المخزن محلياً.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('حسناً وطباعة إيصال'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat('#,##0.00', 'ar_EG');

    return CallbackShortcuts(
      bindings: <ShortcutActivator, VoidCallback>{
        const SingleActivator(LogicalKeyboardKey.f9): _completeSale,
        const SingleActivator(LogicalKeyboardKey.f3): () => _barcodeFocusNode.requestFocus(),
        const SingleActivator(LogicalKeyboardKey.escape): () {
          if (_cartItems.isNotEmpty) {
            setState(() => _cartItems.clear());
          }
        },
      },
      child: Focus(
        autofocus: true,
        child: Scaffold(
          backgroundColor: const Color(0xFFF3F4F6),
          body: Row(
            children: [
              // القسم الأيمن: قائمة الأصناف في الفاتورة
              Expanded(
                flex: 3,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      // حقل مسح الباركود السريع
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF0B3B24), width: 1.5),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.qr_code_scanner, color: Color(0xFF0B3B24), size: 28),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                controller: _barcodeController,
                                focusNode: _barcodeFocusNode,
                                decoration: const InputDecoration(
                                  hintText: 'امسح الباركود هنا أو اضغط F3 ثم Enter للإضافة...',
                                  border: InputBorder.none,
                                ),
                                onSubmitted: _handleBarcodeScan,
                              ),
                            ),
                            ElevatedButton(
                              onPressed: () => _handleBarcodeScan(_barcodeController.text),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0B3B24),
                                foregroundColor: Colors.white,
                              ),
                              child: const Text('إضافة'),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 12),

                      // جدول الأصناف
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.black.withOpacity(0.06)),
                          ),
                          child: _cartItems.isEmpty
                              ? Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.shopping_basket_outlined, size: 64, color: Colors.grey[300]),
                                      const SizedBox(height: 12),
                                      const Text(
                                        'سلة المبيعات فارغة، امسح باركود لبدء الفاتورة',
                                        style: TextStyle(color: Colors.grey, fontSize: 14),
                                      ),
                                    ],
                                  ),
                                )
                              : ListView.separated(
                                  itemCount: _cartItems.length,
                                  separatorBuilder: (_, __) => const Divider(height: 1),
                                  itemBuilder: (ctx, i) {
                                    final item = _cartItems[i];
                                    return ListTile(
                                      leading: CircleAvatar(
                                        backgroundColor: const Color(0xFF0B3B24).withOpacity(0.1),
                                        child: Text('${i + 1}', style: const TextStyle(color: Color(0xFF0B3B24), fontWeight: FontWeight.bold)),
                                      ),
                                      title: Text(item.productName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                      subtitle: Text('${item.unitPrice.toStringAsFixed(2)} ج.م للوحدة | باركود: ${item.barcode}'),
                                      trailing: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
                                            onPressed: () {
                                              setState(() {
                                                if (item.quantity > 1) {
                                                  item.quantity -= 1;
                                                } else {
                                                  _cartItems.removeAt(i);
                                                }
                                              });
                                            },
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFF3F4F6),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.add_circle_outline, color: Color(0xFF0B3B24)),
                                            onPressed: () => setState(() => item.quantity += 1),
                                          ),
                                          const SizedBox(width: 16),
                                          SizedBox(
                                            width: 90,
                                            child: Text(
                                              '${item.subtotal.toStringAsFixed(2)} ج.م',
                                              textAlign: TextAlign.end,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0B3B24)),
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // القسم الأيسر: الحساب الإجمالي والدفع
              Container(
                width: 320,
                color: Colors.white,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'بيانات الفاتورة والدفع',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0B3B24)),
                    ),
                    const Divider(height: 24),

                    // اختيار العميل
                    const Text('اسم العميل:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 4),
                    DropdownButtonFormField<String>(
                      value: _selectedCustomer,
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      items: [
                        const DropdownMenuItem(value: 'عميل نقدي', child: Text('عميل نقدي (كاش)')),
                        ..._customers.map((c) => DropdownMenuItem(value: c.name, child: Text('${c.name} (دين: ${c.balance})'))),
                      ],
                      onChanged: (val) => setState(() => _selectedCustomer = val ?? 'عميل نقدي'),
                    ),

                    const SizedBox(height: 16),

                    // طريقة السداد
                    const Text('نوع الدفع:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                    Row(
                      children: [
                        Expanded(
                          child: RadioListTile<String>(
                            title: const Text('نقدي', style: TextStyle(fontSize: 13)),
                            value: 'cash',
                            groupValue: _paymentMethod,
                            onChanged: (val) => setState(() => _paymentMethod = val!),
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                        Expanded(
                          child: RadioListTile<String>(
                            title: const Text('آجل/دين', style: TextStyle(fontSize: 13)),
                            value: 'credit',
                            groupValue: _paymentMethod,
                            onChanged: (val) => setState(() => _paymentMethod = val!),
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ],
                    ),

                    const Spacer(),

                    // شريط الإجمالي
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF082B1B),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('الإجمالي قبل الخصم:', style: TextStyle(color: Colors.white70, fontSize: 12)),
                              Text('${currency.format(_totalAmount)} ج.م', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('المبلغ المطلوب:', style: TextStyle(color: Color(0xFFE5A93C), fontSize: 14, fontWeight: FontWeight.bold)),
                              Text(
                                '${currency.format(_finalAmount)} ج.م',
                                style: const TextStyle(color: Color(0xFFE5A93C), fontSize: 22, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // زر إنهاء الفاتورة F9
                    ElevatedButton.icon(
                      onPressed: _isLoading ? null : _completeSale,
                      icon: const Icon(Icons.print, size: 22),
                      label: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Text(
                          'حفظ وطباعة (F9)',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
