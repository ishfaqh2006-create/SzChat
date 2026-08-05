import React from 'react';
import { useChat } from '../../context/ChatContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Avatar } from '../common/Avatar.js';
import { Pin, Archive, Check, CheckCheck, Users, Image as ImageIcon, Mic, FileText } from 'lucide-react';

export const ChatList: React.FC = () => {
  const { chats, activeChatId, selectChat, searchQuery, activeTab, togglePinChat, toggleArchiveChat } = useChat();
  const { user } = useAuth();

  const filteredChats = chats.filter(chat => {
    if (activeTab === 'archived') {
      if (!chat.archived) return false;
    } else {
      if (chat.archived) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const chatNameMatch = chat.name?.toLowerCase().includes(q);
    const lastMsgMatch = chat.lastMessage?.content.toLowerCase().includes(q);
    return chatNameMatch || lastMsgMatch;
  });

  const pinnedChats = filteredChats.filter(c => c.pinned);
  const unpinnedChats = filteredChats.filter(c => !c.pinned);

  const renderMessagePreview = (msg?: any) => {
    if (!msg) return <span className="italic text-zinc-400">No messages yet</span>;
    if (msg.isDeletedForEveryone) return <span className="italic text-zinc-400">This message was deleted</span>;

    const isMine = msg.senderId === user?.id;

    let contentStr = msg.content;
    if (msg.type === 'image') contentStr = '📷 Photo';
    if (msg.type === 'audio') contentStr = '🎤 Voice note';
    if (msg.type === 'file') contentStr = `📄 ${msg.fileName || 'Document'}`;

    return (
      <span className="flex items-center space-x-1 truncate text-zinc-500 dark:text-zinc-400 text-xs">
        {isMine && (
          <span className="flex-shrink-0 mr-1 text-zinc-400">
            {msg.status === 'read' ? (
              <CheckCheck className="w-3.5 h-3.5 text-sky-500 inline" />
            ) : (
              <Check className="w-3.5 h-3.5 inline" />
            )}
          </span>
        )}
        <span className="truncate">{contentStr}</span>
      </span>
    );
  };

  const renderChatItem = (chat: any) => {
    const isActive = chat.id === activeChatId;

    // Direct chat online state
    let isOnline = false;
    if (!chat.isGroup) {
      const otherMember = chat.members?.find((m: any) => m.userId !== user?.id);
      isOnline = otherMember?.user?.isOnline || false;
    }

    const formattedTime = chat.lastMessage
      ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <div
        key={chat.id}
        onClick={() => selectChat(chat.id)}
        className={`group relative flex items-center space-x-3 p-3 rounded-2xl cursor-pointer transition-all ${
          isActive
            ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20'
            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-transparent'
        }`}
      >
        <Avatar src={chat.avatarUrl} name={chat.name || 'Chat'} isOnline={!chat.isGroup ? isOnline : undefined} size="lg" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center space-x-1 min-w-0">
              {chat.isGroup && <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {chat.name || 'Conversation'}
              </h3>
            </div>
            {formattedTime && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium flex-shrink-0 ml-2">
                {formattedTime}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            {renderMessagePreview(chat.lastMessage)}

            <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
              {chat.pinned && <Pin className="w-3.5 h-3.5 text-zinc-400 rotate-45" />}
              {chat.unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-600 text-white font-bold text-[10px] rounded-full min-w-[18px] text-center shadow-sm">
                  {chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action icons on hover */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center space-x-1 bg-white dark:bg-zinc-900 p-1 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePinChat(chat.id);
            }}
            title={chat.pinned ? 'Unpin Chat' : 'Pin Chat'}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleArchiveChat(chat.id);
            }}
            title={chat.archived ? 'Unarchive Chat' : 'Archive Chat'}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-zinc-100 dark:divide-zinc-800/40">
      {filteredChats.length === 0 ? (
        <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
          {searchQuery ? 'No chats matching search' : activeTab === 'archived' ? 'No archived chats' : 'No chats yet. Start a new conversation!'}
        </div>
      ) : (
        <>
          {pinnedChats.length > 0 && (
            <div className="space-y-1 pb-2">
              <div className="px-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
                Pinned
              </div>
              {pinnedChats.map(renderChatItem)}
            </div>
          )}

          {unpinnedChats.length > 0 && (
            <div className="space-y-1 pt-2">
              {pinnedChats.length > 0 && (
                <div className="px-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
                  All Chats
                </div>
              )}
              {unpinnedChats.map(renderChatItem)}
            </div>
          )}
        </>
      )}
    </div>
  );
};
