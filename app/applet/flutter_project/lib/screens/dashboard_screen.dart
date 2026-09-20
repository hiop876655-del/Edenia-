import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/database_helper.dart';
import '../services/license_service.dart';

class DashboardScreen extends StatefulWidget {
  final Function(int) onNavigate;

  const DashboardScreen({super.key, required this.onNavigate});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic> _stats = {
    'todaySales': 0.0,
    'invoiceCount': 0,
    'totalDebt': 0.0,
    'stockValue': 0.0,
    'productCount': 0,
  };
  Map<String, dynamic> _license = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final statsData = await DatabaseHelper.instance.getDashboardStats();
    final licenseData = await LicenseService.instance.checkLicenseStatus();
    setState(() {
      _stats = statsData;
      _license = licenseData;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat('#,##0.00', 'ar_EG');

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF0B3B24)));
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F5),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // شريط الترحيب والترخيص الأعلى
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF082B1B), Color(0xFF0F4D30)],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.12),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  )
                ],
              ),
              child: Row(
                children: [
                  Image.asset(
                    'assets/images/logo.png',
                    height: 52,
                    width: 52,
                    errorBuilder: (ctx, err, st) => const Icon(Icons.store, color: Color(0xFFE5A93C), size: 48),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'إيدينيا - حِسبة | نظام المحاسبة ونقاط البيع السريعة',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withOpacity(0.2),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFF10B981), width: 0.8),
                              ),
                              child: const Text(
                                'أوفلاين 100% (قاعدة بيانات SQLite محلية)',
                                style: TextStyle(color: Color(0xFF34D399), fontSize: 12),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              'بصمة الجهاز: ${_license['hardwareId'] ?? ''}',
                              style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // عداد الصلاحية
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE5A93C).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE5A93C), width: 1),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.timer_outlined, color: Color(0xFFE5A93C), size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'متبقي: ${_license['remainingDays'] ?? 30} يوم',
                          style: const TextStyle(color: Color(0xFFE5A93C), fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // أزرار العمليات السريعة الرئيسية
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: () => widget.onNavigate(1), // فتح شاشة الكاشير F2
                    icon: const Icon(Icons.point_of_sale, size: 26),
                    label: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Text(
                        'فتح الكاشير السريع (F2)',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0B3B24),
                      foregroundColor: const Color(0xFFE5A93C),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 3,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => widget.onNavigate(2), // إضافة صنف
                    icon: const Icon(Icons.add_box_outlined),
                    label: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Text('المخزن والأصناف', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF0B3B24),
                      side: const BorderSide(color: Color(0xFF0B3B24), width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => widget.onNavigate(3), // الديون والعملاء
                    icon: const Icon(Icons.people_alt_outlined),
                    label: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Text('العملاء والديون', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF0B3B24),
                      side: const BorderSide(color: Color(0xFF0B3B24), width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 28),

            // بطاقات الإحصائيات الأربعة
            Row(
              children: [
                _buildStatCard(
                  title: 'مبيعات اليوم',
                  value: '${currencyFormat.format(_stats['todaySales'])} ج.م',
                  subtitle: '${_stats['invoiceCount']} فواتير منجزة اليوم',
                  icon: Icons.shopping_cart_checkout,
                  accentColor: const Color(0xFF0B3B24),
                ),
                const SizedBox(width: 16),
                _buildStatCard(
                  title: 'إجمالي ديون العملاء',
                  value: '${currencyFormat.format(_stats['totalDebt'])} ج.م',
                  subtitle: 'مستحقات آجلة لدى الزبائن',
                  icon: Icons.account_balance_wallet_outlined,
                  accentColor: const Color(0xFFD97706),
                ),
                const SizedBox(width: 16),
                _buildStatCard(
                  title: 'قيمة بضاعة المخزن',
                  value: '${currencyFormat.format(_stats['stockValue'])} ج.م',
                  subtitle: '${_stats['productCount']} صنف مسجل بالمخزن',
                  icon: Icons.inventory_2_outlined,
                  accentColor: const Color(0xFF2563EB),
                ),
              ],
            ),

            const SizedBox(height: 28),

            // دليل الاختصارات السريعة للكاشير
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.black.withOpacity(0.06)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'اختصارات لوحة المفاتيح السريعة للكاشير (بدون فأرة):',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0B3B24)),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 16,
                    runSpacing: 10,
                    children: [
                      _buildKeyBadge('F1', 'الرئيسية'),
                      _buildKeyBadge('F2', 'كاشير جديد'),
                      _buildKeyBadge('F3', 'بحث بالباركود'),
                      _buildKeyBadge('F9', 'إنهاء وطباعة'),
                      _buildKeyBadge('Space', 'تعديل الكمية'),
                      _buildKeyBadge('Esc', 'إلغاء الفاتورة'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color accentColor,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.black.withOpacity(0.06)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 2))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: TextStyle(color: Colors.grey[700], fontSize: 13, fontWeight: FontWeight.bold)),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: accentColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: accentColor, size: 22),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: accentColor),
            ),
            const SizedBox(height: 4),
            Text(subtitle, style: TextStyle(color: Colors.grey[500], fontSize: 11)),
          ],
        ),
      ),
    );
  }

  Widget _buildKeyBadge(String key, String desc) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFF0B3B24),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(key, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 8),
          Text(desc, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
