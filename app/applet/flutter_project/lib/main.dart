import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'screens/dashboard_screen.dart';
import 'screens/pos_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const IdeniaHisbaApp());
}

class IdeniaHisbaApp extends StatelessWidget {
  const IdeniaHisbaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'إيدينيا - حِسبة',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Cairo',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0B3B24),
          primary: const Color(0xFF0B3B24),
          secondary: const Color(0xFFE5A93C),
        ),
        scaffoldBackgroundColor: const Color(0xFFF4F6F5),
      ),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('ar', 'EG'),
      ],
      locale: const Locale('ar', 'EG'),
      home: const MainShellScreen(),
    );
  }
}

class MainShellScreen extends StatefulWidget {
  const MainShellScreen({super.key});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  int _currentIndex = 0;

  void _onSelectTab(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      DashboardScreen(onNavigate: _onSelectTab),
      const PosScreen(),
      const Center(child: Text('المخزن والأصناف (إضافة وتعديل المخزون)', style: TextStyle(fontSize: 18))),
      const Center(child: Text('حسابات وديون العملاء وسداد الأقساط', style: TextStyle(fontSize: 18))),
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B3B24),
        foregroundColor: Colors.white,
        elevation: 1,
        title: Row(
          children: [
            Image.asset(
              'assets/images/logo.png',
              height: 36,
              width: 36,
              errorBuilder: (_, __, ___) => const Icon(Icons.store, color: Color(0xFFE5A93C)),
            ),
            const SizedBox(width: 12),
            const Text(
              'إيدينيا - حِسبة',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFFE5A93C)),
            ),
            const SizedBox(width: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withOpacity(0.25),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.wifi_off, size: 14, color: Color(0xFF34D399)),
                  SizedBox(width: 4),
                  Text('محلي 100%', style: TextStyle(fontSize: 11, color: Color(0xFF34D399))),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.home_outlined),
            tooltip: 'الرئيسية (F1)',
            onPressed: () => _onSelectTab(0),
          ),
          IconButton(
            icon: const Icon(Icons.point_of_sale),
            tooltip: 'الكاشير السريع (F2)',
            onPressed: () => _onSelectTab(1),
          ),
          IconButton(
            icon: const Icon(Icons.inventory_2_outlined),
            tooltip: 'المخزن والأصناف',
            onPressed: () => _onSelectTab(2),
          ),
          IconButton(
            icon: const Icon(Icons.people_outline),
            tooltip: 'العملاء والديون',
            onPressed: () => _onSelectTab(3),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: screens[_currentIndex],
    );
  }
}
