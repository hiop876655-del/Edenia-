import { saveEncryptedItem, loadEncryptedItem } from "./cryptoStorage";
import {
  Product,
  Sale,
  SaleItem,
  Customer,
  Debt,
  DebtPayment,
  StockMovement,
  AppSettings,
  LicenseState,
  UserAccount,
  DashboardStats
} from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'idenia_hisba_products_v1',
  SALES: 'idenia_hisba_sales_v1',
  CUSTOMERS: 'idenia_hisba_customers_v1',
  DEBTS: 'idenia_hisba_debts_v1',
  DEBT_PAYMENTS: 'idenia_hisba_debt_payments_v1',
  STOCK_MOVEMENTS: 'idenia_hisba_stock_movements_v1',
  SETTINGS: 'idenia_hisba_settings_v1',
  USER: 'idenia_hisba_user_v1',
  LICENSE: 'idenia_hisba_license_v1',
  LAST_TIME_ANCHOR: 'idenia_hisba_time_anchor_v1'
};

const DEFAULT_SETTINGS: AppSettings = {
  shop_name: 'مؤسسة التجارة الحديثة',
  owner_name: 'المدير المسؤول',
  phone: '01000000000',
  address: 'الفرع الرئيسي',
  invoice_header: 'مرحباً بكم - نسعد بخدمتكم دائماً',
  invoice_footer: 'البضاعة المباعة ترد وتستبدل خلال 14 يوماً بموجب الفاتورة',
  currency_name: 'جنيه مصري',
  currency_symbol: 'ج.م',
  allow_negative_stock: false,
  low_stock_threshold: 5,
  sound_enabled: true,
  dark_mode: false,
  print_thermal_width: '80mm'
};

class LocalDatabase {
  private get<T>(key: string, defaultValue: T): T {
    return loadEncryptedItem<T>(key, defaultValue);
  }

  private set<T>(key: string, value: T): void {
    saveEncryptedItem(key, value);
  }

  // --- Initial Data Clean (Zero dummy data, only user inputs) ---
  public initDatabase() {
    // Purge old mock/demo products if they were loaded previously
    const existingProducts = this.get<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    const filteredProducts = existingProducts.filter(p => !p.id.startsWith('prod_'));
    if (filteredProducts.length !== existingProducts.length) {
      this.set(STORAGE_KEYS.PRODUCTS, filteredProducts);
    }

    // Purge old mock/demo customers if they were loaded previously
    const existingCustomers = this.get<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const filteredCustomers = existingCustomers.filter(c => !c.id.startsWith('cust_'));
    if (filteredCustomers.length !== existingCustomers.length) {
      this.set(STORAGE_KEYS.CUSTOMERS, filteredCustomers);
    }

    // Purge old mock/demo debts if they were loaded previously
    const existingDebts = this.get<Debt[]>(STORAGE_KEYS.DEBTS, []);
    const filteredDebts = existingDebts.filter(d => !d.id.startsWith('debt_'));
    if (filteredDebts.length !== existingDebts.length) {
      this.set(STORAGE_KEYS.DEBTS, filteredDebts);
    }
  }

  // --- PRODUCTS ---
  public getProducts(): Product[] {
    return this.get<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  }

  public getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id);
  }

  public getProductByBarcode(barcode: string): Product | undefined {
    if (!barcode) return undefined;
    return this.getProducts().find(p => p.barcode === barcode.trim());
  }

  public saveProduct(prod: Partial<Product>): Product {
    const products = this.getProducts();
    const now = new Date().toISOString();

    if (prod.id) {
      const idx = products.findIndex(p => p.id === prod.id);
      if (idx !== -1) {
        const old = products[idx];
        const updated: Product = {
          ...old,
          ...prod,
          updated_at: now
        } as Product;
        products[idx] = updated;
        this.set(STORAGE_KEYS.PRODUCTS, products);

        if (prod.quantity !== undefined && prod.quantity !== old.quantity) {
          const diff = prod.quantity - old.quantity;
          this.recordStockMovement({
            product_id: updated.id,
            product_name: updated.name,
            type: diff > 0 ? 'manual_add' : 'manual_subtract',
            quantity: Math.abs(diff),
            previous_quantity: old.quantity,
            new_quantity: updated.quantity,
            reason: 'تعديل يدوي لكمية المخزون'
          });
        }
        return updated;
      }
    }

    const newProd: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: prod.name || 'منتج غير مسمى',
      description: prod.description || '',
      category: prod.category || 'عام',
      purchase_price: Number(prod.purchase_price) || 0,
      selling_price: Number(prod.selling_price) || 0,
      quantity: Number(prod.quantity) || 0,
      unit: prod.unit || 'قطعة',
      barcode: prod.barcode || '',
      min_stock_alert: prod.min_stock_alert ?? 5,
      created_at: now,
      updated_at: now
    };

    products.unshift(newProd);
    this.set(STORAGE_KEYS.PRODUCTS, products);

    this.recordStockMovement({
      product_id: newProd.id,
      product_name: newProd.name,
      type: 'purchase',
      quantity: newProd.quantity,
      previous_quantity: 0,
      new_quantity: newProd.quantity,
      reason: 'إضافة صنف جديد للمخزن'
    });

    return newProd;
  }

  public deleteProduct(id: string): boolean {
    const products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length !== products.length) {
      this.set(STORAGE_KEYS.PRODUCTS, filtered);
      return true;
    }
    return false;
  }

  public adjustStock(id: string, deltaQty: number, reason: string): boolean {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return false;

    const prod = products[idx];
    const prev = prod.quantity;
    const next = prev + deltaQty;
    prod.quantity = next;
    prod.updated_at = new Date().toISOString();

    this.set(STORAGE_KEYS.PRODUCTS, products);

    this.recordStockMovement({
      product_id: prod.id,
      product_name: prod.name,
      type: 'adjustment',
      quantity: Math.abs(deltaQty),
      previous_quantity: prev,
      new_quantity: next,
      reason
    });

    return true;
  }

  public adjustStockQuantity(id: string, deltaQty: number, reason: string): boolean {
    return this.adjustStock(id, deltaQty, reason);
  }

  // --- SALES & POS ---
  public getSales(): Sale[] {
    return this.get<Sale[]>(STORAGE_KEYS.SALES, []);
  }

  public getSaleById(id: string): Sale | undefined {
    return this.getSales().find(s => s.id === id);
  }

  public processSale(saleData: {
    items: {
      product_id: string;
      product_name: string;
      unit: string;
      quantity: number;
      purchase_price: number;
      selling_price: number;
      total_price: number;
      profit: number;
    }[];
    customer_id?: string;
    customer_name?: string;
    payment_type: 'cash' | 'credit' | 'debt';
    discount?: number;
    paid_amount?: number;
    notes?: string;
  }): { success: boolean; sale?: Sale; error?: string } {
    if (!saleData.items || saleData.items.length === 0) {
      return { success: false, error: 'سلة المبيعات فارغة.' };
    }

    const products = this.getProducts();
    const settings = this.getSettings();

    for (const item of saleData.items) {
      const prod = products.find(p => p.id === item.product_id);
      if (!prod) {
        return { success: false, error: `المنتج ${item.product_name} غير موجود في المخزن.` };
      }
      if (!settings.allow_negative_stock && prod.quantity < item.quantity) {
        return {
          success: false,
          error: `الكمية المتوفرة من (${prod.name}) بالمخزن هي ${prod.quantity} فقط.`
        };
      }
    }

    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    const processedItems: SaleItem[] = saleData.items.map((it, idx) => ({
      id: `item_${saleId}_${idx + 1}`,
      sale_id: saleId,
      product_id: it.product_id,
      product_name: it.product_name,
      unit: it.unit,
      quantity: it.quantity,
      purchase_price: it.purchase_price,
      selling_price: it.selling_price,
      total_price: it.total_price,
      profit: it.profit
    }));

    const subtotal = processedItems.reduce((sum, it) => sum + it.total_price, 0);
    const discount = Number(saleData.discount) || 0;
    const total = Math.max(0, subtotal - discount);
    const totalProfit = processedItems.reduce((sum, it) => sum + it.profit, 0) - discount;

    let paidAmount = total;
    let remainingAmount = 0;

    const isCredit = saleData.payment_type === 'credit' || saleData.payment_type === 'debt';

    if (!isCredit) {
      paidAmount = total;
      remainingAmount = 0;
    } else {
      paidAmount = Number(saleData.paid_amount) || 0;
      remainingAmount = Math.max(0, total - paidAmount);

      if (!saleData.customer_name) {
        return { success: false, error: 'البيع الآجل يتطلب تحديد اسم العميل.' };
      }
    }

    for (const item of saleData.items) {
      const prodIndex = products.findIndex(p => p.id === item.product_id);
      if (prodIndex !== -1) {
        const prod = products[prodIndex];
        const prevQty = prod.quantity;
        const newQty = prevQty - item.quantity;
        prod.quantity = newQty;
        prod.updated_at = new Date().toISOString();

        this.recordStockMovement({
          product_id: prod.id,
          product_name: prod.name,
          type: 'sale',
          quantity: item.quantity,
          previous_quantity: prevQty,
          new_quantity: newQty,
          reason: `فاتورة بيع رقم ${invoiceNumber}`
        });
      }
    }
    this.set(STORAGE_KEYS.PRODUCTS, products);

    if (isCredit && remainingAmount > 0) {
      let customerId = saleData.customer_id;

      if (!customerId) {
        const existingCust = this.getCustomers().find(c => c.name.trim() === saleData.customer_name?.trim());
        if (existingCust) {
          customerId = existingCust.id;
        } else {
          const newCust = this.saveCustomer({
            name: saleData.customer_name || 'عميل آجل',
            notes: 'تم إنشاؤه تلقائياً من فاتورة بيع'
          });
          customerId = newCust.id;
        }
      }

      this.addDebt({
        customer_id: customerId,
        customer_name: saleData.customer_name || 'عميل آجل',
        sale_id: saleId,
        amount: total,
        paid_amount: paidAmount,
        notes: `متبقي من فاتورة ${invoiceNumber}`
      });
    }

    const newSale: Sale = {
      id: saleId,
      invoice_number: invoiceNumber,
      customer_id: saleData.customer_id,
      customer_name: saleData.customer_name || (!isCredit ? 'زبون نقدي' : 'عميل آجل'),
      subtotal,
      discount,
      total,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      payment_type: isCredit ? 'debt' : 'cash',
      profit: totalProfit,
      items_count: processedItems.reduce((sum, it) => sum + it.quantity, 0),
      items: processedItems,
      notes: saleData.notes || '',
      created_at: new Date().toISOString()
    };

    const sales = this.getSales();
    sales.unshift(newSale);
    this.set(STORAGE_KEYS.SALES, sales);

    return { success: true, sale: newSale };
  }

  // --- CUSTOMERS ---
  public getCustomers(): Customer[] {
    return this.get<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find(c => c.id === id);
  }

  public saveCustomer(cust: Partial<Customer>): Customer {
    const customers = this.getCustomers();
    const now = new Date().toISOString();

    if (cust.id) {
      const idx = customers.findIndex(c => c.id === cust.id);
      if (idx !== -1) {
        const updated = {
          ...customers[idx],
          ...cust,
          updated_at: now
        } as Customer;
        customers[idx] = updated;
        this.set(STORAGE_KEYS.CUSTOMERS, customers);
        return updated;
      }
    }

    const newCustomer: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: cust.name || 'عميل جديد',
      phone: cust.phone || '',
      total_debt: Number(cust.total_debt) || 0,
      paid_amount: Number(cust.paid_amount) || 0,
      remaining_debt: Number(cust.total_debt) || 0,
      notes: cust.notes || '',
      created_at: now,
      updated_at: now
    };

    customers.unshift(newCustomer);
    this.set(STORAGE_KEYS.CUSTOMERS, customers);
    return newCustomer;
  }

  public deleteCustomer(id: string): boolean {
    const customers = this.getCustomers();
    const filtered = customers.filter(c => c.id !== id);
    if (filtered.length !== customers.length) {
      this.set(STORAGE_KEYS.CUSTOMERS, filtered);
      return true;
    }
    return false;
  }

  // --- DEBTS & PAYMENTS ---
  public getDebts(): Debt[] {
    return this.get<Debt[]>(STORAGE_KEYS.DEBTS, []);
  }

  public getDebtPayments(): DebtPayment[] {
    return this.get<DebtPayment[]>(STORAGE_KEYS.DEBT_PAYMENTS, []);
  }

  public addDebt(debtInput: {
    customer_id: string;
    customer_name: string;
    sale_id?: string;
    amount: number;
    paid_amount?: number;
    notes?: string;
  } | string, customerName?: string, amount?: number, notes?: string, saleId?: string): Debt {
    let customer_id = '';
    let cName = '';
    let amt = 0;
    let paid = 0;
    let nts = '';
    let sId = '';

    if (typeof debtInput === 'object') {
      customer_id = debtInput.customer_id;
      cName = debtInput.customer_name;
      amt = Number(debtInput.amount) || 0;
      paid = Number(debtInput.paid_amount) || 0;
      nts = debtInput.notes || '';
      sId = debtInput.sale_id || '';
    } else {
      customer_id = debtInput;
      cName = customerName || '';
      amt = Number(amount) || 0;
      nts = notes || '';
      sId = saleId || '';
    }

    const debts = this.getDebts();
    const remaining = Math.max(0, amt - paid);

    const newDebt: Debt = {
      id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      customer_id,
      customer_name: cName,
      sale_id: sId,
      amount: amt,
      paid_amount: paid,
      remaining_amount: remaining,
      notes: nts,
      status: remaining === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
      created_at: new Date().toISOString()
    };

    debts.unshift(newDebt);
    this.set(STORAGE_KEYS.DEBTS, debts);
    this.recalculateCustomerDebt(customer_id);

    return newDebt;
  }

  public recordDebtPayment(
    paymentInput: {
      customer_id: string;
      customer_name?: string;
      amount: number;
      debt_id?: string;
      notes?: string;
    } | string,
    amountArg?: number,
    notesArg?: string,
    debtIdArg?: string
  ): { success: boolean; payment?: DebtPayment; error?: string } {
    let customer_id = '';
    let customer_name = '';
    let amount = 0;
    let debt_id: string | undefined = undefined;
    let notes = '';

    if (typeof paymentInput === 'object') {
      customer_id = paymentInput.customer_id;
      customer_name = paymentInput.customer_name || '';
      amount = Number(paymentInput.amount);
      debt_id = paymentInput.debt_id;
      notes = paymentInput.notes || 'سداد دفعة نقدية';
    } else {
      customer_id = paymentInput;
      amount = Number(amountArg);
      notes = notesArg || 'سداد دفعة نقدية';
      debt_id = debtIdArg;
    }

    if (!customer_name) {
      const cust = this.getCustomerById(customer_id);
      customer_name = cust ? cust.name : 'عميل مسجل';
    }

    if (!amount || amount <= 0) {
      return { success: false, error: 'يرجى إدخال مبلغ دفع صالح.' };
    }

    const payments = this.getDebtPayments();
    const newPayment: DebtPayment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      customer_id,
      customer_name,
      debt_id,
      amount,
      payment_date: new Date().toISOString(),
      notes
    };

    payments.unshift(newPayment);
    this.set(STORAGE_KEYS.DEBT_PAYMENTS, payments);

    const debts = this.getDebts();
    let remainingToDistribute = amount;

    const customerDebts = debts
      .filter(d => d.customer_id === customer_id && d.remaining_amount > 0)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (const debt of customerDebts) {
      if (remainingToDistribute <= 0) break;
      const canPay = Math.min(debt.remaining_amount, remainingToDistribute);
      debt.paid_amount += canPay;
      debt.remaining_amount -= canPay;
      debt.status = debt.remaining_amount === 0 ? 'paid' : 'partial';
      remainingToDistribute -= canPay;
    }

    this.set(STORAGE_KEYS.DEBTS, debts);
    this.recalculateCustomerDebt(customer_id);

    return { success: true, payment: newPayment };
  }

  private recalculateCustomerDebt(customerId: string) {
    const debts = this.getDebts().filter(d => d.customer_id === customerId);
    const payments = this.getDebtPayments().filter(p => p.customer_id === customerId);

    const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingDebt = Math.max(0, totalDebt - totalPaid);

    const customers = this.getCustomers();
    const idx = customers.findIndex(c => c.id === customerId);
    if (idx !== -1) {
      customers[idx].total_debt = totalDebt;
      customers[idx].paid_amount = totalPaid;
      customers[idx].remaining_debt = remainingDebt;
      customers[idx].updated_at = new Date().toISOString();
      this.set(STORAGE_KEYS.CUSTOMERS, customers);
    }
  }

  // --- STOCK MOVEMENTS ---
  public getStockMovements(): StockMovement[] {
    return this.get<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, []);
  }

  public recordStockMovement(mov: Omit<StockMovement, 'id' | 'created_at'>) {
    const list = this.getStockMovements();
    const record: StockMovement = {
      ...mov,
      id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      created_at: new Date().toISOString()
    };
    list.unshift(record);
    if (list.length > 500) list.pop();
    this.set(STORAGE_KEYS.STOCK_MOVEMENTS, list);
  }

  // --- SETTINGS ---
  public getSettings(): AppSettings {
    return this.get<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  public saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    this.set(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }

  // --- USER ACCOUNT ---
  public getUser(): UserAccount | null {
    return this.get<UserAccount | null>(STORAGE_KEYS.USER, null);
  }

  public saveUser(user: UserAccount): void {
    this.set(STORAGE_KEYS.USER, user);
  }

  public clearUser(): void {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  // --- LICENSE STATE ---
  public getLicense(): LicenseState | null {
    return this.get<LicenseState | null>(STORAGE_KEYS.LICENSE, null);
  }

  public saveLicense(lic: LicenseState): void {
    this.set(STORAGE_KEYS.LICENSE, lic);
  }

  // --- DASHBOARD STATS ---
  public getDashboardStats(): DashboardStats {
    const sales = this.getSales();
    const products = this.getProducts();
    const customers = this.getCustomers();
    const settings = this.getSettings();

    const todayStr = new Date().toISOString().split('T')[0];

    let todaySales = 0;
    let todayProfit = 0;
    let todayInvoicesCount = 0;

    sales.forEach(sale => {
      if (sale.created_at.startsWith(todayStr)) {
        todaySales += sale.total;
        todayProfit += sale.profit;
        todayInvoicesCount += 1;
      }
    });

    const totalDebts = customers.reduce((sum, c) => sum + (c.remaining_debt || 0), 0);
    const inventoryValue = products.reduce((sum, p) => sum + (p.purchase_price * p.quantity), 0);
    const lowStockCount = products.filter(p => p.quantity <= (p.min_stock_alert || settings.low_stock_threshold)).length;

    return {
      todaySales,
      todayProfit,
      todayInvoicesCount,
      totalDebts,
      inventoryValue,
      productsCount: products.length,
      customersCount: customers.length,
      lowStockCount
    };
  }

  // --- BACKUP & RESTORE ---
  public exportFullBackupJSON(): string {
    return this.createBackup();
  }

  public restoreFromBackupJSON(jsonString: string): boolean {
    const res = this.restoreBackup(jsonString);
    return res.success;
  }

  public createBackup(): string {
    const dump = {
      version: '1.0.0',
      appName: 'ايدينيا - حِسبة',
      timestamp: new Date().toISOString(),
      data: {
        products: this.getProducts(),
        sales: this.getSales(),
        customers: this.getCustomers(),
        debts: this.getDebts(),
        debt_payments: this.getDebtPayments(),
        stock_movements: this.getStockMovements(),
        settings: this.getSettings(),
        user: this.getUser(),
        license: this.getLicense()
      }
    };
    return JSON.stringify(dump, null, 2);
  }

  public restoreBackup(jsonString: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data || !parsed.appName) {
        return { success: false, error: 'ملف النسخة الاحتياطية غير صالح أو تالف.' };
      }

      const { data } = parsed;
      if (data.products) this.set(STORAGE_KEYS.PRODUCTS, data.products);
      if (data.sales) this.set(STORAGE_KEYS.SALES, data.sales);
      if (data.customers) this.set(STORAGE_KEYS.CUSTOMERS, data.customers);
      if (data.debts) this.set(STORAGE_KEYS.DEBTS, data.debts);
      if (data.debt_payments) this.set(STORAGE_KEYS.DEBT_PAYMENTS, data.debt_payments);
      if (data.stock_movements) this.set(STORAGE_KEYS.STOCK_MOVEMENTS, data.stock_movements);
      if (data.settings) this.set(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.user) this.set(STORAGE_KEYS.USER, data.user);
      if (data.license) this.set(STORAGE_KEYS.LICENSE, data.license);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'فشل في قراءة ملف النسخة: ' + err.message };
    }
  }

  public clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.DEBTS);
    localStorage.removeItem(STORAGE_KEYS.DEBT_PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.STOCK_MOVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    this.initDatabase();
  }

  public resetDemoData(): void {
    this.clearAllData();
  }
}

export const db = new LocalDatabase();
db.initDatabase();
