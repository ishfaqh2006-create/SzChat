import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { ShieldCheck, Users, MessageSquare, Database, Phone, Lock, X, RefreshCw, Layers } from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const { token } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('6005547858');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [adminSecretKey, setAdminSecretKey] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [error, setError] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMsg('');

    try {
      const res = await fetch('/api/admin/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request OTP');

      setOtpSent(true);
      setInfoMsg(data.message || 'OTP Code sent successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          otpCode: otpCode.trim(),
          adminSecret: adminSecretKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP verification failed');

      const secretToken = data.token || 'szchat_master_admin_secret_2026!';
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
              <p className="text-[11px] text-zinc-400">Authorized Phone OTP Verification (+91 6005547858)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isUnlocked ? (
          /* Phone OTP Security Authentication */
          <div className="p-8 space-y-4 max-w-sm mx-auto w-full text-center">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Super-Admin Phone OTP Verification</h4>
              <p className="text-xs text-zinc-400 mt-1">Requires 6-Digit OTP Sent to Admin Phone</p>
            </div>

            {!otpSent ? (
              <form onSubmit={handleRequestOtp} className="space-y-3">
                <div className="bg-zinc-800/80 p-3 rounded-xl border border-zinc-700">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1 text-left">Authorized Admin Phone</label>
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number..."
                    className="w-full bg-transparent text-xs outline-none text-white font-mono font-bold"
                  />
                </div>

                {error && <p className="text-xs text-red-400 font-semibold">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl text-xs transition-all shadow-lg"
                >
                  {loading ? 'Sending OTP Code...' : 'Send 6-Digit OTP to 6005547858'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                {infoMsg && <p className="text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">{infoMsg}</p>}

                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1 text-left">Enter 6-Digit OTP Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="E.g. 849201"
                    className="w-full px-4 py-3 bg-zinc-800 border border-emerald-500/50 rounded-xl text-sm outline-none text-white text-center font-mono font-bold tracking-widest"
                  />
                </div>

                <div className="pt-1">
                  <input
                    type="password"
                    value={adminSecretKey}
                    onChange={(e) => setAdminSecretKey(e.target.value)}
                    placeholder="Or enter Master Passcode fallback..."
                    className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-xl text-[11px] outline-none text-zinc-400 text-center font-mono"
                  />
                </div>

                {error && <p className="text-xs text-red-400 font-semibold">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl text-xs transition-all shadow-lg"
                >
                  {loading ? 'Verifying OTP...' : 'Verify OTP & Unlock Dashboard'}
                </button>

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-xs text-zinc-400 underline hover:text-white block mx-auto pt-1"
                >
                  Resend OTP Code
                </button>
              </form>
            )}
          </div>
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

            {/* User Visibility & Priority Ordering */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>User Directory Visibility & Ordered Display</span>
                </h4>
                <span className="text-[10px] text-zinc-400 font-mono">{usersList.length} Users Registered</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {usersList.map((u, idx) => (
                  <div
                    key={u.id}
                    className="p-3 bg-zinc-800/80 rounded-xl border border-zinc-700/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-5 text-center font-bold text-zinc-500 font-mono">#{idx + 1}</span>
                      <div>
                        <span className="font-bold text-white block">{u.displayName}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">@{u.username} • {u.email || 'No email'}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
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
    </div>
  );
};
