import React, { useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { MessageItem } from './MessageItem.js';
import { Message } from '../../types/index.js';
import { ChevronDown } from 'lucide-react';

interface MessageListProps {
  onReply: (msg: Message) => void;
  onForward: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  inChatSearchQuery?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  onReply,
  onForward,
  onEdit,
  inChatSearchQuery,
}) => {
  const { messages, loadMoreMessages, activeChat } = useChat();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevChatIdRef = useRef<string | null>(null);
  const prevMsgLengthRef = useRef<number>(0);

  // Synchronous layout effect before paint to position at bottom instantly
  React.useLayoutEffect(() => {
    const isChatChanged = activeChat?.id !== prevChatIdRef.current;
    if (isChatChanged) {
      prevChatIdRef.current = activeChat?.id || null;
      prevMsgLengthRef.current = messages.length;
    }

    if (containerRef.current && messages.length > 0) {
      // If switching chat or initial load, set scrollTop to scrollHeight synchronously
      if (isChatChanged || prevMsgLengthRef.current === 0) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
        if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: 'instant', block: 'end' });
        }
      } else if (messages.length > prevMsgLengthRef.current) {
        // New incoming/outgoing message: smooth scroll ONLY if user is already near bottom
        const el = containerRef.current;
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
        if (isNearBottom && bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    }
    prevMsgLengthRef.current = messages.length;
  }, [activeChat?.id, messages]);

  // Handle infinite scroll up
  const handleScroll = () => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      loadMoreMessages();
    }
  };

  const rawFiltered = inChatSearchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(inChatSearchQuery.toLowerCase()))
    : messages;

  const filteredMessages = rawFiltered.filter((msg, index, self) =>
    index === self.findIndex((m) => m.id === msg.id)
  );

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 relative"
      style={{
        backgroundImage: activeChat?.wallpaper
          ? `url(${activeChat.wallpaper})`
          : 'radial-gradient(circle, rgba(16,185,129,0.03) 1px, transparent 1px)',
        backgroundSize: activeChat?.wallpaper ? 'cover' : '20px 20px',
      }}
    >
      {filteredMessages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-xs text-center p-6">
          <div className="max-w-xs space-y-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <p className="font-semibold text-zinc-700 dark:text-zinc-200">End-to-End Encryption</p>
            <p>Messages are protected with real-time delivery and high security.</p>
          </div>
        </div>
      ) : (
        filteredMessages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            onReply={onReply}
            onForward={onForward}
            onEdit={onEdit}
          />
        ))
      )}

      <div ref={bottomRef} />
    </div>
  );
};
