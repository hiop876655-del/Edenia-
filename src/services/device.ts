// Device Hardware Fingerprint Helper for "إيدينيا - حِسبة"

export function getDeviceId(): string {
  const STORAGE_KEY = 'idenia_device_fingerprint_v2';
  try {
    let existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    // Generate hardware/browser fingerprint
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const userAgent = navigator.userAgent;
    const lang = navigator.language;
    const randomSeed = Math.random().toString(36).substring(2, 10);
    const timeSeed = Date.now().toString(36);

    const raw = `${screenInfo}-${userAgent}-${lang}-${randomSeed}-${timeSeed}`;
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }

    const deviceId = `IDN-DEV-${Math.abs(hash).toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
    return deviceId;
  } catch {
    return 'IDN-DEV-GENERIC-DEVICE-01';
  }
}
