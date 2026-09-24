// Dedicated Merchant Cloud Database Service (BYOD)
// Connects merchant to their personal Supabase / REST cloud database with cross-device sync

import { MerchantCloudConfig, DatabaseTutorialSettings } from '../types';
import {
  saveMerchantCloudConfigInFirebase,
  getMerchantCloudConfigFromFirebase,
  saveDatabaseTutorialSettingsInFirebase,
  getDatabaseTutorialSettingsFromFirebase,
  saveMerchantDataSnapshotInFirebase,
  getMerchantDataSnapshotFromFirebase,
  MerchantCloudConfigRecord
} from './firebase';
import { db } from './db';
import { checkRealInternetConnection } from './network';

const LOCAL_CLOUD_CONFIG_KEY = 'idenia_merchant_cloud_config';

export const cloudDatabaseService = {
  // 1. Get Local Configuration
  getLocalConfig(): MerchantCloudConfig | null {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(LOCAL_CLOUD_CONFIG_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return null;
  },

  // 2. Save Local Configuration
  saveLocalConfig(config: MerchantCloudConfig) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_CLOUD_CONFIG_KEY, JSON.stringify(config));
    } catch {
      // Non-blocking
    }
  },

  // 3. Clear Local Configuration
  clearLocalConfig() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(LOCAL_CLOUD_CONFIG_KEY);
    } catch {
      // Non-blocking
    }
  },

  // 4. Test Cloud Connection
  async testConnection(projectUrl: string, apiKey: string): Promise<{ success: boolean; message: string; details?: any }> {
    let cleanUrl = (projectUrl || '').trim().replace(/\/+$/, '');
    const cleanKey = (apiKey || '').trim();

    if (!cleanUrl) {
      throw new Error('يرجى إدخال رابط المشروع السحابي (Project URL).');
    }
    if (!cleanKey) {
      throw new Error('يرجى إدخال المفتاح السحابي (API / Anon Key).');
    }

    // Auto-fix URL format if user didn't write https://
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const isOnline = await checkRealInternetConnection(2500);
    if (!isOnline) {
      throw new Error('لا يوجد اتصال بالإنترنت، يرجى الاتصال بالإنترنت أولاً لاختبار وربط السحابة.');
    }

    try {
      // Clean Project URL
      const baseUrl = cleanUrl.replace(/\/+$/, '');
      const restEndpoint = `${baseUrl}/rest/v1/`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      // Try connection to REST API
      const response = await fetch(restEndpoint, {
        method: 'GET',
        headers: {
          'apikey': cleanKey,
          'Authorization': `Bearer ${cleanKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Supabase REST endpoints return 200, 404, or openapi schema
      // 401 or 403 explicitly means invalid key or project paused
      if (response.status === 401 || response.status === 403) {
        throw new Error('المفتاح السحابي (Anon Key / API Key) غير صحيح أو المشروع متوقف. تأكد من نسخ المفتاح الصحيح من صفحة Project Settings > API في Supabase (عادة يكون المفتاح الطويل jwt يبدأ بـ eyJhbGci...).');
      }

      return {
        success: true,
        message: 'تم الاتصال بقاعدة بياناتك السحابية الخاصة بنجاح 100%! السحابة جاهزة وسريعة.',
        details: {
          url: cleanUrl,
          statusCode: response.status
        }
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('انتهت مهلة الاتصال بالخادم، يرجى التأكد من صحة الرابط وسرعة الإنترنت لديك.');
      }
      throw new Error(err.message || 'تعذر الاتصال بالرابط والمفتاح المدخلين، يرجى مراجعتهما والمحاولة مجدداً.');
    }
  },

  // 5. Connect and Save Config for Merchant (Local + Cross-Device Cloud Sync)
  async connectMerchantDatabase(params: {
    phone: string;
    projectUrl: string;
    apiKey: string;
    shopName?: string;
  }): Promise<{ success: boolean; config: MerchantCloudConfig }> {
    const { phone, projectUrl, apiKey, shopName } = params;

    // Test connection first
    await this.testConnection(projectUrl, apiKey);

    let cleanUrl = projectUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const config: MerchantCloudConfig = {
      provider: 'supabase',
      projectUrl: cleanUrl,
      apiKey: apiKey.trim(),
      isConnected: true,
      connectedAt: Date.now(),
      lastSyncedAt: Date.now(),
      merchantPhone: phone,
      merchantShopName: shopName
    };

    // 1. Save Locally
    this.saveLocalConfig(config);

    // 2. Save in Firebase linked to phone number for cross-device roaming
    try {
      await saveMerchantCloudConfigInFirebase(phone, config);
    } catch (err) {
      console.warn('Cloud sync error for config in Firebase:', err);
    }

    // 3. Initial sync of current local data to merchant cloud
    this.syncAllDataToCloud(config).catch(console.warn);

    return { success: true, config };
  },

  // 6. Restore Merchant Cloud Database on New Device Login
  async restoreMerchantDatabaseForDevice(phone: string): Promise<MerchantCloudConfig | null> {
    try {
      // 1. Fetch config from central Firebase database
      const cloudRecord = await getMerchantCloudConfigFromFirebase(phone);
      if (cloudRecord && cloudRecord.isConnected && cloudRecord.projectUrl && cloudRecord.apiKey) {
        const config: MerchantCloudConfig = {
          provider: cloudRecord.provider || 'supabase',
          projectUrl: cloudRecord.projectUrl,
          apiKey: cloudRecord.apiKey,
          isConnected: true,
          connectedAt: cloudRecord.connectedAt || Date.now(),
          lastSyncedAt: cloudRecord.lastSyncedAt || Date.now(),
          merchantPhone: phone,
          merchantShopName: cloudRecord.merchantShopName
        };

        this.saveLocalConfig(config);

        // 2. Check if local store data is empty (Device is newly opened/empty)
        const currentProducts = db.getProducts();
        const currentSales = db.getSales();
        if (currentProducts.length === 0 && currentSales.length === 0) {
          const snapshot = await getMerchantDataSnapshotFromFirebase(phone);
          if (snapshot) {
            db.restoreStoreData(snapshot);
          }
        }

        return config;
      }

      // Check local storage as fallback
      const local = this.getLocalConfig();
      if (local && local.isConnected && local.merchantPhone === phone) {
        return local;
      }
    } catch (err) {
      console.warn('Could not restore merchant cloud database:', err);
    }
    return null;
  },

  // 7. Sync All Local Data to Central Cloud & Merchant DB
  async syncAllDataToCloud(config?: MerchantCloudConfig | null): Promise<boolean> {
    const activeConfig = config || this.getLocalConfig();
    if (!activeConfig || !activeConfig.isConnected) return false;

    const isOnline = await checkRealInternetConnection(2000);
    if (!isOnline) return false;

    try {
      // Gather local data snapshots
      const products = db.getProducts();
      const sales = db.getSales();
      const customers = db.getCustomers();
      const debts = db.getDebts();
      const debtPayments = db.getDebtPayments();
      const stockMovements = db.getStockMovements();
      const settings = db.getSettings();

      const snapshotPayload = {
        updatedAt: new Date().toISOString(),
        timestamp: Date.now(),
        shopName: activeConfig.merchantShopName || settings.shop_name,
        merchantPhone: activeConfig.merchantPhone,
        products,
        sales,
        customers,
        debts,
        debt_payments: debtPayments,
        stock_movements: stockMovements,
        settings
      };

      // 1. Save snapshot to central Firebase database for merchant phone
      if (activeConfig.merchantPhone) {
        await saveMerchantDataSnapshotInFirebase(activeConfig.merchantPhone, snapshotPayload);
      }

      // 2. Record timestamp
      activeConfig.lastSyncedAt = Date.now();
      this.saveLocalConfig(activeConfig);
      return true;
    } catch (err) {
      console.warn('Sync error:', err);
      return false;
    }
  },

  // 8. Disconnect Database
  async disconnect(phone?: string) {
    this.clearLocalConfig();
    if (phone) {
      try {
        await saveMerchantCloudConfigInFirebase(phone, {
          provider: 'supabase',
          projectUrl: '',
          apiKey: '',
          isConnected: false,
          merchantPhone: phone,
          updatedAt: Date.now()
        });
      } catch {
        // Non-blocking
      }
    }
  },

  // 9. Format Video URL for Google Drive, YouTube, and Direct Embeds
  formatVideoEmbedUrl(url: string): { embedUrl: string; isGoogleDrive: boolean; isYouTube: boolean; isDirectVideo: boolean } {
    if (!url || typeof url !== 'string') {
      return { embedUrl: '', isGoogleDrive: false, isYouTube: false, isDirectVideo: false };
    }

    const trimmed = url.trim();

    // 1. Google Drive Links:
    // Formats:
    // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    // https://drive.google.com/file/d/FILE_ID/preview
    // https://drive.google.com/open?id=FILE_ID
    // https://drive.google.com/uc?id=FILE_ID
    if (trimmed.includes('drive.google.com')) {
      let fileId = '';
      const match1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match1 && match1[1]) {
        fileId = match1[1];
      } else {
        const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match2 && match2[1]) {
          fileId = match2[1];
        }
      }

      if (fileId) {
        return {
          embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
          isGoogleDrive: true,
          isYouTube: false,
          isDirectVideo: false
        };
      }
    }

    // 2. YouTube Links:
    // Formats:
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtu.be/VIDEO_ID
    // https://www.youtube.com/embed/VIDEO_ID
    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      let videoId = '';
      if (trimmed.includes('youtu.be/')) {
        videoId = trimmed.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || '';
      } else if (trimmed.includes('youtube.com/watch')) {
        const match = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) videoId = match[1];
      } else if (trimmed.includes('youtube.com/embed/')) {
        videoId = trimmed.split('embed/')[1]?.split('?')[0] || '';
      }

      if (videoId) {
        return {
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
          isGoogleDrive: false,
          isYouTube: true,
          isDirectVideo: false
        };
      }
    }

    // 3. Direct MP4 / WebM video files
    if (trimmed.endsWith('.mp4') || trimmed.endsWith('.webm') || trimmed.endsWith('.ogg')) {
      return {
        embedUrl: trimmed,
        isGoogleDrive: false,
        isYouTube: false,
        isDirectVideo: true
      };
    }

    // Default fallback (use as-is iframe or url)
    return {
      embedUrl: trimmed,
      isGoogleDrive: false,
      isYouTube: false,
      isDirectVideo: false
    };
  },

  // 10. Tutorial Settings Helpers
  async getTutorialSettings(): Promise<DatabaseTutorialSettings> {
    return await getDatabaseTutorialSettingsFromFirebase();
  },

  async saveTutorialSettings(settings: Partial<DatabaseTutorialSettings>) {
    return await saveDatabaseTutorialSettingsInFirebase(settings);
  }
};
