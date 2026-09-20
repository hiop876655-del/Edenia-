import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Store,
  Check,
  Trash2,
  RefreshCw,
  Search,
  Laptop,
  Smartphone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  Unlock,
  ArrowRight,
  Clock,
  UserCheck,
  Eye,
  EyeOff,
  Key,
  Copy,
  Edit2,
  Wand2,
  ExternalLink,
  Send,
  Phone,
  Layers,
  ArrowLeft,
  Timer,
  Package,
  Download,
  Code2,
  Sparkles,
  MessageSquare,
  Filter,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { api, AdminMerchantRecord } from '../services/api';
import { ScreenType } from '../types';
import { StandalonePackagesModal } from '../components/StandalonePackagesModal';
import { NativeAppsExportModal } from '../components/NativeAppsExportModal';
import { PublishUpdateModal } from '../components/PublishUpdateModal';

interface AdminDashboardScreenProps {
  onNavigate?: (screen: ScreenType) => void;
  onLogout?: () => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  onNavigate = () => {},
  onLogout = () => {}
}) => {
  const [merchants, setMerchants] = useState<AdminMerchantRecord[]>([]);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeSubscriptions: 0,
    pendingActivation: 0,
    expiredOrFrozen: 0
  });
  const [serverTime, setServerTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'expired' | 'frozen'>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Selected merchant for deep profile modal & password management
  const [selectedMerchant, setSelectedMerchant] = useState<AdminMerchantRecord | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Modals
  const [isPackagesModalOpen, setIsPackagesModalOpen] = useState(false);
  const [isNativeModalOpen, setIsNativeModalOpen] = useState(false);
  const [isPublishUpdateModalOpen, setIsPublishUpdateModalOpen] = useState(false);

  // Activation & Extension Modal state
  const [activeModalTarget, setActiveModalTarget] = useState<{
    type: 'activate' | 'extend';
    merchant: AdminMerchantRecord;
  } | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [customDaysInput, setCustomDaysInput] = useState<string>('30');
  const [activationNotes, setActivationNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In-App Reliable Delete Confirmation Target
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    phone: string;
    name: string;
    shop: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      setServerTime(prev => prev + 1000);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminDashboard();
      setMerchants(data.clients || []);
      setStats(data.stats || { totalClients: 0, activeSubscriptions: 0, pendingActivation: 0, expiredOrFrozen: 0 });
      setServerTime(data.serverTime || Date.now());
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotice = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleActivateSubmit = async () => {
    if (!activeModalTarget) return;
    const days = Number(customDaysInput) > 0 ? Number(customDaysInput) : selectedDays;
    if (days <= 0) {
      alert('يرجى تحديد عدد أيام صالح للتفعيل.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeModalTarget.type === 'activate') {
        await api.activateMerchant({
          phone: activeModalTarget.merchant.phone,
          days,
          notes: activationNotes.trim() || undefined
        });
        showNotice(`تم تفعيل اشتراك التاجر "${activeModalTarget.merchant.fullName}" بنجاح لمدة ${days} يوماً.`);
      } else {
        await api.extendMerchant({
          phone: activeModalTarget.merchant.phone,
          extraDays: days,
          notes: activationNotes.trim() || undefined
        });
        showNotice(`تم تمديد اشتراك التاجر "${activeModalTarget.merchant.fullName}" بإضافة ${days} يوماً.`);
      }
      setActiveModalTarget(null);
      setActivationNotes('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تنفيذ العملية.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFreezeToggle = async (merchant: AdminMerchantRecord) => {
    try {
      if (merchant.subscriptionStatus === 'frozen') {
        await api.unfreezeMerchant(merchant.phone);
        showNotice(`تم فك التجميد عن حساب التاجر "${merchant.fullName}".`);
      } else {
        await api.freezeMerchant(merchant.phone);
        showNotice(`تم تجميد حساب التاجر "${merchant.fullName}" وقفل البرنامج لديه.`);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || 'تعذر تغيير حالة الحساب');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteMerchant(deleteTarget.id, deleteTarget.phone);
      showNotice(`تم حذف حساب التاجر "${deleteTarget.name}" نهائياً من النظام.`);
      setDeleteTarget(null);
      if (selectedMerchant?.phone === deleteTarget.phone) {
        setSelectedMerchant(null);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || 'تعذر حذف التاجر');
    }
  };

  const handleOpenMerchantProfile = (merchant: AdminMerchantRecord) => {
    setSelectedMerchant(merchant);
    setShowPassword(false);
    setIsEditingPassword(false);
    setNewPasswordInput(merchant.password || '');
    setCopiedPassword(false);
  };

  const handleCopyPassword = (pass: string) => {
    if (!pass) return;
    navigator.clipboard.writeText(pass);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const generateRandomPassword = () => {
    // Generate an easy-to-use clean 6-digit numeric PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setNewPasswordInput(pin);
  };

  const handleSavePassword = async () => {
    if (!selectedMerchant || !newPasswordInput.trim()) {
      alert('يرجى إدخال كلمة المرور الجديدة.');
      return;
    }
    setSavingPassword(true);
    try {
      const trimmed = newPasswordInput.trim();
      await api.updateMerchantPassword(selectedMerchant.phone, trimmed);
      
      const updatedMerchant = {
        ...selectedMerchant,
        password: trimmed
      };
      setSelectedMerchant(updatedMerchant);
      setMerchants(prev => prev.map(m => m.phone === selectedMerchant.phone ? { ...m, password: trimmed } : m));
      setIsEditingPassword(false);
      showNotice(`تم تحديث كلمة المرور للتاجر "${selectedMerchant.fullName}" بنجاح!`);
    } catch (err: any) {
      alert(err.message || 'تعذر تحديث كلمة المرور سحابياً.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSendPasswordViaWhatsApp = (merchant: AdminMerchantRecord) => {
    const cleanPhone = merchant.phone.replace(/[^0-9]/g, '');
    const pass = merchant.password || 'غير محددة';
    const text = `السلام عليكم أ/ ${merchant.fullName}،\nكلمة المرور الخاصة بحسابكم في برنامج (إيدينيا - حِسبة) هي:\n🔑 كلمة المرور: ${pass}\nرقم الهاتف: ${merchant.phone}\nاسم المحل: ${merchant.shopName}`;
    const url = `https://wa.me/20${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Filter merchants
  const filteredMerchants = merchants.filter(m => {
    const matchesSearch =
      (m.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.shopName || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.phone || '').includes(search);

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return m.subscriptionStatus === 'pending';
    if (statusFilter === 'active') return m.subscriptionStatus === 'active' && (m.subscriptionExpiresAt || 0) > serverTime;
    if (statusFilter === 'expired') return m.subscriptionStatus === 'expired' || (m.subscriptionStatus === 'active' && (m.subscriptionExpiresAt || 0) <= serverTime);
    if (statusFilter === 'frozen') return m.subscriptionStatus === 'frozen';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#121212] text-gray-900 dark:text-gray-100 p-4 md:p-8 select-none" dir="rtl">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-md border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black">لوحة الإدارة والتحكم السحابية</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  المالك (م/ خالد)
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                تفعيل مباشر لاشتراكات التجار بالعداد الزمني والتحكم عن بُعد
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsPublishUpdateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
              <span>نشر التحديثات السحابية (OTA)</span>
            </button>

            <button
              onClick={() => setIsPackagesModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>حزم التثبيت (EXE/APK)</span>
            </button>

            <button
              onClick={() => setIsNativeModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              <span>تصدير السورس كود</span>
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => onNavigate('home')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>البرنامج الرئيسي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Action Message Banner */}
        {actionMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-2 font-medium">
              <span>إجمالي التجار المسجلين</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalClients}</div>
            <div className="text-[11px] text-gray-400 mt-1">مسجلين في قاعدة البيانات</div>
          </div>

          <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-2 font-medium">
              <span>بانتظار التفعيل</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pendingActivation}</div>
            <div className="text-[11px] text-amber-600/70 mt-1">حسابات جديدة تتطلب التفعيل</div>
          </div>

          <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-2 font-medium">
              <span>الاشتراكات المفعلة النشطة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.activeSubscriptions}</div>
            <div className="text-[11px] text-emerald-600/70 mt-1">تعمل حالياً بعداد الأيام</div>
          </div>

          <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-2 font-medium">
              <span>المنتهية والمجمدة</span>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-black text-red-600 dark:text-red-400">{stats.expiredOrFrozen}</div>
            <div className="text-[11px] text-red-600/70 mt-1">برامج مقفلة عن العمل</div>
          </div>
        </div>

        {/* Main Content Area - Merchants List */}
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-md border border-gray-200 dark:border-gray-800 space-y-6">
          {/* Controls & Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="بحث باسم التاجر، اسم المحل، أو رقم الهاتف..."
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                الكل ({merchants.length})
              </button>

              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                بانتظار التفعيل ({stats.pendingActivation})
              </button>

              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                المفعلة ({stats.activeSubscriptions})
              </button>

              <button
                onClick={() => setStatusFilter('frozen')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'frozen'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                المجمدة
              </button>
            </div>
          </div>

          {/* Merchants Table */}
          {filteredMerchants.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-sm text-gray-500">لا يوجد تجار مطابقين لمعايير البحث الحالية.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-bold">
                    <th className="pb-3 pr-2">التاجر والمحل</th>
                    <th className="pb-3 px-3">رقم الهاتف</th>
                    <th className="pb-3 px-3">حالة الاشتراك</th>
                    <th className="pb-3 px-3">المدة والعداد المتبقي</th>
                    <th className="pb-3 px-3">تاريخ التسجيل</th>
                    <th className="pb-3 pl-2 text-left">إجراءات التحكم السريعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {filteredMerchants.map(merchant => {
                    const isPending = merchant.subscriptionStatus === 'pending';
                    const isFrozen = merchant.subscriptionStatus === 'frozen';
                    const isActive = merchant.subscriptionStatus === 'active' && (merchant.subscriptionExpiresAt || 0) > serverTime;
                    const isExpired = !isPending && !isFrozen && !isActive;

                    const remainingDays = merchant.subscriptionExpiresAt && merchant.subscriptionExpiresAt > serverTime
                      ? Math.ceil((merchant.subscriptionExpiresAt - serverTime) / (1000 * 3600 * 24))
                      : 0;

                    const whatsappChatUrl = `https://wa.me/2${merchant.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`السلام عليكم أ/ ${merchant.fullName}، بخصوص حسابكم في برنامج إيدينيا (${merchant.shopName}):`)}`;

                    return (
                      <tr key={merchant.id || merchant.phone} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 pr-2">
                          <div className="font-bold text-gray-900 dark:text-white text-sm">{merchant.fullName}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Store className="w-3 h-3 text-emerald-600" />
                            <span>{merchant.shopName}</span>
                            <span className="text-gray-300 dark:text-gray-700">•</span>
                            <span>{merchant.tradeType}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-mono font-bold text-gray-800 dark:text-gray-200" dir="ltr">
                            {merchant.phone}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black text-[11px]">
                              <Clock className="w-3 h-3" />
                              <span>بانتظار التفعيل</span>
                            </span>
                          )}
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black text-[11px]">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>مفعل ونشط</span>
                            </span>
                          )}
                          {isFrozen && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 font-black text-[11px]">
                              <Lock className="w-3 h-3" />
                              <span>مجمد وموقوف</span>
                            </span>
                          )}
                          {isExpired && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-black text-[11px]">
                              <AlertCircle className="w-3 h-3" />
                              <span>منتهي الصلاحية</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {isActive ? (
                            <div>
                              <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                متبقي: {remainingDays} يوم
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                ينتهي في: {new Date(merchant.subscriptionExpiresAt).toLocaleDateString('ar-EG')}
                              </div>
                            </div>
                          ) : isPending ? (
                            <span className="text-gray-400">لم يتم تحديد مدة بعد</span>
                          ) : (
                            <span className="text-red-500 font-medium">البرنامج مقفل</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-gray-400 text-[11px]">
                          {merchant.registeredAt ? new Date(merchant.registeredAt).toLocaleDateString('ar-EG') : 'غير متوفر'}
                        </td>

                        <td className="py-3.5 pl-2 text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Activate / Extend Button */}
                            {isPending || isExpired ? (
                              <button
                                onClick={() => {
                                  setActiveModalTarget({ type: 'activate', merchant });
                                  setSelectedDays(30);
                                  setCustomDaysInput('30');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>تفعيل الحساب</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveModalTarget({ type: 'extend', merchant });
                                  setSelectedDays(30);
                                  setCustomDaysInput('30');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="تمديد الاشتراك"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>تمديد (+أيام)</span>
                              </button>
                            )}

                            {/* WhatsApp Button */}
                            <a
                              href={whatsappChatUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 transition-colors"
                              title="مراسلة عبر واتساب"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>

                            {/* Freeze / Unfreeze Toggle */}
                            <button
                              onClick={() => handleFreezeToggle(merchant)}
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                isFrozen
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-700 hover:bg-gray-100'
                              }`}
                              title={isFrozen ? 'فك التجميد عن الحساب' : 'تجميد وقفل الحساب'}
                            >
                              {isFrozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>

                            {/* View / Change Password */}
                            <button
                              onClick={() => handleOpenMerchantProfile(merchant)}
                              className="p-1.5 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                              title="كشف / تغيير كلمة مرور التاجر"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* View Profile */}
                            <button
                              onClick={() => handleOpenMerchantProfile(merchant)}
                              className="p-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                              title="عرض تفاصيل التاجر والجهاز"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Merchant */}
                            <button
                              onClick={() => setDeleteTarget({
                                id: merchant.id,
                                phone: merchant.phone,
                                name: merchant.fullName,
                                shop: merchant.shopName
                              })}
                              className="p-1.5 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                              title="حذف حساب التاجر نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Activation / Extension Days Modal */}
      {activeModalTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    {activeModalTarget.type === 'activate' ? 'تفعيل اشتراك التاجر' : 'تمديد مدة الاشتراك'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {activeModalTarget.merchant.fullName} ({activeModalTarget.merchant.shopName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalTarget(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Days Selector Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                اختر مدة الاشتراك بالعداد الزمني:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'شهر (30 يوم)', days: 30 },
                  { label: '3 أشهر (90 يوم)', days: 90 },
                  { label: '6 أشهر (180 يوم)', days: 180 },
                  { label: 'سنة (365 يوم)', days: 365 },
                  { label: 'سنتين (730 يوم)', days: 730 },
                  { label: 'تجربة (7 أيام)', days: 7 }
                ].map(preset => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => {
                      setSelectedDays(preset.days);
                      setCustomDaysInput(String(preset.days));
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      Number(customDaysInput) === preset.days
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Days Input Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                أو اكتب عدد الأيام المخصصة بدقة:
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customDaysInput}
                  onChange={e => setCustomDaysInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-sm font-black text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="مثال: 30"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">
                  يوماً
                </span>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                ملاحظات إدارية (اختياري):
              </label>
              <input
                type="text"
                value={activationNotes}
                onChange={e => setActivationNotes(e.target.value)}
                placeholder="مثال: تم سداد الاشتراك عن طريق فودافون كاش"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleActivateSubmit}
                disabled={isSubmitting || Number(customDaysInput) <= 0}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'جاري الحفظ...'
                    : activeModalTarget.type === 'activate'
                    ? `تأكيد تفعيل ${customDaysInput} يوماً`
                    : `تأكيد إضافة ${customDaysInput} يوماً`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTarget(null)}
                className="py-3 px-4 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merchant Profile View Modal */}
      {selectedMerchant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-gray-200 dark:border-gray-800 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    {selectedMerchant.fullName}
                  </h3>
                  <p className="text-xs text-gray-500">{selectedMerchant.shopName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMerchant(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200/60 dark:border-zinc-800">
                <span className="text-gray-400 block text-[11px]">رقم الهاتف:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white text-sm" dir="ltr">
                  {selectedMerchant.phone}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200/60 dark:border-zinc-800">
                <span className="text-gray-400 block text-[11px]">حالة الاشتراك:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {selectedMerchant.subscriptionStatus === 'active' ? 'مفعل ونشط' : selectedMerchant.subscriptionStatus}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200/60 dark:border-zinc-800">
                <span className="text-gray-400 block text-[11px]">نوع النشاط:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {selectedMerchant.tradeType || 'عام'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200/60 dark:border-zinc-800">
                <span className="text-gray-400 block text-[11px]">تاريخ التسجيل:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {selectedMerchant.registeredAt ? new Date(selectedMerchant.registeredAt).toLocaleString('ar-EG') : 'غير متوفر'}
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200/60 dark:border-zinc-800">
                <span className="text-gray-400 block text-[11px]">معلومات الجهاز والنظام:</span>
                <span className="font-mono text-gray-700 dark:text-gray-300 text-[11px]">
                  {selectedMerchant.deviceType} • {selectedMerchant.osDetails || 'نظام تشغيل قياسي'}
                </span>
              </div>
            </div>

            {/* Account Password Card (Viewing, Changing, Copying, Sending to Merchant) */}
            <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/40 dark:from-amber-950/40 dark:to-amber-900/20 rounded-2xl p-4 border border-amber-300/80 dark:border-amber-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 dark:text-white">كلمة مرور حساب التاجر</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">يمكنك كشفها للتاجر في حال نسيانها أو تغييرها مباشرة من هنا</p>
                  </div>
                </div>

                {!isEditingPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPassword(true);
                      setNewPasswordInput(selectedMerchant.password || '');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-zinc-700 border border-amber-300 dark:border-amber-700 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>تغيير كلمة المرور</span>
                  </button>
                )}
              </div>

              {!isEditingPassword ? (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-amber-200/80 dark:border-zinc-800 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 font-medium">كلمة المرور الحالية:</span>
                      <span className="font-mono font-black text-sm tracking-wider text-gray-900 dark:text-white" dir="ltr">
                        {selectedMerchant.password 
                          ? (showPassword ? selectedMerchant.password : '••••••••')
                          : <span className="text-gray-400 text-xs font-normal">لم تسجل بعد</span>
                        }
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {selectedMerchant.password && (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                            title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyPassword(selectedMerchant.password || '')}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                            title="نسخ كلمة المرور"
                          >
                            {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedPassword ? 'تم النسخ' : 'نسخ'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Direct WhatsApp Share to Merchant */}
                  {selectedMerchant.password && (
                    <button
                      type="button"
                      onClick={() => handleSendPasswordViaWhatsApp(selectedMerchant)}
                      className="w-full py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-white" />
                      <span>إرسال كلمة المرور للتاجر عبر الواتساب بنقرة واحدة</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </button>
                  )}
                </div>
              ) : (
                /* Edit Password Mode */
                <div className="space-y-3 pt-1 bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-amber-400 dark:border-amber-700 shadow-sm">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block">
                      اكتب كلمة المرور الجديدة للتاجر:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newPasswordInput}
                        onChange={e => setNewPasswordInput(e.target.value)}
                        placeholder="مثال: 123456 أو كلمة سر جديدة"
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="px-2.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                        title="توليد رقم سري سريع (6 أرقام)"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>توليد تلقائي</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSavePassword}
                      disabled={savingPassword || !newPasswordInput.trim()}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{savingPassword ? 'جاري الحفظ سحابياً...' : 'حفظ كلمة المرور وتعيينها للتاجر'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingPassword(false)}
                      className="py-2 px-3 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 font-bold text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedMerchant(null)}
                className="w-full py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-red-200 dark:border-red-900/60 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                تأكيد حذف حساب التاجر نهائياً؟
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                سيتم حذف حساب التاجر "{deleteTarget.name}" ({deleteTarget.shop}) نهائياً وقفل وصوله للبرنامج فور اتصاله بالإنترنت.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                نعم، احذف نهائياً
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export & Standalone modals */}
      <StandalonePackagesModal
        isOpen={isPackagesModalOpen}
        onClose={() => setIsPackagesModalOpen(false)}
      />
      <NativeAppsExportModal
        isOpen={isNativeModalOpen}
        onClose={() => setIsNativeModalOpen(false)}
      />
      <PublishUpdateModal
        isOpen={isPublishUpdateModalOpen}
        onClose={() => setIsPublishUpdateModalOpen(false)}
        onPublished={msg => setActionMessage(msg)}
      />
    </div>
  );
};
