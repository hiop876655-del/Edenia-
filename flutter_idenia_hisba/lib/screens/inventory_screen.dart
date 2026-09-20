import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/database_helper.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({Key? key}) : super(key: key);

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  List<Product> products = [];
  List<Product> filtered = [];
  bool isLoading = true;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    setState(() => isLoading = true);
    final list = await DatabaseHelper.instance.getProducts();
    setState(() {
      products = list;
      filtered = list;
      isLoading = false;
    });
  }

  void _onSearch(String query) {
    if (query.isEmpty) {
      setState(() => filtered = products);
    } else {
      setState(() {
        filtered = products
            .where((p) =>
                p.name.toLowerCase().contains(query.toLowerCase()) ||
                p.barcode.contains(query) ||
                p.category.toLowerCase().contains(query.toLowerCase()))
            .toList();
      });
    }
  }

  void _openAddEditDialog([Product? existing]) {
    final barcodeCtrl = TextEditingController(text: existing?.barcode ?? '${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}');
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final categoryCtrl = TextEditingController(text: existing?.category ?? 'عام');
    final costCtrl = TextEditingController(text: existing != null ? existing.costPrice.toString() : '');
    final sellingCtrl = TextEditingController(text: existing != null ? existing.sellingPrice.toString() : '');
    final stockCtrl = TextEditingController(text: existing != null ? existing.stock.toString() : '10');
    final minStockCtrl = TextEditingController(text: existing != null ? existing.minStockAlert.toString() : '5');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? 'إضافة صنف جديد بالمخزن' : 'تعديل بيانات الصنف'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: barcodeCtrl, decoration: const InputDecoration(labelText: 'الباركود')),
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'اسم المنتج / الصنف')),
              TextField(controller: categoryCtrl, decoration: const InputDecoration(labelText: 'التصنيف')),
              TextField(controller: costCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'سعر الشراء (التكلفة)')),
              TextField(controller: sellingCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'سعر البيع للمستهلك')),
              TextField(controller: stockCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'الكمية الحالية في المخزن')),
              TextField(controller: minStockCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'حد تنبيه انخفاض المخزون')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          ElevatedButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;

              final prod = Product(
                id: existing?.id,
                barcode: barcodeCtrl.text.trim(),
                name: nameCtrl.text.trim(),
                category: categoryCtrl.text.trim(),
                costPrice: double.tryParse(costCtrl.text) ?? 0.0,
                sellingPrice: double.tryParse(sellingCtrl.text) ?? 0.0,
                stock: int.tryParse(stockCtrl.text) ?? 0,
                minStockAlert: int.tryParse(minStockCtrl.text) ?? 5,
              );

              if (existing == null) {
                await DatabaseHelper.instance.insertProduct(prod);
              } else {
                await DatabaseHelper.instance.updateProduct(prod);
              }

              Navigator.pop(ctx);
              _loadProducts();
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2E7D32), foregroundColor: Colors.white),
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAddEditDialog(),
        icon: const Icon(Icons.add),
        label: const Text('إضافة صنف (F3)'),
        backgroundColor: const Color(0xFF2E7D32),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.white,
            child: TextField(
              controller: _searchController,
              onChanged: _onSearch,
              decoration: InputDecoration(
                hintText: 'البحث في المخزن بالاسم أو الباركود...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Colors.grey.shade100,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? const Center(child: Text('لا توجد أصناف مسجلة في المخزن'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(12),
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final p = filtered[index];
                          final isLow = p.stock <= p.minStockAlert;

                          return Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: isLow ? Colors.red.shade200 : Colors.grey.shade200),
                            ),
                            child: ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              leading: CircleAvatar(
                                backgroundColor: isLow ? Colors.red.shade50 : Colors.green.shade50,
                                child: Text(
                                  '${p.stock}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: isLow ? Colors.red.shade900 : Colors.green.shade900,
                                  ),
                                ),
                              ),
                              title: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      p.name,
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  if (isLow)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.red.shade100,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: const Text('قارب على النفاد', style: TextStyle(fontSize: 10, color: Colors.red)),
                                    ),
                                ],
                              ),
                              subtitle: Text(
                                'باركود: ${p.barcode} • شراء: ${p.costPrice.toStringAsFixed(2)} ج.م • تصنيف: ${p.category}',
                                style: const TextStyle(fontSize: 11),
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    '${p.sellingPrice.toStringAsFixed(2)} ج.م',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2E7D32), fontSize: 14),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.edit_outlined, size: 18),
                                    onPressed: () => _openAddEditDialog(p),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                                    onPressed: () async {
                                      final confirm = await showDialog<bool>(
                                        context: context,
                                        builder: (c) => AlertDialog(
                                          title: const Text('تأكيد الحذف'),
                                          content: Text('هل أنت متأكد من حذف الصنف (${p.name}) نهائياً؟'),
                                          actions: [
                                            TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('إلغاء')),
                                            TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('حذف', style: TextStyle(color: Colors.red))),
                                          ],
                                        ),
                                      );
                                      if (confirm == true && p.id != null) {
                                        await DatabaseHelper.instance.deleteProduct(p.id!);
                                        _loadProducts();
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
