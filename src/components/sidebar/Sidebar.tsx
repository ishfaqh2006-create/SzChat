import React from 'react';
import { UserHeader } from './UserHeader.js';
import { ChatList } from './ChatList.js';
import { CallHistory } from './CallHistory.js';
import { useChat } from '../../context/ChatContext.js';
import { Search, Archive, MessageSquare } from 'lucide-react';

interface SidebarProps {
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenSettings: () => void;
  isMobileOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenNewChat,
  onOpenNewGroup,
  onOpenSettings,
  isMobileOpen,
}) => {
  const { searchQuery, setSearchQuery, activeTab, setActiveTab, chats } = useChat();

  const archivedCount = chats.filter(c => c.archived).length;

  return (
    <aside
      className={`w-full md:w-80 lg:w-96 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full flex-shrink-0 transition-all ${
        isMobileOpen ? 'flex' : 'hidden md:flex'
      }`}
    >
      <UserHeader
        onOpenNewChat={onOpenNewChat}
        onOpenNewGroup={onOpenNewGroup}
        onOpenSettings={onOpenSettings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Search Input Bar */}
      <div className="p-3 bg-white dark:bg-zinc-900">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats or messages..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:border-emerald-500/50 rounded-xl text-xs focus:outline-none dark:text-zinc-100 placeholder-zinc-400 transition-all"
          />
        </div>
      </div>

      {/* Quick Navigation Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-3 bg-zinc-50/50 dark:bg-zinc-900/50">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center space-x-1.5 border-b-2 transition-colors ${
            activeTab === 'chats'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chats</span>
        </button>

        <button
          onClick={() => setActiveTab('archived')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center space-x-1.5 border-b-2 transition-colors ${
            activeTab === 'archived'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Archived</span>
          {archivedCount > 0 && (
            <span className="px-1.5 py-0.2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] rounded-full">
              {archivedCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Body */}
      {activeTab === 'calls' ? <CallHistory /> : <ChatList />}
    </aside>
  );
};
