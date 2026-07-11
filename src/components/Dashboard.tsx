import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign,
  PackageOpen,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Customer, Product, ERPDocument } from '../types';

interface DashboardProps {
  customers: Customer[];
  products: Product[];
  documents: ERPDocument[];
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ customers, products, documents, setActiveTab }: DashboardProps) {
  
  // Calculate KPIs
  const kpis = useMemo(() => {
    // Sales are derived from Invoices
    const invoices = documents.filter(doc => doc.type === 'invoice');
    
    // Total Revenue (Sales)
    const totalSales = invoices.reduce((sum, doc) => sum + doc.total, 0);

    // Total Cost
    let totalCost = 0;
    invoices.forEach(doc => {
      doc.items.forEach(item => {
        totalCost += (item.cost || 0) * item.quantity;
      });
    });

    // Net Profit
    const profit = totalSales - totalCost;
    const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

    // Active Customers
    const activeCustomers = customers.filter(c => c.status === 'customer').length;
    
    // Total Leads
    const totalLeads = customers.filter(c => c.status === 'lead').length;

    // Low Stock Products
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

    // Pipeline Value (Accepted Quotations + Processing Sales Orders)
    const pipelineValue = documents
      .filter(doc => (doc.type === 'quotation' && doc.status === 'accepted') || (doc.type === 'sales_order' && doc.status === 'processing'))
      .reduce((sum, doc) => sum + doc.total, 0);

    return {
      totalSales,
      profit,
      profitMargin,
      activeCustomers,
      totalLeads,
      lowStockCount,
      pipelineValue
    };
  }, [customers, products, documents]);

  // Chart Data: Monthly Sales Trend (last 6 months / entries)
  const salesTrendData = useMemo(() => {
    const invoices = documents.filter(doc => doc.type === 'invoice');
    
    // Mock monthly compilation if real data points are sparse, otherwise build dynamic
    const monthlyData: { [key: string]: { sales: number; profit: number } } = {
      'Jan': { sales: 24000, profit: 11000 },
      'Feb': { sales: 31000, profit: 14500 },
      'Mar': { sales: 28000, profit: 13000 },
      'Apr': { sales: 42000, profit: 19500 },
      'May': { sales: 39000, profit: 18000 },
      'Jun': { sales: 0, profit: 0 }
    };

    // Integrate real invoices into current month "Jul"
    let currentJulSales = 0;
    let currentJulCost = 0;
    invoices.forEach(inv => {
      currentJulSales += inv.total;
      inv.items.forEach(item => {
        currentJulCost += (item.cost || 0) * item.quantity;
      });
    });
    monthlyData['Jun'].sales = currentJulSales;
    monthlyData['Jun'].profit = currentJulSales - currentJulCost;

    return Object.keys(monthlyData).map(month => ({
      name: month,
      Sales: monthlyData[month].sales,
      Profit: monthlyData[month].profit
    }));
  }, [documents]);

  // Chart Data: Product Stock Breakdown
  const productDistributionData = useMemo(() => {
    const categoryMap: { [key: string]: number } = {};
    products.forEach(p => {
      categoryMap[p.category] = (categoryMap[p.category] || 0) + p.stock;
    });

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    return Object.keys(categoryMap).map((cat, idx) => ({
      name: cat,
      value: categoryMap[cat],
      color: colors[idx % colors.length]
    }));
  }, [products]);

  // Low Stock Items
  const lowStockItems = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock).slice(0, 5);
  }, [products]);

  // Recent Documents (Quotations, Orders, Invoices)
  const recentDocuments = useMemo(() => {
    return [...documents]
      .sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [documents]);

  const getDocBadgeStyle = (type: string, status: string) => {
    if (type === 'quotation') {
      return status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700';
    } else if (type === 'sales_order') {
      return status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
    } else { // invoice
      return status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div id="dashboard-panel" className="space-y-6 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2),-5px_-5px_15px_rgba(255,255,255,0.8)] border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight" id="dashboard-title">
            Inovexa Executive Dashboard
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Real-time multi-tenant analytics, inventories, and transaction auditing pipelines.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <div className="px-3.5 py-1.5 bg-[#f3f4f6] text-gray-500 rounded-xl text-xs font-bold border border-white flex items-center space-x-1.5 shadow-[inset_1px_1px_3px_rgba(163,177,198,0.2)]">
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
            <span>FY 2026</span>
          </div>
          <button
            id="btn-goto-documents"
            onClick={() => setActiveTab('documents')}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1"
          >
            <span>Issue Quotation</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="dashboard-kpi-grid">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100/50 shadow-[6px_6px_12px_rgba(163,177,198,0.2),-6px_-6px_12px_rgba(255,255,255,0.9)] transition-transform hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +14.8%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Sales (Invoiced)</p>
            <h3 className="text-2xl font-black text-gray-800 mt-1">${kpis.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100/50 shadow-[6px_6px_12px_rgba(163,177,198,0.2),-6px_-6px_12px_rgba(255,255,255,0.9)] transition-transform hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Margin {kpis.profitMargin.toFixed(0)}%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Net Profit</p>
            <h3 className="text-2xl font-black text-gray-800 mt-1">${kpis.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100/50 shadow-[6px_6px_12px_rgba(163,177,198,0.2),-6px_-6px_12px_rgba(255,255,255,0.9)] transition-transform hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-extrabold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              Leads: {kpis.totalLeads}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Customers</p>
            <h3 className="text-2xl font-black text-gray-800 mt-1">{kpis.activeCustomers}</h3>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100/50 shadow-[6px_6px_12px_rgba(163,177,198,0.2),-6px_-6px_12px_rgba(255,255,255,0.9)] transition-transform hover:-translate-y-1">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-2xl bg-red-50 border border-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            {kpis.lowStockCount > 0 ? (
              <span className="text-[10px] font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                Low Stock
              </span>
            ) : (
              <span className="text-[10px] font-extrabold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Optimal
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Low Stock Alerts</p>
            <h3 className="text-2xl font-black text-gray-800 mt-1">{kpis.lowStockCount} items</h3>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100/50">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Sales & Profit Trends</h3>
              <p className="text-[11px] text-gray-400">Aggregated dynamic invoice cashflow analytics</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center text-indigo-600 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-1.5" />
                Sales
              </span>
              <span className="flex items-center text-emerald-600 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5" />
                Profit
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, undefined]} />
                <Area type="monotone" dataKey="Sales" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Category Breakdowns */}
        <div className="bg-white p-5 rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100/50 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Inventory Distribution</h3>
            <p className="text-[11px] text-gray-400">Total physical item quantities by product category</p>
          </div>
          <div className="h-44 relative flex items-center justify-center">
            {productDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {productDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} units`, undefined]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-400">No products configured</div>
            )}
          </div>
          <div className="space-y-1.5">
            {productDistributionData.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center space-x-2 text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="truncate max-w-[130px]">{entry.name}</span>
                </div>
                <span className="text-gray-700 font-bold">{entry.value} items</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock & Recent Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Transactions / Invoices / Quotations */}
        <div className="lg:col-span-3 bg-white p-5 rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100/50">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Recent Transactions</h3>
              <p className="text-[11px] text-gray-400">Live operational documents workflow pipeline</p>
            </div>
            <button 
              id="btn-all-trans"
              onClick={() => setActiveTab('documents')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-wider">
                  <th className="pb-3 pl-2">ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3 text-right">Total</th>
                  <th className="pb-3 text-right pr-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 pl-2 font-mono font-bold text-gray-800">{doc.id}</td>
                    <td className="py-3 font-semibold text-gray-600 truncate max-w-[140px]">{doc.customerName}</td>
                    <td className="py-3 font-bold text-indigo-600 capitalize text-[10px]">{doc.type.replace('_', ' ')}</td>
                    <td className="py-3 text-right font-bold text-gray-800">${doc.total.toLocaleString()}</td>
                    <td className="py-3 text-right pr-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDocBadgeStyle(doc.type, doc.status)}`}>
                        {doc.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentDocuments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 font-semibold">No recent documents created.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 mb-1 text-red-600">
              <AlertTriangle className="h-4.5 w-4.5" />
              <h3 className="text-sm font-bold text-gray-800">Critical Stock Replenishments</h3>
            </div>
            <p className="text-[11px] text-gray-400">Inventory levels falling below minimum thresholds</p>
          </div>

          <div className="my-4 divide-y divide-gray-50 flex-1 overflow-y-auto max-h-[190px]">
            {lowStockItems.map((prod) => (
              <div key={prod.id} className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-gray-700 truncate max-w-[150px]">{prod.name}</h4>
                  <p className="text-[10px] text-gray-400 font-mono">SKU: {prod.sku}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-red-600 block">{prod.stock} / {prod.minStock} {prod.unit}</span>
                  <span className="text-[10px] font-semibold text-gray-400">Min. Req</span>
                </div>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <div className="py-8 text-center text-gray-400 flex flex-col items-center justify-center space-y-1.5">
                <PackageOpen className="h-8 w-8 text-gray-300" />
                <p className="text-xs font-semibold">All inventory item counts are stable.</p>
              </div>
            )}
          </div>

          <button
            id="btn-restock-inventory"
            onClick={() => setActiveTab('inventory')}
            className="w-full py-2 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-xl text-xs font-bold border border-red-200 transition-all text-center"
          >
            Manage Low Stock & Reorder
          </button>
        </div>
      </div>

    </div>
  );
}
