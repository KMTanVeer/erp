import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc as fSetDoc, 
  getDoc, 
  getDocs, 
  addDoc as fAddDoc, 
  updateDoc as fUpdateDoc, 
  deleteDoc as fDeleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  Timestamp, 
  where,
  limit,
  writeBatch
} from 'firebase/firestore';
import { UserProfile, Customer, Product, Category, Supplier, ERPDocument, ActivityLog, BackupLog, UserRole } from './types';
import { SEED_CATEGORIES, SEED_SUPPLIERS, SEED_PRODUCTS } from './seedData';

// Web App Firebase Configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyAUUwRicmKnYLloDeFlFu0rgT29cntd1Do",
  authDomain: "natural-booking-q07pf.firebaseapp.com",
  projectId: "natural-booking-q07pf",
  storageBucket: "natural-booking-q07pf.firebasestorage.app",
  messagingSenderId: "994111306567",
  appId: "1:994111306567:web:9d6fd3c01bb12246686a62",
  measurementId: ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with custom Database ID if specified
const databaseId = "ai-studio-inovexaenterpris-cdc5f9d3-0b74-421f-ab57-6ecd5c8e933b";
export const db = getFirestore(app, databaseId);

/**
 * Custom Wrapped Firestore Database Writers for robust Sandbox/Offline Mode
 */
export async function setDoc(ref: any, data: any, options?: any) {
  const offline = localStorage.getItem('inovexa_offline_mode') === 'true';
  if (offline) {
    const path = ref.path;
    const parts = path.split('/');
    const collectionName = parts[0];
    const docId = parts[1] || ref.id;
    const key = `inovexa_local_${collectionName}`;
    const saved = localStorage.getItem(key);
    let list = saved ? JSON.parse(saved) : [];
    
    const processedData = { ...data };
    for (const k in processedData) {
      if (processedData[k] && typeof processedData[k] === 'object' && 'seconds' in processedData[k]) {
        processedData[k] = new Date(processedData[k].seconds * 1000).toISOString();
      }
    }

    const existingIndex = list.findIndex((item: any) => item.id === docId);
    if (existingIndex > -1) {
      if (options?.merge) {
        list[existingIndex] = { ...list[existingIndex], ...processedData, id: docId };
      } else {
        list[existingIndex] = { ...processedData, id: docId };
      }
    } else {
      list.push({ ...processedData, id: docId });
    }
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event('inovexa_local_write'));
    return;
  }
  return fSetDoc(ref, data, options);
}

export async function addDoc(ref: any, data: any) {
  const offline = localStorage.getItem('inovexa_offline_mode') === 'true';
  if (offline) {
    const path = ref.path;
    const key = `inovexa_local_${path}`;
    const saved = localStorage.getItem(key);
    let list = saved ? JSON.parse(saved) : [];
    const docId = `local-${Date.now().toString().slice(-4)}`;
    
    const processedData = { ...data };
    for (const k in processedData) {
      if (processedData[k] && typeof processedData[k] === 'object' && 'seconds' in processedData[k]) {
        processedData[k] = new Date(processedData[k].seconds * 1000).toISOString();
      }
    }
    
    list.push({ ...processedData, id: docId });
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event('inovexa_local_write'));
    return { id: docId };
  }
  return fAddDoc(ref, data);
}

export async function updateDoc(ref: any, data: any) {
  const offline = localStorage.getItem('inovexa_offline_mode') === 'true';
  if (offline) {
    const path = ref.path;
    const parts = path.split('/');
    const collectionName = parts[0];
    const docId = parts[1] || ref.id;
    const key = `inovexa_local_${collectionName}`;
    const saved = localStorage.getItem(key);
    let list = saved ? JSON.parse(saved) : [];
    
    const processedData = { ...data };
    for (const k in processedData) {
      if (processedData[k] && typeof processedData[k] === 'object' && 'seconds' in processedData[k]) {
        processedData[k] = new Date(processedData[k].seconds * 1000).toISOString();
      }
    }

    const existingIndex = list.findIndex((item: any) => item.id === docId);
    if (existingIndex > -1) {
      list[existingIndex] = { ...list[existingIndex], ...processedData };
    }
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event('inovexa_local_write'));
    return;
  }
  return fUpdateDoc(ref, data);
}

export async function deleteDoc(ref: any) {
  const offline = localStorage.getItem('inovexa_offline_mode') === 'true';
  if (offline) {
    const path = ref.path;
    const parts = path.split('/');
    const collectionName = parts[0];
    const docId = parts[1] || ref.id;
    const key = `inovexa_local_${collectionName}`;
    const saved = localStorage.getItem(key);
    let list = saved ? JSON.parse(saved) : [];
    
    list = list.filter((item: any) => item.id !== docId);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event('inovexa_local_write'));
    return;
  }
  return fDeleteDoc(ref);
}

/**
 * Log an audit activity in Firestore or Local Sandbox
 */
export async function logActivity(userId: string, userName: string, userEmail: string, action: string, details: string) {
  try {
    const activityRef = collection(db, 'activity_logs');
    const newLog: Omit<ActivityLog, 'id'> = {
      userId,
      userName,
      userEmail,
      action,
      details,
      timestamp: Timestamp.now()
    };
    await addDoc(activityRef, newLog);
  } catch (error) {
    console.error("Error writing activity log:", error);
  }
}

/**
 * Seed high-fidelity mock data to Firestore or Local Storage if database is empty or offline
 */
export async function seedDatabase(currentUser: { uid: string; name: string; email: string }) {
  const offline = localStorage.getItem('inovexa_offline_mode') === 'true';
  
  if (offline) {
    console.log("Seeding local storage in Sandbox/Offline Mode...");
    
    // 1. Categories
    const localCats = localStorage.getItem('inovexa_local_categories');
    if (!localCats || JSON.parse(localCats).length === 0) {
      localStorage.setItem('inovexa_local_categories', JSON.stringify(SEED_CATEGORIES));
    }

    // 2. Suppliers
    const localSups = localStorage.getItem('inovexa_local_suppliers');
    if (!localSups || JSON.parse(localSups).length === 0) {
      localStorage.setItem('inovexa_local_suppliers', JSON.stringify(SEED_SUPPLIERS));
    }

    // 3. Products
    const localProds = localStorage.getItem('inovexa_local_products');
    if (!localProds || JSON.parse(localProds).length === 0) {
      const products = SEED_PRODUCTS.map((product) => ({
        ...product,
        createdAt: new Date().toISOString()
      }));
      localStorage.setItem('inovexa_local_products', JSON.stringify(products));
    }

    // 4. Customers
    const localCusts = localStorage.getItem('inovexa_local_customers');
    if (!localCusts || JSON.parse(localCusts).length === 0) {
      const customers = [
        { id: 'cust-1', name: 'Quantum Leap Labs', company: 'Quantum Corp', email: 'contact@quantum-leap.com', phone: '+1 (555) 901-2345', address: '55 Innovation Blvd, Boston, MA', status: 'customer', assignedTo: currentUser.uid, assignedToName: currentUser.name, createdAt: new Date().toISOString() },
        { id: 'cust-2', name: 'Nexus Logistics Inc.', company: 'Nexus Global', email: 'it-support@nexus-logistics.com', phone: '+1 (555) 345-6789', address: '12 Freight Way, Chicago, IL', status: 'proposal', assignedTo: currentUser.uid, assignedToName: currentUser.name, createdAt: new Date().toISOString() },
        { id: 'cust-3', name: 'Horizon Wealth Management', company: 'Horizon Finance', email: 'office@horizon-wealth.com', phone: '+1 (555) 678-9012', address: '77 Wall Street, New York, NY', status: 'contacted', assignedTo: currentUser.uid, assignedToName: currentUser.name, createdAt: new Date().toISOString() },
        { id: 'cust-4', name: 'Altas BioTech Solutions', company: 'Atlas Bio', email: 'research@atlas-biotech.com', phone: '+1 (555) 432-1098', address: '302 Lab Heights, San Diego, CA', status: 'lead', assignedTo: currentUser.uid, assignedToName: currentUser.name, createdAt: new Date().toISOString() }
      ];
      localStorage.setItem('inovexa_local_customers', JSON.stringify(customers));
    }

    // 5. Documents
    const localDocs = localStorage.getItem('inovexa_local_documents');
    if (!localDocs || JSON.parse(localDocs).length === 0) {
      const docs = [
        {
          id: 'QT-1001',
          type: 'quotation',
          customerId: 'cust-1',
          customerName: 'Quantum Leap Labs',
          customerEmail: 'contact@quantum-leap.com',
          customerPhone: '+1 (555) 901-2345',
          customerAddress: '55 Innovation Blvd, Boston, MA',
          items: [
            { productId: 'prod-1', productName: 'Enterprise Cloud Suite Pro', quantity: 5, price: 1200, cost: 450, total: 6000 },
            { productId: 'prod-4', productName: 'Inovexa Compute Node C4', quantity: 1, price: 4100, cost: 2300, total: 4100 }
          ],
          subtotal: 10100,
          tax: 808,
          discount: 500,
          total: 10408,
          status: 'accepted',
          dueDate: '2026-08-15',
          notes: 'Standard 10% volume discount applied. Hardware to be delivered in 2 weeks.',
          createdBy: currentUser.uid,
          createdByName: currentUser.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'SO-1001',
          type: 'sales_order',
          customerId: 'cust-1',
          customerName: 'Quantum Leap Labs',
          customerEmail: 'contact@quantum-leap.com',
          customerPhone: '+1 (555) 901-2345',
          customerAddress: '55 Innovation Blvd, Boston, MA',
          items: [
            { productId: 'prod-1', productName: 'Enterprise Cloud Suite Pro', quantity: 5, price: 1200, cost: 450, total: 6000 },
            { productId: 'prod-4', productName: 'Inovexa Compute Node C4', quantity: 1, price: 4100, cost: 2300, total: 4100 }
          ],
          subtotal: 10100,
          tax: 808,
          discount: 500,
          total: 10408,
          status: 'processing',
          dueDate: '2026-08-15',
          notes: 'Converted from accepted Quotation QT-1001.',
          linkedDocumentId: 'QT-1001',
          createdBy: currentUser.uid,
          createdByName: currentUser.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'INV-1001',
          type: 'invoice',
          customerId: 'cust-1',
          customerName: 'Quantum Leap Labs',
          customerEmail: 'contact@quantum-leap.com',
          customerPhone: '+1 (555) 901-2345',
          customerAddress: '55 Innovation Blvd, Boston, MA',
          items: [
            { productId: 'prod-1', productName: 'Enterprise Cloud Suite Pro', quantity: 5, price: 1200, cost: 450, total: 6000 },
            { productId: 'prod-4', productName: 'Inovexa Compute Node C4', quantity: 1, price: 4100, cost: 2300, total: 4100 }
          ],
          subtotal: 10100,
          tax: 808,
          discount: 500,
          total: 10408,
          status: 'paid',
          dueDate: '2026-08-15',
          notes: 'Invoice for Compute Node and Enterprise licenses. Payment received via bank wire.',
          linkedDocumentId: 'SO-1001',
          createdBy: currentUser.uid,
          createdByName: currentUser.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('inovexa_local_documents', JSON.stringify(docs));
    }

    // 6. Backups Log
    const localBackups = localStorage.getItem('inovexa_local_backups');
    if (!localBackups || JSON.parse(localBackups).length === 0) {
      const backups: BackupLog[] = [
        { id: 'b-1', backupDate: '2026-07-09', status: 'completed', size: '1.24 MB', triggeredBy: 'Automated System (Daily)', timestamp: Timestamp.now() },
        { id: 'b-2', backupDate: '2026-07-08', status: 'completed', size: '1.22 MB', triggeredBy: 'Automated System (Daily)', timestamp: Timestamp.now() },
        { id: 'b-3', backupDate: '2026-07-07', status: 'completed', size: '1.19 MB', triggeredBy: 'Automated System (Daily)', timestamp: Timestamp.now() }
      ];
      localStorage.setItem('inovexa_local_backups', JSON.stringify(backups));
    }

    window.dispatchEvent(new Event('inovexa_local_write'));
    return true;
  }

  try {
    // 1. Categories
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    if (categoriesSnapshot.empty) {
      for (const cat of SEED_CATEGORIES) {
        await setDoc(doc(db, 'categories', cat.id), cat);
      }
    }

    // 2. Suppliers
    const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
    if (suppliersSnapshot.empty) {
      for (const sup of SEED_SUPPLIERS) {
        await setDoc(doc(db, 'suppliers', sup.id), sup);
      }
    }

    // 3. Products
    const productsSnapshot = await getDocs(collection(db, 'products'));
    if (productsSnapshot.empty) {
      for (const prod of SEED_PRODUCTS) {
        await setDoc(doc(db, 'products', prod.id), {
          ...prod,
          createdAt: Timestamp.now()
        });
      }
    }

    // 4. Customers
    const customersSnapshot = await getDocs(collection(db, 'customers'));
    if (customersSnapshot.empty) {
      const customers: Omit<Customer, 'createdAt'>[] = [
        { id: 'cust-1', name: 'Quantum Leap Labs', company: 'Quantum Corp', email: 'contact@quantum-leap.com', phone: '+1 (555) 901-2345', address: '55 Innovation Blvd, Boston, MA', status: 'customer', assignedTo: currentUser.uid, assignedToName: currentUser.name },
        { id: 'cust-2', name: 'Nexus Logistics Inc.', company: 'Nexus Global', email: 'it-support@nexus-logistics.com', phone: '+1 (555) 345-6789', address: '12 Freight Way, Chicago, IL', status: 'proposal', assignedTo: currentUser.uid, assignedToName: currentUser.name },
        { id: 'cust-3', name: 'Horizon Wealth Management', company: 'Horizon Finance', email: 'office@horizon-wealth.com', phone: '+1 (555) 678-9012', address: '77 Wall Street, New York, NY', status: 'contacted', assignedTo: currentUser.uid, assignedToName: currentUser.name },
        { id: 'cust-4', name: 'Altas BioTech Solutions', company: 'Atlas Bio', email: 'research@atlas-biotech.com', phone: '+1 (555) 432-1098', address: '302 Lab Heights, San Diego, CA', status: 'lead', assignedTo: currentUser.uid, assignedToName: currentUser.name }
      ];
      for (const cust of customers) {
        await setDoc(doc(db, 'customers', cust.id), {
          ...cust,
          createdAt: Timestamp.now()
        });
      }
    }

    // 5. Documents (Quotations, Sales Orders, Invoices)
    const docsSnapshot = await getDocs(collection(db, 'documents'));
    if (docsSnapshot.empty) {
      const docs: Omit<ERPDocument, 'createdAt' | 'updatedAt'>[] = [
        {
          id: 'QT-1001',
          type: 'quotation',
          customerId: 'cust-1',
          customerName: 'Quantum Leap Labs',
          customerEmail: 'contact@quantum-leap.com',
          customerPhone: '+1 (555) 901-2345',
          customerAddress: '55 Innovation Blvd, Boston, MA',
          items: [
            { productId: 'prod-1', productName: 'Enterprise Cloud Suite Pro', quantity: 5, price: 1200, cost: 450, total: 6000 },
            { productId: 'prod-4', productName: 'Inovexa Compute Node C4', quantity: 1, price: 4100, cost: 2300, total: 4100 }
          ],
          subtotal: 10100,
          tax: 808,
          discount: 500,
          total: 10408,
          status: 'accepted',
          dueDate: '2026-08-15',
          notes: 'Standard 10% volume discount applied. Hardware to be delivered in 2 weeks.',
          createdBy: currentUser.uid,
          createdByName: currentUser.name
        },
        {
          id: 'SO-1001',
          type: 'sales_order',
          customerId: 'cust-1',
          customerName: 'Quantum Leap Labs',
          customerEmail: 'contact@quantum-leap.com',
          customerPhone: '+1 (555) 901-2345',
          customerAddress: '55 Innovation Blvd, Boston, MA',
          items: [
            { productId: 'prod-1', productName: 'Enterprise Cloud Suite Pro', quantity: 5, price: 1200, cost: 450, total: 6000 },
            { productId: 'prod-4', productName: 'Inovexa Compute Node C4', quantity: 1, price: 4100, cost: 2300, total: 4100 }
          ],
          subtotal: 10100,
          tax: 808,
          discount: 500,
          total: 10408,
          status: 'processing',
          dueDate: '2026-08-15',
          notes: 'Converted from accepted Quotation QT-1001.',
          linkedDocumentId: 'QT-1001',
          createdBy: currentUser.uid,
          createdByName: currentUser.name
        },
        {
          id: 'INV-1001',
          type: 'invoice',
          customerId: 'cust-1',
          customerName: 'Quantum Leap Labs',
          customerEmail: 'contact@quantum-leap.com',
          customerPhone: '+1 (555) 901-2345',
          customerAddress: '55 Innovation Blvd, Boston, MA',
          items: [
            { productId: 'prod-1', productName: 'Enterprise Cloud Suite Pro', quantity: 5, price: 1200, cost: 450, total: 6000 },
            { productId: 'prod-4', productName: 'Inovexa Compute Node C4', quantity: 1, price: 4100, cost: 2300, total: 4100 }
          ],
          subtotal: 10100,
          tax: 808,
          discount: 500,
          total: 10408,
          status: 'paid',
          dueDate: '2026-08-15',
          notes: 'Invoice for Compute Node and Enterprise licenses. Payment received via bank wire.',
          linkedDocumentId: 'SO-1001',
          createdBy: currentUser.uid,
          createdByName: currentUser.name
        },
        {
          id: 'QT-1002',
          type: 'quotation',
          customerId: 'cust-2',
          customerName: 'Nexus Logistics Inc.',
          customerEmail: 'it-support@nexus-logistics.com',
          customerPhone: '+1 (555) 345-6789',
          customerAddress: '12 Freight Way, Chicago, IL',
          items: [
            { productId: 'prod-2', productName: 'Sentinel Firewall Gateway X1', quantity: 1, price: 2450, cost: 1100, total: 2450 },
            { productId: 'prod-5', productName: 'Endpoint Protection Agent', quantity: 50, price: 45, cost: 15, total: 2250 }
          ],
          subtotal: 4700,
          tax: 376,
          discount: 0,
          total: 5076,
          status: 'sent',
          dueDate: '2026-07-30',
          notes: 'Includes free remote deployment support for first 30 days.',
          createdBy: currentUser.uid,
          createdByName: currentUser.name
        },
        {
          id: 'INV-1002',
          type: 'invoice',
          customerId: 'cust-2',
          customerName: 'Nexus Logistics Inc.',
          customerEmail: 'it-support@nexus-logistics.com',
          customerPhone: '+1 (555) 345-6789',
          customerAddress: '12 Freight Way, Chicago, IL',
          items: [
            { productId: 'prod-2', productName: 'Sentinel Firewall Gateway X1', quantity: 2, price: 2450, cost: 1100, total: 4900 }
          ],
          subtotal: 4900,
          tax: 392,
          discount: 100,
          total: 5192,
          status: 'unpaid',
          dueDate: '2026-08-01',
          notes: 'Payment terms net-30.',
          createdBy: currentUser.uid,
          createdByName: currentUser.name
        }
      ];
      for (const d of docs) {
        await setDoc(doc(db, 'documents', d.id), {
          ...d,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
    }

    // 6. Backups Log
    const backupsSnapshot = await getDocs(collection(db, 'backups'));
    if (backupsSnapshot.empty) {
      const backups: BackupLog[] = [
        { id: 'b-1', backupDate: '2026-07-09', status: 'completed', size: '1.24 MB', triggeredBy: 'Automated System (Daily)', timestamp: Timestamp.now() },
        { id: 'b-2', backupDate: '2026-07-08', status: 'completed', size: '1.22 MB', triggeredBy: 'Automated System (Daily)', timestamp: Timestamp.now() },
        { id: 'b-3', backupDate: '2026-07-07', status: 'completed', size: '1.19 MB', triggeredBy: 'Automated System (Daily)', timestamp: Timestamp.now() }
      ];
      for (const b of backups) {
        await setDoc(doc(db, 'backups', b.id), b);
      }
    }

    await logActivity(
      currentUser.uid,
      currentUser.name,
      currentUser.email,
      "System Auto-Seed",
      "Successfully seeded database with modern high-fidelity enterprise data."
    );

    return true;
  } catch (error) {
    console.error("Error seeding database:", error);
    return false;
  }
}
