import React from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  BarChart3, 
  UserCog, 
  LogOut, 
  ShieldCheck,
  Activity,
  Menu,
  X
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface SidebarProps {
  currentUser: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSignOut: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ 
  currentUser, 
  activeTab, 
  setActiveTab, 
  onSignOut,
  mobileOpen,
  setMobileOpen
}: SidebarProps) {
  
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'employee'] },
    { id: 'crm', name: 'Customer CRM', icon: Users, roles: ['super_admin', 'admin', 'employee'] },
    { id: 'inventory', name: 'Inventory & Suppliers', icon: Package, roles: ['super_admin', 'admin', 'employee'] },
    { id: 'documents', name: 'Quotations & Invoices', icon: FileText, roles: ['super_admin', 'admin', 'employee'] },
    { id: 'warranty', name: 'Warranty & RMA', icon: ShieldCheck, roles: ['super_admin', 'admin', 'employee'] },
    { id: 'reports', name: 'Reports & Backups', icon: BarChart3, roles: ['super_admin', 'admin'] },
    { id: 'settings', name: 'Company Settings', icon: Building2, roles: ['super_admin', 'admin', 'employee'] },
    { id: 'users', name: 'User & Audit Controls', icon: UserCog, roles: ['super_admin'] }
  ];

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'admin': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'employee': return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-[#f3f4f6] p-4 text-gray-700 font-sans border-r border-gray-200">
      {/* Brand */}
      <div className="flex items-center space-x-3 px-2 py-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-[3px_3px_6px_rgba(163,177,198,0.5),-3px_-3px_6px_rgba(255,255,255,0.8)] border border-gray-100">
          <Building2 className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-800 leading-tight">Inovexa Tech</h1>
          <span className="text-[10px] text-gray-400 font-mono tracking-wider">ENTERPRISE SYSTEM</span>
        </div>
      </div>

      {/* User profile */}
      <div className="p-3 mb-6 bg-white rounded-2xl shadow-[4px_4px_8px_rgba(163,177,198,0.25)] border border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 font-bold text-sm">
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-gray-800 truncate">{currentUser.name}</h3>
            <p className="text-[10px] text-gray-400 truncate">{currentUser.email}</p>
          </div>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <ShieldCheck className="h-3 w-3 text-indigo-500" />
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Role</span>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(currentUser.role)}`}>
            {currentUser.role.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive 
                  ? 'bg-white text-indigo-600 shadow-[inset_2px_2px_5px_rgba(163,177,198,0.2),3px_3px_6px_rgba(163,177,198,0.3)] border border-indigo-100' 
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="pt-4 border-t border-gray-200/80">
        <button
          id="btn-sidebar-signout"
          onClick={onSignOut}
          className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50/50 transition-all duration-150"
        >
          <LogOut className="h-4.5 w-4.5 text-red-400" />
          <span>Exit Enterprise</span>
        </button>
        <div className="mt-3 text-center">
          <p className="text-[9px] text-gray-400 font-mono">Inovexa Engine • Secure SSL</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Left side) */}
      <aside className="hidden lg:block w-64 h-screen flex-shrink-0 sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Container */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
        <SidebarContent />
      </aside>
    </>
  );
}
