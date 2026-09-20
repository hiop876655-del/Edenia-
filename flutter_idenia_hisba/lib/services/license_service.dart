import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LicenseService {
  static const String _secretSalt = 'IDENIA_HISBA_HARDWARE_PROTECTION_2026';

  // Get unique Hardware Fingerprint for Machine
  static Future<String> getMachineId() async {
    final deviceInfo = DeviceInfoPlugin();
    String raw = 'UNKNOWN_DEVICE';

    try {
      if (Platform.isWindows) {
        final winInfo = await deviceInfo.windowsInfo;
        raw = '${winInfo.computerName}_${winInfo.deviceId}_${winInfo.numberOfCores}';
      } else if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        raw = '${androidInfo.manufacturer}_${androidInfo.model}_${androidInfo.id}';
      } else {
        raw = 'GENERIC_${Platform.operatingSystem}';
      }
    } catch (_) {
      raw = 'FALLBACK_HARDWARE_ID';
    }

    // SHA-256 hash formatted as IDENIA-XXXX-XXXX-XXXX
    final bytes = utf8.encode(raw);
    final digest = sha256.convert(bytes).toString().toUpperCase();
    return 'IDN-${digest.substring(0, 4)}-${digest.substring(4, 8)}-${digest.substring(8, 12)}';
  }

  // Generate valid activation key for a given machine ID
  static String generateActivationKey(String machineId, {int validityDays = 365}) {
    final combined = '$machineId:$_secretSalt:$validityDays';
    final hash = sha256.convert(utf8.encode(combined)).toString().toUpperCase();
    return 'ACT-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}';
  }

  // Verify activation key entered by user
  static Future<bool> activateWithKey(String enteredKey) async {
    final machineId = await getMachineId();
    final validKey = generateActivationKey(machineId);

    if (enteredKey.trim().toUpperCase() == validKey) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('is_activated', true);
      await prefs.setString('activation_key', validKey);
      await prefs.setString('activated_at', DateTime.now().toIso8601String());
      return true;
    }
    return false;
  }

  // Check if system is active or within 7-day trial
  static Future<bool> isSystemActive() async {
    final prefs = await SharedPreferences.getInstance();
    final isActivated = prefs.getBool('is_activated') ?? false;
    if (isActivated) return true;

    // Check trial
    String? firstRun = prefs.getString('first_run_date');
    if (firstRun == null) {
      firstRun = DateTime.now().toIso8601String();
      await prefs.setString('first_run_date', firstRun);
      return true;
    }

    final firstDate = DateTime.parse(firstRun);
    final diff = DateTime.now().difference(firstDate).inDays;
    return diff <= 7; // 7 days trial period
  }

  static Future<int> getRemainingTrialDays() async {
    final prefs = await SharedPreferences.getInstance();
    final isActivated = prefs.getBool('is_activated') ?? false;
    if (isActivated) return 9999;

    String? firstRun = prefs.getString('first_run_date');
    if (firstRun == null) return 7;

    final firstDate = DateTime.parse(firstRun);
    final diff = DateTime.now().difference(firstDate).inDays;
    return (7 - diff).clamp(0, 7);
  }
}
