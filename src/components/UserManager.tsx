import React, { useState, useMemo } from 'react';
import { 
  UserCog, 
  Activity, 
  ShieldAlert, 
  Search, 
  UserCheck, 
  RefreshCw, 
  Calendar,
  Clock,
  Mail,
  User,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { UserProfile, UserRole, ActivityLog } from '../types';
import { doc, Timestamp } from 'firebase/firestore';
import { db, logActivity, setDoc } from '../firebase';

interface UserManagerProps {
  users: UserProfile[];
  activityLogs: ActivityLog[];
  currentUser: UserProfile;
}

export default function UserManager({ users, activityLogs, currentUser }: UserManagerProps) {
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');

  // Filtering users
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  // Filtering logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => 
      log.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(logSearch.toLowerCase())
    );
  }, [activityLogs, logSearch]);

  // Handle changing role of a user
  const handleChangeRole = async (targetUserId: string, targetName: string, newRole: UserRole) => {
    if (targetUserId === currentUser.uid) {
      alert("You cannot modify your own administrative role. Safeguards are active.");
      return;
    }

    try {
      await setDoc(doc(db, 'users', targetUserId), { role: newRole }, { merge: true });
      
      await logActivity(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        "Change User Role",
        `Altered system role permission settings for ${targetName} to [${newRole.toUpperCase()}].`
      );

      alert(`Successfully updated ${targetName}'s access role to ${newRole.replace('_', ' ').toUpperCase()}`);
    } catch (err) {
      console.error("Error updating user role:", err);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'admin': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'employee': return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div id="user-controls-panel" className="space-y-6 font-sans">
      
      {/* Title Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.2)] border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight flex items-center space-x-2">
            <UserCog className="h-5 w-5 text-indigo-600" />
            <span>Identity & Audit Administration</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Reassign organizational roles, grant credentials, and audit operational activity logs.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-1 bg-indigo-50 text-indigo-600 border border-indigo-150 px-3 py-1 rounded-xl text-[10px] font-black">
          <ShieldAlert className="h-4.5 w-4.5 mr-0.5" />
          <span>SUPER ADMIN AUTHORIZATION GRANTED</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* User Accounts list (Role adjustments) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.15)] border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-800">Authorized Personnel Directory</h3>
              <span className="text-[10px] text-gray-400 font-bold">{filteredUsers.length} profiles</span>
            </div>

            <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                id="user-search-input"
                type="text"
                placeholder="Search staff directory..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredUsers.map(user => (
                <div key={user.uid} className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col justify-between gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center font-bold text-indigo-600 border border-gray-150">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-gray-800 truncate max-w-[120px]">{user.name}</h4>
                        <span className="text-[10px] text-gray-400 font-mono block truncate max-w-[130px]">{user.email}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(user.role)}`}>
                      {user.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {/* Role change dropdown selector */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400 font-semibold">Change Permission:</span>
                    <select
                      id={`select-role-${user.uid}`}
                      value={user.role}
                      disabled={user.uid === currentUser.uid}
                      onChange={(e) => handleChangeRole(user.uid, user.name, e.target.value as UserRole)}
                      className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 focus:outline-none"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="employee">Employee</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-50 flex items-center text-[10px] text-gray-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500 mr-1.5" />
            <span>Role changes apply instantly via real-time sync listeners.</span>
          </div>
        </div>

        {/* Audit Logs list */}
        <div className="lg:col-span-3 bg-white p-5 rounded-3xl shadow-[5px_5px_15px_rgba(163,177,198,0.15)] border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-1.5">
                <Activity className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-800">Operational Security Audit Trail</h3>
              </div>
              <span className="text-[10px] text-gray-400 font-mono font-bold">{filteredLogs.length} events logged</span>
            </div>

            <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                id="log-search-input"
                type="text"
                placeholder="Search audit trail by user, action..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Audit Logs list */}
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-3 bg-gray-50/50 hover:bg-gray-50 border border-gray-200/50 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-indigo-600 uppercase text-[9px] tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/50">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono font-semibold flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : new Date().toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700 font-medium leading-relaxed pt-1">{log.details}</p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100">
                    <span className="font-semibold text-gray-500">Operator: {log.userName}</span>
                    <span className="font-mono text-[9px] truncate max-w-[130px]">{log.userEmail}</span>
                  </div>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center space-y-1">
                  <AlertTriangle className="h-8 w-8 text-gray-300 animate-bounce" />
                  <p className="font-bold">No audit trail records match search filter.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-50 text-[10px] text-gray-400">
            System activity logs are immutable and stored securely on Firestore cluster database.
          </div>
        </div>

      </div>

    </div>
  );
}
