import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/database_helper.dart';
import '../services/printer_service.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({Key? key}) : super(key: key);

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  List<Product> allProducts = [];
  List<Product> filteredProducts = [];
  List<Customer> allCustomers = [];
  List<SaleItem> cartItems = [];

  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _barcodeInputController = TextEditingController();
  final TextEditingController _discountController = TextEditingController(text: '0');

  Customer? selectedCustomer;
  String paymentType = 'cash'; // 'cash' or 'credit'
  bool isPrinting = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final prods = await DatabaseHelper.instance.getProducts();
    final custs = await DatabaseHelper.instance.getCustomers();
    setState(() {
      allProducts = prods;
      filteredProducts = prods;
      allCustomers = custs;
    });
  }

  void _onSearch(String query) {
    if (query.isEmpty) {
      setState(() => filteredProducts = allProducts);
    } else {
      setState(() {
        filteredProducts = allProducts
            .where((p) =>
                p.name.toLowerCase().contains(query.toLowerCase()) ||
                p.barcode.contains(query))
            .toList();
      });
    }
  }

  void _addToCart(Product product) {
    if (product.stock <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تنبيه: هذا الصنف نفد من المخزن!'), backgroundColor: Colors.red),
      );
      return;
    }

    final index = cartItems.indexWhere((item) => item.productId == product.id);
    if (index >= 0) {
      final current = cartItems[index];
      if (current.quantity >= product.stock) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('لا تتوفر كمية إضافية في المخزون'), backgroundColor: Colors.orange),
        );
        return;
      }
      setState(() {
        final newQty = current.quantity + 1;
        cartItems[index] = SaleItem(
          productId: current.productId,
          productName: current.productName,
          quantity: newQty,
          unitPrice: current.unitPrice,
          costPrice: current.costPrice,
          total: newQty * current.unitPrice,
        );
      });
    } else {
      setState(() {
        cartItems.add(SaleItem(
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.sellingPrice,
          costPrice: product.costPrice,
          total: product.sellingPrice,
        ));
      });
    }
  }

  void _updateQuantity(int index, int delta) {
    final current = cartItems[index];
    final newQty = current.quantity + delta;
    if (newQty <= 0) {
      setState(() => cartItems.removeAt(index));
    } else {
      setState(() {
        cartItems[index] = SaleItem(
          productId: current.productId,
          productName: current.productName,
          quantity: newQty,
          unitPrice: current.unitPrice,
          costPrice: current.costPrice,
          total: newQty * current.unitPrice,
        );
      });
    }
  }

  double get subtotal => cartItems.fold(0.0, (sum, item) => sum + item.total);
  double get discount => double.tryParse(_discountController.text) ?? 0.0;
  double get finalTotal => (subtotal - discount).clamp(0.0, double.infinity);

  Future<void> _checkout() async {
    if (cartItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('السلة فارغة! اختر أصنافاً للبيع أولاً')),
      );
      return;
    }

    if (paymentType == 'credit' && selectedCustomer == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى تحديد العميل لتسجيل فاتورة الآجل / الديون'), backgroundColor: Colors.amber),
      );
      return;
    }

    final invNum = 'INV-${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}';
    final now = DateTime.now().toIso8601String();

    final sale = Sale(
      invoiceNumber: invNum,
      date: now,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer != null ? selectedCustomer!.name : 'عميل نقدي',
      totalAmount: subtotal,
      discount: discount,
      finalAmount: finalTotal,
      paidAmount: paymentType == 'cash' ? finalTotal : 0.0,
      remainingAmount: paymentType == 'credit' ? finalTotal : 0.0,
      paymentType: paymentType,
      items: List.from(cartItems),
    );

    await DatabaseHelper.instance.insertSale(sale);

    // Prompt thermal receipt print
    final appSettings = AppSettings();
    await PrinterService.printThermalReceipt(sale: sale, settings: appSettings);

    // Reset cart
    setState(() {
      cartItems.clear();
      _discountController.text = '0';
      selectedCustomer = null;
    });

    await _loadData(); // reload stocks

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('تم حفظ الفاتورة بنجاح ($invNum)'),
          backgroundColor: const Color(0xFF2E7D32),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final isWide = constraints.maxWidth > 800;

      if (isWide) {
        // Desktop Split View (Left Cart, Right Product Grid)
        return Row(
          children: [
            // Right Side: Products Catalog & Search
            Expanded(flex: 3, child: _buildProductsSection()),
            const VerticalDivider(width: 1),
            // Left Side: Cart & Checkout
            Expanded(flex: 2, child: _buildCartSection()),
          ],
        );
      } else {
        // Mobile View (Tabs or Column)
        return Column(
          children: [
            _buildSearchBar(),
            Expanded(
              child: cartItems.isEmpty
                  ? _buildProductsGrid()
                  : Row(
                      children: [
                        Expanded(child: _buildProductsGrid()),
                        const VerticalDivider(width: 1),
                        Expanded(child: _buildCartSection()),
                      ],
                    ),
            ),
            if (cartItems.isNotEmpty && constraints.maxWidth < 600) _buildMobileCartBottomBar(),
          ],
        );
      }
    });
  }

  Widget _buildSearchBar() {
    return Container(
      padding: const EdgeInsets.all(12),
      color: Colors.white,
      child: TextField(
        controller: _searchController,
        onChanged: _onSearch,
        decoration: InputDecoration(
          hintText: 'ابحث باسم الصنف أو بالباركود...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: () {
              // Quick barcode dialog
              _showBarcodeScanDialog();
            },
          ),
          filled: true,
          fillColor: Colors.grey.shade100,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildProductsSection() {
    return Column(
      children: [
        _buildSearchBar(),
        Expanded(child: _buildProductsGrid()),
      ],
    );
  }

  Widget _buildProductsGrid() {
    if (filteredProducts.isEmpty) {
      return const Center(child: Text('لا توجد أصناف مطابقة'));
    }
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 180,
        childAspectRatio: 0.9,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: filteredProducts.length,
      itemBuilder: (context, index) {
        final p = filteredProducts[index];
        final inCart = cartItems.any((i) => i.productId == p.id);

        return InkWell(
          onTap: () => _addToCart(p),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: inCart ? const Color(0xFF2E7D32) : Colors.grey.shade200, width: inCart ? 2 : 1),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p.name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text('باركود: ${p.barcode}', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${p.sellingPrice.toStringAsFixed(2)} ج.م',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2E7D32), fontSize: 13),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: p.stock <= 5 ? Colors.red.shade50 : Colors.green.shade50,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${p.stock}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: p.stock <= 5 ? Colors.red.shade900 : Colors.green.shade900,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCartSection() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('سلة الفاتورة الحالية', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              if (cartItems.isNotEmpty)
                TextButton(
                  onPressed: () => setState(() => cartItems.clear()),
                  child: const Text('إفراغ السلة', style: TextStyle(color: Colors.red)),
                ),
            ],
          ),
          const Divider(),

          // Customer Selector
          DropdownButtonFormField<Customer?>(
            value: selectedCustomer,
            decoration: InputDecoration(
              labelText: 'العميل',
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            items: [
              const DropdownMenuItem<Customer?>(value: null, child: Text('عميل نقدي عام')),
              ...allCustomers.map((c) => DropdownMenuItem<Customer?>(
                    value: c,
                    child: Text('${c.name} (${c.totalDebt > 0 ? "مدين: ${c.totalDebt} ج.م" : "لا ديون"})'),
                  )),
            ],
            onChanged: (val) => setState(() => selectedCustomer = val),
          ),

          const SizedBox(height: 8),

          // Payment Type Segment
          Row(
            children: [
              Expanded(
                child: ChoiceChip(
                  label: const Center(child: Text('دفع كاش (نقدي)')),
                  selected: paymentType == 'cash',
                  onSelected: (val) => setState(() => paymentType = 'cash'),
                  selectedColor: const Color(0xFFE8F5E9),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ChoiceChip(
                  label: const Center(child: Text('آجل (على الحساب)')),
                  selected: paymentType == 'credit',
                  onSelected: (val) => setState(() => paymentType = 'credit'),
                  selectedColor: Colors.amber.shade100,
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Cart Items List
          Expanded(
            child: cartItems.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.shopping_cart_outlined, size: 48, color: Colors.grey.shade300),
                        const SizedBox(height: 8),
                        Text('لم يتم إضافة أصناف للسلة بعد', style: TextStyle(color: Colors.grey.shade500)),
                      ],
                    ),
                  )
                : ListView.separated(
                    itemCount: cartItems.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final item = cartItems[index];
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.productName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  Text('${item.unitPrice.toStringAsFixed(2)} ج.م للقطعة', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline, size: 20),
                                  onPressed: () => _updateQuantity(index, -1),
                                ),
                                Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline, size: 20),
                                  onPressed: () => _updateQuantity(index, 1),
                                ),
                              ],
                            ),
                            SizedBox(
                              width: 65,
                              child: Text(
                                '${item.total.toStringAsFixed(2)} ج.م',
                                textAlign: TextAlign.left,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),

          const Divider(),

          // Subtotal & Discount
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('المجموع الفرعي:'),
              Text('${subtotal.toStringAsFixed(2)} ج.م', style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Text('الخصم: '),
              const SizedBox(width: 8),
              SizedBox(
                width: 80,
                child: TextField(
                  controller: _discountController,
                  keyboardType: TextInputType.number,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const Spacer(),
              Text(
                'الصافي: ${finalTotal.toStringAsFixed(2)} ج.م',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF2E7D32)),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Checkout Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: cartItems.isEmpty ? null : _checkout,
              icon: const Icon(Icons.print_outlined),
              label: Text('حفظ وطباعة الفاتورة (${finalTotal.toStringAsFixed(2)} ج.م)'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2E7D32),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileCartBottomBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 8, offset: const Offset(0, -3)),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${cartItems.length} أصناف بالسلة', style: const TextStyle(fontSize: 11, color: Colors.grey)),
              Text('${finalTotal.toStringAsFixed(2)} ج.م', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF2E7D32))),
            ],
          ),
          ElevatedButton.icon(
            onPressed: _checkout,
            icon: const Icon(Icons.check),
            label: const Text('إتمام البيع'),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2E7D32), foregroundColor: Colors.white),
          ),
        ],
      ),
    );
  }

  void _showBarcodeScanDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('مسح الباركود'),
        content: TextField(
          controller: _barcodeInputController,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'امسح الباركود بجهاز القارئ أو اكتبه'),
          onSubmitted: (barcode) async {
            Navigator.pop(ctx);
            final prod = await DatabaseHelper.instance.getProductByBarcode(barcode.trim());
            if (prod != null) {
              _addToCart(prod);
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('لم يتم العثور على صنف بالباركود $barcode')),
              );
            }
            _barcodeInputController.clear();
          },
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
        ],
      ),
    );
  }
}
