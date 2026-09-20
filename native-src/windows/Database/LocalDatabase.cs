using System;
using System.IO;
using Microsoft.Data.Sqlite;

namespace Idenia.Hisba.Database
{
    /// <summary>
    /// 🗄️ قاعدة بيانات محلية صلبة لنظام ويندوز (SQLite 100% Offline)
    /// </summary>
    public static class LocalDatabase
    {
        private static readonly string DbPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "IdeniaHisba",
            "pos_data.db"
        );

        private static string ConnectionString => $"Data Source={DbPath}";

        public static void InitializeDatabase()
        {
            string dir = Path.GetDirectoryName(DbPath)!;
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);

            using var conn = new SqliteConnection(ConnectionString);
            conn.Open();

            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS Products (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    Name TEXT NOT NULL,
                    Barcode TEXT UNIQUE,
                    Category TEXT,
                    BuyPrice REAL NOT NULL,
                    SellPrice REAL NOT NULL,
                    StockQty REAL NOT NULL,
                    MinAlertQty REAL DEFAULT 5.0,
                    Unit TEXT DEFAULT 'قطعة'
                );

                CREATE TABLE IF NOT EXISTS Invoices (
                    InvoiceNumber TEXT PRIMARY KEY,
                    DateEpoch INTEGER NOT NULL,
                    CustomerName TEXT,
                    CustomerPhone TEXT,
                    Subtotal REAL NOT NULL,
                    Discount REAL NOT NULL,
                    TotalAmount REAL NOT NULL,
                    PaidAmount REAL NOT NULL,
                    RemainingDebt REAL NOT NULL,
                    PaymentType TEXT NOT NULL,
                    ItemsJson TEXT NOT NULL,
                    CashierName TEXT
                );

                CREATE TABLE IF NOT EXISTS Customers (
                    Phone TEXT PRIMARY KEY,
                    FullName TEXT NOT NULL,
                    TotalDebt REAL DEFAULT 0.0,
                    Notes TEXT
                );
            ";
            cmd.ExecuteNonQuery();
        }
    }
}
