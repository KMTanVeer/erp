import React, { useState, useEffect } from 'react';
import { onSnapshot, collection, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db, auth, seedDatabase, logActivity, setDoc } from './firebase';
import { onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { UserProfile, Customer, Product, Category, Supplier, ERPDocument, ActivityLog, BackupLog } from './types';

// Component Imports
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CustomerCRM from './components/CustomerCRM';
import InventoryManager from './components/InventoryManager';
import QuotationInvoiceWorkflow from './components/QuotationInvoiceWorkflow';
import PDFViewer from './components/PDFViewer';
import ReportsPanel from './components/ReportsPanel';
import UserManager from './components/UserManager';
import WarrantyRMA from './components/WarrantyRMA';
import CompanySettingsPanel from './components/CompanySettingsPanel';

import { Menu, Building2, Sparkles, LogOut, CheckCircle, Bell, Search, X, Command, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<ERPDocument | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(localStorage.getItem('inovexa_offline_mode') === 'true');

  // UI preferences and global search states
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState<boolean>(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  
  // Real-time synchronization collections
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [documents, setDocuments] = useState<ERPDocument[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [backups, setBackups] = useState<BackupLog[]>([]);

  // Low stock alerts notification state
  const lowStockAlerts = React.useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  // Global Search results lookup
  const searchResults = React.useMemo(() => {
    if (!globalSearchQuery.trim()) return { customers: [], products: [], documents: [] };
    const q = globalSearchQuery.toLowerCase();
    
    const matchedCusts = customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.company.toLowerCase().includes(q) || 
      c.email.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedProds = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) || 
      (p.warehouseLocation && p.warehouseLocation.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedDocs = documents.filter(d => 
      d.id.toLowerCase().includes(q) || 
      d.customerName.toLowerCase().includes(q) || 
      d.status.toLowerCase().includes(q)
    ).slice(0, 5);

    return {
      customers: matchedCusts,
      products: matchedProds,
      documents: matchedDocs
    };
  }, [globalSearchQuery, customers, products, documents]);

  // Restore authentication from localStorage and Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      const savedUser = localStorage.getItem('inovexa_user');
      if (fbUser && savedUser) {
        try {
          const parsed = JSON.parse(savedUser) as UserProfile;
          setCurrentUser({
            ...parsed,
            uid: fbUser.uid
          });
        } catch (e) {
          localStorage.removeItem('inovexa_user');
          setCurrentUser(null);
        }
      } else if (!fbUser && savedUser) {
        // Firebase auth expired/cleared but localStorage remains, sign in anonymously
        try {
          const userCred = await signInAnonymously(auth);
          const parsed = JSON.parse(savedUser) as UserProfile;
          setCurrentUser({
            ...parsed,
            uid: userCred.user.uid
          });
        } catch (err) {
          console.error("Failed to silently sign in anonymously:", err);
          localStorage.removeItem('inovexa_user');
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, []);

  // Auth user changes persistence
  const handleSignIn = async (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('inovexa_user', JSON.stringify(user));
    try {
      // Upsert user details to users directory on Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: Timestamp.now()
      }, { merge: true });

      // Log successful session audit trail
      await logActivity(
        user.uid,
        user.name,
        user.email,
        "User Sign In",
        `Authenticated successfully under administrative security role: [${user.role.toUpperCase()}].`
      );
    } catch (err) {
      console.error("Error committing user profile:", err);
    }
  };

  const handleSignOut = async () => {
    if (currentUser) {
      try {
        await logActivity(
          currentUser.uid,
          currentUser.name,
          currentUser.email,
          "User Sign Out",
          "Terminated active ERP session session safely."
        );
      } catch (err) {
        console.error(err);
      }
    }
    localStorage.removeItem('inovexa_user');
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out from Firebase Auth:", err);
    }
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Wire Firestore listeners when logged in
  useEffect(() => {
    if (!currentUser) return;

    const loadOfflineData = () => {
      const offlineUsers = localStorage.getItem('inovexa_local_users');
      const offlineCustomers = localStorage.getItem('inovexa_local_customers');
      const offlineProducts = localStorage.getItem('inovexa_local_products');
      const offlineCategories = localStorage.getItem('inovexa_local_categories');
      const offlineSuppliers = localStorage.getItem('inovexa_local_suppliers');
      const offlineDocuments = localStorage.getItem('inovexa_local_documents');
      const offlineLogs = localStorage.getItem('inovexa_local_activity_logs');
      const offlineBackups = localStorage.getItem('inovexa_local_backups');

      if (offlineUsers) setUsers(JSON.parse(offlineUsers));
      if (offlineCustomers) setCustomers(JSON.parse(offlineCustomers));
      if (offlineProducts) setProducts(JSON.parse(offlineProducts));
      if (offlineCategories) setCategories(JSON.parse(offlineCategories));
      if (offlineSuppliers) setSuppliers(JSON.parse(offlineSuppliers));
      if (offlineDocuments) setDocuments(JSON.parse(offlineDocuments));
      if (offlineLogs) setActivityLogs(JSON.parse(offlineLogs));
      if (offlineBackups) setBackups(JSON.parse(offlineBackups));
    };

    const handleLocalWrite = () => {
      loadOfflineData();
    };

    if (isOffline) {
      loadOfflineData();
      window.addEventListener('inovexa_local_write', handleLocalWrite);
      window.addEventListener('storage', handleLocalWrite);
      return () => {
        window.removeEventListener('inovexa_local_write', handleLocalWrite);
        window.removeEventListener('storage', handleLocalWrite);
      };
    }

    const handleListenerError = (err: any, source: string) => {
      console.warn(`Firestore listener for ${source} failed or was denied access. Swapping to secure Sandbox Mode:`, err);
      localStorage.setItem('inovexa_offline_mode', 'true');
      setIsOffline(true);
      loadOfflineData();
    };

    // 1. Users real-time listener
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      setUsers(list);
    }, (err) => handleListenerError(err, 'users'));

    // 2. Customers real-time listener
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      const list: Customer[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({ ...data, id: d.id } as Customer);
      });
      setCustomers(list);
    }, (err) => handleListenerError(err, 'customers'));

    // 3. Products real-time listener
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const list: Product[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({ ...data, id: d.id } as Product);
      });
      setProducts(list);
    }, (err) => handleListenerError(err, 'products'));

    // 4. Categories real-time listener
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      const list: Category[] = [];
      snap.forEach(d => list.push(d.data() as Category));
      setCategories(list);
    }, (err) => handleListenerError(err, 'categories'));

    // 5. Suppliers real-time listener
    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snap) => {
      const list: Supplier[] = [];
      snap.forEach(d => list.push(d.data() as Supplier));
      setSuppliers(list);
    }, (err) => handleListenerError(err, 'suppliers'));

    // 6. Documents real-time listener
    const unsubDocs = onSnapshot(collection(db, 'documents'), (snap) => {
      const list: ERPDocument[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({ ...data, id: d.id } as ERPDocument);
      });
      setDocuments(list);
    }, (err) => handleListenerError(err, 'documents'));

    // 7. Activity Logs real-time listener (ordered by timestamp)
    const qLogs = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      const list: ActivityLog[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({ ...data, id: d.id } as ActivityLog);
      });
      setActivityLogs(list);
    }, (err) => handleListenerError(err, 'activity_logs'));

    // 8. Backups real-time listener
    const unsubBackups = onSnapshot(collection(db, 'backups'), (snap) => {
      const list: BackupLog[] = [];
      snap.forEach(d => list.push(d.data() as BackupLog));
      setBackups(list);
    }, (err) => handleListenerError(err, 'backups'));

    return () => {
      unsubUsers();
      unsubCustomers();
      unsubProducts();
      unsubCategories();
      unsubSuppliers();
      unsubDocs();
      unsubLogs();
      unsubBackups();
    };
  }, [currentUser, isOffline]);

  // Automatic high-fidelity database seeding when products array is empty on login
  useEffect(() => {
    if (!currentUser) return;
    
    // Check after brief delay to avoid double seeding or racing on empty lists
    const seedTimer = setTimeout(() => {
      if (products.length === 0) {
        console.log("Empty database detected. Automating corporate high-fidelity mock data seed...");
        seedDatabase(currentUser);
      }
    }, 1200);

    return () => clearTimeout(seedTimer);
  }, [currentUser, products.length]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setGlobalSearchOpen(prev => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setMobileSidebarOpen(prev => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setActiveTab('settings');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Seeding trigger button in App Header
  const handleForceSeed = async () => {
    if (!currentUser) return;
    const confirmed = window.confirm("Are you sure you want to run high-fidelity database seeding? This will overwrite or populate empty collections with mock data.");
    if (!confirmed) return;
    const success = await seedDatabase(currentUser);
    if (success) {
      alert("Database successfully populated with high-fidelity Enterprise ERP & CRM data! Real-time state synchronized.");
    }
  };

  // Show premium loading screen when restoring session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-mono tracking-wider animate-pulse">RESTORING ERP IDENTITY SESSION...</p>
        </div>
      </div>
    );
  }

  // Render auth screen if not logged in
  if (!currentUser) {
    return <AuthScreen onSignIn={handleSignIn} />;
  }

  // Render main layout
  return (
    <div className={`flex h-screen overflow-hidden bg-[#f3f4f6] ${darkMode ? 'dark-mode' : ''} ${compactMode ? 'compact-layout' : ''}`} id="app-root-layout">
      
      {/* Interactive Responsive Sidebar */}
      <Sidebar 
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="bg-white border-b border-gray-200 h-16 flex-shrink-0 flex items-center justify-between px-6 shadow-sm z-10 no-print">
          <div className="flex items-center space-x-3">
            {/* Mobile Sidebar toggle */}
            <button
              id="btn-toggle-mobile-menu"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
              <span className="text-[11px] text-gray-400 font-mono tracking-wider font-bold">
                {isOffline ? 'LOCAL SANDBOX MODE (ZERO FRICTION)' : 'LIVE FIREBASE INTERFACE CONNECTED'}
              </span>
            </div>

            {/* Global Search Bar trigger */}
            <div 
              id="header-global-search-trigger"
              onClick={() => setGlobalSearchOpen(true)}
              className="hidden md:flex items-center space-x-2 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl px-3 py-1.5 cursor-pointer transition-colors shadow-[inset_1px_1px_2px_rgba(0,0,0,0.03)]"
            >
              <Search className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-[11px] text-gray-400 font-medium">Search ERP CRM...</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[9px] text-gray-400 font-mono shadow-xs">Alt+S</kbd>
            </div>
          </div>

          {/* Topbar Actions */}
          <div className="flex items-center space-x-4">
            
            {/* Seed Trigger Button */}
            <button
              id="btn-force-seed-data"
              onClick={handleForceSeed}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-150 rounded-xl text-[10px] font-black transition-all flex items-center space-x-1 shadow-sm"
              title="Populate missing tables with high fidelity data"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Seed Demo Data</span>
            </button>

             {/* Notifications */}
            <div className="relative" id="notifications-wrapper">
              <button 
                id="btn-notif-alerts"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`p-2 rounded-full relative transition-colors ${
                  notificationsOpen ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title={`${lowStockAlerts.length} Stock alerts active`}
              >
                <Bell className="h-5 w-5" />
                {lowStockAlerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-bounce" />
                )}
              </button>

              {notificationsOpen && (
                <div 
                  id="notifications-dropdown"
                  className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50 transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100">
                    <div className="flex items-center space-x-1.5">
                      <Bell className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-xs font-bold text-gray-800">System Notifications</h3>
                    </div>
                    <span className="text-[10px] bg-red-50 text-red-600 font-extrabold px-2 py-0.5 rounded-full">
                      {lowStockAlerts.length} Critical
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {lowStockAlerts.length === 0 ? (
                      <div className="p-6 text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-gray-700">All Systems Nominal</p>
                        <p className="text-[10px] text-gray-400 mt-1">No low stock items or alerts detected.</p>
                      </div>
                    ) : (
                      lowStockAlerts.map(product => (
                        <div 
                          key={product.id} 
                          className="p-3 hover:bg-gray-50 transition-colors flex items-start space-x-3 cursor-pointer"
                          onClick={() => {
                            setActiveTab('inventory');
                            setNotificationsOpen(false);
                          }}
                        >
                          <div className="p-2 rounded-xl bg-red-50 text-red-500 mt-0.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-extrabold text-gray-800 truncate">{product.name}</p>
                              <span className="text-[9px] font-mono text-gray-400 font-bold">{product.sku}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              Warehouse Shelf: <span className="font-semibold text-gray-700">{product.warehouseLocation || 'N/A'}</span>
                            </p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] text-red-600 font-black">
                                Stock: {product.stock} units
                              </span>
                              <span className="text-[10px] text-gray-400">
                                Min threshold: {product.minStock}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="px-4 pt-2 border-t border-gray-100 text-center">
                    <button 
                      id="btn-notifications-view-all"
                      onClick={() => {
                        setActiveTab('inventory');
                        setNotificationsOpen(false);
                      }}
                      className="w-full py-1.5 text-[10px] text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
                    >
                      Manage Inventory & Stock Thresholds
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick user email */}
            <div className="hidden md:block text-right">
              <p className="text-xs font-bold text-gray-800 leading-none">{currentUser.name}</p>
              <span className="text-[9px] text-indigo-600 font-mono font-bold tracking-wider block mt-0.5">
                {currentUser.role.toUpperCase()}
              </span>
            </div>

          </div>
        </header>

        {/* Dynamic Inner Panel Scrolling Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#f3f4f6]">
          {isOffline && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold leading-relaxed shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
              <div className="flex items-start space-x-3">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800 mt-0.5">
                  <Sparkles className="h-4 w-4 text-amber-700 animate-pulse" />
                </span>
                <div>
                  <p className="font-extrabold text-amber-900 text-sm">Offline Sandbox Mode Active</p>
                  <p className="text-amber-700 mt-0.5 text-[11px]">
                    Your database operations are safely running in your browser's local sandbox storage because Firebase Email/Password Auth is disabled. 
                    The ERP has been automatically pre-seeded with enterprise IT hardware & networking products, quotation workflows, and CRM customers.
                  </p>
                </div>
              </div>
              <button
                id="btn-switch-firebase"
                onClick={() => {
                  const confirmed = window.confirm("Enable Firebase connection? If you do, please ensure you've enabled the Email/Password sign-in provider in your Firebase console first, otherwise you may receive operation-not-allowed errors.");
                  if (confirmed) {
                    localStorage.setItem('inovexa_offline_mode', 'false');
                    setIsOffline(false);
                    window.location.reload();
                  }
                }}
                className="flex-shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-extrabold transition-all shadow-xs cursor-pointer"
              >
                Reconnect Firebase
              </button>
            </div>
          )}
          {activeTab === 'dashboard' && (
            <Dashboard 
              customers={customers}
              products={products}
              documents={documents}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'crm' && (
            <CustomerCRM 
              customers={customers}
              users={users}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryManager 
              products={products}
              categories={categories}
              suppliers={suppliers}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'documents' && (
            <QuotationInvoiceWorkflow 
              documents={documents}
              customers={customers}
              products={products}
              currentUser={currentUser}
              onViewPDF={setSelectedPDF}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPanel 
              documents={documents}
              backups={backups}
              products={products}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'users' && currentUser.role === 'super_admin' && (
            <UserManager 
              users={users}
              activityLogs={activityLogs}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'warranty' && (
            <WarrantyRMA 
              products={products}
              customers={customers}
              documents={documents}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'settings' && (
            <CompanySettingsPanel 
              currentUser={currentUser}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              compactMode={compactMode}
              setCompactMode={setCompactMode}
            />
          )}
        </main>

      </div>

      {/* Global Search Modal Overlay */}
      {globalSearchOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-24 z-50 px-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Command className="h-4.5 w-4.5" />
                <span className="text-xs font-black uppercase tracking-wider">Enterprise Global Search</span>
              </div>
              <button 
                id="btn-close-global-search"
                onClick={() => {
                  setGlobalSearchOpen(false);
                  setGlobalSearchQuery('');
                }}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  id="global-search-input-field"
                  type="text"
                  autoFocus
                  placeholder="Type SKU, serial number, device name, client company, invoice ID..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto p-4 space-y-5 text-xs">
              {!globalSearchQuery.trim() ? (
                <div className="py-12 text-center text-gray-400 font-semibold space-y-1">
                  <p>Begin typing to scan the entire ERP ecosystem...</p>
                  <p className="text-[10px] font-mono text-indigo-500">Hint: Try 'switch', 'router', 'CUST', or 'QT'</p>
                </div>
              ) : (
                <>
                  {/* Category: Clients */}
                  {searchResults.customers.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">CRM Clients & Leads</h4>
                      <div className="space-y-1.5">
                        {searchResults.customers.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => {
                              setActiveTab('crm');
                              setGlobalSearchOpen(false);
                              setGlobalSearchQuery('');
                            }}
                            className="p-2.5 bg-gray-50 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <div>
                              <p className="font-bold text-gray-800">{c.name}</p>
                              <p className="text-[10px] text-gray-400 font-medium">{c.company || 'Private Lead'}</p>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-bold uppercase">{c.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Products */}
                  {searchResults.products.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Inventory & Devices</h4>
                      <div className="space-y-1.5">
                        {searchResults.products.map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => {
                              setActiveTab('inventory');
                              setGlobalSearchOpen(false);
                              setGlobalSearchQuery('');
                            }}
                            className="p-2.5 bg-gray-50 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <div>
                              <p className="font-bold text-gray-800">{p.name}</p>
                              <p className="text-[10px] font-mono text-indigo-600">SKU: {p.sku} | Location: {p.warehouseLocation || 'Warehouse'}</p>
                            </div>
                            <span className="text-xs font-black text-gray-700">{p.stock} units</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Documents */}
                  {searchResults.documents.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Documents (Quotations & Invoices)</h4>
                      <div className="space-y-1.5">
                        {searchResults.documents.map(d => (
                          <div 
                            key={d.id} 
                            onClick={() => {
                              setActiveTab('documents');
                              setGlobalSearchOpen(false);
                              setGlobalSearchQuery('');
                            }}
                            className="p-2.5 bg-gray-50 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <div>
                              <p className="font-mono font-bold text-gray-800">{d.id}</p>
                              <p className="text-[10px] text-gray-400 font-semibold">{d.customerName} ({d.type.toUpperCase()})</p>
                            </div>
                            <span className="font-bold text-gray-700">${d.total.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.customers.length === 0 && searchResults.products.length === 0 && searchResults.documents.length === 0 && (
                    <div className="py-12 text-center text-gray-400 font-semibold">
                      No matching records found across ERP database.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF View Modal Overlay */}
      {selectedPDF && (
        <PDFViewer 
          documentItem={selectedPDF}
          onClose={() => setSelectedPDF(null)}
        />
      )}

    </div>
  );
}
