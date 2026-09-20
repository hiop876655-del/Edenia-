package com.idenia.hisba

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.idenia.hisba.data.AppDatabase
import com.idenia.hisba.security.LicenseSecurityEngine
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var securityEngine: LicenseSecurityEngine
    private lateinit var database: AppDatabase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        securityEngine = LicenseSecurityEngine(this)
        database = AppDatabase.getDatabase(this)

        setContent {
            MaterialTheme {
                MainAppScreen(securityEngine, database)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppScreen(
    securityEngine: LicenseSecurityEngine,
    database: AppDatabase
) {
    val coroutineScope = rememberCoroutineScope()
    var licenseState by remember { mutableStateOf<LicenseSecurityEngine.LicenseState>(LicenseSecurityEngine.LicenseState.NotActivated) }
    var activationCodeInput by remember { mutableStateOf("") }
    var phoneInput by remember { mutableStateOf("") }
    var shopInput by remember { mutableStateOf("") }
    var isActivating by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        licenseState = securityEngine.verifyLocalOfflineLicense()
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFFF8F9FA)
    ) {
        when (val state = licenseState) {
            is LicenseSecurityEngine.LicenseState.Active -> {
                // شاشة المبيعات والكاشير الأصلية (Native POS)
                PosMainDashboard(
                    licenseCode = state.code,
                    remainingDays = state.remainingDays,
                    database = database
                )
            }
            is LicenseSecurityEngine.LicenseState.Tampered -> {
                // شاشة التلاعب بالوقت أو الجهاز
                TamperedWarningScreen(reason = state.reason)
            }
            is LicenseSecurityEngine.LicenseState.Expired,
            is LicenseSecurityEngine.LicenseState.NotActivated -> {
                // شاشة إدخال كود التفعيل والحرق لمرة واحدة
                ActivationFormScreen(
                    codeInput = activationCodeInput,
                    onCodeChange = { activationCodeInput = it },
                    phoneInput = phoneInput,
                    onPhoneChange = { phoneInput = it },
                    shopInput = shopInput,
                    onShopChange = { shopInput = it },
                    isLoading = isActivating,
                    errorMessage = errorMessage,
                    onActivate = {
                        coroutineScope.launch {
                            isActivating = true
                            errorMessage = null
                            val res = securityEngine.activateLicenseCode(
                                code = activationCodeInput,
                                phone = phoneInput,
                                shopName = shopInput,
                                fullName = shopInput
                            )
                            isActivating = false
                            when (res) {
                                is LicenseSecurityEngine.ActivationResult.Success -> {
                                    licenseState = securityEngine.verifyLocalOfflineLicense()
                                }
                                is Licenseシル
                                is LicenseSecurityEngine.ActivationResult.Error -> {
                                    errorMessage = res.message
                                }
                            }
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun PosMainDashboard(
    licenseCode: String,
    remainingDays: Long,
    database: AppDatabase
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.End
    ) {
        // Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF2E7D32), RoundedCornerShape(16.dp))
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = Color.White.copy(alpha = 0.2f),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = "متبقي $remainingDays يوم",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "برنامج ايدينيا - حِسبة (أندرويد أصلي)",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp
                )
                Text(
                    text = "نظام المبيعات ونقاط البيع المباشر (100% Offline)",
                    color = Color(0xFFC8E6C9),
                    fontSize = 11.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Quick Stats
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.End) {
                    Text("مبيعات اليوم", color = Color.Gray, fontSize = 12.sp)
                    Text("0.00 ج.م", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF2E7D32))
                }
            }
            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.End) {
                    Text("الفواتير", color = Color.Gray, fontSize = 12.sp)
                    Text("0 فاتورة", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1565C0))
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Actions
        Button(
            onClick = { /* Open Cashier */ },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.Default.ShoppingCart, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("فتح شاشة الكاشير وبيع فوري", fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedButton(
            onClick = { /* Add Product */ },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.Default.Inventory, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("إدارة المخزن والأصناف والباركود", fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun ActivationFormScreen(
    codeInput: String,
    onCodeChange: (String) -> Unit,
    phoneInput: String,
    onPhoneChange: (String) -> Unit,
    shopInput: String,
    onShopChange: (String) -> Unit,
    isLoading: Boolean,
    errorMessage: String?,
    onActivate: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "تفعيل برنامج ايدينيا - حِسبة",
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp,
                    color = Color(0xFF1E1E1E)
                )
                Text(
                    text = "أدخل كود الترخيص المسلم لك من الإدارة لبدء الاستخدام",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(20.dp))

                OutlinedTextField(
                    value = shopInput,
                    onValueChange = onShopChange,
                    label = { Text("اسم المحل / النشاط") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = phoneInput,
                    onValueChange = onPhoneChange,
                    label = { Text("رقم هاتف المحل") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = codeInput,
                    onValueChange = onCodeChange,
                    label = { Text("كود الترخيص (XXXX-XXXX-XXXX-XXXX)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                if (errorMessage != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = errorMessage,
                        color = Color.Red,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = onActivate,
                    enabled = !isLoading && codeInput.isNotBlank() && phoneInput.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    } else {
                        Text("تفعيل البرنامج الآن", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun TamperedWarningScreen(reason: String) {
    Box(
        modifier = Modifier.fillMaxSize().padding(24.dp).background(Color(0xFFFFEBEE)),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Warning, contentDescription = null, tint = Color.Red, modifier = Modifier.size(64.dp))
            Spacer(modifier = Modifier.height(16.dp))
            Text("تم إيقاف البرنامج لأسباب أمنية", fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color.Red)
            Spacer(modifier = Modifier.height(8.dp))
            Text(reason, fontSize = 13.sp, color = Color.DarkGray, textAlign = TextAlign.Center)
        }
    }
}
