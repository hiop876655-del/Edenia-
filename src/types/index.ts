// Complete Data Models for "ايدينيا - حِسبة"

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  unit: ProductUnit;
  barcode: string;
  min_stock_alert?: number;
  created_at: string;
  updated_at: string;
}

export type ProductUnit = 
  | 'قطعة'
  | 'كيلو'
  | 'جرام'
  | 'لتر'
  | 'متر'
  | 'علبة'
  | 'كرتونة'
  | 'شكارة'
  | 'برطمان'
  | 'زجاجة'
  | 'كيس'
  | 'طرد'
  | 'دزينة'
  | 'وحدة';

export interface UserAccount {
  id: string;
  fullName: string;
  shopName: string;
  phone: string;
  password?: string;
  tradeType: string;
  customTrade?: string;
  deviceType: string;
  registeredAt: string;
  isLoggedIn: boolean;
  role?: 'merchant' | 'admin';
  subscriptionStatus?: 'pending' | 'active' | 'expired' | 'frozen';
  subscriptionDays?: number;
  subscriptionExpiresAt?: number;
  subscriptionActivatedAt?: number;
  cloudDbConfig?: MerchantCloudConfig;
}

export interface Sale {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  payment_type: 'cash' | 'credit' | 'debt'; // نقدي أو آجل
  profit: number;
  items_count: number;
  items: SaleItem[];
  notes?: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  unit: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  total_price: number;
  profit: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  total_debt: number;
  paid_amount: number;
  remaining_debt: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  customer_id: string;
  customer_name: string;
  sale_id?: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  notes?: string;
  status: 'unpaid' | 'partial' | 'paid';
  created_at: string;
}

export interface DebtPayment {
  id: string;
  customer_id: string;
  customer_name: string;
  debt_id?: string;
  amount: number;
  payment_date: string;
  notes?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  type: 'sale' | 'purchase' | 'manual_add' | 'manual_subtract' | 'adjustment';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  created_at: string;
}

export interface AppSettings {
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string;
  invoice_header: string;
  invoice_footer: string;
  currency_name?: string;
  currency_symbol: string;
  allow_negative_stock: boolean;
  low_stock_threshold: number;
  sound_enabled: boolean;
  dark_mode: boolean;
  print_thermal_width: '80mm' | '57mm';
}

export interface LicenseState {
  code?: string;
  phone?: string;
  durationDays: number;
  createdAt: number;
  expiresAt: number;
  activatedAt: number;
  remainingMs: number;
  isValid: boolean;
  isExpired: boolean;
  lastKnownTimestamp: number;
  status?: 'pending' | 'active' | 'expired' | 'frozen';
}

export interface RegisteredMerchant {
  id: string;
  fullName: string;
  shopName: string;
  phone: string;
  tradeType: string;
  customTrade?: string;
  deviceType: string;
  registeredAt: string;
  lastActive?: string;
  subscriptionStatus: 'pending' | 'active' | 'expired' | 'frozen';
  subscriptionDays: number;
  subscriptionExpiresAt: number;
  subscriptionActivatedAt?: number;
  notes?: string;
}

export interface DashboardStats {
  todaySales: number;
  todayProfit: number;
  todayInvoicesCount: number;
  totalDebts: number;
  inventoryValue: number;
  productsCount: number;
  customersCount: number;
  lowStockCount: number;
}

export type ScreenType =
  | 'home'
  | 'splash'
  | 'register'
  | 'login'
  | 'activation'
  | 'dashboard'
  | 'inventory'
  | 'products'
  | 'sales'
  | 'invoice_details'
  | 'customers'
  | 'debts'
  | 'reports'
  | 'settings'
  | 'backup'
  | 'account'
  | 'updates'
  | 'expired'
  | 'admin'
  | 'admin_dashboard'
  | 'cloud_database_setup';

export interface MerchantCloudConfig {
  provider: 'supabase' | 'custom' | 'firebase';
  projectUrl: string;
  apiKey: string;
  isConnected: boolean;
  connectedAt?: number;
  lastSyncedAt?: number;
  merchantPhone?: string;
  merchantShopName?: string;
}

export interface DatabaseTutorialSettings {
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  providerRegisterUrl: string;
  updatedAt?: number;
}
