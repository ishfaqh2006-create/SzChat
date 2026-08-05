import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { MessageSquare, Lock, User as UserIcon, AtSign, ArrowRight } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!displayName.trim()) {
          setError('Display name is required');
          setLoading(false);
          return;
        }
        await register(username.trim(), displayName.trim(), password);
      } else {
        await login(username.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-center text-white relative">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SzChat</h1>
          <p className="text-emerald-100 text-sm mt-1">Real-time Messaging & WebRTC Calling</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              !isRegister
                ? 'text-emerald-600 border-b-2 border-emerald-600 dark:text-emerald-400'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              isRegister
                ? 'text-emerald-600 border-b-2 border-emerald-600 dark:text-emerald-400'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Username
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. alex2026"
                className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Display Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            <span>{loading ? 'Please wait...' : isRegister ? 'Register & Chat' : 'Sign In'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="bg-zinc-50 dark:bg-zinc-800/40 px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            SzChat Commercial Platform • Ultra-low latency messaging & WebRTC audio calls
          </p>
        </div>
      </div>
    </div>
  );
};
