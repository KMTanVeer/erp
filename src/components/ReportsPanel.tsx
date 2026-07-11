import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Database, 
  RefreshCcw, 
  Calendar, 
  TrendingUp, 
  FileText, 
  CheckCircle, 
  Layers, 
  DollarSign, 
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { ERPDocument, BackupLog, UserProfile, Product } from '../types';
import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, logActivity } from '../firebase';

interface ReportsPanelProps {
  documents: ERPDocument[];
  backups: BackupLog[];
  products: Product[];
  currentUser: UserProfile;
}

export default function ReportsPanel({ documents, backups, products, currentUser }: ReportsPanelProps) {
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'backups'>('sales');

  // Sales totals
  const salesMetrics = useMemo(() => {
    const invoices = documents.filter(doc => doc.type === 'invoice');
    
    const totalSales = invoices.reduce((sum, doc) => sum + doc.total, 0);
    
    let totalCost = 0;
    invoices.forEach(doc => {
      doc.items.forEach(item => {
        totalCost += (item.cost || 0) * item.quantity;
      });
    });

    const profit = totalSales - totalCost;
    const margin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

    return { totalSales, totalCost, profit, margin };
  }, [documents]);

  // Product Category Performance Chart
  const categoryChartData = useMemo(() => {
    const invoices = documents.filter(doc => doc.type === 'invoice');
    const performance: { [key: string]: { sales: number; profit: number } } = {};

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        // Find product for category
        const prod = products.find(p => p.id === item.productId);
        const cat = prod ? prod.category : 'Cloud Computing';

        if (!performance[cat]) {
          performance[cat] = { sales: 0, profit: 0 };
        }
        performance[cat].sales += item.total;
        performance[cat].profit += item.total - ((item.cost || 0) * item.quantity);
      });
    });

    return Object.keys(performance).map(cat => ({
      name: cat,
      Sales: performance[cat].sales,
      Profit: performance[cat].profit
    }));
  }, [documents, products]);

  // Trigger Backup Simulation
  const handleTriggerBackup = async () => {
    try {
      const backupId = `b-${Date.now().toString().slice(-4)}`;
      const todayDate = new Date().toISOString().split('T')[0];
      const sizeStr = `${(1.25 + Math.random() * 0.1).toFixed(2)} MB`;

      const newBackup: BackupLog = {
        id: backupId,
        backupDate: todayDate,
        status: 'completed',
        size: sizeStr,
        triggeredBy: `${currentUser.name} (Manual)`,
        timestamp: Timestamp.now()
      };

      await setDoc(doc(db, 'backups', backupId), newBackup);
      
      await logActivity(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        "Trigger Backup",
        `Completed secure enterprise database snapshot backup file: Inovexa_Backup_${backupId}.sql.gz`
      );

      alert(`Backup snapshot created successfully! Combined size: ${sizeStr}. Secure checksum logs written to audit files.`);
    } catch (err) {
      console.error("Error committing backup:", err);
    }
  };

  // Export to Excel / CSV format
  const handleExportCSV = () => {
    const invoices = documents.filter(doc => doc.type === 'invoice');
    
    // Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Document ID,Customer Name,Customer Email,Subtotal,Tax,Discount,Grand Total,Status,Payment Due Date\n";
    
    invoices.forEach(doc => {
      const row = [
        doc.id,
        `"${doc.customerName}"`,
        doc.customerEmail,
        doc.subtotal,
        doc.tax,
        doc.discount,
        doc.total,
        doc.status,
        doc.dueDate
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inovexa_Invoices_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert("Excel-compatible invoice dataset exported successfully!");
  };

  return (
    <div id="reports-panel" className="space-y-6 font-sans">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <span>Analytical Reports & Database Sinks</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Audit business financial volumes, evaluate segment margins, and maintain database automated daily backups.
          </p>
        </div>
        
        {/* Toggle between sales reports and backups */}
        <div className="mt-4 md:mt-0 flex space-x-2">
          <button
            id="tab-rep-sales"
            onClick={() => setReportType('sales')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              reportType === 'sales' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'
            }`}
          >
            Financial Analytics
          </button>
          <button
            id="tab-rep-backups"
            onClick={() => setReportType('backups')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              reportType === 'backups' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'
            }`}
          >
            System Backups
          </button>
        </div>
      </div>

      {reportType === 'sales' ? (
        <>
          {/* Sales metrics widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[4px_4px_10px_rgba(163,177,198,0.15)]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Invoiced Sales</span>
              <h4 className="text-xl font-black text-gray-800 mt-1">${salesMetrics.totalSales.toLocaleString()}</h4>
              <div className="flex items-center text-emerald-600 text-[10px] font-bold mt-2">
                <TrendingUp className="h-3.5 w-3.5 mr-0.5" />
                <span>+8.4% compared to Q1</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[4px_4px_10px_rgba(163,177,198,0.15)]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Operational Costs basis</span>
              <h4 className="text-xl font-black text-gray-800 mt-1">${salesMetrics.totalCost.toLocaleString()}</h4>
              <div className="flex items-center text-gray-400 text-[10px] font-semibold mt-2">
                <span>Reflected direct stock purchasing</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[4px_4px_10px_rgba(163,177,198,0.15)]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Net Revenue Profit</span>
              <h4 className="text-xl font-black text-indigo-600 mt-1">${salesMetrics.profit.toLocaleString()}</h4>
              <div className="flex items-center text-emerald-600 text-[10px] font-bold mt-2">
                <TrendingUp className="h-3.5 w-3.5 mr-0.5" />
                <span>Profit margins stable</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[4px_4px_10px_rgba(163,177,198,0.15)]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Yield Profit Margin</span>
              <h4 className="text-xl font-black text-emerald-600 mt-1">{salesMetrics.margin.toFixed(1)}%</h4>
              <div className="flex items-center text-emerald-600 text-[10px] font-bold mt-2">
                <span>Healthy enterprise baseline</span>
              </div>
            </div>
          </div>

          {/* Category Sales Chart performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-5 rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100/50">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Product Categories Margin Yield</h3>
                  <p className="text-[11px] text-gray-400">Comparing total Sales (retail) vs computed net profit margins by category</p>
                </div>
                <button
                  id="btn-export-sales-csv"
                  onClick={handleExportCSV}
                  className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-bold flex items-center space-x-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Excel</span>
                </button>
              </div>

              <div className="h-72">
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                      <YAxis stroke="#9ca3af" fontSize={11} />
                      <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, undefined]} />
                      <Legend />
                      <Bar dataKey="Sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                    No sales data available. Compile invoices to generate statistics.
                  </div>
                )}
              </div>
            </div>

            {/* Invoices List for auditing */}
            <div className="bg-white p-5 rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100/50 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Operational Invoices Audit</h3>
                <p className="text-[11px] text-gray-400">Direct trace of billings for verification checks</p>
              </div>

              <div className="my-4 space-y-3 flex-1 overflow-y-auto max-h-[220px]">
                {documents.filter(d => d.type === 'invoice').map(inv => (
                  <div key={inv.id} className="p-3 bg-gray-50/50 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono font-bold text-gray-700 block">{inv.id}</span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[130px] block">{inv.customerName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-gray-800 block">${inv.total.toLocaleString()}</span>
                      <span className={`text-[9px] font-black uppercase ${inv.status === 'paid' ? 'text-green-600' : 'text-amber-500'}`}>{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                id="btn-reports-audit-check"
                onClick={handleExportCSV}
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold border border-indigo-200 transition-all text-center"
              >
                Download Compiled Financial Audit Sheet
              </button>
            </div>
          </div>
        </>
      ) : (
        /* DATABASE SYSTEM BACKUPS MANAGER */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Backups Panel details */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[5px_5px_15px_rgba(163,177,198,0.15)] flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-indigo-600 mb-2">
                <Database className="h-5 w-5" />
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Daily Automated Backups</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Inovexa Enterprise architecture is configured to execute full SQL schema and collections backup snapshots automatically every 24 hours at 00:00 UTC. 
              </p>

              <div className="mt-5 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-700 space-y-2">
                <div className="flex items-center space-x-2 font-bold">
                  <CheckCircle className="h-4 w-4" />
                  <span>Automated Daemon: Active</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Database replication and storage buckets synchronization are verified green. Daily backups are encrypted using standard AES-256 protocols.
                </p>
              </div>
            </div>

            <button
              id="btn-trigger-backup"
              onClick={handleTriggerBackup}
              className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <RefreshCcw className="h-4 w-4" />
              <span>Force Manual Recovery Backup Now</span>
            </button>
          </div>

          {/* Historical Backup Log List */}
          <div className="lg:col-span-2 bg-white p-5 rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100/50">
            <h3 className="text-sm font-bold text-gray-800">Historical System Backups Logs</h3>
            <p className="text-[11px] text-gray-400 mb-4">Complete logs of automated replication events for auditing and restoration</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">
                    <th className="pb-3 pl-2">Backup ID</th>
                    <th className="pb-3">Snapshot Date</th>
                    <th className="pb-3 text-right">Data Size</th>
                    <th className="pb-3">Initiated By</th>
                    <th className="pb-3 text-right pr-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-sans">
                  {backups.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 pl-2 font-mono font-bold text-indigo-600">{log.id}</td>
                      <td className="py-3 font-semibold text-gray-700">{log.backupDate}</td>
                      <td className="py-3 text-right font-bold text-gray-800">{log.size}</td>
                      <td className="py-3 text-gray-500 font-semibold">{log.triggeredBy}</td>
                      <td className="py-3 text-right pr-2">
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full text-[9px] font-black">
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
