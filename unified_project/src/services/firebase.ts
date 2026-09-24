// Firebase Firestore Service for "إيدينيا - حِسبة"
// Handles Cloud License Verification, One-Time Code Usage Locking, and Merchant Registrations

import { initializeApp, getApps } from 'firebase/app';
import {
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
  orderBy
} from 'firebase/firestore';
import config from '../../../firebase-applet-config.json';
import { checkRealInternetConnection } from './network';
import { getDeviceId } from './device';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
}) : getApps()[0];

// Firestore Instance bound to assigned databaseId
export const firestore = getFirestore(app, config.firestoreDatabaseId || 'ai-studio-e8a11360-63f5-4c58-82ce-cfbccdea7c66');

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
  const merchantDocId = `m_${cleanPhone}`;
  const merchantRef = doc(firestore, 'merchants', merchantDocId);

  const docSnap = await getDoc(merchantRef);
  if (!docSnap.exists()) {
    return { exists: false, status: 'deleted' };
  }

  const data = docSnap.data();
  const now = Date.now();
  let status = data.subscriptionStatus || 'pending';
  const expiresAt = data.subscriptionExpiresAt || 0;

  if (status === 'active' && expiresAt > 0 && now >= expiresAt) {
    status = 'expired';
  }

  const remainingDays = expiresAt > now ? Math.ceil((expiresAt - now) / 86400000) : 0;

  return {
    exists: true,
    status,
    subscriptionDays: data.subscriptionDays || 0,
    subscriptionExpiresAt: expiresAt,
    subscriptionActivatedAt: data.subscriptionActivatedAt || 0,
    remainingDays,
    remainingMs: Math.max(0, expiresAt - now)
  };
}

// 3. Admin: Activate Merchant in Firebase (By Days Counter)
export async function activateMerchantInFirebase(phone: string, days: number, notes?: string) {
  const isOnline = await checkRealInternetConnection(3000);
  if (!isOnline) {
    throw new Error('يلزم الاتصال بالإنترنت لإتمام تفعيل حساب التاجر سحابياً.');
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const merchantDocId = `m_${cleanPhone}`;
  const merchantRef = doc(firestore, 'merchants', merchantDocId);

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

  await setDoc(merchantRef, updateData, { merge: true });
  return { success: true, expiresAt, remainingDays: days };
}

// 4. Admin: Extend Merchant Subscription in Firebase (+ X Days)
export async function extendMerchantInFirebase(phone: string, extraDays: number, notes?: string) {
  const isOnline = await checkRealInternetConnection(3000);
  if (!isOnline) {
    throw new Error('يلزم الاتصال بالإنترنت لتمديد الاشتراك.');
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const merchantDocId = `m_${cleanPhone}`;
  const merchantRef = doc(firestore, 'merchants', merchantDocId);

  const snap = await getDoc(merchantRef);
  const now = Date.now();
  let currentExpiry = snap.exists() ? (snap.data().subscriptionExpiresAt || 0) : 0;
  let newExpiry = currentExpiry > now ? currentExpiry + (extraDays * 86400000) : now + (extraDays * 86400000);

  const updateData: any = {
    subscriptionStatus: 'active',
    subscriptionExpiresAt: newExpiry,
    updatedAt: now
  };
  if (notes) updateData.notes = notes;

  await setDoc(merchantRef, updateData, { merge: true });
  const remainingDays = Math.ceil((newExpiry - now) / 86400000);
  return { success: true, newExpiry, remainingDays };
}

// 5. Admin: Freeze / Suspend Merchant in Firebase
export async function freezeMerchantInFirebase(phone: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const merchantDocId = `m_${cleanPhone}`;
  const merchantRef = doc(firestore, 'merchants', merchantDocId);

  await setDoc(merchantRef, {
    subscriptionStatus: 'frozen',
    updatedAt: Date.now()
  }, { merge: true });

  return { success: true };
}

// 6. Admin: Unfreeze Merchant in Firebase
export async function unfreezeMerchantInFirebase(phone: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const merchantDocId = `m_${cleanPhone}`;
  const merchantRef = doc(firestore, 'merchants', merchantDocId);

  const snap = await getDoc(merchantRef);
  const now = Date.now();
  const expiresAt = snap.exists() ? (snap.data().subscriptionExpiresAt || 0) : 0;
  const newStatus = expiresAt > now ? 'active' : 'expired';

  await setDoc(merchantRef, {
    subscriptionStatus: newStatus,
    updatedAt: now
  }, { merge: true });

  return { success: true, status: newStatus };
}

// 7. Admin: Delete Merchant from Firebase
export async function deleteMerchantInFirebase(phone: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const merchantDocId = `m_${cleanPhone}`;
  const merchantRef = doc(firestore, 'merchants', merchantDocId);

  await deleteDoc(merchantRef);
  return { success: true };
}

// 8. Admin: Update Merchant Password in Firebase
export async function updateMerchantPasswordInFirebase(phone: string, newPassword: string) {
  const isOnline = await checkRealInternetConnection(3000);
  if (!isOnline) {
    throw new Error('يلزم وجود اتصال بالإنترنت لتحديث كلمة المرور سحابياً.');
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const merchantDocId = `m_${cleanPhone}`;
  const merchantRef = doc(firestore, 'merchants', merchantDocId);

  await setDoc(merchantRef, {
    password: newPassword,
    passwordUpdatedAt: Date.now()
  }, { merge: true });

  return { success: true };
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
      isLoggedIn: true
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

    return {
      id: d.id,
      ...data,
      password: data.password || '',
      subscriptionStatus: status,
      remainingDays,
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

