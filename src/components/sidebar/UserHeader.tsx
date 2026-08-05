import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Avatar } from '../common/Avatar.js';
import { MessageSquarePlus, Users, Settings, Phone } from 'lucide-react';

interface UserHeaderProps {
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenSettings: () => void;
  activeTab: 'chats' | 'archived' | 'calls';
  setActiveTab: (tab: 'chats' | 'archived' | 'calls') => void;
}

export const UserHeader: React.FC<UserHeaderProps> = ({
  onOpenNewChat,
  onOpenNewGroup,
  onOpenSettings,
  activeTab,
  setActiveTab,
}) => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-3 flex items-center justify-between">
      <div
        className="flex items-center space-x-3 cursor-pointer group"
        onClick={onOpenSettings}
        title="Settings & Profile"
      >
        <Avatar src={user.avatarUrl} name={user.displayName} isOnline={true} size="md" />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {user.displayName}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">@{user.username}</p>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={() => setActiveTab(activeTab === 'calls' ? 'chats' : 'calls')}
          className={`p-2 rounded-xl transition-colors ${
            activeTab === 'calls'
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
          }`}
          title="Call History"
        >
          <Phone className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenNewGroup}
          className="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          title="New Group Chat"
        >
          <Users className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenNewChat}
          className="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          title="New Direct Message"
        >
          <MessageSquarePlus className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
