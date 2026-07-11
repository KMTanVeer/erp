import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Settings, 
  MapPin, 
  FileText, 
  Eye, 
  Info,
  Sliders,
  Bell,
  Smartphone,
  CheckCircle,
  HelpCircle,
  Sun,
  Moon,
  Maximize2,
  ChevronRight,
  Sparkles,
  Command
} from 'lucide-react';
import { CompanySettings } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, logActivity } from '../firebase';

interface CompanySettingsPanelProps {
  currentUser: any;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  compactMode: boolean;
  setCompactMode: (compact: boolean) => void;
}

export default function CompanySettingsPanel({ 
  currentUser, 
  darkMode, 
  setDarkMode, 
  compactMode, 
  setCompactMode 
}: CompanySettingsPanelProps) {
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: 'Inovexa Technologies Ltd.',
    email: 'sales@inovexabd.com',
    phone: '+880 2-41022026',
    address: 'House1/2, Block A, Prodhan House, Asadgate, Dhaka',
    taxRate: 8,
    invoicePrefix: 'INV-',
    quotationPrefix: 'QT-',
    branches: ['Dhaka Main Office (Asadgate)', 'Chittagong Distribution Center', 'Sylhet Tech Hub'],
    logoPlaceholder: '',
    sealPlaceholder: true
  });

  const [saving, setSaving] = useState(false);
  const [newBranch, setNewBranch] = useState('');

  // Local state fields
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [email, setEmail] = useState(settings.email);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [taxRate, setTaxRate] = useState(settings.taxRate);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [quotationPrefix, setQuotationPrefix] = useState(settings.quotationPrefix);
  const [branches, setBranches] = useState<string[]>(settings.branches);
  const [sealPlaceholder, setSealPlaceholder] = useState(settings.sealPlaceholder || true);

  // Load from firestore settings
  useEffect(() => {
    const fetchSettings = async () => {
      const isOffline = localStorage.getItem('inovexa_offline_mode') === 'true';
      if (isOffline) {
        const saved = localStorage.getItem('inovexa_local_settings');
        if (saved) {
          try {
            const data = JSON.parse(saved) as CompanySettings;
            setSettings(data);
            setCompanyName(data.companyName);
            setEmail(data.email);
            setPhone(data.phone);
            setAddress(data.address);
            setTaxRate(data.taxRate);
            setInvoicePrefix(data.invoicePrefix);
            setQuotationPrefix(data.quotationPrefix);
            setBranches(data.branches || []);
            setSealPlaceholder(data.sealPlaceholder !== false);
          } catch (e) {
            console.error("Failed to parse local settings:", e);
          }
        }
        return;
      }

      try {
        const docRef = doc(db, 'settings', 'company_configs');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as CompanySettings;
          setSettings(data);
          setCompanyName(data.companyName);
          setEmail(data.email);
          setPhone(data.phone);
          setAddress(data.address);
          setTaxRate(data.taxRate);
          setInvoicePrefix(data.invoicePrefix);
          setQuotationPrefix(data.quotationPrefix);
          setBranches(data.branches || []);
          setSealPlaceholder(data.sealPlaceholder !== false);
        }
      } catch (err) {
        console.error("Error loading settings from Firestore, loading local settings fallback:", err);
        const saved = localStorage.getItem('inovexa_local_settings');
        if (saved) {
          try {
            const data = JSON.parse(saved) as CompanySettings;
            setSettings(data);
            setCompanyName(data.companyName);
            setEmail(data.email);
            setPhone(data.phone);
            setAddress(data.address);
            setTaxRate(data.taxRate);
            setInvoicePrefix(data.invoicePrefix);
            setQuotationPrefix(data.quotationPrefix);
            setBranches(data.branches || []);
            setSealPlaceholder(data.sealPlaceholder !== false);
          } catch (e) {
            console.error("Failed to parse local settings fallback:", e);
          }
        }
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const isOffline = localStorage.getItem('inovexa_offline_mode') === 'true';
    try {
      const updated: CompanySettings = {
        companyName,
        email,
        phone,
        address,
        taxRate: Number(taxRate),
        invoicePrefix,
        quotationPrefix,
        branches,
        sealPlaceholder
      };

      if (isOffline) {
        localStorage.setItem('inovexa_local_settings', JSON.stringify(updated));
        setSettings(updated);
        window.dispatchEvent(new Event('inovexa_local_write'));
      } else {
        await setDoc(doc(db, 'settings', 'company_configs'), updated);
        setSettings(updated);
      }

      await logActivity(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        "Update Company Settings",
        "Modified company branding, branches, and prefix controls."
      );
      alert('Enterprise configurations updated successfully.');
    } catch (err: any) {
      console.error("Error saving settings:", err);
      // Fallback save locally if firebase fails
      localStorage.setItem('inovexa_local_settings', JSON.stringify({
        companyName,
        email,
        phone,
        address,
        taxRate: Number(taxRate),
        invoicePrefix,
        quotationPrefix,
        branches,
        sealPlaceholder
      }));
      alert('Error saving settings to Firestore, but configurations saved locally to sandbox storage: ' + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleAddBranch = () => {
    if (!newBranch.trim()) return;
    setBranches([...branches, newBranch.trim()]);
    setNewBranch('');
  };

  const handleRemoveBranch = (idx: number) => {
    setBranches(branches.filter((_, i) => i !== idx));
  };

  return (
    <div id="settings-panel" className="space-y-6 font-sans">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight flex items-center space-x-2">
            <Settings className="h-5.5 w-5.5 text-indigo-600" />
            <span>Company Settings & Configuration</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Configure system rules, invoice numbering schemas, geographical branch registries, branding templates, and user preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: General Profile & Prefix Schemes (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[4px_4px_10px_rgba(163,177,198,0.15)] space-y-5 text-xs">
            <h3 className="text-sm font-bold text-gray-800 flex items-center space-x-1.5 border-b border-gray-50 pb-2.5">
              <Building2 className="h-4 w-4 text-indigo-500" />
              <span>Branding & General Profile</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Company Legal Name</label>
                <input
                  id="settings-company-name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tax Registration Rate (%)</label>
                <input
                  id="settings-tax-rate"
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Official Email</label>
                <input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Operations Helpline</label>
                <input
                  id="settings-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Principal Office Address</label>
                <input
                  id="settings-address"
                  type="text"
                  value={address}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-800 flex items-center space-x-1.5 border-b border-gray-50 pt-4 pb-2.5">
              <FileText className="h-4 w-4 text-indigo-500" />
              <span>Document Prefix & numbering configuration</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Quotation ID Prefix</label>
                <input
                  id="settings-prefix-qt"
                  type="text"
                  value={quotationPrefix}
                  onChange={(e) => setQuotationPrefix(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Invoice ID Prefix</label>
                <input
                  id="settings-prefix-inv"
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div className="md:col-span-2 flex items-center space-x-2.5 bg-gray-50 p-3 rounded-2xl border border-gray-150">
                <input
                  id="settings-seal-checkbox"
                  type="checkbox"
                  checked={sealPlaceholder}
                  onChange={(e) => setSealPlaceholder(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-gray-700 block">Apply Digital Corporate Stamp/Seal on Documents</span>
                  <span className="text-[10px] text-gray-400">If enabled, a high-fidelity visual 'APPROVED' seal from Inovexa Technologies is rendered on PDFs.</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                id="btn-save-settings"
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold shadow-md transition-all flex items-center space-x-2"
              >
                <span>{saving ? 'Updating Controls...' : 'Save Configurations'}</span>
              </button>
            </div>
          </form>

          {/* Branch registry box */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[4px_4px_10px_rgba(163,177,198,0.15)] space-y-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center space-x-1.5 border-b border-gray-50 pb-2.5">
              <MapPin className="h-4 w-4 text-indigo-500" />
              <span>Branch Locations Registry</span>
            </h3>

            <div className="flex space-x-2">
              <input
                id="new-branch-input"
                type="text"
                placeholder="Enter branch name/location..."
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
              <button
                id="btn-add-branch"
                onClick={handleAddBranch}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                Register Branch
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {branches.map((br, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-700 flex items-center space-x-2">
                    <ChevronRight className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{br}</span>
                  </span>
                  <button
                    id={`btn-remove-branch-${idx}`}
                    onClick={() => handleRemoveBranch(idx)}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg"
                  >
                    Deregister
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: UI Customizations (Dark/Compact), Notification Management & Keyboard Shortcuts */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* UI Preferences */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[4px_4px_10px_rgba(163,177,198,0.15)] space-y-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
              <Sliders className="h-4.5 w-4.5 text-indigo-500" />
              <span>UI Preferences</span>
            </h3>

            {/* Dark Mode toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-150">
              <div className="flex items-center space-x-2">
                {darkMode ? <Moon className="h-4 w-4 text-indigo-500" /> : <Sun className="h-4 w-4 text-amber-500" />}
                <div>
                  <span className="text-xs font-bold text-gray-700 block">Dark Theme (Preview)</span>
                  <span className="text-[9px] text-gray-400">Eye-friendly interface</span>
                </div>
              </div>
              <button
                id="btn-toggle-darkmode"
                onClick={() => setDarkMode(!darkMode)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ${darkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Compact Mode toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-150">
              <div className="flex items-center space-x-2">
                <Maximize2 className="h-4 w-4 text-indigo-500" />
                <div>
                  <span className="text-xs font-bold text-gray-700 block">Compact Layout</span>
                  <span className="text-[9px] text-gray-400">Reduce margins for high density</span>
                </div>
              </div>
              <button
                id="btn-toggle-compactmode"
                onClick={() => setCompactMode(!compactMode)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ${compactMode ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${compactMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Quick Shortcuts Helper */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[4px_4px_10px_rgba(163,177,198,0.15)] space-y-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
              <Command className="h-4.5 w-4.5 text-indigo-500" />
              <span>Keyboard Shortcuts</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center bg-gray-50/50 px-3 py-1.5 rounded-xl border border-gray-150">
                <span className="font-semibold text-gray-600">Quick Search</span>
                <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[9px] font-mono shadow-xs">Alt + S</kbd>
              </div>
              <div className="flex justify-between items-center bg-gray-50/50 px-3 py-1.5 rounded-xl border border-gray-150">
                <span className="font-semibold text-gray-600">Toggle Sidebar</span>
                <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[9px] font-mono shadow-xs">Alt + M</kbd>
              </div>
              <div className="flex justify-between items-center bg-gray-50/50 px-3 py-1.5 rounded-xl border border-gray-150">
                <span className="font-semibold text-gray-600">Open Settings</span>
                <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[9px] font-mono shadow-xs">Alt + G</kbd>
              </div>
            </div>
          </div>

          {/* SLA Alerts Notification */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[4px_4px_10px_rgba(163,177,198,0.15)] space-y-3">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
              <Bell className="h-4.5 w-4.5 text-indigo-500" />
              <span>Notification Dispatch</span>
            </h3>
            <div className="p-3 bg-indigo-50/30 border border-indigo-100 rounded-2xl flex items-start space-x-2 text-[11px] text-gray-600">
              <Info className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
              <p>Email alerts are fully configured using Firebase functions. Low stock items and pending quotation approvals dispatch automated push alerts to designated administrative accounts.</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
