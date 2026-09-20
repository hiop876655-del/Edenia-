package com.idenia.hisba.data

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

// 1. Product Entity (الأصناف والمخزن)
@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val barcode: String,
    val category: String,
    val buyPrice: Double,
    val sellPrice: Double,
    val stockQty: Double,
    val minAlertQty: Double = 5.0,
    val unit: String = "قطعة",
    val updatedAt: Long = System.currentTimeMillis()
)

// 2. Invoice Entity (الفواتير والمبيعات)
@Entity(tableName = "invoices")
data class InvoiceEntity(
    @PrimaryKey val invoiceNumber: String,
    val dateEpoch: Long,
    val customerName: String,
    val customerPhone: String,
    val subtotal: Double,
    val discount: Double,
    val totalAmount: Double,
    val paidAmount: Double,
    val remainingDebt: Double,
    val paymentType: String, // "كاش" | "آجل" | "محفظة"
    val itemsJson: String,
    val cashierName: String
)

// 3. Customer Debt Entity (العملاء والديون والآجل)
@Entity(tableName = "customers")
data class CustomerEntity(
    @PrimaryKey val phone: String,
    val fullName: String,
    val totalDebt: Double,
    val notes: String = "",
    val lastTransactionEpoch: Long = System.currentTimeMillis()
)

// DAOs
@Dao
interface PosDao {
    @Query("SELECT * FROM products ORDER BY name ASC")
    fun getAllProducts(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE barcode = :barcode LIMIT 1")
    suspend fun getProductByBarcode(barcode: String): ProductEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: ProductEntity): Long

    @Update
    suspend fun updateProduct(product: ProductEntity)

    @Delete
    suspend fun deleteProduct(product: ProductEntity)

    // Invoices
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertInvoice(invoice: InvoiceEntity)

    @Query("SELECT * FROM invoices ORDER BY dateEpoch DESC")
    fun getAllInvoices(): Flow<List<InvoiceEntity>>

    // Stock deduction
    @Query("UPDATE products SET stockQty = stockQty - :qty WHERE id = :id")
    suspend fun deductStock(id: Long, qty: Double)

    // Customer Debt
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateCustomer(customer: CustomerEntity)

    @Query("SELECT * FROM customers WHERE phone = :phone LIMIT 1")
    suspend fun getCustomerByPhone(phone: String): CustomerEntity?

    @Query("SELECT * FROM customers WHERE totalDebt > 0 ORDER BY totalDebt DESC")
    fun getIndebtedCustomers(): Flow<List<CustomerEntity>>
}

// Room Database
@Database(
    entities = [ProductEntity::class, InvoiceEntity::class, CustomerEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun posDao(): PosDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "idenia_hisba_local.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
