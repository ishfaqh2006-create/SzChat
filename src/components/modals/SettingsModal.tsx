import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Avatar } from '../common/Avatar.js';
import { soundEffects } from '../../lib/sound.js';
import { Settings, X, Moon, Sun, LogOut, User, Sparkles, Check, Volume2, VolumeX, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAdmin?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  isDarkMode,
  onToggleDarkMode,
  onOpenAdmin,
}) => {
  const { user, updateProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isMutedSound, setIsMutedSound] = useState(() => soundEffects.isSoundMuted());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      await updateProfile({
        displayName: displayName.trim(),
        statusMessage: statusMessage.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Settings className="w-4 h-4 text-emerald-600" />
            <span>Settings & Profile</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="text-center">
            <Avatar src={avatarUrl || user?.avatarUrl} name={displayName || 'User'} size="xl" className="mx-auto mb-2" />
            <p className="text-xs text-zinc-400">@{user?.username}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500/50 rounded-xl text-xs focus:outline-none dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Status Message / About
            </label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500/50 rounded-xl text-xs focus:outline-none dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Avatar URL
            </label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500/50 rounded-xl text-xs focus:outline-none dark:text-white"
            />
          </div>

          {/* Theme & Sound Toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Appearance
              </span>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-100 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Application Sounds
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextState = !isMutedSound;
                  setIsMutedSound(nextState);
                  soundEffects.setSoundMuted(nextState);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  isMutedSound
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isMutedSound ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{isMutedSound ? 'Muted (Silent)' : 'Sound Enabled'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                4-Digit Security PIN Lock
              </span>
              <button
                type="button"
                onClick={() => {
                  const currentPin = localStorage.getItem('szchat_security_pin');
                  if (currentPin) {
                    if (confirm('Remove 4-digit Security PIN lock?')) {
                      localStorage.removeItem('szchat_security_pin');
                      alert('PIN lock removed');
                    }
                  } else {
                    const newPin = prompt('Enter a 4-digit PIN for App Lock:');
                    if (newPin && /^\d{4}$/.test(newPin.trim())) {
                      localStorage.setItem('szchat_security_pin', newPin.trim());
                      alert('Security PIN lock enabled!');
                    } else if (newPin !== null) {
                      alert('PIN must be exactly 4 digits');
                    }
                  }
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {localStorage.getItem('szchat_security_pin') ? 'PIN Active (Remove)' : 'Set 4-Digit PIN'}
              </button>
            </div>

            {onOpenAdmin && (user?.username?.toLowerCase() === 'ishfaq' || user?.email?.toLowerCase().includes('ishfaq')) && (
              <div className="flex items-center justify-between p-3 bg-emerald-500/10 dark:bg-emerald-950/30 rounded-xl border border-emerald-500/30">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Super-Admin Panel</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdmin();
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Open Panel
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center space-x-2"
          >
            {success ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved Successfully</span>
              </>
            ) : (
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            )}
          </button>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full py-2.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors border border-red-200 dark:border-red-900"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
