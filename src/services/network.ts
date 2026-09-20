// Smart Network Connection Sensor for "إيدينيا - حِسبة"
// Checks real internet connectivity across multiple reliable endpoints with fast timeout

export interface NetworkStatus {
  isOnline: boolean;
  lastCheckedAt: number;
  checking: boolean;
  message?: string;
}

const CHECK_ENDPOINTS = [
  'https://www.gstatic.com/generate_204',
  'https://1.1.1.1/cdn-cgi/trace',
  'https://dns.google/resolve?name=google.com'
];

export async function checkRealInternetConnection(timeoutMs = 3000): Promise<boolean> {
  // 1. Browser API fast check
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  // 2. Multi-endpoint Ping check
  for (const endpoint of CHECK_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(endpoint, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timer);
      if (res.type === 'opaque' || res.ok) {
        return true;
      }
    } catch {
      // Try next endpoint if this one fails or times out
      continue;
    }
  }

  // 3. Fallback: Try fetching current origin timestamp or ping
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`/api/time?t=${Date.now()}`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) return true;
  } catch {
    // Ignore
  }

  return false;
}
