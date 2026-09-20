import 'dart:io';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../models/models.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('idenia_hisba_local.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    // Check if running on Windows Desktop or Linux
    if (Platform.isWindows || Platform.isLinux) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
      final appDocsDir = await getApplicationDocumentsDirectory();
      final dbPath = join(appDocsDir.path, 'IdeniaHisba', filePath);
      final dir = Directory(join(appDocsDir.path, 'IdeniaHisba'));
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
      return await databaseFactory.openDatabase(
        dbPath,
        options: OpenDatabaseOptions(
          version: 1,
          onCreate: _createDB,
        ),
      );
    } else {
      // Android / iOS
      final dbPath = await getDatabasesPath();
      final path = join(dbPath, filePath);
      return await openDatabase(
        path,
        version: 1,
        onCreate: _createDB,
      );
    }
  }

  Future _createDB(Database db, int version) async {
    // Products Table
    await db.execute('''
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        cost_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        stock INTEGER NOT NULL,
        min_stock_alert INTEGER NOT NULL,
        unit TEXT NOT NULL
      )
    ''');

    // Sales Table
    await db.execute('''
      CREATE TABLE sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        date TEXT NOT NULL,
        customer_id INTEGER,
        customer_name TEXT NOT NULL,
        total_amount REAL NOT NULL,
        discount REAL NOT NULL,
        final_amount REAL NOT NULL,
        paid_amount REAL NOT NULL,
        remaining_amount REAL NOT NULL,
        payment_type TEXT NOT NULL,
        items_json TEXT NOT NULL,
        notes TEXT
      )
    ''');

    // Customers Table
    await db.execute('''
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        total_debt REAL NOT NULL,
        notes TEXT
      )
    ''');

    // Debt Payments Table
    await db.execute('''
      CREATE TABLE debt_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        notes TEXT
      )
    ''');

    // Expenses Table
    await db.execute('''
      CREATE TABLE expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        notes TEXT
      )
    ''');

    // Seed Initial Demo Products
    await db.insert('products', {
      'barcode': '1001',
      'name': 'كابل شاحن سريع Type-C',
      'category': 'إلكترونيات',
      'cost_price': 35.0,
      'selling_price': 65.0,
      'stock': 40,
      'min_stock_alert': 10,
      'unit': 'قطعة',
    });

    await db.insert('products', {
      'barcode': '1002',
      'name': 'سماعة أذن بلوتوث لاسلكية',
      'category': 'إلكترونيات',
      'cost_price': 120.0,
      'selling_price': 190.0,
      'stock': 15,
      'min_stock_alert': 5,
      'unit': 'قطعة',
    });

    await db.insert('products', {
      'barcode': '1003',
      'name': 'باور بنك 10,000 مللي أمبير',
      'category': 'إلكترونيات',
      'cost_price': 220.0,
      'selling_price': 320.0,
      'stock': 8,
      'min_stock_alert': 3,
      'unit': 'قطعة',
    });

    // Seed Sample Customer
    await db.insert('customers', {
      'name': 'محمود عبد الفتاح (عميل دائم)',
      'phone': '01122334455',
      'address': 'شارع النصر، القاهرة',
      'total_debt': 150.0,
      'notes': 'عميل موثوق',
    });
  }

  // --- CRUD FOR PRODUCTS ---
  Future<List<Product>> getProducts() async {
    final db = await instance.database;
    final maps = await db.query('products', orderBy: 'id DESC');
    return maps.map((e) => Product.fromMap(e)).toList();
  }

  Future<Product?> getProductByBarcode(String barcode) async {
    final db = await instance.database;
    final maps = await db.query(
      'products',
      where: 'barcode = ?',
      whereArgs: [barcode],
      limit: 1,
    );
    if (maps.isNotEmpty) return Product.fromMap(maps.first);
    return null;
  }

  Future<int> insertProduct(Product product) async {
    final db = await instance.database;
    return await db.insert('products', product.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<int> updateProduct(Product product) async {
    final db = await instance.database;
    return await db.update(
      'products',
      product.toMap(),
      where: 'id = ?',
      whereArgs: [product.id],
    );
  }

  Future<int> deleteProduct(int id) async {
    final db = await instance.database;
    return await db.delete('products', where: 'id = ?', whereArgs: [id]);
  }

  // --- SALES & POS ---
  Future<List<Sale>> getSales() async {
    final db = await instance.database;
    final maps = await db.query('sales', orderBy: 'id DESC');
    return maps.map((e) => Sale.fromMap(e)).toList();
  }

  Future<int> insertSale(Sale sale) async {
    final db = await instance.database;
    return await db.transaction((txn) async {
      // 1. Insert the sale record
      final saleId = await txn.insert('sales', sale.toMap());

      // 2. Deduct inventory stock
      for (final item in sale.items) {
        if (item.productId != null) {
          await txn.rawUpdate(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [item.quantity, item.productId],
          );
        }
      }

      // 3. If credit sale, update customer debt
      if (sale.paymentType == 'credit' && sale.customerId != null && sale.remainingAmount > 0) {
        await txn.rawUpdate(
          'UPDATE customers SET total_debt = total_debt + ? WHERE id = ?',
          [sale.remainingAmount, sale.customerId],
        );
      }

      return saleId;
    });
  }

  // --- CUSTOMERS ---
  Future<List<Customer>> getCustomers() async {
    final db = await instance.database;
    final maps = await db.query('customers', orderBy: 'name ASC');
    return maps.map((e) => Customer.fromMap(e)).toList();
  }

  Future<int> insertCustomer(Customer customer) async {
    final db = await instance.database;
    return await db.insert('customers', customer.toMap());
  }

  Future<int> recordDebtPayment(DebtPayment payment) async {
    final db = await instance.database;
    return await db.transaction((txn) async {
      await txn.insert('debt_payments', payment.toMap());
      await txn.rawUpdate(
        'UPDATE customers SET total_debt = CASE WHEN total_debt >= ? THEN total_debt - ? ELSE 0 END WHERE id = ?',
        [payment.amount, payment.amount, payment.customerId],
      );
      return 1;
    });
  }

  // --- EXPENSES ---
  Future<List<Expense>> getExpenses() async {
    final db = await instance.database;
    final maps = await db.query('expenses', orderBy: 'id DESC');
    return maps.map((e) => Expense.fromMap(e)).toList();
  }

  Future<int> insertExpense(Expense expense) async {
    final db = await instance.database;
    return await db.insert('expenses', expense.toMap());
  }
}
