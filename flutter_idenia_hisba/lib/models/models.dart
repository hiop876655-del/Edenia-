import 'dart:convert';

class Product {
  final int? id;
  final String barcode;
  final String name;
  final String category;
  final double costPrice;
  final double sellingPrice;
  final int stock;
  final int minStockAlert;
  final String unit;

  Product({
    this.id,
    required this.barcode,
    required this.name,
    this.category = 'عام',
    required this.costPrice,
    required this.sellingPrice,
    required this.stock,
    this.minStockAlert = 5,
    this.unit = 'قطعة',
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'barcode': barcode,
      'name': name,
      'category': category,
      'cost_price': costPrice,
      'selling_price': sellingPrice,
      'stock': stock,
      'min_stock_alert': minStockAlert,
      'unit': unit,
    };
  }

  factory Product.fromMap(Map<String, dynamic> map) {
    return Product(
      id: map['id'] as int?,
      barcode: map['barcode'] ?? '',
      name: map['name'] ?? '',
      category: map['category'] ?? 'عام',
      costPrice: (map['cost_price'] as num?)?.toDouble() ?? 0.0,
      sellingPrice: (map['selling_price'] as num?)?.toDouble() ?? 0.0,
      stock: (map['stock'] as num?)?.toInt() ?? 0,
      minStockAlert: (map['min_stock_alert'] as num?)?.toInt() ?? 5,
      unit: map['unit'] ?? 'قطعة',
    );
  }
}

class SaleItem {
  final int? productId;
  final String productName;
  final int quantity;
  final double unitPrice;
  final double costPrice;
  final double total;

  SaleItem({
    this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.costPrice,
    required this.total,
  });

  Map<String, dynamic> toMap() {
    return {
      'product_id': productId,
      'product_name': productName,
      'quantity': quantity,
      'unit_price': unitPrice,
      'cost_price': costPrice,
      'total': total,
    };
  }

  factory SaleItem.fromMap(Map<String, dynamic> map) {
    return SaleItem(
      productId: map['product_id'] as int?,
      productName: map['product_name'] ?? '',
      quantity: (map['quantity'] as num?)?.toInt() ?? 1,
      unitPrice: (map['unit_price'] as num?)?.toDouble() ?? 0.0,
      costPrice: (map['cost_price'] as num?)?.toDouble() ?? 0.0,
      total: (map['total'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class Sale {
  final int? id;
  final String invoiceNumber;
  final String date;
  final int? customerId;
  final String customerName;
  final double totalAmount;
  final double discount;
  final double finalAmount;
  final double paidAmount;
  final double remainingAmount;
  final String paymentType; // 'cash' or 'credit'
  final List<SaleItem> items;
  final String notes;

  Sale({
    this.id,
    required this.invoiceNumber,
    required this.date,
    this.customerId,
    this.customerName = 'عميل نقدي',
    required this.totalAmount,
    this.discount = 0.0,
    required this.finalAmount,
    required this.paidAmount,
    required this.remainingAmount,
    required this.paymentType,
    required this.items,
    this.notes = '',
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'invoice_number': invoiceNumber,
      'date': date,
      'customer_id': customerId,
      'customer_name': customerName,
      'total_amount': totalAmount,
      'discount': discount,
      'final_amount': finalAmount,
      'paid_amount': paidAmount,
      'remaining_amount': remainingAmount,
      'payment_type': paymentType,
      'items_json': jsonEncode(items.map((e) => e.toMap()).toList()),
      'notes': notes,
    };
  }

  factory Sale.fromMap(Map<String, dynamic> map) {
    List<SaleItem> itemsList = [];
    if (map['items_json'] != null) {
      try {
        final decoded = jsonDecode(map['items_json']) as List;
        itemsList = decoded.map((e) => SaleItem.fromMap(e)).toList();
      } catch (_) {}
    }

    return Sale(
      id: map['id'] as int?,
      invoiceNumber: map['invoice_number'] ?? '',
      date: map['date'] ?? '',
      customerId: map['customer_id'] as int?,
      customerName: map['customer_name'] ?? 'عميل نقدي',
      totalAmount: (map['total_amount'] as num?)?.toDouble() ?? 0.0,
      discount: (map['discount'] as num?)?.toDouble() ?? 0.0,
      finalAmount: (map['final_amount'] as num?)?.toDouble() ?? 0.0,
      paidAmount: (map['paid_amount'] as num?)?.toDouble() ?? 0.0,
      remainingAmount: (map['remaining_amount'] as num?)?.toDouble() ?? 0.0,
      paymentType: map['payment_type'] ?? 'cash',
      items: itemsList,
      notes: map['notes'] ?? '',
    );
  }
}

class Customer {
  final int? id;
  final String name;
  final String phone;
  final String address;
  final double totalDebt;
  final String notes;

  Customer({
    this.id,
    required this.name,
    this.phone = '',
    this.address = '',
    this.totalDebt = 0.0,
    this.notes = '',
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'address': address,
      'total_debt': totalDebt,
      'notes': notes,
    };
  }

  factory Customer.fromMap(Map<String, dynamic> map) {
    return Customer(
      id: map['id'] as int?,
      name: map['name'] ?? '',
      phone: map['phone'] ?? '',
      address: map['address'] ?? '',
      totalDebt: (map['total_debt'] as num?)?.toDouble() ?? 0.0,
      notes: map['notes'] ?? '',
    );
  }
}

class DebtPayment {
  final int? id;
  final int customerId;
  final String customerName;
  final double amount;
  final String date;
  final String notes;

  DebtPayment({
    this.id,
    required this.customerId,
    required this.customerName,
    required this.amount,
    required this.date,
    this.notes = '',
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'customer_id': customerId,
      'customer_name': customerName,
      'amount': amount,
      'date': date,
      'notes': notes,
    };
  }

  factory DebtPayment.fromMap(Map<String, dynamic> map) {
    return DebtPayment(
      id: map['id'] as int?,
      customerId: (map['customer_id'] as num?)?.toInt() ?? 0,
      customerName: map['customer_name'] ?? '',
      amount: (map['amount'] as num?)?.toDouble() ?? 0.0,
      date: map['date'] ?? '',
      notes: map['notes'] ?? '',
    );
  }
}

class Expense {
  final int? id;
  final String title;
  final String category;
  final double amount;
  final String date;
  final String notes;

  Expense({
    this.id,
    required this.title,
    this.category = 'مصاريف عامة',
    required this.amount,
    required this.date,
    this.notes = '',
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'category': category,
      'amount': amount,
      'date': date,
      'notes': notes,
    };
  }

  factory Expense.fromMap(Map<String, dynamic> map) {
    return Expense(
      id: map['id'] as int?,
      title: map['title'] ?? '',
      category: map['category'] ?? 'مصاريف عامة',
      amount: (map['amount'] as num?)?.toDouble() ?? 0.0,
      date: map['date'] ?? '',
      notes: map['notes'] ?? '',
    );
  }
}

class AppSettings {
  final String storeName;
  final String phone;
  final String address;
  final String currency;
  final String receiptFooter;
  final int receiptWidthMm;

  AppSettings({
    this.storeName = 'متجر ايدينيا التجاري',
    this.phone = '01000000000',
    this.address = 'الفرع الرئيسي',
    this.currency = 'ج.م',
    this.receiptFooter = 'شكراً لتعاملكم معنا ونسعد بزيارتكم دائماً',
    this.receiptWidthMm = 80,
  });

  Map<String, dynamic> toMap() {
    return {
      'store_name': storeName,
      'phone': phone,
      'address': address,
      'currency': currency,
      'receipt_footer': receiptFooter,
      'receipt_width_mm': receiptWidthMm,
    };
  }

  factory AppSettings.fromMap(Map<String, dynamic> map) {
    return AppSettings(
      storeName: map['store_name'] ?? 'متجر ايدينيا التجاري',
      phone: map['phone'] ?? '01000000000',
      address: map['address'] ?? 'الفرع الرئيسي',
      currency: map['currency'] ?? 'ج.م',
      receiptFooter: map['receipt_footer'] ?? 'شكراً لتعاملكم معنا',
      receiptWidthMm: (map['receipt_width_mm'] as num?)?.toInt() ?? 80,
    );
  }
}
