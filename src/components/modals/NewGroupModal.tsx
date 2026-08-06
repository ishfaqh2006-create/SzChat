import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { Avatar } from '../common/Avatar.js';
import { Users, Search, X, Check } from 'lucide-react';

interface NewGroupModalProps {
  onClose: () => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({ onClose }) => {
  const { createGroup } = useChat();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setUsers([]);
      return;
    }

    const token = localStorage.getItem('szchat_token');
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createGroup(name.trim(), description.trim(), selectedUserIds);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Create New Group</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateGroup} className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project Team, Family Chat"
              className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500/50 rounded-xl text-xs focus:outline-none dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Group Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
              className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500/50 rounded-xl text-xs focus:outline-none dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Add Members ({selectedUserIds.length} selected)
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search users to invite..."
                className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500/50 rounded-xl text-xs focus:outline-none dark:text-white"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
              {users.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleSelectUser(u.id)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Avatar src={u.avatarUrl} name={u.displayName} size="sm" />
                      <span className="text-xs font-medium dark:text-white truncate">{u.displayName}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Creating Group...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};
