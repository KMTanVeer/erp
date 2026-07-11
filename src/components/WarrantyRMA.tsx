import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  AlertCircle,
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  Wrench, 
  Ban,
  ArrowRight,
  FileText,
  User,
  Activity,
  Calendar,
  Layers,
  MapPin,
  Barcode
} from 'lucide-react';
import { RMAClaim, Product, Customer, ERPDocument } from '../types';
import { collection, doc, Timestamp, getDocs, onSnapshot } from 'firebase/firestore';
import { db, logActivity, setDoc, deleteDoc, addDoc } from '../firebase';

interface WarrantyRMAProps {
  products: Product[];
  customers: Customer[];
  documents: ERPDocument[];
  currentUser: any;
}

export default function WarrantyRMA({ products, customers, documents, currentUser }: WarrantyRMAProps) {
  const [claims, setClaims] = useState<RMAClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<RMAClaim['status']>('received');
  const [notes, setNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  // Serial Number Quick-Lookup Search
  const [serialQuery, setSerialQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    product?: Product;
    customerName?: string;
    invoiceId?: string;
    warrantyMonths?: number;
    purchaseDate?: string;
    daysRemaining?: number;
    status?: 'active' | 'expired';
  } | null>(null);

  // Filtering claims
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Load RMA claims from Firestore/Local Storage
  useEffect(() => {
    const offline = localStorage.getItem('inovexa_offline_mode') === 'true';
    const loadOfflineClaims = () => {
      const saved = localStorage.getItem('inovexa_local_rma_claims');
      const loaded = saved ? JSON.parse(saved) : [];
      setClaims(loaded.sort((a: any, b: any) => b.claimDate.localeCompare(a.claimDate)));
      setLoading(false);
    };

    if (offline) {
      loadOfflineClaims();
      window.addEventListener('inovexa_local_write', loadOfflineClaims);
      window.addEventListener('storage', loadOfflineClaims);
      return () => {
        window.removeEventListener('inovexa_local_write', loadOfflineClaims);
        window.removeEventListener('storage', loadOfflineClaims);
      };
    }

    const unsub = onSnapshot(collection(db, 'rma_claims'), (snapshot) => {
      const loaded: RMAClaim[] = [];
      snapshot.forEach((doc) => {
        loaded.push({ id: doc.id, ...doc.data() } as RMAClaim);
      });
      setClaims(loaded.sort((a, b) => b.claimDate.localeCompare(a.claimDate)));
      setLoading(false);
    }, (err) => {
      console.warn("Firestore RMA Claims listener failed or denied access. Falling back to local storage:", err);
      loadOfflineClaims();
    });
    return () => unsub();
  }, []);

  // Quick serial scanner/lookup implementation
  const handleSerialLookup = () => {
    if (!serialQuery.trim()) {
      setLookupResult(null);
      return;
    }

    const q = serialQuery.trim().toUpperCase();
    
    // 1. Scan invoices for matching serial
    let foundInvoice: ERPDocument | null = null;
    let foundLineItem: any = null;

    const invoices = documents.filter(d => d.type === 'invoice');
    for (const inv of invoices) {
      for (const item of inv.items) {
        if (item.serialNumbers?.includes(q)) {
          foundInvoice = inv;
          foundLineItem = item;
          break;
        }
      }
      if (foundInvoice) break;
    }

    // 2. Scan products directly
    let foundProduct = products.find(p => p.sku === q || p.serialNumbers?.includes(q) || p.id === foundLineItem?.productId);
    
    if (foundInvoice && foundLineItem) {
      const prod = products.find(p => p.id === foundLineItem.productId) || foundProduct;
      const warrantyMonths = prod?.warrantyMonths || 12;
      const purchaseDate = foundInvoice.createdAt ? new Date(foundInvoice.createdAt.seconds * 1000) : new Date();
      const expirationDate = new Date(purchaseDate);
      expirationDate.setMonth(expirationDate.getMonth() + warrantyMonths);
      
      const today = new Date();
      const diffTime = expirationDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const warrantyStatus = daysRemaining > 0 ? 'active' : 'expired';

      setLookupResult({
        found: true,
        product: prod || { name: foundLineItem.productName, sku: 'N/A' } as Product,
        customerName: foundInvoice.customerName,
        invoiceId: foundInvoice.id,
        warrantyMonths,
        purchaseDate: purchaseDate.toLocaleDateString(),
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        status: warrantyStatus
      });
    } else if (foundProduct) {
      // Direct lookup from product catalog
      setLookupResult({
        found: true,
        product: foundProduct,
        customerName: 'Direct Catalog Product',
        warrantyMonths: foundProduct.warrantyMonths || 24,
        daysRemaining: 365,
        status: 'active'
      });
    } else {
      setLookupResult({ found: false });
    }
  };

  // Pre-populate claim form from Serial lookup
  const handleClaimFromLookup = () => {
    if (!lookupResult || !lookupResult.found) return;
    
    const matchedCust = customers.find(c => c.name === lookupResult.customerName);
    setCustomerId(matchedCust?.id || '');
    setProductId(lookupResult.product?.id || '');
    setSerialNumber(serialQuery.trim().toUpperCase());
    setReason('Faulty port/power supply issue identified by customer.');
    setStatus('received');
    setNotes(`RMA generated from quick serial lookup of invoice #${lookupResult.invoiceId}.`);
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setEditingId(null);
    setCustomerId('');
    setProductId('');
    setSerialNumber('');
    setReason('');
    setStatus('received');
    setNotes('');
    setActionTaken('');
    setShowForm(true);
  };

  const handleEditClick = (claim: RMAClaim) => {
    setEditingId(claim.id);
    setCustomerId(claim.customerId);
    setProductId(claim.productId);
    setSerialNumber(claim.serialNumber);
    setReason(claim.reason);
    setStatus(claim.status);
    setNotes(claim.notes || '');
    setActionTaken(claim.actionTaken || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !productId || !serialNumber || !reason) {
      alert('Please fill in all mandatory fields.');
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    const product = products.find(p => p.id === productId);

    if (!customer || !product) {
      alert('Error validating selected Client or Network device.');
      return;
    }

    try {
      // Calculate warranty status based on lookup helper
      let warrantyStatus: 'active' | 'expired' = 'active';
      const invoices = documents.filter(d => d.type === 'invoice');
      const matchingInvoice = invoices.find(inv => 
        inv.items.some(item => item.productId === productId && item.serialNumbers?.includes(serialNumber))
      );

      if (matchingInvoice) {
        const pDate = new Date(matchingInvoice.createdAt.seconds * 1000);
        const wMonths = product.warrantyMonths || 12;
        pDate.setMonth(pDate.getMonth() + wMonths);
        warrantyStatus = pDate.getTime() > Date.now() ? 'active' : 'expired';
      }

      const id = editingId || `RMA-${Date.now().toString().slice(-5)}`;
      const claimRef = doc(db, 'rma_claims', id);

      const existingClaim = claims.find(c => c.id === id);
      const serviceHistory = existingClaim?.serviceHistory || [];

      // Add movement/update entry to service log history
      const logEntry = {
        date: new Date().toISOString().split('T')[0],
        status: status.toUpperCase().replace('_', ' '),
        notes: notes || 'Status updated.',
        updatedBy: currentUser.name
      };

      const updatedHistory = [...serviceHistory, logEntry];

      const claimData: RMAClaim = {
        id,
        claimDate: existingClaim?.claimDate || new Date().toISOString().split('T')[0],
        customerId,
        customerName: customer.name,
        productId,
        productName: product.name,
        serialNumber,
        reason,
        status,
        actionTaken,
        notes,
        warrantyStatus,
        updatedAt: Timestamp.now(),
        serviceHistory: updatedHistory
      };

      await setDoc(claimRef, claimData, { merge: true });

      // If status is "replaced", let's update stock and log movement!
      if (status === 'replaced' && existingClaim?.status !== 'replaced') {
        // Log stock adjustment for replacing
        const prodRef = doc(db, 'products', productId);
        await setDoc(prodRef, {
          stock: Math.max(0, product.stock - 1)
        }, { merge: true });

        await logActivity(
          currentUser.uid,
          currentUser.name,
          currentUser.email,
          "RMA Replaced Item",
          `Deducted 1 unit of ${product.name} (Serial: ${serialNumber}) from inventory to satisfy warranty replacement.`
        );
      }

      await logActivity(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        editingId ? "Update RMA Claim" : "Create RMA Claim",
        `${editingId ? 'Updated' : 'Registered'} warranty/RMA claim ${id} for ${customer.name} -> ${product.name}.`
      );

      setShowForm(false);
    } catch (err) {
      console.error("Failed to save RMA claim:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this warranty claim profile?')) return;
    try {
      await deleteDoc(doc(db, 'rma_claims', id));
      await logActivity(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        "Delete RMA Claim",
        `Removed warranty claim log: ${id}.`
      );
    } catch (err) {
      console.error("Failed to delete claim:", err);
    }
  };

  // Filters
  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      const matchesSearch = 
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [claims, searchTerm, statusFilter]);

  const getStatusIcon = (st: RMAClaim['status']) => {
    switch (st) {
      case 'received': return <Clock className="h-4 w-4 text-indigo-500" />;
      case 'inspecting': return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'sent_to_vendor': return <RotateCcw className="h-4 w-4 text-amber-500" />;
      case 'replaced': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'repaired': return <Wrench className="h-4 w-4 text-teal-500" />;
      case 'rejected': return <Ban className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (st: RMAClaim['status']) => {
    switch (st) {
      case 'received': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'inspecting': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'sent_to_vendor': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'replaced': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'repaired': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div id="warranty-rma-panel" className="space-y-6 font-sans">
      
      {/* Module Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight flex items-center space-x-2">
            <ShieldCheck className="h-5.5 w-5.5 text-indigo-600" />
            <span>Warranty Administration & RMA Hub</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Validate device serial keys, assess warranty spans, process hardware replacements, and record RMA service lifecycles.
          </p>
        </div>
        <button
          id="btn-new-claim"
          onClick={handleCreateNew}
          className="mt-4 md:mt-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Initiate RMA Ticket</span>
        </button>
      </div>

      {/* Grid: 1. Serial Lookup Engine, 2. Interactive Claims Tracker */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Serial Lookup Section (1 Column) */}
        <div className="xl:col-span-1 bg-white p-5 rounded-3xl border border-gray-100 shadow-[4px_4px_10px_rgba(163,177,198,0.15)] space-y-4">
          <div>
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
              <Barcode className="h-4.5 w-4.5 text-indigo-500" />
              <span>Instant Serial Lookup</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Lookup warranty status, invoice origins, and remaining coverage days.</p>
          </div>

          <div className="flex space-x-2">
            <input
              id="serial-lookup-input"
              type="text"
              placeholder="Enter Hardware Serial / SKU..."
              value={serialQuery}
              onChange={(e) => setSerialQuery(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              id="btn-serial-lookup"
              onClick={handleSerialLookup}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              Verify
            </button>
          </div>

          {lookupResult && (
            <div className={`p-4 rounded-2xl border ${lookupResult.found ? 'bg-emerald-50/40 border-emerald-100' : 'bg-red-50/40 border-red-100'} text-xs space-y-3`}>
              {lookupResult.found ? (
                <>
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <span className="font-extrabold text-gray-700">Serial Match Found</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${lookupResult.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {lookupResult.status?.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-1.5 font-medium text-gray-600">
                    <p><strong className="text-gray-800">Hardware:</strong> {lookupResult.product?.name}</p>
                    <p><strong className="text-gray-800">SKU:</strong> {lookupResult.product?.sku}</p>
                    <p><strong className="text-gray-800">Customer:</strong> {lookupResult.customerName}</p>
                    {lookupResult.invoiceId && (
                      <p><strong className="text-gray-800">Linked Invoice:</strong> #{lookupResult.invoiceId}</p>
                    )}
                    <p><strong className="text-gray-800">Purchase Date:</strong> {lookupResult.purchaseDate}</p>
                    <p><strong className="text-gray-800">Coverage Duration:</strong> {lookupResult.warrantyMonths} Months</p>
                    <p className="pt-1.5 border-t border-gray-150 text-[11px] font-black text-gray-700">
                      Remaining Days: <span className="text-indigo-600">{lookupResult.daysRemaining} Days</span>
                    </p>
                  </div>

                  {lookupResult.status === 'active' && (
                    <button
                      id="btn-claim-from-lookup"
                      onClick={handleClaimFromLookup}
                      className="w-full mt-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black border border-indigo-150 transition-all flex items-center justify-center space-x-1"
                    >
                      <span>Create Warranty Claim Ticket</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-start space-x-2 text-red-700">
                  <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold">No Active Hardware Record</h4>
                    <p className="text-[10px] mt-0.5 text-red-600/90">This serial or SKU is not linked to any client invoices in our system. Verify the key and try again.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Claim Workspace Form / Claims Directory (2 Columns) */}
        <div className="xl:col-span-2 space-y-6">
          {showForm ? (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[5px_5px_15px_rgba(163,177,198,0.2)]">
              <div className="border-b border-gray-100 pb-3 mb-5 flex justify-between items-center">
                <h3 className="text-sm font-black text-gray-800 flex items-center space-x-1.5">
                  <Wrench className="h-4 w-4 text-indigo-500" />
                  <span>{editingId ? `Update Warranty claim ${editingId}` : 'Register New Warranty / RMA Ticket'}</span>
                </h3>
                <button
                  id="btn-cancel-rma-form"
                  onClick={() => setShowForm(false)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Select Client*</label>
                  <select
                    id="rma-form-customer"
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Client --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Hardware / Network Unit*</label>
                  <select
                    id="rma-form-product"
                    required
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Unique Unit Serial Key*</label>
                  <input
                    id="rma-form-serial"
                    type="text"
                    required
                    placeholder="E.g., SN-SERVER-X10294"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Current Ticket Status</label>
                  <select
                    id="rma-form-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="received">RMA Received (Awaiting Diagnostics)</option>
                    <option value="inspecting">Inspecting / Testing</option>
                    <option value="sent_to_vendor">Returned to Vendor (RTV)</option>
                    <option value="repaired">Repaired & Tested OK</option>
                    <option value="replaced">Replaced from Stock</option>
                    <option value="rejected">Rejected (Warranty Void)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Client Fault Description*</label>
                  <textarea
                    id="rma-form-reason"
                    required
                    rows={2}
                    placeholder="Enter explicit failure details, e.g., Network Port 4 of Switch fails to link up under PoE load."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Action & Diagnostic Service Notes</label>
                  <textarea
                    id="rma-form-notes"
                    rows={2}
                    placeholder="Internal hardware findings, e.g., verified failure on tester. Applied firmware rewrite or replaced unit."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Resolution Actions Taken</label>
                  <input
                    id="rma-form-action"
                    type="text"
                    placeholder="E.g., Replaced with SN-SERVER-X10295 from row B warehouse."
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2 pt-3">
                  <button
                    id="btn-rma-submit"
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                  >
                    Commit RMA Ticket State
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[4px_4px_10px_rgba(163,177,198,0.15)] space-y-4">
              {/* Claims filter and headers */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-50 pb-3">
                <div>
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">Active Warranty & RMA Claims</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Tracking claims through diagnostic stages.</p>
                </div>

                <div className="flex space-x-2 w-full sm:w-auto">
                  <input
                    id="rma-search-claim"
                    type="text"
                    placeholder="Search claim, client, serial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-44"
                  />
                  <select
                    id="rma-filter-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="received">Received</option>
                    <option value="inspecting">Inspecting</option>
                    <option value="sent_to_vendor">Vendor Process</option>
                    <option value="replaced">Replaced</option>
                    <option value="repaired">Repaired</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Table / List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pl-2">Ticket ID</th>
                      <th className="pb-3">Client</th>
                      <th className="pb-3">Hardware & Serial</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Warranty</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-gray-600">
                    {filteredClaims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="py-3.5 pl-2 font-mono font-bold text-gray-800">{claim.id}</td>
                        <td className="py-3.5">
                          <p className="font-bold text-gray-700">{claim.customerName}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">{claim.claimDate}</p>
                        </td>
                        <td className="py-3.5">
                          <p className="font-bold text-indigo-600 max-w-[170px] truncate" title={claim.productName}>{claim.productName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">SN: {claim.serialNumber}</p>
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border inline-flex items-center space-x-1.5 ${getStatusBadge(claim.status)}`}>
                            {getStatusIcon(claim.status)}
                            <span>{claim.status.replace('_', ' ').toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${claim.warrantyStatus === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {claim.warrantyStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              id={`btn-edit-claim-${claim.id}`}
                              onClick={() => handleEditClick(claim)}
                              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              id={`btn-del-claim-${claim.id}`}
                              onClick={() => handleDelete(claim.id)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredClaims.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 font-semibold">
                          No warranty or RMA claims recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
