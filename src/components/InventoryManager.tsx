import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Building, 
  AlertTriangle, 
  Tag, 
  Truck, 
  Layers, 
  PackageCheck,
  CheckCircle,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { Product, Category, Supplier, UserProfile } from '../types';
import { doc, Timestamp } from 'firebase/firestore';
import { db, logActivity, setDoc, deleteDoc } from '../firebase';

interface InventoryManagerProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  currentUser: UserProfile;
}

export default function InventoryManager({ products, categories, suppliers, currentUser }: InventoryManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories' | 'suppliers'>('products');

  // Search & Filters
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // all, low_stock, out_of_stock

  const [categorySearch, setCategorySearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields - Products
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodSupplier, setProdSupplier] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodCost, setProdCost] = useState(0);
  const [prodStock, setProdStock] = useState(0);
  const [prodMinStock, setProdMinStock] = useState(0);
  const [prodUnit, setProdUnit] = useState('unit');

  // Form Fields - Categories
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Form Fields - Suppliers
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(productSearch.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      
      let matchesStock = true;
      if (stockFilter === 'low_stock') {
        matchesStock = p.stock <= p.minStock && p.stock > 0;
      } else if (stockFilter === 'out_of_stock') {
        matchesStock = p.stock === 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, productSearch, categoryFilter, stockFilter]);

  // Filter Categories
  const filteredCategories = useMemo(() => {
    return categories.filter(c => 
      c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
      c.description.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

  // Filter Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.contactName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(supplierSearch.toLowerCase())
    );
  }, [suppliers, supplierSearch]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setShowForm(true);

    if (activeSubTab === 'products') {
      setProdName('');
      setProdSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setProdCat(categories[0]?.name || '');
      setProdSupplier(suppliers[0]?.id || '');
      setProdDesc('');
      setProdPrice(0);
      setProdCost(0);
      setProdStock(0);
      setProdMinStock(5);
      setProdUnit('unit');
    } else if (activeSubTab === 'categories') {
      setCatName('');
      setCatDesc('');
    } else {
      setSupName('');
      setSupContact('');
      setSupEmail('');
      setSupPhone('');
      setSupAddress('');
    }
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setShowForm(true);

    if (activeSubTab === 'products') {
      setProdName(item.name);
      setProdSku(item.sku);
      setProdCat(item.category);
      setProdSupplier(item.supplierId);
      setProdDesc(item.description);
      setProdPrice(item.price);
      setProdCost(item.cost);
      setProdStock(item.stock);
      setProdMinStock(item.minStock);
      setProdUnit(item.unit);
    } else if (activeSubTab === 'categories') {
      setCatName(item.name);
      setCatDesc(item.description);
    } else {
      setSupName(item.name);
      setSupContact(item.contactName);
      setSupEmail(item.email);
      setSupPhone(item.phone);
      setSupAddress(item.address);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeSubTab === 'products') {
        if (!prodName || !prodSku) return;
        const currentSupplier = suppliers.find(s => s.id === prodSupplier);
        const supplierName = currentSupplier ? currentSupplier.name : 'Unknown Supplier';

        const id = editingId || `PROD-${Date.now().toString().slice(-4)}`;
        await setDoc(doc(db, 'products', id), {
          id,
          name: prodName,
          sku: prodSku,
          category: prodCat,
          supplierId: prodSupplier,
          supplierName,
          description: prodDesc,
          price: Number(prodPrice),
          cost: Number(prodCost),
          stock: Number(prodStock),
          minStock: Number(prodMinStock),
          unit: prodUnit,
          createdAt: Timestamp.now()
        }, { merge: true });

        await logActivity(
          currentUser.uid,
          currentUser.name,
          currentUser.email,
          editingId ? "Update Product" : "Create Product",
          `${editingId ? 'Updated' : 'Created'} product catalog node: ${prodName} (SKU: ${prodSku}).`
        );
      } else if (activeSubTab === 'categories') {
        if (!catName) return;
        const id = editingId || `CAT-${Date.now().toString().slice(-4)}`;
        await setDoc(doc(db, 'categories', id), {
          id,
          name: catName,
          description: catDesc
        }, { merge: true });

        await logActivity(
          currentUser.uid,
          currentUser.name,
          currentUser.email,
          editingId ? "Update Category" : "Create Category",
          `${editingId ? 'Updated' : 'Created'} product category classification: ${catName}.`
        );
      } else {
        if (!supName || !supEmail) return;
        const id = editingId || `SUP-${Date.now().toString().slice(-4)}`;
        await setDoc(doc(db, 'suppliers', id), {
          id,
          name: supName,
          contactName: supContact,
          email: supEmail,
          phone: supPhone,
          address: supAddress
        }, { merge: true });

        await logActivity(
          currentUser.uid,
          currentUser.name,
          currentUser.email,
          editingId ? "Update Supplier" : "Create Supplier",
          `${editingId ? 'Updated' : 'Created'} vendor registry node: ${supName}.`
        );
      }
      setShowForm(false);
    } catch (err) {
      console.error("Error committing inventory element:", err);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action is irreversible.`)) return;
    try {
      const collectionName = activeSubTab === 'products' ? 'products' : (activeSubTab === 'categories' ? 'categories' : 'suppliers');
      await deleteDoc(doc(db, collectionName, id));
      
      await logActivity(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        `Delete ${activeSubTab.slice(0, -1)}`,
        `Removed item ${name} from ${activeSubTab} collection.`
      );
    } catch (err) {
      console.error("Error deleting element:", err);
    }
  };

  return (
    <div id="inventory-panel" className="space-y-6 font-sans">
      
      {/* Tab Select & Header Grid */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight flex items-center space-x-2">
            <Package className="h-5 w-5 text-indigo-600" />
            <span>Enterprise Inventory & Vendor Registry</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Real-time tracking of item stocks, categories classification, and primary suppliers.
          </p>
        </div>
        
        {/* Creation Buttons */}
        <button
          id={`btn-add-${activeSubTab}`}
          onClick={handleOpenCreate}
          className="mt-4 md:mt-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add New {activeSubTab.replace(/^\w/, c => c.toUpperCase()).slice(0, -1)}</span>
        </button>
      </div>

      {/* Sub tabs selection */}
      <div className="flex space-x-2 p-1.5 bg-gray-200/50 rounded-2xl w-full max-w-md">
        <button
          id="tab-inv-products"
          onClick={() => { setActiveSubTab('products'); setShowForm(false); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'products' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Products Catalog
        </button>
        <button
          id="tab-inv-categories"
          onClick={() => { setActiveSubTab('categories'); setShowForm(false); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'categories' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Categories
        </button>
        <button
          id="tab-inv-suppliers"
          onClick={() => { setActiveSubTab('suppliers'); setShowForm(false); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'suppliers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Suppliers Directory
        </button>
      </div>

      {/* Search and filter bar based on active tab */}
      {!showForm && (
        <div className="bg-white p-4 rounded-2xl shadow-[4px_4px_10px_rgba(163,177,198,0.15)] border border-gray-100/50">
          {activeSubTab === 'products' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  id="prod-search"
                  type="text"
                  placeholder="Search products, SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <select
                  id="prod-cat-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  id="prod-stock-filter"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Stock Statuses</option>
                  <option value="low_stock">Low Stock Alerts Only</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 font-bold justify-center md:justify-start">
                <PackageCheck className="h-4 w-4" />
                <span>Showing {filteredProducts.length} Products</span>
              </div>
            </div>
          )}

          {activeSubTab === 'categories' && (
            <div className="relative max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                id="cat-search"
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {activeSubTab === 'suppliers' && (
            <div className="relative max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                id="sup-search"
                type="text"
                placeholder="Search suppliers, contact name..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Forms and Tables Grid */}
      {showForm ? (
        /* NEUMORPHIC DYNAMIC FORM */
        <div className="bg-white p-6 rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100">
          <div className="border-b border-gray-100 pb-4 mb-5 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800 capitalize flex items-center space-x-1.5">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span>{editingId ? 'Edit' : 'Create'} {activeSubTab.slice(0, -1)}</span>
            </h3>
            <button 
              id="btn-close-inv-form"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {activeSubTab === 'products' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Product Title*</label>
                  <input
                    id="form-prod-name"
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="E.g., Sentinel Firewall Gateway"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Item SKU code*</label>
                  <input
                    id="form-prod-sku"
                    type="text"
                    required
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="E.g., SKU-8801"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Product Category</label>
                  <select
                    id="form-prod-cat"
                    value={prodCat}
                    onChange={(e) => setProdCat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned Vendor / Supplier</label>
                  <select
                    id="form-prod-sup"
                    value={prodSupplier}
                    onChange={(e) => setProdSupplier(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Selling Retail Price ($)*</label>
                  <input
                    id="form-prod-price"
                    type="number"
                    step="0.01"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cost Price ($ - For Profit Tracking)*</label>
                  <input
                    id="form-prod-cost"
                    type="number"
                    step="0.01"
                    required
                    value={prodCost}
                    onChange={(e) => setProdCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Starting Stock Count*</label>
                  <input
                    id="form-prod-stock"
                    type="number"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Minimum Stock Alert Threshold*</label>
                  <input
                    id="form-prod-min"
                    type="number"
                    required
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Measurement Unit</label>
                  <input
                    id="form-prod-unit"
                    type="text"
                    required
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    placeholder="E.g., pcs, license, unit, mo"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Catalog Description</label>
                  <textarea
                    id="form-prod-desc"
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    rows={3}
                    placeholder="Technical specifications and licensing tiers description..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            {activeSubTab === 'categories' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Classification Name*</label>
                  <input
                    id="form-cat-name"
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="E.g., Cloud Servers"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Brief Description</label>
                  <textarea
                    id="form-cat-desc"
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    rows={3}
                    placeholder="Description of what kind of products are filed under this segment..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            {activeSubTab === 'suppliers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Vendor/Company Name*</label>
                  <input
                    id="form-sup-name"
                    type="text"
                    required
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="E.g., Apex Semi Distributors"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Primary Representative Contact*</label>
                  <input
                    id="form-sup-contact"
                    type="text"
                    required
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="E.g., Jane Carters"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Vendor Email Office*</label>
                  <input
                    id="form-sup-email"
                    type="email"
                    required
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="jane@apex.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Direct Contact Line</label>
                  <input
                    id="form-sup-phone"
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="+1 (555) 8802"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Main Headquarters Address</label>
                  <input
                    id="form-sup-address"
                    type="text"
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                    placeholder="12 Venture Way, San Jose, CA"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            <button
              id="btn-inv-submit"
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all pt-3"
            >
              Commit Catalog Changes
            </button>
          </form>
        </div>
      ) : (
        /* TABLE INTERFACES */
        <div className="bg-white rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100 overflow-hidden">
          {activeSubTab === 'products' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#fcfdfe] border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-wider">
                    <th className="py-4 pl-5">SKU / Item</th>
                    <th className="py-4">Category</th>
                    <th className="py-4 text-right">Retail Price</th>
                    <th className="py-4 text-right">Cost Basis</th>
                    <th className="py-4 text-right">Stock Level</th>
                    <th className="py-4 text-center">Status</th>
                    <th className="py-4 text-center pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map((p) => {
                    const isLowStock = p.stock <= p.minStock;
                    const isOutOfStock = p.stock === 0;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pl-5">
                          <div className="flex flex-col">
                            <span className="font-mono text-[10px] font-bold text-indigo-500">{p.sku}</span>
                            <span className="font-bold text-gray-800 text-sm">{p.name}</span>
                            <span className="text-[10px] text-gray-400 truncate max-w-[200px]">{p.description}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg font-bold text-[10px]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-4 text-right font-black text-gray-800">${p.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-4 text-right font-semibold text-gray-400">${p.cost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`font-black ${isOutOfStock ? 'text-red-600' : (isLowStock ? 'text-amber-500' : 'text-gray-800')}`}>
                              {p.stock} {p.unit}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">Min req: {p.minStock}</span>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[9px] font-black border border-red-200">OUT OF STOCK</span>
                          ) : isLowStock ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black border border-amber-200">LOW ALERT</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black border border-emerald-200">OPTIMAL</span>
                          )}
                        </td>
                        <td className="py-4 text-center pr-5">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              id={`btn-edit-prod-${p.id}`}
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {(currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
                              <button
                                id={`btn-del-prod-${p.id}`}
                                onClick={() => handleDeleteItem(p.id, p.name)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 font-bold">No products matching filters configured in catalog.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === 'categories' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#fcfdfe] border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-wider">
                    <th className="py-4 pl-5">Category Name</th>
                    <th className="py-4">Description</th>
                    <th className="py-4 text-center">Node ID</th>
                    <th className="py-4 text-center pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCategories.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-5 font-bold text-gray-800 text-sm flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-indigo-500" />
                        <span>{c.name}</span>
                      </td>
                      <td className="py-4 text-gray-500 max-w-sm truncate">{c.description || 'No description added.'}</td>
                      <td className="py-4 text-center font-mono font-semibold text-gray-400">{c.id}</td>
                      <td className="py-4 text-center pr-5">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            id={`btn-edit-cat-${c.id}`}
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {(currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
                            <button
                              id={`btn-del-cat-${c.id}`}
                              onClick={() => handleDeleteItem(c.id, c.name)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === 'suppliers' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#fcfdfe] border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-wider">
                    <th className="py-4 pl-5">Vendor</th>
                    <th className="py-4">Representative</th>
                    <th className="py-4">Email</th>
                    <th className="py-4">Phone</th>
                    <th className="py-4">City Address</th>
                    <th className="py-4 text-center pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-5 font-bold text-gray-800 text-sm">
                        <div className="flex items-center space-x-2">
                          <Truck className="h-4 w-4 text-indigo-500" />
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-gray-600 font-semibold">{s.contactName}</td>
                      <td className="py-4 font-mono text-indigo-600">{s.email}</td>
                      <td className="py-4 font-semibold text-gray-500">{s.phone || 'N/A'}</td>
                      <td className="py-4 text-gray-400 max-w-xs truncate">{s.address || 'N/A'}</td>
                      <td className="py-4 text-center pr-5">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            id={`btn-edit-sup-${s.id}`}
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {(currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
                            <button
                              id={`btn-del-sup-${s.id}`}
                              onClick={() => handleDeleteItem(s.id, s.name)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
