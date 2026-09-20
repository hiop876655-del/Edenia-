import 'dart:convert';
import 'package:crypto/crypto.dart';

class Product {
  final int? id;
  final String barcode;
  final String name;
  final String category;
  final double costPrice;
  final double sellingPrice;
  final double stockQuantity;
  final String unit;
  final double minStockAlert;

  Product({
    this.id,
    required this.barcode,
    required this.name,
    required this.category,
    required this.costPrice,
    required this.sellingPrice,
    required this.stockQuantity,
    this.unit = 'قطعة',
    this.minStockAlert = 5,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'barcode': barcode,
      'name': name,
      'category': category,
      'cost_price': costPrice,
      'selling_price': sellingPrice,
      'stock_quantity': stockQuantity,
      'unit': unit,
      'min_stock_alert': minStockAlert,
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
      stockQuantity: (map['stock_quantity'] as num?)?.toDouble() ?? 0.0,
      unit: map['unit'] ?? 'قطعة',
      minStockAlert: (map['min_stock_alert'] as num?)?.toDouble() ?? 5.0,
    );
  }
}

class InvoiceItem {
  final int? id;
  final int? invoiceId;
  final int? productId;
  final String productName;
  final String barcode;
  double quantity;
  double unitPrice;
  double costPrice;

  InvoiceItem({
    this.id,
    this.invoiceId,
    this.productId,
    required this.productName,
    required this.barcode,
    required this.quantity,
    required this.unitPrice,
    required this.costPrice,
  });

  double get subtotal => quantity * unitPrice;
  double get totalProfit => (unitPrice - costPrice) * quantity;

  Map<String, dynamic> toMap(int parentInvoiceId) {
    return {
      'id': id,
      'invoice_id': parentInvoiceId,
      'product_id': productId,
      'product_name': productName,
      'barcode': barcode,
      'quantity': quantity,
      'unit_price': unitPrice,
      'cost_price': costPrice,
      'subtotal': subtotal,
    };
  }

  factory InvoiceItem.fromMap(Map<String, dynamic> map) {
    return InvoiceItem(
      id: map['id'] as int?,
      invoiceId: map['invoice_id'] as int?,
      productId: map['product_id'] as int?,
      productName: map['product_name'] ?? '',
      barcode: map['barcode'] ?? '',
      quantity: (map['quantity'] as num?)?.toDouble() ?? 1.0,
      unitPrice: (map['unit_price'] as num?)?.toDouble() ?? 0.0,
      costPrice: (map['cost_price'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class Invoice {
  final int? id;
  final String invoiceNumber;
  final String dateTime;
  final String customerName;
  final String paymentMethod; // 'cash', 'credit', 'card'
  final double totalAmount;
  final double discount;
  final double finalAmount;
  final double paidAmount;
  final double remainingAmount;
  final List<InvoiceItem> items;

  Invoice({
    this.id,
    required this.invoiceNumber,
    required this.dateTime,
    this.customerName = 'عميل نقدي',
    this.paymentMethod = 'cash',
    required this.totalAmount,
    this.discount = 0.0,
    required this.finalAmount,
    required this.paidAmount,
    required this.remainingAmount,
    this.items = const [],
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'invoice_number': invoiceNumber,
      'date_time': dateTime,
      'customer_name': customerName,
      'payment_method': paymentMethod,
      'total_amount': totalAmount,
      'discount': discount,
      'final_amount': finalAmount,
      'paid_amount': paidAmount,
      'remaining_amount': remainingAmount,
    };
  }

  factory Invoice.fromMap(Map<String, dynamic> map, [List<InvoiceItem> itemsList = const []]) {
    return Invoice(
      id: map['id'] as int?,
      invoiceNumber: map['invoice_number'] ?? '',
      dateTime: map['date_time'] ?? '',
      customerName: map['customer_name'] ?? 'عميل نقدي',
      paymentMethod: map['payment_method'] ?? 'cash',
      totalAmount: (map['total_amount'] as num?)?.toDouble() ?? 0.0,
      discount: (map['discount'] as num?)?.toDouble() ?? 0.0,
      finalAmount: (map['final_amount'] as num?)?.toDouble() ?? 0.0,
      paidAmount: (map['paid_amount'] as num?)?.toDouble() ?? 0.0,
      remainingAmount: (map['remaining_amount'] as num?)?.toDouble() ?? 0.0,
      items: itemsList,
    );
  }
}

class Customer {
  final int? id;
  final String name;
  final String phone;
  final double balance; // موجب = عليه دين، سالب = له رصيد
  final double creditLimit;

  Customer({
    this.id,
    required this.name,
    required this.phone,
    this.balance = 0.0,
    this.creditLimit = 5000.0,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'balance': balance,
      'credit_limit': creditLimit,
    };
  }

  factory Customer.fromMap(Map<String, dynamic> map) {
    return Customer(
      id: map['id'] as int?,
      name: map['name'] ?? '',
      phone: map['phone'] ?? '',
      balance: (map['balance'] as num?)?.toDouble() ?? 0.0,
      creditLimit: (map['credit_limit'] as num?)?.toDouble() ?? 5000.0,
    );
  }
}
