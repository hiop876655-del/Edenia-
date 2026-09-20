import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LicenseService {
  static final LicenseService instance = LicenseService._init();
  LicenseService._init();

  String _cachedHardwareId = '';

  Future<String> getHardwareId() async {
    if (_cachedHardwareId.isNotEmpty) return _cachedHardwareId;

    final deviceInfo = DeviceInfoPlugin();
    String rawId = 'IDENIA_FALLBACK_DEVICE';

    try {
      if (kIsWeb) {
        rawId = 'WEB_SANDBOX_INSTANCE';
      } else if (Platform.isWindows) {
        final windowsInfo = await deviceInfo.windowsInfo;
        rawId = '${windowsInfo.deviceId}_${windowsInfo.computerName}_${windowsInfo.numberOfCores}';
      } else if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        rawId = '${androidInfo.id}_${androidInfo.model}_${androidInfo.fingerprint}';
      }
    } catch (e) {
      rawId = 'IDENIA_${Platform.operatingSystem}_SECURE_DEFAULT';
    }

    // Hash to clean format: XXXX-XXXX-XXXX
    final bytes = utf8.encode(rawId);
    final digest = sha256.convert(bytes).toString().toUpperCase();
    _cachedHardwareId = '${digest.substring(0, 4)}-${digest.substring(4, 8)}-${digest.substring(8, 12)}';
    return _cachedHardwareId;
  }

  // توليد مفتاح التفعيل الرسمي للتاجر أوفلاين
  String generateActivationKey(String hwId, int days) {
    const salt = 'IDENIA_OFFLINE_SECRET_SALT_2026';
    final bytes = utf8.encode('$hwId-$days-$salt');
    final digest = sha256.convert(bytes).toString().toUpperCase();
    return 'IDENIA-${digest.substring(0, 4)}-${digest.substring(4, 8)}-$days';
  }

  // التحقق من صلاحية الترخيص محلياً
  Future<Map<String, dynamic>> checkLicenseStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final hwId = await getHardwareId();

    final isActivated = prefs.getBool('is_activated') ?? false;
    final expiryDateStr = prefs.getString('license_expiry');

    if (!isActivated || expiryDateStr == null) {
      // فترة تجريبية مجانية 30 يوم من أول تثبيت
      final installDateStr = prefs.getString('first_install_date');
      DateTime installDate;
      if (installDateStr == null) {
        installDate = DateTime.now();
        await prefs.setString('first_install_date', installDate.toIso8601String());
      } else {
        installDate = DateTime.parse(installDateStr);
      }

      final trialExpiry = installDate.add(const Duration(days: 30));
      final remaining = trialExpiry.difference(DateTime.now()).inDays;

      return {
        'status': remaining >= 0 ? 'trial' : 'expired',
        'remainingDays': remaining >= 0 ? remaining : 0,
        'hardwareId': hwId,
        'licenseType': 'نسخة تجريبية مجانية (أوفلاين 100%)',
      };
    }

    final expiryDate = DateTime.parse(expiryDateStr);
    final remaining = expiryDate.difference(DateTime.now()).inDays;

    return {
      'status': remaining >= 0 ? 'active' : 'expired',
      'remainingDays': remaining >= 0 ? remaining : 0,
      'hardwareId': hwId,
      'licenseType': 'ترخيص تجاري مرخص',
    };
  }

  // تفعيل الكود للتاجر
  Future<bool> activateWithKey(String inputKey) async {
    final hwId = await getHardwareId();
    final parts = inputKey.trim().split('-');
    
    if (parts.length == 4 && parts[0] == 'IDENIA') {
      final days = int.tryParse(parts[3]) ?? 365;
      final expected = generateActivationKey(hwId, days);
      
      if (inputKey.trim().toUpperCase() == expected.toUpperCase()) {
        final prefs = await SharedPreferences.getInstance();
        final expiry = DateTime.now().add(Duration(days: days));
        await prefs.setBool('is_activated', true);
        await prefs.setString('license_expiry', expiry.toIso8601String());
        return true;
      }
    }
    return false;
  }
}
