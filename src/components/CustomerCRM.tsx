import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  Trash2, 
  Edit, 
  CheckCircle,
  Briefcase,
  User,
  Info,
  X,
  Tag,
  MessageSquare,
  DollarSign,
  Contact2,
  Calendar,
  Sparkles,
  Send
} from 'lucide-react';
import { Customer, UserProfile, Contact, TimelineEvent } from '../types';
import { collection, doc, Timestamp } from 'firebase/firestore';
import { db, logActivity, addDoc, setDoc, deleteDoc } from '../firebase';

interface CustomerCRMProps {
  customers: Customer[];
  users: UserProfile[];
  currentUser: UserProfile;
}

export default function CustomerCRM({ customers, users, currentUser }: CustomerCRMProps) {
  // Filtering & searching
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCustId, setSelectedCustId] = useState<string | null>(null);
  
  // Fields
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'lead' | 'contacted' | 'proposal' | 'customer'>('lead');
  const [assignedTo, setAssignedTo] = useState(currentUser.uid);

  // Sub-tab state inside details drawer
  const [drawerTab, setDrawerTab] = useState<'contacts' | 'timeline' | 'accounting'>('contacts');

  // Contact form fields
  const [cName, setCName] = useState('');
  const [cRole, setCRole] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');

  // Timeline form fields
  const [tType, setTType] = useState<TimelineEvent['type']>('note');
  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');

  // Tag management
  const [tagInput, setTagInput] = useState('');

  // Selected customer computed object
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustId) || null;
  }, [customers, selectedCustId]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(cust => {
      const matchesSearch = 
        cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cust.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cust.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || cust.status === statusFilter;
      const matchesAssignee = assigneeFilter === 'all' || cust.assignedTo === assigneeFilter;

      return matchesSearch && matchesStatus && matchesAssignee;
    });
  }, [customers, searchTerm, statusFilter, assigneeFilter]);

  // Open modal/form for create
  const handleCreateNew = () => {
    setEditingId(null);
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setAddress('');
    setStatus('lead');
    setAssignedTo(currentUser.uid);
    setShowForm(true);
  };

  // Open modal/form for edit
  const handleEditClick = (cust: Customer) => {
    setEditingId(cust.id);
    setName(cust.name);
    setCompany(cust.company);
    setEmail(cust.email);
    setPhone(cust.phone);
    setAddress(cust.address);
    setStatus(cust.status);
    setAssignedTo(cust.assignedTo || currentUser.uid);
    setShowForm(true);
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    try {
      const assignedUserObj = users.find(u => u.uid === assignedTo);
      const assignedToName = assignedUserObj ? assignedUserObj.name : 'Unassigned';

      if (editingId) {
        // Edit Customer
        const customerRef = doc(db, 'customers', editingId);
        await setDoc(customerRef, {
          id: editingId,
          name,
          company,
          email,
          phone,
          address,
          status,
          assignedTo,
          assignedToName,
          createdAt: Timestamp.now()
        }, { merge: true });

        await logActivity(
          currentUser.uid,
          currentUser.name,
          currentUser.email,
          "Update Customer",
          `Updated information for customer ${name} (${company}).`
        );
      } else {
        // Create Customer
        const newId = `CUST-${Date.now().toString().slice(-4)}`;
        const customerRef = doc(db, 'customers', newId);
        await setDoc(customerRef, {
          id: newId,
          name,
          company,
          email,
          phone,
          address,
          status,
          assignedTo,
          assignedToName,
          createdAt: Timestamp.now(),
          contacts: [],
          timeline: [
            {
              id: `EVT-${Date.now()}`,
              type: 'system',
              title: 'CRM Lead Created',
              description: `Lead registered under delegated manager ${assignedToName}.`,
              date: new Date().toISOString().split('T')[0],
              performedBy: currentUser.name
            }
          ],
          tags: ['IT Hardware'],
          outstandingBalance: 0,
          creditLimit: 20000
        });

        await logActivity(
          currentUser.uid,
          currentUser.name,
          currentUser.email,
          "Create Customer",
          `Registered new CRM record: ${name} from ${company}.`
        );
      }
      setShowForm(false);
    } catch (err) {
      console.error("Error saving customer CRM:", err);
    }
  };

  // Associate Contact addition
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !cName || !cEmail) return;

    const newContact: Contact = {
      name: cName,
      role: cRole,
      email: cEmail,
      phone: cPhone
    };

    const updatedContacts = [...(selectedCustomer.contacts || []), newContact];

    try {
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      await setDoc(customerRef, { contacts: updatedContacts }, { merge: true });

      // Add default timeline notice
      const updatedTimeline = [
        ...(selectedCustomer.timeline || []),
        {
          id: `EVT-${Date.now()}`,
          type: 'system',
          title: 'Stakeholder Contact Added',
          description: `Associated stakeholder ${cName} (${cRole}) with CRM directory.`,
          date: new Date().toISOString().split('T')[0],
          performedBy: currentUser.name
        }
      ];
      await setDoc(customerRef, { timeline: updatedTimeline }, { merge: true });

      setCName('');
      setCRole('');
      setCEmail('');
      setCPhone('');
    } catch (err) {
      console.error("Error adding contact:", err);
    }
  };

  // Delete stakeholder contact
  const handleDeleteContact = async (idx: number) => {
    if (!selectedCustomer) return;
    const filtered = (selectedCustomer.contacts || []).filter((_, i) => i !== idx);
    try {
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      await setDoc(customerRef, { contacts: filtered }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // Log Timeline / Communication note
  const handleAddTimelineEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !tTitle || !tDesc) return;

    const newEvent: TimelineEvent = {
      id: `EVT-${Date.now()}`,
      type: tType,
      title: tTitle,
      description: tDesc,
      date: new Date().toISOString().split('T')[0],
      performedBy: currentUser.name
    };

    const updatedTimeline = [...(selectedCustomer.timeline || []), newEvent];

    try {
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      await setDoc(customerRef, { timeline: updatedTimeline }, { merge: true });
      
      setTTitle('');
      setTDesc('');
    } catch (err) {
      console.error("Error logging timeline event:", err);
    }
  };

  // Add tag
  const handleAddTag = async () => {
    if (!selectedCustomer || !tagInput.trim()) return;
    const tag = tagInput.trim();
    if (selectedCustomer.tags?.includes(tag)) return;
    const updated = [...(selectedCustomer.tags || []), tag];
    try {
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      await setDoc(customerRef, { tags: updated }, { merge: true });
      setTagInput('');
    } catch (err) {
      console.error(err);
    }
  };

  // Remove tag
  const handleRemoveTag = async (tag: string) => {
    if (!selectedCustomer) return;
    const updated = (selectedCustomer.tags || []).filter(t => t !== tag);
    try {
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      await setDoc(customerRef, { tags: updated }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // Update Outstanding Balance
  const handleUpdateBalance = async (bal: number, limit: number) => {
    if (!selectedCustomer) return;
    try {
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      await setDoc(customerRef, { 
        outstandingBalance: bal,
        creditLimit: limit
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, customerName: string) => {
    if (!window.confirm(`Are you sure you want to delete CRM record for ${customerName}?`)) return;
    try {
      await deleteDoc(doc(db, 'customers', id));
      await logActivity(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        "Delete Customer",
        `Deleted CRM client profile: ${customerName}.`
      );
      if (selectedCustId === id) setSelectedCustId(null);
    } catch (err) {
      console.error("Error deleting customer CRM:", err);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'lead': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'contacted': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'proposal': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'customer': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div id="crm-panel" className="space-y-6 font-sans">
      
      {/* Title & Control Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight flex items-center space-x-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <span>Customer Relationship CRM</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Segment pipeline leads, monitor communication statuses, and delegate client accounts.
          </p>
        </div>
        <button
          id="btn-add-customer"
          onClick={handleCreateNew}
          className="mt-4 md:mt-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Client Lead</span>
        </button>
      </div>

      {/* Searching & Filtering Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-white rounded-2xl shadow-[4px_4px_10px_rgba(163,177,198,0.15)] border border-gray-100/50">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            id="crm-search-input"
            type="text"
            placeholder="Search name, company, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div>
          <select
            id="crm-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">All Stages (CRM)</option>
            <option value="lead">Lead</option>
            <option value="contacted">Contacted</option>
            <option value="proposal">Proposal/Quote Sent</option>
            <option value="customer">Signed Customer</option>
          </select>
        </div>

        <div>
          <select
            id="crm-assignee-filter"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">All Account Managers</option>
            {users.map(u => (
              <option key={u.uid} value={u.uid}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-indigo-600 bg-indigo-50 px-3.5 py-2 rounded-xl border border-indigo-100 font-bold justify-center md:justify-start">
          <Filter className="h-3.5 w-3.5" />
          <span>Showing {filteredCustomers.length} Client Records</span>
        </div>
      </div>

      {/* Main CRM Grid View */}
      {showForm ? (
        /* NEUMORPHIC INPUT MODAL / DRAWER */
        <div className="bg-white p-6 rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100 transition-all duration-300">
          <div className="border-b border-gray-100 pb-4 mb-5 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800 flex items-center space-x-1.5">
              <Briefcase className="h-4 w-4 text-indigo-500" />
              <span>{editingId ? 'Edit CRM Record' : 'Register New Client Pipeline'}</span>
            </h3>
            <button 
              id="btn-close-crm-form"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Full Representative Name*</label>
              <input
                id="form-crm-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g., Dr. Robert Ford"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Corporate/Company Name</label>
              <input
                id="form-crm-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="E.g., Delos Inc."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Business Email Address*</label>
              <input
                id="form-crm-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ford@delos.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Direct Contact Number</label>
              <input
                id="form-crm-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="E.g., +1 (555) 0192"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Corporate Physical Address</label>
              <input
                id="form-crm-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="E.g., 88 Mesa Loop, Sector 4, Phoenix, AZ"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Pipeline Stage</label>
              <select
                id="form-crm-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="lead">Lead (Discovered)</option>
                <option value="contacted">Contacted (In negotiation)</option>
                <option value="proposal">Proposal (Quotation issued)</option>
                <option value="customer">Customer (Signed contract)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Assign Manager Delegate</label>
              <select
                id="form-crm-assign"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              >
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>{u.name} ({u.role.replace('_', ' ')})</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 pt-3">
              <button
                id="btn-crm-submit"
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                {editingId ? 'Save CRM Updates' : 'Commit Client Pipeline'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* CRM Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="crm-cards-grid">
          {filteredCustomers.map((cust) => (
            <div 
              key={cust.id} 
              id={`crm-card-${cust.id}`}
              onClick={() => setSelectedCustId(cust.id)}
              className="bg-white p-5 rounded-3xl border border-gray-100/60 shadow-[4px_4px_10px_rgba(163,177,198,0.2)] flex flex-col justify-between hover:shadow-[6px_6px_14px_rgba(163,177,198,0.25)] transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md animate-none">
                      {cust.id}
                    </span>
                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${getStatusBadgeStyle(cust.status)}`}>
                      {cust.status}
                    </span>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      id={`btn-edit-crm-${cust.id}`}
                      onClick={(e) => { e.stopPropagation(); handleEditClick(cust); }}
                      className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    {(currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
                      <button
                        id={`btn-del-crm-${cust.id}`}
                        onClick={(e) => { e.stopPropagation(); handleDelete(cust.id, cust.name); }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-black text-gray-800 tracking-tight">{cust.name}</h3>
                <p className="text-xs text-gray-400 font-semibold">{cust.company || 'Private Lead'}</p>

                {/* Details list */}
                <div className="mt-4 space-y-2.5 border-t border-gray-50 pt-3 text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                  {cust.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>{cust.phone}</span>
                    </div>
                  )}
                  {cust.address && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate max-w-[190px]">{cust.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignee Footer */}
              <div className="mt-4.5 pt-3.5 border-t border-gray-50 flex items-center justify-between text-[11px]">
                <span className="text-gray-400 font-semibold">Delegated Manager</span>
                <span className="flex items-center space-x-1 font-bold text-gray-600">
                  <User className="h-3 w-3 text-indigo-500" />
                  <span className="truncate max-w-[110px]">{cust.assignedToName || 'Sarah Jenkins'}</span>
                </span>
              </div>
            </div>
          ))}

          {filteredCustomers.length === 0 && (
            <div className="col-span-full py-16 bg-white rounded-3xl border border-gray-100 text-center flex flex-col items-center justify-center space-y-2 shadow-sm">
              <Users className="h-10 w-10 text-gray-300" />
              <h4 className="text-sm font-bold text-gray-600">No matching CRM clients found</h4>
              <p className="text-xs text-gray-400 max-w-sm">Adjust your filters above or add a new customer lead to populate your pipeline.</p>
            </div>
          )}
        </div>
      )}

      {/* Slide-over CRM Profile Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-end z-45 no-print" onClick={() => setSelectedCustId(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl p-6 space-y-6 flex flex-col animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md uppercase tracking-wider">{selectedCustomer.id}</span>
                <h3 className="text-base font-black text-gray-800 tracking-tight mt-1">{selectedCustomer.name}</h3>
                <p className="text-xs text-gray-400 font-semibold">{selectedCustomer.company || 'Private Lead'}</p>
              </div>
              <button onClick={() => setSelectedCustId(null)} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-Tabs Selector */}
            <div className="flex space-x-1 bg-gray-50 p-1 rounded-xl border border-gray-150 text-[11px] font-bold">
              <button onClick={() => setDrawerTab('contacts')} className={`flex-1 py-1.5 rounded-lg text-center transition-all ${drawerTab === 'contacts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Contacts</button>
              <button onClick={() => setDrawerTab('timeline')} className={`flex-1 py-1.5 rounded-lg text-center transition-all ${drawerTab === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Timeline</button>
              <button onClick={() => setDrawerTab('accounting')} className={`flex-1 py-1.5 rounded-lg text-center transition-all ${drawerTab === 'accounting' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Accounting & Tags</button>
            </div>

            {/* Panel 1: Contacts */}
            {drawerTab === 'contacts' && (
              <div className="space-y-4 flex-1">
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-700 flex items-center space-x-1"><Contact2 className="h-4 w-4 text-indigo-500" /><span>Primary & Stakeholder Contacts</span></h4>
                  {(selectedCustomer.contacts || []).map((cont, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-150 rounded-2xl flex justify-between items-start text-xs font-semibold text-gray-600">
                      <div>
                        <p className="text-gray-800 font-bold">{cont.name}</p>
                        <p className="text-[10px] text-indigo-600">{cont.role}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-1">{cont.email} | {cont.phone}</p>
                      </div>
                      <button onClick={() => handleDeleteContact(idx)} className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded">Delete</button>
                    </div>
                  ))}
                  {(selectedCustomer.contacts || []).length === 0 && (
                    <p className="text-[11px] text-gray-400 text-center py-4">No secondary contacts linked. Add contacts below.</p>
                  )}
                </div>

                {/* Add Stakeholder Form */}
                <form onSubmit={handleAddContact} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-150 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Associate Stakeholder</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <input required type="text" placeholder="Full Name*" value={cName} onChange={e => setCName(e.target.value)} className="col-span-2 px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg animate-none" />
                    <input required type="text" placeholder="Role (e.g., IT Lead)*" value={cRole} onChange={e => setCRole(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg" />
                    <input required type="email" placeholder="Stakeholder Email*" value={cEmail} onChange={e => setCEmail(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg" />
                    <input type="tel" placeholder="Helpline phone" value={cPhone} onChange={e => setCPhone(e.target.value)} className="col-span-2 px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg" />
                  </div>
                  <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1.5"><Plus className="h-3.5 w-3.5" /><span>Link Contact</span></button>
                </form>
              </div>
            )}

            {/* Panel 2: Timeline */}
            {drawerTab === 'timeline' && (
              <div className="space-y-4 flex-1">
                {/* Timeline display */}
                <div className="space-y-3.5 max-h-[240px] overflow-y-auto pr-1">
                  {(selectedCustomer.timeline || []).map((ev, idx) => (
                    <div key={ev.id || idx} className="relative pl-6 pb-2 border-l border-indigo-100 last:border-0 text-xs">
                      <span className="absolute left-[-4.5px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white" />
                      <div className="flex justify-between items-start">
                        <h5 className="font-bold text-gray-800">{ev.title}</h5>
                        <span className="text-[9px] text-gray-400 font-semibold">{ev.date}</span>
                      </div>
                      <p className="text-gray-500 mt-0.5 text-[11px] leading-tight">{ev.description}</p>
                      <span className="text-[8px] font-mono font-bold uppercase text-indigo-500 bg-indigo-50/50 px-1.5 py-0.2 rounded-md mt-1.5 inline-block">By: {ev.performedBy}</span>
                    </div>
                  ))}
                  {(selectedCustomer.timeline || []).length === 0 && (
                    <p className="text-[11px] text-gray-400 text-center py-4">No communication logs recorded.</p>
                  )}
                </div>

                {/* Add Timeline note */}
                <form onSubmit={handleAddTimelineEvent} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-150 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Log Communication Event</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex space-x-2">
                      <select value={tType} onChange={e => setTType(e.target.value as any)} className="px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg">
                        <option value="note">Internal Note</option>
                        <option value="call">Phone Call</option>
                        <option value="email">Email</option>
                        <option value="meeting">Physical Meeting</option>
                      </select>
                      <input required type="text" placeholder="Title/Topic*" value={tTitle} onChange={e => setTTitle(e.target.value)} className="flex-1 px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg animate-none" />
                    </div>
                    <textarea required rows={2} placeholder="Event descriptions, key action points, or customer requests..." value={tDesc} onChange={e => setTDesc(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg animate-none" />
                  </div>
                  <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1.5"><Send className="h-3.5 w-3.5" /><span>Log Note</span></button>
                </form>
              </div>
            )}

            {/* Panel 3: Accounting & Tags */}
            {drawerTab === 'accounting' && (
              <div className="space-y-4 flex-1 text-xs">
                {/* Outstanding balance controller */}
                <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Financial Risk Controls</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Outstanding Balance ($)</label>
                      <input type="number" value={selectedCustomer.outstandingBalance || 0} onChange={e => handleUpdateBalance(Number(e.target.value), selectedCustomer.creditLimit || 20000)} className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-gray-700 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Credit Limit ($)</label>
                      <input type="number" value={selectedCustomer.creditLimit || 20000} onChange={e => handleUpdateBalance(selectedCustomer.outstandingBalance || 0, Number(e.target.value))} className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-gray-700 font-bold" />
                    </div>
                  </div>
                </div>

                {/* Tag registry */}
                <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Classification Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedCustomer.tags || []).map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold flex items-center space-x-1">
                        <span>{t}</span>
                        <button onClick={() => handleRemoveTag(t)} className="text-[9px] font-extrabold hover:text-indigo-950 ml-1">×</button>
                      </span>
                    ))}
                    {(selectedCustomer.tags || []).length === 0 && (
                      <span className="text-[10px] text-gray-400">No tags active.</span>
                    )}
                  </div>
                  <div className="flex space-x-1.5 pt-1">
                    <input type="text" placeholder="Add custom tag (e.g. Enterprise)..." value={tagInput} onChange={e => setTagInput(e.target.value)} className="flex-1 px-2.5 py-1 border border-gray-200 bg-white rounded-lg text-[10px]" />
                    <button onClick={handleAddTag} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold">Add</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
