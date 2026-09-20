import express from "express";
import path from "path";
import fs from "fs";
import * as archiverModule from "archiver";
const ZipArchive = (archiverModule as any).ZipArchive || (archiverModule as any).default?.ZipArchive;

const app = express();
const PORT = 3000;

app.use(express.json());

// Health check endpoints for Cloud Run / load balancer probes
app.get(["/health", "/api/health"], (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Server Data Storage Directory
const DATA_DIR = path.join(process.cwd(), "server_data");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("Notice: server_data dir creation warning:", e);
}

const DB_FILE = path.join(DATA_DIR, "system_store.json");

export interface UserRecord {
  id: string;
  fullName: string;
  shopName: string;
  phone: string;
  password?: string;
  tradeType: string;
  customTrade?: string;
  deviceType: string;
  osDetails: string;
  ip: string;
  registeredAt: string;
  lastActive: string;
  subscriptionStatus: 'pending' | 'active' | 'expired' | 'frozen';
  subscriptionDays: number;
  subscriptionExpiresAt: number;
  subscriptionActivatedAt?: number;
  notes?: string;
  updatedAt?: number;
}

export interface SystemStore {
  users: UserRecord[];
  adminSecret: string;
}

function loadStore(): SystemStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.users)) {
        // Migration guarantee
        parsed.users = parsed.users.map((u: any) => ({
          ...u,
          subscriptionStatus: u.subscriptionStatus || (u.licenseExpiresAt && u.licenseExpiresAt > Date.now() ? 'active' : 'pending'),
          subscriptionDays: u.subscriptionDays || 30,
          subscriptionExpiresAt: u.subscriptionExpiresAt || u.licenseExpiresAt || 0
        }));
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading store:", err);
  }

  // Clean initial store
  const initialStore: SystemStore = {
    users: [],
    adminSecret: "Khaled2008"
  };

  saveStore(initialStore);
  return initialStore;
}

function saveStore(store: SystemStore) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving store:", err);
  }
}

let systemStore = loadStore();

// ----------------- API ROUTES -----------------

// 1. Reliable Network/Server Time (NTP / Server Clock)
app.get("/api/time", (req, res) => {
  const now = Date.now();
  res.json({
    success: true,
    serverTime: new Date(now).toISOString(),
    timestamp: now
  });
});

// 2. Merchant Registration (Default status: pending activation)
app.post("/api/register", (req, res) => {
  const { fullName, shopName, phone, password, tradeType, customTrade, deviceType, osDetails } = req.body;

  if (!fullName || !shopName || !phone || !password || !tradeType) {
    return res.status(400).json({
      success: false,
      message: "جميع الحقول مطلوبة: الاسم الثلاثي، اسم المحل، رقم الهاتف، كلمة المرور، ونوع التجارة."
    });
  }

  const cleanPhone = phone.trim();
  const existing = systemStore.users.find(u => u.phone === cleanPhone);
  if (existing) {
    return res.status(400).json({
      success: false,
      message: "رقم الهاتف مسجل مسبقاً، يرجى تسجيل الدخول أو استخدام رقم آخر."
    });
  }

  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

  const newUser: UserRecord = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    fullName: fullName.trim(),
    shopName: shopName.trim(),
    phone: cleanPhone,
    password: String(password),
    tradeType,
    customTrade: customTrade || "",
    deviceType: deviceType || "Windows Desktop",
    osDetails: osDetails || (req.headers["user-agent"] || "غير معروف"),
    ip: String(clientIp),
    registeredAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    subscriptionStatus: "pending",
    subscriptionDays: 0,
    subscriptionExpiresAt: 0
  };

  systemStore.users.unshift(newUser);
  saveStore(systemStore);

  console.log(`[تسجيل جديد] تاجر: ${fullName} (${shopName}) - هاتف: ${phone} - بانتظار التفعيل`);

  res.json({
    success: true,
    message: "تم تسجيل الحساب بنجاح، بانتظار تفعيل الاشتراك من قبل الإدارة.",
    user: {
      id: newUser.id,
      fullName: newUser.fullName,
      shopName: newUser.shopName,
      phone: newUser.phone,
      tradeType: newUser.tradeType,
      customTrade: newUser.customTrade,
      deviceType: newUser.deviceType,
      subscriptionStatus: newUser.subscriptionStatus,
      subscriptionDays: newUser.subscriptionDays,
      subscriptionExpiresAt: newUser.subscriptionExpiresAt
    }
  });
});

// 3. Merchant / Owner Login
app.post("/api/login", (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({
      success: false,
      message: "يرجى إدخال رقم الهاتف وكلمة المرور."
    });
  }

  const cleanPhone = String(phone).trim();
  const cleanPass = String(password).trim();

  // Master Owner Credentials Check
  if (cleanPhone === "01121097822" && cleanPass === "Khaled2008") {
    console.log(`[دخول المالك] تم تسجيل الدخول بواسطة صاحب المنصة (المهندس خالد)`);
    return res.json({
      success: true,
      message: "مرحباً بك يا مهندس خالد - مالك منصة ايدينيا",
      isAdmin: true,
      user: {
        id: "admin_owner_khaled",
        fullName: "المهندس خالد (مالك المنصة)",
        shopName: "إدارة منصة ايدينيا",
        phone: "01121097822",
        tradeType: "إدارة النظام والتراخيص",
        deviceType: "Windows / Android",
        role: "admin",
        isLoggedIn: true,
        subscriptionStatus: "active",
        subscriptionDays: 9999,
        subscriptionExpiresAt: Date.now() + 100 * 365 * 86400000
      }
    });
  }

  const user = systemStore.users.find(u => u.phone === cleanPhone && u.password === cleanPass);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "رقم الهاتف أو كلمة المرور غير صحيحة."
    });
  }

  const now = Date.now();
  user.lastActive = new Date().toISOString();

  // Auto update expired status
  if (user.subscriptionStatus === 'active' && user.subscriptionExpiresAt > 0 && now >= user.subscriptionExpiresAt) {
    user.subscriptionStatus = 'expired';
  }

  saveStore(systemStore);

  const remainingDays = user.subscriptionExpiresAt > now 
    ? Math.ceil((user.subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24))
    : 0;

  res.json({
    success: true,
    message: "تم تسجيل الدخول بنجاح",
    isAdmin: false,
    user: {
      id: user.id,
      fullName: user.fullName,
      shopName: user.shopName,
      phone: user.phone,
      tradeType: user.tradeType,
      customTrade: user.customTrade,
      deviceType: user.deviceType,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionDays: user.subscriptionDays,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      remainingDays,
      role: "merchant",
      isLoggedIn: true
    }
  });
});

// 4. Real-time Merchant Status Sync Check (Called by merchant app periodic poller)
app.post("/api/merchant/status", (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });
  }

  const cleanPhone = String(phone).trim();

  // Master admin bypass
  if (cleanPhone === "01121097822") {
    return res.json({
      success: true,
      exists: true,
      status: "active",
      subscriptionExpiresAt: Date.now() + 100 * 365 * 86400000,
      remainingDays: 9999,
      serverTime: Date.now()
    });
  }

  const user = systemStore.users.find(u => u.phone === cleanPhone);
  if (!user) {
    return res.json({
      success: false,
      exists: false,
      status: "deleted",
      message: "تم حذف حساب التاجر من النظام، تم قفل البرنامج."
    });
  }

  const now = Date.now();
  user.lastActive = new Date().toISOString();

  // Auto update expiration
  if (user.subscriptionStatus === 'active' && user.subscriptionExpiresAt > 0 && now >= user.subscriptionExpiresAt) {
    user.subscriptionStatus = 'expired';
    saveStore(systemStore);
  }

  const remainingDays = user.subscriptionExpiresAt > now
    ? Math.ceil((user.subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24))
    : 0;

  const remainingMs = Math.max(0, user.subscriptionExpiresAt - now);

  res.json({
    success: true,
    exists: true,
    status: user.subscriptionStatus,
    subscriptionDays: user.subscriptionDays,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    subscriptionActivatedAt: user.subscriptionActivatedAt,
    remainingDays,
    remainingMs,
    serverTime: now
  });
});

// ----------------- OWNER / ADMIN CONTROL PANEL APIS -----------------

// Admin Dashboard Data & Merchants List
app.get("/api/admin/data", (req, res) => {
  const now = Date.now();

  // Auto check and update expired users
  let modified = false;
  systemStore.users.forEach(u => {
    if (u.subscriptionStatus === 'active' && u.subscriptionExpiresAt > 0 && now >= u.subscriptionExpiresAt) {
      u.subscriptionStatus = 'expired';
      modified = true;
    }
  });
  if (modified) saveStore(systemStore);

  const totalClients = systemStore.users.length;
  const activeSubscriptions = systemStore.users.filter(u => u.subscriptionStatus === 'active' && u.subscriptionExpiresAt > now).length;
  const pendingActivation = systemStore.users.filter(u => u.subscriptionStatus === 'pending').length;
  const expiredOrFrozen = systemStore.users.filter(u => u.subscriptionStatus === 'expired' || u.subscriptionStatus === 'frozen').length;

  res.json({
    success: true,
    serverTime: now,
    stats: {
      totalClients,
      activeSubscriptions,
      pendingActivation,
      expiredOrFrozen
    },
    clients: systemStore.users.map(u => {
      const remainingDays = u.subscriptionExpiresAt > now 
        ? Math.ceil((u.subscriptionExpiresAt - now) / 86400000) 
        : 0;
      const remainingMs = Math.max(0, u.subscriptionExpiresAt - now);
      return {
        ...u,
        hasActiveLicense: u.subscriptionStatus === 'active' && u.subscriptionExpiresAt > now,
        licenseRemainingMs: remainingMs,
        remainingDays
      };
    })
  });
});

// Admin Activate Merchant Subscription with Exact Days Counter
app.post("/api/admin/merchants/activate", (req, res) => {
  const { phone, days, notes } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "رقم هاتف التاجر مطلوب" });
  }

  const cleanPhone = String(phone).trim();
  const user = systemStore.users.find(u => u.phone === cleanPhone);

  if (!user) {
    return res.status(404).json({ success: false, message: "التاجر غير موجود في النظام." });
  }

  const count = Math.max(1, parseInt(days, 10) || 30);
  const now = Date.now();
  const expiresAt = now + (count * 86400000);

  user.subscriptionStatus = "active";
  user.subscriptionDays = count;
  user.subscriptionActivatedAt = now;
  user.subscriptionExpiresAt = expiresAt;
  if (notes !== undefined) user.notes = notes;

  saveStore(systemStore);

  console.log(`[تفعيل مباشر] تم تفعيل اشتراك التاجر ${user.fullName} (${user.shopName}) لمدة ${count} يوماً حتى: ${new Date(expiresAt).toLocaleString()}`);

  res.json({
    success: true,
    message: `تم تفعيل اشتراك التاجر (${user.fullName}) بنجاح لمدة ${count} يوماً!`,
    user: {
      ...user,
      remainingDays: count,
      remainingMs: count * 86400000
    }
  });
});

// Admin Extend Merchant Subscription (+ X Days)
app.post("/api/admin/merchants/extend", (req, res) => {
  const { phone, extraDays, notes } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "رقم هاتف التاجر مطلوب" });
  }

  const cleanPhone = String(phone).trim();
  const user = systemStore.users.find(u => u.phone === cleanPhone);

  if (!user) {
    return res.status(404).json({ success: false, message: "التاجر غير موجود في النظام." });
  }

  const addedDays = Math.max(1, parseInt(extraDays, 10) || 30);
  const addedMs = addedDays * 86400000;
  const now = Date.now();

  if (user.subscriptionExpiresAt > now && user.subscriptionStatus === 'active') {
    user.subscriptionExpiresAt += addedMs;
  } else {
    user.subscriptionExpiresAt = now + addedMs;
  }

  user.subscriptionStatus = "active";
  user.subscriptionDays += addedDays;
  if (notes !== undefined) user.notes = notes;

  saveStore(systemStore);

  const remainingDays = Math.ceil((user.subscriptionExpiresAt - now) / 86400000);

  res.json({
    success: true,
    message: `تم تمديد اشتراك التاجر (${user.fullName}) بإضافة ${addedDays} يوماً. المتبقي الإجمالي: ${remainingDays} يوماً.`,
    user: {
      ...user,
      remainingDays
    }
  });
});

// Admin Freeze / Suspend Merchant
app.post("/api/admin/merchants/freeze", (req, res) => {
  const { phone } = req.body;
  const cleanPhone = String(phone).trim();
  const user = systemStore.users.find(u => u.phone === cleanPhone);

  if (!user) {
    return res.status(404).json({ success: false, message: "التاجر غير موجود." });
  }

  user.subscriptionStatus = "frozen";
  saveStore(systemStore);

  res.json({
    success: true,
    message: `تم تجميد وإيقاف حساب التاجر (${user.fullName}) بنجاح. سيتم قفل البرنامج لديه فوراً.`
  });
});

// Admin Unfreeze Merchant
app.post("/api/admin/merchants/unfreeze", (req, res) => {
  const { phone } = req.body;
  const cleanPhone = String(phone).trim();
  const user = systemStore.users.find(u => u.phone === cleanPhone);

  if (!user) {
    return res.status(404).json({ success: false, message: "التاجر غير موجود." });
  }

  const now = Date.now();
  if (user.subscriptionExpiresAt > now) {
    user.subscriptionStatus = "active";
  } else {
    user.subscriptionStatus = "expired";
  }
  saveStore(systemStore);

  res.json({
    success: true,
    message: `تم فك التجميد عن حساب التاجر (${user.fullName}). الحالة الحالية: ${user.subscriptionStatus === 'active' ? 'نشط' : 'منتهي'}.`
  });
});

// Delete Merchant Account Permanently
app.post("/api/admin/users/delete", (req, res) => {
  const { id, phone } = req.body;

  const initialCount = systemStore.users.length;
  systemStore.users = systemStore.users.filter(u => u.id !== id && u.phone !== phone);

  if (systemStore.users.length === initialCount) {
    return res.status(404).json({ success: false, message: "التاجر المطلوب حذفه غير موجود." });
  }

  saveStore(systemStore);

  console.log(`[حذف تاجر] تم حذف التاجر ${phone} نهائياً من قاعدة البيانات.`);

  res.json({
    success: true,
    message: "تم حذف حساب وبيانات التاجر نهائياً من النظام."
  });
});

// Admin Update Merchant Password
app.post("/api/admin/merchants/update-password", (req, res) => {
  const { phone, newPassword } = req.body;

  if (!phone || !newPassword) {
    return res.status(400).json({ success: false, message: "رقم الهاتف وكلمة المرور الجديدة مطلوبان." });
  }

  const cleanPhone = String(phone).trim();
  const user = systemStore.users.find(u => u.phone === cleanPhone);

  if (!user) {
    return res.status(404).json({ success: false, message: "التاجر غير موجود في النظام." });
  }

  user.password = String(newPassword).trim();
  user.updatedAt = Date.now();
  saveStore(systemStore);

  console.log(`[تحديث كلمة المرور] تم تحديث كلمة المرور للتاجر ${user.fullName} (${user.phone}) بنجاح.`);

  res.json({
    success: true,
    message: `تم تحديث كلمة المرور للتاجر (${user.fullName}) بنجاح.`
  });
});

// Native Source Code and Architectures Endpoint
app.get("/api/native/projects", (req, res) => {
  const androidPath = path.join(process.cwd(), "native-src", "android");
  const windowsPath = path.join(process.cwd(), "native-src", "windows");

  res.json({
    success: true,
    android: {
      framework: "Kotlin Native / Jetpack Compose",
      target: "Android 8.0 to Android 14+ (APK & AAB)",
      database: "Room SQLite Database (100% Offline)",
      security: "EncryptedSharedPreferences (AES-256-GCM) + Hardware Android ID Binding",
      buildInstructions: [
        "افتح مجلد native-src/android في برنامج Android Studio",
        "اضغط على Build > Build APKs أو نفذ الأمر: ./gradlew assembleRelease",
        "ستجد ملف APK الحقيقي في: app/build/outputs/apk/release/Idenia-Hisba.apk"
      ]
    },
    windows: {
      framework: "C# / .NET 8 WPF",
      target: "Windows 10 / 11 64-bit (Standalone .exe)",
      database: "Microsoft.Data.Sqlite (100% Offline)",
      security: "Windows DPAPI + Motherboard UUID & CPU ID Serial Locking",
      buildInstructions: [
        "تأكد من تثبيت .NET 8 SDK على جهازك",
        "نفذ الأمر: dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -o ./dist",
        "ستجد ملف Idenia-Hisba.exe المستقل بذاته جاهزاً للتشغيل الفوري والتوزيع"
      ]
    }
  });
});

// Download Native Source Codes as ZIP
app.get("/api/native/download/:platform?", async (req, res) => {
  try {
    const platform = req.params.platform;
    const archive = new ZipArchive({ zlib: { level: 9 } });

    const filename = platform === "windows"
      ? "idenia-windows-csharp-source.zip"
      : platform === "android"
      ? "idenia-android-kotlin-source.zip"
      : "idenia-complete-native-sources.zip";

    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    const zipPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", (err: any) => reject(err));
    });

    if (platform === "windows") {
      const dir = path.join(process.cwd(), "native-src", "windows");
      if (fs.existsSync(dir)) {
        archive.directory(dir, false);
      }
    } else if (platform === "android") {
      const dir = path.join(process.cwd(), "native-src", "android");
      if (fs.existsSync(dir)) {
        archive.directory(dir, false);
      }
    } else {
      const dir = path.join(process.cwd(), "native-src");
      if (fs.existsSync(dir)) {
        archive.directory(dir, false);
      }
    }

    archive.finalize();

    const zipBuffer = await zipPromise;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", zipBuffer.length.toString());
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.end(zipBuffer);
  } catch (err: any) {
    console.error("[Download Native Source Error]:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "فشل توليد ملف الحزمة المضغوطة" });
    }
  }
});

// Download Flutter Multiplatform Source Code (Android APK & Windows Desktop)
app.get("/api/flutter/download", async (req, res) => {
  try {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const filename = "idenia-hisba-flutter-android-windows.zip";

    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    const zipPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", (err: any) => reject(err));
    });

    const flutterDir = path.join(process.cwd(), "flutter_idenia_hisba");
    if (fs.existsSync(flutterDir)) {
      archive.directory(flutterDir, false);
    }

    archive.finalize();

    const zipBuffer = await zipPromise;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", zipBuffer.length.toString());
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.end(zipBuffer);
  } catch (err: any) {
    console.error("[Download Flutter Source Error]:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "فشل توليد ملف حزمة فلاتر" });
    }
  }
});

// ----------------- DIRECT INSTALLER DOWNLOAD & REBUILD ENDPOINTS -----------------

// Rebuild All Offline Packages (Windows Setup & Android APK)
app.post("/api/admin/rebuild-installers", (req, res) => {
  const scriptPath = path.join(process.cwd(), "scripts", "rebuild_all_installers.py");
  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ success: false, message: "سكربت البناء غير موجود." });
  }

  const { spawn } = require("child_process");
  const proc = spawn("python3", [scriptPath], { cwd: process.cwd() });

  let output = "";
  let errorOutput = "";

  proc.stdout.on("data", (data: any) => {
    output += data.toString();
  });

  proc.stderr.on("data", (data: any) => {
    errorOutput += data.toString();
  });

  proc.on("close", (code: number) => {
    if (code === 0) {
      res.json({
        success: true,
        message: "تم إعادة بناء حزم التثبيت للأندرويد والويندوز بأحدث كود بنجاح!",
        output
      });
    } else {
      console.error("[Rebuild Installers Error]:", errorOutput);
      res.status(500).json({
        success: false,
        message: "فشل أثناء تجميع الحزم: " + (errorOutput || output),
        code
      });
    }
  });
});

// Check Installer Packages Status
app.get("/api/admin/packages-status", (req, res) => {
  const downloadsDir = path.join(process.cwd(), "downloads");
  const files = [
    { name: "idenia-hisba.apk", label: "تطبيق أندرويد المستقل (100% Offline APK)" },
    { name: "IdeniaHisba_Setup.exe", label: "مثبت ويندوز المباشر (Setup.exe)" },
    { name: "idenia-hisba-windows-setup.zip", label: "حزمة ويندوز المضغوطة (ZIP Package)" },
    { name: "MicrosoftEdgeWebview2Setup.exe", label: "مثبت WebView2 لويندوز" }
  ];

  const status = files.map(f => {
    const p = path.join(downloadsDir, f.name);
    const exists = fs.existsSync(p);
    let size = 0;
    let modifiedAt: string | null = null;
    if (exists) {
      const st = fs.statSync(p);
      size = st.size;
      modifiedAt = st.mtime.toISOString();
    }
    return {
      ...f,
      exists,
      size,
      sizeFormatted: exists ? (size / (1024 * 1024)).toFixed(2) + " MB" : "غير متوفر",
      modifiedAt
    };
  });

  res.json({ success: true, packages: status });
});

function getDownloadFilePath(fileName: string): string | null {
  const possiblePaths = [
    path.join(process.cwd(), "downloads", fileName),
    path.join(process.cwd(), "public", fileName),
    path.join(process.cwd(), "dist", fileName)
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}


// Direct Download for Complete Flutter Source Code (Single Codebase for Android & Windows)
app.get(["/api/download/flutter-source", "/downloads/idenia_hisba_flutter_source.zip", "/flutter-source.zip"], (req, res) => {
  const p = path.join(process.cwd(), "downloads", "idenia_hisba_flutter_source.zip");
  if (!fs.existsSync(p)) {
    return res.status(404).json({ success: false, message: "الملف غير متوفر حالياً." });
  }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="idenia_hisba_flutter_source.zip"');
  res.setHeader("Cache-Control", "no-cache");
  fs.createReadStream(p).pipe(res);
});

// 1. Android Native APK Direct Download
app.get(["/api/download/android-apk", "/downloads/idenia-hisba.apk", "/idenia-hisba.apk"], (req, res) => {
  const apkPath = getDownloadFilePath("idenia-hisba.apk");
  if (!apkPath) {
    return res.status(404).json({ success: false, message: "ملف APK قيد التجهيز، يرجى المحاولة بعد لحظات." });
  }

  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", 'attachment; filename="idenia-hisba.apk"');
  res.setHeader("Cache-Control", "no-cache");
  fs.createReadStream(apkPath).pipe(res);
});

// 2. Windows Native Setup ZIP Direct Download
app.get(["/api/download/windows-setup", "/downloads/idenia-hisba-windows-setup.zip", "/idenia-hisba-windows-setup.zip"], (req, res) => {
  const zipPath = getDownloadFilePath("idenia-hisba-windows-setup.zip");
  if (!zipPath) {
    return res.status(404).json({ success: false, message: "ملف التثبيت لويندوز قيد التجهيز، يرجى المحاولة بعد لحظات." });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="idenia-hisba-windows-setup.zip"');
  res.setHeader("Cache-Control", "no-cache");
  fs.createReadStream(zipPath).pipe(res);
});

// 3. Windows Native Setup EXE Direct Download
app.get(["/api/download/windows-exe", "/downloads/IdeniaHisba_Setup.exe", "/IdeniaHisba_Setup.exe"], (req, res) => {
  const exePath = getDownloadFilePath("IdeniaHisba_Setup.exe");
  if (!exePath) {
    return res.status(404).json({ success: false, message: "ملف Setup.exe قيد التجهيز." });
  }

  res.setHeader("Content-Type", "application/vnd.microsoft.portable-executable");
  res.setHeader("Content-Disposition", 'attachment; filename="IdeniaHisba_Setup.exe"');
  res.setHeader("Cache-Control", "no-cache");
  fs.createReadStream(exePath).pipe(res);
});

// 4. Official Microsoft Edge WebView2 Evergreen Setup Direct Download (Optional Manual Fallback)
app.get(["/api/download/webview2-setup", "/MicrosoftEdgeWebview2Setup.exe"], (req, res) => {
  const wv2Path = getDownloadFilePath("MicrosoftEdgeWebview2Setup.exe");
  if (!wv2Path) {
    return res.status(404).json({ success: false, message: "ملف WebView2 Setup قيد التجهيز." });
  }

  res.setHeader("Content-Type", "application/vnd.microsoft.portable-executable");
  res.setHeader("Content-Disposition", 'attachment; filename="MicrosoftEdgeWebview2Setup.exe"');
  res.setHeader("Cache-Control", "no-cache");
  fs.createReadStream(wv2Path).pipe(res);
});

// ----------------- VITE / STATIC SERVING -----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ايدينيا - حِسبة] الخادم يعمل بنجاح على المنفذ: http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
