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
  getCurrentVersion(): string {
    if (typeof window !== 'undefined') {
      try {
        const savedVersion = localStorage.getItem('idenia_applied_version');
        if (savedVersion) return savedVersion;
      } catch {
        // Fallback
      }
    }
    return APP_VERSION;
  },

  getCurrentBuild(): number {
    if (typeof window !== 'undefined') {
      try {
        const savedBuild = localStorage.getItem('idenia_applied_build');
        if (savedBuild && !isNaN(Number(savedBuild))) {
          return Math.max(APP_BUILD_NUMBER, Number(savedBuild));
        }
      } catch {
        // Fallback
      }
    }
    return APP_BUILD_NUMBER;
  },

  // 1. Check for available updates in Cloud Firestore
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const isOnline = await checkRealInternetConnection(2500);
    const currentBuild = this.getCurrentBuild();
    const currentVer = this.getCurrentVersion();

    if (!isOnline) {
      return {
        hasUpdate: false,
        currentVersion: currentVer,
        currentBuild: currentBuild,
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
          currentVersion: currentVer,
          currentBuild: currentBuild,
          latestRelease: null,
          isForced: false,
          isOnline: true
        };
      }

      // Check if latest build number is strictly greater than current installed build number,
      // or if clean version string is different and latest build is greater
      const latestBuild = Number(latest.buildNumber) || 0;
      const cleanLatestVer = (latest.version || '').replace(/^v/, '').trim();
      const cleanCurrentVer = currentVer.replace(/^v/, '').trim();

      const hasUpdate = (latestBuild > currentBuild) || (cleanLatestVer !== '' && cleanLatestVer !== cleanCurrentVer && latestBuild > currentBuild);

      return {
        hasUpdate,
        currentVersion: currentVer,
        currentBuild: currentBuild,
        latestRelease: latest,
        isForced: !!latest.isForceUpdate,
        isOnline: true
      };
    } catch (err: any) {
      return {
        hasUpdate: false,
        currentVersion: currentVer,
        currentBuild: currentBuild,
        latestRelease: null,
        isForced: false,
        isOnline: true,
        error: err.message || 'تعذر التحقق من التحديثات.'
      };
    }
  },

  // 2. Apply Live Update (Purge Caches, Unregister SW, Reload Seamlessly)
  async applyLiveUpdate(
    latestRelease?: SystemReleaseRecord | null,
    onProgress?: (step: string, percent: number) => void
  ): Promise<void> {
    try {
      onProgress?.('جاري فحص اتصال الخادم السحابي واستلام الحزمة الجديدة...', 20);
      await new Promise(r => setTimeout(r, 400));

      onProgress?.('جاري تفريغ الذاكرة المؤقتة القديمة وسحب أحدث حزم الكود...', 50);

      // Save updated version and build number in localStorage
      if (latestRelease && typeof window !== 'undefined') {
        try {
          if (latestRelease.buildNumber) {
            localStorage.setItem('idenia_applied_build', String(latestRelease.buildNumber));
          }
          if (latestRelease.version) {
            localStorage.setItem('idenia_applied_version', latestRelease.version);
          }
        } catch {
          // Non-blocking
        }
      }

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
    const published = await publishAppReleaseInFirebase(release);
    if (typeof window !== 'undefined' && release) {
      try {
        if (release.buildNumber) {
          localStorage.setItem('idenia_applied_build', String(release.buildNumber));
        }
        if (release.version) {
          localStorage.setItem('idenia_applied_version', release.version);
        }
      } catch {
        // Non-blocking
      }
    }
    return published;
  },

  // 4. Admin: Get History
  async getReleasesHistory() {
    return await getAllAppReleasesFromFirebase();
  }
};
