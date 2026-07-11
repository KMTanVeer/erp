export type UserRole = 'super_admin' | 'admin' | 'employee';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: any; // Firestore Timestamp
}

export interface Contact {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface TimelineEvent {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'system';
  title: string;
  description: string;
  date: string;
  performedBy: string;
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  status: 'lead' | 'contacted' | 'proposal' | 'customer';
  assignedTo: string; // User ID
  assignedToName?: string;
  createdAt: any;
  // Enhanced attributes
  contacts?: Contact[];
  timeline?: TimelineEvent[];
  tags?: string[];
  outstandingBalance?: number;
  creditLimit?: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  // Enhanced attributes
  rating?: number; // 1-5 stars
  notes?: string;
  documents?: string[]; // array of file names/urls
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'in' | 'out' | 'transfer' | 'damaged' | 'reserve';
  quantity: number;
  reference: string; // invoice #, PO #, manual audit
  performedBy: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  supplierId: string;
  supplierName?: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  createdAt: any;
  // Enhanced attributes
  barcode?: string;
  serialNumbers?: string[]; // Individual item serials for high-end IT hardware
  warrantyMonths?: number;
  variants?: string[]; // e.g. ["8-Port", "24-Port", "48-Port PoE"]
  images?: string[]; // URLs or placeholders
  datasheetUrl?: string;
  warehouseLocation?: string; // e.g. "Aisle 3, Shelf B"
  reservedStock?: number;
  damagedStock?: number;
  stockHistory?: StockMovement[];
}

export interface DocumentItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  cost: number; // for profit reporting
  total: number;
  serialNumbers?: string[]; // specific serials associated with this purchase line
}

export interface RevisionHistory {
  revision: number;
  date: string;
  performedBy: string;
  changes: string;
}

export interface PaymentReceipt {
  id: string;
  date: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'card' | 'cheque';
  referenceNo?: string;
  notes?: string;
}

export interface ERPDocument {
  id: string; // e.g., QT-1001, SO-1001, INV-1001
  type: 'quotation' | 'sales_order' | 'invoice';
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  items: DocumentItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string; // QT: 'draft'|'sent'|'accepted'|'expired', SO: 'pending'|'processing'|'completed'|'cancelled', INV: 'unpaid'|'paid'|'partially_paid'|'overdue'
  dueDate: string;
  notes: string;
  linkedDocumentId?: string; // e.g. linked QT or SO
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  createdByName?: string;
  // Enhanced attributes
  isDraft?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  revisions?: RevisionHistory[];
  payments?: PaymentReceipt[];
  challanNumber?: string; // delivery challan reference
  challanStatus?: 'pending' | 'shipped' | 'delivered';
  digitalSignatureUrl?: string; // name of signer
  hasCompanySeal?: boolean;
}

export interface RMAClaim {
  id: string;
  claimDate: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  serialNumber: string;
  reason: string;
  status: 'received' | 'inspecting' | 'sent_to_vendor' | 'replaced' | 'repaired' | 'rejected';
  actionTaken?: string;
  notes?: string;
  warrantyStatus: 'active' | 'expired';
  updatedAt: any;
  serviceHistory?: { date: string; status: string; notes: string; updatedBy: string }[];
}

export interface PurchaseOrder {
  id: string; // PO-2026-001
  supplierId: string;
  supplierName: string;
  orderDate: string;
  status: 'ordered' | 'received' | 'cancelled';
  items: { productId: string; name: string; quantity: number; costPrice: number }[];
  total: number;
  notes?: string;
}

export interface CompanySettings {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  taxRate: number;
  invoicePrefix: string;
  quotationPrefix: string;
  branches: string[];
  logoPlaceholder?: string;
  sealPlaceholder?: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: any;
}

export interface BackupLog {
  id: string;
  backupDate: string;
  status: 'completed' | 'failed';
  size: string;
  triggeredBy: string;
  timestamp: any;
}

