import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Avatar } from '../common/Avatar.js';
import { X, UserPlus, LogOut, Shield, Trash2, Copy, Check, Clock } from 'lucide-react';

interface GroupInfoModalProps {
  onClose: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ onClose }) => {
  const { activeChat, addGroupMember, removeGroupMember, leaveGroupChat, setDisappearingTimer } = useChat();
  const { user } = useAuth();

  const [newUserId, setNewUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!activeChat) return null;

  const currentMember = activeChat.members?.find((m: any) => m.userId === user?.id);
  const isAdmin = currentMember?.role === 'admin';

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const token = localStorage.getItem('szchat_token');
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSearchResults(data.users);
    }
  };

  const handleAddMember = async (targetUserId: string) => {
    await addGroupMember(activeChat.id, targetUserId);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/join/${activeChat.inviteCode || 'szchat'}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            {activeChat.isGroup ? 'Group Information' : 'Contact Information'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Avatar & Title */}
          <div className="text-center">
            <Avatar src={activeChat.avatarUrl} name={activeChat.name || 'Chat'} size="xl" className="mx-auto mb-3 shadow-md" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{activeChat.name}</h2>
            {activeChat.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                {activeChat.description}
              </p>
            )}
            <p className="text-[11px] text-zinc-400 mt-2">
              Created {new Date(activeChat.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Disappearing Messages Setting */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>Disappearing Messages</span>
              </span>
              <select
                value={activeChat.disappearingTimer || 0}
                onChange={(e) => setDisappearingTimer(activeChat.id, parseInt(e.target.value, 10))}
                className="bg-white dark:bg-zinc-900 text-xs font-medium border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              >
                <option value={0}>Off</option>
                <option value={86400}>24 Hours</option>
                <option value={604800}>7 Days</option>
                <option value={7776000}>90 Days</option>
              </select>
            </div>
            <p className="text-[10px] text-zinc-400">
              When turned on, new messages sent in this chat will disappear for all members after the selected duration.
            </p>
          </div>

          {/* Group Specific Controls */}
          {activeChat.isGroup && (
            <>
              {/* Invite Link */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                    Group Invite Link
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate block">
                    {window.location.origin}/join/{activeChat.inviteCode || 'szchat'}
                  </span>
                </div>
                <button
                  onClick={handleCopyInviteLink}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Add Member Search (Admins only) */}
              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Add Members to Group
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    placeholder="Search username to add..."
                    className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent rounded-xl text-xs focus:outline-none dark:text-white"
                  />
                  {searchResults.length > 0 && (
                    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl max-h-40 overflow-y-auto p-1 space-y-1 shadow-lg">
                      {searchResults.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 rounded-lg"
                        >
                          <div className="flex items-center space-x-2">
                            <Avatar src={u.avatarUrl} name={u.displayName} size="sm" />
                            <span className="text-xs font-medium dark:text-white">{u.displayName}</span>
                          </div>
                          <button
                            onClick={() => handleAddMember(u.id)}
                            className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Group Members ({activeChat.members?.length || 0})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {activeChat.members?.map((m: any) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar
                          src={m.user?.avatarUrl}
                          name={m.user?.displayName || 'User'}
                          isOnline={m.user?.isOnline}
                          size="md"
                        />
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {m.user?.displayName}
                            {m.userId === user?.id && ' (You)'}
                          </p>
                          <p className="text-[10px] text-zinc-400">@{m.user?.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {m.role === 'admin' && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full flex items-center space-x-1">
                            <Shield className="w-3 h-3" />
                            <span>Admin</span>
                          </span>
                        )}

                        {isAdmin && m.userId !== user?.id && (
                          <button
                            onClick={() => removeGroupMember(activeChat.id, m.userId)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-600 rounded-lg"
                            title="Remove from group"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave Group Action */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to leave this group?')) {
                      leaveGroupChat(activeChat.id);
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors border border-red-200 dark:border-red-900"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Leave Group</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
