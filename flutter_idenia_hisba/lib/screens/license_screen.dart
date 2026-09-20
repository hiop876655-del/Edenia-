import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/license_service.dart';

class LicenseScreen extends StatefulWidget {
  const LicenseScreen({Key? key}) : super(key: key);

  @override
  State<LicenseScreen> createState() => _LicenseScreenState();
}

class _LicenseScreenState extends State<LicenseScreen> {
  String machineId = 'جاري الكشف...';
  bool isActivated = false;
  int remainingDays = 7;
  final TextEditingController _keyController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadLicenseInfo();
  }

  Future<void> _loadLicenseInfo() async {
    final mId = await LicenseService.getMachineId();
    final active = await LicenseService.isSystemActive();
    final days = await LicenseService.getRemainingTrialDays();
    setState(() {
      machineId = mId;
      isActivated = days > 300;
      remainingDays = days;
    });
  }

  Future<void> _activate() async {
    final entered = _keyController.text.trim();
    if (entered.isEmpty) return;

    final success = await LicenseService.activateWithKey(entered);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم تفعيل البرنامج بشكل دائم ورسمي على هذا الجهاز!'), backgroundColor: Color(0xFF2E7D32)),
      );
      _loadLicenseInfo();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('كود التفعيل غير صالح لهذا المعرف العتادي'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('تفعيل وتأمين النسخة للجهاز')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isActivated ? Colors.green.shade50 : Colors.amber.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isActivated ? Colors.green.shade300 : Colors.amber.shade300),
              ),
              child: Row(
                children: [
                  Icon(
                    isActivated ? Icons.verified_user : Icons.lock_clock,
                    size: 36,
                    color: isActivated ? const Color(0xFF2E7D32) : Colors.amber.shade900,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isActivated ? 'النسخة مفعلة بشكل دائم ومؤمنة عتادياً' : 'نسخة تجريبية نشطة',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        Text(
                          isActivated ? 'مرخصة رسمياً لمتجرك على هذا الجهاز' : 'متبقي $remainingDays أيام في الفترة التجريبية',
                          style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('المعرف العتادي لهذا الجهاز (Machine ID):', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: SelectableText(
                      machineId,
                      style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.5, fontSize: 15),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy, size: 18),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: machineId));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('تم نسخ المعرف العتادي')),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('إدخال كود التفعيل المرخص:'),
            const SizedBox(height: 6),
            TextField(
              controller: _keyController,
              decoration: const InputDecoration(
                hintText: 'ACT-XXXX-XXXX-XXXX',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _activate,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2E7D32),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('تفعيل النسخة الآن'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
