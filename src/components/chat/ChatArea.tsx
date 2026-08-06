import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { ChatHeader } from './ChatHeader.js';
import { MessageList } from './MessageList.js';
import { MessageInput } from './MessageInput.js';
import { Message } from '../../types/index.js';
import { MessageSquare, Search, X } from 'lucide-react';

interface ChatAreaProps {
  onBackMobile: () => void;
  onOpenGroupInfo: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onBackMobile, onOpenGroupInfo }) => {
  const { activeChat } = useChat();
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');

  if (!activeChat) {
    return (
      <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Welcome to SzChat</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
          Select a conversation or start a new chat to begin messaging and making WebRTC audio calls.
        </p>
      </div>
    );
  }

  return (
    <main className="flex-1 min-h-0 flex flex-col h-full w-full max-w-full bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden overflow-x-hidden">
      <ChatHeader
        onBackMobile={onBackMobile}
        onOpenGroupInfo={onOpenGroupInfo}
        onToggleSearchInChat={() => setShowInChatSearch(!showInChatSearch)}
      />

      {/* In-chat Search Bar Overlay */}
      {showInChatSearch && (
        <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-2.5 px-4 flex items-center space-x-2 animate-slideDown z-10">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            type="text"
            autoFocus
            value={inChatSearchQuery}
            onChange={(e) => setInChatSearchQuery(e.target.value)}
            placeholder="Search messages in this chat..."
            className="flex-1 bg-transparent text-xs outline-none dark:text-white"
          />
          <button
            onClick={() => {
              setShowInChatSearch(false);
              setInChatSearchQuery('');
            }}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      )}

      <MessageList
        onReply={(msg) => setReplyingTo(msg)}
        onForward={(msg) => {
          // Handle forward - copy content to clipboard or start chat forward
          navigator.clipboard.writeText(msg.content);
          alert('Message copied for forwarding!');
        }}
        onEdit={(msg) => setEditingMessage(msg)}
        inChatSearchQuery={inChatSearchQuery}
      />

      <MessageInput
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onClearReply={() => setReplyingTo(null)}
        onClearEdit={() => setEditingMessage(null)}
      />
    </main>
  );
};
