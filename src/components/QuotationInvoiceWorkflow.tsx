import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle, 
  RefreshCcw, 
  ArrowRight, 
  Trash2, 
  DollarSign, 
  Clock, 
  Truck, 
  TrendingUp, 
  Eye, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { ERPDocument, Customer, Product, DocumentItem, UserProfile } from '../types';
import { doc, Timestamp } from 'firebase/firestore';
import { db, logActivity, setDoc, deleteDoc } from '../firebase';

interface QuotationInvoiceWorkflowProps {
  documents: ERPDocument[];
  customers: Customer[];
  products: Product[];
  currentUser: UserProfile;
  onViewPDF: (doc: ERPDocument) => void;
}

export default function QuotationInvoiceWorkflow({ 
  documents, 
  customers, 
  products, 
  currentUser,
  onViewPDF
}: QuotationInvoiceWorkflowProps) {
  
  // Search and tabs
  const [docSearch, setDocSearch] = useState('');
  const [docTypeTab, setDocTypeTab] = useState<'all' | 'quotation' | 'sales_order' | 'invoice'>('all');
  const [showDocForm, setShowDocForm] = useState(false);

  // Form states
  const [formType, setFormType] = useState<'quotation' | 'sales_order' | 'invoice'>('quotation');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [formItems, setFormItems] = useState<DocumentItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [taxRate, setTaxRate] = useState(8); // 8% default
  const [discountAmount, setDiscountAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Filtering
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = 
        doc.id.toLowerCase().includes(docSearch.toLowerCase()) ||
        doc.customerName.toLowerCase().includes(docSearch.toLowerCase()) ||
        doc.customerEmail.toLowerCase().includes(docSearch.toLowerCase());
      
      const matchesType = docTypeTab === 'all' || doc.type === docTypeTab;

      return matchesSearch && matchesType;
    });
  }, [documents, docSearch, docTypeTab]);

  // Selected customer details
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Calculate form totals
  const formTotals = useMemo(() => {
    const subtotal = formItems.reduce((sum, item) => sum + item.total, 0);
    const tax = Number(((subtotal * taxRate) / 100).toFixed(2));
    const total = Number((subtotal + tax - discountAmount).toFixed(2));
    return { subtotal, tax, total };
  }, [formItems, taxRate, discountAmount]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
  }, [products, productSearch]);

  const handleOpenCreateForm = (type: 'quotation' | 'sales_order' | 'invoice') => {
    setFormType(type);
    setSelectedCustomerId(customers[0]?.id || '');
    setFormItems([]);
    setProductSearch('');
    setDiscountAmount(0);
    setTaxRate(8);
    setDueDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 14 days out
    setFormNotes('');
    setShowDocForm(true);
  };

  const handleAddItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Check if item already exists in form, increment qty
    const existingIdx = formItems.findIndex(i => i.productId === productId);
    if (existingIdx > -1) {
      const updated = [...formItems];
      updated[existingIdx].quantity += 1;
      updated[existingIdx].total = updated[existingIdx].quantity * updated[existingIdx].price;
      setFormItems(updated);
    } else {
      setFormItems([
        ...formItems,
        {
          productId,
          productName: product.name,
          quantity: 1,
          price: product.price,
          cost: product.cost,
          total: product.price
        }
      ]);
    }
  };

  const handleUpdateItemQty = (index: number, qty: number) => {
    if (qty < 1) return;
    const updated = [...formItems];
    updated[index].quantity = qty;
    updated[index].total = qty * updated[index].price;
    setFormItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setFormItems(formItems.filter((_, idx) => idx !== index));
  };

  // Submit Document Create
  const handleCommitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || formItems.length === 0) {
      alert("Please select a customer and add at least one line item.");
      return;
    }

    try {
      const prefix = formType === 'quotation' ? 'QT' : (formType === 'sales_order' ? 'SO' : 'INV');
      const docId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const newDoc: ERPDocument = {
        id: docId,
        type: formType,
        customerId: selectedCustomerId,
        customerName: selectedCustomer?.name || 'Unknown',
        customerEmail: selectedCustomer?.email || '',
        customerPhone: selectedCustomer?.phone || '',
        customerAddress: selectedCustomer?.address || '',
        items: formItems,
        subtotal: formTotals.subtotal,
        tax: formTotals.tax,
        discount: discountAmount,
        total: formTotals.total,
        status: formType === 'quotation' ? 'draft' : (formType === 'sales_order' ? 'pending' : 'unpaid'),
        dueDate,
        notes: formNotes,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: currentUser.uid,
        createdByName: currentUser.name
      };

      await setDoc(doc(db, 'documents', docId), newDoc);

      await logActivity(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        `Create ${formType}`,
        `Compiled new transaction ledger node: ${docId} for client ${selectedCustomer?.name}.`
      );

      // Also deduct inventory stock dynamically if it is a fulfilled sales order or invoice!
      if (formType === 'invoice' || formType === 'sales_order') {
        for (const item of formItems) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const productRef = doc(db, 'products', product.id);
            await setDoc(productRef, {
              stock: Math.max(0, product.stock - item.quantity)
            }, { merge: true });
          }
        }
      }

      setShowDocForm(false);
    } catch (err) {
      console.error("Error creating document ledger:", err);
    }
  };

  // Status Action transitions
  const handleConvertQuotationToSO = async (quotation: ERPDocument) => {
    try {
      const soId = `SO-${quotation.id.split('-')[1] || Math.floor(1000 + Math.random() * 9000)}`;
      
      const newSO: ERPDocument = {
        ...quotation,
        id: soId,
        type: 'sales_order',
        status: 'processing',
        linkedDocumentId: quotation.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: currentUser.uid,
        createdByName: currentUser.name
      };

      // 1. Save new SO
      await setDoc(doc(db, 'documents', soId), newSO);
      // 2. Update QT status to accepted
      await setDoc(doc(db, 'documents', quotation.id), { status: 'accepted', updatedAt: Timestamp.now() }, { merge: true });

      await logActivity(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        "Convert Quotation to SO",
        `Upgraded quote ${quotation.id} into Active Sales Order ${soId}.`
      );
    } catch (err) {
      console.error("Error converting quotation:", err);
    }
  };

  const handleConvertSOToInvoice = async (salesOrder: ERPDocument) => {
    try {
      const invId = `INV-${salesOrder.id.split('-')[1] || Math.floor(1000 + Math.random() * 9000)}`;
      
      const newInvoice: ERPDocument = {
        ...salesOrder,
        id: invId,
        type: 'invoice',
        status: 'unpaid',
        linkedDocumentId: salesOrder.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: currentUser.uid,
        createdByName: currentUser.name
      };

      // 1. Save Invoice
      await setDoc(doc(db, 'documents', invId), newInvoice);
      // 2. Complete the Sales Order
      await setDoc(doc(db, 'documents', salesOrder.id), { status: 'completed', updatedAt: Timestamp.now() }, { merge: true });

      await logActivity(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        "Convert SO to Invoice",
        `Fulfilled Sales Order ${salesOrder.id} and generated invoice billing: ${invId}.`
      );

      // Dynamic inventory stock deduction
      for (const item of salesOrder.items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const productRef = doc(db, 'products', product.id);
          await setDoc(productRef, {
            stock: Math.max(0, product.stock - item.quantity)
          }, { merge: true });
        }
      }
    } catch (err) {
      console.error("Error converting sales order:", err);
    }
  };

  const handleMarkInvoicePaid = async (invoice: ERPDocument, statusValue: 'paid' | 'partially_paid') => {
    try {
      await setDoc(doc(db, 'documents', invoice.id), { 
        status: statusValue, 
        updatedAt: Timestamp.now() 
      }, { merge: true });

      await logActivity(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        "Mark Invoice Paid",
        `Recorded payments for invoice ledger node: ${invoice.id} (${statusValue.replace('_', ' ').toUpperCase()}).`
      );
    } catch (err) {
      console.error("Error updating payment status:", err);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document ledger item?")) return;
    try {
      await deleteDoc(doc(db, 'documents', id));
      await logActivity(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        "Delete Document",
        `Deleted transaction document ledger node: ${id}.`
      );
    } catch (err) {
      console.error("Error deleting document:", err);
    }
  };

  const getStatusBadgeStyle = (type: string, status: string) => {
    if (type === 'quotation') {
      switch (status) {
        case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
        case 'sent': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'expired': return 'bg-red-50 text-red-700 border-red-200';
      }
    } else if (type === 'sales_order') {
      switch (status) {
        case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      }
    } else { // invoice
      switch (status) {
        case 'unpaid': return 'bg-red-50 text-red-700 border-red-200';
        case 'partially_paid': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'paid': return 'bg-green-50 text-green-700 border-green-200';
        case 'overdue': return 'bg-rose-50 text-rose-700 border-rose-200';
      }
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div id="documents-panel" className="space-y-6 font-sans">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight flex items-center space-x-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <span>Operational Document Workflows</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Build Quotations, link Sales Orders, and issue Invoice billings within integrated CRM-stock pipelines.
          </p>
        </div>
        
        {/* Creation Buttons */}
        {!showDocForm && (
          <div className="mt-4 md:mt-0 flex space-x-2">
            <button
              id="btn-create-quote"
              onClick={() => handleOpenCreateForm('quotation')}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded-xl text-xs font-bold transition-all"
            >
              + Quotation
            </button>
            <button
              id="btn-create-so"
              onClick={() => handleOpenCreateForm('sales_order')}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-150 rounded-xl text-xs font-bold transition-all"
            >
              + Sales Order
            </button>
            <button
              id="btn-create-invoice"
              onClick={() => handleOpenCreateForm('invoice')}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 rounded-xl text-xs font-bold transition-all"
            >
              + Invoice
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {!showDocForm && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white rounded-2xl shadow-[4px_4px_10px_rgba(163,177,198,0.15)] border border-gray-100/50">
          <div className="flex space-x-1.5 p-1 bg-gray-200/50 rounded-xl self-start">
            <button
              id="tab-doc-all"
              onClick={() => setDocTypeTab('all')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                docTypeTab === 'all' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500'
              }`}
            >
              All Ledgers
            </button>
            <button
              id="tab-doc-qt"
              onClick={() => setDocTypeTab('quotation')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                docTypeTab === 'quotation' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500'
              }`}
            >
              Quotations
            </button>
            <button
              id="tab-doc-so"
              onClick={() => setDocTypeTab('sales_order')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                docTypeTab === 'sales_order' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500'
              }`}
            >
              Sales Orders
            </button>
            <button
              id="tab-doc-inv"
              onClick={() => setDocTypeTab('invoice')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                docTypeTab === 'invoice' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500'
              }`}
            >
              Invoices
            </button>
          </div>

          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              id="doc-search-input"
              type="text"
              placeholder="Search by ID, client representative, email..."
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Forms & Table Layouts */}
      {showDocForm ? (
        /* CREATIVE DYNAMIC FORM ASSEMBLY FOR ALL TYPES */
        <div className="bg-white p-6 rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100">
          <div className="border-b border-gray-100 pb-4 mb-5 flex justify-between items-center">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">
              Create New {formType.replace('_', ' ')} Ledger Entry
            </h3>
            <button 
              id="btn-cancel-doc-form"
              onClick={() => setShowDocForm(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCommitDocument} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Select Customer (CRM Link)</label>
                <select
                  id="form-doc-customer"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Payment / Due Date</label>
                <input
                  id="form-doc-due"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Tax Surcharge (%)</label>
                <input
                  id="form-doc-tax"
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Display Customer Pre-fills */}
            {selectedCustomer && (
              <div className="p-4 bg-gray-50 rounded-2xl text-xs text-gray-500 flex flex-col md:flex-row gap-4 border border-gray-100">
                <div className="flex-1">
                  <span className="block text-[9px] font-extrabold text-indigo-500 uppercase">Customer Billing Representative</span>
                  <span className="font-bold text-gray-800">{selectedCustomer.name}</span>
                  <p className="font-mono mt-0.5">{selectedCustomer.email}</p>
                </div>
                <div className="flex-1">
                  <span className="block text-[9px] font-extrabold text-indigo-500 uppercase">Corporate Contact</span>
                  <span>{selectedCustomer.company}</span>
                  <p className="mt-0.5">{selectedCustomer.phone || 'No phone record'}</p>
                </div>
                <div className="flex-1">
                  <span className="block text-[9px] font-extrabold text-indigo-500 uppercase">Registered Address</span>
                  <p className="line-clamp-2">{selectedCustomer.address || 'No physical address'}</p>
                </div>
              </div>
            )}

            {/* Dynamic Items Builder Table */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-gray-50 p-3 flex justify-between items-center border-b border-gray-150">
                <span className="text-xs font-bold text-gray-700">Document Line Items</span>
                <span className="text-[10px] text-gray-400 font-semibold">Select and add catalog items below</span>
              </div>
              
              {/* Product quick adder list */}
              <div className="p-3 bg-white border-b border-gray-100 space-y-3">
                <input
                  id="form-product-search"
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search product by name, SKU, or category..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                />
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    id={`btn-quick-add-${p.id}`}
                    type="button"
                    onClick={() => handleAddItem(p.id)}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-bold border border-indigo-100 transition-all"
                  >
                    + {p.name} (${p.price})
                  </button>
                ))}
                </div>
                {filteredProducts.length === 0 && (
                  <p className="text-[11px] text-gray-400 font-semibold">No products match your search.</p>
                )}
              </div>

              {/* Items List */}
              <div className="divide-y divide-gray-50 min-h-[150px] bg-white">
                {formItems.map((item, index) => (
                  <div key={index} className="p-3 flex flex-col md:flex-row items-center justify-between text-xs gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 truncate">{item.productName}</h4>
                      <p className="text-[10px] text-gray-400 font-mono">Product ID: {item.productId}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">Qty:</span>
                      <input
                        id={`form-qty-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemQty(index, Number(e.target.value))}
                        className="w-14 px-1.5 py-1 border border-gray-200 rounded-lg text-center font-bold"
                      />
                    </div>
                    <div className="w-24 text-right">
                      <span className="text-gray-400 block text-[10px]">Price each</span>
                      <span className="font-bold text-gray-700">${item.price.toLocaleString()}</span>
                    </div>
                    <div className="w-28 text-right">
                      <span className="text-gray-400 block text-[10px]">Line Total</span>
                      <span className="font-black text-gray-800">${item.total.toLocaleString()}</span>
                    </div>
                    <button
                      id={`btn-remove-item-${index}`}
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {formItems.length === 0 && (
                  <div className="py-12 text-center text-gray-400 font-semibold flex flex-col items-center justify-center space-y-1">
                    <AlertCircle className="h-7 w-7 text-gray-300" />
                    <p>Select catalog items from the quick adder list above to populate quotation lines.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Calculations and notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Quotation Notes / Payment Terms</label>
                <textarea
                  id="form-doc-notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={4}
                  placeholder="Terms of delivery, banking account details, or specific SLA contract notes..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              {/* Totals Well */}
              <div className="p-5 bg-[#fcfdfe] border border-gray-100 rounded-3xl shadow-[inset_1px_1px_3px_rgba(163,177,198,0.1)] flex flex-col justify-between">
                <div className="space-y-2.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="font-semibold">Subtotal</span>
                    <span className="font-bold text-gray-800">${formTotals.subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Estimated VAT / Tax ({taxRate}%)</span>
                    <span className="font-bold text-gray-800">${formTotals.tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Commercial Discount ($)</span>
                    <input
                      id="form-discount"
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="w-24 px-2 py-0.5 border border-gray-200 rounded-lg text-right text-xs"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3.5 mt-3.5 flex justify-between items-baseline">
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Estimated Total</span>
                  <span className="text-2xl font-black text-indigo-600">${formTotals.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>

            <button
              id="btn-doc-submit"
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all pt-3"
            >
              Compile & Register Document Ledger Entry
            </button>
          </form>
        </div>
      ) : (
        /* DOCUMENTS DATA TABLE LIST */
        <div className="bg-white rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#fcfdfe] border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-wider">
                  <th className="py-4 pl-5">Doc ID</th>
                  <th className="py-4">Client Name</th>
                  <th className="py-4">Type</th>
                  <th className="py-4">Due Date</th>
                  <th className="py-4 text-right">Subtotal</th>
                  <th className="py-4 text-right">Net Total</th>
                  <th className="py-4 text-center">Status</th>
                  <th className="py-4 text-center pr-5">Execution Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 pl-5 font-mono font-bold text-gray-800">{doc.id}</td>
                    <td className="py-4 font-bold text-gray-700 truncate max-w-[150px]">{doc.customerName}</td>
                    <td className="py-4 capitalize font-bold text-indigo-600 text-[10px]">{doc.type.replace('_', ' ')}</td>
                    <td className="py-4 font-mono font-semibold text-gray-400">{doc.dueDate}</td>
                    <td className="py-4 text-right font-bold text-gray-500">${doc.subtotal.toLocaleString()}</td>
                    <td className="py-4 text-right font-black text-gray-800">${doc.total.toLocaleString()}</td>
                    <td className="py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${getStatusBadgeStyle(doc.type, doc.status)}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-4 text-center pr-5">
                      <div className="flex items-center justify-center space-x-1">
                        
                        {/* PDF Viewer Action */}
                        <button
                          id={`btn-view-pdf-${doc.id}`}
                          onClick={() => onViewPDF(doc)}
                          className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-bold flex items-center space-x-1"
                        >
                          <Eye className="h-3 w-3" />
                          <span>PDF</span>
                        </button>

                        {/* Pipeline workflow conversions */}
                        {doc.type === 'quotation' && doc.status !== 'accepted' && (
                          <button
                            id={`btn-convert-so-${doc.id}`}
                            onClick={() => handleConvertQuotationToSO(doc)}
                            className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-bold flex items-center space-x-0.5"
                          >
                            <span>Convert SO</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}

                        {doc.type === 'sales_order' && doc.status === 'processing' && (
                          <button
                            id={`btn-convert-inv-${doc.id}`}
                            onClick={() => handleConvertSOToInvoice(doc)}
                            className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-100 rounded-lg text-[10px] font-bold flex items-center space-x-0.5"
                          >
                            <span>Bill Invoice</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}

                        {doc.type === 'invoice' && doc.status === 'unpaid' && (
                          <>
                            <button
                              id={`btn-pay-paid-${doc.id}`}
                              onClick={() => handleMarkInvoicePaid(doc, 'paid')}
                              className="px-1.5 py-1 bg-green-50 hover:bg-green-100 text-green-600 border border-green-100 rounded-lg text-[10px] font-bold"
                            >
                              Paid
                            </button>
                            <button
                              id={`btn-pay-part-${doc.id}`}
                              onClick={() => handleMarkInvoicePaid(doc, 'partially_paid')}
                              className="px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 rounded-lg text-[10px] font-bold"
                            >
                              Part
                            </button>
                          </>
                        )}

                        {/* Trash */}
                        {(currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
                          <button
                            id={`btn-del-doc-${doc.id}`}
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400 font-bold">No active transactions compiled matching tab filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
