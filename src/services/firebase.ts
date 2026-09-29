// Firebase Firestore Service for "إيدينيا - حِسبة"
// Handles Cloud License Verification, One-Time Code Usage Locking, and Merchant Registrations

import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import config from '../../firebase-applet-config.json';
import { checkRealInternetConnection } from './network';
import { getDeviceId } from './device';
import { normalizePhone } from './phoneUtils';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
}) : getApps()[0];

// Firestore Instance bound to assigned databaseId with auto-long-polling resilience
export const firestore = (() => {
  const dbId = config.firestoreDatabaseId || 'ai-studio-e8a11360-63f5-4c58-82ce-cfbccdea7c66';
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    }, dbId);
  } catch {
    return getFirestore(app, dbId);
  }
})();

export interface MerchantRegistrationPayload {
  fullName: string;
  shopName: string;
  phone: string;
  password?: string;
  tradeType: string;
  customTrade?: string;
  deviceType: string;
  osDetails?: string;
}

// 1. Register Merchant Account via Firebase
export async function registerMerchantInFirebase(payload: MerchantRegistrationPayload) {
  const isOnline = await checkRealInternetConnection(3000);
  if (!isOnline) {
    throw new Error('عفواً! يلزم وجود اتصال بالإنترنت لإثبات وتسجيل بيانات الحساب لأول مرة.');
  }

  const cleanPhone = payload.phone.replace(/[^0-9]/g, '');
  const merchantDocId = `m_${cleanPhone}`;
  const merchantRef = doc(firestore, 'merchants', merchantDocId);
  const deviceId = getDeviceId();

  const record = {
    ...payload,
    phone: payload.phone.trim(),
    password: payload.password || '',
    deviceId,
    registeredAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    subscriptionStatus: 'pending',
    subscriptionDays: 0,
    subscriptionExpiresAt: 0
  };

  await setDoc(merchantRef, record, { merge: true });
  return { success: true, merchant: record };
}

// 2. Real-time Status Check in Cloud Firestore
export async function checkMerchantStatusInFirebase(phone: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const trimmedPhone = phone.trim();
  const merchantDocId = `m_${cleanPhone}`;
  const merchantRef = doc(firestore, 'merchants', merchantDocId);

  let docSnap = await getDoc(merchantRef);
  let data: any = null;

  if (docSnap.exists()) {
    data = docSnap.data();
  } else {
    // Fallback: search by phone variations
    try {
      const q = query(
        collection(firestore, 'merchants'),
        where('phone', 'in', [trimmedPhone, cleanPhone, `0${cleanPhone}`.replace(/^00/, '0')])
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        data = querySnap.docs[0].data();
      }
    } catch {
      // ignore query error
    }
  }

  if (!data) {
    return { exists: false, status: 'deleted' };
  }

  const now = Date.now();
  let status = data.subscriptionStatus || 'pending';
  const expiresAt = data.subscriptionExpiresAt || 0;

  if (status === 'active' && expiresAt > 0 && now >= expiresAt) {
    status = 'expired';
  }

  const remainingDays = expiresAt > now ? Math.ceil((expiresAt - now) / 86400000) : 0;
  const isCameraActive = Boolean(
    data.cameraFeatureEnabled &&
    (!data.cameraFeatureExpiresAt || data.cameraFeatureExpiresAt === 0 || data.cameraFeatureExpiresAt > now)
  );

  return {
    exists: true,
    status,
    subscriptionDays: data.subscriptionDays || 0,
    subscriptionExpiresAt: expiresAt,
    subscriptionActivatedAt: data.subscriptionActivatedAt || 0,
    remainingDays,
    remainingMs: Math.max(0, expiresAt - now),
    cameraFeatureEnabled: isCameraActive,
    cameraFeatureExpiresAt: data.cameraFeatureExpiresAt || 0,
    cameraFeatureRawEnabled: Boolean(data.cameraFeatureEnabled)
  };
}

// 2.1. Live Firestore Real-Time Subscription for Instant Sub-Second Sync
export function subscribeToMerchantStatusInFirebase(phone: string, onUpdate: (status: any) => void) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return () => {};

  const merchantDocId = `m_${cleanPhone}`;
  const merchantRef = doc(firestore, 'merchants', merchantDocId);

  try {
    const unsubscribe = onSnapshot(merchantRef, (docSnap) => {
      if (!docSnap.exists()) {
        onUpdate({ exists: false, status: 'deleted' });
        return;
      }

      const data = docSnap.data();
      const now = Date.now();
      let status = data.subscriptionStatus || 'pending';
      const expiresAt = data.subscriptionExpiresAt || 0;

      if (status === 'active' && expiresAt > 0 && now >= expiresAt) {
        status = 'expired';
      }

      const remainingDays = expiresAt > now ? Math.ceil((expiresAt - now) / 86400000) : 0;
      const isCameraActive = Boolean(
        data.cameraFeatureEnabled &&
        (!data.cameraFeatureExpiresAt || data.cameraFeatureExpiresAt === 0 || data.cameraFeatureExpiresAt > now)
      );

      onUpdate({
        exists: true,
        status,
        subscriptionDays: data.subscriptionDays || 0,
        subscriptionExpiresAt: expiresAt,
        subscriptionActivatedAt: data.subscriptionActivatedAt || 0,
        remainingDays,
        remainingMs: Math.max(0, expiresAt - now),
        cameraFeatureEnabled: isCameraActive,
        cameraFeatureExpiresAt: data.cameraFeatureExpiresAt || 0,
        cameraFeatureRawEnabled: Boolean(data.cameraFeatureEnabled)
      });
    }, (error) => {
      console.warn('Realtime merchant snapshot error:', error);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Could not setup realtime snapshot:', err);
    return () => {};
  }
}

// Helper to update all merchant document variations in Firestore by phone
async function updateAllMerchantDocsInFirebase(phone: string, payload: any) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const trimmedPhone = phone.trim();
  const withZero = cleanPhone.startsWith('0') ? cleanPhone : `0${cleanPhone}`;
  const withoutZero = cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone;
  const phoneVariations = Array.from(new Set([trimmedPhone, cleanPhone, withZero, withoutZero]));

  const primaryDocId = `m_${cleanPhone}`;
  await setDoc(doc(firestore, 'merchants', primaryDocId), payload, { merge: true });

  try {
    const q = query(
      collection(firestore, 'merchants'),
      where('phone', 'in', phoneVariations)
    );
    const querySnap = await getDocs(q);
    for (const d of querySnap.docs) {
      if (d.id !== primaryDocId) {
        await setDoc(doc(firestore, 'merchants', d.id), payload, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Update all merchant docs error:', err);
  }
}

// Helper to delete all merchant document variations in Firestore by phone
async function deleteAllMerchantDocsInFirebase(phone: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const trimmedPhone = phone.trim();
  const withZero = cleanPhone.startsWith('0') ? cleanPhone : `0${cleanPhone}`;
  const withoutZero = cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone;
  const phoneVariations = Array.from(new Set([trimmedPhone, cleanPhone, withZero, withoutZero]));

  const primaryDocId = `m_${cleanPhone}`;
  try {
    await deleteDoc(doc(firestore, 'merchants', primaryDocId));
  } catch {}

  try {
    const q = query(
      collection(firestore, 'merchants'),
      where('phone', 'in', phoneVariations)
    );
    const querySnap = await getDocs(q);
    for (const d of querySnap.docs) {
      try {
        await deleteDoc(doc(firestore, 'merchants', d.id));
      } catch {}
    }
  } catch (err) {
    console.warn('Delete all merchant docs error:', err);
  }
}

// 3. Admin: Activate Merchant in Firebase (By Days Counter)
export async function activateMerchantInFirebase(phone: string, days: number, notes?: string) {
  const isOnline = await checkRealInternetConnection(3000);
  if (!isOnline) {
    throw new Error('يلزم الاتصال بالإنترنت لإتمام تفعيل حساب التاجر سحابياً.');
  }

  const now = Date.now();
  const expiresAt = now + (days * 86400000);

  const updateData: any = {
    subscriptionStatus: 'active',
    subscriptionDays: days,
    subscriptionActivatedAt: now,
    subscriptionExpiresAt: expiresAt,
    updatedAt: now
  };

  if (notes) updateData.notes = notes;

  await updateAllMerchantDocsInFirebase(phone, updateData);
  return { success: true, expiresAt, remainingDays: days };
}

// 4. Admin: Extend Merchant Subscription in Firebase (+ X Days)
export async function extendMerchantInFirebase(phone: string, extraDays: number, notes?: string) {
  const isOnline = await checkRealInternetConnection(3000);
  if (!isOnline) {
    throw new Error('يلزم الاتصال بالإنترنت لتمديد الاشتراك.');
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const primaryDocId = `m_${cleanPhone}`;
  const snap = await getDoc(doc(firestore, 'merchants', primaryDocId));
  const now = Date.now();
  let currentExpiry = snap.exists() ? (snap.data().subscriptionExpiresAt || 0) : 0;
  if (!currentExpiry) {
    try {
      const q = query(
        collection(firestore, 'merchants'),
        where('phone', 'in', [phone.trim(), cleanPhone, `0${cleanPhone}`.replace(/^00/, '0')])
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        currentExpiry = querySnap.docs[0].data().subscriptionExpiresAt || 0;
      }
    } catch {}
  }

  let newExpiry = currentExpiry > now ? currentExpiry + (extraDays * 86400000) : now + (extraDays * 86400000);

  const updateData: any = {
    subscriptionStatus: 'active',
    subscriptionExpiresAt: newExpiry,
    updatedAt: now
  };
  if (notes) updateData.notes = notes;

  await updateAllMerchantDocsInFirebase(phone, updateData);
  const remainingDays = Math.ceil((newExpiry - now) / 86400000);
  return { success: true, newExpiry, remainingDays };
}

// 5. Admin: Freeze / Suspend Merchant in Firebase
export async function freezeMerchantInFirebase(phone: string) {
  await updateAllMerchantDocsInFirebase(phone, {
    subscriptionStatus: 'frozen',
    updatedAt: Date.now()
  });

  return { success: true };
}

// 6. Admin: Unfreeze Merchant in Firebase
export async function unfreezeMerchantInFirebase(phone: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const primaryDocId = `m_${cleanPhone}`;
  const snap = await getDoc(doc(firestore, 'merchants', primaryDocId));
  const now = Date.now();
  let expiresAt = snap.exists() ? (snap.data().subscriptionExpiresAt || 0) : 0;
  if (!expiresAt) {
    try {
      const q = query(
        collection(firestore, 'merchants'),
        where('phone', 'in', [phone.trim(), cleanPhone, `0${cleanPhone}`.replace(/^00/, '0')])
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        expiresAt = querySnap.docs[0].data().subscriptionExpiresAt || 0;
      }
    } catch {}
  }
  const newStatus = expiresAt > now ? 'active' : 'expired';

  await updateAllMerchantDocsInFirebase(phone, {
    subscriptionStatus: newStatus,
    updatedAt: now
  });

  return { success: true, status: newStatus };
}

// 7. Admin: Delete Merchant from Firebase
export async function deleteMerchantInFirebase(phone: string) {
  await deleteAllMerchantDocsInFirebase(phone);
  return { success: true };
}

// 8. Admin: Update Merchant Password in Firebase
export async function updateMerchantPasswordInFirebase(phone: string, newPassword: string) {
  const isOnline = await checkRealInternetConnection(3000);
  if (!isOnline) {
    throw new Error('يلزم وجود اتصال بالإنترنت لتحديث كلمة المرور سحابياً.');
  }

  await updateAllMerchantDocsInFirebase(phone, {
    password: newPassword,
    passwordUpdatedAt: Date.now()
  });

  return { success: true };
}

// 8.01. Admin: Update Merchant Camera Feature in Firebase
export async function updateMerchantCameraFeatureInFirebase(phone: string, enabled: boolean, expiresAt: number) {
  try {
    const payload = {
      cameraFeatureEnabled: enabled,
      cameraFeatureExpiresAt: expiresAt,
      cameraFeatureUpdatedAt: Date.now(),
      updatedAt: Date.now()
    };

    await updateAllMerchantDocsInFirebase(phone, payload);
    return { success: true };
  } catch (err) {
    console.warn('Firebase camera feature update error:', err);
    return { success: false };
  }
}

// 8.1. Cloud Merchant Login & Password Verification
export async function loginMerchantInFirebase(phone: string, inputPassword: string) {
  const isOnline = await checkRealInternetConnection(3000);
  if (!isOnline) {
    throw new Error('يلزم وجود اتصال بالإنترنت للتحقق من الحساب سحابياً.');
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const trimmedPhone = phone.trim();
  const trimmedPassword = inputPassword.trim();

  // Try direct docId lookup first
  let targetData: any = null;
  let targetDocId = `m_${cleanPhone}`;

  let docSnap = await getDoc(doc(firestore, 'merchants', targetDocId));
  if (docSnap.exists()) {
    targetData = docSnap.data();
  } else {
    // Try query by phone field
    const q = query(
      collection(firestore, 'merchants'),
      where('phone', 'in', [trimmedPhone, cleanPhone, `0${cleanPhone}`.replace(/^00/, '0')])
    );
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      targetData = querySnap.docs[0].data();
      targetDocId = querySnap.docs[0].id;
    }
  }

  if (!targetData) {
    throw new Error('رقم الهاتف غير مسجل في النظام سحابياً، يرجى تسجيل حساب جديد أولاً.');
  }

  // Check Password
  const cloudPassword = String(targetData.password || '').trim();
  if (cloudPassword && cloudPassword !== trimmedPassword) {
    throw new Error('كلمة المرور غير صحيحة، يرجى التأكد منها أو التواصل مع إدارة المنصة لاستعادتها.');
  }

  // Auto-record password if it was missing in cloud doc
  if (!cloudPassword && trimmedPassword) {
    try {
      await setDoc(doc(firestore, 'merchants', targetDocId), { password: trimmedPassword }, { merge: true });
    } catch {
      // Non-blocking
    }
  }

  // Update last active
  const now = Date.now();
  try {
    await setDoc(doc(firestore, 'merchants', targetDocId), { lastActive: new Date().toISOString() }, { merge: true });
  } catch {
    // Non-blocking
  }

  const expiresAt = targetData.subscriptionExpiresAt || 0;
  let status = targetData.subscriptionStatus || 'pending';
  if (status === 'active' && expiresAt > 0 && now >= expiresAt) {
    status = 'expired';
  }
  const remainingDays = expiresAt > now ? Math.ceil((expiresAt - now) / 86400000) : 0;
  const isCameraActive = Boolean(
    targetData.cameraFeatureEnabled &&
    (!targetData.cameraFeatureExpiresAt || targetData.cameraFeatureExpiresAt === 0 || targetData.cameraFeatureExpiresAt > now)
  );

  // Retrieve cloud database config if saved
  let cloudConfig = targetData.cloudDbConfig || null;
  if (!cloudConfig) {
    try {
      const cfgSnap = await getDoc(doc(firestore, 'merchant_cloud_configs', `cfg_${cleanPhone}`));
      if (cfgSnap.exists()) {
        cloudConfig = cfgSnap.data();
      }
    } catch {
      // Non-blocking
    }
  }

  return {
    success: true,
    user: {
      id: targetDocId,
      fullName: targetData.fullName || 'تاجر إيدينيا',
      shopName: targetData.shopName || 'متجر إيدينيا',
      phone: targetData.phone || trimmedPhone,
      password: trimmedPassword,
      tradeType: targetData.tradeType || 'تجارة عامة',
      customTrade: targetData.customTrade || '',
      deviceType: targetData.deviceType || 'Windows Desktop',
      registeredAt: targetData.registeredAt || new Date().toISOString(),
      role: 'merchant' as const,
      subscriptionStatus: status,
      subscriptionDays: targetData.subscriptionDays || 0,
      subscriptionExpiresAt: expiresAt,
      remainingDays,
      cameraFeatureEnabled: isCameraActive,
      cameraFeatureExpiresAt: targetData.cameraFeatureExpiresAt || 0,
      isLoggedIn: true,
      cloudDbConfig: cloudConfig
    }
  };
}

// 9. Admin: Get Dashboard Registrations from Firebase
export async function getAdminDataFromFirebase() {
  const isOnline = await checkRealInternetConnection(3000);
  if (!isOnline) {
    throw new Error('يلزم وجود اتصال بالإنترنت لاستجلاب بيانات الإدارة السحابية.');
  }

  const merchantsSnap = await getDocs(collection(firestore, 'merchants'));
  const now = Date.now();

  const merchants = merchantsSnap.docs.map(d => {
    const data = d.data();
    const expiresAt = data.subscriptionExpiresAt || 0;
    let status = data.subscriptionStatus || 'pending';
    if (status === 'active' && expiresAt > 0 && now >= expiresAt) {
      status = 'expired';
    }
    const remainingDays = expiresAt > now ? Math.ceil((expiresAt - now) / 86400000) : 0;
    const isCameraActive = Boolean(
      data.cameraFeatureEnabled &&
      (!data.cameraFeatureExpiresAt || data.cameraFeatureExpiresAt === 0 || data.cameraFeatureExpiresAt > now)
    );

    return {
      id: d.id,
      ...data,
      password: data.password || '',
      subscriptionStatus: status,
      remainingDays,
      cameraFeatureEnabled: isCameraActive,
      cameraFeatureExpiresAt: data.cameraFeatureExpiresAt || 0,
      hasActiveLicense: status === 'active' && expiresAt > now,
      licenseRemainingMs: Math.max(0, expiresAt - now)
    };
  });

  return { merchants };
}

// ----------------- SYSTEM RELEASES & OTA LIVE UPDATES -----------------

export interface SystemReleaseRecord {
  id?: string;
  version: string;
  buildNumber: number;
  releaseTitle: string;
  releaseNotes: string;
  isForceUpdate: boolean;
  publishedBy: string;
  publishedAt: number;
  minSupportedVersion?: string;
  status: 'published' | 'draft';
}

// 10. Get Latest Published App Release from Firebase
export async function getLatestAppReleaseFromFirebase(): Promise<SystemReleaseRecord | null> {
  try {
    const latestRef = doc(firestore, 'system_releases', 'latest');
    const docSnap = await getDoc(latestRef);
    if (docSnap.exists()) {
      return docSnap.data() as SystemReleaseRecord;
    }
  } catch (err) {
    console.warn('Could not fetch latest release from Firestore:', err);
  }
  return null;
}

// 11. Admin: Publish New App Release to Firebase
export async function publishAppReleaseInFirebase(release: Omit<SystemReleaseRecord, 'publishedAt' | 'status'>) {
  const isOnline = await checkRealInternetConnection(3000);
  if (!isOnline) {
    throw new Error('يلزم الاتصال بالإنترنت لنشر التحديث سحابياً.');
  }

  const now = Date.now();
  const cleanVersion = release.version.trim().startsWith('v') ? release.version.trim() : `v${release.version.trim()}`;

  const payload: SystemReleaseRecord = {
    ...release,
    version: cleanVersion,
    publishedAt: now,
    status: 'published'
  };

  // 1. Write to latest document
  const latestRef = doc(firestore, 'system_releases', 'latest');
  await setDoc(latestRef, payload);

  // 2. Archive to historical release document
  const historyRef = doc(firestore, 'system_releases', `release_${cleanVersion.replace(/\./g, '_')}`);
  await setDoc(historyRef, payload);

  return { success: true, release: payload };
}

// 12. Admin: Get All Releases History from Firebase
export async function getAllAppReleasesFromFirebase(): Promise<SystemReleaseRecord[]> {
  try {
    const snap = await getDocs(collection(firestore, 'system_releases'));
    const releases: SystemReleaseRecord[] = [];
    snap.forEach(d => {
      if (d.id !== 'latest') {
        releases.push({ id: d.id, ...(d.data() as SystemReleaseRecord) });
      }
    });
    return releases.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  } catch (err) {
    console.warn('Error fetching all releases:', err);
    return [];
  }
}

// ----------------- MERCHANT DEDICATED CLOUD DATABASE -----------------

export interface MerchantCloudConfigRecord {
  provider: 'supabase' | 'custom' | 'firebase';
  projectUrl: string;
  apiKey: string;
  isConnected: boolean;
  connectedAt?: number;
  lastSyncedAt?: number;
  merchantPhone?: string;
  merchantShopName?: string;
  updatedAt?: number;
}

export interface DatabaseTutorialSettingsRecord {
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  providerRegisterUrl: string;
  updatedAt?: number;
}

// 13. Save Merchant Cloud Database Config (Linked by Phone Number)
export async function saveMerchantCloudConfigInFirebase(phone: string, config: MerchantCloudConfigRecord) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return { success: false, error: 'رقم هاتف غير صالح' };

  const merchantDocId = `m_${cleanPhone}`;
  const merchantRef = doc(firestore, 'merchants', merchantDocId);
  const cloudConfigRef = doc(firestore, 'merchant_cloud_configs', `cfg_${cleanPhone}`);

  const payload: MerchantCloudConfigRecord = {
    ...config,
    merchantPhone: cleanPhone,
    updatedAt: Date.now()
  };

  // Save to config collection and update merchant profile with resilient write
  try {
    await Promise.allSettled([
      setDoc(cloudConfigRef, payload, { merge: true }),
      setDoc(merchantRef, { cloudDbConfig: payload, hasCloudDb: true, updatedAt: Date.now() }, { merge: true })
    ]);
  } catch (e) {
    console.warn('Silent fallback on save cloud config:', e);
  }

  return { success: true, config: payload };
}

// 14. Get Merchant Cloud Database Config
export async function getMerchantCloudConfigFromFirebase(phone: string): Promise<MerchantCloudConfigRecord | null> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return null;

  try {
    // 1. Check in merchant record first
    const merchantRef = doc(firestore, 'merchants', `m_${cleanPhone}`);
    const merchantSnap = await getDoc(merchantRef);
    if (merchantSnap.exists()) {
      const data = merchantSnap.data();
      if (data.cloudDbConfig && data.cloudDbConfig.projectUrl && data.cloudDbConfig.apiKey) {
        return data.cloudDbConfig as MerchantCloudConfigRecord;
      }
    }

    // 2. Check in merchant_cloud_configs as fallback
    const cloudConfigRef = doc(firestore, 'merchant_cloud_configs', `cfg_${cleanPhone}`);
    const snap = await getDoc(cloudConfigRef);
    if (snap.exists()) {
      const cfg = snap.data() as MerchantCloudConfigRecord;
      if (cfg && cfg.projectUrl && cfg.apiKey) {
        return cfg;
      }
    }
  } catch (err) {
    console.warn('Could not fetch merchant cloud config:', err);
  }
  return null;
}

// 14.1. Save Merchant Full Data Snapshot & Live Real-Time Sync to Central Cloud (Instant Cross-Device Sync)
export async function saveMerchantDataSnapshotInFirebase(phone: string, snapshot: any) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || !snapshot) return { success: false };

  try {
    const deviceId = getDeviceId();
    const metaPayload = {
      updatedAt: Date.now(),
      isoDate: new Date().toISOString(),
      merchantPhone: cleanPhone,
      updatedByDeviceId: deviceId,
      data: snapshot
    };

    // Write to both latest backup and active realtime live channel
    const liveDocRef = doc(firestore, 'merchants', `m_${cleanPhone}`, 'live_data', 'store_data');
    const backupRef = doc(firestore, 'merchants', `m_${cleanPhone}`, 'cloud_backup', 'latest');

    await Promise.allSettled([
      setDoc(liveDocRef, metaPayload, { merge: true }),
      setDoc(backupRef, metaPayload, { merge: true })
    ]);

    return { success: true };
  } catch (err) {
    console.warn('Error saving merchant data snapshot in firebase:', err);
    return { success: false };
  }
}

// 14.2. Get Merchant Full Data Snapshot from Central Cloud
export async function getMerchantDataSnapshotFromFirebase(phone: string): Promise<any | null> {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return null;

  try {
    const liveDocRef = doc(firestore, 'merchants', `m_${cleanPhone}`, 'live_data', 'store_data');
    const liveSnap = await getDoc(liveDocRef);
    if (liveSnap.exists()) {
      const val = liveSnap.data();
      return val?.data || null;
    }

    const backupRef = doc(firestore, 'merchants', `m_${cleanPhone}`, 'cloud_backup', 'latest');
    const snap = await getDoc(backupRef);
    if (snap.exists()) {
      const val = snap.data();
      return val?.data || null;
    }
  } catch (err) {
    console.warn('Error getting merchant data snapshot from firebase:', err);
  }
  return null;
}

// 14.3. Real-Time Sub-Second Cross-Device Data Sync Listener (Phone <-> PC)
export function subscribeToMerchantDataSnapshotInFirebase(
  phone: string,
  onRemoteUpdate: (payload: { data: any; updatedAt: number; updatedByDeviceId?: string }) => void
): () => void {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return () => {};

  try {
    const liveDocRef = doc(firestore, 'merchants', `m_${cleanPhone}`, 'live_data', 'store_data');
    const unsubscribe = onSnapshot(
      liveDocRef,
      { includeMetadataChanges: false },
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        if (data && data.data) {
          onRemoteUpdate({
            data: data.data,
            updatedAt: data.updatedAt || Date.now(),
            updatedByDeviceId: data.updatedByDeviceId
          });
        }
      },
      (err) => {
        console.warn('Real-time database sync listener error:', err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Could not attach real-time database listener:', err);
    return () => {};
  }
}

// 14.4. High-Speed Delta Stream Event Broadcaster (Sub-50ms Granular Live Channel)
export async function publishMerchantRealtimeEvent(
  phone: string,
  event: {
    eventType: string; // 'SALE_CREATED' | 'INVOICE_VOIDED' | 'PRODUCT_MUTATED' | 'PRODUCT_DELETED' | 'CUSTOMER_MUTATED' | 'FULL_SYNC'
    entityId?: string;
    payload?: any;
  }
) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return;

  try {
    const deviceId = getDeviceId();
    const eventDocRef = doc(firestore, 'merchants', `m_${cleanPhone}`, 'live_data', 'stream_event');
    const fullEvent = {
      ...event,
      updatedAt: Date.now(),
      isoDate: new Date().toISOString(),
      merchantPhone: cleanPhone,
      updatedByDeviceId: deviceId
    };

    await setDoc(eventDocRef, fullEvent);
  } catch (err) {
    console.warn('Error publishing live realtime event:', err);
  }
}

export function subscribeToMerchantRealtimeEvents(
  phone: string,
  onEvent: (event: { eventType: string; entityId?: string; payload?: any; updatedAt: number; updatedByDeviceId?: string }) => void
): () => void {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return () => {};

  try {
    const eventDocRef = doc(firestore, 'merchants', `m_${cleanPhone}`, 'live_data', 'stream_event');
    const unsubscribe = onSnapshot(
      eventDocRef,
      { includeMetadataChanges: false },
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data() as any;
        if (data && data.eventType) {
          onEvent(data);
        }
      },
      (err) => {
        console.warn('Realtime event stream error:', err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Could not subscribe to realtime event stream:', err);
    return () => {};
  }
}

// 15. Admin: Save Database Tutorial Video & Link Settings
export async function saveDatabaseTutorialSettingsInFirebase(settings: Partial<DatabaseTutorialSettingsRecord>) {
  const isOnline = await checkRealInternetConnection(2500);
  if (!isOnline) {
    throw new Error('يلزم الاتصال بالإنترنت لحفظ إعدادات الفيديو سحابياً.');
  }

  const settingsRef = doc(firestore, 'system_config', 'database_tutorial');
  const payload: DatabaseTutorialSettingsRecord = {
    videoUrl: settings.videoUrl || '',
    thumbnailUrl: settings.thumbnailUrl || '',
    title: settings.title || 'شرح كيفية إنشاء وربط قاعدة بياناتك السحابية المجانية في دقيقتين',
    description: settings.description || 'اتبع الخطوات في الفيديو لإنشاء مشروعك السحابي الخاص ونسخ رابط المشروع والمفتاح وربطهما فورا.',
    providerRegisterUrl: settings.providerRegisterUrl || 'https://supabase.com/dashboard/sign-up',
    updatedAt: Date.now()
  };

  await setDoc(settingsRef, payload, { merge: true });
  return { success: true, settings: payload };
}

// 16. Get Database Tutorial Video & Link Settings
export async function getDatabaseTutorialSettingsFromFirebase(): Promise<DatabaseTutorialSettingsRecord> {
  const defaultSettings: DatabaseTutorialSettingsRecord = {
    videoUrl: '',
    thumbnailUrl: '',
    title: 'شرح كيفية إنشاء وربط قاعدة بياناتك السحابية المجانية في دقيقتين',
    description: 'اتبع الخطوات البسيطة في الفيديو لإنشاء مشروعك السحابي والحصول على رابط المشروع والمفتاح لربطهما بنقرة واحدة.',
    providerRegisterUrl: 'https://supabase.com/dashboard/sign-up',
    updatedAt: Date.now()
  };

  try {
    const settingsRef = doc(firestore, 'system_config', 'database_tutorial');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return { ...defaultSettings, ...(snap.data() as DatabaseTutorialSettingsRecord) };
    }
  } catch (err) {
    console.warn('Error fetching database tutorial settings:', err);
  }

  return defaultSettings;
}

// 17. POS Station Pairing & Live Cloud Barcode Stream (Phone <-> PC Station)
export async function sendStationBarcodeScanInFirebase(
  phone: string,
  stationId: string,
  scanData: { barcode: string; mode: 'sale' | 'return'; productName?: string; nonce?: string }
) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanStation = (stationId || 'POS-1').trim().toUpperCase();
  if (!cleanPhone || !scanData.barcode) return { success: false };

  try {
    const deviceId = getDeviceId();
    const scanRef = doc(firestore, 'merchants', `m_${cleanPhone}`, 'stations', cleanStation, 'live_stream', 'scan_event');
    const payload = {
      barcode: scanData.barcode.trim(),
      mode: scanData.mode || 'sale',
      productName: scanData.productName || '',
      stationId: cleanStation,
      sentByDeviceId: deviceId,
      timestamp: Date.now()
    };

    await setDoc(scanRef, payload);
    return { success: true };
  } catch (err) {
    console.warn('Error broadcasting station barcode in firebase:', err);
    return { success: false };
  }
}

export function subscribeToStationBarcodeScanInFirebase(
  phone: string,
  stationId: string,
  onScan: (scan: { barcode: string; mode: 'sale' | 'return'; timestamp: number; sentByDeviceId?: string }) => void
): () => void {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanStation = (stationId || 'POS-1').trim().toUpperCase();
  if (!cleanPhone) return () => {};

  try {
    const scanRef = doc(firestore, 'merchants', `m_${cleanPhone}`, 'stations', cleanStation, 'live_stream', 'scan_event');
    let lastHandledTimestamp = Date.now();

    const unsubscribe = onSnapshot(
      scanRef,
      { includeMetadataChanges: false },
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        if (data && data.barcode && data.timestamp && data.timestamp > lastHandledTimestamp) {
          lastHandledTimestamp = data.timestamp;
          onScan({
            barcode: data.barcode,
            mode: data.mode || 'sale',
            timestamp: data.timestamp,
            sentByDeviceId: data.sentByDeviceId
          });
        }
      },
      (err) => {
        console.warn('Station scan subscription error:', err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Could not attach station scan listener:', err);
    return () => {};
  }
}

export async function pingStationPhonePresenceInFirebase(phone: string, stationId: string, phoneName?: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanStation = (stationId || 'POS-1').trim().toUpperCase();
  if (!cleanPhone) return;

  try {
    const presenceRef = doc(firestore, 'merchants', `m_${cleanPhone}`, 'stations', cleanStation, 'presence', 'phone');
    await setDoc(
      presenceRef,
      {
        isConnected: true,
        deviceName: phoneName || 'هاتف الكاشير',
        deviceId: getDeviceId(),
        lastSeen: Date.now()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Presence ping error:', err);
  }
}

export function subscribeToStationPhonePresenceInFirebase(
  phone: string,
  stationId: string,
  onPresence: (presence: { isConnected: boolean; deviceName?: string; lastSeen?: number }) => void
): () => void {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanStation = (stationId || 'POS-1').trim().toUpperCase();
  if (!cleanPhone) return () => {};

  try {
    const presenceRef = doc(firestore, 'merchants', `m_${cleanPhone}`, 'stations', cleanStation, 'presence', 'phone');
    const unsubscribe = onSnapshot(
      presenceRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          onPresence({ isConnected: false });
          return;
        }
        const data = docSnap.data();
        const now = Date.now();
        const isRecentlyActive = data && data.lastSeen && (now - data.lastSeen < 25000);
        onPresence({
          isConnected: Boolean(isRecentlyActive),
          deviceName: data?.deviceName || 'هاتف الكاشير',
          lastSeen: data?.lastSeen
        });
      },
      (err) => {
        console.warn('Presence subscription error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not attach presence listener:', err);
    return () => {};
  }
}

