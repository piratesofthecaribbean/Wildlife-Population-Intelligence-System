import React, { useState, useEffect } from "react";
import { Users, UserMinus, Shield, UserCheck, Search, Mail, Calendar, AlertCircle } from "lucide-react";
import { User } from "../types.js";

interface UsersListProps {
  currentUser: User | null;
  onRefreshLogs: () => Promise<void>;
}

export default function UsersList({ currentUser, onRefreshLogs }: UsersListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load users list
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/users", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to retrieve user accounts: ${res.statusText}`);
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: "Admin" | "Researcher" | "Forest Officer") => {
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user role");
      }

      setSuccessMsg(`Successfully updated role to ${newRole}`);
      await fetchUsers();
      if (onRefreshLogs) await onRefreshLogs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setSuccessMsg(`Successfully deleted user "${userName}"`);
      await fetchUsers();
      if (onRefreshLogs) await onRefreshLogs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto" id="users-list-container">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" />
            User & Role Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            As an Administrator, you can view all registered accounts, promote/demote user roles, and manage system access privileges.
          </p>
        </div>
        
        {/* Statistics or Status Info */}
        <div className="flex gap-4 text-xs">
          <div className="bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-mono font-bold tracking-wider">Total Active Accounts</span>
            <span className="text-lg font-bold text-white mt-1 block">{users.length}</span>
          </div>
          <div className="bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-mono font-bold tracking-wider">Your Active Role</span>
            <span className="text-lg font-bold text-emerald-400 mt-1 block flex items-center gap-1">
              <Shield className="h-4 w-4" /> Admin
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2.5 animate-fade-in">
          <UserCheck className="h-4.5 w-4.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Action Controls & Search */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search accounts by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0"
        >
          {loading ? "Refreshing..." : "Refresh List"}
        </button>
      </div>

      {/* Accounts Directory Grid / Table */}
      <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 bg-slate-900/50 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 font-semibold">User details</th>
                <th className="py-4 px-6 font-semibold">Joined System</th>
                <th className="py-4 px-6 font-semibold">Current System Role</th>
                <th className="py-4 px-6 font-semibold text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    {loading ? "Retrieving accounts database..." : "No accounts match the current query."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  
                  return (
                    <tr key={user.id} className="hover:bg-slate-900/30 transition-all">
                      {/* Name & Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white block">
                              {user.name} {isSelf && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-1.5 uppercase font-mono">You</span>}
                            </span>
                            <span className="text-slate-400 mt-0.5 flex items-center gap-1 font-mono text-[11px]">
                              <Mail className="h-3 w-3 text-slate-500" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-6 text-slate-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }) : "Jan 1, 2026"}
                        </span>
                      </td>

                      {/* Current Role */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          user.role === "Admin"
                            ? "bg-red-500/15 text-red-400 border border-red-500/20"
                            : user.role === "Forest Officer"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          <Shield className="h-3 w-3" />
                          {user.role === "Researcher" ? "Wildlife Researcher" : user.role === "Forest Officer" ? "Forest Officer" : "Administrator"}
                        </span>
                      </td>

                      {/* Controls */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          
                          {/* Role selector dropdown */}
                          <div className="relative">
                            <select
                              value={user.role}
                              disabled={isSelf}
                              onChange={(e) => handleUpdateRole(user.id, e.target.value as any)}
                              className={`bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg focus:outline-none transition-all cursor-pointer font-sans disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <option value="Researcher">Wildlife Researcher</option>
                              <option value="Forest Officer">Forest Officer</option>
                              <option value="Admin">Administrator</option>
                            </select>
                          </div>

                          {/* Delete Action button */}
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            disabled={isSelf}
                            title={isSelf ? "You cannot delete your own Administrator account" : `Delete ${user.name}`}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-lg cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
