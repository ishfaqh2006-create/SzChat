import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { Message, Chat } from '../../types/index.js';
import { Avatar } from '../common/Avatar.js';
import { Share2, X, Check, Search } from 'lucide-react';

interface ForwardModalProps {
  message: Message;
  onClose: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ message, onClose }) => {
  const { chats, sendMessage, selectChat } = useChat();
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  const toggleSelect = (chatId: string) => {
    setSelectedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  const handleForward = async () => {
    if (selectedChatIds.length === 0) return;
    setIsSending(true);

    try {
      for (const chatId of selectedChatIds) {
        selectChat(chatId);
        await sendMessage(message.content, message.type, {
          fileUrl: message.fileUrl || undefined,
          fileName: message.fileName || undefined,
          fileSize: message.fileSize || undefined,
        });
      }
      alert(`Message forwarded to ${selectedChatIds.length} conversation(s)!`);
      onClose();
    } catch (err) {
      console.error('Failed to forward message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const filtered = chats.filter((c) => {
    if (!searchQuery.trim()) return true;
    return c.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-white">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-800/50">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Forward Message</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Snippet Preview */}
        <div className="p-3 bg-zinc-950/60 border-b border-zinc-800 text-xs text-zinc-300">
          <span className="font-semibold text-emerald-400 block text-[10px] uppercase">Message Content</span>
          <p className="truncate mt-0.5">{message.content || '[Media File]'}</p>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-800 flex items-center space-x-2 bg-zinc-900">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats or contacts..."
            className="flex-1 bg-transparent text-xs outline-none text-white placeholder-zinc-500"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-xs text-zinc-500">No chats found</p>
          ) : (
            filtered.map((chat) => {
              const isSelected = selectedChatIds.includes(chat.id);
              return (
                <div
                  key={chat.id}
                  onClick={() => toggleSelect(chat.id)}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-600/20 border border-emerald-500/50' : 'hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Avatar src={chat.avatarUrl} name={chat.name || 'Chat'} size="md" />
                    <span className="text-xs font-semibold text-white truncate">{chat.name || 'Chat'}</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Submit */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/60">
          <button
            onClick={handleForward}
            disabled={selectedChatIds.length === 0 || isSending}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center space-x-2"
          >
            <Share2 className="w-4 h-4" />
            <span>{isSending ? 'Forwarding...' : `Forward to ${selectedChatIds.length} Chat(s)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
