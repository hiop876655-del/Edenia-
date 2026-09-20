import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/database_helper.dart';

class DashboardScreen extends StatefulWidget {
  final Function(int) onNavigateTab;

  const DashboardScreen({Key? key, required this.onNavigateTab}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  double todaySales = 0.0;
  double todayProfit = 0.0;
  double totalDebts = 0.0;
  int productsCount = 0;
  int lowStockCount = 0;
  List<Sale> recentSales = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => isLoading = true);
    final sales = await DatabaseHelper.instance.getSales();
    final products = await DatabaseHelper.instance.getProducts();
    final customers = await DatabaseHelper.instance.getCustomers();

    final now = DateTime.now();
    final todayPrefix = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";

    double sTotal = 0;
    double pTotal = 0;
    for (var s in sales) {
      if (s.date.startsWith(todayPrefix)) {
        sTotal += s.finalAmount;
        for (var item in s.items) {
          pTotal += (item.unitPrice - item.costPrice) * item.quantity;
        }
      }
    }

    double dTotal = 0;
    for (var c in customers) {
      dTotal += c.totalDebt;
    }

    int low = 0;
    for (var p in products) {
      if (p.stock <= p.minStockAlert) low++;
    }

    setState(() {
      todaySales = sTotal;
      todayProfit = pTotal;
      totalDebts = dTotal;
      productsCount = products.length;
      lowStockCount = low;
      recentSales = sales.take(5).toList();
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _loadStats,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome & Quick Action Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1B5E20), Color(0xFF2E7D32)],
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF1B5E20).withOpacity(0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'ايدينيا - حِسبة',
                            style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'برنامج كاشير ومخازن احترافي - يعمل أوفلاين 100%',
                            style: TextStyle(color: Colors.white70, fontSize: 13),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: () => widget.onNavigateTab(1), // Go to POS
                            icon: const Icon(Icons.point_of_sale, size: 20),
                            label: const Text('فتح شاشة الكاشير (F2)'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: const Color(0xFF1B5E20),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.storefront_rounded, size: 64, color: Colors.white24),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // KPI Stats Grid
              LayoutBuilder(builder: (context, constraints) {
                final isWide = constraints.maxWidth > 600;
                return GridView.count(
                  crossAxisCount: isWide ? 4 : 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: isWide ? 1.6 : 1.3,
                  children: [
                    _buildStatCard(
                      title: 'مبيعات اليوم',
                      value: '${todaySales.toStringAsFixed(2)} ج.م',
                      icon: Icons.monetization_on_outlined,
                      color: const Color(0xFF2E7D32),
                    ),
                    _buildStatCard(
                      title: 'أرباح اليوم',
                      value: '${todayProfit.toStringAsFixed(2)} ج.م',
                      icon: Icons.trending_up,
                      color: Colors.blue.shade700,
                    ),
                    _buildStatCard(
                      title: 'إجمالي الديون',
                      value: '${totalDebts.toStringAsFixed(2)} ج.م',
                      icon: Icons.account_balance_wallet_outlined,
                      color: Colors.amber.shade800,
                    ),
                    _buildStatCard(
                      title: 'الأصناف بالمخزن',
                      value: '$productsCount صنف',
                      subtitle: lowStockCount > 0 ? '$lowStockCount قارب على النفاد' : 'المخزون آمن',
                      icon: Icons.inventory_2_outlined,
                      color: Colors.purple.shade700,
                    ),
                  ],
                );
              }),

              const SizedBox(height: 24),

              // Recent Invoices Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'أحدث الفواتير المسجلة',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  TextButton(
                    onPressed: () => widget.onNavigateTab(3), // Invoices tab
                    child: const Text('عرض الكل'),
                  ),
                ],
              ),

              const SizedBox(height: 8),

              // Recent Invoices List
              if (recentSales.isEmpty)
                Container(
                  padding: const EdgeInsets.all(24),
                  width: double.infinity,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Text('لا توجد فواتير مسجلة اليوم حتى الآن'),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: recentSales.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final sale = recentSales[index];
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      leading: CircleAvatar(
                        backgroundColor: sale.paymentType == 'cash' ? Colors.green.shade50 : Colors.amber.shade50,
                        child: Icon(
                          sale.paymentType == 'cash' ? Icons.payments_outlined : Icons.timer_outlined,
                          color: sale.paymentType == 'cash' ? Colors.green.shade800 : Colors.amber.shade900,
                        ),
                      ),
                      title: Text(sale.customerName, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('فاتورة #${sale.invoiceNumber} • ${sale.items.length} أصناف'),
                      trailing: Text(
                        '${sale.finalAmount.toStringAsFixed(2)} ج.م',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    String? subtitle,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
              Icon(icon, color: color, size: 20),
            ],
          ),
          Text(
            value,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color),
          ),
          if (subtitle != null)
            Text(
              subtitle,
              style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
        ],
      ),
    );
  }
}
