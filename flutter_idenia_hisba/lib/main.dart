import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:google_fonts/google_fonts.dart';

import 'screens/dashboard_screen.dart';
import 'screens/pos_screen.dart';
import 'screens/inventory_screen.dart';
import 'screens/customers_screen.dart';
import 'screens/invoices_screen.dart';
import 'screens/license_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const IdeniaHisbaApp());
}

class IdeniaHisbaApp extends StatelessWidget {
  const IdeniaHisbaApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ايدينيا - حِسبة',
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF2E7D32),
        brightness: Brightness.light,
        scaffoldBackgroundColor: const Color(0xFFF8F9FA),
        textTheme: GoogleFonts.cairoTextTheme(Theme.of(context).textTheme),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 1,
          iconTheme: IconThemeData(color: Color(0xFF1B5E20)),
          titleTextStyle: TextStyle(color: Color(0xFF212121), fontSize: 18, fontWeight: FontWeight.bold),
        ),
      ),
      home: const MainShell(),
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({Key? key}) : super(key: key);

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  final List<String> _titles = [
    'لوحة التحكم',
    'نقطة البيع (الكاشير)',
    'إدارة المخزن والأصناف',
    'أرشيف الفواتير',
    'العملاء والديون',
  ];

  @override
  Widget build(BuildContext context) {
    return Shortcuts(
      shortcuts: <LogicalKeySet, Intent>{
        LogicalKeySet(LogicalKeyboardKey.f1): const _NavIntent(0),
        LogicalKeySet(LogicalKeyboardKey.f2): const _NavIntent(1),
        LogicalKeySet(LogicalKeyboardKey.f3): const _NavIntent(2),
        LogicalKeySet(LogicalKeyboardKey.f4): const _NavIntent(3),
        LogicalKeySet(LogicalKeyboardKey.f5): const _NavIntent(4),
      },
      child: Actions(
        actions: <Type, Action<Intent>>{
          _NavIntent: CallbackAction<_NavIntent>(
            onInvoke: (intent) => setState(() => _currentIndex = intent.index),
          ),
        },
        child: Focus(
          autofocus: true,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isDesktop = constraints.maxWidth > 800;

              return Scaffold(
                appBar: PreferredSize(
                  preferredSize: const Size.fromHeight(60),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: SafeArea(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF2E7D32).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.storefront_rounded, color: Color(0xFF2E7D32), size: 22),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _titles[_currentIndex],
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                              Row(
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    Platform.isWindows ? 'ويندوز - قاعدة بيانات SQLite محلية' : 'أندرويد - يعمل أوفلاين',
                                    style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const Spacer(),
                          IconButton(
                            icon: const Icon(Icons.security, color: Color(0xFF2E7D32)),
                            tooltip: 'تأمين النسخة للجهاز',
                            onPressed: () {
                              Navigator.push(context, MaterialPageRoute(builder: (_) => const LicenseScreen()));
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                body: Row(
                  children: [
                    if (isDesktop)
                      NavigationRail(
                        selectedIndex: _currentIndex,
                        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
                        labelType: NavigationRailLabelType.all,
                        backgroundColor: Colors.white,
                        selectedIconTheme: const IconThemeData(color: Color(0xFF2E7D32)),
                        selectedLabelTextStyle: const TextStyle(color: Color(0xFF2E7D32), fontWeight: FontWeight.bold, fontSize: 12),
                        destinations: const [
                          NavigationRailDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: Text('الرئيسية (F1)')),
                          NavigationRailDestination(icon: Icon(Icons.point_of_sale_outlined), selectedIcon: Icon(Icons.point_of_sale), label: Text('الكاشير (F2)')),
                          NavigationRailDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2), label: Text('المخزن (F3)')),
                          NavigationRailDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: Text('الفواتير (F4)')),
                          NavigationRailDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: Text('العملاء (F5)')),
                        ],
                      ),
                    Expanded(
                      child: IndexedStack(
                        index: _currentIndex,
                        children: [
                          DashboardScreen(onNavigateTab: (idx) => setState(() => _currentIndex = idx)),
                          const PosScreen(),
                          const InventoryScreen(),
                          const InvoicesScreen(),
                          const CustomersScreen(),
                        ],
                      ),
                    ),
                  ],
                ),
                bottomNavigationBar: !isDesktop
                    ? NavigationBar(
                        selectedIndex: _currentIndex,
                        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
                        indicatorColor: const Color(0xFFE8F5E9),
                        destinations: const [
                          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard, color: Color(0xFF2E7D32)), label: 'الرئيسية'),
                          NavigationDestination(icon: Icon(Icons.point_of_sale_outlined), selectedIcon: Icon(Icons.point_of_sale, color: Color(0xFF2E7D32)), label: 'الكاشير'),
                          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2, color: Color(0xFF2E7D32)), label: 'المخزن'),
                          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long, color: Color(0xFF2E7D32)), label: 'الفواتير'),
                          NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people, color: Color(0xFF2E7D32)), label: 'العملاء'),
                        ],
                      )
                    : null,
              );
            },
          ),
        ),
      ),
    );
  }
}

class _NavIntent extends Intent {
  final int index;
  const _NavIntent(this.index);
}
