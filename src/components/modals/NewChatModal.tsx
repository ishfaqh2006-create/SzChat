import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { Avatar } from '../common/Avatar.js';
import { Search, X, MessageSquare } from 'lucide-react';

interface NewChatModalProps {
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ onClose }) => {
  const { startDirectChat } = useChat();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('szchat_token');
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (userId: string) => {
    try {
      await startDirectChat(userId);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to start chat');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>New Direct Message</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by username or display name..."
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500/50 rounded-xl text-xs focus:outline-none dark:text-white"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-zinc-400">Searching...</div>
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                {query ? 'No users found matching query' : 'Type a username to find contacts'}
              </div>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u.id)}
                  className="flex items-center space-x-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors"
                >
                  <Avatar src={u.avatarUrl} name={u.displayName} isOnline={u.isOnline} size="md" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {u.displayName}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">@{u.username}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
