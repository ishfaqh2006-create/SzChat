import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { ShieldCheck, Users, MessageSquare, Database, Phone, Lock, X, RefreshCw, Layers } from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const { token, user } = useAuth();
  const [masterPassword, setMasterPassword] = useState('');
  const [adminSecretKey, setAdminSecretKey] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userPriorityOrder, setUserPriorityOrder] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlockAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ masterPassword: masterPassword.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      const secretToken = data.token || 'IshfaqAdmin@2026!';
      setAdminSecretKey(secretToken);

      // Fetch admin stats
      const statsRes = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Admin-Secret-Key': secretToken,
        },
      });

      if (!statsRes.ok) throw new Error('Unauthorized Access');
      const statsData = await statsRes.json();
      setStats(statsData.stats);
      setIsUnlocked(true);

      // Fetch users list
      const usersRes = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Admin-Secret-Key': secretToken,
        },
      });
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsersList(uData.users || []);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRunCleanup = async () => {
    try {
      const res = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Admin-Secret-Key': adminSecretKey.trim(),
        },
      });
      if (res.ok) {
        alert('Database quota cleanup executed successfully!');
      }
    } catch {
      alert('Cleanup failed');
    }
  };

  const [activeAllowedUsersTarget, setActiveAllowedUsersTarget] = useState<any | null>(null);

  const handleChangeVisibility = async (userId: string, visibilityMode: string, allowedUserIds?: string[]) => {
    try {
      const targetUser = usersList.find(u => u.id === userId);
      const updatedAllowed = allowedUserIds !== undefined ? allowedUserIds : (targetUser?.allowedUserIds || []);

      const res = await fetch(`/api/admin/users/${userId}/visibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Admin-Secret-Key': adminSecretKey.trim(),
        },
        body: JSON.stringify({ visibilityMode, allowedUserIds: updatedAllowed }),
      });

      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, visibilityMode, allowedUserIds: updatedAllowed } : u))
        );
      }
    } catch {
      alert('Failed to update visibility');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn text-white">
      <div className="w-full max-w-2xl bg-zinc-900 rounded-2xl shadow-2xl border border-emerald-500/30 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">SzChat Super-Admin Control Panel</h3>
              <p className="text-[11px] text-zinc-400">Master Owner Access ({user?.displayName || 'Ishfaq'})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isUnlocked ? (
          /* Master Passcode Security Authentication */
          <form onSubmit={handleUnlockAdmin} className="p-8 space-y-4 max-w-sm mx-auto w-full text-center">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Super-Admin Master Password</h4>
              <p className="text-xs text-zinc-400 mt-1">Enter Master Password to unlock full control dashboard</p>
            </div>

            <div className="bg-zinc-800/80 p-3 rounded-xl border border-emerald-500/30 text-left">
              <span className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">
                Authorized Master Account
              </span>
              <div className="flex items-center space-x-2 text-white font-mono font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>@{user?.username || 'Ishfaq'} (Verified Owner)</span>
              </div>
            </div>

            <input
              type="password"
              required
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="Enter Master Password..."
              className="w-full px-4 py-3 bg-zinc-800 border border-emerald-500/50 rounded-xl text-xs outline-none text-white text-center font-mono"
            />

            {error && <p className="text-xs text-red-400 font-semibold">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl text-xs transition-all shadow-lg"
            >
              {loading ? 'Authenticating...' : 'Unlock Admin Control Panel'}
            </button>
          </form>
        ) : (
          /* Admin Dashboard Content */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Stats Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-zinc-800/80 rounded-xl border border-zinc-700/50 flex items-center space-x-3">
                <Users className="w-5 h-5 text-indigo-400" />
                <div>
                  <span className="text-lg font-bold block">{stats?.users || 0}</span>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Total Users</span>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-800/80 rounded-xl border border-zinc-700/50 flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-lg font-bold block">{stats?.messages || 0}</span>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Messages</span>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-800/80 rounded-xl border border-zinc-700/50 flex items-center space-x-3">
                <Database className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-lg font-bold block">{stats?.chats || 0}</span>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Active Chats</span>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-800/80 rounded-xl border border-zinc-700/50 flex items-center space-x-3">
                <Phone className="w-5 h-5 text-cyan-400" />
                <div>
                  <span className="text-lg font-bold block">{stats?.calls || 0}</span>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Call Logs</span>
                </div>
              </div>
            </div>

            {/* Quota Maintenance Action */}
            <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Database Quota Storage Maintenance</span>
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">Purge expired view-once media, 30-day call logs, and deleted messages.</p>
              </div>
              <button
                onClick={handleRunCleanup}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Run Cleanup</span>
              </button>
            </div>

            {/* User Visibility & Granular Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>User Directory Visibility, Priority Order & Security Bans</span>
                </h4>
                <span className="text-[10px] text-zinc-400 font-mono">{usersList.length} Users Registered</span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {usersList.map((u, idx) => (
                  <div
                    key={u.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      u.visibilityMode === 'BLOCKED'
                        ? 'bg-red-950/30 border-red-800/50'
                        : 'bg-zinc-800/80 border-zinc-700/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="w-6 h-6 bg-zinc-700/60 rounded-full flex items-center justify-center font-bold text-emerald-400 font-mono text-[11px]">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">{u.displayName}</span>
                        <span className="text-[10px] text-zinc-400 font-mono truncate block">
                          @{u.username} • {u.email || 'No email'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                      {/* Custom Display Priority Order Input */}
                      <div className="flex items-center space-x-1 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-700">
                        <span className="text-[10px] text-zinc-400 font-semibold">Rank:</span>
                        <input
                          type="number"
                          defaultValue={idx + 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setUserPriorityOrder((prev) => ({ ...prev, [u.id]: val }));
                          }}
                          className="w-10 bg-transparent text-center text-xs font-bold text-emerald-400 outline-none"
                        />
                      </div>

                      {/* Visibility Mode Dropdown */}
                      <select
                        value={u.visibilityMode || 'EVERYONE'}
                        onChange={(e) => handleChangeVisibility(u.id, e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-[11px] rounded-lg px-2 py-1.5 outline-none font-semibold cursor-pointer"
                      >
                        <option value="EVERYONE">🟢 Visible for Everyone</option>
                        <option value="NOONE">🔒 Visible to No One (Hidden)</option>
                        <option value="FRIENDS_ONLY">👥 Visible to Selected Friends Only</option>
                        <option value="BLOCKED">🛑 Block / Suspend User</option>
                      </select>

                      {u.visibilityMode === 'FRIENDS_ONLY' && (
                        <button
                          onClick={() => setActiveAllowedUsersTarget(u)}
                          className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          Configure Allowed Users ({u.allowedUserIds?.length || 0})
                        </button>
                      )}

                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          u.isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        {u.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Allowed Users Picker Modal */}
      {activeAllowedUsersTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h4 className="font-bold text-sm text-white">Allowed Users for @{activeAllowedUsersTarget.username}</h4>
                <p className="text-[11px] text-zinc-400">Select which specific users can see and message this person</p>
              </div>
              <button onClick={() => setActiveAllowedUsersTarget(null)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {usersList
                .filter((candidate) => candidate.id !== activeAllowedUsersTarget.id)
                .map((candidate) => {
                  const isChecked = (activeAllowedUsersTarget.allowedUserIds || []).includes(candidate.id);
                  return (
                    <div
                      key={candidate.id}
                      onClick={() => {
                        const current = activeAllowedUsersTarget.allowedUserIds || [];
                        const updated = isChecked
                          ? current.filter((id: string) => id !== candidate.id)
                          : [...current, candidate.id];
                        setActiveAllowedUsersTarget({ ...activeAllowedUsersTarget, allowedUserIds: updated });
                        handleChangeVisibility(activeAllowedUsersTarget.id, 'FRIENDS_ONLY', updated);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer text-xs ${
                        isChecked ? 'bg-emerald-600/20 border-emerald-500/50 text-white' : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-bold block truncate text-white">{candidate.displayName}</span>
                        <span className="text-[10px] font-mono text-zinc-400 block truncate">@{candidate.username}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  );
                })}
            </div>

            <button
              onClick={() => setActiveAllowedUsersTarget(null)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg transition-colors"
            >
              Done / Save Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
