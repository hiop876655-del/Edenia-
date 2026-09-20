import React, { useState, useEffect } from 'react';
import { db } from './services/db';
import { api } from './services/api';
import { licenseManager } from './services/license';
import { UserAccount, LicenseState, ScreenType, Sale, Product } from './types';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { MobileMoreDrawer } from './components/MobileMoreDrawer';

// Screens
import { SplashScreen } from './screens/SplashScreen';
import { HomeScreen } from './screens/HomeScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { LoginScreen } from './screens/LoginScreen';
import { LicenseActivationScreen } from './screens/LicenseActivationScreen';
import { ExpiredScreen } from './screens/ExpiredScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { SalesScreen } from './screens/SalesScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { DebtsScreen } from './screens/DebtsScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { BackupScreen } from './screens/BackupScreen';
import { AccountScreen } from './screens/AccountScreen';
import { UpdatesScreen } from './screens/UpdatesScreen';
import { AdminDashboardScreen } from './screens/AdminDashboardScreen';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('splash');
  const [user, setUser] = useState<UserAccount | null>(null);
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Edit item pass-through
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Modals
  const [viewingReceiptSale, setViewingReceiptSale] = useState<Sale | null>(null);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Desktop Native POS Keyboard Shortcuts (F1 - F7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentScreen('dashboard');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentScreen('sales');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCurrentScreen('inventory');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setCurrentScreen('products');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setCurrentScreen('customers');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setCurrentScreen('debts');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setCurrentScreen('reports');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize theme & load local session
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('idenia_theme');
      if (savedTheme === 'dark') {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    } catch {
      // Ignore storage errors on restricted webview environments
    }

    const localUser = db.getUser();
    const localLicense = db.getLicense();
    setUser(localUser);
    setLicense(localLicense);
  }, []);

  // Periodic License & Cloud Tamper/Freeze/Expiration verification
  useEffect(() => {
    if (
      !user ||
      user.role === 'admin' ||
      user.phone === '01121097822' ||
      ['splash', 'home', 'login', 'register', 'activation', 'expired', 'admin'].includes(currentScreen)
    ) {
      return;
    }

    // Local time verification check
    const localCheck = () => {
      const check = licenseManager.periodicCheck();
      if (!check.isValid && check.reason === 'expired') {
        setCurrentScreen('expired');
      }
    };

    // Live Cloud Status Verification (Locks immediately if admin froze/expired or deleted merchant)
    const syncCloudStatus = async () => {
      try {
        const statusRes = await api.checkMerchantStatus(user.phone);
        if (statusRes.exists === false || statusRes.status === 'deleted') {
          // Merchant deleted by admin -> Logout and lock immediately
          db.saveUser({ ...user, isLoggedIn: false });
          db.saveLicense({ ...(license || {}), isValid: false, isExpired: true, durationDays: 0, expiresAt: 0 } as any);
          setUser(null);
          setLicense(null);
          setCurrentScreen('home');
          return;
        }

        if (statusRes.status === 'frozen') {
          // Merchant frozen by admin -> Lock immediately
          db.saveLicense({ ...(license || {}), isValid: false, isExpired: true, status: 'frozen' } as any);
          setCurrentScreen('activation');
          return;
        }

        if (statusRes.status === 'expired') {
          // Merchant expired -> Go to expired screen
          db.saveLicense({ ...(license || {}), isValid: false, isExpired: true } as any);
          setCurrentScreen('expired');
          return;
        }

        if (statusRes.status === 'active' && statusRes.subscriptionExpiresAt > Date.now()) {
          // Sync expiry if admin extended
          if (license && license.expiresAt !== statusRes.subscriptionExpiresAt) {
            const updatedLicense: LicenseState = {
              ...license,
              expiresAt: statusRes.subscriptionExpiresAt,
              durationDays: statusRes.subscriptionDays || license.durationDays,
              isValid: true,
              isExpired: false
            };
            db.saveLicense(updatedLicense);
            setLicense(updatedLicense);
          }
        }
      } catch (err) {
        // Offline -> App continues to work locally based on secure local anchor time
      }
    };

    // Check immediately on mount/screen change
    localCheck();
    syncCloudStatus();

    // Run periodic cloud check every 20 seconds
    const interval = setInterval(() => {
      localCheck();
      syncCloudStatus();
    }, 20000);

    // Re-check immediately when browser/device connects to internet
    const handleOnline = () => {
      syncCloudStatus();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [license, user, currentScreen]);

  // Keyboard Shortcuts (F1 - F7) for Windows Desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['splash', 'home', 'login', 'register', 'activation', 'expired', 'admin'].includes(currentScreen)) {
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentScreen('dashboard');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentScreen('sales');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCurrentScreen('inventory');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setCurrentScreen('products');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setCurrentScreen('customers');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setCurrentScreen('debts');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setCurrentScreen('reports');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen]);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('idenia_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('idenia_theme', 'light');
      }
      return next;
    });
  };

  const handleLogout = () => {
    const currentUser = db.getUser();
    if (currentUser) {
      db.saveUser({ ...currentUser, isLoggedIn: false });
    }
    setUser(null);
    setCurrentScreen('home');
  };

  const handleLoginSuccess = (account: UserAccount) => {
    setUser(account);

    // If Master Admin
    if (account.role === 'admin' || account.phone === '01121097822') {
      setCurrentScreen('admin');
      return;
    }

    const lic = db.getLicense();
    if (!lic || !lic.isValid) {
      setCurrentScreen('activation');
    } else {
      setLicense(lic);
      const days = licenseManager.getRemainingDays(lic);
      if (days <= 0) {
        setCurrentScreen('expired');
      } else {
        setCurrentScreen('dashboard');
      }
    }
  };

  const handleActivationSuccess = (lic: LicenseState) => {
    setLicense(lic);
    setCurrentScreen('dashboard');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onComplete={screen => setCurrentScreen(screen)} />;

      case 'home':
        return (
          <HomeScreen
            user={user}
            license={license}
            darkMode={isDarkMode}
            onToggleDarkMode={toggleTheme}
            onNavigate={setCurrentScreen}
            onNavigateToLogin={() => setCurrentScreen('login')}
            onNavigateToRegister={() => setCurrentScreen('register')}
          />
        );

      case 'login':
        return (
          <LoginScreen
            onSuccess={handleLoginSuccess}
            onNavigateToRegister={() => setCurrentScreen('register')}
            onNavigateToHome={() => setCurrentScreen('home')}
          />
        );

      case 'register':
        return (
          <RegisterScreen
            onSuccess={account => {
              setUser(account);
              setCurrentScreen('activation');
            }}
            onNavigateToLogin={() => setCurrentScreen('login')}
            onNavigateToHome={() => setCurrentScreen('home')}
          />
        );

      case 'activation':
        return (
          <LicenseActivationScreen
            user={user}
            onSuccess={handleActivationSuccess}
            onLogout={handleLogout}
            onNavigateToHome={() => setCurrentScreen('home')}
          />
        );

      case 'expired':
        return (
          <ExpiredScreen
            user={user}
            onRenewSuccess={handleActivationSuccess}
            onLogout={handleLogout}
          />
        );

      case 'admin':
        return (
          <AdminDashboardScreen
            onNavigate={setCurrentScreen}
            onLogout={handleLogout}
          />
        );

      case 'dashboard':
        return (
          <DashboardScreen
            onNavigate={setCurrentScreen}
            onOpenNewSale={() => setCurrentScreen('sales')}
            onOpenAddProduct={() => {
              setProductToEdit(null);
              setCurrentScreen('products');
            }}
            onOpenAddCustomer={() => setCurrentScreen('customers')}
            onOpenRecordPayment={() => setCurrentScreen('debts')}
            onViewInvoice={sale => setViewingReceiptSale(sale)}
            onOpenFlutterExport={() => setIsFlutterModalOpen(true)}
          />
        );

      case 'inventory':
        return (
          <InventoryScreen
            onOpenAddProduct={() => {
              setProductToEdit(null);
              setCurrentScreen('products');
            }}
            onOpenEditProduct={prod => {
              setProductToEdit(prod);
              setCurrentScreen('products');
            }}
          />
        );

      case 'products':
        return (
          <ProductsScreen
            editProductItem={productToEdit}
            onClearEditItem={() => setProductToEdit(null)}
          />
        );

      case 'sales':
        return (
          <SalesScreen
            onShowReceipt={sale => setViewingReceiptSale(sale)}
          />
        );

      case 'customers':
        return <CustomersScreen />;

      case 'debts':
        return <DebtsScreen />;

      case 'reports':
        return <ReportsScreen />;

      case 'settings':
        return (
          <SettingsScreen
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
          />
        );

      case 'backup':
        return <BackupScreen />;

      case 'account':
        return (
          <AccountScreen
            onRenewLicense={() => setCurrentScreen('activation')}
            onLogout={handleLogout}
          />
        );

      case 'updates':
        return (
          <UpdatesScreen
            onNavigateBack={() => setCurrentScreen('dashboard')}
            onNavigate={setCurrentScreen}
          />
        );

      default:
        return (
          <DashboardScreen
            onNavigate={setCurrentScreen}
            onOpenNewSale={() => setCurrentScreen('sales')}
            onOpenAddProduct={() => setCurrentScreen('products')}
            onOpenAddCustomer={() => setCurrentScreen('customers')}
            onOpenRecordPayment={() => setCurrentScreen('debts')}
            onViewInvoice={sale => setViewingReceiptSale(sale)}
          />
        );
    }
  };

  const isAuthOrSplash = [
    'splash',
    'home',
    'login',
    'register',
    'activation',
    'expired',
    'admin'
  ].includes(currentScreen);

  return (
    <div className={`min-h-screen bg-[#F8F9FA] dark:bg-[#121212] text-[#212121] dark:text-gray-100 font-sans ${isDarkMode ? 'dark' : ''}`} dir="rtl">
      {!isAuthOrSplash && (
        <Header
          currentScreen={currentScreen}
          user={user}
          license={license}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onNavigate={setCurrentScreen}
          onLogout={handleLogout}
        />
      )}

      <div className="flex h-full">
        {!isAuthOrSplash && (
          <div className="hidden md:block">
            <Sidebar
              currentScreen={currentScreen}
              onNavigate={setCurrentScreen}
            />
          </div>
        )}

        <main className={`flex-1 overflow-y-auto ${!isAuthOrSplash ? 'pb-20 md:pb-6' : ''}`}>
          {renderCurrentScreen()}
        </main>
      </div>

      {!isAuthOrSplash && (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          onOpenMore={() => setIsMobileMoreOpen(true)}
        />
      )}

      {/* Global Modals */}
      <ThermalReceiptModal
        sale={viewingReceiptSale}
        settings={db.getSettings()}
        isOpen={!!viewingReceiptSale}
        onClose={() => setViewingReceiptSale(null)}
      />

      <MobileMoreDrawer
        isOpen={isMobileMoreOpen}
        onClose={() => setIsMobileMoreOpen(false)}
        onNavigate={setCurrentScreen}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
