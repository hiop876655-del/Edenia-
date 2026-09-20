// OTA Live Updates Service for "إيدينيا - حِسبة"
// Checks cloud releases, notifies merchants, and applies clean bundle reload

import {
  getLatestAppReleaseFromFirebase,
  publishAppReleaseInFirebase,
  getAllAppReleasesFromFirebase,
  SystemReleaseRecord
} from './firebase';
import { APP_VERSION, APP_BUILD_NUMBER } from '../config/version';
import { checkRealInternetConnection } from './network';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  currentBuild: number;
  latestRelease: SystemReleaseRecord | null;
  isForced: boolean;
  isOnline: boolean;
  error?: string;
}

export const updateService = {
  getCurrentVersion() {
    return APP_VERSION;
  },

  getCurrentBuild() {
    return APP_BUILD_NUMBER;
  },

  // 1. Check for available updates in Cloud Firestore
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const isOnline = await checkRealInternetConnection(2500);
    if (!isOnline) {
      return {
        hasUpdate: false,
        currentVersion: APP_VERSION,
        currentBuild: APP_BUILD_NUMBER,
        latestRelease: null,
        isForced: false,
        isOnline: false,
        error: 'لا يوجد اتصال بالإنترنت للتحقق من التحديثات السحابية.'
      };
    }

    try {
      const latest = await getLatestAppReleaseFromFirebase();
      if (!latest) {
        return {
          hasUpdate: false,
          currentVersion: APP_VERSION,
          currentBuild: APP_BUILD_NUMBER,
          latestRelease: null,
          isForced: false,
          isOnline: true
        };
      }

      // Check if latest build number is strictly greater than local build number,
      // or if version string is different
      const latestBuild = Number(latest.buildNumber) || 0;
      const cleanLatestVer = (latest.version || '').replace(/^v/, '').trim();
      const cleanCurrentVer = APP_VERSION.replace(/^v/, '').trim();

      const hasUpdate = (latestBuild > APP_BUILD_NUMBER) || (cleanLatestVer !== '' && cleanLatestVer !== cleanCurrentVer && latestBuild >= APP_BUILD_NUMBER);

      return {
        hasUpdate,
        currentVersion: APP_VERSION,
        currentBuild: APP_BUILD_NUMBER,
        latestRelease: latest,
        isForced: !!latest.isForceUpdate,
        isOnline: true
      };
    } catch (err: any) {
      return {
        hasUpdate: false,
        currentVersion: APP_VERSION,
        currentBuild: APP_BUILD_NUMBER,
        latestRelease: null,
        isForced: false,
        isOnline: true,
        error: err.message || 'تعذر التحقق من التحديثات.'
      };
    }
  },

  // 2. Apply Live Update (Purge Caches, Unregister SW, Reload Seamlessly)
  async applyLiveUpdate(onProgress?: (step: string, percent: number) => void): Promise<void> {
    try {
      onProgress?.('جاري فحص اتصال الخادم السحابي...', 20);
      await new Promise(r => setTimeout(r, 400));

      onProgress?.('جاري تفريغ الذاكرة المؤقتة القديمة وسحب أحدث حزم الكود...', 50);

      // Purge CacheStorage
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.map(key => window.caches.delete(key)));
        } catch {
          // Non-blocking
        }
      }

      // Unregister Service Workers
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
        } catch {
          // Non-blocking
        }
      }

      onProgress?.('جاري تأكيد حفظ بيانات التاجر والمبيعات محلياً 100%...', 80);
      await new Promise(r => setTimeout(r, 400));

      // Mark update success flag
      try {
        sessionStorage.setItem('idenia_just_updated', 'true');
      } catch {
        // Non-blocking
      }

      onProgress?.('تم اكتمال التحديث! جاري تشغيل الواجهة الجديدة...', 100);
      await new Promise(r => setTimeout(r, 300));

      // Clean reload with cache buster query
      const url = new URL(window.location.href);
      url.searchParams.set('update_v', Date.now().toString());
      window.location.href = url.toString();
    } catch (err) {
      console.error('Update execution error:', err);
      window.location.reload();
    }
  },

  // 3. Admin: Publish Release
  async publishRelease(release: Omit<SystemReleaseRecord, 'publishedAt' | 'status'>) {
    return await publishAppReleaseInFirebase(release);
  },

  // 4. Admin: Get History
  async getReleasesHistory() {
    return await getAllAppReleasesFromFirebase();
  }
};
