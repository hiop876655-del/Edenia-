import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../models/app_models.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('idenia_hisba.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    // Check if running on Windows desktop
    if (!kIsWeb && (Platform.isWindows || Platform.isLinux)) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    String path;
    if (!kIsWeb && (Platform.isWindows || Platform.isLinux)) {
      final appDocDir = await getApplicationDocumentsDirectory();
      path = join(appDocDir.path, 'IdeniaHisba', filePath);
      final dir = Directory(dirname(path));
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
    } else {
      final dbPath = await getDatabasesPath();
      path = join(dbPath, filePath);
    }

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future<void> _createDB(Database db, int version) async {
    // 1. جدول الأصناف والمخزن
    await db.execute('''
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        cost_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        stock_quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        min_stock_alert REAL NOT NULL
      )
    ''');

    // 2. جدول الفواتير الرئيسية
    await db.execute('''
      CREATE TABLE invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        date_time TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        total_amount REAL NOT NULL,
        discount REAL NOT NULL,
        final_amount REAL NOT NULL,
        paid_amount REAL NOT NULL,
        remaining_amount REAL NOT NULL
      )
    ''');

    // 3. جدول تفاصيل الفواتير
    await db.execute('''
      CREATE TABLE invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        barcode TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        cost_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE
      )
    ''');

    // 4. جدول العملاء والديون
    await db.execute('''
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        balance REAL NOT NULL,
        credit_limit REAL NOT NULL
      )
    ''');

    // 5. جدول حركات الخزينة والمصروفات
    await db.execute('''
      CREATE TABLE cash_flow (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date_time TEXT NOT NULL,
        type TEXT NOT NULL, -- 'sale', 'expense', 'debt_payment'
        amount REAL NOT NULL,
        notes TEXT
      )
    ''');

    // إضافة بيانات تجريبية أولية للتاجر
    await _insertInitialData(db);
  }

  Future<void> _insertInitialData(Database db) async {
    final defaultProducts = [
      Product(barcode: '6221001001', name: 'أرز فاخر 1 كجم', category: 'بقالة', costPrice: 28.0, sellingPrice: 35.0, stockQuantity: 50),
      Product(barcode: '6221001002', name: 'سكر أبيض ناعم 1 كجم', category: 'بقالة', costPrice: 24.0, sellingPrice: 30.0, stockQuantity: 80),
      Product(barcode: '6221001003', name: 'زيت ذرة نقي 800 مل', category: 'زيوت', costPrice: 58.0, sellingPrice: 70.0, stockQuantity: 30),
      Product(barcode: '6221001004', name: 'شاي أسود ناعم 100 جم', category: 'مشروبات', costPrice: 16.0, sellingPrice: 22.0, stockQuantity: 100),
      Product(barcode: '6221001005', name: 'حليب معقم 1 لتر', category: 'ألبان', costPrice: 32.0, sellingPrice: 40.0, stockQuantity: 40),
    ];

    for (var prod in defaultProducts) {
      await db.insert('products', prod.toMap());
    }

    final defaultCustomers = [
      Customer(name: 'أحمد محمود', phone: '01012345678', balance: 350.0, creditLimit: 2000.0),
      Customer(name: 'محمد عبد الله', phone: '01198765432', balance: 0.0, creditLimit: 5000.0),
      Customer(name: 'سوبر ماركت السلام', phone: '01234567890', balance: 1200.0, creditLimit: 10000.0),
    ];

    for (var cust in defaultCustomers) {
      await db.insert('customers', cust.toMap());
    }
  }

  // --- دوال المنتجات ---
  Future<List<Product>> getAllProducts() async {
    final db = await instance.database;
    final maps = await db.query('products', orderBy: 'name ASC');
    return maps.map((e) => Product.fromMap(e)).toList();
  }

  Future<Product?> getProductByBarcode(String barcode) async {
    final db = await instance.database;
    final res = await db.query('products', where: 'barcode = ?', whereArgs: [barcode]);
    if (res.isNotEmpty) {
      return Product.fromMap(res.first);
    }
    return null;
  }

  Future<int> insertProduct(Product p) async {
    final db = await instance.database;
    return await db.insert('products', p.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<int> updateProduct(Product p) async {
    final db = await instance.database;
    return await db.update('products', p.toMap(), where: 'id = ?', whereArgs: [p.id]);
  }

  Future<int> deleteProduct(int id) async {
    final db = await instance.database;
    return await db.delete('products', where: 'id = ?', whereArgs: [id]);
  }

  // --- دوال الفواتير والكاشير ---
  Future<int> createInvoice(Invoice invoice) async {
    final db = await instance.database;
    return await db.transaction((txn) async {
      // 1. إدراج الفاتورة
      final invoiceId = await txn.insert('invoices', invoice.toMap());

      // 2. إدراج التفاصيل وخصم المخزون
      for (var item in invoice.items) {
        await txn.insert('invoice_items', item.toMap(invoiceId));
        if (item.productId != null) {
          await txn.rawUpdate(
            'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
            [item.quantity, item.productId]
          );
        }
      }

      // 3. تحديث الخزينة
      if (invoice.paidAmount > 0) {
        await txn.insert('cash_flow', {
          'date_time': invoice.dateTime,
          'type': 'sale',
          'amount': invoice.paidAmount,
          'notes': 'فاتورة بيع رقم: ${invoice.invoiceNumber}',
        });
      }

      // 4. تحديث حساب العميل إذا آجل
      if (invoice.remainingAmount > 0 && invoice.customerName != 'عميل نقدي') {
        await txn.rawUpdate(
          'UPDATE customers SET balance = balance + ? WHERE name = ?',
          [invoice.remainingAmount, invoice.customerName]
        );
      }

      return invoiceId;
    });
  }

  Future<List<Invoice>> getRecentInvoices({int limit = 50}) async {
    final db = await instance.database;
    final res = await db.query('invoices', orderBy: 'id DESC', limit: limit);
    return res.map((e) => Invoice.fromMap(e)).toList();
  }

  // --- دوال العملاء ---
  Future<List<Customer>> getAllCustomers() async {
    final db = await instance.database;
    final res = await db.query('customers', orderBy: 'name ASC');
    return res.map((e) => Customer.fromMap(e)).toList();
  }

  Future<int> insertCustomer(Customer c) async {
    final db = await instance.database;
    return await db.insert('customers', c.toMap());
  }

  Future<void> recordDebtPayment(int customerId, String customerName, double amount) async {
    final db = await instance.database;
    await db.transaction((txn) async {
      await txn.rawUpdate(
        'UPDATE customers SET balance = balance - ? WHERE id = ?',
        [amount, customerId]
      );
      await txn.insert('cash_flow', {
        'date_time': DateTime.now().toIso8601String(),
        'type': 'debt_payment',
        'amount': amount,
        'notes': 'سداد دفعة من العميل: $customerName',
      });
    });
  }

  // --- إحصائيات لوحة التحكم ---
  Future<Map<String, dynamic>> getDashboardStats() async {
    final db = await instance.database;
    
    // مبيعات اليوم
    final todayStr = DateTime.now().toIso8601String().substring(0, 10);
    final salesRes = await db.rawQuery(
      "SELECT SUM(final_amount) as totalSales, COUNT(id) as count FROM invoices WHERE date_time LIKE '$todayStr%'"
    );
    final totalSales = (salesRes.first['totalSales'] as num?)?.toDouble() ?? 0.0;
    final invoiceCount = salesRes.first['count'] as int? ?? 0;

    // ديون العملاء الإجمالية
    final debtRes = await db.rawQuery("SELECT SUM(balance) as totalDebt FROM customers WHERE balance > 0");
    final totalDebt = (debtRes.first['totalDebt'] as num?)?.toDouble() ?? 0.0;

    // قيمة بضاعة المخزن
    final stockRes = await db.rawQuery("SELECT SUM(cost_price * stock_quantity) as totalStockValue, COUNT(id) as productCount FROM products");
    final stockValue = (stockRes.first['totalStockValue'] as num?)?.toDouble() ?? 0.0;
    final productCount = stockRes.first['productCount'] as int? ?? 0;

    return {
      'todaySales': totalSales,
      'invoiceCount': invoiceCount,
      'totalDebt': totalDebt,
      'stockValue': stockValue,
      'productCount': productCount,
    };
  }
}
