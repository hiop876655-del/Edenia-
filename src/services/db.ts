import { saveEncryptedItem, loadEncryptedItem } from "./cryptoStorage";
import { normalizePhone } from "./phoneUtils";
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
  private getScopedKey(baseKey: string, explicitPhone?: string): string {
    if (baseKey === STORAGE_KEYS.USER) {
      return baseKey;
    }
    const phone = explicitPhone || loadEncryptedItem<UserAccount | null>(STORAGE_KEYS.USER, null)?.phone;
    if (phone) {
      const cleanPhone = normalizePhone(phone);
      if (cleanPhone) {
        return `${baseKey}_${cleanPhone}`;
      }
    }
    return baseKey;
  }

  private get<T>(key: string, defaultValue: T, explicitPhone?: string): T {
    return loadEncryptedItem<T>(this.getScopedKey(key, explicitPhone), defaultValue);
  }

  private set<T>(key: string, value: T, explicitPhone?: string): void {
    saveEncryptedItem(this.getScopedKey(key, explicitPhone), value);
  }

  public triggerCloudSync() {
    this.markLocalWrite();
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('idenia_db_changed', { detail: { timestamp: Date.now() } }));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('idenia_local_db_channel');
          bc.postMessage({ type: 'DB_CHANGED', timestamp: Date.now() });
          bc.close();
        }
      } catch {}

      // Fast-trigger instant cloud stream push (non-blocking)
      try {
        import('./cloudDatabase').then(m => {
          m.cloudDatabaseService.syncAllDataToCloud().catch(() => {});
        }).catch(() => {});
      } catch {}
    }
  }

  // --- Initial Data Clean & Storage Hardening ---
  public initDatabase() {
    // Request persistent browser storage to prevent eviction
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }

    // Safety migration: clean any temporary mock tags while strictly preserving ALL user data
    const existingProducts = this.get<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    const existingCustomers = this.get<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const existingDebts = this.get<Debt[]>(STORAGE_KEYS.DEBTS, []);

    // Ensure state integrity without deleting genuine user items
    if (!Array.isArray(existingProducts)) this.set(STORAGE_KEYS.PRODUCTS, []);
    if (!Array.isArray(existingCustomers)) this.set(STORAGE_KEYS.CUSTOMERS, []);
    if (!Array.isArray(existingDebts)) this.set(STORAGE_KEYS.DEBTS, []);
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
        this.triggerCloudSync();
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

    this.triggerCloudSync();
    return newProd;
  }

  public deleteProduct(id: string): boolean {
    const products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length !== products.length) {
      this.set(STORAGE_KEYS.PRODUCTS, filtered);
      this.triggerCloudSync();
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
      reason: reason || 'تسوية رصيد مخزني'
    });

    this.triggerCloudSync();
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

    const isCredit = saleData.payment_type === 'credit' || saleData.payment_type === 'debt';
    let paidAmount = Number(saleData.paid_amount);
    if (isNaN(paidAmount) || paidAmount === undefined) {
      paidAmount = isCredit ? 0 : total;
    }

    // Remaining unpaid amount for this specific invoice
    const remainingAmount = Math.max(0, total - paidAmount);

    if (isCredit && !saleData.customer_name && !saleData.customer_id) {
      return { success: false, error: 'البيع الآجل يتطلب تحديد اسم العميل أو اختياره.' };
    }

    // Deduct stock from inventory
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

    // Resolve or create customer
    let finalCustomerId = saleData.customer_id;
    const trimmedCustomerName = (saleData.customer_name || '').trim();

    if (trimmedCustomerName && trimmedCustomerName !== 'عميل نقدي' && trimmedCustomerName !== 'زبون نقدي') {
      if (!finalCustomerId) {
        const existingCust = this.getCustomers().find(c => c.name.trim().toLowerCase() === trimmedCustomerName.toLowerCase());
        if (existingCust) {
          finalCustomerId = existingCust.id;
        } else {
          const newCust = this.saveCustomer({
            name: trimmedCustomerName,
            notes: isCredit ? 'تم إنشاؤه تلقائياً من فاتورة بيع آجل' : 'تم إنشاؤه تلقائياً من نقطة البيع'
          });
          finalCustomerId = newCust.id;
        }
      }
    }

    const previousBalance = finalCustomerId ? (this.getCustomerById(finalCustomerId)?.remaining_debt || 0) : 0;
    let paidTowardsPreviousDebt = 0;

    if (finalCustomerId) {
      const debtCustName = trimmedCustomerName || 'عميل مسجل';

      if (remainingAmount > 0) {
        // Customer has unpaid remainder on this invoice (e.g. total 110, paid 50 -> remainder 60 is added as new debt)
        this.addDebt({
          customer_id: finalCustomerId,
          customer_name: debtCustName,
          sale_id: saleId,
          amount: remainingAmount, // The exact net unpaid debt amount added to balance
          paid_amount: 0,
          notes: `متبقي من فاتورة ${invoiceNumber} (قيمة الأصناف: ${total} - مسدد نقداً: ${paidAmount})`
        });
      } else if (paidAmount > total) {
        // Customer paid more than invoice total (e.g. invoice total 100, paid 200)
        // 100 settles current invoice in full, excess 100 pays down previous customer debt!
        paidTowardsPreviousDebt = paidAmount - total;
        this.recordDebtPayment({
          customer_id: finalCustomerId,
          customer_name: debtCustName,
          amount: paidTowardsPreviousDebt,
          notes: `سداد من فائض فاتورة ${invoiceNumber} (مدفوع ${paidAmount} - فاتورة ${total})`
        });
      }
    }

    const updatedCustomer = finalCustomerId ? this.getCustomerById(finalCustomerId) : null;
    const finalBalance = updatedCustomer ? updatedCustomer.remaining_debt : Math.max(0, previousBalance + remainingAmount - paidTowardsPreviousDebt);

    const newSale: Sale = {
      id: saleId,
      invoice_number: invoiceNumber,
      customer_id: finalCustomerId,
      customer_name: trimmedCustomerName || (!isCredit ? 'زبون نقدي' : 'عميل آجل'),
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
      previous_balance: previousBalance,
      paid_towards_previous_debt: paidTowardsPreviousDebt,
      final_balance: finalBalance,
      void_status: 'active',
      created_at: new Date().toISOString()
    };

    const sales = this.getSales();
    sales.unshift(newSale);
    this.set(STORAGE_KEYS.SALES, sales);
    this.triggerCloudSync();

    return { success: true, sale: newSale };
  }

  // --- SMART VOID / CANCEL INVOICE & RESTORE STOCK ---
  public voidInvoice(
    saleId: string,
    mode: 'all' | 'items_only' | 'payment_only' = 'all'
  ): { success: boolean; message: string } {
    const sales = this.getSales();
    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) {
      return { success: false, message: 'الفاتورة غير موجودة أو تم إلغاؤها مسبقاً.' };
    }

    const targetSale = sales[saleIndex];
    const products = this.getProducts();

    // 1. Restore product quantities in inventory (if mode is 'all' or 'items_only')
    if (mode === 'all' || mode === 'items_only') {
      for (const item of targetSale.items) {
        const prodIndex = products.findIndex(p => p.id === item.product_id);
        if (prodIndex !== -1) {
          const prod = products[prodIndex];
          const prevQty = prod.quantity;
          const restoredQty = prevQty + item.quantity;
          prod.quantity = restoredQty;
          prod.updated_at = new Date().toISOString();

          this.recordStockMovement({
            product_id: prod.id,
            product_name: prod.name,
            type: 'adjustment',
            quantity: item.quantity,
            previous_quantity: prevQty,
            new_quantity: restoredQty,
            reason: `إلغاء واسترجاع أصناف فاتورة بيع رقم ${targetSale.invoice_number}`
          });
        }
      }
      this.set(STORAGE_KEYS.PRODUCTS, products);
    }

    // 2. Reverse associated customer debt / payments
    if (targetSale.customer_id) {
      const debts = this.getDebts();
      const payments = this.getDebtPayments();

      if (mode === 'all' || mode === 'items_only') {
        // Remove debt record tied to this invoice
        const updatedDebts = debts.filter(d => d.sale_id !== saleId);
        this.set(STORAGE_KEYS.DEBTS, updatedDebts);
      }

      if (mode === 'all' || mode === 'payment_only') {
        // Remove excess payment tied to this invoice if exists
        const updatedPayments = payments.filter(p => !p.notes?.includes(targetSale.invoice_number));
        this.set(STORAGE_KEYS.DEBT_PAYMENTS, updatedPayments);
      }

      this.recalculateCustomerDebt(targetSale.customer_id);
    }

    // 3. Remove or update sales list
    const updatedCustomer = targetSale.customer_id ? this.getCustomerById(targetSale.customer_id) : null;
    const currentCustDebt = updatedCustomer ? updatedCustomer.remaining_debt : 0;

    if (mode === 'all') {
      sales.splice(saleIndex, 1);
    } else if (mode === 'items_only') {
      targetSale.void_status = 'items_voided';
      targetSale.total = 0;
      targetSale.subtotal = 0;
      targetSale.profit = 0;
      targetSale.items = [];
      targetSale.remaining_amount = 0;
      targetSale.final_balance = currentCustDebt;
    } else if (mode === 'payment_only') {
      targetSale.void_status = 'payment_voided';
      // Reset paid amount on this invoice back to items cost only (e.g. from 200 to 110)
      targetSale.paid_amount = targetSale.total;
      targetSale.paid_towards_previous_debt = 0;
      targetSale.final_balance = currentCustDebt;
    }
    this.set(STORAGE_KEYS.SALES, sales);
    this.triggerCloudSync();

    let message = `تم إلغاء الفاتورة ${targetSale.invoice_number} وإعادة جميع الأصناف المباعة إلى رصيد المخزن بنجاح.`;
    if (mode === 'items_only') {
      message = `تم استرجاع البضاعة للمخزن وتثبيت دفعة سداد الدين في حساب العميل بنجاح.`;
    } else if (mode === 'payment_only') {
      message = `تم إلغاء دفعة سداد الدين وتعديل الفاتورة وإعادة رصيد الدين إلى حساب العميل بنجاح.`;
    }

    return { success: true, message };
  }

  // --- CUSTOMER STATEMENT & DAILY LEDGER ---
  public getCustomerInvoices(customerId: string): Sale[] {
    return this.getSales().filter(s => s.customer_id === customerId);
  }

  public getCustomerDailyLedger(customerId: string) {
    const customerInvoices = this.getCustomerInvoices(customerId);
    const customerPayments = this.getDebtPayments().filter(p => p.customer_id === customerId);

    // Group by Day (YYYY-MM-DD)
    const dayMap = new Map<string, {
      date: string;
      dateFormatted: string;
      sales: Sale[];
      payments: DebtPayment[];
      totalSales: number;
      totalPaid: number;
      remainingDelta: number;
    }>();

    customerInvoices.forEach(sale => {
      const dayKey = sale.created_at.split('T')[0];
      if (!dayMap.has(dayKey)) {
        const d = new Date(dayKey);
        dayMap.set(dayKey, {
          date: dayKey,
          dateFormatted: d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          sales: [],
          payments: [],
          totalSales: 0,
          totalPaid: 0,
          remainingDelta: 0
        });
      }
      const entry = dayMap.get(dayKey)!;
      entry.sales.push(sale);
      entry.totalSales += sale.total;
      entry.remainingDelta += (sale.remaining_amount || 0);
    });

    customerPayments.forEach(pay => {
      const dayKey = pay.payment_date.split('T')[0];
      if (!dayMap.has(dayKey)) {
        const d = new Date(dayKey);
        dayMap.set(dayKey, {
          date: dayKey,
          dateFormatted: d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          sales: [],
          payments: [],
          totalSales: 0,
          totalPaid: 0,
          remainingDelta: 0
        });
      }
      const entry = dayMap.get(dayKey)!;
      entry.payments.push(pay);
      entry.totalPaid += pay.amount;
      entry.remainingDelta -= pay.amount;
    });

    return Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
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
        this.triggerCloudSync();
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
    this.triggerCloudSync();
    return newCustomer;
  }

  public deleteCustomer(id: string): boolean {
    const customers = this.getCustomers();
    const filtered = customers.filter(c => c.id !== id);
    if (filtered.length !== customers.length) {
      this.set(STORAGE_KEYS.CUSTOMERS, filtered);
      this.triggerCloudSync();
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
    this.triggerCloudSync();

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

    this.recalculateCustomerDebt(customer_id);
    this.triggerCloudSync();

    return { success: true, payment: newPayment };
  }

  public recalculateCustomerDebt(customerId: string) {
    const allDebts = this.getDebts();
    const allPayments = this.getDebtPayments();

    const customerDebts = allDebts
      .filter(d => d.customer_id === customerId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const customerPayments = allPayments
      .filter(p => p.customer_id === customerId)
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

    // Reset all customer debts to original debt amounts
    for (const d of customerDebts) {
      d.paid_amount = 0;
      d.remaining_amount = Number(d.amount) || 0;
      d.status = d.remaining_amount === 0 ? 'paid' : 'unpaid';
    }

    // Chronologically apply all active payments
    for (const pay of customerPayments) {
      let payRemaining = Number(pay.amount) || 0;
      for (const debt of customerDebts) {
        if (payRemaining <= 0) break;
        if (debt.remaining_amount > 0) {
          const canPay = Math.min(debt.remaining_amount, payRemaining);
          debt.paid_amount += canPay;
          debt.remaining_amount -= canPay;
          debt.status = debt.remaining_amount === 0 ? 'paid' : 'partial';
          payRemaining -= canPay;
        }
      }
    }

    // Save updated debts
    this.set(STORAGE_KEYS.DEBTS, allDebts);

    // Calculate customer profile totals
    const remainingDebt = customerDebts.reduce((sum, d) => sum + (Number(d.remaining_amount) || 0), 0);
    const totalDebt = customerDebts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const totalPaid = customerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

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
    this.triggerCloudSync();
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
    const user = this.getUser();
    if (!user || !user.phone) {
      return this.get<LicenseState | null>(STORAGE_KEYS.LICENSE, null);
    }
    const lic = this.get<LicenseState | null>(STORAGE_KEYS.LICENSE, null, user.phone);
    if (lic && lic.phone && lic.phone !== user.phone) {
      return null;
    }
    return lic;
  }

  public saveLicense(lic: LicenseState): void {
    const user = this.getUser();
    const phone = (lic as any).phone || user?.phone;
    if (phone) {
      this.set(STORAGE_KEYS.LICENSE, { ...lic, phone }, phone);
    }
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

  private lastLocalWriteTimestamp: number = 0;

  public markLocalWrite() {
    this.lastLocalWriteTimestamp = Date.now();
  }

  public restoreStoreData(data: any, remoteTimestamp?: number): boolean {
    if (!data || typeof data !== 'object') return false;
    try {
      let hasChanges = false;

      // 1. SMART PRODUCTS MERGE
      if (Array.isArray(data.products)) {
        const localProducts = this.getProducts();
        const productMap = new Map<string, Product>();

        // Seed with local products
        for (const p of localProducts) {
          if (p && p.id) productMap.set(p.id, p);
        }

        // Merge remote products
        for (const rp of data.products as Product[]) {
          if (!rp || !rp.id) continue;
          const existing = productMap.get(rp.id);
          if (!existing) {
            productMap.set(rp.id, rp);
            hasChanges = true;
          } else {
            const remoteTime = new Date(rp.updated_at || rp.created_at || 0).getTime();
            const localTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
            if (remoteTime >= localTime) {
              productMap.set(rp.id, rp);
              hasChanges = true;
            }
          }
        }
        this.set(STORAGE_KEYS.PRODUCTS, Array.from(productMap.values()));
      }

      // 2. SMART SALES MERGE (Union of all cashier invoices)
      if (Array.isArray(data.sales)) {
        const localSales = this.getSales();
        const salesMap = new Map<string, Sale>();

        for (const s of localSales) {
          if (s && s.id) salesMap.set(s.id, s);
        }

        for (const rs of data.sales as Sale[]) {
          if (!rs || !rs.id) continue;
          const existing = salesMap.get(rs.id);
          if (!existing) {
            salesMap.set(rs.id, rs);
            hasChanges = true;
          } else if (rs.void_status === 'voided' && existing.void_status !== 'voided') {
            salesMap.set(rs.id, rs);
            hasChanges = true;
          }
        }

        const mergedSales = Array.from(salesMap.values()).sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime();
          const timeB = new Date(b.created_at || 0).getTime();
          return timeB - timeA;
        });
        this.set(STORAGE_KEYS.SALES, mergedSales);
      }

      // 3. SMART CUSTOMERS MERGE
      if (Array.isArray(data.customers)) {
        const localCustomers = this.getCustomers();
        const custMap = new Map<string, Customer>();

        for (const c of localCustomers) {
          if (c && c.id) custMap.set(c.id, c);
        }

        for (const rc of data.customers as Customer[]) {
          if (!rc || !rc.id) continue;
          const existing = custMap.get(rc.id);
          if (!existing) {
            custMap.set(rc.id, rc);
            hasChanges = true;
          } else {
            const remoteTime = new Date(rc.updated_at || rc.created_at || 0).getTime();
            const localTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
            if (remoteTime >= localTime) {
              custMap.set(rc.id, rc);
              hasChanges = true;
            }
          }
        }
        this.set(STORAGE_KEYS.CUSTOMERS, Array.from(custMap.values()));
      }

      // 4. DEBTS & DEBT PAYMENTS MERGE
      if (Array.isArray(data.debts)) {
        const localDebts = this.getDebts();
        const debtMap = new Map<string, Debt>();
        for (const d of localDebts) if (d && d.id) debtMap.set(d.id, d);
        for (const rd of data.debts as Debt[]) if (rd && rd.id) debtMap.set(rd.id, rd);
        this.set(STORAGE_KEYS.DEBTS, Array.from(debtMap.values()));
      }

      if (Array.isArray(data.debt_payments)) {
        const localPayments = this.getDebtPayments();
        const payMap = new Map<string, DebtPayment>();
        for (const p of localPayments) if (p && p.id) payMap.set(p.id, p);
        for (const rp of data.debt_payments as DebtPayment[]) if (rp && rp.id) payMap.set(rp.id, rp);
        this.set(STORAGE_KEYS.DEBT_PAYMENTS, Array.from(payMap.values()));
      }

      // 5. STOCK MOVEMENTS MERGE
      if (Array.isArray(data.stock_movements)) {
        const localMovements = this.getStockMovements();
        const moveMap = new Map<string, StockMovement>();
        for (const m of localMovements) if (m && m.id) moveMap.set(m.id, m);
        for (const rm of data.stock_movements as StockMovement[]) if (rm && rm.id) moveMap.set(rm.id, rm);
        const mergedMovements = Array.from(moveMap.values()).sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime();
          const timeB = new Date(b.created_at || 0).getTime();
          return timeB - timeA;
        });
        this.set(STORAGE_KEYS.STOCK_MOVEMENTS, mergedMovements);
      }

      // 6. SETTINGS MERGE
      if (data.settings && typeof data.settings === 'object') {
        const currentSettings = this.getSettings();
        this.set(STORAGE_KEYS.SETTINGS, { ...currentSettings, ...data.settings });
      }

      return true;
    } catch (err) {
      console.warn('Error restoring store data:', err);
      return false;
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
